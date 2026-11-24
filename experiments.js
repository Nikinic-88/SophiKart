const stage = document.querySelector('.stage');
const title = document.querySelector('#title');
const subtitle = document.querySelector('#subtitle');
const action = document.querySelector('#action');
const exit = document.querySelector('#exit');
const metric = document.querySelector('#metric');
const metricLabel = document.querySelector('#metric-label');
const statusLine = document.querySelector('#status');
const modelNote = document.querySelector('#model-note');
const comparison = document.querySelector('#comparison');
const corner = document.querySelector('#corner');
const lanes = [...comparison.querySelectorAll('.lane')];

let replayFrame = 0;
let elapsed = 0;
let finished = false;
let lastTime = null;

const brakeDuration = entrySpeed / roadRates[1];
function brakingSample(rate, time) {
  const t = Math.min(time, entrySpeed / rate);
  return { speed: Math.max(0, entrySpeed - rate*t), distance: (entrySpeed*t - rate*t*t/2)/3.6 };
}
const dryStop = brakingSample(roadRates[0], brakeDuration).distance;
const wetStop = brakingSample(roadRates[1], brakeDuration).distance;
const stopGap = wetStop - dryStop;

const parts = {};
for (const name of Object.keys(partBounds)) {
  const img = new Image();
  img.onload = () => { if (view === 'bump') drawBump(); };
  img.src = 'parts/' + name + '.webp';
  parts[name] = img;
}

function drawingSurface(canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w*ratio) || canvas.height !== Math.round(h*ratio)) {
    canvas.width = Math.round(w*ratio); canvas.height = Math.round(h*ratio);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return {ctx, w, h};
}
function line(ctx, x1, y1, x2, y2, color, weight = 1) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
}
function dot(ctx, x, y, r, color) {
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
}
function miniKart(ctx, nose, road, size, distance) {
  const scale = size/365;
  ctx.save(); ctx.translate(nose - .5*size, road); ctx.scale(scale,scale);
  if (kart.naturalWidth) ctx.drawImage(kart,-182,-155,365,155);
  for (const axle of axles) {
    ctx.save(); ctx.translate(axle,-37);
    dot(ctx,0,0,37,'#10181d'); dot(ctx,0,0,22,'#53636c');
    ctx.rotate(distance/.16); line(ctx,-16,0,16,0,'#a9b8c0',5); line(ctx,0,-16,0,16,'#a9b8c0',5);
    ctx.restore();
  }
  ctx.restore();
}
function drawLane(lane, idx) {
  const {ctx,w,h} = drawingSurface(lane.querySelector('canvas'));
  if (!w || !h) return;
  const sample = brakingSample(roadRates[idx], elapsed);
  const size = Math.min(w*.15, h*.83, 104);
  const start = size+10, end = w-20;
  const px = metres => start + (end-start)*metres/44;
  const road = h*.65;
  ctx.fillStyle = idx ? '#2a404e' : '#35484c'; ctx.fillRect(0,0,w,road);
  ctx.fillStyle = idx ? '#1c2c39' : '#25323a'; ctx.fillRect(0,road,w,h-road);
  if (idx) {
    ctx.strokeStyle = '#99bdd433'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i=0;i<56;i++) {
      const x=(i*79.3+elapsed*36)%w, y=(i*17.1+elapsed*76)%road;
      ctx.moveTo(x,y);ctx.lineTo(x-3,y+8);
    }
    ctx.stroke();
  }
  line(ctx,0,road,w,road,'#a7bbc3',1.3);
  ctx.font = '12px system-ui'; ctx.fillStyle='#c7d6de';ctx.textAlign='center';
  const axisY = Math.min(h-4, road+18);
  for (let m=0;m<=40;m+=10) {
    line(ctx,px(m),road,px(m),road+5,'#acc1c8');
    if (!finished || idx===0) ctx.fillText(m+' m',px(m),axisY);
  }
  line(ctx,start,road-10,start,road+6,'#f8fbfb',2);
  const nose=px(sample.distance);
  line(ctx,start,road+2,nose,road+2,idx?'#86c9f0':'#c5e99b',3);
  miniKart(ctx,nose,road,size,sample.distance);
  if (sample.speed === 0) line(ctx,nose,road-14,nose,road+6,idx?'#86c9f0':'#c5e99b',2);
  if (idx && finished) {
    const a=px(dryStop), b=px(wetStop), y=road+10;
    ctx.strokeStyle='#c9ed9b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(a,y-4);ctx.lineTo(a,y);ctx.lineTo(b,y);ctx.lineTo(b,y-4);ctx.stroke();
    ctx.fillStyle='#d7f0b7';ctx.fillText('+'+stopGap.toFixed(1)+' m',(a+b)/2,Math.min(h-3,y+14));
  }
  lane.querySelector('.lane-info span').textContent = sample.distance.toFixed(1)+' m  ·  '+Math.round(sample.speed)+' km/h';
}
function drawRoad() {
  lanes.forEach(drawLane);
  metricLabel.textContent = finished ? 'Extra distance in rain' : 'Time since braking';
  metric.textContent = finished ? '+'+stopGap.toFixed(1)+' m' : elapsed.toFixed(1)+' s';
}

