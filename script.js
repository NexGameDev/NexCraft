const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TILE = 40;
const GRAVITY = 0.5;

let cameraX = 0;
let cameraY = 0;

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

/* ================= WORLD GENERATION ================= */

function generateWorld() {
  for(let x=-100; x<300; x++){
    let height = 10 + Math.floor(Math.sin(x*0.2)*3);

    for(let y=height; y<40; y++){
      if(y === height)
        world[`${x},${y}`] = "grass";
      else
        world[`${x},${y}`] = "dirt";
    }

    if(Math.random() < 0.08){
      let treeHeight = 4;

      for(let t=1; t<=treeHeight; t++){
        world[`${x},${height-t}`] = "wood";
      }

      for(let lx=-2; lx<=2; lx++){
        for(let ly=-2; ly<=0; ly++){
          world[`${x+lx},${height-treeHeight+ly}`] = "leaves";
        }
      }
    }
  }
}
generateWorld();

/* ================= TEXTURE CLEAN (ORIGINAL STYLE) ================= */

function drawBlock(type,x,y){

  if(type==="dirt"){
    ctx.fillStyle="#7a4d2b";
    ctx.fillRect(x,y,TILE,TILE);
  }

  if(type==="grass"){
    ctx.fillStyle="#7a4d2b";
    ctx.fillRect(x,y,TILE,TILE);
    ctx.fillStyle="#3cb043";
    ctx.fillRect(x,y,TILE,8);
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

/* ================= DRAW WORLD ================= */

function drawWorld(){
  for(let key in world){
    let [x,y] = key.split(",").map(Number);
    let screenX = x*TILE - cameraX;
    let screenY = y*TILE - cameraY;

    if(screenX > -TILE && screenX < canvas.width &&
       screenY > -TILE && screenY < canvas.height){
      drawBlock(world[key],screenX,screenY);
    }
  }
}

/* ================= UPDATE ================= */

let hungerTimer = 0;

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

  /* ===== CAMERA FOLLOW X & Y ===== */
  cameraX = player.x - canvas.width/2 + player.w/2;
  cameraY = player.y - canvas.height/2 + player.h/2;

  /* ===== HUNGER SLOWER ===== */
  hungerTimer++;
  if(hungerTimer > 300){ // jauh lebih lama
    player.hunger--;
    hungerTimer = 0;
  }

  if(player.hunger <= 0){
    player.hunger = 0;
    if(Math.random() < 0.02) player.health--;
  }

  if(player.hunger > 6 && player.health < 10){
    player.health += 0.01;
  }

  if(player.health < 0) player.health = 0;
}

/* ================= PLAYER ================= */

function drawPlayer(){
  ctx.fillStyle="blue";
  ctx.fillRect(player.x-cameraX, player.y-cameraY, player.w, player.h);
}

/* ================= SKY DAY ================= */

function drawSky(){
  ctx.fillStyle="#87CEEB"; // sky blue
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

/* ================= GAME LOOP ================= */

function gameLoop(){
  drawSky();
  update();
  drawWorld();
  drawPlayer();
  requestAnimationFrame(gameLoop);
}
gameLoop();

/* ================= MINING ================= */

canvas.addEventListener("click",e=>{
  let x = Math.floor((e.clientX+cameraX)/TILE);
  let y = Math.floor((e.clientY+cameraY)/TILE);
  let key = `${x},${y}`;

  if(world[key]){
    inventory[world[key]]++;
    delete world[key];
    updateInventory();
  }
});

/* ================= INVENTORY ================= */

function updateInventory(){
  const inv = document.getElementById("inventory");
  inv.innerHTML="";
  for(let item in inventory){
    let div = document.createElement("div");
    div.className="slot";
    div.innerText=item+"\n"+inventory[item];
    inv.appendChild(div);
  }
}
updateInventory();

/* ================= PIXEL HEART & HUNGER ================= */

function updateStatus(){
  const hearts = document.getElementById("hearts");
  const hunger = document.getElementById("hunger");
  hearts.innerHTML="";
  hunger.innerHTML="";

  for(let i=0;i<10;i++){
    let h=document.createElement("div");
    h.style.width="18px";
    h.style.height="18px";
    h.style.background=i<player.health?
      "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\"><rect width=\"20\" height=\"20\" fill=\"red\"/></svg>')":
      "#222";
    hearts.appendChild(h);

    let f=document.createElement("div");
    f.style.width="18px";
    f.style.height="18px";
    f.style.background=i<player.hunger?
      "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\"><rect width=\"20\" height=\"20\" fill=\"orange\"/></svg>')":
      "#222";
    hunger.appendChild(f);
  }
}
setInterval(updateStatus,200);

/* ================= TOUCH CONTROL ================= */

document.getElementById("left").ontouchstart=()=>player.dx=-4;
document.getElementById("right").ontouchstart=()=>player.dx=4;
document.getElementById("left").ontouchend=()=>player.dx=0;
document.getElementById("right").ontouchend=()=>player.dx=0;
document.getElementById("jump").ontouchstart=()=>{
  if(player.onGround) player.dy=-10;
};
