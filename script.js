const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CONFIG ---
let TILE_SIZE, COLS, ROWS;
const blocksTex = {};
let selectedBlock = 2;
let world = [];

// --- 1. GENERATE TEXTURES ALGORITHMICALLY ---
function createTexture(id, drawFn) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tempCanvas.height = 16;
    const tCtx = tempCanvas.getContext('2d');
    drawFn(tCtx);
    blocksTex[id] = tempCanvas;
    
    // Update Hotbar UI Preview
    const slot = document.querySelector(`.slot[data-block="${id}"]`);
    if(slot) slot.style.backgroundImage = `url(${tempCanvas.toDataURL()})`;
}

function initTextures() {
    // Dirt
    createTexture(1, c => {
        c.fillStyle = '#614126'; c.fillRect(0,0,16,16);
        c.fillStyle = '#503521'; for(let i=0;i<5;i++) c.fillRect(Math.random()*14, Math.random()*14, 2, 2);
    });
    // Grass
    createTexture(2, c => {
        c.fillStyle = '#614126'; c.fillRect(0,0,16,16);
        c.fillStyle = '#48ad39'; c.fillRect(0,0,16,6);
        c.fillStyle = '#3a8e2e'; c.fillRect(0,5,16,2);
    });
    // Stone
    createTexture(3, c => {
        c.fillStyle = '#7a7a7a'; c.fillRect(0,0,16,16);
        c.fillStyle = '#666'; for(let i=0;i<4;i++) c.fillRect(Math.random()*14, Math.random()*14, 3, 2);
    });
    // Wood
    createTexture(4, c => {
        c.fillStyle = '#6b4423'; c.fillRect(0,0,16,16);
        c.fillStyle = '#4d321a'; c.fillRect(0,4,16,2); c.fillRect(0,10,16,2);
    });
    // Steve (Sprite)
    createTexture('steve', c => {
        c.fillStyle = '#00aaaa'; c.fillRect(4,8,8,8); // Body
        c.fillStyle = '#dbac82'; c.fillRect(4,2,8,6);  // Head
        c.fillStyle = '#3d2211'; c.fillRect(4,2,8,2);  // Hair
        c.fillStyle = '#3c44aa'; c.fillRect(4,12,8,4); // Legs
    });
}

// --- 2. WORLD & PLAYER LOGIC ---
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
        let gHeight = Math.floor(ROWS / 1.7);
        for (let y = 0; y < ROWS; y++) {
            if (y > gHeight) world[x][y] = (y > gHeight + 2) ? 3 : 1;
            else if (y === gHeight) world[x][y] = 2;
            else world[x][y] = 0;
        }
    }
}

// --- 3. INPUT & UPDATE ---
const keys = {};
window.onkeydown = e => keys[e.key.toLowerCase()] = true;
window.onkeyup = e => keys[e.key.toLowerCase()] = false;

function update() {
    // Horizontal Movement
    if (keys['a']) player.vx = -5;
    else if (keys['d']) player.vx = 5;
    else player.vx *= 0.8;

    player.vy += 0.5; // Gravity
    player.x += player.vx;
    player.y += player.vy;

    // Basic Floor Collision
    let floorY = Math.floor(ROWS / 1.7) * TILE_SIZE;
    if (player.y + player.h > floorY) {
        player.y = floorY - player.h;
        player.vy = 0;
        player.grounded = true;
    }
    if (keys[' '] && player.grounded) { player.vy = -10; player.grounded = false; }

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

// --- 4. TOUCH CONTROLS ---
canvas.ontouchstart = (e) => {
    let tx = e.touches[0].clientX;
    if (tx < canvas.width / 3) player.vx = -10;
    else if (tx > (canvas.width / 3) * 2) player.vx = 10;
    else if (player.grounded) { player.vy = -12; player.grounded = false; }
    
    // Tap to build/mine
    let ty = e.touches[0].clientY;
    let gx = Math.floor(tx / TILE_SIZE);
    let gy = Math.floor(ty / TILE_SIZE);
    if(world[gx]) world[gx][gy] = (world[gx][gy] === 0) ? selectedBlock : 0;
};

document.querySelectorAll('.slot').forEach(s => {
    s.onclick = () => {
        document.querySelector('.active').classList.remove('active');
        s.classList.add('active');
        selectedBlock = parseInt(s.dataset.block);
    };
});

initTextures();
resize();
update();
window.onresize = resize;

