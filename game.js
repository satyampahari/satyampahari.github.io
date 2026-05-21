const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const jumpButton = document.querySelector("#jumpButton");
const duckButton = document.querySelector("#duckButton");

const STORAGE_KEY = "satyam-dino-best";
const groundY = 250;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let running = false;
let gameOver = false;
let score = 0;
let speed = 6;
let frame = 0;
let lastTime = 0;
let spawnTimer = 90;
let clouds = [];
let obstacles = [];

const dino = {
  x: 76,
  y: groundY - 68,
  width: 54,
  height: 68,
  velocityY: 0,
  ducking: false,
  grounded: true,
};

bestEl.textContent = best;

function resetGame() {
  running = true;
  gameOver = false;
  score = 0;
  speed = 6;
  frame = 0;
  spawnTimer = 80;
  lastTime = 0;
  obstacles = [];
  clouds = [
    { x: 160, y: 62, speed: 0.45 },
    { x: 500, y: 88, speed: 0.3 },
    { x: 820, y: 54, speed: 0.38 },
  ];
  dino.y = groundY - dino.height;
  dino.velocityY = 0;
  dino.ducking = false;
  dino.grounded = true;
  startButton.classList.add("hidden");
  requestAnimationFrame(loop);
}

function jump() {
  if (!running || gameOver) {
    resetGame();
    return;
  }

  if (dino.grounded) {
    dino.velocityY = -16;
    dino.grounded = false;
    dino.ducking = false;
  }
}

function setDuck(value) {
  if (!running || gameOver) return;
  dino.ducking = value && dino.grounded;
}

function spawnObstacle() {
  const flying = Math.random() > 0.7 && score > 250;
  obstacles.push({
    x: canvas.width + 30,
    y: flying ? groundY - 96 : groundY - 48,
    width: flying ? 56 : 30 + Math.random() * 22,
    height: flying ? 34 : 48,
    type: flying ? "bird" : "cactus",
  });
  spawnTimer = Math.max(44, 98 - speed * 4 + Math.random() * 38);
}

function update() {
  frame += 1;
  score += 1;
  speed = Math.min(13, 6 + score / 450);
  scoreEl.textContent = Math.floor(score / 5);

  dino.velocityY += 0.72;
  dino.y += dino.velocityY;

  const targetHeight = dino.ducking ? 42 : 68;
  const previousBottom = dino.y + dino.height;
  dino.height += (targetHeight - dino.height) * 0.35;
  dino.y = previousBottom - dino.height;

  if (dino.y + dino.height >= groundY) {
    dino.y = groundY - dino.height;
    dino.velocityY = 0;
    dino.grounded = true;
  }

  spawnTimer -= 1;
  if (spawnTimer <= 0) spawnObstacle();

  obstacles.forEach((obstacle) => {
    obstacle.x -= speed;
  });
  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20);

  clouds.forEach((cloud) => {
    cloud.x -= cloud.speed;
    if (cloud.x < -90) {
      cloud.x = canvas.width + 80;
      cloud.y = 44 + Math.random() * 64;
    }
  });

  if (obstacles.some(collides)) {
    endGame();
  }
}

function collides(obstacle) {
  const padding = dino.ducking ? 9 : 7;
  return (
    dino.x + padding < obstacle.x + obstacle.width &&
    dino.x + dino.width - padding > obstacle.x &&
    dino.y + padding < obstacle.y + obstacle.height &&
    dino.y + dino.height - padding > obstacle.y
  );
}

function endGame() {
  running = false;
  gameOver = true;
  const finalScore = Math.floor(score / 5);
  if (finalScore > best) {
    best = finalScore;
    localStorage.setItem(STORAGE_KEY, String(best));
    bestEl.textContent = best;
  }
  startButton.textContent = "Play Again";
  startButton.classList.remove("hidden");
}

function drawCloud(x, y) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(x, y + 12, 16, 0, Math.PI * 2);
  ctx.arc(x + 18, y + 5, 20, 0, Math.PI * 2);
  ctx.arc(x + 42, y + 13, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x, y + 13, 48, 16);
}

function drawDino() {
  const legOffset = frame % 18 < 9 ? 0 : 8;
  ctx.fillStyle = "#1e8f6f";
  ctx.fillRect(dino.x, dino.y + 16, dino.width, dino.height - 18);
  ctx.fillRect(dino.x + 34, dino.y, 38, 34);
  ctx.fillRect(dino.x + 62, dino.y + 13, 14, 9);
  ctx.fillStyle = "#161616";
  ctx.fillRect(dino.x + 58, dino.y + 9, 5, 5);
  ctx.fillStyle = "#f04d3a";
  ctx.fillRect(dino.x - 11, dino.y + 32, 18, 10);

  if (!dino.ducking) {
    ctx.fillStyle = "#1e8f6f";
    ctx.fillRect(dino.x + 9, groundY - 7 - legOffset, 12, 18);
    ctx.fillRect(dino.x + 34, groundY - 15 + legOffset, 12, 18);
  } else {
    ctx.fillStyle = "#1e8f6f";
    ctx.fillRect(dino.x + 8, groundY - 10, 40, 12);
  }
}

function drawObstacle(obstacle) {
  if (obstacle.type === "bird") {
    ctx.fillStyle = "#6b4bd6";
    ctx.fillRect(obstacle.x, obstacle.y + 12, obstacle.width, 12);
    ctx.fillRect(obstacle.x + 14, obstacle.y, 16, 20);
    ctx.fillRect(obstacle.x + 34, obstacle.y + 6, 18, 18);
    return;
  }

  ctx.fillStyle = "#2f7d32";
  ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  ctx.fillRect(obstacle.x - 12, obstacle.y + 16, 16, 10);
  ctx.fillRect(obstacle.x + obstacle.width - 4, obstacle.y + 25, 16, 10);
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  clouds.forEach((cloud) => drawCloud(cloud.x, cloud.y));

  ctx.fillStyle = "#f8d573";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  ctx.strokeStyle = "#161616";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(canvas.width, groundY);
  ctx.stroke();

  ctx.fillStyle = "rgba(22, 22, 22, 0.16)";
  for (let x = -(frame * speed) % 70; x < canvas.width; x += 70) {
    ctx.fillRect(x, groundY + 34, 28, 4);
  }

  drawDino();
  obstacles.forEach(drawObstacle);

  if (!running && !gameOver) {
    ctx.fillStyle = "#161616";
    ctx.font = "700 24px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Press Space or tap Start", canvas.width / 2, 148);
  }
}

function loop(time) {
  if (!running) return;

  if (!lastTime) lastTime = time;
  const elapsed = time - lastTime;
  if (elapsed > 1000 / 60) {
    update();
    drawScene();
    lastTime = time;
  }
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);
jumpButton.addEventListener("click", jump);
duckButton.addEventListener("pointerdown", () => setDuck(true));
duckButton.addEventListener("pointerup", () => setDuck(false));
duckButton.addEventListener("pointerleave", () => setDuck(false));

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    jump();
  }
  if (event.code === "ArrowDown") {
    event.preventDefault();
    setDuck(true);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowDown") setDuck(false);
});

canvas.addEventListener("pointerdown", jump);
drawScene();
