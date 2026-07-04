(() => {
  const startScreen = document.getElementById('startScreen');
  const tapLayer = document.getElementById('tapLayer');
  const music = document.getElementById('music');
  const roo = document.getElementById('roo');
  const objectsEl = document.getElementById('objects');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const cueEl = document.getElementById('cue');
  const powerFill = document.getElementById('powerFill');
  const message = document.getElementById('message');

  const GROUND_Y = 0;
  const state = { running:false, over:false, score:0, coins:0, y:0, vy:0, charging:false, chargeStart:0, power:0, last:0, speed:255, spawnTimer:0, coinTimer:0, cueTimer:0, objects:[] };
  const gravity = 1850;
  const lowJump = 720;
  const highJump = 980;

  function isTouchEvent(e){ return e.type.startsWith('touch'); }
  function point(e){ const t = isTouchEvent(e) ? e.changedTouches[0] : e; return {x:t.clientX, y:t.clientY}; }
  function prevent(e){ e.preventDefault(); e.stopPropagation(); }

  async function startGame(e){
    prevent(e);
    if(state.running) return;
    startScreen.classList.add('hidden');
    state.running = true;
    state.last = performance.now();
    try { music.currentTime = 0; await music.play(); } catch(err) { showMessage('Audio blockiert - Game läuft'); setTimeout(()=>message.classList.remove('show'),1200); }
    requestAnimationFrame(loop);
  }

  function press(e){
    prevent(e);
    if(!state.running || state.over || state.y > 4) return;
    state.charging = true;
    state.chargeStart = performance.now();
    state.power = 0;
  }
  function release(e){
    prevent(e);
    if(!state.running || state.over || !state.charging) return;
    const held = Math.min(520, performance.now() - state.chargeStart);
    const p = Math.max(.22, held / 520);
    jump(p);
    state.charging = false;
    state.power = 0;
    powerFill.style.width = '0%';
  }
  function jump(power){
    if(state.y > 4) return;
    const v = lowJump + (highJump - lowJump) * power;
    state.vy = v;
    roo.classList.remove('jump'); void roo.offsetWidth; roo.classList.add('jump');
  }
  function showMessage(txt){ message.textContent = txt; message.classList.add('show'); }

  function spawnObstacle(){
    const high = Math.random() < .42;
    const el = document.createElement('div');
    el.className = 'obj obstacle ' + (high ? 'high' : 'low');
    objectsEl.appendChild(el);
    state.objects.push({type:'obstacle', high, x:innerWidth + 40, y:0, w:high?48:42, h:high?92:44, el});
    cueEl.textContent = high ? 'HOLD JUMP' : 'JUMP';
    cueEl.classList.add('show');
    state.cueTimer = .7;
  }
  function spawnCoin(){
    const el = document.createElement('div');
    el.className = 'obj coin';
    objectsEl.appendChild(el);
    const lane = Math.random();
    const y = lane < .45 ? 82 : (lane < .8 ? 138 : 190);
    state.objects.push({type:'coin', x:innerWidth + 40, y, w:34, h:34, el});
  }
  function rects(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
  function rooRect(){
    const vw = innerWidth;
    const x = vw * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rooX')) || 18) / 100 + 18;
    return {x, y:innerHeight - (innerHeight*.19) - state.y - 108, w:54, h:100};
  }
  function objRect(o){
    const groundTop = innerHeight - innerHeight*.19;
    return {x:o.x, y:groundTop - o.y - o.h, w:o.w, h:o.h};
  }
  function updateObjects(dt){
    state.spawnTimer -= dt; state.coinTimer -= dt; state.cueTimer -= dt;
    if(state.spawnTimer <= 0){ spawnObstacle(); state.spawnTimer = 1.25 + Math.random()*1.05; }
    if(state.coinTimer <= 0){ spawnCoin(); state.coinTimer = .85 + Math.random()*1.05; }
    if(state.cueTimer <= 0) cueEl.classList.remove('show');

    const r = rooRect();
    for(let i=state.objects.length-1;i>=0;i--){
      const o = state.objects[i];
      o.x -= state.speed * dt;
      o.el.style.transform = `translate3d(${o.x}px, ${-o.y}px, 0)`;
      if(rects(r,objRect(o))){
        if(o.type === 'coin'){
          state.score += 10; state.coins += 1; scoreEl.textContent = state.score; coinsEl.textContent = state.coins;
          o.el.classList.add('hit'); setTimeout(()=>o.el.remove(),230); state.objects.splice(i,1); continue;
        } else {
          gameOver(); return;
        }
      }
      if(o.x < -90){ o.el.remove(); state.objects.splice(i,1); }
    }
  }
  function gameOver(){
    state.over = true; state.running = false; music.pause(); roo.classList.add('dance');
    showMessage('Groove over! Tap zum Neustart');
  }
  function restart(e){
    prevent(e);
    if(!state.over) return;
    state.over = false; state.running = false; state.score=0; state.coins=0; state.y=0; state.vy=0; state.objects.forEach(o=>o.el.remove()); state.objects=[];
    scoreEl.textContent='0'; coinsEl.textContent='0'; message.classList.remove('show'); roo.classList.remove('dance'); startGame(e);
  }
  function loop(now){
    if(!state.running) return;
    const dt = Math.min(.033, (now - state.last)/1000); state.last = now;
    if(state.charging){ state.power = Math.min(1, (now - state.chargeStart)/520); powerFill.style.width = `${state.power*100}%`; }
    state.vy -= gravity * dt; state.y += state.vy * dt;
    if(state.y <= GROUND_Y){ state.y = GROUND_Y; state.vy = 0; }
    roo.style.transform = `translateY(${-state.y}px)`;
    updateObjects(dt);
    requestAnimationFrame(loop);
  }

  ['touchend','pointerup','click'].forEach(ev => startScreen.addEventListener(ev,startGame,{passive:false}));
  ['touchstart','pointerdown','mousedown'].forEach(ev => tapLayer.addEventListener(ev,press,{passive:false}));
  ['touchend','pointerup','mouseup','touchcancel','pointercancel'].forEach(ev => tapLayer.addEventListener(ev,(e)=> state.over ? restart(e) : release(e),{passive:false}));
  document.addEventListener('gesturestart', prevent, {passive:false});
})();
