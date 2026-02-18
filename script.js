const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let TILE_SIZE, COLS, ROWS;
const blocksTex = {};
let selectedBlock = 2;
let world = [];
let interactionMode = 'MINE';

// --- 1. TEKSTUR & ASSET ---
function createTexture(id, color, isSteve = false) {
    const t = document.createElement('canvas');
    t.width = t.height = 16;
    const c = t.getContext('2d');
    c.fillStyle = color; c.fillRect(0,0,16,16);
    if(!isSteve) {
        c.fillStyle = 'rgba(0,0,0,0.15)';
        for(let i=0; i<4; i++) c.fillRect(Math.random()*14, Math.random()*14, 2, 2);
    } else {
        c.fillStyle = '#ffcc80'; c.fillRect(4,2,8,6); // Muka
        c.fillStyle = '#3d2211'; c.fillRect(4,2,8,2); // Rambut
        c.fillStyle = '#303f9f'; c.fillRect(4,12,8,4); // Celana
    }
    blocksTex[id] = t;
    const slot = document.querySelector(`.slot[data-block="${id}"]`);
    if(slot) slot.style.backgroundImage = `url(${t.toDataURL()})`;
}

function initAssets() {
    createTexture(1, '#614126'); // Dirt
    createTexture(2, '#48ad39'); // Grass
    createTexture(3, '#7a7a7a'); // Stone
    createTexture(4, '#6b4423'); // Wood
    createTexture(5, '#2e7d32'); // Leaves
    createTexture('steve', '#03a9f4', true);
}

// --- 2. PHYSICS ENGINE & WORLD ---
let player = { x: 100, y: 0, vx: 0, vy: 0, w: 0, h: 0, grounded: false };
let moveLeft = false, moveRight = false;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    TILE_SIZE = Math.floor(canvas.width / 20);
    COLS = Math.ceil(canvas.width / TILE_SIZE) + 2;
    ROWS = Math.ceil(canvas.height / TILE_SIZE);
    player.w = TILE_SIZE * 0.7;
    player.h = TILE_SIZE * 1.6;
    if(world.length === 0) generateWorld();
}

function generateWorld() {
    world = [];
    for (let x = 0; x < COLS; x++) {
        world[x] = [];
        let gh = Math.floor(ROWS / 1.7) + Math.floor(Math.sin(x * 0.5) * 2);
        for (let y = 0; y < ROWS; y++) {
            if (y > gh) world[x][y] = (y > gh + 3) ? 3 : 1;
            else if (y === gh) world[x][y] = 2;
            else world[x][y] = 0;
        }
    }
}

// Fungsi Cek Tabrakan (CORE PHYSICS)
function isSolid(px, py) {
    let gx = Math.floor(px / TILE_SIZE);
    let gy = Math.floor(py / TILE_SIZE);
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
    return world[gx][gy] !== 0 && world[gx][gy] !== 4; // Kayu bisa ditembus (background)
}

function update() {
    // Gravitasi
    player.vy += 0.6;
    
    // Gerakan Horizontal
    if (moveLeft) player.vx = -4;
    else if (moveRight) player.vx = 4;
    else player.vx *= 0.8;

    // --- PHYSICS COLLISION X ---
    let nextX = player.x + player.vx;
    if (!isSolid(nextX, player.y) && !isSolid(nextX + player.w, player.y) &&
        !isSolid(nextX, player.y + player.h) && !isSolid(nextX + player.w, player.y + player.h)) {
        player.x = nextX;
    } else {
        player.vx = 0;
    }

    // --- PHYSICS COLLISION Y ---
    let nextY = player.y + player.vy;
    player.grounded = false;
    if (player.vy > 0) { // Jatuh
        if (isSolid(player.x, nextY + player.h) || isSolid(player.x + player.w, nextY + player.h)) {
            player.y = Math.floor((nextY + player.h) / TILE_SIZE) * TILE_SIZE - player.h;
            player.vy = 0;
            player.grounded = true;
        } else {
            player.y = nextY;
        }
    } else if (player.vy < 0) { // Lompat (Mentok Kepala)
        if (isSolid(player.x, nextY) || isSolid(player.x + player.w, nextY)) {
            player.y = Math.floor(nextY / TILE_SIZE + 1) * TILE_SIZE;
            player.vy = 0;
        } else {
            player.y = nextY;
        }
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            let id = world[x][y];
            if (id !== 0) ctx.drawImage(blocksTex[id], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    ctx.drawImage(blocksTex['steve'], player.x, player.y, player.w, player.h);
}

// --- 3. INPUT HANDLERS ---
document.getElementById('btn-left').ontouchstart = (e) => { e.preventDefault(); moveLeft = true; };
document.getElementById('btn-left').ontouchend = () => moveLeft = false;
document.getElementById('btn-right').ontouchstart = (e) => { e.preventDefault(); moveRight = true; };
document.getElementById('btn-right').ontouchend = () => moveRight = false;
document.getElementById('btn-jump').ontouchstart = (e) => {
    e.preventDefault();
    if(player.grounded) { player.vy = -11; player.grounded = false; }
};

document.getElementById('btn-mode').onclick = () => {
    interactionMode = interactionMode === 'MINE' ? 'BUILD' : 'MINE';
    const btn = document.getElementById('btn-mode');
    btn.innerText = `MODE: ${interactionMode} ${interactionMode === 'MINE' ? '⛏️' : '🧱'}`;
    btn.style.background = interactionMode === 'MINE' ? '#d32f2f' : '#388e3c';
};

canvas.ontouchstart = (e) => {
    let t = e.touches[0];
    let gx = Math.floor(t.clientX / TILE_SIZE);
    let gy = Math.floor(t.clientY / TILE_SIZE);
    if (world[gx]) {
        if (interactionMode === 'MINE') world[gx][gy] = 0;
        else if (world[gx][gy] === 0) world[gx][gy] = selectedBlock;
    }
};

document.querySelectorAll('.slot').forEach(s => {
    s.onclick = () => {
        document.querySelector('.active').classList.remove('active');
        s.classList.add('active');
        selectedBlock = parseInt(s.dataset.block);
    }
});

initAssets(); resize(); update();
window.onresize = resize;

