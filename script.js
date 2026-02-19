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
  grassCanvas.width=TILE; grassCanvas.height=TILE;
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
  hunger:10,
  inventory:[], // {type:"grass", count:1}
  selectedItem:0
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
   PLAYER ANIMATION
===================================================== */
let animFrame = 0;
let animTimer = 0;
const WALK_SPEED = 8;

/* =====================================================
   CAMERA
===================================================== */
const camera={x:0,y:0,smooth:0.15};
function updateCamera(){
  let targetX=player.x-canvas.width/2+player.width/2;
  let targetY=player.y-canvas.height/2+player.height/2;
  camera.x+=(targetX-camera.x)*camera.smooth;
  camera.y+=(targetY-camera.y)*camera.smooth;
  camera.x=Math.max(0,Math.min(camera.x,WORLD_WIDTH*TILE-canvas.width));
  camera.y=Math.max(0,Math.min(camera.y,WORLD_HEIGHT*TILE-canvas.height));
}

/* =====================================================
   MOVEMENT + COLLISION
===================================================== */
function isSolid(x,y){return world[x] && world[x][y]>0;}

function updatePlayer(){
  if(keys["a"]) player.vx=-player.speed;
  else if(keys["d"]) player.vx=player.speed;
  else player.vx=0;

  if(keys["w"] && player.grounded){ player.vy=player.jump; player.grounded=false; }
  player.vy+=player.gravity;

  // X movement
  player.x+=player.vx;
  let left=Math.floor(player.x/TILE);
  let right=Math.floor((player.x+player.width)/TILE);
  let top=Math.floor(player.y/TILE);
  let bottom=Math.floor((player.y+player.height-1)/TILE);

  if(player.vx>0 && (isSolid(right,top)||isSolid(right,bottom))) player.x=right*TILE-player.width;
  if(player.vx<0 && (isSolid(left,top)||isSolid(left,bottom))) player.x=(left+1)*TILE;

  // Y movement
  player.y+=player.vy;
  left=Math.floor(player.x/TILE);
  right=Math.floor((player.x+player.width-1)/TILE);
  top=Math.floor(player.y/TILE);
  bottom=Math.floor((player.y+player.height)/TILE);

  player.grounded=false;
  if(player.vy>0 && (isSolid(left,bottom)||isSolid(right,bottom))){ player.y=bottom*TILE-player.height; player.vy=0; player.grounded=true; }
  if(player.vy<0 && (isSolid(left,top)||isSolid(right,top))){ player.y=(top+1)*TILE; player.vy=0; }

  if(player.y>WORLD_HEIGHT*TILE) spawnPlayer();

  // Animation
  if(Math.abs(player.vx)>0 && player.grounded){ animTimer++; if(animTimer>WALK_SPEED){ animFrame=(animFrame+1)%4; animTimer=0; } }
  else animFrame=0;

  updateMining();
}

/* =====================================================
   HUNGER & HEALTH RETRO PIXEL
===================================================== */
let hungerTimer=0;
function updateHunger(){
  hungerTimer++;
  if(hungerTimer>800){ player.hunger=Math.max(0,player.hunger-1); hungerTimer=0; }
  if(player.hunger===0 && Math.random()<0.01) player.health=Math.max(0,player.health-1);
  if(player.hunger>6 && player.health<10) player.health=Math.min(10,player.health+0.02);
}

function drawStatus(){
  for(let i=0;i<10;i++){
    ctx.fillStyle=i<player.health?"red":"#333"; ctx.fillRect(10+i*18,10,16,16);
  }
  for(let i=0;i<10;i++){
    ctx.fillStyle=i<player.hunger?"orange":"#333"; ctx.fillRect(10+i*18,30,16,16);
  }
}

/* =====================================================
   MINING & BUILDING
===================================================== */
let miningBlock=null, miningProgress=0;
const MINING_SPEED=50;
let mode="mine";

function updateMining(){
  if(miningBlock){
    miningProgress++;
    if(miningProgress>=MINING_SPEED){
      const {x,y}=miningBlock;
      const type=world[x][y];
      addToInventory(type,1);
      world[x][y]=0;
      miningBlock=null; miningProgress=0;
    }
  }
}

function startMining(x,y){
  if(world[x] && world[x][y]>0){ miningBlock={x,y}; miningProgress=0; }
}

function addToInventory(type,count){
  const existing=player.inventory.find(i=>i.type===type);
  if(existing) existing.count+=count; else player.inventory.push({type,count});
}

function buildBlock(x,y){
  if(world[x] && world[x][y]===0){
    const item=player.inventory[player.selectedItem];
    if(item && item.count>0){ world[x][y]=getBlockIdFromName(item.type); item.count--; }
  }
}

