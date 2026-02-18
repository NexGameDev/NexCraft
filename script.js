const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- KONFIGURASI ---
const V_WIDTH = 320;
let V_HEIGHT, TILE = 16, scaleFactor;
let world = [], textures = {};
let camX = 0, selectedBlock = 2, mode = 'MINE';

// Input Flags
window.moveL = false;
window.moveR = false;
window.doJump = false;

// Player
let player = {
    x: 80,
    y: 0,
    vx: 0,
    vy: 0,
    w: 10,
    h: 16,
    grounded: false,
    anim: 0
};

function init() {

    // TEXTURE GENERATOR
    const createT = (id, col, grass) => {
        const t = document.createElement('canvas');
        t.width = TILE;
        t.height = TILE;
        const c = t.getContext('2d');

        c.fillStyle = col;
        c.fillRect(0, 0, TILE, TILE);

        for (let i = 0; i < 40; i++) {
            c.fillStyle = `rgba(0,0,0,${Math.random()*0.15})`;
            c.fillRect(
                Math.floor(Math.random()*TILE),
                Math.floor(Math.random()*TILE),
                1, 1
            );
        }

        if (grass) {
            c.fillStyle = '#4caf50';
            c.fillRect(0, 0, TILE, 4);
        }

        textures[id] = t;
    };

    createT(1, '#8d6e63');
    createT(2, '#8d6e63', true);
    createT(3, '#757575');
    createT(4, '#5d4037');

    generateWorld();
    resize();
    setupHotbar();
    requestAnimationFrame(loop);
}

// WORLD
function generateWorld() {
    for (let x = 0; x < 150; x++) {
        world[x] = [];
        let h = 10 + Math.floor(Math.sin(x * 0.3) * 2);
        for (let y = 0; y < 30; y++) {
            if (y > h) world[x][y] = (y > h + 3) ? 3 : 1;
            else if (y === h) world[x][y] = 2;
            else world[x][y] = 0;
        }
    }
}

function solidPixel(px, py) {
    let gx = Math.floor(px / TILE);
    let gy = Math.floor(py / TILE);
    return world[gx] && world[gx][gy] > 0;
}

// UPDATE
function update() {

    // Gravity
    player.vy += 0.4;
    if (player.vy > 8) player.vy = 8;

    // Horizontal Input
    if (window.moveL) player.vx = -2.5;
    else if (window.moveR) player.vx = 2.5;
    else player.vx *= 0.7;

    // Jump
    if (window.doJump && player.grounded) {
        player.vy = -7;
        player.grounded = false;
    }

    // --- X COLLISION ---
    let nextX = player.x + player.vx;

    if (
        !solidPixel(nextX, player.y + 2) &&
        !solidPixel(nextX + player.w, player.y + 2) &&
        !solidPixel(nextX, player.y + player.h - 2) &&
        !solidPixel(nextX + player.w, player.y + player.h - 2)
    ) {
        player.x = nextX;
    } else {
        player.vx = 0;
    }

    // --- Y COLLISION ---
    let nextY = player.y + player.vy;

    if (player.vy > 0) { // FALL
        if (
            solidPixel(player.x + 2, nextY + player.h) ||
            solidPixel(player.x + player.w - 2, nextY + player.h)
        ) {
            player.y = Math.floor((nextY + player.h) / TILE) * TILE - player.h;
            player.vy = 0;
            player.grounded = true;
        } else {
            player.y = nextY;
            player.grounded = false;
        }
    } else if (player.vy < 0) { // HEAD HIT
        if (
            solidPixel(player.x + 2, nextY) ||
            solidPixel(player.x + player.w - 2, nextY)
        ) {
            player.vy = 0;
        } else {
            player.y = nextY;
        }
    }

    // CAMERA CLAMP
    camX = player.x - V_WIDTH / 2;
    if (camX < 0) camX = 0;
    if (camX > world.length * TILE - V_WIDTH)
        camX = world.length * TILE - V_WIDTH;

    // Animasi jalan
    if (Math.abs(player.vx) > 0.5 && player.grounded) {
        player.anim += 0.25;
    }
}

// DRAW PLAYER (ANIMASI)
function drawPlayer() {

    const px = Math.floor(player.x);
    const py = Math.floor(player.y);

    // HEAD
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(px + 2, py, 6, 6);

    // BODY
    ctx.fillStyle = '#00acc1';
    ctx.fillRect(px + 2, py + 6, 6, 6);

    // LEGS ANIMATED
    ctx.fillStyle = '#3949ab';

    let legOffset = Math.sin(player.anim) * 2;

    ctx.fillRect(px + 2, py + 12, 3, 4 + legOffset);
    ctx.fillRect(px + 5, py + 12, 3, 4 - legOffset);
}

// LOOP
function loop() {
    update();

    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(scaleFactor, scaleFactor);
    ctx.translate(-Math.floor(camX), 0);
    ctx.imageSmoothingEnabled = false;

    for (let x = Math.floor(camX / TILE);
         x < Math.floor(camX / TILE) + (V_WIDTH / TILE) + 2;
         x++) {

        if (!world[x]) continue;

        for (let y = 0; y < world[x].length; y++) {
            if (world[x][y] > 0)
                ctx.drawImage(textures[world[x][y]], x * TILE, y * TILE);
        }
    }

    drawPlayer();

    ctx.restore();
    requestAnimationFrame(loop);
}

// RESIZE
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    scaleFactor = canvas.width / V_WIDTH;
    V_HEIGHT = canvas.height / scaleFactor;
}

// TOUCH MINING
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];

    const realX = (touch.clientX / scaleFactor) + camX;
    const realY = (touch.clientY / scaleFactor);

    const gx = Math.floor(realX / TILE);
    const gy = Math.floor(realY / TILE);

    if (world[gx] && world[gx][gy] !== undefined) {
        if (mode === 'MINE') world[gx][gy] = 0;
        else if (mode === 'BUILD' && world[gx][gy] === 0)
            world[gx][gy] = selectedBlock;
    }
});

// BUTTON SETUP
const setupBtn = (id, flag, val) => {
    const el = document.getElementById(id);
    el.ontouchstart = (e) => { e.preventDefault(); window[flag] = val; };
    el.ontouchend = (e) => { e.preventDefault(); window[flag] = false; };
};

setupBtn('btn-left', 'moveL', true);
setupBtn('btn-right', 'moveR', true);
setupBtn('btn-jump', 'doJump', true);

document.getElementById('btn-mode').onclick = (e) => {
    mode = mode === 'MINE' ? 'BUILD' : 'MINE';
    e.target.innerText = mode === 'MINE' ? '⛏️' : '🧱';
};

function setupHotbar() {
    const hb = document.getElementById('hotbar');
    [2,1,3,4].forEach(id => {
        const s = document.createElement('div');
        s.className = 'slot';
        s.style.backgroundImage = `url(${textures[id].toDataURL()})`;
        s.onclick = () => {
            document.querySelectorAll('.slot')
                .forEach(x => x.classList.remove('active'));
            s.classList.add('active');
            selectedBlock = id;
        };
        hb.appendChild(s);
    });
    hb.children[0].classList.add('active');
}

window.onresize = resize;
init();
