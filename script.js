const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TILE = 40;
const GRAVITY = 0.5;

let cameraX = 0;

let player = {
  x: 200,
  y: 0,
  w: 30,
  h: 38,
  dx: 0,
  dy: 0,
  onGround: false,
  health: 10,
  hunger: 10
};

let world = {};
let inventory = { dirt:0, grass:0, wood:0 };

function generateWorld() {
  for(let x=-100; x<200; x++){
    let height = 8 + Math.floor(Math.sin(x*0.3)*2);
    for(let y=height; y<20; y++){
      if(y === height)
        world[`${x},${y}`] = "grass";
      else
        world[`${x},${y}`] = "dirt";
    }

    // tree
    if(Math.random() < 0.1){
      let treeHeight = 3 + Math.floor(Math.random()*2);
      for(let t=1; t<=treeHeight; t++){
        world[`${x},${height-t}`] = "wood";
      }
      // leaves
      for(let lx=-2; lx<=2; lx++){
        for(let ly=-2; ly<=0; ly++){
          world[`${x+lx},${height-treeHeight+ly}`] = "leaves";
        }
      }
    }
  }
}
generateWorld();

function drawBlock(type,x,y){
  if(type==="dirt"){
    ctx.fillStyle="#7a4d2b";
    ctx.fillRect(x,y,TILE,TILE);
  }
  if(type==="grass"){
    ctx.fillStyle="#3cb043";
    ctx.fillRect(x,y,TILE,TILE);
    ctx.fillStyle="#7a4d2b";
    ctx.fillRect(x,y+10,TILE,TILE-10);
  }
  if(type==="wood"){
    ctx.fillStyle="#8b5a2b";
    ctx.fillRect(x,y,TILE,TILE);
  }
  if(type==="leaves"){
    ctx.fillStyle="#2e8b57";
    ctx.fillRect(x,y,TILE,TILE);
  }
}

function drawWorld(){
  for(let key in world){
    let [x,y] = key.split(",").map(Number);
    let screenX = x*TILE - cameraX;
    let screenY = y*TILE;
    if(screenX > -TILE && screenX < canvas.width){
      drawBlock(world[key],screenX,screenY);
    }
  }
}

function update(){
  player.dy += GRAVITY;
  player.x += player.dx;
  player.y += player.dy;

  player.onGround = false;

  for(let key in world){
    let [bx,by] = key.split(",").map(Number);
    let blockX = bx*TILE;
    let blockY = by*TILE;

    if(
      player.x < blockX+TILE &&
      player.x+player.w > blockX &&
      player.y < blockY+TILE &&
      player.y+player.h > blockY
    ){
      if(player.dy > 0){
        player.y = blockY - player.h;
        player.dy = 0;
        player.onGround = true;
      }
    }
  }

  cameraX = player.x - canvas.width/2;

  // hunger system
  if(Math.random()<0.002){
    player.hunger--;
    if(player.hunger<=0){
      player.health--;
      player.hunger=0;
    }
  }

  if(player.hunger>0 && player.health<10){
    player.health+=0.01;
  }
}

function drawPlayer(){
  ctx.fillStyle="blue";
  ctx.fillRect(player.x-cameraX,player.y,player.w,player.h);
}

function gameLoop(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawWorld();
  update();
  drawPlayer();
  requestAnimationFrame(gameLoop);
}
gameLoop();

canvas.addEventListener("click",e=>{
  let x = Math.floor((e.clientX+cameraX)/TILE);
  let y = Math.floor(e.clientY/TILE);
  let key = `${x},${y}`;
  if(world[key]){
    inventory[world[key]]++;
    delete world[key];
    updateInventory();
  }
});

function updateInventory(){
  const inv = document.getElementById("inventory");
  inv.innerHTML="";
  for(let item in inventory){
    let div = document.createElement("div");
    div.className="slot";
    div.innerText = item+"\n"+inventory[item];
    inv.appendChild(div);
  }
}
updateInventory();

function updateStatus(){
  const hearts = document.getElementById("hearts");
  const hunger = document.getElementById("hunger");
  hearts.innerHTML="";
  hunger.innerHTML="";

  for(let i=0;i<10;i++){
    let h=document.createElement("div");
    h.className="heart";
    h.style.background=i<player.health?"red":"#333";
    hearts.appendChild(h);

    let f=document.createElement("div");
    f.className="food";
    f.style.background=i<player.hunger?"orange":"#333";
    hunger.appendChild(f);
  }
}
setInterval(updateStatus,200);

document.getElementById("left").ontouchstart=()=>player.dx=-4;
document.getElementById("right").ontouchstart=()=>player.dx=4;
document.getElementById("left").ontouchend=()=>player.dx=0;
document.getElementById("right").ontouchend=()=>player.dx=0;
document.getElementById("jump").ontouchstart=()=>{
  if(player.onGround) player.dy=-10;
};
