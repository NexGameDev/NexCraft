const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- KONFIGURASI ---
let TILE_SIZE = 40; // Ukuran blok sedikit diperbesar untuk mobile
let COLS, ROWS;

// --- ASET GAMBAR (TEXTURES) ---
const assets = {
    steve: new Image(),
    dirt: new Image(),
    grassSide: new Image(),
    stone: new Image(),
    wood: new Image(),
    leaves: new Image()
};

// URL Placeholder (Ganti dengan path file lokalmu nanti jika mau)
// Sumber: Aset gratisan mirip MC agar bisa langsung dicoba.
assets.steve.src = 'https://i.imgur.com/5M6vTj4.png'; // Steve sederhana
assets.dirt.src = 'https://i.imgur.com/9Y3C4Qk.png';
assets.grassSide.src = 'https://i.imgur.com/XjI8k9b.png';
assets.stone.src = 'https://i.imgur.com/Kk8Z2zZ.png';
assets.wood.src = 'https://i.imgur.com/F1Z6k2M.png';
assets.leaves.src = 'https://i.imgur.com/8L3K2tS.png';

let assetsLoaded = 0;
const totalAssets = Object.keys(assets).length;

// --- DATA BLOK ---
// Kita simpan referensi gambar di sini bukan warna lagi
const BLOCKS = {
    0: { name: 'Air', texture: null, solid: false },
    1: { name: 'Dirt', texture: assets.dirt, solid: true },
    2: { name: 'Grass', texture: assets.grassSide, solid: true },
    3: { name: 'Stone', texture: assets.stone, solid: true },
    4: { name: 'Wood', texture: assets.wood, solid: false }, // Kayu background (bisa dilewati)
    5: { name: 'Leaves', texture: assets.leaves, solid: true }
};

let world = [];
let selectedBlock = 2; // Default Grass

// --- PLAYER (STEVE) ---
let player = {
    x: 100, y: 100,
    w: 30, h: 58, // Disesuaikan dengan proporsi Steve (sekitar 1x2 blok)
    vx: 0, vy: 0,
    speed: 5, jump: -12, gravity: 0.6,
    grounded: false
};
let keys = {};

// --- FUNGSI UTAMA ---

// 1. Inisialisasi Layar
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Hitung berapa banyak kolom/baris yang muat di layar
    COLS = Math.ceil(canvas.width / TILE_SIZE);
    ROWS = Math.ceil(canvas.height / TILE_SIZE);
    // Jika dunia belum ada, buat baru. Jika sudah, biarkan (agar tidak reset saat rotate)
    if(world.length === 0) generateWorld(); 
}

// 2. Generate World + Pohon
function generateWorld() {
    world = [];
    for (let x = 0; x < COLS; x++) {
        world[x] = [];
        // Membuat bukit yang lebih landai
        let groundHeight = Math.floor(ROWS / 2 + Math.sin(x * 0.1) * 4);
        
        for (let y = 0; y < ROWS; y++) {
            if (y > groundHeight + 3) world[x][y] = 3; // Stone
            else if (y > groundHeight) world[x][y] = 1; // Dirt
            else if (y === groundHeight) world[x][y] = 2; // Grass Block
            else world[x][y] = 0; // Air
        }
    }

    // Menambahkan Pohon (Simple Tree Gen)
    for (let x = 5; x < COLS - 5; x++) {
        // 10% kemungkinan ada pohon di setiap blok rumput
        if (Math.random() < 0.10) {
            let groundY = -1;
            // Cari di mana tanahnya
            for(let y=0; y < ROWS; y++) {
                if(world[x][y] === 2) { groundY = y; break; }
            }

            if(groundY > 5) { // Pastikan cukup ruang untuk tumbuh
                let treeHeight = Math.floor(Math.random() * 3) + 4; // Tinggi 4-6 blok
                // Batang Kayu
                for(let i=1; i<=treeHeight; i++) world[x][groundY-i] = 4; 
                // Daun (kotak sederhana di atas)
                let top = groundY - treeHeight;
                for(let lx = x-2; lx <= x+2; lx++) {
                    for(let ly = top-2; ly <= top; ly++) {
                        // Jangan timpa batang kayu dengan daun
                         if(lx >= 0 && lx < COLS && ly >= 0 && world[lx][ly] === 0) {
                             world[lx][ly] = 5;
                         }
                    }
                }
            }
        }
    }
}

