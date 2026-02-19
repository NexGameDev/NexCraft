const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TILE = 32;
const WORLD_WIDTH = 400;
const WORLD_HEIGHT = 80;
const RENDER_DISTANCE = 30;

/* =====================================================
   TEXTURE GENERATOR (DARI KODE KAMU - DISEMPURNAKAN)
===================================================== */

const textures = {
  dirt: null,
  grass: null,
  wood: null,
  leaves: null
};

function createNoiseTexture(color, noiseColor, density) {
  const c = document.createElement("canvas");
  c.width = TILE;
  c.height = TILE;
  const cx = c.getContext("2d");

  cx.fillStyle = color;
  cx.fillRect(0, 0, TILE, TILE);

  for (let i = 0; i < density; i++) {
    const x = Math.floor(Math.random() * TILE);
    const y = Math.floor(Math.random() * TILE);
    const size = Math.random() > 0.5 ? 2 : 1;
    cx.fillStyle = Math.random() > 0.5 ? noiseColor : "rgba(0,0,0,0.2)";
    cx.fillRect(x, y, size, size);
  }
  return c;
}

function initTextures() {

  // DIRT
  textures.dirt = createNoiseTexture("#6b4226","rgba(255,255,255,0.1)",40);

  // GRASS
  const grassCanvas = document.createElement("canvas");
  grassCanvas.width = TILE;
  grassCanvas.height = TILE;
  const gCtx = grassCanvas.getContext("2d");

  gCtx.drawImage(textures.dirt,0,0);

  gCtx.fillStyle="#5fab39";
  gCtx.fillRect(0,0,TILE,10);

  for(let x=0;x<TILE;x+=4){
    let h=Math.floor(Math.random()*6)+2;
    gCtx.fillRect(x,8,4,h);
  }

  textures.grass = grassCanvas;

  // WOOD
  textures.wood = createNoiseTexture("#8B5A2B","#5C3A1E",20);
  const wCtx = textures.wood.getContext("2d");
  wCtx.fillStyle="rgba(0,0,0,0.15)";
  wCtx.fillRect(6,0,2,TILE);
  wCtx.fillRect(14,0,3,TILE);
  wCtx.fillRect(22,0,2,TILE);

  // LEAVES (BARU)
  textures.leaves = createNoiseTexture("#2e8b57","#3fae6f",35);
}

initTextures();

/* =====================================================
   WORLD
===================================================== */

let world = [];

function generateWorld(){
  for(let x=0;x<WORLD_WIDTH;x++){
    world[x]=[];
    let ground=40+Math.floor(Math.sin(x*0.15)*5);

    for(let y=0;y<WORLD_HEIGHT;y++){
      if(y>ground) world[x][y]=1;
      else if(y===ground) world[x][y]=2;
      else world[x][y]=0;
    }

    // TREE
    if(Math.random()<0.08){
      let h=4;
      for(let t=1;t<=h;t++){
        world[x][ground-t]=3;
      }
      for(let lx=-2;lx<=2;lx++){
        for(let ly=-2;ly<=0;ly++){
          if(world[x+lx])
            world[x+lx][ground-h+ly]=4;
        }
      }
    }
  }
}

/* =====================================================
   PLAYER
===================================================== */

const player={
  x:0,y:0,
  width:20,height:30,
  vx:0,vy:0,
  speed:3,
  jump:-10,
  gravity:0.5,
  grounded:false,
  health:10,
  hunger:10
};

function spawnPlayer(){
  for(let y=0;y<WORLD_HEIGHT;y++){
    if(world[20][y]===2){
      player.x=20*TILE;
      player.y=(y-1)*TILE;
      break;
    }
  }
}

/* =====================================================
   CAMERA
===================================================== */

const camera={x:0,y:0,smooth:0.1};

function updateCamera(){
  const targetX=player.x-canvas.width/2+player.width/2;
  const targetY=player.y-canvas.height/2+player.height/2;
  camera.x+=(targetX-camera.x)*camera.smooth;
  camera.y+=(targetY-camera.y)*camera.smooth;
}

/* =====================================================
   MOVEMENT + COLLISION
===================================================== */

