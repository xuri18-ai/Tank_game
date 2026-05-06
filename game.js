const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const livesEl = document.querySelector("#lives");
const enemiesEl = document.querySelector("#enemies");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");

const TILE = 50;
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
let game;
let lastTime = 0;

const levelMap = [
  "..................",
  "..##......##......",
  "......TT......##..",
  "..##..TT..##......",
  "......##......TT..",
  "..TT......##..TT..",
  "......##..........",
  "..##......TT..##..",
  "......##......##..",
  "..TT......##......",
  "......##......TT..",
  "..................",
];

const playerStart = { x: 95, y: 505 };
const enemyStarts = [
  { x: 805, y: 80, color: "#ff6b8a" },
  { x: 705, y: 255, color: "#9b7bff" },
  { x: 470, y: 455, color: "#38c7a5" },
  { x: 825, y: 505, color: "#ff9f43" },
  { x: 250, y: 135, color: "#45aaf2" },
];

function createGame() {
  return {
    state: "playing",
    score: 0,
    lives: 3,
    shake: 0,
    player: createTank(playerStart.x, playerStart.y, "#ffe66d", true),
    enemies: enemyStarts.map((enemy) => ({
      ...createTank(enemy.x, enemy.y, enemy.color, false),
      aiTimer: 0,
      fireTimer: 0.4 + Math.random() * 1.2,
    })),
    bullets: [],
    particles: [],
    obstacles: makeObstacles(),
  };
}

function createTank(x, y, color, isPlayer) {
  return {
    x,
    y,
    radius: 22,
    color,
    isPlayer,
    direction: isPlayer ? -Math.PI / 2 : Math.PI / 2,
    speed: isPlayer ? 190 : 95,
    cooldown: 0,
    invincible: isPlayer ? 1.8 : 0,
    alive: true,
  };
}

function makeObstacles() {
  const obstacles = [];
  levelMap.forEach((row, rowIndex) => {
    [...row].forEach((cell, columnIndex) => {
      if (cell === ".") return;
      obstacles.push({
        x: columnIndex * TILE + 8,
        y: rowIndex * TILE + 8,
        w: TILE - 16,
        h: TILE - 16,
        type: cell,
        hp: cell === "#" ? 2 : 1,
      });
    });
  });
  return obstacles;
}

function startGame() {
  game = createGame();
  overlay.classList.add("hidden");
  updateHud();
}

function endGame(title, text) {
  game.state = "ended";
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = "再来一局";
  overlay.classList.remove("hidden");
}

function update(delta) {
  if (!game || game.state !== "playing") return;

  game.player.cooldown = Math.max(0, game.player.cooldown - delta);
  game.player.invincible = Math.max(0, game.player.invincible - delta);
  game.shake = Math.max(0, game.shake - delta * 24);
  updatePlayer(delta);

  game.enemies.forEach((enemy) => updateEnemy(enemy, delta));
  updateBullets(delta);
  updateParticles(delta);
  updateHud();

  if (game.lives <= 0) {
    endGame("任务失败", `最终得分：${game.score}。按 Enter 重新开始。`);
  } else if (game.enemies.length === 0) {
    endGame("胜利啦！", `你守住了卡通基地，得分：${game.score}。`);
  }
}

function updatePlayer(delta) {
  const tank = game.player;
  let moveX = 0;
  let moveY = 0;

  if (keys.has("arrowup") || keys.has("w")) moveY -= 1;
  if (keys.has("arrowdown") || keys.has("s")) moveY += 1;
  if (keys.has("arrowleft") || keys.has("a")) moveX -= 1;
  if (keys.has("arrowright") || keys.has("d")) moveX += 1;

  if (moveX || moveY) {
    const length = Math.hypot(moveX, moveY);
    moveX /= length;
    moveY /= length;
    tank.direction = Math.atan2(moveY, moveX);
    moveTank(tank, moveX * tank.speed * delta, moveY * tank.speed * delta);
    puff(tank.x - Math.cos(tank.direction) * 22, tank.y - Math.sin(tank.direction) * 22, "#ffffff", 1);
  }

  if (keys.has(" ")) fireBullet(tank);
}

