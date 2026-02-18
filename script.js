const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- KONFIGURASI RETRO ---
// Resolusi Kecil = Tampilan Pixel Besar
const V_WIDTH = 320; 
let V_HEIGHT = 180; 
const TILE_SIZE = 16; 

let COLS, ROWS;
let world = [];
const textures = {};
let selectedBlock = 2; // Grass
let mode = 'MINE';

// Global Flags untuk Input (FIX BUG JALAN)
let input = { left: false, right: false, jump: false };

// --- 1. ASSET GENERATOR (PIXEL ART) ---
function createTexture(id, color, pattern) {
    const t = document.createElement('canvas');
    t.width = TILE_SIZE; t.height = TILE_SIZE;
    const c = t.getContext('2d');
    
    // Dasar Warna
    c.fillStyle = color;
    c.fillRect(0,0,16,16);
    
    // Pola Pixel Noise (Biar Retro)
    if(pattern) {
        c.fillStyle = 'rgba(0,0,0,0.1)';
        for(let i=0; i<8; i++) {
            c.fillRect(Math.floor(Math.random()*16), Math.floor(Math.random()*16), 1, 1);
        }
    }
    
    // Pola Khusus
    if(id === 2) { // Grass Top
        c.fillStyle = '#4caf50'; c.fillRect(0,0,16,4);
        c.fillStyle = '#2e7d32'; c.fillRect(0,4,16,1);
    }
    if(id === 4) { // Wood Log
        c.fillStyle = '#3e2723'; c.fillRect(4,0,2,16); c.fillRect(10,0,2,16);
    }
    if(id === 5) { // Leaves
        c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(2,2,4,4); c.fillRect(10,8,4,4);
    }
    if(id === 6 || id === 7) { // Ores
        c.fillStyle = (id===6) ? '#000' : '#eecfa1'; // Coal or Iron
        c.fillRect(4,4,4,4); c.fillRect(10,10,2,2);
    }

    textures[id] = t;
}

// Steve (Player) Sprite 8-bit
let steveSprite;
function createSteve() {
    const t = document.createElement('canvas');
    t.width = 8; t.height = 16; // Sprite kecil
    const c = t.getContext('2d');
    
    // Head
    c.fillStyle = '#e0ae87'; c.fillRect(2,0,4,4);
    c.fillStyle = '#222'; c.fillRect(2,0,4,1); // Hair
    // Body
    c.fillStyle = '#00acc1'; c.fillRect(2,4,4,6);
    // Arms
    c.fillStyle = '#e0ae87'; c.fillRect(1,4,1,4); c.fillRect(6,4,1,4);
    // Legs
    c.fillStyle = '#3949ab'; c.fillRect(2,10,4,6);
    // Shoes
    c.fillStyle = '#111'; c.fillRect(2,15,1,1); c.fillRect(5,15,1,1);
    
    steveSprite = t;
}

function initAssets() {
    createTexture(1, '#795548', true); // Dirt
    createTexture(2, '#795548', true); // Grass Block
    createTexture(3, '#757575', true); // Stone
    createTexture(4, '#5d4037', false); // Wood
    createTexture(5, '#2e7d32', true); // Leaves
    createTexture(6, '#757575', true); // Coal Ore
    createTexture(7, '#757575', true); // Iron Ore
    createTexture(8, '#8d6e63', true); // Planks
    createSteve();
    setupHotbar();
}

// --- 2. WORLD GENERATION ---
function generateWorld() {
    COLS = Math.ceil(V_WIDTH / TILE_SIZE) + 20; // Extra lebar biar scroll aman
    ROWS = Math.ceil(V_HEIGHT / TILE_SIZE) + 10;
    world = [];

    for (let x = 0; x < COLS; x++) {
        world[x] = [];
        // Terrain Sine Wave
        let groundY = Math.floor(ROWS/2) + Math.floor(Math.sin(x*0.2) * 3);
        
        for (let y = 0; y < ROWS; y++) {
            let id = 0;
            if (y > groundY) {
                if (y > groundY + 5) id = (Math.random()<0.1) ? 6 : (Math.random()<0.05 ? 7 : 3); // Stone/Ores
                else id = 1; // Dirt
            } else if (y === groundY) {
                id = 2; // Grass
            }
            world[x][y] = id;
        }

        // Trees (Pohon)
        if (x > 5 && x < COLS-5 && Math.random() < 0.15) {
            let treeH = 3 + Math.floor(Math.random()*3);
            for(let i=1; i<=treeH; i++) world[x][groundY-i] = 4; // Trunk
            // Leaves
            for(let lx=-1; lx<=1; lx++) {
                for(let ly=-2; ly<=0; ly++) {
                    if(!world[x+lx][groundY-treeH+ly]) world[x+lx][groundY-treeH+ly] = 5;
                }
            }
        }
    }
}

// --- 3. PHYSICS & PLAYER ---
let player = { x: 50, y: 0, vx: 0, vy: 0, w: 8, h: 15, grounded: false };
let camX = 0;

function isSolid(px, py) {
    let gx = Math.floor(px / TILE_SIZE);
    let gy = Math.floor(py / TILE_SIZE);
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
    // Daun (5) tidak solid
    return (world[gx][gy] !== 0 && world[gx][gy] !== 5);
}

