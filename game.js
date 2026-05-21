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
let animationId = 0;
let particles = [];
let rocks = [];

const caesar = {
  x: 1010,
  y: 360,
  radius: 24,
  speed: 6.7,
  boost: false,
  boostFuel: 100,
};

const octopus = {
  x: 210,
  y: 360,
  radius: 46,
  targetRadius: 46,
  speed: 1.75,
  wobble: 0,
};

bestEl.textContent = best;

function resizeCanvas() {
  const previousWidth = canvas.width;
  const previousHeight = canvas.height;
  canvas.width = Math.max(720, Math.floor(window.innerWidth));
  canvas.height = Math.max(480, Math.floor(window.innerHeight));

  if (previousWidth && previousHeight) {
    caesar.x = clamp(caesar.x * (canvas.width / previousWidth), caesar.radius, canvas.width - caesar.radius);
    caesar.y = clamp(caesar.y * (canvas.height / previousHeight), caesar.radius, canvas.height - caesar.radius);
    octopus.x = clamp(octopus.x * (canvas.width / previousWidth), octopus.radius, canvas.width - octopus.radius);
    octopus.y = clamp(octopus.y * (canvas.height / previousHeight), octopus.radius, canvas.height - octopus.radius);
  }
}

function resetGame() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = 0;
  }
  resizeCanvas();
  running = true;
  gameOver = false;
  score = 0;
  frame = 0;
  lastTime = 0;
  caesar.x = canvas.width - 250;
  caesar.y = canvas.height / 2;
  caesar.boost = false;
  caesar.boostFuel = 100;
  octopus.x = 220;
  octopus.y = canvas.height / 2;
  octopus.radius = 46;
  octopus.targetRadius = 46;
  octopus.speed = 1.75;
  particles = Array.from({ length: 88 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 1 + Math.random() * 5,
    drift: 0.15 + Math.random() * 0.72,
    depth: 0.3 + Math.random() * 0.7,
  }));
  rocks = Array.from({ length: 9 }, (_, index) => ({
    x: (index / 8) * canvas.width + Math.random() * 90 - 45,
    y: canvas.height - 38 - Math.random() * 20,
    width: 76 + Math.random() * 95,
    height: 20 + Math.random() * 32,
  }));
  startButton.textContent = "Start";
  startButton.classList.add("hidden");
  animationId = requestAnimationFrame(loop);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  const closest = {
    x: start.x + dx * t,
    y: start.y + dy * t,
  };
  return distance(point, closest);
}

function getTentacles() {
  return Array.from({ length: 8 }, (_, index) => {
    const angle = -0.38 + (Math.PI * 1.76 * index) / 7;
    const wave = Math.sin(octopus.wobble + index * 0.75) * 18;
    const start = {
      x: octopus.x + Math.cos(angle) * octopus.radius * 0.42,
      y: octopus.y + 14 + Math.sin(angle) * octopus.radius * 0.26,
    };
    const control = {
      x: octopus.x + Math.cos(angle) * (octopus.radius * 0.82) + wave,
      y: octopus.y + octopus.radius * 0.9 + Math.cos(index) * 16,
    };
    const end = {
      x: octopus.x + Math.cos(angle) * (octopus.radius * 1.35) + wave * 0.55,
      y: octopus.y + octopus.radius * 1.52 + Math.sin(octopus.wobble + index) * 11,
    };
    return { start, control, end, index };
  });
}

function quadraticPoint(start, control, end, t) {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
    y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y,
  };
}

function hitTentacle() {
  const tentacleThickness = Math.max(11, octopus.radius * 0.2);
  const hitRadius = caesar.radius + tentacleThickness * 0.44;
  return getTentacles().some((tentacle) => {
    let previous = tentacle.start;
    for (let step = 1; step <= 12; step += 1) {
      const point = quadraticPoint(tentacle.start, tentacle.control, tentacle.end, step / 12);
      if (pointToSegmentDistance(caesar, previous, point) <= hitRadius) {
        return true;
      }
      previous = point;
    }
    return false;
  });
}

function updateCaesar(deltaScale) {
  let dx = 0;
  let dy = 0;
  let pointerDistance = 0;

  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;

  if (pointer.active) {
    const pointerDx = pointer.x - caesar.x;
    const pointerDy = pointer.y - caesar.y;
    pointerDistance = Math.hypot(pointerDx, pointerDy);
    if (pointerDistance > 8) {
      dx += pointerDx;
      dy += pointerDy;
    }
  }

  const length = Math.hypot(dx, dy);
  const boosting = caesar.boost && caesar.boostFuel > 0;
  const moveSpeed = caesar.speed * (boosting ? 1.75 : 1);
  if (length > 0) {
    const maxStep = moveSpeed * deltaScale;
    const step = pointer.active && pointerDistance > 0 ? Math.min(maxStep, pointerDistance) : maxStep;
    caesar.x += (dx / length) * step;
    caesar.y += (dy / length) * step;
  }

  if (boosting) {
    caesar.boostFuel -= 1.1 * deltaScale;
  } else {
    caesar.boostFuel = Math.min(100, caesar.boostFuel + 0.28 * deltaScale);
  }

  caesar.x = clamp(caesar.x, caesar.radius, canvas.width - caesar.radius);
  caesar.y = clamp(caesar.y, caesar.radius, canvas.height - caesar.radius);
}

