const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const moveButton = document.querySelector("#moveButton");
const boostButton = document.querySelector("#boostButton");

const STORAGE_KEY = "satyam-octopus-best";
const GROWTH_INTERVAL_FRAMES = 300;
const keys = new Set();
const pointer = { active: false, x: 0, y: 0 };
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let running = false;
let gameOver = false;
let score = 0;
let frame = 0;
let lastTime = 0;
let particles = [];

const caesar = {
  x: 720,
  y: 270,
  radius: 22,
  speed: 4.3,
  boost: false,
  boostFuel: 100,
};

const octopus = {
  x: 180,
  y: 270,
  radius: 42,
  targetRadius: 42,
  speed: 1.55,
  wobble: 0,
};

bestEl.textContent = best;

function resetGame() {
  running = true;
  gameOver = false;
  score = 0;
  frame = 0;
  lastTime = 0;
  caesar.x = 720;
  caesar.y = 270;
  caesar.boost = false;
  caesar.boostFuel = 100;
  octopus.x = 180;
  octopus.y = 270;
  octopus.radius = 42;
  octopus.targetRadius = 42;
  octopus.speed = 1.55;
  particles = Array.from({ length: 30 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 2 + Math.random() * 4,
    drift: 0.25 + Math.random() * 0.55,
  }));
  startButton.textContent = "Start";
  startButton.classList.add("hidden");
  requestAnimationFrame(loop);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function updateCaesar() {
  let dx = 0;
  let dy = 0;

  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;

  if (pointer.active) {
    dx += pointer.x - caesar.x;
    dy += pointer.y - caesar.y;
  }

  const length = Math.hypot(dx, dy) || 1;
  const boosting = caesar.boost && caesar.boostFuel > 0;
  const moveSpeed = caesar.speed * (boosting ? 1.65 : 1);
  caesar.x += (dx / length) * moveSpeed;
  caesar.y += (dy / length) * moveSpeed;

  if (boosting) {
    caesar.boostFuel -= 1.1;
  } else {
    caesar.boostFuel = Math.min(100, caesar.boostFuel + 0.28);
  }

  caesar.x = clamp(caesar.x, caesar.radius, canvas.width - caesar.radius);
  caesar.y = clamp(caesar.y, caesar.radius, canvas.height - caesar.radius);
}

function updateOctopus() {
  const dx = caesar.x - octopus.x;
  const dy = caesar.y - octopus.y;
  const length = Math.hypot(dx, dy) || 1;
  const growthSteps = Math.floor(score / GROWTH_INTERVAL_FRAMES);
  octopus.targetRadius = Math.min(86, 42 + growthSteps * 6);
  octopus.radius += (octopus.targetRadius - octopus.radius) * 0.025;
  octopus.speed = Math.min(6.4, 1.55 + score / 1450);
  octopus.x += (dx / length) * octopus.speed;
  octopus.y += (dy / length) * octopus.speed;
  octopus.wobble += 0.12 + octopus.speed * 0.012;
}

function update() {
  frame += 1;
  score += 1;
  scoreEl.textContent = Math.floor(score / 6);
  updateCaesar();
  updateOctopus();

  particles.forEach((particle) => {
    particle.x -= particle.drift;
    particle.y += Math.sin((frame + particle.x) * 0.015) * 0.18;
    if (particle.x < -10) {
      particle.x = canvas.width + 10;
      particle.y = Math.random() * canvas.height;
    }
  });

  if (distance(caesar, octopus) < caesar.radius + octopus.radius - 8) {
    endGame();
  }
}

function endGame() {
  running = false;
  gameOver = true;
  const finalScore = Math.floor(score / 6);
  if (finalScore > best) {
    best = finalScore;
    localStorage.setItem(STORAGE_KEY, String(best));
    bestEl.textContent = best;
  }
  startButton.textContent = "Play Again";
  startButton.classList.remove("hidden");
}

