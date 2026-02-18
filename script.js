const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TILE = 32;
const WORLD_WIDTH = 400;
const WORLD_HEIGHT = 80;
const RENDER_DISTANCE = 30;

let world = [];

const player = {
  x:0, y:0,
  width:24, height:32,
  vx:0, vy:0,
  speed:3,
  jump:-10,
  gravity:0.5,
  grounded:false
};

const camera = { x:0, y:0, smooth:0.1 };

let inventory = { dirt:0, grass:0, wood:0 };
let selectedBlock = "dirt";

const keys = {};
document.addEventListener("keydown", e=>keys[e.key]=true);
document.addEventListener("keyup", e=>keys[e.key]=false);

// MOBILE CONTROL
document.getElementById("left").ontouchstart=()=>keys["a"]=true;
document.getElementById("left").ontouchend=()=>keys["a"]=false;
document.getElementById("right").ontouchstart=()=>keys["d"]=true;
document.getElementById("right").ontouchend=()=>keys["d"]=false;
document.getElementById("jump").ontouchstart=()=>keys["w"]=true;
document.getElementById("jump").ontouchend=()=>keys["w"]=false;

// WORLD GENERATE
function generateWorld(){
  for(let x=0;x<WORLD_WIDTH;x++){
    world[x]=[];
    let ground=40+Math.floor(Math.sin(x*0.15)*5);

    for(let y=0;y<WORLD_HEIGHT;y++){
      if(y>ground) world[x][y]=1;      // dirt
      else if(y===ground) world[x][y]=2; // grass
      else world[x][y]=0;              // air
    }

    // TREE PROCEDURAL
    if(Math.random()<0.1){
      let h=3+Math.floor(Math.random()*3);
      for(let t=1;t<=h;t++){
        world[x][ground-t]=3; // wood
      }
    }
  }
}

function spawnPlayer(){
  for(let y=0;y<WORLD_HEIGHT;y++){
    if(world[20][y]===2){
      player.x=20*TILE;
      player.y=(y-1)*TILE;
      break;
    }
  }
}

// PLAYER UPDATE
function updatePlayer(){
  if(keys["a"]) player.vx=-player.speed;
  else if(keys["d"]) player.vx=player.speed;
  else player.vx=0;

  if(keys["w"] && player.grounded){
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
  let tileX=Math.floor(player.x/TILE);
  let tileY=Math.floor((player.y+player.height)/TILE);

  if(world[tileX] && world[tileX][tileY]>0){
    player.y=tileY*TILE-player.height;
    player.vy=0;
    player.grounded=true;
  }
}

// CAMERA FOLLOW
function updateCamera(){
  const targetX=player.x-canvas.width/2+player.width/2;
  const targetY=player.y-canvas.height/2+player.height/2;

  camera.x+=(targetX-camera.x)*camera.smooth;
  camera.y+=(targetY-camera.y)*camera.smooth;
}

// DRAW BLOCK
function drawBlock(type,x,y){
  if(type===1){
    ctx.fillStyle="#8B4513";
    ctx.fillRect(x,y,TILE,TILE);
  }
  if(type===2){
    ctx.fillStyle="#7cfc00";
    ctx.fillRect(x,y,TILE,TILE);
    ctx.fillStyle="#8B4513";
    ctx.fillRect(x,y+TILE-6,TILE,6);
  }
  if(type===3){
    ctx.fillStyle="#A0522D";
    ctx.fillRect(x,y,TILE,TILE);
  }
}

// CHUNK RENDER SYSTEM
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

// DRAW PLAYER
function drawPlayer(){
  ctx.fillStyle="#ffcc99";
  ctx.fillRect(player.x,player.y,player.width,player.height-12);
  ctx.fillStyle="#0000ff";
  ctx.fillRect(player.x,player.y+20,player.width,12);
}

// MINING SYSTEM
canvas.addEventListener("click",mineBlock);
canvas.addEventListener("touchstart",e=>{
  const touch=e.touches[0];
  mineBlock(touch);
});

function mineBlock(e){
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left+camera.x;
  const my=e.clientY-rect.top+camera.y;

  const tx=Math.floor(mx/TILE);
  const ty=Math.floor(my/TILE);

  if(!world[tx]) return;

  if(world[tx][ty]>0){
    if(world[tx][ty]===1) inventory.dirt++;
    if(world[tx][ty]===2) inventory.grass++;
    if(world[tx][ty]===3) inventory.wood++;
    world[tx][ty]=0;
  }

  updateInventory();
}

// INVENTORY UI
function updateInventory(){
  const inv=document.getElementById("inventory");
  inv.innerHTML="";
  for(let item in inventory){
    const slot=document.createElement("div");
    slot.className="slot";
    slot.innerHTML=item+"<br>"+inventory[item];
    slot.onclick=()=>selectedBlock=item;
    inv.appendChild(slot);
  }
}

// LOOP
function gameLoop(){
  ctx.fillStyle="#87CEEB";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  updatePlayer();
  updateCamera();

  ctx.save();
  ctx.translate(-camera.x,-camera.y);

  drawWorld();
  drawPlayer();

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

generateWorld();
spawnPlayer();
updateInventory();
gameLoop();
