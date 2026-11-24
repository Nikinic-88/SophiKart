const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d');
const stats=document.querySelector('#stats'), message=document.querySelector('#message');
const start=document.querySelector('#start');
const cones=[22,45,68,91,114], finish=136, maxSpeed=16;
const inputs=new Map();
const buttons=[...document.querySelectorAll('[data-input]')];
let ghost=null;
try {
  const saved=JSON.parse(localStorage.getItem('sophikart.slalom.v1'));
  if(saved && Number.isFinite(saved.time) && Array.isArray(saved.points) && saved.points.length>1 &&
     saved.points.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))) ghost=saved;
} catch {}
let x=0,z=0,speed=maxSpeed,time=0,passed=0,clean=true,active=false,last=null,points=[],ghostIndex=0;
function sync(){for(const b of buttons)b.setAttribute('aria-pressed',String([...inputs.values()].includes(b.dataset.input)));}
function clear(){inputs.clear();sync();last=null;}
for(const b of buttons){
  b.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);inputs.set(e.pointerId,b.dataset.input);sync();};
  b.onlostpointercapture=b.onpointerup=b.onpointercancel=e=>{inputs.delete(e.pointerId);sync();};
  b.oncontextmenu=e=>e.preventDefault();
}
const keys={ArrowLeft:'left',ArrowRight:'right',Space:'brake'};
function key(e,on){if(!active||!keys[e.code])return;e.preventDefault();if(on)inputs.set(e.code,keys[e.code]);else inputs.delete(e.code);sync();}
window.onkeydown=e=>key(e,true);window.onkeyup=e=>key(e,false);
window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
start.onclick=()=>{x=z=time=passed=ghostIndex=0;speed=maxSpeed;clean=active=true;points=[[0,0,0]];clear();start.textContent='Restart';message.textContent=ghost?'Race the mint ghost of your best clean run.':'First cone on the left. A clean finish saves your ghost.';canvas.focus();};
function update(dt){
  const held=[...inputs.values()];
  const oldZ=z, oldX=x;
  speed=held.includes('brake')?Math.max(0,speed-11*dt):Math.min(maxSpeed,speed+18*dt);
  x=Math.max(-4.3,Math.min(4.3,x+(Number(held.includes('right'))-Number(held.includes('left')))*Math.min(speed,5)*dt));
  z+=speed*dt;time+=dt;
  if(passed<cones.length && z>=cones[passed]){
    const cross=oldX+(x-oldX)*(cones[passed]-oldZ)/(z-oldZ);
    if(cross*(passed%2?1:-1)<.85){clean=false;message.textContent='Missed cone '+(passed+1)+'. Finish or restart to try again.';}
    passed++;
  }
  if(time-points.at(-1)[0]>=.05 || z>=finish)points.push([time,x,z]);
  if(z>=finish){
    time-=(z-finish)/speed;z=finish;points[points.length-1]=[time,x,z];active=false;clear();
    const best=clean && (!ghost||time<ghost.time);
    message.textContent=best?'New best clean run. Race your ghost on the next run.':clean?'Clean finish. Best time '+ghost.time.toFixed(2)+' s.':'Run finished with a missed cone.';
    if(best){ghost={time,points};try{localStorage.setItem('sophikart.slalom.v1',JSON.stringify(ghost));}catch{}}
    start.textContent='Run again';
  }
}
function car(cx,cy,k,tint,alpha){
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(cx,cy);ctx.scale(k,k);
  ctx.fillStyle='#0d151a';for(const a of [-1,1])for(const b of [-1,1])ctx.fillRect(a*8-2,b*8-4,5,8);
  ctx.fillStyle=tint;ctx.beginPath();ctx.roundRect(-7,-16,14,30,5);ctx.fill();ctx.fillStyle='#e5edf3';ctx.fillRect(-1,-15,3,10);
  ctx.fillStyle='#1e2b36';ctx.fillRect(-4,-2,8,8);ctx.restore();
}
function draw(){
  const w=canvas.clientWidth,h=canvas.clientHeight,d=Math.min(devicePixelRatio,2);
  if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}
  ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle='#20392f';ctx.fillRect(0,0,w,h);
  const sx=Math.min(w/13,48),sy=h/58, mid=w/2, base=h*.78;
  const y=p=>base-(p-z)*sy;
  ctx.fillStyle='#36444c';ctx.fillRect(mid-5.2*sx,0,10.4*sx,h);
  for(let n=Math.floor((z-18)/3);n<(z+52)/3;n++){ctx.fillStyle=n%2?'#d4ddd6':'#cb7762';for(const side of [-1,1])ctx.fillRect(mid+side*5.2*sx-3,y(n*3),6,sy*3+.5);}
  for(const mark of [0,finish]){
    ctx.fillStyle='#c9d7da';ctx.fillRect(mid-5.2*sx,y(mark),10.4*sx,3);
  }
  cones.forEach((p,i)=>{const cy=y(p);ctx.fillStyle='#ed9154';ctx.beginPath();ctx.moveTo(mid,cy-9);ctx.lineTo(mid-7,cy+7);ctx.lineTo(mid+7,cy+7);ctx.fill();ctx.fillStyle='#f1dfca';ctx.fillRect(mid-3,cy,6,2);ctx.fillStyle='#c6ef92';ctx.font='bold 23px system-ui';ctx.textAlign='center';ctx.fillText(i%2?'→':'←',mid+(i%2?1:-1)*sx*1.7,cy+7);});
  if(ghost && active){
    const arr=ghost.points;while(ghostIndex<arr.length-2 && arr[ghostIndex+1][0]<time)ghostIndex++;
    const a=arr[ghostIndex],b=arr[ghostIndex+1],f=Math.min(1,Math.max(0,(time-a[0])/(b[0]-a[0]||1)));
    car(mid+(a[1]+(b[1]-a[1])*f)*sx,y(a[2]+(b[2]-a[2])*f),sx/25,'#b7ffd9',.5);
  }
  car(mid+x*sx,base,sx/25,'#559aff',1);
  stats.textContent=time.toFixed(2)+' s  ·  '+Math.round(speed*3.6)+' km/h  ·  '+passed+'/5 cones';
}
function tick(now){if(active&&last!==null)update(Math.min(.05,(now-last)/1000));last=now;draw();requestAnimationFrame(tick);}
message.textContent=ghost?'Best clean run '+ghost.time.toFixed(2)+' s.':'Finish cleanly to record your first ghost.';
requestAnimationFrame(tick);