function drawGrid() {
  ctx.fillStyle = "#dff5ec";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(22, 22, 22, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  particles.forEach((particle) => {
    ctx.fillStyle = "rgba(44, 143, 85, 0.18)";
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawOctopus() {
  ctx.save();
  ctx.translate(octopus.x, octopus.y);

  ctx.fillStyle = "rgba(217, 59, 99, 0.2)";
  ctx.beginPath();
  ctx.arc(0, 6, octopus.radius + 22 + Math.sin(octopus.wobble) * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#b72b54";
  ctx.lineWidth = Math.max(10, octopus.radius * 0.22);
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i += 1) {
    const angle = -0.2 + (Math.PI * 1.4 * i) / 7;
    const wave = Math.sin(octopus.wobble + i * 0.75) * 12;
    const startX = Math.cos(angle) * octopus.radius * 0.48;
    const startY = 18 + Math.sin(angle) * octopus.radius * 0.28;
    const midX = Math.cos(angle) * (octopus.radius * 0.75) + wave;
    const midY = octopus.radius * 0.95;
    const endX = Math.cos(angle) * (octopus.radius * 1.2) + wave * 0.45;
    const endY = octopus.radius * 1.42 + Math.sin(octopus.wobble + i) * 8;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }

  ctx.fillStyle = "#d93b63";
  ctx.beginPath();
  ctx.ellipse(0, -8, octopus.radius * 0.88, octopus.radius, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ef6f91";
  ctx.beginPath();
  ctx.ellipse(-12, 5, octopus.radius * 0.34, octopus.radius * 0.2, -0.3, 0, Math.PI * 2);
  ctx.ellipse(18, 12, octopus.radius * 0.24, octopus.radius * 0.16, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-octopus.radius * 0.26, -octopus.radius * 0.24, octopus.radius * 0.14, 0, Math.PI * 2);
  ctx.arc(octopus.radius * 0.26, -octopus.radius * 0.24, octopus.radius * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#161616";
  ctx.beginPath();
  ctx.arc(-octopus.radius * 0.24, -octopus.radius * 0.24, octopus.radius * 0.055, 0, Math.PI * 2);
  ctx.arc(octopus.radius * 0.28, -octopus.radius * 0.24, octopus.radius * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCaesar() {
  ctx.save();
  ctx.translate(caesar.x, caesar.y);

  ctx.fillStyle = "rgba(44, 143, 85, 0.22)";
  ctx.beginPath();
  ctx.arc(0, 0, caesar.radius + 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2c8f55";
  ctx.beginPath();
  ctx.arc(0, 0, caesar.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffd45a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -4, caesar.radius + 5, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-7, -5, 5, 0, Math.PI * 2);
  ctx.arc(8, -5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#161616";
  ctx.beginPath();
  ctx.arc(-6, -5, 2, 0, Math.PI * 2);
  ctx.arc(9, -5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#161616";
  ctx.font = "800 14px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Caesar", 0, 42);
  ctx.restore();
}

function drawHud() {
  const fuelWidth = 150;
  ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
  ctx.fillRect(18, 18, 194, 42);
  ctx.strokeStyle = "#161616";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 194, 42);

  ctx.fillStyle = "#161616";
  ctx.font = "800 14px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Boost", 30, 44);

  ctx.fillStyle = "#e8e8e8";
  ctx.fillRect(82, 31, fuelWidth, 12);
  ctx.fillStyle = "#ffd45a";
  ctx.fillRect(82, 31, fuelWidth * (caesar.boostFuel / 100), 12);
  ctx.strokeStyle = "#161616";
  ctx.strokeRect(82, 31, fuelWidth, 12);
}

function drawScene() {
  drawGrid();
  drawHud();
  drawCaesar();
  drawOctopus();

  if (!running && !gameOver) {
    ctx.fillStyle = "#161616";
    ctx.font = "800 25px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Move Caesar. Avoid the octopus.", canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = "700 17px Inter, sans-serif";
    ctx.fillText("Use WASD, arrows, drag, or the buttons.", canvas.width / 2, canvas.height / 2 + 22);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(22, 22, 22, 0.76)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 34px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("The octopus ate Caesar", canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = "700 18px Inter, sans-serif";
    ctx.fillText("Try again before it gets too fast.", canvas.width / 2, canvas.height / 2 + 24);
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

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

startButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);
moveButton.addEventListener("click", () => {
  if (!running || gameOver) resetGame();
  pointer.active = true;
  pointer.x = canvas.width - 120;
  pointer.y = canvas.height / 2;
});
boostButton.addEventListener("pointerdown", () => {
  caesar.boost = true;
});
boostButton.addEventListener("pointerup", () => {
  caesar.boost = false;
});
boostButton.addEventListener("pointerleave", () => {
  caesar.boost = false;
});

canvas.addEventListener("pointerdown", (event) => {
  if (!running || gameOver) resetGame();
  pointer.active = true;
  Object.assign(pointer, canvasPoint(event));
});
canvas.addEventListener("pointermove", (event) => {
  if (pointer.active) Object.assign(pointer, canvasPoint(event));
});
canvas.addEventListener("pointerup", () => {
  pointer.active = false;
});
canvas.addEventListener("pointerleave", () => {
  pointer.active = false;
});

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "Space") {
    caesar.boost = true;
    if (!running || gameOver) resetGame();
    return;
  }
  keys.add(event.code);
  if (!running || gameOver) resetGame();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (event.code === "Space") caesar.boost = false;
});

drawScene();
