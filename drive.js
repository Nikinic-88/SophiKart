let view = 'drive';

const scene = document.querySelector('#scene');
const canvas = document.querySelector('#effects');
const context = canvas.getContext('2d');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const drops = Array.from({length: 155}, () => ({
  x: Math.random(), y: Math.random(), speed: .55 + Math.random() * .9,
  length: 9 + Math.random() * 23
}));
const ripples = Array.from({length: 24}, () => ({
  x: Math.random(), y: .76 + Math.random() * .23, phase: Math.random()
}));
let mode = 'clear';
let frame = 0;
const entrySpeed = 72;
const roadRates = [31, 18]; // km/h per second on dry and wet roads
const recoveryRate = 80;
let velocity = entrySpeed;
let heldInput = null;
const pedal = document.querySelector('#pedal');
const driveSpeed = document.querySelector('#metric');
let travel = 0;
let previous = null;
let width = 0;
let height = 0;
const kart=new Image(); kart.onload=refresh; kart.src='parts/body.webp';
let offroad = false;
const axles = [-108.56, 109.2];
const suspension = axles.map(() => ({height:0, speed:0}));
function ground(x) {
  const u = travel * 320 + x;
  if (!offroad) return 0.8 * Math.sin(u / 48);
  return 9*Math.sin(u/64) + 5*Math.sin(u/25) + 2*Math.sin(u/12);
}
function updateSuspension(dt) {
  const steps = Math.max(1, Math.ceil(dt*120));
  for(let i=0;i<steps;i++) for(let j=0;j<2;j++){
    const spring=suspension[j];
    const acceleration=52*(ground(axles[j])-spring.height)-8*spring.speed;
    spring.speed+=acceleration*dt/steps;
    spring.height+=spring.speed*dt/steps;
  }
}
function drive(t) {
  const w=width,h=height, night=mode==='night', rain=mode!=='clear';
  const sky=context.createLinearGradient(0,0,0,h);
  sky.addColorStop(0,night?'#0c1733':rain?'#455e76':'#6b9ec1');
  sky.addColorStop(1,night?'#716588':rain?'#b0bfca':'#ffcf9d');
  context.fillStyle=sky;context.fillRect(0,0,w,h);
  context.fillStyle=night?'#def0ff':'#ffddad';context.beginPath();context.arc(.76*w,.26*h,.052*h,0,7);context.fill();
  for(let layer=0;layer<3;layer++){
    context.beginPath();context.moveTo(0,h);
    for(let x=0;x<=w+4;x+=4){
      const z=(x+t*(8+layer*12))/(158-layer*27);
      context.lineTo(x,h*(.48+layer*.092+.08*Math.sin(z)+.045*Math.sin(z*2.73)));
    }
    context.lineTo(w,h);context.fillStyle=(night?['#383b56','#282e44','#19263a']:['#838b99','#586d7a','#374e5b'])[layer];context.fill();
  }
    if (night) {
    const mist=context.createLinearGradient(0,h*.40,0,h*.76);
    mist.addColorStop(0,'#28304c00');mist.addColorStop(.76,'#434c68ae');mist.addColorStop(1,'#30384e55');
    context.fillStyle=mist;context.fillRect(0,h*.4,w,h*.36);
  }
  if(!offroad){context.fillStyle=night?'#161b28':'#353e49';context.fillRect(0,h*.74,w,h*.26);
  context.fillStyle='#adb5bc';context.fillRect(0,h*.745,w,2);
  for(let x=-(t*320%160);x<w;x+=160)context.fillRect(x,h*.90,81,3);}
  context.save();const scale=Math.min(w/560,h/340);
  context.translate(w*.53,h*.82);context.scale(scale,scale);
  if(offroad){
    const left=-w*.53/scale, right=w*.47/scale;
    context.beginPath(); context.moveTo(left,h/scale);
    for(let x=left;x<=right+3;x+=3) context.lineTo(x,ground(x));
    context.lineTo(right+3,h/scale);context.closePath();
    context.fillStyle=night?'#453941':rain?'#60493c':'#9d6d48';context.fill();
    const start=Math.floor((left+t*320)/19);
    for(let i=start;i*19-t*320<right;i++){
      const x=i*19-t*320;
      const jitter=Math.abs(Math.sin(i*74.3));
      context.fillStyle=night?'#655354':rain?'#7c6452':'#c2956b';
      context.fillRect(x,ground(x)+4+35*jitter,3+jitter*5,2);
    }
  }
  context.fillStyle='#10162199';context.beginPath();context.ellipse(0,0,174,7,0,0,7);context.fill();
  if(night){const beam=context.createLinearGradient(155,0,345,0);beam.addColorStop(0,'#dcf8ff8a');beam.addColorStop(1,'#d9faff00');context.fillStyle=beam;context.fill(new Path2D('M152 -30 L345 -40 L345 10 Z'))}
    if (rain && velocity > 1) {
    for (const wheel of [109.2, -108.56]) {
      for (let i=0;i<28;i++) {
        const phase=(i/28+t*2)%1;
        const spread=(Math.sin(i*49.8)*.5+.5);
        context.fillStyle='rgba(209,229,239,'+(.52*(1-phase))+')';
        context.beginPath();
        context.arc(wheel-10-phase*(34+46*spread)*velocity/72,ground(wheel)-4-Math.sin(phase*Math.PI)*(5+15*spread),1+phase*2.3,0,7);
        context.fill();
      }
    }
  }
  const kartHeight=365*0.4249737670514166;
  const rear=suspension[0].height, front=suspension[1].height;
  context.save();
  context.translate(0,(rear+front)/2);
  context.rotate(Math.atan2(front-rear,axles[1]-axles[0]));
  if(kart.complete && kart.naturalWidth) context.drawImage(kart,-182,-kartHeight,365,kartHeight);
  context.restore();
  for (const x of axles) {
    const y=ground(x)-37;
    context.save();context.translate(x,y);context.rotate(t*8.65);
    for(const [radius,color] of [[37,'#171c22'],[31,'#242b33'],[18,'#596674'],[14,'#252d36']]){
      context.fillStyle=color;context.beginPath();context.arc(0,0,radius,0,Math.PI*2);context.fill();
    }
    for(let spoke=0;spoke<5;spoke++){
      context.rotate(Math.PI*2/5);context.fillStyle='#99a6b1';context.fillRect(2,-1.5,13,3);
    }
    context.restore();
  }
  context.restore();
}


