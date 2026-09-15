(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scoreEl = document.getElementById('score');
  const metaEl = document.getElementById('meta');
  const hintEl = document.getElementById('hint');
  const deadEl = document.getElementById('dead');
  const deadTitleEl = document.getElementById('deadTitle');
  const deadSubEl = document.getElementById('deadSub');

  const WORLD = { x: -1300, y: -800, w: 2600, h: 1600 };
  const BASE_SPEED = 235;
  const TURN_RATE = 4.8;
  const PATH_SPACING = 4;
  const BODY_SPACING = 11;
  const HEAD_R = 16;
  const BODY_R = 13;
  const INITIAL_LENGTH = 285;
  const FOOD_COUNT = 52;
  const DEADZONE = 24;
  const SELF_SKIP_DISTANCE = 105;

  let dpr = 1, W = 1, H = 1;
  let lastT = performance.now();
  let time = 0;
  let score = 0;
  let eaten = 0;
  let alive = true;
  let bodyLength = INITIAL_LENGTH;
  let heading = 0;
  let head = { x: 0, y: 0 };
  let steer = null;
  let path = [];
  let body = [];
  let foods = [];
  let camera = { x: 0, y: 0, zoom: 1.04 };
  let pointer = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hypot(x, y) { return Math.hypot(x, y); }
  function dist(a, b) { return Math.hypot(a.x-b.x, a.y-b.y); }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function angleWrap(a){ while(a > Math.PI) a -= Math.PI*2; while(a < -Math.PI) a += Math.PI*2; return a; }
  function worldToScreen(p){ return { x: (p.x-camera.x)*camera.zoom + W/2, y: (p.y-camera.y)*camera.zoom + H/2 }; }

  function reset() {
    score = 0; eaten = 0; time = 0; alive = true; bodyLength = INITIAL_LENGTH;
    heading = 0; head = {x:0,y:0}; steer = null;
    path = [];
    for (let i=0;i<100;i++) path.push({x:-i*PATH_SPACING,y:0});
    body = [];
    camera = {x:0,y:0,zoom:1.04};
    foods = [];
    for(let i=0;i<FOOD_COUNT;i++) spawnFood();
    deadEl.classList.add('hidden');
    hintEl.style.opacity = '1';
  }

  function spawnFood() {
    let p = {x:0,y:0};
    for(let i=0;i<30;i++) {
      p = {
        x: WORLD.x + 70 + Math.random()*(WORLD.w-140),
        y: WORLD.y + 70 + Math.random()*(WORLD.h-140)
      };
      if(dist(p, head)>170) break;
    }
    foods.push({ ...p, rare: Math.random()<0.08, phase: Math.random()*Math.PI*2 });
  }

  function recordPath() {
    if (!path.length) { path.push({...head}); return; }
    if (dist(head,path[0]) >= PATH_SPACING) path.unshift({...head});
    else path[0] = {...head};
    let sum = 0, cut = path.length;
    for(let i=1;i<path.length;i++) {
      sum += dist(path[i-1],path[i]);
      if(sum > bodyLength+180){ cut=i+1; break; }
    }
    if(cut < path.length) path.length = cut;
  }

  function rebuildBody() {
    body = [{...head}];
    let next = BODY_SPACING, walked=0;
    for(let i=1;i<path.length;i++) {
      const a=path[i-1], b=path[i];
      const seg=dist(a,b); if(seg<0.001) continue;
      while(walked+seg >= next && next <= bodyLength) {
        const t=(next-walked)/seg;
        body.push({x:lerp(a.x,b.x,t), y:lerp(a.y,b.y,t)});
        next += BODY_SPACING;
      }
      walked += seg;
      if(walked > bodyLength) break;
    }
  }

  function radiusScale(i){
    if(body.length<=1) return 1;
    const t=i/(body.length-1);
    return lerp(1,0.36,Math.pow(t,1.8));
  }

  function die(reason){
    if(!alive) return;
    alive=false;
    pointer.active=false; steer=null;
    deadTitleEl.textContent=reason;
    deadSubEl.innerHTML=`Score ${score} &nbsp;•&nbsp; Length ${Math.round(bodyLength)}<br>Tap anywhere or press R to restart`;
    deadEl.classList.remove('hidden');
  }

  function update(dt) {
    if(!alive) return;
    time += dt;
    if(steer) {
      const desired=Math.atan2(steer.y,steer.x);
      const da=angleWrap(desired-heading);
      const maxTurn=TURN_RATE*dt;
      heading += clamp(da,-maxTurn,maxTurn);
    }
    head.x += Math.cos(heading)*BASE_SPEED*dt;
    head.y += Math.sin(heading)*BASE_SPEED*dt;
    recordPath(); rebuildBody();

    if(bodyLength>=390) {
      let fromHead=0;
      for(let i=1;i<body.length;i++) {
        fromHead += dist(body[i-1],body[i]);
        if(fromHead < SELF_SKIP_DISTANCE) continue;
        if(dist(head,body[i]) < HEAD_R + BODY_R*radiusScale(i) - 5) { die('SELF COLLISION'); break; }
      }
    }

    const m=HEAD_R;
    if(head.x<WORLD.x+m || head.x>WORLD.x+WORLD.w-m || head.y<WORLD.y+m || head.y>WORLD.y+WORLD.h-m) die('ARENA EDGE');

    for(let i=foods.length-1;i>=0;i--) {
      if(dist(head,foods[i])<=24) {
        foods.splice(i,1); bodyLength+=26; eaten++; score += 10 + Math.floor(eaten/5)*2; spawnFood(); hintEl.style.opacity='0';
      }
    }

    const follow=1-Math.exp(-6.4*dt);
    camera.x=lerp(camera.x,head.x,follow); camera.y=lerp(camera.y,head.y,follow);
    const zTarget=clamp(1.04 - Math.max(0,bodyLength-285)/1900*0.24,0.78,1.04);
    camera.zoom=lerp(camera.zoom,zTarget,1-Math.exp(-2*dt));

    scoreEl.textContent=String(score).padStart(6,'0');
    metaEl.textContent=`LENGTH ${Math.round(bodyLength)}   •   ${time.toFixed(1)}s`;
  }

  function drawGrid() {
    ctx.fillStyle='#071116'; ctx.fillRect(0,0,W,H);
    const p0=worldToScreen({x:WORLD.x,y:WORLD.y});
    const p1=worldToScreen({x:WORLD.x+WORLD.w,y:WORLD.y+WORLD.h});
    ctx.fillStyle='#08141a'; ctx.fillRect(p0.x,p0.y,p1.x-p0.x,p1.y-p0.y);
    ctx.strokeStyle='rgba(40,94,88,.18)'; ctx.lineWidth=1;
    for(let x=Math.ceil(WORLD.x/100)*100;x<=WORLD.x+WORLD.w;x+=100){ const s=worldToScreen({x,y:0}); ctx.beginPath();ctx.moveTo(s.x,p0.y);ctx.lineTo(s.x,p1.y);ctx.stroke(); }
    for(let y=Math.ceil(WORLD.y/100)*100;y<=WORLD.y+WORLD.h;y+=100){ const s=worldToScreen({x:0,y}); ctx.beginPath();ctx.moveTo(p0.x,s.y);ctx.lineTo(p1.x,s.y);ctx.stroke(); }
    ctx.strokeStyle='rgba(52,242,184,.38)'; ctx.lineWidth=4; ctx.strokeRect(p0.x,p0.y,p1.x-p0.x,p1.y-p0.y);
  }

  function drawFoods() {
    for(const f of foods){
      const s=worldToScreen(f); const pulse=1+0.12*Math.sin(time*3+f.phase);
      if(f.rare){
        ctx.fillStyle='rgba(190,116,255,.10)'; ctx.beginPath();ctx.arc(s.x,s.y,15*pulse*camera.zoom,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(210,150,255,.95)'; ctx.beginPath();ctx.arc(s.x,s.y,8*pulse*camera.zoom,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff0ff';ctx.beginPath();ctx.arc(s.x,s.y,2.6*camera.zoom,0,Math.PI*2);ctx.fill();
      } else {
        ctx.fillStyle='rgba(46,246,185,.10)';ctx.beginPath();ctx.arc(s.x,s.y,10*pulse*camera.zoom,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(76,250,190,.88)';ctx.beginPath();ctx.arc(s.x,s.y,5.5*pulse*camera.zoom,0,Math.PI*2);ctx.fill();
      }
    }
  }

  function drawSnake() {
    if(!body.length) return;
    const pts=body.map(worldToScreen);
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
    ctx.strokeStyle='rgba(30,242,190,.12)';ctx.lineWidth=34*camera.zoom;ctx.stroke();
    ctx.strokeStyle='rgba(30,236,185,.42)';ctx.lineWidth=25*camera.zoom;ctx.stroke();
    for(let i=pts.length-1;i>=0;i--){
      const r=BODY_R*radiusScale(i)*camera.zoom;
      const energy=0.72+0.28*(1-i/Math.max(1,pts.length-1));
      ctx.fillStyle=`rgba(24,${Math.round(energy*255)},163,1)`;ctx.beginPath();ctx.arc(pts[i].x,pts[i].y,r,0,Math.PI*2);ctx.fill();
      if(i%3===0){ctx.fillStyle='rgba(110,255,214,.12)';ctx.beginPath();ctx.arc(pts[i].x,pts[i].y,r*.46,0,Math.PI*2);ctx.fill();}
    }
    const h=worldToScreen(head); const r=HEAD_R*camera.zoom;
    ctx.fillStyle='rgba(58,255,204,.24)';ctx.beginPath();ctx.arc(h.x,h.y,r+2*camera.zoom,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#1af0b6';ctx.beginPath();ctx.arc(h.x,h.y,r,0,Math.PI*2);ctx.fill();
    const fx=Math.cos(heading), fy=Math.sin(heading), sx=-fy, sy=fx;
    for(const sign of [-1,1]){
      const ex=h.x+(fx*7+sx*5.2*sign)*camera.zoom, ey=h.y+(fy*7+sy*5.2*sign)*camera.zoom;
      ctx.fillStyle='#051011';ctx.beginPath();ctx.arc(ex,ey,2.8*camera.zoom,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(230,255,248,.9)';ctx.beginPath();ctx.arc(ex+fx*.8*camera.zoom,ey+fy*.8*camera.zoom,1.1*camera.zoom,0,Math.PI*2);ctx.fill();
    }
  }

  function drawJoystick(){
    if(!pointer.active || !alive) return;
    const dx=pointer.x-pointer.ox,dy=pointer.y-pointer.oy,len=hypot(dx,dy)||1,limit=Math.min(62,len);
    const kx=pointer.ox+dx/len*limit, ky=pointer.oy+dy/len*limit;
    ctx.strokeStyle='rgba(150,255,220,.14)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pointer.ox,pointer.oy,44,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(150,255,220,.18)';ctx.beginPath();ctx.arc(kx,ky,14,0,Math.PI*2);ctx.fill();
  }

  function draw(){ drawGrid(); drawFoods(); drawSnake(); drawJoystick(); }

  function frame(t){
    const dt=Math.min((t-lastT)/1000,0.033);lastT=t;update(dt);draw();requestAnimationFrame(frame);
  }

  function pointerDown(e){
    e.preventDefault();
    if(!alive){reset();return;}
    pointer.active=true;pointer.id=e.pointerId;pointer.ox=e.clientX;pointer.oy=e.clientY;pointer.x=e.clientX;pointer.y=e.clientY;steer=null;
    try{ canvas.setPointerCapture(e.pointerId); }catch{}
  }
  function pointerMove(e){
    if(!pointer.active || e.pointerId!==pointer.id || !alive) return;
    e.preventDefault(); pointer.x=e.clientX;pointer.y=e.clientY;
    const dx=pointer.x-pointer.ox,dy=pointer.y-pointer.oy,len=hypot(dx,dy);
    steer=len>=DEADZONE?{x:dx/len,y:dy/len}:null;
  }
  function pointerUp(e){
    if(e.pointerId!==pointer.id)return;pointer.active=false;pointer.id=null;steer=null;
  }

  canvas.addEventListener('pointerdown',pointerDown,{passive:false});
  canvas.addEventListener('pointermove',pointerMove,{passive:false});
  canvas.addEventListener('pointerup',pointerUp,{passive:false});
  canvas.addEventListener('pointercancel',pointerUp,{passive:false});
  deadEl.addEventListener('pointerdown',(e)=>{e.preventDefault();reset();},{passive:false});
  addEventListener('keydown',(e)=>{if(e.key.toLowerCase()==='r')reset();});

  reset(); rebuildBody(); requestAnimationFrame(frame);
})();
