const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- KONFIGURASI STABIL ---
const V_WIDTH = 320; 
let V_HEIGHT, TILE = 16, scaleFactor;
let world = [], textures = {}, steve;
let camX = 0, selectedBlock = 2, mode = 'MINE';

// Input Flags (Global)
window.moveL = false; window.moveR = false; window.doJump = false;

function init() {
    // 1. Tekstur dengan Noise (Biar Gak Flat)
    const createT = (id, col, grass) => {
        const t = document.createElement('canvas'); t.width = TILE; t.height = TILE;
        const c = t.getContext('2d');
        c.fillStyle = col; c.fillRect(0,0,TILE,TILE);
        for(let i=0; i<30; i++) {
            c.fillStyle = `rgba(0,0,0,${Math.random()*0.1})`;
            c.fillRect(Math.floor(Math.random()*TILE), Math.floor(Math.random()*TILE), 1, 1);
        }
        if(grass) { c.fillStyle = '#4caf50'; c.fillRect(0,0,TILE,4); }
        textures[id] = t;
    };
    createT(1, '#8d6e63'); createT(2, '#8d6e63', true); createT(3, '#757575'); createT(4, '#5d4037');

    // 2. Steve Sprite
    const s = document.createElement('canvas'); s.width = 10; s.height = 16;
    const sc = s.getContext('2d');
    sc.fillStyle = '#ffcc99'; sc.fillRect(2,0,6,6); // Head
    sc.fillStyle = '#00acc1'; sc.fillRect(2,6,6,6); // Body
    sc.fillStyle = '#3949ab'; sc.fillRect(2,12,6,4); // Legs
    steve = s;

    generateWorld();
    resize();
    setupHotbar();
    requestAnimationFrame(loop);
}

// --- WORLD & PHYSICS ---
let player = { x: 80, y: 0, vx: 0, vy: 0, w: 8, h: 15, grounded: false };

function generateWorld() {
    for(let x=0; x<150; x++) {
        world[x] = [];
        let h = 10 + Math.floor(Math.sin(x*0.3)*2);
        for(let y=0; y<30; y++) {
            if(y > h) world[x][y] = (y > h+3) ? 3 : 1;
            else if(y === h) world[x][y] = 2;
            else world[x][y] = 0;
        }
    }
}

function solid(x, y) {
    let gx = Math.floor(x/TILE), gy = Math.floor(y/TILE);
    return world[gx] && world[gx][gy] > 0 && world[gx][gy] !== 5;
}

function update() {
    player.vy += 0.4;
    if(window.moveL) player.vx = -2.5;
    else if(window.moveR) player.vx = 2.5;
    else player.vx *= 0.7;

    if(window.doJump && player.grounded) { player.vy = -7; player.grounded = false; }

    // X Collision
    if(!solid(player.x + player.vx, player.y) && !solid(player.x + player.vx + player.w, player.y + player.h - 1)) {
        player.x += player.vx;
    }

    // Y Collision
    player.y += player.vy;
    player.grounded = false;
    if(solid(player.x+2, player.y+player.h) || solid(player.x+player.w-2, player.y+player.h)) {
        player.y = Math.floor((player.y+player.h)/TILE)*TILE - player.h;
        player.vy = 0; player.grounded = true;
    }
    
    camX = player.x - V_WIDTH/2;
}

// --- RENDERING (FIX POV) ---
function loop() {
    update();
    ctx.fillStyle = '#87CEEB'; ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.save();
    ctx.scale(scaleFactor, scaleFactor);
    ctx.translate(-Math.floor(camX), 0);
    ctx.imageSmoothingEnabled = false;

    for(let x = Math.floor(camX/TILE); x < Math.floor(camX/TILE) + (V_WIDTH/TILE) + 2; x++) {
        if(!world[x]) continue;
        for(let y=0; y<world[x].length; y++) {
            if(world[x][y] > 0) ctx.drawImage(textures[world[x][y]], x*TILE, y*TILE);
        }
    }
    ctx.drawImage(steve, Math.floor(player.x), Math.floor(player.y));
    ctx.restore();
    requestAnimationFrame(loop);
}

// --- INPUT & UI (FIX RESPONSIF) ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    scaleFactor = canvas.width / V_WIDTH; // Skala penting untuk touch koordinat
    V_HEIGHT = canvas.height / scaleFactor;
}

// Handler Touch Layar (Mining/Building)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    // KONVERSI KOORDINAT (Kunci agar POV pas)
    const realX = (touch.clientX / scaleFactor) + camX;
    const realY = (touch.clientY / scaleFactor);
    
    const gx = Math.floor(realX / TILE);
    const gy = Math.floor(realY / TILE);

    if(world[gx]) {
        if(mode === 'MINE') world[gx][gy] = 0;
        else if(mode === 'BUILD' && world[gx][gy] === 0) world[gx][gy] = selectedBlock;
    }
});

// Tombol Pergerakan
const setupBtn = (id, flag, val) => {
    const el = document.getElementById(id);
    el.ontouchstart = (e) => { e.preventDefault(); window[flag] = val; };
    el.ontouchend = (e) => { e.preventDefault(); if(flag !== 'doJump') window[flag] = !val; };
};

setupBtn('btn-left', 'moveL', true);
setupBtn('btn-right', 'moveR', true);
setupBtn('btn-jump', 'doJump', true);
document.getElementById('btn-jump').ontouchend = () => window.doJump = false;

document.getElementById('btn-mode').onclick = (e) => {
    mode = mode === 'MINE' ? 'BUILD' : 'MINE';
    e.target.innerText = mode === 'MINE' ? '⛏️' : '🧱';
};

function setupHotbar() {
    const hb = document.getElementById('hotbar');
    [2,1,3,4].forEach(id => {
        const s = document.createElement('div'); s.className = 'slot';
        s.style.backgroundImage = `url(${textures[id].toDataURL()})`;
        s.onclick = () => { 
            document.querySelectorAll('.slot').forEach(x=>x.classList.remove('active'));
            s.classList.add('active'); selectedBlock = id; 
        };
        hb.appendChild(s);
    });
    hb.children[0].classList.add('active');
}

window.onresize = resize;
init();