function updateOctopus(deltaScale) {
  const dx = caesar.x - octopus.x;
  const dy = caesar.y - octopus.y;
  const length = Math.hypot(dx, dy) || 1;
  const growthSteps = Math.floor(score / GROWTH_INTERVAL_FRAMES);
  octopus.targetRadius = Math.min(98, 46 + growthSteps * 7);
  octopus.radius += (octopus.targetRadius - octopus.radius) * 0.025;
  octopus.speed = Math.min(7.1, 1.75 + score / 1400);
  octopus.x += (dx / length) * octopus.speed * deltaScale;
  octopus.y += (dy / length) * octopus.speed * deltaScale;
  octopus.wobble += (0.12 + octopus.speed * 0.012) * deltaScale;
}

function update(deltaScale) {
  frame += deltaScale;
  score += deltaScale;
  scoreEl.textContent = Math.floor(score / 6);
  updateCaesar(deltaScale);
  updateOctopus(deltaScale);

  particles.forEach((particle) => {
    particle.x -= particle.drift * particle.depth * deltaScale;
    particle.y += (Math.sin((frame + particle.x) * 0.015) * 0.18 - 0.12 * particle.depth) * deltaScale;
    if (particle.x < -10) {
      particle.x = canvas.width + 10;
      particle.y = Math.random() * canvas.height;
    }
    if (particle.y < -10) {
      particle.y = canvas.height + 10;
    }
  });

  if (distance(caesar, octopus) < caesar.radius + octopus.radius - 8 || hitTentacle()) {
    endGame();
  }
}

function endGame() {
  running = false;
  gameOver = true;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = 0;
  }
  const finalScore = Math.floor(score / 6);
  if (finalScore > best) {
    best = finalScore;
    localStorage.setItem(STORAGE_KEY, String(best));
    bestEl.textContent = best;
  }
  startButton.textContent = "Play Again";
  startButton.classList.remove("hidden");
}