// 3. Game Loop (Update Fisika)
function update() {
    if (keys['a'] || keys['ArrowLeft']) player.vx = -player.speed;
    else if (keys['d'] || keys['ArrowRight']) player.vx = player.speed;
    else player.vx *= 0.8; // Sedikit efek licin (friction)

    player.vy += player.gravity;
    player.x += player.vx;
    
    // Collision Horizontal Sederhana
    checkCollision(player.vx, 0);

    player.y += player.vy;
    player.grounded = false;
    // Collision Vertikal
    checkCollision(0, player.vy);

    draw();
    requestAnimationFrame(update);
}

// Fungsi bantu collision detection
function checkCollision(vx, vy) {
    // Cek 4 sudut karakter
    let testPoints = [
        {x: player.x, y: player.y},
        {x: player.x + player.w, y: player.y},
        {x: player.x, y: player.y + player.h},
        {x: player.x + player.w, y: player.y + player.h}
    ];

    for(let p of testPoints) {
        let gx = Math.floor(p.x / TILE_SIZE);
        let gy = Math.floor(p.y / TILE_SIZE);
        // Jika koordinat ada di dalam array dunia DAN bloknya solid
        if(world[gx] && world[gx][gy] && BLOCKS[world[gx][gy]].solid) {
            if(vy > 0) { // Jatuh ke bawah menabrak lantai
                player.y = gy * TILE_SIZE - player.h;
                player.vy = 0;
                player.grounded = true;
            } else if(vy < 0) { // Lompat menabrak langit-langit
                player.y = (gy + 1) * TILE_SIZE;
                player.vy = 0;
            }
             if(vx > 0) player.x = gx * TILE_SIZE - player.w; // Nabrak kanan
             if(vx < 0) player.x = (gx + 1) * TILE_SIZE; // Nabrak kiri
        }
    }
}


// 4. Render (Menggambar Gambar)
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Gambar Blok
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            let blockID = world[x][y];
            if (blockID !== 0 && BLOCKS[blockID].texture) {
                // --- INI PERUBAHAN KUNCI: drawImage ---
                ctx.drawImage(
                    BLOCKS[blockID].texture, 
                    x * TILE_SIZE, 
                    y * TILE_SIZE, 
                    TILE_SIZE, 
                    TILE_SIZE
                );
            }
        }
    }

    // Gambar Steve
    // Kita gambar Steve sedikit lebih besar dari hitboxnya agar terlihat bagus
    ctx.drawImage(assets.steve, player.x - 5, player.y, player.w + 10, player.h);
}

// --- INPUT & EVENT ---

// Handler Input (Keyboard untuk PC saat testing)
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' && player.grounded) player.vy = player.jump;
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Handler Mouse/Touch (Mining & Building)
canvas.addEventListener('mousedown', handleMouseClick);
canvas.addEventListener('touchstart', (e) => handleMouseClick(e.touches[0]), {passive: false});

function handleMouseClick(e) {
    // Mencegah scroll di mobile saat tap
    if(e.preventDefault) e.preventDefault(); 

    let rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;
    
    let gx = Math.floor(mouseX / TILE_SIZE);
    let gy = Math.floor(mouseY / TILE_SIZE);

    if (world[gx] && world[gx][gy] !== undefined) {
        // Logika sederhana: Jika klik blok kosong -> pasang. Jika klik blok isi -> hancurkan.
        if (world[gx][gy] === 0) {
            world[gx][gy] = selectedBlock;
        } else {
            world[gx][gy] = 0;
        }
    }
}

// Hotbar Selection
document.querySelectorAll('.slot').forEach(slot => {
    slot.addEventListener('click', () => {
        document.querySelector('.active').classList.remove('active');
        slot.classList.add('active');
        selectedBlock = parseInt(slot.dataset.block);
    });
     // Tambahkan touchstart juga untuk respon mobile yang lebih cepat
    slot.addEventListener('touchstart', () => {
        document.querySelector('.active').classList.remove('active');
        slot.classList.add('active');
        selectedBlock = parseInt(slot.dataset.block);
    });
});


window.addEventListener('resize', resizeCanvas);
// Mencegah klik kanan menu browser
window.oncontextmenu = (e) => e.preventDefault();

// --- START GAME ---
// Tunggu semua gambar termuat baru mulai game agar tidak berkedip
function checkAssetsLoaded() {
    assetsLoaded++;
    if(assetsLoaded === totalAssets) {
        console.log("Semua tekstur siap!");
        resizeCanvas();
        update();
    }
}

// Pasang event listener 'load' ke setiap gambar
for(let key in assets) {
    assets[key].onload = checkAssetsLoaded;
}

