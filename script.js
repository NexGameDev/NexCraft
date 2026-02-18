const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let TILE_SIZE, COLS, ROWS;
const blocksTex = {};
let selectedBlock = 2;
let world = [];
let interactionMode = 'MINE'; // MINE atau BUILD

// --- 1. TEXTURE ENGINE ---
function createTexture(id, color, isSteve = false) {
    const temp = document.createElement('canvas');
    temp.width = temp.height = 16;
    const tCtx = temp.getContext('2d');
    tCtx.fillStyle = color; tCtx.fillRect(0,0,16,16);
    if(!isSteve) {
        tCtx.fillStyle = 'rgba(0,0,0,0.1)';
        for(let i=0; i<4; i++) tCtx.fillRect(Math.random()*14, Math.random()*14, 2, 2);
    }
    blocksTex[id] = temp;
    const slot = document.querySelector(`.slot[data-block="${id}"]`);
    if(slot) slot.style.backgroundImage = `url(${temp.toDataURL()})`;
}

function initAssets() {
    createTexture(1, '#614126'); // Dirt
    createTexture(2, '#48ad39'); // Grass
    createTexture(3, '#7a7a7a'); // Stone
    createTexture(4, '#6b4423'); // Wood
    createTexture('steve', '#00aaaa', true); // Steve
}

// --- 2. PLAYER & PHYSICS ---
let player = { x: 100, y: 0, vx: 0, vy: 0, w: 0, h: 0, grounded: false };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    TILE_SIZE = Math.floor(canvas.width / 15);
    COLS = Math.ceil(canvas.width / TILE_SIZE) + 2;
    ROWS = Math.ceil(canvas.height / TILE_SIZE);
    player.w = TILE_SIZE * 0.7;
    player.h = TILE_SIZE * 1.5;
    if(world.length === 0) generateWorld();
}

function generateWorld() {
    for (let x = 0; x < COLS; x++) {
        world[x] = [];
        let gh = Math.floor(ROWS / 1.7);
        for (let y = 0; y < ROWS; y++) {
            if (y > gh) world[x][y] = 1;
            else if (y === gh) world[x][y] = 2;
            else world[x][y] = 0;
        }
    }
}

// --- 3. CONTROLLER LOGIC ---
let joystickActive = false;
const joystick = document.getElementById('joystick');
const joystickContainer = document.getElementById('joystick-container');

joystickContainer.addEventListener('touchstart', () => joystickActive = true);
window.addEventListener('touchend', () => {
    joystickActive = false;
    player.vx = 0;
    joystick.style.transform = `translate(0px, 0px)`;
});

window.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    let touch = e.touches[0];
    let rect = joystickContainer.getBoundingClientRect();
    let centerX = rect.left + rect.width / 2;
    let dist = touch.clientX - centerX;
    
    // Batasi gerak joystick
    let move = Math.max(-40, Math.min(40, dist));
    joystick.style.transform = `translateX(${move}px)`;
    
    // Set kecepatan Steve
    player.vx = (move / 40) * 5;
});

document.getElementById('btn-jump').addEventListener('touchstart', () => {
    if(player.grounded) { player.vy = -12; player.grounded = false; }
});

document.getElementById('btn-mode').addEventListener('click', () => {
    interactionMode = interactionMode === 'MINE' ? 'BUILD' : 'MINE';
    const btn = document.getElementById('btn-mode');
    btn.innerText = `MODE: ${interactionMode}`;
    btn.style.background = interactionMode === 'MINE' ? '#d32f2f' : '#388e3c';
});

// --- 4. GAME LOOP ---
function update() {
    player.vy += 0.6; // Gravity
    player.x += player.vx;
    player.y += player.vy;

    let floorY = Math.floor(ROWS / 1.7) * TILE_SIZE;
    if (player.y + player.h > floorY) {
        player.y = floorY - player.h;
        player.vy = 0;
        player.grounded = true;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Draw World
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            let id = world[x][y];
            if (id !== 0) ctx.drawImage(blocksTex[id], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    // Draw Steve
    ctx.drawImage(blocksTex['steve'], player.x, player.y, player.w, player.h);

    requestAnimationFrame(update);
}

// Mining & Building on Touch
canvas.addEventListener('touchstart', (e) => {
    let rect = canvas.getBoundingClientRect();
    let x = e.touches[0].clientX - rect.left;
    let y = e.touches[0].clientY - rect.top;
    
    let gx = Math.floor(x / TILE_SIZE);
    let gy = Math.floor(y / TILE_SIZE);

    if (world[gx]) {
        if (interactionMode === 'MINE') world[gx][gy] = 0;
        else if (world[gx][gy] === 0) world[gx][gy] = selectedBlock;
    }
});

// Hotbar
document.querySelectorAll('.slot').forEach(s => {
    s.onclick = () => {
        document.querySelector('.active').classList.remove('active');
        s.classList.add('active');
        selectedBlock = parseInt(s.dataset.block);
    };
});

initAssets();
resize();
update();
window.onresize = resize;

