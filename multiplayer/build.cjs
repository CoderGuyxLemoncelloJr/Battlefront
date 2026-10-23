const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const projectId = '5684189710893056';
const header = `/*
Multiplayer test: install the bridge, then open this with ?editor=no.
Bridge: https://greasyfork.org/en/scripts/601833-battlefront-v3-multiplayer
Choose Singleplayer, or Multiplayer BETA then Play and a server.
The host runs the match. If they leave, another player takes over.
*/\n`;
const state = `var battlefrontNet = {
  protocol: "battlefront-v3-wss-1", projectId: "${projectId}",
  state: {connected: false, host: false, id: "", hostId: "", epoch: 0, peers: [], ping: 0, invite: "", message: "Install the bridge userscript first"},
  inbox: [], outbox: [], request: null, lobby: true, focused: true, mode: "", view: "mode", server: 0, cycle: 0,
  name: "Player", invite: "", pasted: "", field: "name", className: "Assault", team: 1,
  inputs: {}, remotes: {}, round: 0, entityCounter: 0, started: false, wasHost: false,
  waiting: true, lastWorld: null, lastSendAt: 0, lastSnapshotAt: 0,
  slot: 0, slotVersion: 0, click: 0, reload: 0, saber: 0, dash: 0, mouseBlocked: false
};\n`;
let source = fs.readFileSync(path.join(root, '..', 'battlefront.js'), 'utf8');
source = source.split('\n').map(line => {
    const spaces = line.length - line.trimStart().length;
    return ' '.repeat(Math.floor(spaces / 2)) + line.trimStart();
}).join('\n');
source = source.replace('playSkinName.indexOf("rebel") >= 0 || playSkinName.indexOf("clone") >= 0', 'playSkinName.indexOf("rebel") >= 0 || playSkinName.indexOf("clone") >= 0 || playSkinName.indexOf("luke") >= 0');
source = source.replace('if (matchState.endingFrame >= matchState.endingHoldFrames) {', 'if (matchState.endingFrame >= matchState.endingHoldFrames) {\n      if (battlefrontNet.mode === "multi" && battlefrontNet.state.host) { battlefrontNet.nextRound(false); return; }');
source = source.replaceAll('if (matchState.gameMode === "Battle Royale" && matchState.phase === "live") {', 'if (matchState.gameMode === "Battle Royale" && matchState.phase === "live" && battlefrontNet.mode !== "multi") {');
source = source.replace('if (deathScreenFrame >= deathRespawnAt && !deathTransStarted) {', 'if (deathScreenFrame >= deathRespawnAt && !deathTransStarted && !(battlefrontNet.mode === "multi" && matchState.gameMode === "Battle Royale")) {');
source = source.replace('case "MenuPlay":\n', 'case "MenuPlay":\n                if (battlefrontNet.mode === "multi") {\n                  if (menuPointerX >= -125 && menuPointerX <= 125 && menuPointerY >= -335 && menuPointerY <= -285) {\n                    noStroke(); fill(220, 150); rect(0, -310, 250, 50);\n                    if (mouseClick) { battlefrontNet.openServers(); }\n                  }\n                  break;\n                }\n');
const network = fs.readFileSync(path.join(root, 'network.pjs.js'), 'utf8');
const output = header + state + source + '\n' + network;
fs.writeFileSync(path.join(root, 'battlefront-multiplayer.js'), output);
const scriptPath = path.join(root, 'battlefront.user.js');
let bridge = fs.readFileSync(scriptPath, 'utf8');
bridge = bridge.replaceAll('PROJECT_ID', projectId).replaceAll('GAME_URL', 'https://www.khanacademy.org/computer-programming/pjs/' + projectId);
fs.writeFileSync(scriptPath, bridge);
console.log(output.length + ' characters, ' + Buffer.byteLength(output) + ' bytes');