function updateEnemy(enemy, delta) {
  enemy.cooldown = Math.max(0, enemy.cooldown - delta);
  enemy.aiTimer -= delta;
  enemy.fireTimer -= delta;

  if (enemy.aiTimer <= 0) {
    enemy.aiTimer = 0.7 + Math.random() * 1.1;
    const playerAngle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
    enemy.direction = Math.random() < 0.55 ? playerAngle : Math.floor(Math.random() * 4) * (Math.PI / 2);
  }

  const dx = Math.cos(enemy.direction) * enemy.speed * delta;
  const dy = Math.sin(enemy.direction) * enemy.speed * delta;
  const moved = moveTank(enemy, dx, dy);
  if (!moved) enemy.aiTimer = 0;

  const angleToPlayer = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  const distanceToPlayer = Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y);
  if (distanceToPlayer < 460 && enemy.fireTimer <= 0) {
    enemy.direction = angleToPlayer;
    fireBullet(enemy);
    enemy.fireTimer = 1.0 + Math.random() * 1.5;
  }
}

function moveTank(tank, dx, dy) {
  const originalX = tank.x;
  const originalY = tank.y;
  tank.x = clamp(tank.x + dx, tank.radius + 4, WIDTH - tank.radius - 4);
  if (collidesWithWorld(tank)) tank.x = originalX;
  tank.y = clamp(tank.y + dy, tank.radius + 4, HEIGHT - tank.radius - 4);
  if (collidesWithWorld(tank)) tank.y = originalY;
  return tank.x !== originalX || tank.y !== originalY;
}

function collidesWithWorld(tank) {
  return game.obstacles.some((block) => circleRectCollision(tank, block));
}

function fireBullet(tank) {
  if (tank.cooldown > 0) return;
  tank.cooldown = tank.isPlayer ? 0.28 : 0.75;
  const speed = tank.isPlayer ? 430 : 310;
  game.bullets.push({
    x: tank.x + Math.cos(tank.direction) * 28,
    y: tank.y + Math.sin(tank.direction) * 28,
    vx: Math.cos(tank.direction) * speed,
    vy: Math.sin(tank.direction) * speed,
    radius: tank.isPlayer ? 7 : 6,
    owner: tank.isPlayer ? "player" : "enemy",
    color: tank.isPlayer ? "#ff6b8a" : "#6b7cff",
  });
  puff(tank.x + Math.cos(tank.direction) * 34, tank.y + Math.sin(tank.direction) * 34, "#ffe66d", 8);
}

function updateBullets(delta) {
  game.bullets = game.bullets.filter((bullet) => {
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;

    if (bullet.x < -20 || bullet.x > WIDTH + 20 || bullet.y < -20 || bullet.y > HEIGHT + 20) return false;

    const hitBlock = game.obstacles.find((block) => circleRectCollision(bullet, block));
    if (hitBlock) {
      hitBlock.hp -= 1;
      if (hitBlock.hp <= 0) {
        game.obstacles = game.obstacles.filter((block) => block !== hitBlock);
        burst(hitBlock.x + hitBlock.w / 2, hitBlock.y + hitBlock.h / 2, hitBlock.type === "#" ? "#c58b5a" : "#7ed957", 16);
      } else {
        burst(bullet.x, bullet.y, "#f6c177", 8);
      }
      return false;
    }

    if (bullet.owner === "player") {
      const target = game.enemies.find((enemy) => Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.radius + bullet.radius);
      if (target) {
        game.enemies = game.enemies.filter((enemy) => enemy !== target);
        game.score += 120;
        game.shake = 8;
        burst(target.x, target.y, target.color, 28);
        return false;
      }
    } else if (game.player.invincible <= 0 && Math.hypot(game.player.x - bullet.x, game.player.y - bullet.y) < game.player.radius + bullet.radius) {
      game.lives -= 1;
      game.player.x = playerStart.x;
      game.player.y = playerStart.y;
      game.player.direction = -Math.PI / 2;
      game.player.invincible = 1.7;
      game.shake = 10;
      burst(bullet.x, bullet.y, "#ff6b8a", 24);
      return false;
    }

    return true;
  });
}

function updateParticles(delta) {
  game.particles = game.particles.filter((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.life -= delta;
    particle.size *= 0.985;
    return particle.life > 0;
  });
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 190;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 9,
      color,
      life: 0.35 + Math.random() * 0.45,
    });
  }
}