function updatePlayer(){

  if(keys["a"]) player.vx=-player.speed;
  else if(keys["d"]) player.vx=player.speed;
  else player.vx=0;

  if(keys["w"]&&player.grounded){
    player.vy=player.jump;
    player.grounded=false;
  }

  player.vy+=player.gravity;
  player.x+=player.vx;
  player.y+=player.vy;

  checkCollision();
}

function checkCollision(){
  player.grounded=false;

  let tileX_left=Math.floor(player.x/TILE);
  let tileX_right=Math.floor((player.x+player.width)/TILE);
  let tileY_bottom=Math.floor((player.y+player.height)/TILE);

  if(
    world[tileX_left] && world[tileX_left][tileY_bottom]>0 ||
    world[tileX_right] && world[tileX_right][tileY_bottom]>0
  ){
    if(player.vy>0){
      player.y=tileY_bottom*TILE-player.height;
      player.vy=0;
      player.grounded=true;
    }
  }
}

/* =====================================================
   HUNGER SYSTEM (LEBIH LAMA)
===================================================== */

let hungerTimer=0;

function updateHunger(){
  hungerTimer++;
  if(hungerTimer>600){ // lebih lama
    player.hunger--;
    hungerTimer=0;
  }

  if(player.hunger<=0){
    player.hunger=0;
    if(Math.random()<0.02) player.health--;
  }

  if(player.hunger>6 && player.health<10){
    player.health+=0.01;
  }
}

/* =====================================================
   DRAW
===================================================== */

function drawBlock(type,x,y){
  if(type===1) ctx.drawImage(textures.dirt,x,y);
  if(type===2) ctx.drawImage(textures.grass,x,y);
  if(type===3) ctx.drawImage(textures.wood,x,y);
  if(type===4) ctx.drawImage(textures.leaves,x,y);
}

function drawWorld(){
  let startX=Math.floor(camera.x/TILE)-1;
  let endX=startX+RENDER_DISTANCE+2;

  for(let x=startX;x<endX;x++){
    if(!world[x]) continue;
    for(let y=0;y<WORLD_HEIGHT;y++){
      if(world[x][y]>0){
        drawBlock(world[x][y],x*TILE,y*TILE);
      }
    }
  }
}

function drawPlayer(){
  ctx.fillStyle="#ffcc99";
  ctx.fillRect(player.x,player.y,player.width,player.height);

  ctx.fillStyle="#00AAAA";
  ctx.fillRect(player.x,player.y+10,player.width,12);

  ctx.fillStyle="#0000AA";
  ctx.fillRect(player.x,player.y+22,player.width,8);
}

/* =====================================================
   PIXEL HEART & HUNGER ICON
===================================================== */

function updateStatus(){
  const hearts=document.getElementById("hearts");
  const hunger=document.getElementById("hunger");
  if(!hearts||!hunger) return;

  hearts.innerHTML="";
  hunger.innerHTML="";

  for(let i=0;i<10;i++){
    let h=document.createElement("div");
    h.style.width="16px";
    h.style.height="16px";
    h.style.background=i<player.health?"red":"#333";
    h.style.clipPath="polygon(50% 80%,0% 40%,20% 0%,50% 20%,80% 0%,100% 40%)";
    hearts.appendChild(h);

    let f=document.createElement("div");
    f.style.width="16px";
    f.style.height="16px";
    f.style.background=i<player.hunger?"orange":"#333";
    f.style.clipPath="polygon(20% 0%,80% 0%,100% 40%,50% 100%,0% 40%)";
    hunger.appendChild(f);
  }
}

/* =====================================================
   LOOP
===================================================== */

function gameLoop(){
  ctx.fillStyle="#87CEEB";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  updatePlayer();
  updateHunger();
  updateCamera();

  ctx.save();
  ctx.translate(-camera.x,-camera.y);

  drawWorld();
  drawPlayer();

  ctx.restore();

  updateStatus();
  requestAnimationFrame(gameLoop);
}

/* ===================================================== */

const keys={};
document.addEventListener("keydown",e=>keys[e.key]=true);
document.addEventListener("keyup",e=>keys[e.key]=false);

generateWorld();
spawnPlayer();
gameLoop();
