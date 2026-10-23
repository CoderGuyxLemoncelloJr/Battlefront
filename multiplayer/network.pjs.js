battlefrontNet.mapName = function(map) {
  return map === Jakku ? "Jakku" : map === StarDestroyer ? "Star Destroyer" : "Kashyyyk";
};
battlefrontNet.map = function(name) {
  return name === "Jakku" ? Jakku : name === "Star Destroyer" ? StarDestroyer : Kashyyyk;
};
battlefrontNet.weapon = function(name) {
  if (name === "Jedi") {
    return new Lightsaber({});
  }
  var template = name === "Specialist" ? Sniper : F_11D;
  return new Blaster(template);
};
battlefrontNet.requestRoom = function(type) {
  battlefrontNet.request = {
    type: type,
    name: battlefrontNet.name,
    invite: battlefrontNet.invite
  };
};
battlefrontNet.button = function(label, x, y, w, selected) {
  rectMode(CORNER);
  noStroke();
  fill(selected ? color(48, 115, 150, 210) : color(26, 45, 65, 185));
  rect(x, y, w, 36, 5);
  fill(225, 240, 255);
  textFont(basicMainFont, 14);
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + 18);
};
battlefrontNet.drawLobby = function() {
  var net = battlefrontNet;
  var x = width / 2;
  var y = height / 2;
  var panelWidth = min(560, width - 32);
  var left = x - panelWidth / 2;
  background(10, 17, 28);
  pushStyle();
  fill(220, 240, 255);
  textFont(basicMainFont, 24);
  textAlign(CENTER, CENTER);
  text("BATTLEFRONT / MULTIPLAYER TEST", x, y - 160);
  textSize(13);
  fill(130, 185, 220);
  text(net.state.message || "Install the bridge userscript first", x, y - 126);
  textAlign(LEFT, CENTER);
  fill(180, 210, 235);
  text("Name", left + 8, y - 84);
  text("Invite", left + 8, y - 28);
  rectMode(CORNER);
  fill(25, 42, 60, 220);
  rect(left, y - 70, panelWidth, 34, 4);
  rect(left, y - 14, panelWidth, 34, 4);
  fill(235, 245, 255);
  text(net.name + (net.field === "name" && floor(millis() / 600) % 2 === 0 ? "_" : ""), left + 10, y - 53);
  var inviteText = net.invite || net.state.invite || "Paste your friend's invite here";
  if (inviteText.length > 56) {
    inviteText = inviteText.slice(0, 53) + "...";
  }
  text(inviteText, left + 10, y + 3);
  var classes = ["Assault", "Specialist", "Heavy", "Jedi"];
  for (var i = 0; i < classes.length; i++) {
    net.button(classes[i], left + i * panelWidth / 4, y + 40, panelWidth / 4 - 6, net.className === classes[i]);
  }
  net.button("Team " + (net.team + 1), left, y + 87, 110, false);
  if (net.state.connected) {
    net.button("Copy invite", x - 60, y + 87, 125, false);
    net.button("Back", x + 75, y + 87, 80, false);
    net.button("Leave", x + 165, y + 87, 80, false);
  } else {
    net.button("Host", x - 10, y + 87, 110, false);
    net.button("Join", x + 110, y + 87, 110, false);
  }
  fill(115, 155, 185);
  textAlign(CENTER, CENTER);
  text("Host picks the map. Everyone needs the bridge.", x, y + 155);
  popStyle();
};
battlefrontNet.lobbyClick = function() {
  var net = battlefrontNet;
  var x = width / 2;
  var y = height / 2;
  var panelWidth = min(560, width - 32);
  var left = x - panelWidth / 2;
  if (mouseY >= y - 70 && mouseY <= y - 36) {
    net.field = "name";
  } else if (mouseY >= y - 14 && mouseY <= y + 20) {
    net.field = "invite";
  } else if (mouseY >= y + 40 && mouseY <= y + 76 && mouseX >= left && mouseX <= left + panelWidth) {
    net.className = ["Assault", "Specialist", "Heavy", "Jedi"][constrain(floor((mouseX - left) / (panelWidth / 4)), 0, 3)];
  } else if (mouseY >= y + 87 && mouseY <= y + 123) {
    if (mouseX >= left && mouseX <= left + 110) {
      net.team = 1 - net.team;
    } else if (net.state.connected) {
      if (mouseX >= x - 60 && mouseX <= x + 65) {
        net.requestRoom("copy");
      } else if (mouseX >= x + 75 && mouseX <= x + 155) {
        net.lobby = false;
      } else if (mouseX >= x + 165 && mouseX <= x + 245) {
        net.requestRoom("leave");
        net.started = false;
      }
    } else if (mouseX >= x - 10 && mouseX <= x + 100) {
      net.requestRoom("create");
    } else if (mouseX >= x + 110 && mouseX <= x + 220) {
      net.requestRoom("join");
    }
  }
};
battlefrontNet.resetRound = function() {
  battlefrontNet.remotes = {};
  battlefrontNet.entityCounter = 0;
  battlefrontNet.round++;
  battlefrontNet.lastSnapshotAt = 0;
};
battlefrontNet.spawnHuman = function(peer, input, restored) {
  var net = battlefrontNet;
  var team = restored ? restored.team : input.team === 0 ? 0 : 1;
  var className = restored ? restored.className : input.className;
  if (["Assault", "Specialist", "Heavy", "Jedi"].indexOf(className) < 0) {
    className = "Assault";
  }
  var anchor = currentMap._matchClusterSpawns && currentMap._matchClusterSpawns[team] || currentMap.spawnPos;
  var spot = restored ? {
    x: restored.x,
    y: restored.y,
    z: restored.z
  } : findTDMSpawn(team);
  var actor = new AIPlayer({
    x: spot.x,
    y: spot.y,
    z: spot.z,
    team: team,
    skin: className === "Jedi" ? team === 0 ? "Luke Skywalker" : "Kylo Ren" : team === 0 ? "Rebel Trooper" : className === "Heavy" ? "Heavy Shoretrooper" : "First Order Stormtrooper",
    weapon: net.weapon(className),
    health: 100,
    maxHealth: 100,
    maxShield: 20,
    shield: 20
  });
  actor.netId = peer.id;
  actor.netHuman = true;
  actor.netName = peer.name;
  actor.className = className;
  actor.isMatchBot = true;
  actor.slide = 0.8;
  actor.colSize = hitboxSize;
  actor.gear = [2, 2, 2, className === "Heavy" ? 4 : 3];
  actor.cooldowns = [0, 0, 0, 0];
  actor.hold = 0;
  actor.slotVersion = -1;
  actor.lastClick = 0;
  actor.lastReload = 0;
  actor.lastSaber = 0;
  actor.lastDash = 0;
  actor.jetpack = 100;
  actor.useLeft = 0;
  actor.useKind = 0;
  actor.respawnLeft = 0;
  if (restored) {
    net.restoreActor(actor, restored);
  }
  net.remotes[peer.id] = actor;
  var layer = floor(actor.pos.z);
  if (!currentMap.entities[layer]) {
    currentMap.entities[layer] = [];
  }
  currentMap.entities[layer].push(actor);
  return actor;
};
battlefrontNet.restoreActor = function(actor, row) {
  var net = battlefrontNet;
  actor.pos.set(row.x, row.y, row.z);
  actor.vel.set(row.vx || 0, row.vy || 0, row.vz || 0);
  actor.health = row.health;
  actor.shield = row.shield;
  actor.maxHealth = row.maxHealth;
  actor.maxShield = row.maxShield;
  actor.bodyAngle = row.angle;
  actor.skin = row.skin;
  actor.team = row.team;
  actor.hold = row.hold || 0;
  actor.slotVersion = row.slotVersion || 0;
  actor.gear = row.gear || [2, 2, 2, 3];
  actor.cooldowns = row.cooldowns || [0, 0, 0, 0];
  actor.useLeft = row.useLeft || 0;
  actor.useKind = row.useKind || 0;
  actor.respawnLeft = row.respawnLeft || 0;
  actor.jetpack = row.jetpack === undefined ? 100 : row.jetpack;
  actor.placement = row.placement || null;
  actor.weapon = net.weapon(row.className || (row.gun === "lightsaber" ? "Jedi" : row.gun === "Sniper" ? "Specialist" : "Assault"));
  actor.weapon.shots = row.shots || 0;
  actor.weapon.shotTime = row.shotTime || 0;
  actor.weapon.reloadTime = row.reloadTime || 0;
  actor.weapon.swing = row.swing || 0;
  actor.weapon.spinAngle = row.spinAngle || 0;
  if (actor.weapon.isLightsaber) {
    actor.weapon.on = row.saberOn;
    actor.weapon.bladeLength = row.bladeLength;
  }
};
battlefrontNet.placement = function(actor, input) {
  var angle = input.angle - 90;
  return {
    x: round((actor.pos.x + cos(angle) * 135) / 20) * 20,
    y: round((actor.pos.y + sin(angle) * 135) / 20) * 20,
    z: floor(actor.pos.z)
  };
};
battlefrontNet.validPlacement = function(actor, spot, slot) {
  var hostPos = playerPos;
  var hostVel = playerVel;
  try {
    playerPos = actor.pos;
    playerVel = actor.vel;
    return isItemPlacementValid(spot, {
      itemName: slot === 4 ? "Crate" : "Mine"
    });
  } finally {
    playerPos = hostPos;
    playerVel = hostVel;
  }
};
battlefrontNet.useItem = function(actor, slot) {
  if (slot === 2) {
    var angle = actor.bodyAngle - 90;
    var grenade = getPooledDetonator({
      x: actor.pos.x,
      y: actor.pos.y,
      z: actor.pos.z + 0.2,
      xVel: cos(angle) * 16,
      yVel: sin(angle) * 16,
      zVel: 0.12,
      owner: actor
    });
    currentMap.entities[floor(actor.pos.z)].push(grenade);
  } else if (slot >= 3) {
    if (!battlefrontNet.validPlacement(actor, actor.placement, slot)) {
      actor.gear[slot - 1]++;
    } else if (slot === 4) {
      addPlacedCrate(actor.placement);
    } else {
      currentMap.entities[floor(actor.pos.z)].push(new Landmine({
        x: actor.placement.x,
        y: actor.placement.y,
        z: actor.placement.z + 0.05,
        owner: actor,
        type: actor.team === 0 ? "blue" : "red"
      }));
    }
  }
  actor.cooldowns[slot - 1] = slot === 1 ? 500 : 150;
  actor.hold = 0;
  actor.useKind = 0;
};
battlefrontNet.melee = function(actor) {
  var candidates = [];
  for (var layer in currentMap.entities) {
    var list = currentMap.entities[layer];
    for (var i = 0; i < list.length; i++) {
      if (list[i].health > 0 && list[i].team !== actor.team && list[i] !== actor) {
        candidates.push(list[i]);
      }
    }
  }
  if (playerHealth > 0 && playerTeam !== actor.team) {
    candidates.push({
      isPlayerTarget: true,
      pos: playerPos,
      health: playerHealth,
      shield: playerShield,
      team: playerTeam
    });
  }
  for (var targetIndex = 0; targetIndex < candidates.length; targetIndex++) {
    var target = candidates[targetIndex];
    var angle = atan2(target.pos.y - actor.pos.y, target.pos.x - actor.pos.x);
    var delta = abs(((angle - (actor.bodyAngle - 90)) % 360 + 540) % 360 - 180);
    if (dist(actor.pos.x, actor.pos.y, target.pos.x, target.pos.y) < 125 && abs(actor.pos.z - target.pos.z) < 1.2 && delta < 65 && aiHasLineOfSight(actor, target)) {
      var beforeHealth = target.health;
      applyDamage(target, 45);
      if (beforeHealth > 0 && target.health <= 0 && !target.tdmScorePaid) {
        awardTDMKill(actor.team, target.team);
        target.tdmScorePaid = true;
        if (target.isPlayerTarget) {
          deathScorePaid = true;
        }
      }
      if (target.isPlayerTarget) {
        playerHealth = target.health;
        playerShield = target.shield;
      }
    }
  }
};
battlefrontNet.updateHuman = function(actor) {
  var net = battlefrontNet;
  var tick = tickClock.scale;
  var record = net.inputs[actor.netId];
  var input = record && millis() - record.at < 300 ? record.data : {};
  if (!net.state.connected || gameStage !== "Play" || matchState.phase !== "live" || net.lobby) {
    return false;
  }
  if (actor.health <= 0 || actor.pos.z < currentMap.killZ) {
    if (!actor.respawnLeft) {
      actor.respawnLeft = 180;
      actor.health = 0;
      actor.vel.mult(0);
    }
    actor.respawnLeft = max(0.001, actor.respawnLeft - tick);
    if (actor.respawnLeft <= 0.001) {
      var anchor = currentMap._matchClusterSpawns && currentMap._matchClusterSpawns[actor.team] || currentMap.spawnPos;
      var spawn = findTDMSpawn(actor.team);
      actor.pos.set(spawn.x, spawn.y, spawn.z);
      actor.health = actor.maxHealth;
      actor.shield = actor.maxShield;
      actor.respawnLeft = 0;
      actor.useLeft = 0;
      actor.useKind = 0;
      actor.hold = 0;
      actor.creditPaid = false;
      actor.tdmScorePaid = false;
      actor.gear = [2, 2, 2, 3];
      actor.cooldowns = [0, 0, 0, 0];
      actor.weapon.shots = 0;
    }
    return false;
  }
  if (typeof input.angle === "number") {
    actor.bodyAngle = input.angle;
  }
  if (input.slotVersion > actor.slotVersion) {
    if (actor.useLeft > 0 && actor.useKind > 1) {
      actor.gear[actor.useKind - 1]++;
    }
    actor.useLeft = 0;
    actor.useKind = 0;
    actor.hold = input.slot;
    actor.slotVersion = input.slotVersion;
  }
  for (var cooldown = 0; cooldown < 4; cooldown++) {
    actor.cooldowns[cooldown] = max(0, actor.cooldowns[cooldown] - tick);
  }
  var clicked = input.click > actor.lastClick;
  if (clicked) {
    actor.lastClick = input.click;
  }
  if (actor.useLeft > 0) {
    if (actor.useKind === 1) {
      actor.health = min(actor.maxHealth, actor.health + 30 * min(tick, actor.useLeft) / 90);
    }
    actor.useLeft = max(0, actor.useLeft - tick);
    if (actor.useLeft === 0) {
      net.useItem(actor, actor.useKind);
    }
  } else if (actor.hold > 0 && clicked && actor.cooldowns[actor.hold - 1] === 0 && actor.gear[actor.hold - 1] > 0) {
    var spot = net.placement(actor, input);
    if ((actor.hold !== 1 || actor.health < actor.maxHealth) && (actor.hold < 3 || net.validPlacement(actor, spot, actor.hold))) {
      actor.useKind = actor.hold;
      actor.useLeft = actor.hold === 1 ? 90 : actor.hold === 2 ? 15 : 24;
      actor.gear[actor.hold - 1]--;
      actor.placement = spot;
    }
  }
  var gun = actor.weapon;
  if (gun.tick) {
    gun.tick();
  }
  if (input.reload > actor.lastReload) {
    actor.lastReload = input.reload;
    if (!actor.hold && gun.tryReload) {
      gun.tryReload();
    }
  }
  if (input.saber > actor.lastSaber) {
    actor.lastSaber = input.saber;
    if (gun.isLightsaber) {
      gun.on = !gun.on;
    }
  }
  if (!actor.hold && !actor.useLeft) {
    if (gun.isLightsaber) {
      gun.bladeLength = lerp(gun.bladeLength, gun.on ? 1 : 0, 0.2);
      gun.swing *= 0.8;
      if (gun.on && clicked && gun.shotTime <= 0) {
        net.melee(actor);
        gun.swing = 80;
        gun.shotTime = 28;
      }
    } else if (clicked || input.fire && gun.auto) {
      gun.shootFrom(actor.pos, actor.bodyAngle - 90, actor);
    }
  }
  actor.gunPose = input.fire ? 1 : 0.35;
  var acceleration = (actor.className === "Heavy" ? 0.9 : actor.className === "Jedi" ? 1.1 : 1) * (input.sprint ? 1.45 : 1) * (actor.hold ? 0.78 : 1);
  actor.vel.x += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * acceleration * tick;
  actor.vel.y += ((input.down ? 1 : 0) - (input.up ? 1 : 0)) * acceleration * tick;
  actor.jetpack = min(100, actor.jetpack + 0.1 * tick);
  if (input.jump && actor.touchingFloorCollision) {
    actor.vel.z = 0.11;
  }
  if (input.jump && input.jetpack !== false && actor.jetpack > 0 && actor.className !== "Heavy" && actor.pos.z < currentMap.topZ + flyCeilExtra) {
    actor.vel.z = min(0.058, actor.vel.z + 0.01 * tick);
    actor.jetpack = max(0, actor.jetpack - 0.4 * tick);
  }
  if (input.dash > actor.lastDash) {
    actor.lastDash = input.dash;
    if (actor.className === "Jedi" && (!actor.dashAt || tickClock.gameMs >= actor.dashAt)) {
      actor.vel.x += cos(actor.bodyAngle - 90) * 35;
      actor.vel.y += sin(actor.bodyAngle - 90) * 35;
      actor.dashAt = tickClock.gameMs + 1500;
    }
  }
  actor.vel.x *= pow(0.8, tick);
  actor.vel.y *= pow(0.8, tick);
  actor.vel.z -= 0.005 * tick;
  var steps = max(1, ceil(max(abs(actor.vel.x), abs(actor.vel.y)) * tick / 6));
  var step = tick / steps;
  var grounded = false;
  for (var move = 0; move < steps; move++) {
    actor.vel._stepScale = step;
    actor.collide();
    grounded = grounded || actor.touchingFloorCollision;
    actor.pos.x += actor.vel.x * step;
    actor.collide();
    grounded = grounded || actor.touchingFloorCollision;
    actor.pos.y += actor.vel.y * step;
    actor.collide();
    grounded = grounded || actor.touchingFloorCollision;
    actor.pos.z += actor.vel.z * step;
    actor.collide();
    grounded = grounded || actor.touchingFloorCollision;
  }
  actor.vel._stepScale = 1;
  actor.touchingFloorCollision = grounded;
  actor.pos.z = min(actor.pos.z, currentMap.topZ + flyCeilExtra + 0.5);
  actor.shield = min(actor.maxShield, actor.shield + 0.03 * tick);
  return false;
};
battlefrontNet.actorRow = function(actor, host) {
  var net = battlefrontNet;
  var data = host ? getSelectedCharacterData() : null;
  var gun = host ? currentGun : actor.weapon;
  var pos = host ? playerPos : actor.pos;
  var vel = host ? playerVel : actor.vel;
  var gear = [];
  var cooldowns = [];
  var useLeft = 0;
  if (host) {
    for (var gearIndex = 0; gearIndex < data.abilities.length; gearIndex++) {
      gear.push(data.abilities[gearIndex].remainingUses);
      cooldowns.push(data.abilities[gearIndex].rechargeCount);
      useLeft = max(useLeft, data.abilities[gearIndex].durationCount);
    }
  }
  return {
    type: "actor",
    id: host ? net.state.id : actor.netId,
    human: host || !!actor.netHuman,
    name: host ? net.name : actor.netName || "",
    x: pos.x,
    y: pos.y,
    z: pos.z,
    vx: vel.x,
    vy: vel.y,
    vz: vel.z,
    angle: host ? bodyAngle + walkSway : actor.bodyAngle,
    skin: host ? skin : actor.skin,
    team: host ? playerTeam : actor.team,
    health: host ? playerHealth : actor.health,
    shield: host ? playerShield : actor.shield,
    maxHealth: host ? playerMaxHealth : actor.maxHealth,
    maxShield: host ? playerMaxShield : actor.maxShield,
    className: host ? character : actor.className || (gun && gun.isLightsaber ? "Jedi" : "Assault"),
    gun: gun ? gun.spriteId : "F_11D",
    shots: gun ? gun.shots : 0,
    shotTime: gun ? gun.shotTime : 0,
    reloadTime: gun ? gun.reloadTime : 0,
    swing: gun && gun.swing || 0,
    spinAngle: gun && gun.spinAngle || 0,
    saberOn: gun && gun.on,
    bladeLength: gun && gun.bladeLength,
    hold: host ? inventoryState.selected : actor.hold || 0,
    slotVersion: host ? 0 : actor.slotVersion || 0,
    gear: host ? gear : actor.gear || [2, 2, 2, 3],
    cooldowns: host ? cooldowns : actor.cooldowns || [0, 0, 0, 0],
    useLeft: host ? useLeft : actor.useLeft || 0,
    useKind: host ? inventoryState.selected : actor.useKind || 0,
    placement: host ? getHeldItem() && getHeldItem().placement : actor.placement,
    jetpack: host ? data.equipment ? data.equipment.durationCount : 0 : actor.jetpack,
    respawnLeft: host ? deathScreenActive ? deathRespawnAt - deathScreenFrame : 0 : actor.respawnLeft || 0
  };
};
battlefrontNet.snapshot = function() {
  var net = battlefrontNet;
  var world = {
    round: net.round,
    stage: gameStage,
    map: net.mapName(currentMap),
    tick: tickClock.tick,
    time: tickClock.gameMs,
    phase: matchState.phase,
    mode: matchState.gameMode,
    scores: matchState.teamScores.slice(0),
    winner: matchState.winnerTeam,
    countdown: matchState.countdownFrame,
    ending: matchState.endingFrame,
    actors: [],
    objects: [],
    crates: [],
    doors: []
  };
  if (!currentMap || gameStage !== "Play") {
    return world;
  }
  world.actors.push(net.actorRow(null, true));
  for (var layer in currentMap.entities) {
    var list = currentMap.entities[layer];
    for (var i = 0; i < list.length; i++) {
      var entity = list[i];
      if (!entity.netId) {
        entity.netId = "e" + net.state.id.slice(0, 8) + "_" + (++net.entityCounter);
      }
      if (entity.health !== undefined && entity.skin) {
        world.actors.push(net.actorRow(entity, false));
      } else if (entity.poolType === "laser") {
        world.objects.push({
          type: "laser",
          id: entity.netId,
          x: entity.pos.x,
          y: entity.pos.y,
          z: entity.pos.z,
          vx: entity.drawVelX,
          vy: entity.drawVelY,
          vz: entity.vel.z,
          travel: entity.travelDist,
          dead: entity.dead,
          deathTime: entity.deathTime,
          damage: entity.damage,
          maxDist: entity.maxDist,
          owner: entity.owner && entity.owner.netId || net.state.id,
          team: entity.owner && entity.owner.team
        });
      } else if (entity instanceof Detonator || entity instanceof Landmine) {
        world.objects.push({
          type: entity instanceof Landmine ? "mine" : "grenade",
          id: entity.netId,
          x: entity.pos.x,
          y: entity.pos.y,
          z: entity.pos.z,
          vx: entity.vel.x,
          vy: entity.vel.y,
          vz: entity.vel.z,
          rv: entity.rv,
          armDelay: entity.armDelay,
          fuse: entity.fuse,
          exploding: entity.exploding,
          explosionTime: entity.explosionTime,
          explosionMax: entity.explosionMax,
          damageDone: entity.damageDone,
          owner: entity.owner && entity.owner.netId || net.state.id,
          team: entity.owner && entity.owner.team,
          damage: entity.explosionDamageMax
        });
      }
    }
  }
  var crates = currentMap.placedCrates || [];
  for (var crateIndex = 0; crateIndex < crates.length; crateIndex++) {
    world.crates.push({
      x: crates[crateIndex].x,
      y: crates[crateIndex].y,
      z: crates[crateIndex].lowZ
    });
  }
  for (var doorLayer in currentMap.objects) {
    var objects = currentMap.objects[doorLayer];
    for (var doorIndex = 0; doorIndex < objects.length; doorIndex++) {
      if (objects[doorIndex] instanceof BlastDoor) {
        world.doors.push({
          layer: doorLayer,
          index: doorIndex,
          timer: objects[doorIndex].timer
        });
      }
    }
  }
  return world;
};
battlefrontNet.renderActor = function(actor) {
  if (actor.health <= 0) {
    return;
  }
  pushMatrix();
  translate(actor.pos.x, actor.pos.y);
  rotate(actor.bodyAngle);
  drawPlayer(actor.skin, 60, true);
  if (actor.hold) {
    var previousSkin = skin;
    skin = actor.skin;
    drawHeldItem(characterData[actor.className || "Assault"].abilities[actor.hold - 1]);
    skin = previousSkin;
  } else {
    renderBlaster(actor.weapon, actor.skin, actor.gunPose === undefined ? 1 : actor.gunPose);
  }
  popMatrix();
  pushStyle();
  textAlign(CENTER, CENTER);
  textFont(basicMainFont, 13);
  fill(actor.netHuman ? color(140, 220, 255) : color(210, 220, 235));
  text(actor.netName || "", actor.pos.x, actor.pos.y - 82);
  noStroke();
  rectMode(CORNER);
  fill(20, 25, 35, 150);
  rect(actor.pos.x - 26, actor.pos.y - 68, 52, 5);
  fill(actor.team === playerTeam ? color(100, 210, 255) : color(255, 100, 100));
  rect(actor.pos.x - 26, actor.pos.y - 68, 52 * constrain(actor.health / max(1, actor.maxHealth), 0, 1), 5);
  popStyle();
};
battlefrontNet.trackVisual = function(row, entity, previous, tracks) {
  var old = previous[row.id];
  var snap = !old || floor(old.z) !== floor(row.z) || pow(old.x - row.x, 2) + pow(old.y - row.y, 2) > 90000 || old.alive !== (row.health > 0);
  var track = {
    x: snap ? row.x : old.x,
    y: snap ? row.y : old.y,
    z: snap ? row.z : old.z,
    angle: snap ? row.angle : old.angle,
    target: row,
    entity: entity,
    alive: row.health > 0
  };
  tracks[row.id] = track;
  var pos = entity ? entity.pos : playerPos;
  pos.set(track.x, track.y, track.z);
  if (entity && row.type === "actor") {
    entity.bodyAngle = track.angle;
  }
};
battlefrontNet.smoothVisuals = function() {
  var net = battlefrontNet;
  var now = millis();
  var elapsed = net.visualAt === undefined ? 0 : constrain(now - net.visualAt, 0, 250);
  net.visualAt = now;
  if (net.state.host || !net.visuals) {
    return;
  }
  var blend = 1 - exp(-elapsed / 60);
  for (var id in net.visuals) {
    if (!net.visuals.hasOwnProperty(id)) {
      continue;
    }
    var track = net.visuals[id];
    var target = track.target;
    track.x += (target.x - track.x) * blend;
    track.y += (target.y - track.y) * blend;
    track.z += (target.z - track.z) * blend;
    var pos = track.entity ? track.entity.pos : playerPos;
    pos.set(track.x, track.y, track.z);
    if (track.entity && target.type === "actor") {
      var turn = ((target.angle - track.angle) % 360 + 540) % 360 - 180;
      track.angle += turn * blend;
      track.entity.bodyAngle = track.angle;
    }
  }
};
battlefrontNet.makeVisual = function(row) {
  var net = battlefrontNet;
  if (row.type === "actor") {
    var actor = {
      pos: new PVector(row.x, row.y, row.z),
      vel: new PVector(),
      netId: row.id,
      netHuman: row.human,
      netName: row.name,
      className: row.className,
      colSize: hitboxSize,
      isMatchBot: true
    };
    net.restoreActor(actor, row);
    actor.render = function() {
      battlefrontNet.renderActor(this);
    };
    return actor;
  }
  if (row.type === "laser") {
    return {
      pos: new PVector(row.x, row.y, row.z),
      vel: new PVector(row.vx, row.vy, row.vz),
      drawVelX: row.vx,
      drawVelY: row.vy,
      travelDist: row.travel,
      tailMax: 90,
      dead: row.dead,
      deathTime: row.deathTime,
      render: function() {
        F_11D.laserRender(this);
      },
      getTailPoint: Laser.prototype.getTailPoint
    };
  }
  var item = {
    pos: new PVector(row.x, row.y, row.z),
    vel: new PVector(row.vx, row.vy, row.vz),
    rv: row.rv,
    exploding: row.exploding,
    explosionTime: row.explosionTime,
    explosionMax: row.explosionMax,
    explosionGrowFrames: 10,
    explosionFadeFrames: 50,
    type: row.team === 0 ? "blue" : "red"
  };
  item.render = row.type === "mine" ? Landmine.prototype.render : Detonator.prototype.render;
  return item;
};
battlefrontNet.applyWorld = function(world, promote) {
  var net = battlefrontNet;
  if (!world || !Array.isArray(world.actors) || world.actors.length > 80 || !Array.isArray(world.objects) || world.objects.length > 800 || !Array.isArray(world.crates) || world.crates.length > 20) {
    return;
  }
  net.lastWorld = world;
  if (world.stage !== "Play") {
    if (!promote) {
      net.waiting = true;
    }
    return;
  }
  var changedMap = net.appliedRound !== world.round || currentMap !== net.map(world.map);
  if (changedMap) {
    currentMap = net.map(world.map);
    prepMap(currentMap);
    removePlacedCrates(currentMap);
    currentMap.entities = {};
    net.appliedRound = world.round;
    net.crateKey = "";
    net.remotes = {};
    clearGameInput();
    stageTransition.active = false;
    currentMenu = null;
  }
  var crateKey = JSON.stringify(world.crates);
  if (crateKey !== net.crateKey) {
    removePlacedCrates(currentMap);
    for (var c = 0; c < world.crates.length; c++) {
      addPlacedCrate(world.crates[c]);
    }
    net.crateKey = crateKey;
  }
  for (var d = 0; d < world.doors.length; d++) {
    var doorState = world.doors[d];
    var door = currentMap.objects[doorState.layer] && currentMap.objects[doorState.layer][doorState.index];
    if (door instanceof BlastDoor) {
      door.timer = doorState.timer;
    }
  }
  var entities = {};
  var previousVisuals = changedMap || promote ? {} : net.visuals || {};
  var visuals = {};
  net.remotes = {};
  var owners = {};
  for (var i = 0; i < world.actors.length; i++) {
    var row = world.actors[i];
    if (!row || !isFinite(row.x) || !isFinite(row.y) || !isFinite(row.z) || ["Assault", "Specialist", "Heavy", "Jedi"].indexOf(row.className) < 0) {
      continue;
    }
    if (row.id === net.state.id) {
      playerPos.set(row.x, row.y, row.z);
      if (!promote) {
        net.trackVisual(row, null, previousVisuals, visuals);
      }
      playerVel.set(row.vx || 0, row.vy || 0, row.vz || 0);
      playerHealth = row.health;
      playerShield = row.shield;
      playerMaxHealth = row.maxHealth;
      playerMaxShield = row.maxShield;
      playerTeam = row.team;
      skin = row.skin;
      character = row.className;
      if (net.weaponName !== row.gun || changedMap || promote) {
        currentGun = net.weapon(row.className);
        net.weaponName = row.gun;
      }
      currentGun.swing = row.swing || 0;
      currentGun.spinAngle = row.spinAngle || 0;
      currentGun.shots = row.shots || 0;
      currentGun.reloadTime = row.reloadTime || 0;
      currentGun.shotTime = row.shotTime || 0;
      if (currentGun.isLightsaber) {
        currentGun.on = row.saberOn;
        currentGun.bladeLength = row.bladeLength;
      }
      if (row.slotVersion >= net.slotVersion) {
        net.slot = row.hold;
      }
      inventoryState.selected = net.slot;
      var localData = getSelectedCharacterData();
      for (var item = 0; item < localData.abilities.length; item++) {
        localData.abilities[item].remainingUses = row.gear[item];
        localData.abilities[item].rechargeCount = row.cooldowns[item];
        localData.abilities[item].durationCount = row.useKind === item + 1 ? row.useLeft : 0;
        localData.abilities[item].placement = row.placement;
      }
      if (localData.equipment) {
        localData.equipment.durationCount = row.jetpack;
      }
      deathScreenActive = row.health <= 0;
      deathScreenFrame = max(0, deathRespawnAt - row.respawnLeft);
      owners[row.id] = {
        team: row.team,
        isPlayer: true,
        netId: row.id
      };
      continue;
    }
    if (promote && row.human && !net.state.peers.some(function(peer) {
        return peer.id === row.id;
      })) {
      continue;
    }
    var entity;
    if (promote && row.human) {
      entity = net.spawnHuman({
        id: row.id,
        name: row.name
      }, {}, row);
      entity.lastClick = (net.inputs[row.id] && net.inputs[row.id].data.click) || 0;
    } else if (promote) {
      entity = new AIPlayer({
        x: row.x,
        y: row.y,
        z: row.z,
        skin: row.skin,
        team: row.team
      });
      net.restoreActor(entity, row);
      entity.netId = row.id;
      entity.isMatchBot = true;
    } else {
      entity = net.makeVisual(row);
      net.trackVisual(row, entity, previousVisuals, visuals);
    }
    if (!entities[floor(entity.pos.z)]) {
      entities[floor(entity.pos.z)] = [];
    }
    entities[floor(entity.pos.z)].push(entity);
    owners[row.id] = entity;
  }
  for (var objectIndex = 0; objectIndex < world.objects.length; objectIndex++) {
    var object = world.objects[objectIndex];
    if (!isFinite(object.x) || !isFinite(object.y) || !isFinite(object.z)) {
      continue;
    }
    var projectile;
    if (promote) {
      var owner = owners[object.owner] || {
        team: object.team
      };
      var config = {
        x: object.x,
        y: object.y,
        z: object.z,
        xVel: object.vx,
        yVel: object.vy,
        zVel: object.vz,
        owner: owner,
        armDelay: object.armDelay,
        fuse: object.fuse,
        damage: object.damage,
        explosionDamageMax: object.damage,
        renderFunc: F_11D.laserRender,
        maxDist: object.maxDist
      };
      projectile = object.type === "laser" ? new Laser(config) : object.type === "mine" ? new Landmine(config) : new Detonator(config);
      projectile.pos.set(object.x, object.y, object.z);
      projectile.netId = object.id;
      if (object.type === "laser") {
        projectile.travelDist = object.travel;
        projectile.dead = object.dead;
        projectile.deathTime = object.deathTime;
      } else {
        projectile.exploding = object.exploding;
        projectile.explosionTime = object.explosionTime;
        projectile.explosionMax = object.explosionMax;
        projectile.damageDone = object.damageDone;
      }
    } else {
      projectile = net.makeVisual(object);
      net.trackVisual(object, projectile, previousVisuals, visuals);
    }
    if (!entities[floor(projectile.pos.z)]) {
      entities[floor(projectile.pos.z)] = [];
    }
    entities[floor(projectile.pos.z)].push(projectile);
  }
  net.visuals = promote ? {} : visuals;
  if (changedMap || promote) {
    net.visualAt = millis();
  }
  currentMap.entities = entities;
  currentMap._initialTeamBotsSpawned = true;
  currentMap._matchClusterSpawns = world.spawns || currentMap._matchClusterSpawns;
  gameStage = "Play";
  stageTransition.active = false;
  matchState.phase = world.phase;
  matchState.gameMode = world.mode;
  matchState.teamScores = world.scores;
  matchState.winnerTeam = world.winner;
  matchState.countdownStarted = true;
  matchState.countdownFrame = world.countdown;
  matchState.endingFrame = world.ending;
  tickClock.gameMs = world.time;
  net.waiting = false;
  if (promote) {
    net.round = world.round;
    net.lastSnapshotAt = 0;
    net.entityCounter += 10000;
    inventoryState.lastWeapon = currentGun;
    net.slotVersion = max(net.slotVersion, 1);
    net.slot = inventoryState.selected;
    matchState.botRespawns = [];
  }
};
battlefrontNet.poll = function() {
  var net = battlefrontNet;
  if (net.pasted) {
    net.invite = net.pasted;
    net.pasted = "";
  }
  if (!net.invite && net.state.invite) {
    net.invite = net.state.invite;
  }
  if (net.state.connected && !net.started) {
    net.started = true;
    net.lobby = false;
    net.waiting = !net.state.host;
    if (net.state.host) {
      gameStage = "Menu";
    }
  }
  if (net.state.host && !net.wasHost && net.lastWorld) {
    net.applyWorld(net.lastWorld, true);
  }
  net.wasHost = net.state.host;
  while (net.inbox.length) {
    var packet = net.inbox.shift();
    if (packet.kind === "world" && !net.state.host) {
      net.applyWorld(packet.data, false);
    } else if (packet.kind === "input" && net.state.host && net.state.peers.some(function(peer) {
        return peer.id === packet.sender && !peer.host;
      })) {
      var input = packet.data;
      if (!input || !isFinite(input.angle) || abs(input.angle) > 100000 || input.slot < 0 || input.slot > 4 || floor(input.slot) !== input.slot || !isFinite(input.slotVersion) || !isFinite(input.click)) {
        continue;
      }
      net.inputs[packet.sender] = {
        at: millis(),
        data: input
      };
      if (gameStage === "Play" && !net.remotes[packet.sender]) {
        for (var peerIndex = 0; peerIndex < net.state.peers.length; peerIndex++) {
          if (net.state.peers[peerIndex].id === packet.sender) {
            net.spawnHuman(net.state.peers[peerIndex], input, null);
          }
        }
      }
    }
  }
  if (net.state.host && currentMap) {
    for (var id in net.remotes) {
      if (!net.state.peers.some(function(peer) {
          return peer.id === id;
        })) {
        var departed = net.remotes[id];
        for (var layer in currentMap.entities) {
          var index = currentMap.entities[layer].indexOf(departed);
          if (index >= 0) {
            currentMap.entities[layer].splice(index, 1);
          }
        }
        delete net.remotes[id];
        delete net.inputs[id];
      }
    }
  }
  if (!net.state.connected || millis() - net.lastSendAt < 50) {
    return;
  }
  net.lastSendAt = millis();
  if (net.state.host) {
    var world = net.snapshot();
    world.spawns = currentMap && currentMap._matchClusterSpawns;
    net.lastWorld = world;
    if (net.outbox.length > 2) {
      net.outbox = [];
    }
    net.outbox.push({
      kind: "world",
      data: world
    });
  } else {
    var active = net.focused && !net.lobby && !devConsole.active;
    net.outbox.push({
      kind: "input",
      data: {
        angle: bodyAngle,
        slot: net.slot,
        slotVersion: net.slotVersion,
        click: net.click,
        reload: net.reload,
        saber: net.saber,
        dash: net.dash,
        fire: active && mouseIsPressed && !net.mouseBlocked,
        up: active && !!(keys[87] || keys[38]),
        down: active && !!(keys[83] || keys[40]),
        left: active && !!(keys[65] || keys[37]),
        right: active && !!(keys[68] || keys[39]),
        sprint: active && !!keys[16],
        jump: active && !!keys[32],
        jetpack: jetpackEquipped,
        className: net.className,
        team: net.team
      }
    });
  }
};
battlefrontNet.baseDraw = draw;
battlefrontNet.baseTick = updateGameTick;
battlefrontNet.baseKeyPressed = keyPressed;
battlefrontNet.baseMousePressed = mousePressed;
battlefrontNet.baseAIUpdate = AIPlayer.prototype.update;
battlefrontNet.baseAIRender = AIPlayer.prototype.render;
battlefrontNet.baseTransition = transitionToPlay;
editorRecommendationVisible = false;
matchGameModes = ["Team Deathmatch"];
transitionToPlay = function(map) {
  battlefrontNet.resetRound();
  battlefrontNet.baseTransition(map);
};
AIPlayer.prototype.update = function() {
  if (this.netHuman) {
    return battlefrontNet.updateHuman(this);
  }
  return battlefrontNet.baseAIUpdate.call(this);
};
AIPlayer.prototype.render = function() {
  if (this.netHuman) {
    battlefrontNet.renderActor(this);
  } else {
    battlefrontNet.baseAIRender.call(this);
  }
};
updateGameTick = function() {
  if (!battlefrontNet.state.connected || !battlefrontNet.state.host || battlefrontNet.lobby) {
    return;
  }
  battlefrontNet.baseTick();
};
keyPressed = function() {
  var net = battlefrontNet;
  if (net.lobby) {
    var field = net.field === "invite" ? "invite" : "name";
    if (keyCode === 8) {
      net[field] = net[field].slice(0, -1);
    } else if (keyCode === 9) {
      net.field = field === "name" ? "invite" : "name";
    } else if (keyCode === 13) {
      net.requestRoom(net.invite ? "join" : "create");
    } else if (typeof key === "string" && key.length === 1 && keyCode !== 17 && keyCode !== 91) {
      net[field] = (net[field] + key).slice(0, field === "name" ? 16 : 600);
    }
    return;
  }
  if (net.state.connected && !net.state.host && !keys[keyCode]) {
    var selected = keyCode >= 49 && keyCode <= 53 ? keyCode - 49 : keyCode === inputKeys.medkit ? 1 : keyCode === inputKeys.detonator ? 2 : keyCode === inputKeys.landmine ? 3 : -1;
    if (selected >= 0) {
      net.slot = selected;
      net.slotVersion++;
      inventoryState.selected = selected;
    }
    if (keyCode === inputKeys.reload) {
      net.reload++;
    }
    if (keyCode === inputKeys.saber) {
      net.saber++;
    }
    if (keyCode === inputKeys.dash) {
      net.dash++;
    }
    if (keyCode === inputKeys.cosmetics) {
      inventoryState.cosmeticsOpen = !inventoryState.cosmeticsOpen;
    }
    if (keyCode === inputKeys.escape) {
      net.lobby = true;
      return;
    }
  }
  net.baseKeyPressed();
};
mousePressed = function() {
  var net = battlefrontNet;
  if (net.lobby) {
    net.lobbyClick();
    return;
  }
  if (abs(mouseX - width / 2) <= 120 && mouseY < 28) {
    net.lobby = true;
    return;
  }
  if (net.state.connected && !net.state.host) {
    net.mouseBlocked = false;
    if (devConsole.active) {
      net.mouseBlocked = true;
      return;
    }
    if (abs(mouseX - (width - 48)) <= 39 && abs(mouseY - (hotbarTop() + 370)) <= 15) {
      inventoryState.cosmeticsOpen = !inventoryState.cosmeticsOpen;
      net.mouseBlocked = true;
      return;
    }
    if (inventoryState.cosmeticsOpen && abs(mouseX - width / 2) <= 110 && abs(mouseY - height / 2) <= 74) {
      if (getSelectedCharacterData().equipment && abs(mouseY - (height / 2 + 8)) <= 18) {
        jetpackEquipped = !jetpackEquipped;
      }
      net.mouseBlocked = true;
      return;
    }
    if (mouseX >= width - 87 && mouseX <= width - 9) {
      var slot = floor((mouseY - hotbarTop()) / 70);
      if (slot >= 0 && slot <= 4) {
        net.slot = slot;
        net.slotVersion++;
        inventoryState.selected = slot;
        net.mouseBlocked = true;
        return;
      }
    }
    net.click++;
  }
  net.baseMousePressed();
};
draw = function() {
  var net = battlefrontNet;
  try {
    net.poll();
    if (gameStage === "ImageLoad") {
      net.smoothVisuals();
      net.baseDraw();
      return;
    }
    if (net.lobby) {
      net.drawLobby();
      return;
    }
    if (!net.state.host && (net.waiting || !net.lastWorld || net.lastWorld.stage !== "Play")) {
      background(10, 17, 28);
      fill(190, 220, 240);
      textAlign(CENTER, CENTER);
      textFont(basicMainFont, 18);
      text(net.state.connected ? "Waiting for the host to start" : net.state.message, width / 2, height / 2);
    } else {
      net.smoothVisuals();
      net.baseDraw();
    }
    pushStyle();
    rectMode(CORNER);
    noStroke();
    fill(15, 25, 40, 150);
    rect(width / 2 - 120, 2, 240, 24, 5);
    fill(175, 220, 245);
    textAlign(CENTER, CENTER);
    textFont(basicMainFont, 11);
    text((net.state.host ? "HOST" : "PLAYER") + "  " + net.state.peers.length + "/8  " + net.state.ping + " ms" + (net.state.connected ? "" : "  RECONNECTING"), width / 2, 14);
    popStyle();
  } catch (error) {
    runtimeFailed = true;
    runtimeErrMsg = String(error) + (error.stack ? "\n" + error.stack : "");
    drawRuntimeError();
  }
};