function drawOcean() {
  const water = ctx.createLinearGradient(0, 0, 0, canvas.height);
  water.addColorStop(0, "#0c5f82");
  water.addColorStop(0.48, "#073856");
  water.addColorStop(1, "#02111f");
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const light = ctx.createRadialGradient(canvas.width * 0.25, -100, 80, canvas.width * 0.25, -70, canvas.width * 0.8);
  light.addColorStop(0, "rgba(151, 226, 255, 0.42)");
  light.addColorStop(0.42, "rgba(151, 226, 255, 0.12)");
  light.addColorStop(1, "rgba(151, 226, 255, 0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(197, 244, 255, 0.08)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    const x = i * 170 + ((frame * 0.35) % 170) - 170;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 45, 180, x - 32, 350, x + 34, canvas.height);
    ctx.stroke();
  }

  particles.forEach((particle) => {
    ctx.fillStyle = `rgba(220, 251, 255, ${0.14 + particle.depth * 0.22})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  const sand = ctx.createLinearGradient(0, canvas.height - 110, 0, canvas.height);
  sand.addColorStop(0, "rgba(22, 42, 44, 0)");
  sand.addColorStop(1, "rgba(19, 29, 27, 0.95)");
  ctx.fillStyle = sand;
  ctx.fillRect(0, canvas.height - 120, canvas.width, 120);

  rocks.forEach((rock) => {
    ctx.fillStyle = "rgba(7, 13, 18, 0.62)";
    ctx.beginPath();
    ctx.ellipse(rock.x, rock.y, rock.width, rock.height, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawOctopus() {
  ctx.save();
  ctx.translate(octopus.x, octopus.y);

  ctx.shadowColor = "rgba(0, 0, 0, 0.36)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "rgba(174, 30, 74, 0.2)";
  ctx.beginPath();
  ctx.arc(0, 6, octopus.radius + 22 + Math.sin(octopus.wobble) * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = "#8f2344";
  ctx.lineWidth = Math.max(11, octopus.radius * 0.2);
  ctx.lineCap = "round";
  getTentacles().forEach((tentacle) => {
    const startX = tentacle.start.x - octopus.x;
    const startY = tentacle.start.y - octopus.y;
    const midX = tentacle.control.x - octopus.x;
    const midY = tentacle.control.y - octopus.y;
    const endX = tentacle.end.x - octopus.x;
    const endY = tentacle.end.y - octopus.y;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 126, 156, 0.38)";
    ctx.lineWidth = Math.max(4, octopus.radius * 0.055);
    ctx.beginPath();
    ctx.moveTo(startX - 4, startY + 2);
    ctx.quadraticCurveTo(midX - 7, midY, endX - 3, endY - 1);
    ctx.stroke();

    ctx.strokeStyle = "#8f2344";
    ctx.lineWidth = Math.max(11, octopus.radius * 0.2);
    ctx.fillStyle = "rgba(255, 186, 201, 0.82)";
    for (let cup = 0; cup < 3; cup += 1) {
      const t = 0.42 + cup * 0.16;
      const cupX = startX * (1 - t) + endX * t + Math.sin(tentacle.index + cup) * 5;
      const cupY = startY * (1 - t) + endY * t;
      ctx.beginPath();
      ctx.arc(cupX, cupY, Math.max(3, octopus.radius * 0.038), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(107, 22, 48, 0.42)";
      ctx.beginPath();
      ctx.arc(cupX, cupY, Math.max(1.4, octopus.radius * 0.016), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 186, 201, 0.82)";
    }
  });

  const body = ctx.createRadialGradient(-octopus.radius * 0.25, -octopus.radius * 0.45, 8, 0, 0, octopus.radius * 1.2);
  body.addColorStop(0, "#ff8aa5");
  body.addColorStop(0.44, "#d73b68");
  body.addColorStop(1, "#851d3e");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -8, octopus.radius * 0.88, octopus.radius, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 178, 196, 0.28)";
  ctx.beginPath();
  ctx.ellipse(-12, 5, octopus.radius * 0.34, octopus.radius * 0.2, -0.3, 0, Math.PI * 2);
  ctx.ellipse(18, 12, octopus.radius * 0.24, octopus.radius * 0.16, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 180, 197, 0.34)";
  ctx.lineWidth = Math.max(2, octopus.radius * 0.035);
  ctx.beginPath();
  ctx.arc(-octopus.radius * 0.14, -octopus.radius * 0.14, octopus.radius * 0.52, Math.PI * 1.1, Math.PI * 1.75);
  ctx.stroke();

  ctx.fillStyle = "#5f1430";
  ctx.beginPath();
  ctx.ellipse(octopus.radius * 0.08, octopus.radius * 0.24, octopus.radius * 0.16, octopus.radius * 0.08, 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-octopus.radius * 0.26, -octopus.radius * 0.24, octopus.radius * 0.14, 0, Math.PI * 2);
  ctx.arc(octopus.radius * 0.26, -octopus.radius * 0.24, octopus.radius * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#281018";
  ctx.beginPath();
  ctx.ellipse(-octopus.radius * 0.24, -octopus.radius * 0.24, octopus.radius * 0.04, octopus.radius * 0.09, 0, 0, Math.PI * 2);
  ctx.ellipse(octopus.radius * 0.28, -octopus.radius * 0.24, octopus.radius * 0.04, octopus.radius * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCaesar() {
  ctx.save();
  ctx.translate(caesar.x, caesar.y);

  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;

  ctx.fillStyle = "rgba(125, 242, 195, 0.18)";
  ctx.beginPath();
  ctx.arc(0, 0, caesar.radius + 8, 0, Math.PI * 2);
  ctx.fill();

  const suit = ctx.createLinearGradient(-caesar.radius, -caesar.radius, caesar.radius, caesar.radius);
  suit.addColorStop(0, "#95f5ce");
  suit.addColorStop(1, "#1d8760");
  ctx.fillStyle = suit;
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
  ctx.shadowColor = "transparent";
  ctx.restore();
}

function drawHud() {
  const fuelWidth = 150;
  ctx.fillStyle = "rgba(3, 20, 33, 0.46)";
  ctx.fillRect(18, 18, 194, 42);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 194, 42);

  ctx.fillStyle = "#f7fbff";
  ctx.font = "800 14px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Boost", 30, 44);

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillRect(82, 31, fuelWidth, 12);
  ctx.fillStyle = "#7df2c3";
  ctx.fillRect(82, 31, fuelWidth * (caesar.boostFuel / 100), 12);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.strokeRect(82, 31, fuelWidth, 12);
}

function drawScene() {
  drawOcean();
  drawHud();
  drawCaesar();
  drawOctopus();

  if (!running && !gameOver) {
    ctx.fillStyle = "#f7fbff";
    ctx.font = "800 30px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Move Caesar. Avoid the octopus tentacles.", canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = "700 18px Inter, sans-serif";
    ctx.fillText("Use WASD, arrows, drag, or the buttons.", canvas.width / 2, canvas.height / 2 + 22);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(22, 22, 22, 0.76)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 34px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("The octopus caught Caesar", canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = "700 18px Inter, sans-serif";
    ctx.fillText("Try again before it gets too fast.", canvas.width / 2, canvas.height / 2 + 24);
  }
}

function loop(time) {
  if (!running) return;
  if (!lastTime) lastTime = time;
  const elapsed = Math.min(50, time - lastTime);
  const deltaScale = elapsed / (1000 / 60) || 1;
  update(deltaScale);
  drawScene();
  lastTime = time;
  if (running) {
    animationId = requestAnimationFrame(loop);
  }
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

window.addEventListener("resize", () => {
  resizeCanvas();
  if (!running) drawScene();
});

resizeCanvas();
drawScene();
