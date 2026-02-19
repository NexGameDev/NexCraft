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
   TEXTURES
===================================================== */

const textures = { dirt:null, grass:null, wood:null, leaves:null };

function createNoiseTexture(color, noiseColor, density){
  const c=document.createElement("canvas");
  c.width=TILE; c.height=TILE;
  const cx=c.getContext("2d");

  cx.fillStyle=color;
  cx.fillRect(0,0,TILE,TILE);

  for(let i=0;i<density;i++){
    let x=Math.random()*TILE;
    let y=Math.random()*TILE;
    cx.fillStyle=Math.random()>0.5?noiseColor:"rgba(0,0,0,0.2)";
    cx.fillRect(x,y,2,2);
  }
  return c;
}

function initTextures(){
  textures.dirt=createNoiseTexture("#6b4226","rgba(255,255,255,0.1)",40);

  const grassCanvas=document.createElement("canvas");
  grassCanvas.width=TILE;
  grassCanvas.height=TILE;
  const g=grassCanvas.getContext("2d");
  g.drawImage(textures.dirt,0,0);
  g.fillStyle="#5fab39";
  g.fillRect(0,0,TILE,10);
  textures.grass=grassCanvas;

  textures.wood=createNoiseTexture("#8B5A2B","#5C3A1E",20);
  textures.leaves=createNoiseTexture("#2e8b57","#3fae6f",35);
}
initTextures();

/* =====================================================
   WORLD
===================================================== */

let world=[];

function generateWorld(){
  for(let x=0;x<WORLD_WIDTH;x++){
    world[x]=[];
    let ground=40+Math.floor(Math.sin(x*0.15)*5);

    for(let y=0;y<WORLD_HEIGHT;y++){
      if(y>ground) world[x][y]=1;
      else if(y===ground) world[x][y]=2;
      else world[x][y]=0;
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

const camera={x:0,y:0,smooth:0.15};

function updateCamera(){
  let targetX=player.x-canvas.width/2+player.width/2;
  let targetY=player.y-canvas.height/2+player.height/2;

  camera.x+=(targetX-camera.x)*camera.smooth;
  camera.y+=(targetY-camera.y)*camera.smooth;

  // batasi kamera agar tidak keluar dunia
  camera.x=Math.max(0,Math.min(camera.x,WORLD_WIDTH*TILE-canvas.width));
  camera.y=Math.max(0,Math.min(camera.y,WORLD_HEIGHT*TILE-canvas.height));
}

/* =====================================================
   MOVEMENT + COLLISION FIX
===================================================== */

function isSolid(x,y){
  return world[x] && world[x][y] > 0;
}

function updatePlayer(){

  // Horizontal
  if(keys["a"]) player.vx=-player.speed;
  else if(keys["d"]) player.vx=player.speed;
  else player.vx=0;

  if(keys["w"] && player.grounded){
    player.vy=player.jump;
    player.grounded=false;
  }

  player.vy+=player.gravity;

  // Move X
  player.x+=player.vx;

  let left=Math.floor(player.x/TILE);
  let right=Math.floor((player.x+player.width)/TILE);
  let top=Math.floor(player.y/TILE);
  let bottom=Math.floor((player.y+player.height-1)/TILE);

  if(player.vx>0 && (isSolid(right,top)||isSolid(right,bottom))){
    player.x=right*TILE-player.width;
  }
  if(player.vx<0 && (isSolid(left,top)||isSolid(left,bottom))){
    player.x=(left+1)*TILE;
  }

  // Move Y
  player.y+=player.vy;

  left=Math.floor(player.x/TILE);
  right=Math.floor((player.x+player.width-1)/TILE);
  top=Math.floor(player.y/TILE);
  bottom=Math.floor((player.y+player.height)/TILE);

  player.grounded=false;

  if(player.vy>0 && (isSolid(left,bottom)||isSolid(right,bottom))){
    player.y=bottom*TILE-player.height;
    player.vy=0;
    player.grounded=true;
  }

  if(player.vy<0 && (isSolid(left,top)||isSolid(right,top))){
    player.y=(top+1)*TILE;
    player.vy=0;
  }

  // jangan jatuh keluar map
  if(player.y>WORLD_HEIGHT*TILE){
    spawnPlayer();
  }
}

/* =====================================================
   HUNGER SYSTEM
===================================================== */

let hungerTimer=0;

function updateHunger(){
  hungerTimer++;
  if(hungerTimer>800){
    player.hunger=Math.max(0,player.hunger-1);
    hungerTimer=0;
  }

  if(player.hunger===0 && Math.random()<0.01){
    player.health=Math.max(0,player.health-1);
  }

  if(player.hunger>6 && player.health<10){
    player.health=Math.min(10,player.health+0.02);
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
  let endX=startX+RENDER_DISTANCE;

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

  requestAnimationFrame(gameLoop);
}

/* =====================================================
   CONTROLS
===================================================== */

const keys={};

document.addEventListener("keydown",e=>keys[e.key]=true);
document.addEventListener("keyup",e=>keys[e.key]=false);

// optional: mobile button support
["left","right","jump"].forEach(id=>{
  const btn=document.getElementById(id);
  if(!btn) return;

  let key=id==="left"?"a":id==="right"?"d":"w";

  btn.addEventListener("touchstart",e=>{
    e.preventDefault();
    keys[key]=true;
  });
  btn.addEventListener("touchend",e=>{
    e.preventDefault();
    keys[key]=false;
  });
});

generateWorld();
spawnPlayer();
gameLoop();
