const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let TILE_SIZE, COLS, ROWS;
const blocksTex = {};
let selectedBlock = 2;
let world = [];
let interactionMode = 'MINE';

// --- 1. ALGORITMA TEKSTUR STEVE & BLOK ---
function createTexture(id, drawFn) {
    const t = document.createElement('canvas');
    t.width = t.height = 16;
    const c = t.getContext('2d');
    drawFn(c);
    blocksTex[id] = t;
    const slot = document.querySelector(`.slot[data-block="${id}"]`);
    if(slot) slot.style.backgroundImage = `url(${t.toDataURL()})`;
}

function initAssets() {
    createTexture(1, c => { c.fillStyle = '#614126'; c.fillRect(0,0,16,16); }); // Dirt
    createTexture(2, c => { c.fillStyle = '#614126'; c.fillRect(0,0,16,16); c.fillStyle = '#4caf50'; c.fillRect(0,0,16,6); }); // Grass
    createTexture(3, c => { c.fillStyle = '#7a7a7a'; c.fillRect(0,0,16,16); }); // Stone
    createTexture(4, c => { c.fillStyle = '#6b4423'; c.fillRect(0,0,16,16); c.fillStyle = '#4d321a'; c.fillRect(0,4,16,2); }); // Wood
    
    // DETAIL STEVE (16x32 Internal Resolution)
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 16; sCanvas.height = 32;
    const sc = sCanvas.getContext('2d');
    
    // Kepala
    sc.fillStyle = '#dbac82'; sc.fillRect(4, 0, 8, 8); // Kulit
    sc.fillStyle = '#3d2211'; sc.fillRect(4, 0, 8, 2); // Rambut Atas
    sc.fillRect(4, 2, 2, 2); sc.fillRect(10, 2, 2, 2); // Rambut Samping
    sc.fillStyle = 'white'; sc.fillRect(5, 4, 2, 1); sc.fillRect(9, 4, 2, 1); // Mata Putih
    sc.fillStyle = '#4637a4'; sc.fillRect(6, 4, 1, 1); sc.fillRect(9, 4, 1, 1); // Pupil Biru
    sc.fillStyle = '#8d5939'; sc.fillRect(7, 6, 2, 1); // Mulut/Hidung
    
    // Baju (Torso & Tangan)
    sc.fillStyle = '#00aaaa'; sc.fillRect(4, 8, 8, 12); // Badan Teal
    sc.fillStyle = '#dbac82'; sc.fillRect(2, 8, 2, 10); sc.fillRect(12, 8, 2, 10); // Tangan
    sc.fillStyle = '#00aaaa'; sc.fillRect(2, 8, 2, 4); sc.fillRect(12, 8, 2, 4); // Lengan Baju
    
    // Celana & Sepatu
    sc.fillStyle = '#3c44aa'; sc.fillRect(4, 20, 8, 10); // Celana Biru Tua
    sc.fillStyle = '#333'; sc.fillRect(4, 30, 3, 2); sc.fillRect(9, 30, 3, 2); // Sepatu
    
    blocksTex['steve'] = sCanvas;
}

// --- 2. PHYSICS ENGINE ---
let player = { x: 100, y: 0, vx: 0, vy: 0, w: 0, h: 0, grounded: false };
let moveLeft = false, moveRight = false;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    TILE_SIZE = Math.floor(canvas.width / 18);
    COLS = Math.ceil(canvas.width / TILE_SIZE) + 2;
    ROWS = Math.ceil(canvas.height / TILE_SIZE);
    player.w = TILE_SIZE * 0.8;
    player.h = TILE_SIZE * 1.6;
    if(world.length === 0) generateWorld();
}

function generateWorld() {
    for (let x = 0; x < COLS; x++) {
        world[x] = [];
        let gh = Math.floor(ROWS / 1.7);
        for (let y = 0; y < ROWS; y++) {
            if (y > gh) world[x][y] = 1; else if (y === gh) world[x][y] = 2; else world[x][y] = 0;
        }
    }
}

function isSolid(px, py) {
    let gx = Math.floor(px / TILE_SIZE);
    let gy = Math.floor(py / TILE_SIZE);
    return (world[gx] && world[gx][gy] !== 0);
}

function update() {
    player.vy += 0.6; // Gravity
    if (moveLeft) player.vx = -5; else if (moveRight) player.vx = 5; else player.vx *= 0.8;

    // Fix Bug Jalan: Beri jarak 2px dari lantai saat cek horizontal
    let nextX = player.x + player.vx;
    if (!isSolid(nextX, player.y + 5) && !isSolid(nextX + player.w, player.y + 5) &&
        !isSolid(nextX, player.y + player.h - 5) && !isSolid(nextX + player.w, player.y + player.h - 5)) {
        player.x = nextX;
    }

    // Physics Vertical
    player.y += player.vy;
    player.grounded = false;
    let footY = player.y + player.h;

    if (isSolid(player.x + 4, footY) || isSolid(player.x + player.w - 4, footY)) {
        player.y = Math.floor(footY / TILE_SIZE) * TILE_SIZE - player.h;
        player.vy = 0;
        player.grounded = true;
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            if (world[x][y] !== 0) ctx.drawImage(blocksTex[world[x][y]], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    ctx.drawImage(blocksTex['steve'], player.x, player.y, player.w, player.h);
}

// --- 3. CONTROLS ---
document.getElementById('btn-left').ontouchstart = (e) => { e.preventDefault(); moveLeft = true; };
document.getElementById('btn-left').ontouchend = () => moveLeft = false;
document.getElementById('btn-right').ontouchstart = (e) => { e.preventDefault(); moveRight = true; };
document.getElementById('btn-right').ontouchend = () => moveRight = false;
document.getElementById('btn-jump').ontouchstart = (e) => { e.preventDefault(); if(player.grounded) player.vy = -12; };

document.getElementById('btn-mode').onclick = () => {
    interactionMode = interactionMode === 'MINE' ? 'BUILD' : 'MINE';
    document.getElementById('btn-mode').innerText = `MODE: ${interactionMode} ${interactionMode === 'MINE' ? '⛏️' : '🧱'}`;
    document.getElementById('btn-mode').style.background = interactionMode === 'MINE' ? '#d32f2f' : '#388e3c';
};

canvas.ontouchstart = (e) => {
    let t = e.touches[0];
    let gx = Math.floor(t.clientX / TILE_SIZE);
    let gy = Math.floor(t.clientY / TILE_SIZE);
    if (world[gx]) world[gx][gy] = (interactionMode === 'MINE') ? 0 : selectedBlock;
};

document.querySelectorAll('.slot').forEach(s => s.onclick = () => {
    document.querySelector('.active').classList.remove('active');
    s.classList.add('active');
    selectedBlock = parseInt(s.dataset.block);
});

initAssets(); resize(); update(); window.onresize = resize;