function paint(time) {
  const delta = previous === null ? 0 : Math.max(0, Math.min(.1,(time - previous) / 1000));
  previous = time;
  const priorSpeed = velocity;
  velocity = heldInput !== null
    ? Math.max(0, velocity - roadRates[mode === 'clear' ? 0 : 1]*delta)
    : Math.min(entrySpeed, velocity + recoveryRate*delta);
  const speedText = Math.round(velocity) + ' km/h';
  if (driveSpeed.textContent !== speedText) driveSpeed.textContent = speedText;
  if (!reducedMotion.matches) {
    travel += delta*(priorSpeed+velocity)/(2*entrySpeed);
    updateSuspension(delta);
  }
  drive(travel);
  if (mode === 'clear') return;
  const seconds = reducedMotion.matches ? 0 : time * .001;
  const night = mode === 'night';
  const wet = context.createLinearGradient(0, height * .73, 0, height);
  wet.addColorStop(0, 'transparent');
  wet.addColorStop(1, night ? '#597fb440' : '#a5c4da36');
  context.fillStyle = wet;
  context.fillRect(0, height * .73, width, height * .27);
  if (night) {
    context.save();
    context.translate(width * .32, height * .74);
    context.scale(1, .24);
    const glow = context.createRadialGradient(0, 0, 0, 0, 0, width * .34);
    glow.addColorStop(0, '#d2ebff85');
    glow.addColorStop(.42, '#9fcfff39');
    glow.addColorStop(1, '#85bfff00');
    context.fillStyle = glow;
    context.fillRect(-width * .34, -width * .34, width * .68, width * .68);
    context.restore();
  }
  context.lineWidth = 1;
  context.strokeStyle = night ? '#c4ddff55' : '#e1efff72';
  context.beginPath();
  for (const drop of drops) {
    const x = ((drop.x - seconds * drop.speed * .12) % 1 + 1) % 1 * width;
    const y = (drop.y + seconds * drop.speed) % 1 * height;
    context.moveTo(x, y);
    context.lineTo(x - drop.length * .27, y + drop.length);
  }
  context.stroke();
  for (const ripple of ripples) {
    const phase = (ripple.phase + seconds * .9) % 1;
    context.strokeStyle = 'rgba(196,224,250,' + (.42 * (1 - phase)) + ')';
    context.beginPath();
    context.ellipse(ripple.x * width, ripple.y * height, 2 + phase * 22, 1 + phase * 4, 0, 0, Math.PI * 2);
    context.stroke();
  }
}
function animate(time) {
  paint(time);
  scheduleDrive();
}
function scheduleDrive() {
  if (!reducedMotion.matches || velocity !== (heldInput === null ? entrySpeed : 0)) {
    frame = requestAnimationFrame(animate);
  }
}
function refresh() {
  cancelAnimationFrame(frame);
  if (view !== 'drive' || !width || !height) return;
  previous = null;
  paint(performance.now());
  scheduleDrive();
}
function holdBrake(input) {
  if (view !== 'drive' || heldInput !== null) return;
  heldInput = input;
  pedal.setAttribute('aria-pressed','true');
  refresh();
}
function releaseBrake() {
  if (heldInput === null) return;
  heldInput = null;
  pedal.setAttribute('aria-pressed','false');
  refresh();
}
pedal.addEventListener('pointerdown', event => {
  if (event.button !== 0 || heldInput !== null) return;
  pedal.setPointerCapture(event.pointerId);
  holdBrake(event.pointerId);
});
for (const type of ['pointerup','pointercancel','lostpointercapture']) {
  pedal.addEventListener(type, event => { if (heldInput === event.pointerId) releaseBrake(); });
}
pedal.addEventListener('keydown', event => {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    if (!event.repeat) holdBrake(event.key);
  }
});
pedal.addEventListener('keyup',event => {
  if (heldInput === event.key) { event.preventDefault(); releaseBrake(); }
});
pedal.addEventListener('blur',releaseBrake);
pedal.addEventListener('contextmenu',event=>event.preventDefault());
window.addEventListener('blur',releaseBrake);
document.addEventListener('visibilitychange',()=>{ if(document.hidden) releaseBrake(); });
new ResizeObserver(() => {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  const density = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(width * density);
  canvas.height = Math.round(height * density);
  context.setTransform(density, 0, 0, density, 0, 0);
  refresh();
}).observe(scene);