function puff(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    game.particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 38,
      vy: (Math.random() - 0.5) * 38,
      size: 3 + Math.random() * 6,
      color,
      life: 0.22 + Math.random() * 0.22,
    });
  }
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  if (game?.shake > 0) ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  drawBackground();

  if (game) {
    game.obstacles.forEach(drawObstacle);
    game.particles.forEach(drawParticle);
    game.bullets.forEach(drawBullet);
    game.enemies.forEach(drawTank);
    drawTank(game.player);
  }

  ctx.restore();
}

function drawBackground() {
  ctx.fillStyle = "#aaf18f";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let x = 0; x < WIDTH; x += 90) {
    for (let y = 0; y < HEIGHT; y += 90) {
      ctx.fillStyle = (x + y) % 180 === 0 ? "rgba(255,255,255,0.14)" : "rgba(100,170,80,0.12)";
      roundedRect(x + 10, y + 10, 42, 12, 8, true);
      roundedRect(x + 45, y + 48, 24, 10, 8, true);
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 3;
  for (let x = TILE; x < WIDTH; x += TILE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = TILE; y < HEIGHT; y += TILE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawObstacle(block) {
  if (block.type === "#") {
    ctx.fillStyle = "#d59b67";
    roundedRect(block.x, block.y, block.w, block.h, 8, true);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundedRect(block.x + 6, block.y + 6, block.w - 12, 8, 4, true);
    ctx.strokeStyle = "#8d5b3d";
  } else {
    ctx.fillStyle = "#4ed96f";
    roundedRect(block.x, block.y, block.w, block.h, 13, true);
    ctx.fillStyle = "#7dff95";
    roundedRect(block.x + 6, block.y + 6, block.w - 12, 10, 8, true);
    ctx.strokeStyle = "#219a46";
  }
  ctx.lineWidth = 4;
  roundedRect(block.x, block.y, block.w, block.h, block.type === "#" ? 8 : 13, false);
}

function drawTank(tank) {
  if (!tank.alive) return;
  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate(tank.direction);
  ctx.globalAlpha = tank.invincible > 0 && Math.floor(tank.invincible * 12) % 2 === 0 ? 0.5 : 1;

  ctx.fillStyle = "rgba(38,50,74,0.2)";
  roundedRect(-23, 17, 46, 12, 10, true);

  ctx.fillStyle = darken(tank.color, 0.16);
  roundedRect(-25, -22, 50, 44, 14, true);
  ctx.strokeStyle = "#26324a";
  ctx.lineWidth = 4;
  roundedRect(-25, -22, 50, 44, 14, false);

  ctx.fillStyle = "#26324a";
  roundedRect(-30, -18, 12, 36, 8, true);
  roundedRect(18, -18, 12, 36, 8, true);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  roundedRect(-28, -14, 8, 7, 4, true);
  roundedRect(20, -14, 8, 7, 4, true);

  ctx.fillStyle = tank.color;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#26324a";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#f7fbff";
  ctx.beginPath();
  ctx.arc(4, -6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = tank.isPlayer ? "#ff6b8a" : "#6b7cff";
  roundedRect(10, -6, 32, 12, 7, true);
  ctx.strokeStyle = "#26324a";
  ctx.lineWidth = 4;
  roundedRect(10, -6, 32, 12, 7, false);

  ctx.restore();
}

function drawBullet(bullet) {
  ctx.fillStyle = bullet.color;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#26324a";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(bullet.x - bullet.radius / 3, bullet.y - bullet.radius / 3, bullet.radius / 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticle(particle) {
  ctx.globalAlpha = Math.max(0, particle.life * 2.4);
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function circleRectCollision(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
  return Math.hypot(circle.x - closestX, circle.y - closestY) < circle.radius;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundedRect(x, y, w, h, radius, fill) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  if (fill) ctx.fill();
  else ctx.stroke();
}

function darken(hex, amount) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = Math.round(Math.max(0, ((value >> 16) & 255) * (1 - amount)));
  const g = Math.round(Math.max(0, ((value >> 8) & 255) * (1 - amount)));
  const b = Math.round(Math.max(0, (value & 255) * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

function updateHud() {
  scoreEl.textContent = game.score;
  livesEl.textContent = game.lives;
  enemiesEl.textContent = game.enemies.length;
}

function loop(time = 0) {
  const delta = Math.min(0.032, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
  if (key === "enter") startGame();
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

startButton.addEventListener("click", startGame);

game = createGame();
updateHud();
loop();