function getBlockIdFromName(name){
  if(name==="dirt") return 1;
  if(name==="grass") return 2;
  if(name==="wood") return 3;
  if(name==="leaves") return 4;
  return 0;
}

/* =====================================================
   DRAW WORLD & PLAYER
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
      if(world[x][y]>0) drawBlock(world[x][y],x*TILE,y*TILE);
    }
  }
  // highlight mining block
  if(miningBlock){
    ctx.strokeStyle="yellow";
    ctx.lineWidth=2;
    ctx.strokeRect(miningBlock.x*TILE, miningBlock.y*TILE, TILE, TILE);
    ctx.fillStyle="rgba(255,255,0,0.2)";
    ctx.fillRect(miningBlock.x*TILE, miningBlock.y*TILE, TILE, TILE);
  }
}

function drawPlayer(){
  const x=player.x, y=player.y;
  ctx.fillStyle="#ffcc99"; ctx.fillRect(x+4,y,12,10); // head
  ctx.fillStyle="#00aaaa"; ctx.fillRect(x+3,y+10,14,10); // body
  ctx.fillStyle="#ffcc99"; // arms
  if(player.grounded && Math.abs(player.vx)>0){
    if(animFrame%2===0){ ctx.fillRect(x,y+10,3,8); ctx.fillRect(x+17,y+12,3,8); }
    else{ ctx.fillRect(x,y+12,3,8); ctx.fillRect(x+17,y+10,3,8); }
  }else{ ctx.fillRect(x,y+10,3,8); ctx.fillRect(x+17,y+10,3,8); }
  ctx.fillStyle="#0000aa"; // legs
  if(!player.grounded){ ctx.fillRect(x+4,y+20,4,10); ctx.fillRect(x+12,y+20,4,10); }
  else if(Math.abs(player.vx)>0){
    if(animFrame===0){ ctx.fillRect(x+4,y+20,4,10); ctx.fillRect(x+12,y+22,4,8); }
    else if(animFrame===1){ ctx.fillRect(x+4,y+22,4,8); ctx.fillRect(x+12,y+20,4,10); }
    else{ ctx.fillRect(x+4,y+21,4,9); ctx.fillRect(x+12,y+21,4,9); }
  }else{ ctx.fillRect(x+4,y+20,4,10); ctx.fillRect(x+12,y+20,4,10); }
}

/* INVENTORY DRAW */
function drawInventory(){
  for(let i=0;i<player.inventory.length;i++){
    const item=player.inventory[i];
    const x=10+i*36, y=canvas.height-50;
    ctx.fillStyle="black"; ctx.fillRect(x-2,y-2,34,34);
    if(item.type==="dirt") ctx.drawImage(textures.dirt,x,y);
    if(item.type==="grass") ctx.drawImage(textures.grass,x,y);
    if(item.type==="wood") ctx.drawImage(textures.wood,x,y);
    if(item.type==="leaves") ctx.drawImage(textures.leaves,x,y);
    ctx.fillStyle="white"; ctx.font="16px monospace"; ctx.fillText(item.count,x+2,y+24);
    if(i===player.selectedItem){ ctx.strokeStyle="yellow"; ctx.lineWidth=2; ctx.strokeRect(x-2,y-2,34,34); }
  }
}

/* =====================================================
   GAME LOOP
===================================================== */
function gameLoop(){
  ctx.fillStyle="#87CEEB"; ctx.fillRect(0,0,canvas.width,canvas.height);
  updatePlayer(); updateHunger(); updateCamera();
  ctx.save(); ctx.translate(-camera.x,-camera.y);
  drawWorld(); drawPlayer(); ctx.restore();
  drawStatus(); drawInventory();
  requestAnimationFrame(gameLoop);
}

/* =====================================================
   CONTROLS
===================================================== */
const keys={};
document.addEventListener("keydown",e=>{
  keys[e.key]=true;
  if(e.key==="m") mode="mine";
  if(e.key==="b") mode="build";
  if(e.key>="1" && e.key<="9") player.selectedItem=parseInt(e.key)-1;
});
document.addEventListener("keyup",e=>keys[e.key]=false);

canvas.addEventListener("mousedown",e=>{
  const mouseX=Math.floor((e.clientX+camera.x)/TILE);
  const mouseY=Math.floor((e.clientY+camera.y)/TILE);
  if(mode==="mine") startMining(mouseX,mouseY);
  if(mode==="build") buildBlock(mouseX,mouseY);
});

// optional mobile buttons
["left","right","jump"].forEach(id=>{
  const btn=document.getElementById(id); if(!btn) return;
  let key=id==="left"?"a":id==="right"?"d":"w";
  btn.addEventListener("touchstart",e=>{ e.preventDefault(); keys[key]=true; });
  btn.addEventListener("touchend",e=>{ e.preventDefault(); keys[key]=false; });
});

generateWorld(); spawnPlayer(); gameLoop();
