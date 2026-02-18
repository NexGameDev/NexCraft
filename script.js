const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TILE = 32;
const WORLD_WIDTH = 400;
const WORLD_HEIGHT = 80;
const RENDER_DISTANCE = 30;

let world = [];

/* ===========================
   TEXTURE GENERATOR
=========================== */

const textures = {
  dirt: null,
  grass: null,
  wood: null
};

function createNoiseTexture(color, noiseColor, density) {
  const c = document.createElement("canvas");
  c.width = TILE;
  c.height = TILE;
  const cx = c.getContext("2d");

  cx.fillStyle = color;
  cx.fillRect(0, 0, TILE, TILE);

  for (let i = 0; i < density; i++) {
    const x = Math.floor(Math.random() * TILE);
    const y = Math.floor(Math.random() * TILE);
    const size = Math.random() > 0.5 ? 2 : 1;
    cx.fillStyle = Math.random() > 0.5 ? noiseColor : "rgba(0,0,0,0.2)";
    cx.fillRect(x, y, size, size);
  }
  return c;
}

function initTextures() {
  textures.dirt = createNoiseTexture("#6b4226", "rgba(255,255,255,0.1)", 40);

  const grassCanvas = document.createElement("canvas");
  grassCanvas.width = TILE;
  grassCanvas.height = TILE;
  const gCtx = grassCanvas.getContext("2d");

  gCtx.drawImage(textures.dirt, 0, 0);
  gCtx.fillStyle = "#5fab39";
  gCtx.fillRect(0, 0, TILE, 10);

  for (let x = 0; x < TILE; x += 4) {
    let h = Math.floor(Math.random() * 6) + 2;
    gCtx.fillRect(x, 8, 4, h);
  }

  textures.grass = grassCanvas;

  textures.wood = createNoiseTexture("#8B5A2B", "#5C3A1E", 20);
}

initTextures();

/* ===========================
   PLAYER
=========================== */

const player = {
  x: 0, y: 0,
  width: 20, height: 30,
  vx: 0, vy: 0,
  speed: 3,
  jump: -10,
  gravity: 0.5,
  grounded: false
};

const camera = { x: 0, y: 0, smooth: 0.1 };

let inventory = { dirt: 0, grass: 0, wood: 0 };
let selectedBlock = "dirt";

/* ===========================
   INPUT
=========================== */

const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// MOBILE
document.getElementById("left").ontouchstart = () => keys["a"] = true;
document.getElementById("left").ontouchend = () => keys["a"] = false;
document.getElementById("right").ontouchstart = () => keys["d"] = true;
document.getElementById("right").ontouchend = () => keys["d"] = false;
document.getElementById("jump").ontouchstart = () => keys["w"] = true;
document.getElementById("jump").ontouchend = () => keys["w"] = false;

/* ===========================
   WORLD GENERATION
=========================== */

function generateWorld() {
  for (let x = 0; x < WORLD_WIDTH; x++) {
    world[x] = [];
    let ground = 40 + Math.floor(Math.sin(x * 0.15) * 5);

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      if (y > ground) world[x][y] = 1;
      else if (y === ground) world[x][y] = 2;
      else world[x][y] = 0;
    }

    // TREE
    if (Math.random() < 0.1) {
      let h = 3 + Math.floor(Math.random() * 3);

      for (let t = 1; t <= h; t++) {
        if (ground - t >= 0)
          world[x][ground - t] = 3;
      }

      if (x > 0 && ground - h >= 0)
        world[x - 1][ground - h] = 2;

      if (x < WORLD_WIDTH - 1 && ground - h >= 0)
        world[x + 1][ground - h] = 2;
    }
  }
}

function spawnPlayer() {
  if (!world[20]) return;
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    if (world[20][y] === 2) {
      player.x = 20 * TILE;
      player.y = (y - 1) * TILE;
      break;
    }
  }
}

/* ===========================
   PLAYER UPDATE
=========================== */

function updatePlayer() {

  if (keys["a"]) player.vx = -player.speed;
  else if (keys["d"]) player.vx = player.speed;
  else player.vx = 0;

  if (keys["w"] && player.grounded) {
    player.vy = player.jump;
    player.grounded = false;
  }

  player.vy += player.gravity;

  // HORIZONTAL MOVE
  player.x += player.vx;
  checkCollisionX();

  // VERTICAL MOVE
  player.y += player.vy;
  checkCollisionY();
}

