const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let TILE_SIZE, COLS, ROWS;
const blocksTex = {};
let selectedBlock = 2;
let world = [];
let interactionMode = 'MINE';

const BLOCK_TYPES = {
    AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, WOOD: 4, LEAVES: 5, COAL: 6, IRON: 7, PLANK: 8
};

// --- 1. GENERATOR ASSET (TEXTURES) ---
function initAssets() {
    const draw = (id, color, addon) => {
        const t = document.createElement('canvas'); t.width = 16; t.height = 16;
        const c = t.getContext('2d');
        c.fillStyle = color; c.fillRect(0,0,16,16);
        if(addon) addon(c);
        blocksTex[id] = t;
    };

    draw(BLOCK_TYPES.DIRT, '#614126');
    draw(BLOCK_TYPES.GRASS, '#614126', c => { c.fillStyle = '#48ad39'; c.fillRect(0,0,16,6); });
    draw(BLOCK_TYPES.STONE, '#7a7a7a');
    draw(BLOCK_TYPES.WOOD, '#6b4423', c => { c.fillStyle = '#4d321a'; c.fillRect(4,0,2,16); });
    draw(BLOCK_TYPES.LEAVES, '#2e7d32');
    draw(BLOCK_TYPES.COAL, '#7a7a7a', c => { c.fillStyle = '#222'; c.fillRect(3,3,3,3); c.fillRect(10,8,2,2); });
    draw(BLOCK_TYPES.IRON, '#7a7a7a', c => { c.fillStyle = '#d8af93'; c.fillRect(5,2,4,2); c.fillRect(2,10,3,3); });
    draw(BLOCK_TYPES.PLANK, '#a37847', c => { c.strokeStyle = '#6b4423'; c.strokeRect(0,0,16,16); });

    // Buat Steve (3 Frame Animasi)
    createSteve('stand', 0); createSteve('walk1', 3); createSteve('walk2', -3);

    setupHotbar();
}

function createSteve(id, limb) {
    const t = document.createElement('canvas'); t.width = 16; t.height = 32;
    const c = t.getContext('2d');
    c.fillStyle = '#dbac82'; c.fillRect(4,0,8,8); // Head
    c.fillStyle = '#00aaaa'; c.fillRect(4,8,8,12); // Torso
    c.fillStyle = '#dbac82'; c.fillRect(2,8+limb,2,10); c.fillRect(12,8-limb,2,10); // Arms
    c.fillStyle = '#3c44aa'; c.fillRect(4,20+limb,4,10); c.fillRect(8,20-limb,4,10); // Legs
    blocksTex[id] = t;
}

// --- 2. PEMBANGKIT DUNIA (BIOMA & ORES) ---
function generateWorld() {
    world = [];
    for (let x = 0; x < COLS; x++) {
        world[x] = [];
        let groundLevel = Math.floor(ROWS / 1.8) + Math.floor(Math.sin(x * 0.3) * 3);
        for (let y = 0; y < ROWS; y++) {
            let block = BLOCK_TYPES.AIR;
            if (y > groundLevel + 4) {
                // Ore Generation
                let rand = Math.random();
                if(rand < 0.05) block = BLOCK_TYPES.COAL;
                else if(rand < 0.02) block = BLOCK_TYPES.IRON;
                else block = BLOCK_TYPES.STONE;
            } else if (y > groundLevel) {
                block = BLOCK_TYPES.DIRT;
            } else if (y === groundLevel) {
                block = BLOCK_TYPES.GRASS;
            }
            world[x][y] = block;
        }
        // Spawn Pohon sesekali
        if (x % 10 === 0 && Math.random() > 0.5) spawnTree(x, groundLevel - 1);
    }
}

function spawnTree(x, y) {
    if (x < 1 || x >= COLS - 1) return;
    for(let i=0; i<4; i++) if(y-i > 0) world[x][y-i] = BLOCK_TYPES.WOOD; // Batang
    for(let i=-2; i<=2; i++) {
        for(let j=-2; j<=0; j++) {
            if(world[x+i] && y-4+j > 0) world[x+i][y-4+j] = BLOCK_TYPES.LEAVES; // Daun
        }
    }
}

