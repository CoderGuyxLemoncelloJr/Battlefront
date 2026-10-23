const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const createHarness = require('./test-harness.cjs');
const source = fs.readFileSync(__dirname + '/battlefront-multiplayer.js', 'utf8');
function game(id, host) {
  const harness = createHarness();
  const g = harness.g;
  vm.runInContext(source, g, {timeout: 10000});
  const net = g.battlefrontNet;
  net.state = {connected:true,host,id,hostId:'host',epoch:1,peers:[{id:'host',name:'Host',host:true},{id:'guest',name:'Guest',host:false}],ping:40};
  net.lobby = false; net.started = true; net.wasHost = host; net.name = host ? 'Host' : 'Guest';
  g.soundEnabled = false;
  g.stageTransition.active = false;
  g.transitionToPlay(g.Jakku);
  g.stageTransition.afterSwitch(); g.stageTransition.active = false; g.gameStage = 'Play'; g.matchState.phase = 'live';
  return {g,net,frame(time) {harness.setTime(time);g.draw();assert.equal(g.runtimeFailed,false,g.runtimeErrMsg);assert.equal(harness.depth(),0);}};
}
let passed = 0;
function test(name, fn) {fn();passed++;console.log('PASS '+name);}
function input(overrides = {}) {return {angle:90,slot:0,slotVersion:1,click:0,reload:0,saber:0,dash:0,className:'Assault',team:1,...overrides};}
function receive(net, data) {net.inbox.push({kind:'input',sender:'guest',data});net.poll();}
test('host simulates guest movement and stops stale inputs', () => {
  const {g,net,frame} = game('host',true);
  receive(net,input({right:true}));
  const actor = net.remotes.guest;assert(actor);const start=actor.pos.x;
  for(let i=0;i<12;i++)frame(i*1000/60);
  assert(actor.pos.x>start);
  const x=actor.pos.x;
  for(let i=30;i<90;i++)frame(i*1000/60);
  assert(actor.pos.x-x<120);
  assert.equal(g.runtimeFailed,false);
});
test('guest snapshots restore the map, round, players, shots, mines and crates', () => {
  const host=game('host',true), guest=game('guest',false);
  receive(host.net,input());
  const actor=host.net.remotes.guest;
  actor.weapon.shootFrom(actor.pos,0,actor);
  host.g.PlantLandmine({x:actor.pos.x+160,y:actor.pos.y,z:Math.floor(actor.pos.z)});
  host.g.addPlacedCrate({x:actor.pos.x+280,y:actor.pos.y,z:Math.floor(actor.pos.z)});
  const world=JSON.parse(JSON.stringify(host.net.snapshot()));
  guest.net.applyWorld(world,false);guest.frame(50);
  assert.equal(guest.g.currentMap,guest.g.Jakku);
  assert.equal(guest.g.playerHealth,actor.health);
  assert.equal(guest.g.currentMap.placedCrates.length,1);
  assert(world.objects.some(row=>row.type==='laser'));
  assert(world.objects.some(row=>row.type==='mine'));
  const all=Object.values(guest.g.currentMap.entities).flat();
  assert(all.some(row=>row.netId==='host'));
  assert(!all.some(row=>row.netId==='guest'));
  assert.equal(guest.g.matchState.gameMode,'Team Deathmatch');
});
test('promotion restores live AI and projectiles and keeps the new host position', () => {
  const host=game('host',true), guest=game('guest',false);
  receive(host.net,input({right:true}));host.frame(0);host.frame(50);
  const world=JSON.parse(JSON.stringify(host.net.snapshot()));
  guest.net.applyWorld(world,false);
  const before={x:guest.g.playerPos.x,y:guest.g.playerPos.y};
  guest.net.state.host=true;guest.net.state.hostId='guest';guest.net.state.epoch=2;guest.net.state.peers=[{id:'guest',name:'Guest',host:true}];
  guest.net.applyWorld(world,true);guest.net.wasHost=true;
  assert.equal(guest.g.playerPos.x,before.x);assert.equal(guest.g.playerPos.y,before.y);
  assert(!Object.values(guest.g.currentMap.entities).flat().some(actor=>actor.netId==='host'));
  assert(Object.values(guest.g.currentMap.entities).flat().some(actor=>actor instanceof guest.g.AIPlayer));
  for(let i=0;i<60;i++)guest.frame(i*1000/60);
  assert.equal(guest.g.runtimeFailed,false);
});
test('remote consumables run wind-ups, finish once, and return to the weapon', () => {
  const {g,net,frame}=game('host',true);
  receive(net,input({slot:2,click:1}));
  const actor=net.remotes.guest;
  frame(0);frame(17);assert(actor.useLeft>0);assert.equal(actor.gear[1],1);
  for(let i=2;i<35;i++)frame(i*1000/60);
  assert.equal(actor.hold,0);assert.equal(actor.useLeft,0);
  const grenades=Object.values(g.currentMap.entities).flat().filter(ent=>ent instanceof g.Detonator && ent.owner===actor);
  assert.equal(grenades.length,1);
});
test('malformed class names cannot break the host or access object prototypes', () => {
  const {g,net,frame}=game('host',true);
  receive(net,input({className:'__proto__'}));frame(0);frame(17);
  assert.equal(net.remotes.guest.className,'Assault');assert.equal(g.runtimeFailed,false);
});
test('lobby and waiting screens render at 850x700 and use only canvas controls', () => {
  const {g,net,frame}=game('guest',false);g.width=850;g.height=700;
  net.lobby=true;frame(0);net.lobby=false;net.waiting=true;frame(17);
  assert.equal(g.runtimeFailed,false);
});
test('guest motion interpolates players and shots, takes the short turn, and is frame-rate independent', () => {
  const host=game('host',true), guest=game('guest',false), slower=game('guest',false);
  receive(host.net,input());
  const actor=host.net.remotes.guest;
  actor.weapon.shootFrom(actor.pos,0,actor);
  const first=JSON.parse(JSON.stringify(host.net.snapshot()));
  first.actors.find(row=>row.id==='host').angle=350;
  for(const client of [guest,slower]) {client.net.applyWorld(first,false);client.frame(0);}
  const next=JSON.parse(JSON.stringify(first));
  for(const row of next.actors) row.x+=60;
  for(const row of next.objects) row.x+=60;
  next.actors.find(row=>row.id==='host').angle=10;
  const initial=guest.g.playerPos.x;
  for(const client of [guest,slower]) client.net.applyWorld(next,false);
  assert.equal(guest.g.playerPos.x,initial);
  guest.frame(20);
  assert(guest.g.playerPos.x>initial && guest.g.playerPos.x<initial+60);
  const entities=Object.values(guest.g.currentMap.entities).flat();
  const remote=entities.find(row=>row.netId==='host');
  assert(remote.bodyAngle>350 && remote.bodyAngle<370);
  const shot=next.objects.find(row=>row.type==='laser');
  assert(guest.net.visuals[shot.id].x>shot.x-60 && guest.net.visuals[shot.id].x<shot.x);
  guest.frame(40);guest.frame(60);slower.frame(60);
  assert(Math.abs(guest.g.playerPos.x-slower.g.playerPos.x)<0.000001);
  const teleport=JSON.parse(JSON.stringify(next));
  teleport.actors.find(row=>row.id==='guest').x+=1000;
  guest.net.applyWorld(teleport,false);
  assert.equal(guest.g.playerPos.x,teleport.actors.find(row=>row.id==='guest').x);
  guest.net.state.host=true;
  guest.net.applyWorld(next,true);
  assert.equal(guest.g.playerPos.x,next.actors.find(row=>row.id==='guest').x);
  assert.equal(Object.keys(guest.net.visuals).length,0);
});
console.log(passed+' multiplayer game checks passed');
