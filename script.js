const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Resolusi Virtual (Biar Pixelated)
const V_WIDTH = 320;
let V_HEIGHT;
let TILE = 16;

let world = [];
let textures = {};
let steve;
let camX = 0;
let selectedBlock = 2;
let mode = 'MINE';

// Global Input
window.moveL = false; window.moveR = false; window.doJump = false;

// --- 1. GENERATOR TEKSTUR ---
function createBlock(id, color, hasGrass = false) {
    const t = document.createElement('canvas');
    t.width = TILE; t.height = TILE;
    const c = t.getContext('2d');
    
    // Base & Noise
    c.fillStyle = color;
    c.fillRect(0,0,TILE,TILE);
    for(let i=0; i<40; i++) {
        c.fillStyle = `rgba(0,0,0,${Math.random()*0.15})`;
        c.fillRect(Math.floor(Math.random()*TILE), Math.floor(Math.random()*TILE), 1, 1);
    }
    
    if(hasGrass) {
        c.fillStyle = '#4caf50';
        c.fillRect(0,0,TILE,4);
    }
    textures[id] = t;
}

function initGame() {
    createBlock(1, '#8d6e63'); // Dirt
    createBlock(2, '#8d6e63', true); // Grass
    createBlock(3, '#757575'); // Stone
    createBlock(4, '#5d4037'); // Wood
    
    // Steve (Sesuai Referensi Pixelmu)
    const s = document.createElement('canvas'); s.width = 10; s.height = 16;
    const sc = s.getContext('2d');
    sc.fillStyle = '#ffcc99'; sc.fillRect(2,0,6,6); // Head
    sc.fillStyle = '#00acc1'; sc.fillRect(2,6,6,6); // Shirt
    sc.fillStyle = '#3949ab'; sc.fillRect(2,12,6,4); // Pants
    sc.fillStyle = '#fff'; sc.fillRect(3,2,1,1); sc.fillRect(6,2,1,1); // Eyes
    steve = s;

    setupHotbar();
    generateWorld();
    resize();
    requestAnimationFrame(loop);
}

// --- 2. PHYSICS ---
let player = { x: 50, y: 0, vx: 0, vy: 0, w: 8, h: 15, grounded: false };

function solid(x, y) {
    let gx = Math.floor(x/TILE), gy = Math.floor(y/TILE);
    return world[gx] && world[gx][gy] > 0;
}

function update() {
    player.vy += 0.4; // Gravity
    if(window.moveL) player.vx = -2.5;
    else if(window.moveR) player.vx = 2.5;
    else player.vx *= 0.7;

    if(window.doJump && player.grounded) { player.vy = -7; player.grounded = false; }

    // Collision
    let nx = player.x + player.vx;
    if(!solid(nx, player.y) && !solid(nx+player.w, player.y+player.h-1)) player.x = nx;
    
    player.y += player.vy;
    if(player.y < 0) { player.y = 0; player.vy = 0; }
    
    player.grounded = false;
    if(solid(player.x+2, player.y+player.h) || solid(player.x+player.w-2, player.y+player.h)) {
        player.y = Math.floor((player.y+player.h)/TILE)*TILE - player.h;
        player.vy = 0; player.grounded = true;
    }

    camX = player.x - V_WIDTH/2;
}

// --- 3. RENDER ---
function loop() {
    update();
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    let s = canvas.width / V_WIDTH;
    ctx.scale(s, s);
    ctx.translate(-Math.floor(camX), 0);
    ctx.imageSmoothingEnabled = false;

    // Draw Blocks
    for(let x = Math.floor(camX/TILE); x < Math.floor(camX/TILE)+22; x++) {
        if(!world[x]) continue;
        for(let y=0; y<world[x].length; y++) {
            if(world[x][y] > 0) ctx.drawImage(textures[world[x][y]], x*TILE, y*TILE);
        }
    }

    // Draw Steve
    ctx.drawImage(steve, Math.floor(player.x), Math.floor(player.y));
    ctx.restore();

    requestAnimationFrame(loop);
}

function generateWorld() {
    for(let x=0; x<100; x++) {
        world[x] = [];
        let h = 8 + Math.floor(Math.sin(x*0.3)*2);
        for(let y=0; y<20; y++) {
            if(y > h) world[x][y] = (y > h+3) ? 3 : 1;
            else if(y === h) world[x][y] = 2;
            else world[x][y] = 0;
        }
    }
}

function resize() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    V_HEIGHT = V_WIDTH * (canvas.height/canvas.width);
}

// Controls
const b = (id, k, v) => {
    let el = document.getElementById(id);
    el.ontouchstart = (e) => { e.preventDefault(); window[k] = v; };
    el.ontouchend = (e) => { e.preventDefault(); if(k !== 'doJump') window[k] = !v; };
};
b('btn-left', 'moveL', true); b('btn-right', 'moveR', true); b('btn-jump', 'doJump', true);
document.getElementById('btn-jump').ontouchend = () => window.doJump = false;

function setupHotbar() {
    const hb = document.getElementById('hotbar');
    [2,1,3,4].forEach(id => {
        let div = document.createElement('div'); div.className = 'slot';
        div.style.backgroundImage = `url(${textures[id].toDataURL()})`;
        div.onclick = () => { document.querySelectorAll('.slot').forEach(s=>s.classList.remove('active')); div.classList.add('active'); selectedBlock = id; };
        hb.appendChild(div);
    });
}

window.onresize = resize;
initGame();