// --- 3. PHYSICS & GAME LOOP ---
let player = { x: 100, y: 0, vx: 0, vy: 0, w: 0, h: 0, grounded: false, frame: 'stand', anim: 0 };
let moveLeft = false, moveRight = false;

function update() {
    player.vy += 0.5; // Gravitasi
    if (moveLeft) player.vx = -4; else if (moveRight) player.vx = 4; else player.vx *= 0.8;

    // Animasi Jalan
    if (Math.abs(player.vx) > 0.5 && player.grounded) {
        player.anim++;
        if (player.anim > 8) { player.frame = (player.frame === 'walk1') ? 'walk2' : 'walk1'; player.anim = 0; }
    } else { player.frame = 'stand'; }

    // Tabrakan (Collision)
    handleCollision();

    draw();
    requestAnimationFrame(update);
}

function handleCollision() {
    let nextX = player.x + player.vx;
    if (!checkSolid(nextX, player.y + 5) && !checkSolid(nextX + player.w, player.y + 5) &&
        !checkSolid(nextX, player.y + player.h - 5)) {
        player.x = nextX;
    }
    
    player.y += player.vy;
    player.grounded = false;
    let footY = player.y + player.h;
    if (checkSolid(player.x + 5, footY) || checkSolid(player.x + player.w - 5, footY)) {
        player.y = Math.floor(footY / TILE_SIZE) * TILE_SIZE - player.h;
        player.vy = 0; player.grounded = true;
    }
}

function checkSolid(px, py) {
    let gx = Math.floor(px / TILE_SIZE), gy = Math.floor(py / TILE_SIZE);
    return (world[gx] && world[gx][gy] !== BLOCK_TYPES.AIR && world[gx][gy] !== BLOCK_TYPES.LEAVES);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            if (world[x][y] !== 0) ctx.drawImage(blocksTex[world[x][y]], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    ctx.drawImage(blocksTex[player.frame], player.x, player.y, player.w, player.h);
}

// --- 4. UI & INPUT ---
function setupHotbar() {
    const hotbar = document.getElementById('hotbar');
    const items = [2, 1, 3, 4, 5, 6, 7, 8];
    items.forEach(id => {
        const slot = document.createElement('div');
        slot.className = `slot ${id === 2 ? 'active' : ''}`;
        slot.style.backgroundImage = `url(${blocksTex[id].toDataURL()})`;
        slot.onclick = () => {
            document.querySelector('.active').classList.remove('active');
            slot.classList.add('active'); selectedBlock = id;
        };
        hotbar.appendChild(slot);
    });
}

function resize() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    TILE_SIZE = Math.floor(canvas.width / 20);
    COLS = Math.ceil(canvas.width / TILE_SIZE) + 2;
    ROWS = Math.ceil(canvas.height / TILE_SIZE);
    player.w = TILE_SIZE * 0.8; player.h = TILE_SIZE * 1.6;
    if(world.length === 0) generateWorld();
}

// Event Listeners
document.getElementById('btn-left').ontouchstart = (e) => { e.preventDefault(); moveLeft = true; };
document.getElementById('btn-left').ontouchend = () => moveLeft = false;
document.getElementById('btn-right').ontouchstart = (e) => { e.preventDefault(); moveRight = true; };
document.getElementById('btn-right').ontouchend = () => moveRight = false;
document.getElementById('btn-jump').ontouchstart = (e) => { e.preventDefault(); if(player.grounded) player.vy = -11; };

document.getElementById('btn-mode').onclick = (e) => {
    interactionMode = interactionMode === 'MINE' ? 'BUILD' : 'MINE';
    e.target.innerText = interactionMode;
    e.target.style.background = interactionMode === 'MINE' ? '#d32f2f' : '#388e3c';
};

canvas.addEventListener('touchstart', (e) => {
    let t = e.touches[0];
    let gx = Math.floor(t.clientX / TILE_SIZE), gy = Math.floor(t.clientY / TILE_SIZE);
    if (world[gx]) world[gx][gy] = (interactionMode === 'MINE') ? 0 : selectedBlock;
});

initAssets(); resize(); update(); window.onresize = resize;

