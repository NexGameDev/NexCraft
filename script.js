const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let TILE_SIZE, COLS, ROWS;
const blocksTex = {};
let selectedBlock = 2;
let world = [];
let interactionMode = 'MINE';

// --- 1. GENERATE TEXTURES (STEVE ANIMATION) ---
function createTexture(id, drawFn) {
    const t = document.createElement('canvas');
    t.width = 16; t.height = (id.includes('steve')) ? 32 : 16;
    const c = t.getContext('2d');
    drawFn(c);
    blocksTex[id] = t;
    const slot = document.querySelector(`.slot[data-block="${id}"]`);
    if(slot) slot.style.backgroundImage = `url(${t.toDataURL()})`;
}

function drawSteveBase(c, limbOffset = 0) {
    // Kepala
    c.fillStyle = '#dbac82'; c.fillRect(4, 0, 8, 8); // Kulit
    c.fillStyle = '#3d2211'; c.fillRect(4, 0, 8, 2); // Rambut
    c.fillStyle = 'white'; c.fillRect(5, 4, 2, 1); c.fillRect(9, 4, 2, 1); // Mata
    c.fillStyle = '#4637a4'; c.fillRect(6, 4, 1, 1); c.fillRect(9, 4, 1, 1); // Pupil
    
    // Badan (Torso)
    c.fillStyle = '#00aaaa'; c.fillRect(4, 8, 8, 12); 
    
    // Tangan & Kaki (Beranimasi)
    c.fillStyle = '#dbac82'; // Warna Kulit Tangan
    c.fillRect(2, 8 + limbOffset, 2, 10); // Tangan Kiri
    c.fillRect(12, 8 - limbOffset, 2, 10); // Tangan Kanan
    c.fillStyle = '#00aaaa'; // Lengan Baju
    c.fillRect(2, 8 + limbOffset, 2, 4); c.fillRect(12, 8 - limbOffset, 2, 4);

    c.fillStyle = '#3c44aa'; // Celana
    c.fillRect(4, 20 + limbOffset, 4, 10); // Kaki Kiri
    c.fillRect(8, 20 - limbOffset, 4, 10); // Kaki Kanan
    c.fillStyle = '#333'; // Sepatu
    c.fillRect(4, 30 + limbOffset, 3, 2); c.fillRect(9, 30 - limbOffset, 3, 2);
}

function initAssets() {
    createTexture(1, c => { c.fillStyle = '#614126'; c.fillRect(0,0,16,16); });
    createTexture(2, c => { c.fillStyle = '#614126'; c.fillRect(0,0,16,16); c.fillStyle = '#4caf50'; c.fillRect(0,0,16,6); });
    createTexture(3, c => { c.fillStyle = '#7a7a7a'; c.fillRect(0,0,16,16); });
    createTexture(4, c => { c.fillStyle = '#6b4423'; c.fillRect(0,0,16,16); c.fillStyle = '#4d321a'; c.fillRect(0,4,16,2); });

    // Animasi Steve (3 Frame)
    createTexture('steve_stand', c => drawSteveBase(c, 0));
    createTexture('steve_walk1', c => drawSteveBase(c, 2));
    createTexture('steve_walk2', c => drawSteveBase(c, -2));
}

// --- 2. PHYSICS ENGINE ---
let player = { 
    x: 100, y: 0, vx: 0, vy: 0, w: 0, h: 0, 
    grounded: false, frame: 'steve_stand', animTimer: 0 
};
let moveLeft = false, moveRight = false;

function resize() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    TILE_SIZE = Math.floor(canvas.width / 18);
    COLS = Math.ceil(canvas.width / TILE_SIZE) + 2;
    ROWS = Math.ceil(canvas.height / TILE_SIZE);
    player.w = TILE_SIZE * 0.8; player.h = TILE_SIZE * 1.6;
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
    let gx = Math.floor(px / TILE_SIZE); let gy = Math.floor(py / TILE_SIZE);
    return (world[gx] && world[gx][gy] !== 0);
}

function update() {
    // Physics Smooth (Gravity & Friction)
    player.vy += 0.55; 
    if (moveLeft) player.vx = -4.5; else if (moveRight) player.vx = 4.5; else player.vx *= 0.8;

    // Animasi Berjalan
    if (Math.abs(player.vx) > 0.5 && player.grounded) {
        player.animTimer++;
        if (player.animTimer > 8) {
            player.frame = (player.frame === 'steve_walk1') ? 'steve_walk2' : 'steve_walk1';
            player.animTimer = 0;
        }
    } else {
        player.frame = 'steve_stand';
    }

    // Physics Horizontal (Fix Bug Nyangkut)
    let nextX = player.x + player.vx;
    if (!isSolid(nextX, player.y + 5) && !isSolid(nextX + player.w, player.y + 5) &&
        !isSolid(nextX, player.y + player.h - 5) && !isSolid(nextX + player.w, player.y + player.h - 5)) {
        player.x = nextX;
    }

    // Physics Vertical (Smooth Landing)
    player.y += player.vy;
    player.grounded = false;
    let footY = player.y + player.h;
    if (isSolid(player.x + 4, footY) || isSolid(player.x + player.w - 4, footY)) {
        player.y = Math.floor(footY / TILE_SIZE) * TILE_SIZE - player.h;
        player.vy = 0; player.grounded = true;
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
    // Gambar Steve dengan frame animasi yang aktif
    ctx.drawImage(blocksTex[player.frame], player.x, player.y, player.w, player.h);
}

// --- 3. INPUT ---
document.getElementById('btn-left').ontouchstart = (e) => { e.preventDefault(); moveLeft = true; };
document.getElementById('btn-left').ontouchend = () => moveLeft = false;
document.getElementById('btn-right').ontouchstart = (e) => { e.preventDefault(); moveRight = true; };
document.getElementById('btn-right').ontouchend = () => moveRight = false;
document.getElementById('btn-jump').ontouchstart = (e) => { e.preventDefault(); if(player.grounded) player.vy = -11.5; };

document.getElementById('btn-mode').onclick = () => {
    interactionMode = interactionMode === 'MINE' ? 'BUILD' : 'MINE';
    document.getElementById('btn-mode').innerText = `MODE: ${interactionMode} ${interactionMode === 'MINE' ? '⛏️' : '🧱'}`;
    document.getElementById('btn-mode').style.background = interactionMode === 'MINE' ? '#d32f2f' : '#388e3c';
};

canvas.ontouchstart = (e) => {
    let t = e.touches[0];
    let gx = Math.floor(t.clientX / TILE_SIZE); let gy = Math.floor(t.clientY / TILE_SIZE);
    if (world[gx]) world[gx][gy] = (interactionMode === 'MINE') ? 0 : selectedBlock;
};

document.querySelectorAll('.slot').forEach(s => s.onclick = () => {
    document.querySelector('.active').classList.remove('active');
    s.classList.add('active'); selectedBlock = parseInt(s.dataset.block);
});

initAssets(); resize(); update(); window.onresize = resize;