// Millimetres in the side projection of the rear assembly.
const pivot = {x:38, y:42};
const hub = {x:427, y:112};
const upper = {x:176, y:-143};
const lower = {x:334, y:42};
const tireRadius = 160;
const restAngle = Math.atan2(hub.y-pivot.y,hub.x-pivot.x);
const armLength = Math.hypot(hub.y-pivot.y,hub.x-pivot.x);
const bumpHeight = 50, bumpRun = 480, testSpeed = 600, slowFactor = .25;
const bumpDuration = 2.8;
const sampleHz = 240;
function bumpProfile(x) {
  if (Math.abs(x) >= bumpRun/2) return 0;
  return bumpHeight*.5*(1+Math.cos(x*Math.PI*2/bumpRun));
}
function bumpCenter(t) { return 980-testSpeed*t; }
function hubLift(t, x) {
  // Lowest wheel centre that clears the rounded bump, including tire radius.
  let lift = 0;
  for (let dx=-tireRadius;dx<=tireRadius;dx+=4) {
    const envelope = Math.sqrt(tireRadius*tireRadius-dx*dx)-tireRadius;
    lift = Math.max(lift,bumpProfile(x+dx-bumpCenter(t))+envelope);
  }
  return lift;
}
function armAngle(lift, body) {
  return Math.asin(Math.max(-1,Math.min(1,(hub.y-pivot.y-lift+body)/armLength)));
}
function sampleBump() {
  const samples = [];
  let body=0, bodySpeed=0, wheelX=hub.x;
  for (let n=0;n<=Math.ceil(bumpDuration*sampleHz);n++) {
    const t=n/sampleHz;
    let lift=hubLift(t,wheelX);
    let angle=armAngle(lift,body);
    wheelX=pivot.x+Math.cos(angle)*armLength;
    lift=hubLift(t,wheelX);
    angle=armAngle(lift,body);
    samples.push({body,lift,angle, wheelX:pivot.x+Math.cos(angle)*armLength});
    // Illustrative sprung chassis driven by the road-following wheel.
    bodySpeed += (52*(lift-body)-8*bodySpeed)/sampleHz;
    body += bodySpeed/sampleHz;
  }
  return samples;
}
const bumpSamples = sampleBump();
function paintPart(ctx,name) {
  if (parts[name].naturalWidth) ctx.drawImage(parts[name],...partBounds[name]);
}
function drawBump() {
  const {ctx,w,h} = drawingSurface(corner.querySelector('canvas'));
  if (!w || !h) return;
  const state=bumpSamples[Math.min(bumpSamples.length-1,Math.round(elapsed*sampleHz))];
  const {body,lift,wheelX} = state;
  const angle=state.angle-restAngle;
  const scale=Math.min(w/730,h/568);
  ctx.fillStyle='#1c2a32'; ctx.fillRect(0,0,w,h);
  ctx.save(); ctx.translate(w*.50-252*scale,h*.51-40*scale);ctx.scale(scale,scale);
  const left=252-w*.5/scale, right=252+w*.5/scale;
  const roadY=hub.y+tireRadius;
  ctx.beginPath();ctx.moveTo(left,roadY+500);
  for(let x=left;x<=right+4;x+=3) ctx.lineTo(x,roadY-bumpProfile(x-bumpCenter(elapsed)));
  ctx.lineTo(right+4,roadY+500);ctx.closePath();ctx.fillStyle='#675341';ctx.fill();
  ctx.beginPath();
  for(let x=left;x<=right+4;x+=3) ctx.lineTo(x,roadY-bumpProfile(x-bumpCenter(elapsed)));
  ctx.strokeStyle='#d6aa78';ctx.lineWidth=3/scale;ctx.stroke();
  ctx.save();ctx.translate(0,-body);paintPart(ctx,'frame');
  ctx.save();ctx.translate(pivot.x,pivot.y);ctx.rotate(angle);ctx.translate(-pivot.x,-pivot.y);paintPart(ctx,'arm');ctx.restore();
  const lx=lower.x-pivot.x, ly=lower.y-pivot.y;
  const mountX=pivot.x+lx*Math.cos(angle)-ly*Math.sin(angle);
  const mountY=pivot.y+lx*Math.sin(angle)+ly*Math.cos(angle);
  const a0=Math.atan2(lower.y-upper.y,lower.x-upper.x);
  const a1=Math.atan2(mountY-upper.y,mountX-upper.x);
  const lengthRatio=Math.hypot(mountY-upper.y,mountX-upper.x)/Math.hypot(lower.y-upper.y,lower.x-upper.x);
  ctx.save();ctx.translate(upper.x,upper.y);ctx.rotate(a1);ctx.scale(lengthRatio,1);ctx.rotate(-a0);ctx.translate(-upper.x,-upper.y);paintPart(ctx,'damper');ctx.restore();
  dot(ctx,pivot.x,pivot.y,6,'#c6ef92');ctx.restore();
  ctx.save();ctx.translate(wheelX,hub.y-lift);ctx.rotate(elapsed*testSpeed/tireRadius);ctx.translate(-hub.x,-hub.y);
  ctx.globalAlpha=.52;paintPart(ctx,'wheel');ctx.globalAlpha=1;
  // A translucent tire face leaves the STEP swingarm and hub visible.
  ctx.strokeStyle='#24343fe6';ctx.lineWidth=18;ctx.beginPath();
  ctx.arc(hub.x,hub.y,tireRadius-10,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#b4c6d363';ctx.lineWidth=2;ctx.beginPath();
  ctx.arc(hub.x,hub.y,tireRadius*.52,0,Math.PI*2);ctx.stroke();
  line(ctx,hub.x,hub.y-tireRadius+4,hub.x,hub.y-tireRadius+16,'#c0d5dc',4);
  ctx.restore();
  dot(ctx,wheelX,hub.y-lift,10,'#adc1cc');dot(ctx,wheelX,hub.y-lift,5,'#394854');
  const lxTag=upper.x+80, tagY=upper.y-body-35;
  line(ctx,lxTag,tagY+6/scale,upper.x+22,upper.y-body+28,'#ebb669',1/scale);
  ctx.fillStyle='#ffdb9d';ctx.font= '600 '+(13/scale)+'px system-ui';ctx.fillText('Damper',lxTag,tagY);
  ctx.restore();
  metricLabel.textContent = 'Wheel rise';
  metric.textContent = Math.round(lift)+' mm';
}

function experimentLimit() { return view === 'brake' ? brakeDuration : bumpDuration; }
function displayFrame() {
  if (view === 'brake') drawRoad();
  if (view === 'bump') drawBump();
}
function complete() {
  elapsed=experimentLimit(); finished=true; action.textContent='Replay';
  statusLine.textContent = view === 'brake'
    ? 'Dry '+dryStop.toFixed(1)+' m · Wet '+wetStop.toFixed(1)+' m'
    : 'Bump cleared · Chassis settled';
  displayFrame();
}
function step(now) {
  if (lastTime !== null) elapsed += Math.min(.1,(now-lastTime)/1000)*(view === 'bump' ? slowFactor : 1);
  lastTime=now;
  if (elapsed>=experimentLimit()) { complete(); return; }
  displayFrame();replayFrame=requestAnimationFrame(step);
}
function summary() {
  const weatherName={clear:'Clear',rain:'Rain',night:'Night rain'}[mode];
  return (offroad?'Off-road':'Road')+' · '+weatherName;
}
function showDrive() {
  cancelAnimationFrame(replayFrame);view='drive';stage.dataset.view=view;
  pedal.hidden=false;action.classList.remove('primary');
  scene.hidden=false;comparison.hidden=true;corner.hidden=true;exit.hidden=true;
  document.querySelector('.weather').hidden=false;
  title.textContent=offroad?'Trail drive':'SophiKart';
  subtitle.textContent=offroad?'Inspect the rear wheel over a single bump.':'Dry and wet braking from the same starting line.';
  action.textContent=offroad?'Run bump test':'Compare stops';
  metricLabel.textContent='Drive speed';metric.textContent=Math.round(velocity)+' km/h';
  statusLine.textContent=summary();
  modelNote.textContent=offroad?'STEP assembly · Illustrative dynamics':'Illustrative braking model';
  refresh();
}
function startExperiment() {
  releaseBrake();pedal.hidden=true;action.classList.add('primary');
  cancelAnimationFrame(frame); cancelAnimationFrame(replayFrame);
  view=offroad?'bump':'brake';stage.dataset.view=view;
  elapsed=0;lastTime=null;finished=false;
  scene.hidden=true;comparison.hidden=offroad;corner.hidden=!offroad;exit.hidden=false;
  document.querySelector('.weather').hidden=true;
  title.textContent=offroad?'Rear suspension':'Braking distance';
  subtitle.textContent=offroad?'Rear wheel and swingarm · 50 mm bump · ¼ speed':'Two runs from 72 km/h · Same braking line';
  action.textContent='Restart';
  statusLine.textContent=offroad?'Single bump · Cutaway wheel':'Braking on dry and wet pavement';
  modelNote.textContent=offroad?'CAD geometry · Illustrative dynamics':'Simulation estimate';
  if (reducedMotion.matches) {staticReplay();return;}
  displayFrame();replayFrame=requestAnimationFrame(step);
}
function staticReplay() {
  if (view === 'bump' && elapsed < .9) {
    elapsed=(980-hub.x)/testSpeed;
    statusLine.textContent='Wheel at the crest · Still frame';
    action.textContent='Show finish';displayFrame();
  } else complete();
}
action.onclick=()=>{
  if(view==='bump' && reducedMotion.matches && !finished) staticReplay();
  else startExperiment();
};
exit.onclick=()=>{showDrive();action.focus();};
for (const button of document.querySelectorAll('[data-terrain]')) {
  button.onclick=()=>{
    offroad=button.dataset.terrain==='trail';
    for (const option of document.querySelectorAll('[data-terrain]')) option.setAttribute('aria-pressed',String(option===button));
    showDrive();
  };
}
for (const button of document.querySelectorAll('button[data-mode]')) {
  button.onclick=()=>{
    mode=button.dataset.mode;scene.dataset.mode=mode;
    for(const option of document.querySelectorAll('button[data-mode]')) option.setAttribute('aria-pressed',String(option===button));
    showDrive();
  };
}
new ResizeObserver(displayFrame).observe(stage);
reducedMotion.addEventListener('change',()=>{
  if(view==='drive') refresh();
  else if(reducedMotion.matches){cancelAnimationFrame(replayFrame);staticReplay();}
});
showDrive();