function update() {
    // 1. Input Processing
    if (input.left) player.vx = -2.5;
    else if (input.right) player.vx = 2.5;
    else player.vx *= 0.6; // Friction

    if (input.jump && player.grounded) {
        player.vy = -6.5;
        player.grounded = false;
        input.jump = false; // Reset jump
    }

    // 2. Physics - Gravity
    player.vy += 0.4;
    if (player.vy > 6) player.vy = 6; // Max fall speed

    // 3. Collision Detection (4 Point Check - FIX TEMBUS)
    // Horizontal
    let nextX = player.x + player.vx;
    if (!isSolid(nextX, player.y) && 
        !isSolid(nextX + player.w, player.y) &&
        !isSolid(nextX, player.y + player.h - 1) && 
        !isSolid(nextX + player.w, player.y + player.h - 1)) {
        player.x = nextX;
    } else {
        player.vx = 0;
    }

    // Vertical
    let nextY = player.y + player.vy;
    // Ceiling Check (Fix Hilang ke Atas)
    if (nextY < 0) { nextY = 0; player.vy = 0; }
    
    // Ground Check
    if (player.vy > 0) { // Falling
        if (isSolid(player.x, nextY + player.h) || isSolid(player.x + player.w, nextY + player.h)) {
            player.y = Math.floor((nextY + player.h) / TILE_SIZE) * TILE_SIZE - player.h;
            player.vy = 0;
            player.grounded = true;
        } else {
            player.y = nextY;
            player.grounded = false;
        }
    } else { // Jumping
         if (isSolid(player.x, nextY) || isSolid(player.x + player.w, nextY)) {
             player.y = Math.floor(nextY / TILE_SIZE + 1) * TILE_SIZE;
             player.vy = 0;
         } else {
             player.y = nextY;
         }
    }

    // Camera Follow
    camX = player.x - V_WIDTH/2;
    if(camX < 0) camX = 0;
    if(camX > COLS*TILE_SIZE - V_WIDTH) camX = COLS*TILE_SIZE - V_WIDTH;
}

// --- 4. RENDER LOOP ---
function draw() {
    // Bersihkan Layar dengan warna Langit
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scaling untuk efek Retro
    ctx.save();
    let scale = canvas.width / V_WIDTH;
    ctx.scale(scale, scale);
    ctx.translate(-Math.floor(camX), 0);

    // Draw Blocks (Hanya yang terlihat di layar)
    let startCol = Math.floor(camX / TILE_SIZE);
    let endCol = startCol + Math.ceil(V_WIDTH / TILE_SIZE) + 1;

    for (let x = startCol; x < endCol; x++) {
        if (!world[x]) continue;
        for (let y = 0; y < ROWS; y++) {
            let id = world[x][y];
            if (id !== 0) {
                ctx.drawImage(textures[id], x * TILE_SIZE, y * TILE_SIZE);
            }
        }
    }

    // Draw Steve
    ctx.drawImage(steveSprite, Math.floor(player.x), Math.floor(player.y));
    
    // Highlight Block Selection
    if(mode === 'MINE' || mode === 'BUILD') {
        // Logic kursor sederhana di depan player
        let selX = Math.floor((player.x + player.w/2 + (input.right ? 10 : -10)) / TILE_SIZE);
        let selY = Math.floor((player.y + player.h/2) / TILE_SIZE);
        
        ctx.strokeStyle = (mode==='MINE') ? 'red' : 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(selX * TILE_SIZE, selY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    ctx.restore();
    requestAnimationFrame(loop);
}

function loop() {
    update();
    draw();
}

// --- 5. INPUT & UI HANDLING ---
function setupHotbar() {
    const hb = document.getElementById('hotbar');
    const items = [2, 1, 3, 4, 5, 8]; // Block IDs
    items.forEach(id => {
        const el = document.createElement('div');
        el.className = 'slot';
        el.style.backgroundImage = `url(${textures[id].toDataURL()})`;
        el.onclick = () => {
            document.querySelectorAll('.slot').forEach(s => s.classList.remove('active'));
            el.classList.add('active');
            selectedBlock = id;
        };
        hb.appendChild(el);
    });
    hb.children[0].classList.add('active');
}

// Event Listeners (Touch & Mouse)
const bindBtn = (id, key) => {
    const el = document.getElementById(id);
    const start = (e) => { e.preventDefault(); input[key] = true; };
    const end = (e) => { e.preventDefault(); input[key] = false; };
    el.addEventListener('mousedown', start); el.addEventListener('mouseup', end);
    el.addEventListener('touchstart', start); el.addEventListener('touchend', end);
};

bindBtn('btn-left', 'left');
bindBtn('btn-right', 'right');
bindBtn('btn-jump', 'jump');

document.getElementById('btn-mode').onclick = (e) => {
    mode = (mode === 'MINE') ? 'BUILD' : 'MINE';
    e.target.innerText = (mode === 'MINE') ? '⛏️' : '🧱';
    e.target.className = `btn pixel-btn mode-${mode.toLowerCase()}`;
};

// World Interaction (Tap to Mine/Build)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    // Konversi koordinat layar ke koordinat game
    let scale = canvas.width / V_WIDTH;
    let touchX = e.touches[0].clientX;
    let touchY = e.touches[0].clientY;
    
    let gameX = (touchX / scale) + camX;
    let gameY = touchY / scale;
    
    let gx = Math.floor(gameX / TILE_SIZE);
    let gy = Math.floor(gameY / TILE_SIZE);
    
    if (world[gx]) {
        if (mode === 'MINE') world[gx][gy] = 0;
        else if (mode === 'BUILD' && world[gx][gy] === 0) world[gx][gy] = selectedBlock;
    }
});

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    V_HEIGHT = Math.floor(V_WIDTH * (canvas.height / canvas.width));
    // Regenerate world if needed
    if(world.length === 0) generateWorld();
}

window.addEventListener('resize', resize);
initAssets();
resize();
loop();
