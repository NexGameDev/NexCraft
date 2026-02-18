const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let TILE_SIZE, COLS, ROWS;
const blocksTex = {};
let selectedBlock = 2;
let world = [];
let mode = 'MINE';

// --- PIXEL ART DATA ---
// Representasi 16x16 atau 8x8 pixel untuk estetika Minecraft asli
const PIXEL_DATA = {
    GRASS: [
        "22222222",
        "22222222",
        "11111111",
        "11111111",
        "11111111",
        "11111111",
        "11111111",
        "11111111"
    ],
    STEVE_HEAD: [
        "00444400",
        "04444440",
        "04544540",
        "04444440",
        "04466440",
        "00444400"
    ]
};

const COLORS = { 0:null, 1:'#5d4037', 2:'#4caf50', 3:'#757575', 4:'#dbac82', 5:'#3f51b5', 6:'#8d6e63', 7:'#00acc1', 8:'#303f9f', 9:'#212121' };

function createPixelTexture(id, pixels, size=8) {
    const t = document.createElement('canvas'); t.width = t.height = size;
    const c = t.getContext('2d');
    pixels.forEach((row, y) => {
        [...row].forEach((col, x) => {
            if(COLORS[col]) { c.fillStyle = COLORS[col]; c.fillRect(x,y,1,1); }
        });
    });
    blocksTex[id] = t;
}

function initAssets() {
    // Blocks
    createPixelTexture(1, ["1111","1111","1111","1111"], 4); // Dirt
    createPixelTexture(2, ["2222","2222","1111","1111"], 4); // Grass
    createPixelTexture(3, ["3333","3933","3339","3333"], 4); // Stone
    createPixelTexture(4, ["7777","7777","7777","7777"], 4); // Plank (Cyan/Teal)
    
    // Steve Detailed (Manual Pixel Map)
    const s = document.createElement('canvas'); s.width = 8; s.height = 16;
    const sc = s.getContext('2d');
    // Head
    sc.fillStyle = COLORS[4]; sc.fillRect(2,0,4,4); // Skin
    sc.fillStyle = '#4e342e'; sc.fillRect(2,0,4,1); // Hair
    sc.fillStyle = 'white'; sc.fillRect(2,2,1,1); sc.fillRect(5,2,1,1); // Eyes
    // Body
    sc.fillStyle = COLORS[7]; sc.fillRect(2,4,4,6); // Shirt
    sc.fillStyle = COLORS[4]; sc.fillRect(1,4,1,5); sc.fillRect(6,4,1,5); // Arms
    // Legs
    sc.fillStyle = COLORS[8]; sc.fillRect(2,10,2,5); sc.fillRect(4,10,2,5); // Pants
    sc.fillStyle = COLORS[9]; sc.fillRect(2,15,2,1); sc.fillRect(4,15,2,1); // Shoes
    blocksTex['steve'] = s;

    setupHotbar();
}

// --- CORE GAMEPLAY ---
let player = { x: 100, y: 0, vx: 0, vy: 0, w: 0, h: 0, grounded: false };

function generateWorld() {
    world = [];
    for (let x = 0; x < COLS; x++) {
        world[x] = [];
        let h = Math.floor(ROWS/1.8) + Math.floor(Math.sin(x*0.5)*2);
        for (let y = 0; y < ROWS; y++) {
            if (y > h) world[x][y] = (y > h+3) ? 3 : 1;
            else if (y === h) world[x][y] = 2;
            else world[x][y] = 0;
        }
    }
}

function update() {
    player.vy += 0.6;
    if (moveLeft) player.vx = -4; else if (moveRight) player.vx = 4; else player.vx *= 0.7;

    // Collision & Movement
    let nextX = player.x + player.vx;
    if (!isSolid(nextX, player.y + 5) && !isSolid(nextX + player.w, player.y + 5) && !isSolid(nextX, player.y + player.h - 5)) {
        player.x = nextX;
    }
    
    player.y += player.vy;
    if (player.y < 0) { player.y = 0; player.vy = 0; }
    player.grounded = false;
    let footY = player.y + player.h;
    if (isSolid(player.x+5, footY) || isSolid(player.x+player.w-5, footY)) {
        player.y = Math.floor(footY/TILE_SIZE)*TILE_SIZE - player.h;
        player.vy = 0; player.grounded = true;
    }

    draw();
    requestAnimationFrame(update);
}

function isSolid(px, py) {
    let gx = Math.floor(px/TILE_SIZE), gy = Math.floor(py/TILE_SIZE);
    return (world[gx] && world[gx][gy] !== 0);
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled = false; // INI WAJIB UNTUK PIXEL ART
    
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            if (world[x][y] !== 0) {
                ctx.drawImage(blocksTex[world[x][y]], x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    ctx.drawImage(blocksTex['steve'], player.x, player.y, player.w, player.h);
}

// --- UI & CONTROLS ---
function setupHotbar() {
    const hb = document.getElementById('hotbar');
    [2,1,3,4].forEach(id => {
        const s = document.createElement('div'); s.className = `slot ${id===2?'active':''}`;
        s.style.backgroundImage = `url(${blocksTex[id].toDataURL()})`;
        s.onclick = () => { document.querySelector('.active').classList.remove('active'); s.classList.add('active'); selectedBlock = id; };
        hb.appendChild(s);
    });
}

function resize() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    TILE_SIZE = Math.floor(canvas.width / 16);
    COLS = Math.ceil(canvas.width / TILE_SIZE) + 1; ROWS = Math.ceil(canvas.height / TILE_SIZE);
    player.w = TILE_SIZE * 0.7; player.h = TILE_SIZE * 1.4;
    if(world.length === 0) generateWorld();
}

const moveLeft = false, moveRight = false;
const btn = (id, s, e) => { 
    const el = document.getElementById(id); 
    el.ontouchstart = (i) => { i.preventDefault(); s(); }; 
    el.ontouchend = e; 
};
btn('btn-left', () => window.moveLeft = true, () => window.moveLeft = false);
btn('btn-right', () => window.moveRight = true, () => window.moveRight = false);
btn('btn-jump', () => { if(player.grounded) player.vy = -12; }, () => {});

document.getElementById('btn-mode').onclick = (e) => {
    mode = mode === 'MINE' ? 'BUILD' : 'MINE';
    e.target.innerText = mode;
};
canvas.ontouchstart = (e) => {
    let t = e.touches[0]; let gx = Math.floor(t.clientX/TILE_SIZE), gy = Math.floor(t.clientY/TILE_SIZE);
    if(world[gx]) world[gx][gy] = (mode === 'MINE') ? 0 : selectedBlock;
};

initAssets(); resize(); update(); window.onresize = resize;