function checkCollisionX() {
  let left = Math.floor(player.x / TILE);
  let right = Math.floor((player.x + player.width) / TILE);
  let top = Math.floor(player.y / TILE);
  let bottom = Math.floor((player.y + player.height - 1) / TILE);

  for (let y = top; y <= bottom; y++) {
    if (world[left] && world[left][y] > 0 && player.vx < 0) {
      player.x = (left + 1) * TILE;
    }

    if (world[right] && world[right][y] > 0 && player.vx > 0) {
      player.x = right * TILE - player.width;
    }
  }
}

function checkCollisionY() {
  player.grounded = false;

  let left = Math.floor(player.x / TILE);
  let right = Math.floor((player.x + player.width - 1) / TILE);
  let top = Math.floor(player.y / TILE);
  let bottom = Math.floor((player.y + player.height) / TILE);

  for (let x = left; x <= right; x++) {

    // FLOOR
    if (world[x] && world[x][bottom] > 0 && player.vy > 0) {
      player.y = bottom * TILE - player.height;
      player.vy = 0;
      player.grounded = true;
    }

    // CEILING
    if (world[x] && world[x][top] > 0 && player.vy < 0) {
      player.y = (top + 1) * TILE;
      player.vy = 0;
    }
  }
}

/* ===========================
   CAMERA
=========================== */

function updateCamera() {
  const targetX = player.x - canvas.width / 2 + player.width / 2;
  const targetY = player.y - canvas.height / 2 + player.height / 2;

  camera.x += (targetX - camera.x) * camera.smooth;
  camera.y += (targetY - camera.y) * camera.smooth;
}

/* ===========================
   DRAW
=========================== */

function drawBlock(type, x, y) {
  if (type === 1) ctx.drawImage(textures.dirt, x, y, TILE, TILE);
  if (type === 2) ctx.drawImage(textures.grass, x, y, TILE, TILE);
  if (type === 3) ctx.drawImage(textures.wood, x, y, TILE, TILE);
}

function drawWorld() {
  let startX = Math.floor(camera.x / TILE) - 1;
  let endX = startX + RENDER_DISTANCE + 2;

  for (let x = startX; x < endX; x++) {
    if (!world[x]) continue;

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      if (world[x][y] > 0) {
        let drawX = x * TILE;
        let drawY = y * TILE;

        if (
          drawX > camera.x - TILE &&
          drawX < camera.x + canvas.width &&
          drawY > camera.y - TILE &&
          drawY < camera.y + canvas.height
        ) {
          drawBlock(world[x][y], drawX, drawY);
        }
      }
    }
  }
}

function drawPlayer() {
  ctx.fillStyle = "#ffcc99";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.fillStyle = "#00AAAA";
  ctx.fillRect(player.x, player.y + 10, player.width, 12);

  ctx.fillStyle = "#0000AA";
  ctx.fillRect(player.x, player.y + 22, player.width, 8);
}

/* ===========================
   MINING
=========================== */

canvas.addEventListener("click", mineBlock);

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  const t = e.touches[0];
  mineBlock({ clientX: t.clientX, clientY: t.clientY });
});

function mineBlock(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left + camera.x;
  const my = e.clientY - rect.top + camera.y;

  const tx = Math.floor(mx / TILE);
  const ty = Math.floor(my / TILE);

  if (!world[tx]) return;

  if (world[tx][ty] > 0) {
    if (world[tx][ty] === 1) inventory.dirt++;
    if (world[tx][ty] === 2) inventory.grass++;
    if (world[tx][ty] === 3) inventory.wood++;

    world[tx][ty] = 0;
  }

  updateInventory();
}

/* ===========================
   INVENTORY UI
=========================== */

function updateInventory() {
  const inv = document.getElementById("inventory");
  if (!inv) return;

  inv.innerHTML = "";

  for (let item in inventory) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.innerHTML = item + "<br>" + inventory[item];

    if (item === selectedBlock)
      slot.style.border = "2px solid yellow";

    slot.onclick = () => selectedBlock = item;

    inv.appendChild(slot);
  }
}

/* ===========================
   LOOP
=========================== */

function gameLoop() {
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updatePlayer();
  updateCamera();

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawWorld();
  drawPlayer();

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

generateWorld();
spawnPlayer();
updateInventory();
gameLoop();
