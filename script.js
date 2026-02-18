const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let TILE_SIZE, COLS, ROWS;
const blocksTex = {};
let selectedBlock = 2;
let world = [];
let interactionMode = 'MINE'; // MINE atau BUILD

// --- 1. MEMBUAT TEKSTUR (ALGORITMA) ---
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
    // Dirt
    createTexture(1, c => {
        c.fillStyle = '#614126'; c.fillRect(0,0,16,16);
        c.fillStyle = '#4e342e'; for(let i=0;i<6;i++) c.fillRect(Math.random()*14, Math.random()*14, 2, 2);
    });
    // Grass
    createTexture(2, c => {
        c.fillStyle = '#614126'; c.fillRect(0,0,16,16);
        c.fillStyle = '#4caf50'; c.fillRect(0,0,16,5);
        c.fillStyle = '#388e3c'; c.fillRect(0,5,16,2);
    });
    // Stone
    createTexture(3, c => {
        c.fillStyle = '#9e9e9e'; c.fillRect(0,0,16,16);
        c.fillStyle = '#757575'; for(let i=0;i<5;i++) c.fillRect(Math.random()*14, Math.random()*14, 4, 2);
    });
    // Wood
    createTexture(4, c => {
        c.fillStyle = '#795548'; c.fillRect(0,0,16,16);
        c.fillStyle = '#5d4037'; c.fillRect(2,0,2,16); c.fillRect(8,0,2,16);
    });
    // Steve
    createTexture('steve', c => {
        c.fillStyle = '#03a9f4'; c.fillRect(4,8,8,8); // Baju
        c.fillStyle = '#ffcc80'; c.fillRect(4,2,8,6);  // Muka
        c.fillStyle = '#5d4037'; c.fillRect(4,2,8,2);  // Rambut
        c.fillStyle = '#303f9f'; c.fillRect(4,12,8,4); // Celana
    });
}

// --- 2. PLAYER & WORLD ---
let player = { x: 100, y: 0, vx: 0, vy: 0, w: 0, h: 0, grounded: false };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    TILE_SIZE = Math.floor(canvas.width / 18); // Ukuran blok pas di HP
    COLS = Math.ceil(canvas.width / TILE_SIZE) + 2;
    ROWS = Math.ceil(canvas.height / TILE_SIZE);
    player.w = TILE_SIZE * 0.8;
    player.h = TILE_SIZE * 1.6; // Steve tinggi
    if(world.length === 0) generateWorld();
}

function generateWorld() {
    for (let x = 0; x < COLS; x++) {
        world[x] = [];
        let gh = Math.floor(ROWS / 1.6);
        for (let y = 0; y < ROWS; y++) {
            if (y > gh + 3) world[x][y] = 3; // Batu paling bawah
            else if (y > gh) world[x][y] = 1; // Tanah
            else if (y === gh) world[x][y] = 2; // Rumput
            else world[x][y] = 0; // Udara
        }
    }
}

// --- 3. KONTROL INPUT (LOGIKA PENTING) ---
let moveLeft = false;
let moveRight = false;

// Event Listener Tombol Panah (Touch)
const btnLeft = document.getElementById('btn-left');
btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); moveLeft = true; });
btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); moveLeft = false; });

const btnRight = document.getElementById('btn-right');
btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); moveRight = true; });
btnRight.addEventListener('touchend', (e) => { e.preventDefault(); moveRight = false; });

const btnJump = document.getElementById('btn-jump');
btnJump.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if(player.grounded) { player.vy = -TILE_SIZE * 0.45; player.grounded = false; }
});

// Event Ganti Mode
const btnMode = document.getElementById('btn-mode');
btnMode.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Biar nggak nge-zoom
    interactionMode = interactionMode === 'MINE' ? 'BUILD' : 'MINE';
    btnMode.innerText = interactionMode === 'MINE' ? 'MODE: MINE ⛏️' : 'MODE: BUILD 🧱';
    btnMode.style.background = interactionMode === 'MINE' ? '#d32f2f' : '#388e3c';
});

// --- 4. GAME LOOP ---
function update() {
    // Gerakan Kiri/Kanan Halus
    if (moveLeft) player.vx = -TILE_SIZE * 0.15;
    else if (moveRight) player.vx = TILE_SIZE * 0.15;
    else player.vx *= 0.7; // Efek licin dikit berhenti

    player.vy += TILE_SIZE * 0.025; // Gravitasi
    player.x += player.vx;
    player.y += player.vy;

    // Batas Lantai Sederhana
    let floorY = Math.floor(ROWS / 1.6) * TILE_SIZE;
    if (player.y + player.h > floorY) {
        player.y = floorY - player.h;
        player.vy = 0;
        player.grounded = true;
    }

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Gambar Blok
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            let id = world[x][y];
            if (id !== 0) ctx.drawImage(blocksTex[id], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    // Gambar Steve
    ctx.drawImage(blocksTex['steve'], player.x, player.y, player.w, player.h);

    requestAnimationFrame(update);
}

// Interaksi Sentuh Layar (Hancur/Pasang Blok)
canvas.addEventListener('touchstart', (e) => {
    let t = e.touches[0];
    let gx = Math.floor(t.clientX / TILE_SIZE);
    let gy = Math.floor(t.clientY / TILE_SIZE);

    if (world[gx]) {
        if (interactionMode === 'MINE') world[gx][gy] = 0;
        else if (world[gx][gy] === 0) world[gx][gy] = selectedBlock;
    }
});

// Pilih Hotbar
document.querySelectorAll('.slot').forEach(s => {
    s.onclick = () => {
        document.querySelector('.active').classList.remove('active');
        s.classList.add('active');
        selectedBlock = parseInt(s.dataset.block);
    }
});

initAssets();
resize();
update();
window.onresize = resize;

