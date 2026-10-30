'use strict';
// THE MUNCHIES(TM) — Side Scroller Stage 1: Storage District (demo v1). Plain canvas, no build step.
const C=document.getElementById('c'),X=C.getContext('2d'),W=1280,H=720,GY=640,STAGE_END=6600,ARENA=5300;
const IMG=id=>document.getElementById('i_'+id);
const STORES=[...Array(12)].map((_,i)=>document.getElementById('s'+(i+1)));
function fit(){const s=Math.min(innerWidth/W,innerHeight/H);C.style.width=W*s+'px';C.style.height=H*s+'px'}
addEventListener('resize',fit);fit();
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>v<a?a:v>b?b:v;
// ---------- MOVES (costs scale with powers-sheet ratings: cost = round(rating*3.5)) ----------
const cost=r=>Math.round(r*3.5);
const CHARS={
 mac:{name:'MAC & CHEESE',img:'mac',col:'#FFD700',col2:'#F2A900',speed:4.2,hp:120,
  moves:[
   {id:'shield',name:'Mac-Shield',r:9,m:[2,5,2],b:'s',desc:'Hold SPECIAL to keep the golden shield up (drains meter)'},
   {id:'cable',name:'Cheddar Cable',r:8,m:[2,3,6],b:'p',desc:'Cheese-cable grapple: yanks foes in, knocks birds off perch'},
   {id:'melt',name:'Melt Trap',r:7,m:[2,1,4],b:'k',desc:'Molten cheese snare on the ground'},
   {id:'claw',name:'Cheddar Claw',r:8,m:[4,6],b:'p',desc:'Dashing cheddar claw slash'}]},
 fryguy:{name:'FRY-GUY',img:'fryguy',col:'#F5A308',col2:'#EB2507',speed:4.8,hp:105,
  moves:[
   {id:'fries',name:'French Fry Projectiles',r:9,m:[2,3,6],b:'p',desc:'Volley of golden fries'},
   {id:'sizzle',name:'Sizzling Strike',r:8,m:[4,6],b:'k',desc:'Searing strike — STUNS'},
   {id:'oil',name:'Oil Slick Trap',r:7,m:[2,1,4],b:'k',desc:'Oil puddle — foes slip and are STUNNED'},
   {id:'leap',name:'Super Leap',r:8,m:[2],b:'j',desc:'Huge leap that slams down'},
   {id:'crispy',name:'Crispy Shield',r:7,m:[2,5,2],b:'s',desc:'Hold SPECIAL: crispy armor shield'},
   {id:'flash',name:'Flash Fry Burst',r:6,m:[2,5,2],b:'k',desc:'Blinding steam burst — STUNS all nearby'}]}
};
for(const c in CHARS)for(const m of CHARS[c].moves)m.cost=cost(m.r);
// ---------- INPUT ----------
const keys={},pressed={};
addEventListener('keydown',e=>{if(!keys[e.code])pressed[e.code]=1;keys[e.code]=1;lastKbd=1;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault()});
addEventListener('keyup',e=>{keys[e.code]=0});
let lastKbd=0;
const KB=[{u:['KeyW'],d:['KeyS'],l:['KeyA'],r:['KeyD'],p:['KeyF'],k:['KeyG'],s:['KeyH'],j:['Space'],lab:{p:'F',k:'G',s:'H',j:'SPACE',dir:'WASD'}},
 {u:['ArrowUp'],d:['ArrowDown'],l:['ArrowLeft'],r:['ArrowRight'],p:['Numpad1','Comma'],k:['Numpad2','Period'],s:['Numpad3','Slash'],j:['Numpad0','ShiftRight'],lab:{p:', / Num1',k:'. / Num2',s:'/ / Num3',j:'R-SHIFT / Num0',dir:'ARROWS'}}];
const PADLAB={xbox:{p:'X',k:'B',s:'Y',j:'A',st:'START'},ps:{p:'□',k:'○',s:'△',j:'✕',st:'OPTIONS'}};
function padType(g){return g&&/054c|playstation|dualshock|dualsense|wireless controller/i.test(g.id)?'ps':'xbox'}
const touch={l:0,r:0,u:0,d:0,p:0,k:0,s:0,j:0,power:null,active:false};
function pads(){return navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[]}
class Input{constructor(i){this.i=i;this.cur={};this.prev={};this.hist=[];this.dev='kbd';this.lastDir=5}
 poll(face){const k=KB[this.i],c={};const any=a=>a.some(x=>keys[x]);
  for(const b of ['u','d','l','r','p','k','s','j'])c[b]=any(k[b])||(mode==1&&this.i==0&&any(KB[1][b]));
  if(Object.values(c).some(v=>v))this.dev='kbd';
  const g=pads()[this.i];
  if(g){const ax=g.axes[0]||0,ay=g.axes[1]||0,B=n=>g.buttons[n]&&g.buttons[n].pressed;
   const gc={l:ax<-.45||B(14),r:ax>.45||B(15),u:ay<-.55||B(12),d:ay>.55||B(13),p:B(2),k:B(1),s:B(3),j:B(0),st:B(9)};
   if(Object.values(gc).some(v=>v))this.dev=padType(g);
   for(const b in gc)c[b]=c[b]||gc[b];}
  if(this.i==0&&touch.active){for(const b of ['l','r','u','d','p','k','s','j'])c[b]=c[b]||touch[b];if(Object.keys(touch).some(b=>b.length==1&&touch[b]))this.dev='touch'}
  this.prev=this.cur;this.cur=c;
  const dx=(c.r?1:0)-(c.l?1:0),dy=(c.u?1:0)-(c.d?1:0),fx=dx*(face||1);
  const dir=5+fx+(dy>0?3:dy<0?-3:0);
  if(dir!=this.lastDir){this.hist.push({d:dir,t:now});this.lastDir=dir;if(this.hist.length>16)this.hist.shift()}}
 hit(b){return this.cur[b]&&!this.prev[b]}
 motion(seq){// match seq in order within 450ms window (diagonals accept neighbours)
  const h=this.hist.filter(e=>now-e.t<450);let j=seq.length-1;
  if(seq.length==1)return this.lastDir==seq[0]||h.some(e=>e.d==seq[0]&&now-e.t<250);
  for(let i=h.length-1;i>=0&&j>=0;i--){if(h[i].d==seq[j]||(seq[j]!=5&&near(h[i].d,seq[j])&&j>0&&j<seq.length-1))j--}
  return j<0}}
function near(a,b){return a==b}
// ---------- STATE ----------
let now=0,frame=0,state='select',mode=1,paused=false,pauseSel=0,shake=0,camX=0,camLock=null,flashT=0;
let players=[],enemies=[],civs=[],breaks=[],shots=[],traps=[],parts=[],texts=[],boss=null,birds=[],waves=[],wave=-1,score=0,rescued=0,stageT=0,checkmate=false,banner=null,endT=0;
const inputs=[new Input(0),new Input(1)];
const sel={pick:['mac','fryguy'],ready:[false,false]};
const CIVS=['msnugget','cheesepuff','cupcake','corndog','grapesoda'];
function reset(){players=[];for(let i=0;i<mode;i++){const ch=CHARS[sel.pick[i]];players.push({i,ch,id:sel.pick[i],x:180+i*90,y:0,vx:0,vy:0,face:1,hp:ch.hp,sp:60,atk:null,hurt:0,stun:0,inv:60,combo:0,comboT:0,shield:false,dead:false,squash:1,tilt:0,score:0,airAtk:false,slam:false})}
 enemies=[];civs=[];shots=[];traps=[];parts=[];texts=[];boss=null;birds=[];score=0;rescued=0;stageT=0;checkmate=false;banner={t:180,txt:'STAGE 1 — STORAGE DISTRICT',sub:'Primary Junction • Night'};camX=0;camLock=null;wave=-1;
 breaks=[[760,'crate'],[1750,'dumpster'],[2950,'fridge'],[3950,'crate'],[4850,'dumpster']].map((b,i)=>({isBreak:1,r:70,x:b[0],type:b[1],hp:b[1]=='fridge'?45:30,civ:CIVS[i],broken:false,shakeT:0}));
 waves=[{x:1050,n:3},{x:2300,n:4},{x:3500,n:5},{x:4500,n:6}].map(w=>({...w,done:false}));
 for(let i=0;i<6;i++)civs.push({img:CIVS[i%5],x:300+i*170,y:0,vx:rnd(3,5.5)*(Math.random()<.5?-1:1),panic:true,free:false,t:rnd(0,9)})}
// ---------- HELPERS ----------
function pop(x,y,txt,col,size){texts.push({x,y,txt,col:col||'#fff',size:size||28,t:50})}
function burst(x,y,col,n,sp,size,life){for(let i=0;i<n;i++){const a=rnd(0,6.28),v=rnd(.3,1)*(sp||6);parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,life:life||rnd(20,40),max:life||40,col,size:size||rnd(2,6),g:.15})}}
function ring(x,y,col,max,life){parts.push({ring:1,x,y,r:10,max:max||200,col,life:life||30,maxl:life||30})}
function gain(p,v){p.sp=clamp(p.sp+v,0,100)}
function alivePlayers(){return players.filter(p=>!p.dead)}
function nearestP(x){let b=null,bd=1e9;for(const p of alivePlayers()){const d=Math.abs(p.x-x);if(d<bd){bd=d;b=p}}return b}
// ---------- PLAYER ----------
function startMove(p,m){if(p.sp<m.cost){pop(p.x,-200,'NEED '+m.cost+' SP','#888',20);return false}
 p.sp-=m.cost;p.score+=0;const f=p.face,c=p.ch;
 pop(p.x,-210,m.name.toUpperCase()+'!',c.col,26);
 switch(m.id){
  case 'shield':case 'crispy':p.shield=true;p.shieldT=40;ring(p.x,-90,m.id=='shield'?'#FFC300':'#F5A308',120,20);break;
  case 'cable':p.atk={t:0,pose:'swing',len:34,hitAt:10,range:420,dmg:14,kind:'cable',w:420};break;
  case 'melt':p.poseT=18;p.poseN='punch';traps.push({x:p.x+f*110,type:'melt',t:600,owner:p});burst(p.x+f*110,GY-4,'#FFB000',30,5);break;
  case 'claw':p.vx=f*16;p.atk={t:0,pose:'claw',len:24,hitAt:6,range:150,dmg:26,kind:'melee',w:150,col:'#FFD700'};break;
  case 'fries':for(let i=0;i<5;i++)shots.push({x:p.x+f*60,y:-95+rnd(-22,22),vx:f*(14+i*1.2),vy:rnd(-.4,.4),dmg:9,owner:p,col:'#F5A308',kind:'fry',life:70,delay:i*5});p.atk={pose:'fries',t:0,len:22,hitAt:99};break;
  case 'sizzle':p.vx=f*12;p.atk={t:0,pose:'sizzle',len:26,hitAt:8,range:150,dmg:22,kind:'melee',stun:110,w:150,col:'#CE5D06'};burst(p.x,-90,'#CE5D06',25,7);break;
  case 'oil':p.poseT=18;p.poseN='kick';traps.push({x:p.x+f*120,type:'oil',t:600,owner:p});burst(p.x+f*120,GY-4,'#3a2a05',20,4);break;
  case 'leap':p.vy=-24;p.y=-1;p.slam=true;p.squash=.6;burst(p.x,GY,'#F5A308',20,6);break;
  case 'flash':p.poseT=20;p.poseN=p.id=='fryguy'?'sizzle':'punch';flashT=14;ring(p.x,-90,'#ffffff',420,30);ring(p.x,-90,'#F5A308',300,24);for(const e of hittables())if(Math.abs(e.x-p.x)<420)dealHit(e,6,p,'blast',{stun:150});break;}
 return true}
function hittables(){const l=[...enemies,...breaks.filter(b=>!b.broken)];if(boss&&boss.hp>0)l.push(boss);for(const b of birds)if(!b.perched&&b.hp>0)l.push(b);return l}
function updatePlayer(p,inp){
 if(p.dead)return;
 inp.poll(p.face);const c=inp.cur;
 if(p.inv>0)p.inv--;if(p.comboT>0)p.comboT--;else p.combo=0;
 p.squash+=(1-p.squash)*.2;p.tilt*=.85;
 const onG=p.y>=0;
 if(p.stun>0){p.stun--;p.vx*=.8;}
 else if(p.hurt>0){p.hurt--;}
 else{
  // powers via command input (checked before basic attacks)
  let used=false;
  const tp=inp.i==0&&touch.power;if(tp){const m=p.ch.moves.find(m=>m.id==tp);touch.power=null;if(m)used=startMove(p,m)||true}
  if(!used&&!p.atk)for(const b of ['p','k','s','j']){if(!inp.hit(b))continue;
   const ms=p.ch.moves.filter(m=>m.b==b).sort((a,c2)=>c2.m.length-a.m.length);
   for(const m of ms){if(inp.motion(m.m)){used=true;startMove(p,m);inp.hist=[];break}}
   if(used)break}
  if(p.shield){if(!c.s&&p.shieldT<=0)p.shield=false;p.shieldT--;p.sp-=.18;if(p.sp<=0){p.sp=0;p.shield=false;pop(p.x,-200,'SHIELD DOWN','#999',22)}}
  if(!used&&!p.atk&&!p.shield){
   if(inp.hit('p')){p.combo=(p.combo%3)+1;p.comboT=28;p.atk={pose:'punch',t:0,len:p.combo==3?20:13,hitAt:p.combo==3?8:5,range:120,dmg:p.combo==3?12:6,kind:'melee',w:120,kb:p.combo==3?9:3,col:p.ch.col};p.vx+=p.face*2;p.tilt=p.face*.08}
   else if(inp.hit('k')){p.atk={pose:'kick',t:0,len:18,hitAt:8,range:140,dmg:9,kind:'melee',w:140,kb:7,col:p.ch.col2};p.tilt=-p.face*.1}
   else if(inp.hit('j')&&onG){p.vy=-17;p.squash=.75}}
  const dx=(c.r?1:0)-(c.l?1:0);
  if(!p.atk||!onG){if(dx){p.vx+=(dx*p.ch.speed-p.vx)*.35;p.face=dx}else p.vx*=.7}else p.vx*=.82;
 }
 // physics
 p.x+=p.vx;p.vy+=1;p.y+=p.vy;
 if(p.y>=0){if(p.vy>8){p.squash=1.25;burst(p.x,GY,'#9ff',8,3)}
  if(p.slam){p.slam=false;shake=14;ring(p.x,-10,'#F5A308',260,26);for(const e of hittables())if(Math.abs(e.x-p.x)<240)dealHit(e,24,p,'blast',{kb:10})}
  p.y=0;p.vy=0}
 const lo=camX+40,hi=camX+W-40;p.x=clamp(p.x,lo,hi);
 if(p.atk){const a=p.atk;a.t++;
  if(a.t==a.hitAt){if(a.kind=='cable'){shots.push({cable:1,x:p.x,y:-110,owner:p,face:p.face,len:0,max:a.range,t:0,dmg:a.dmg})}
   else{const tx=p.x+p.face*a.w*.6;burst(tx,-100+rnd(-10,10),a.col||'#fff',6,4,3,14);
    for(const e of hittables()){const top=e.fly?e.y-60:-260;if(Math.abs(e.x-tx)<a.w*.6+(e.r||40)&&(!e.fly||e.y>-260+(p.y)))dealHit(e,a.dmg,p,'melee',{kb:a.kb,stun:a.stun})}}}
  if(a.t>=a.len)p.atk=null}
 gain(p,.025);
}
function hurtPlayer(p,d,src,opts){if(p.dead||p.inv>0)return;opts=opts||{};
 if(p.shield){d*=.1;p.sp-=opts.drain?0:4;ring(p.x,-90,p.id=='mac'?'#FFC300':'#F5A308',90,12)}
 p.hp-=d;p.hurt=12;p.inv=opts.drain?0:20;shake=Math.max(shake,opts.drain?2:6);
 if(!opts.drain){p.vx=(p.x<(src?src.x:p.x)?-1:1)*7;burst(p.x,-100,'#ff3355',10,5);p.squash=.85}
 if(opts.stun&&!p.shield)p.stun=opts.stun;
 if(p.hp<=0){p.hp=0;p.dead=true;burst(p.x,-90,p.ch.col,60,9);pop(p.x,-220,'K.O.!','#f33',40);
  if(!alivePlayers().length){state='gameover';endT=0}}}
// ---------- HITS ----------
function dealHit(e,d,p,kind,o){o=o||{};
 if(e.isBreak){e.hp-=d;e.shakeT=10;burst(e.x,-60,'#ccc',8,5);if(e.hp<=0)breakIt(e,p);return}
 if(e.isBoss){return hitBoss(d,p,kind,o)}
 if(e.isBird){e.hp-=d;e.flashT=6;burst(e.x,e.y,'#96991A',10,5);if(p){p.score+=d*5;gain(p,3)}if(e.hp<=0){e.gone=true;pop(e.x,e.y-60,e.name.toUpperCase()+' RETREATS!','#A7AE56',30);burst(e.x,e.y,'#53831C',50,9)}return}
 e.hp-=d;e.flashT=6;e.hurt=10;e.vx=(e.x<(p?p.x:e.x)?-1:1)*(o.kb||4);if(o.stun)e.stun=o.stun;
 burst(e.x,-110,'#7dff4a',10,5);pop(e.x,-200,''+Math.round(d),'#fff',22);
 if(p){p.score+=d*10;gain(p,2.5)}shake=Math.max(shake,3);
 if(e.hp<=0){e.dead=true;burst(e.x,-90,'#39FF14',40,8);if(p)p.score+=300}}
function breakIt(b,p){b.broken=true;shake=10;burst(b.x,-60,b.type=='fridge'?'#e8f4ff':b.type=='crate'?'#c98a4a':'#3fbf5f',45,9);
 const c={img:b.civ,x:b.x,y:-10,vy:-12,vx:4,free:true,t:0,cheer:70};civs.push(c);rescued++;
 for(const q of players){q.score+=250;gain(q,15)}if(p)p.score+=500;
 pop(b.x,-230,'CIVILIAN RESCUED! +500','#7FDBFF',30)}
// ---------- ENEMIES ----------
function spawnKale(x){enemies.push({x,y:0,vx:0,hp:40,face:-1,cool:rnd(30,90),atk:0,hurt:0,stun:0,snare:0,flashT:0,r:40,bob:rnd(0,6)})}
function updateEnemies(){
 for(const e of enemies){e.bob+=.1;if(e.flashT>0)e.flashT--;
  for(const t of traps)if(Math.abs(t.x-e.x)<70){if(t.type=='melt'&&!e.snare){e.snare=200;pop(e.x,-200,'SNARED!','#FFB000',22)}if(t.type=='oil'&&!e.stun){e.stun=130;pop(e.x,-200,'SLIP!','#CE5D06',22)}}
  if(e.snare>0)e.snare--;
  if(e.stun>0){e.stun--;e.vx*=.8;e.x+=e.vx;continue}
  if(e.hurt>0){e.hurt--;e.x+=e.vx;e.vx*=.85;continue}
  const p=nearestP(e.x);if(!p)continue;const dx=p.x-e.x;e.face=Math.sign(dx)||1;
  if(e.atk>0){e.atk--;if(e.atk==8&&Math.abs(dx)<130&&Math.abs(p.y)<80)hurtPlayer(p,9,e);continue}
  e.cool--;
  if(Math.abs(dx)>120){if(!e.snare)e.vx=e.face*2.1;else e.vx=0;
   if(e.cool<=0&&Math.abs(dx)>300&&Math.abs(dx)<800){e.cool=rnd(100,170);shots.push({x:e.x+e.face*50,y:-110,vx:e.face*9,vy:0,dmg:8,enemy:1,col:'#39FF14',life:120});burst(e.x+e.face*55,-110,'#39FF14',8,3)}}
  else{e.vx=0;if(e.cool<=0){e.atk=24;e.cool=rnd(60,100)}}
  for(const o of enemies)if(o!==e&&Math.abs(o.x-e.x)<60)e.x+=Math.sign(e.x-o.x)*.8;
  e.x+=e.vx}
 enemies=enemies.filter(e=>!e.dead)}
// ---------- BOSS: Count Calorie + Stem & Stalk ----------
function spawnBoss(){boss={isBoss:1,x:ARENA+980,y:0,hp:520,max:520,face:-1,snare:0,stun:0,flashT:0,wisp:200,r:60,t:0};
 birds=[{isBird:1,name:'stalk',side:-1,perched:true,hp:70,x:0,y:0,vx:0,vy:0,st:'perch',t:0,fly:1,r:50,flashT:0},
        {isBird:1,name:'stem',side:1,perched:true,hp:60,x:0,y:0,vx:0,vy:0,st:'perch',t:0,fly:1,r:45,flashT:0}];
 banner={t:200,txt:'COUNT CALORIE',sub:'with STEM & STALK — knock them off his shoulders!'};shriekCool=600}
let shriekCool=600;
function hitBoss(d,p,kind,o){const b=boss;const perched=birds.filter(x=>x.perched&&!x.gone);
 if(perched.length){
  if(kind=='proj'||kind=='cable'||kind=='trap'){const bird=perched.find(x=>x.side*b.face>0)||perched[0];
   bird.perched=false;bird.st='fall';bird.vy=-6;bird.vx=(bird.side)*4;bird.t=0;pop(bird.x,bird.y-80,bird.name.toUpperCase()+' KNOCKED OFF!','#A7AE56',30);shake=10;b.hp-=d*.5;if(p){p.score+=800;gain(p,10)}return}
  if(p&&(p.x-b.x)*b.face>-30){// in the birds' 270° field of view → counter
   const bird=perched[0];ring(bird.x,bird.y,bird.name=='stem'?'#96991A':'#A7AE56',120,16);pop(b.x,-300,'COUNTERED!','#ff4444',30);hurtPlayer(p,10,b);p.vx=(p.x<b.x?-1:1)*12;return}}
 b.hp-=d;b.flashT=6;if(o.stun){b.stun=Math.max(b.stun,o.stun);pop(b.x,-310,'STUNNED!','#CE5D06',26)}
 burst(b.x,-150,'#B3B650',10,6);pop(b.x,-260,''+Math.round(d),'#fff',24);if(p){p.score+=d*12;gain(p,2.5)}
 if(b.snare>0&&b.stun>0&&!checkmate){checkmate=true;b.hp=0;banner={t:240,txt:'CHECKMATE!',sub:'Melt Trap + Stun locks Count Calorie down'};for(const q of players)q.score+=5000}
 if(b.hp<=0){b.hp=0;defeatBoss()}}
function defeatBoss(){if(state!='play')return;state='clear';endT=0;shake=20;burst(boss.x,-150,'#B3B650',120,12);for(const b of birds)b.gone=true}
function updateBoss(){const b=boss;if(!b||b.hp<=0)return;b.t++;if(b.flashT>0)b.flashT--;
 for(const t of traps)if(Math.abs(t.x-b.x)<90){if(t.type=='melt'&&b.snare<=0){b.snare=240;pop(b.x,-320,'MELT-TRAPPED!','#FFB000',28)}if(t.type=='oil'&&b.stun<=0){b.stun=120;pop(b.x,-320,'SLIPPED — STUNNED!','#CE5D06',26)}}
 if(b.snare>0)b.snare--;if(b.stun>0)b.stun--;
 if(b.snare>0&&b.stun>0&&!checkmate){checkmate=true;banner={t:240,txt:'CHECKMATE!',sub:'Melt Trap + Stun locks Count Calorie down'};for(const q of players)q.score+=5000;b.hp=0;defeatBoss();return}
 const p=nearestP(b.x);
 if(p&&b.stun<=0){const dx=p.x-b.x;b.face=Math.sign(dx)||1;
  b.moving=b.snare<=0&&Math.abs(dx)>80;if(b.moving)b.x+=b.face*1.2;
  if(Math.abs(dx)<110&&p.y>-120){// contact drain
   hurtPlayer(p,.35,b,{drain:1});b.drainT=10;if(p.shield){p.sp-=.6}gain(p,-.15);
   if(frame%3==0)parts.push({x:p.x,y:-100+rnd(-30,30),vx:(b.x-p.x)/25,vy:rnd(-1,1),life:25,max:25,col:'#B3B650',size:5,g:0})}
  if(--b.wisp<=0){b.wisp=rnd(170,240);b.atkT=24;for(let i=-1;i<=1;i++)shots.push({x:b.x+b.face*60,y:-200,vx:b.face*6,vy:i*1.2,dmg:10,enemy:1,col:'#B3B650',life:150,home:p,wisp:1})}}
 b.x=clamp(b.x,ARENA+80,ARENA+W-80);
 // birds
 const free=birds.filter(x=>!x.perched&&!x.gone);
 for(const r of birds){if(r.gone){r.y-=4;r.x+=r.side*6;continue}if(r.flashT>0)r.flashT--;r.t++;
  if(r.perched){r.x=b.x-r.side*62*b.face;/* per char sheets: Stem (side 1, glowing RIGHT eye) on Count's RIGHT shoulder, Stalk (side -1, glowing LEFT eye) on his LEFT; Count faces viewer 3/4, so his right = viewer-left when face=1; seeing eyes face outward */r.y=-300+Math.sin(frame*.08+r.side)*3;continue}
  const tp=nearestP(r.x)||{x:b.x,y:0};
  if(r.st=='fall'){r.vy+=.6;r.x+=r.vx;r.y+=r.vy;if(r.y>-60){r.st='hover';r.t=0}}
  else if(r.st=='hover'){const hx=tp.x+(r.name=='stem'?-220:220),hy=r.name=='stem'?-380:-320;r.x+=(hx-r.x)*.04;r.y+=(hy-r.y)*.05;
   if(r.t>(r.name=='stem'?70:110)){r.t=0;if(r.name=='stem'){r.st='swoop';r.tx=tp.x;r.vx=(tp.x-r.x)/22;r.vy=(-90-r.y)/22}else{r.st=Math.random()<.5?'peck':'dive';r.tx=tp.x;r.vx=(tp.x-r.x)/30;r.vy=r.st=='peck'?(-110-r.y)/30:4}}}
  else if(r.st=='swoop'||r.st=='peck'){r.x+=r.vx;r.y+=r.vy;if(r.t%2==0)parts.push({x:r.x,y:r.y,vx:0,vy:0,life:14,max:14,col:r.name=='stem'?'#53831C':'#A7AE56',size:8,g:0});
   for(const q of alivePlayers())if(Math.abs(q.x-r.x)<70&&Math.abs((q.y-100)-r.y)<90){hurtPlayer(q,r.name=='stem'?12:10,r);pop(q.x,-220,r.name=='stem'?'RENDING TALON!':'PIERCING BEAK!','#96991A',22)}
   if(r.t>(r.st=='swoop'?44:32)){r.st='hover';r.t=0}}
  else if(r.st=='dive'){if(r.t<25){r.x+=(r.tx-r.x)*.1;r.y+=(-420-r.y)*.1}else{r.vy+=2.2;r.y+=r.vy;if(r.y>=-40){r.y=-40;shake=16;ring(r.x,-10,'#A7AE56',300,26);pop(r.x,-200,'GROUND SLAM!','#A7AE56',28);for(const q of alivePlayers())if(Math.abs(q.x-r.x)<230&&q.y>-40)hurtPlayer(q,14,r,{stun:30});r.st='hover';r.t=0;r.vy=0}}}
  else if(r.st=='shriek'){r.x+=(r.hx-r.x)*.05;r.y+=(-360-r.y)*.05;if(r.t%10==0)ring(r.x,r.y,r.name=='stem'?'#96991A':'#A7AE56',380,30);if(r.t>80){r.st='hover';r.t=0}}
  r.x=clamp(r.x,ARENA+40,ARENA+W-40)}
 if(free.length==2&&--shriekCool<=0){shriekCool=720;banner={t:90,txt:'DOUBLE SHRIEK!',sub:'Shield up or get out of range!'};
  free.forEach((r,i)=>{r.st='shriek';r.t=0;r.hx=ARENA+300+i*680});
  setTimeout(()=>{for(const q of alivePlayers())if(!q.shield)hurtPlayer(q,8,null,{stun:110})},700)}}
// ---------- SHOTS / TRAPS / CIVS ----------
function updateShots(){
 for(const s of shots){
  if(s.cable){s.t++;const p=s.owner;s.len=Math.min(s.max,s.len+40);s.x=p.x;
   if(!s.hitDone){const tip=p.x+s.face*s.len;for(const e of hittables()){if(Math.abs(e.x-tip)<(e.r||40)+20&&(!e.isBird)){s.hitDone=true;dealHit(e,s.dmg,p,'cable',{});if(!e.isBreak&&!e.isBoss){e.x+=(p.x+s.face*120-e.x)*.7;e.stun=40}break}}}
   if(s.t>14)s.dead=true;continue}
  if(s.delay>0){s.delay--;continue}
  if(s.home&&s.home.hp>0){s.vy+=Math.sign((s.home.y-100)-s.y)*.08;s.vx+=Math.sign(s.home.x-s.x)*.05}
  s.x+=s.vx;s.y+=s.vy;s.life--;if(frame%2==0)parts.push({x:s.x,y:s.y,vx:-s.vx*.1,vy:0,life:10,max:10,col:s.col,size:s.wisp?7:4,g:0});
  if(s.enemy){for(const p of alivePlayers())if(Math.abs(p.x-s.x)<40&&s.y>p.y-180&&s.y<p.y){hurtPlayer(p,s.dmg,s);s.dead=true}}
  else{for(const e of hittables()){const ey=e.fly?e.y:-100;if(Math.abs(e.x-s.x)<(e.r||40)&&Math.abs(ey-s.y)<(e.fly?70:140)){dealHit(e,s.dmg,s.owner,'proj',{kb:3});burst(s.x,s.y,s.col,6,4);s.dead=true;break}}}
  if(s.life<=0||s.x<camX-100||s.x>camX+W+100)s.dead=true}
 shots=shots.filter(s=>!s.dead);
 for(const t of traps){t.t--;if(frame%6==0)parts.push({x:t.x+rnd(-60,60),y:-4,vx:0,vy:-rnd(.5,1.5),life:30,max:30,col:t.type=='melt'?'#FFB000':'#CE5D06',size:4,g:-.02})}
 traps=traps.filter(t=>t.t>0)}
function updateCivs(){
 for(const c of civs){c.t+=.25;
  if(c.free){c.vy=(c.vy||0)+1;c.y+=c.vy;if(c.y>0){c.y=0;c.vy=0}if(c.cheer>0){c.cheer--;if(c.cheer==40)pop(c.x,-150,'THANK YOU!','#7FDBFF',22)}else{c.x+=6;}}
  else{const e=enemies.find(e=>Math.abs(e.x-c.x)<400);if(e)c.vx=Math.sign(c.x-e.x)*Math.abs(c.vx||4);c.x+=c.vx;}
  if(c.x<camX-200||c.x>camX+W+200)c.gone=true}
 civs=civs.filter(c=>!c.gone);
 if(frame%420==0&&state=='play'&&camX<ARENA-600)civs.push({img:CIVS[(frame/420|0)%5],x:camX+W+80,y:0,vx:-rnd(4,6),panic:true,t:0})}
// ---------- MAIN UPDATE ----------
function update(){frame++;stageT++;
 players.forEach((p,i)=>updatePlayer(p,inputs[i]));
 updateEnemies();updateBoss();updateShots();updateCivs();
 for(const b of breaks)if(b.shakeT>0)b.shakeT--;
 // waves & camera
 const ap=alivePlayers(),lead=ap.length?Math.max(...ap.map(p=>p.x)):camX+300,avg=ap.length?ap.reduce((a,p)=>a+p.x,0)/ap.length:camX+400;
 for(const w of waves){if(!w.done&&!w.on&&lead>w.x){w.on=true;camLock=camX;for(let i=0;i<w.n;i++)spawnKale(camX+W+80+i*140*(i%2?1:-1)*.0+i*120-(i%3==2?W+300:0));banner={t:80,txt:'KALE SOLDIERS!',sub:'We don\'t think. We detoxify.'}}
  if(w.on&&!w.done&&!enemies.length){w.done=true;camLock=null;banner={t:70,txt:'GO ▶',sub:''};for(const p of players)gain(p,10)}}
 if(!boss&&lead>ARENA+300){spawnBoss();camLock=ARENA}
 let target=avg-W*.42;if(camLock!==null)target=camLock;else{const minP=ap.length?Math.min(...ap.map(p=>p.x)):0;target=Math.min(target,minP-60)}
 target=clamp(target,0,ARENA);if(target>camX||camLock!==null)camX+=(target-camX)*.12;
 for(const q of parts){q.life--;if(!q.ring){q.x+=q.vx;q.y+=q.vy;q.vy+=q.g||0}else q.r+=(q.max-q.r)*.15}
 parts=parts.filter(q=>q.life>0);if(parts.length>900)parts.splice(0,parts.length-900);
 for(const t of texts){t.t--;t.y-=1.2}texts=texts.filter(t=>t.t>0);
 if(banner&&--banner.t<=0)banner=null;if(shake>0)shake*=.85;if(shake<.5)shake=0;if(flashT>0)flashT--;
 // 2P revive: downed partner gets back up after 6s while the other lives
 for(const p of players)if(p.dead&&alivePlayers().length){p.rev=(p.rev||0)+1;if(p.rev>360){p.dead=false;p.rev=0;p.hp=p.ch.hp*.5;p.inv=120;p.x=camX+200;p.y=-300;pop(p.x,-260,'BACK IN!','#0ff',30)}}}
// ---------- DRAW ----------
function glowText(t,x,y,size,col,blur,align){X.save();X.font=size+'px Impact,"Arial Black",sans-serif';X.textAlign=align||'center';X.textBaseline='middle';X.shadowColor=col;X.shadowBlur=blur||14;X.fillStyle=col;X.fillText(t,x,y);X.shadowBlur=0;X.fillStyle='#fff';X.globalAlpha=.85;X.fillText(t,x,y);X.restore()}
function sprite(img,x,y,h,face,o){o=o||{};if(!img||!img.complete||!img.naturalWidth)return;const w=img.naturalWidth*h/img.naturalHeight;
 X.save();X.translate(x,y);X.rotate(o.rot||0);X.scale((face<0?-1:1)*(o.sx||1),o.sy||1);X.globalAlpha=o.alpha==null?1:o.alpha;
 if(o.flash)X.filter='brightness(1.9)';else if(o.tint)X.filter=o.tint;
 X.drawImage(img,-w/2,-h,w,h);X.restore()}
const _AI={};function AIMG(n){return _AI[n]||(_AI[n]=Object.assign(new Image(),{src:'art/anim/'+n}))}
if(typeof ANIM!=='undefined')for(const c in ANIM)for(const p in ANIM[c])for(const f of ANIM[c][p])AIMG(f[0]);
// draw an animation frame: ch/pose from ANIM, t = time counter, fps = frames per image, base = px height of a standard frame
function anim(ch,pose,t,spd,x,y,h,face,o){const set=ANIM[ch]&&(ANIM[ch][pose]||ANIM[ch].idle||ANIM[ch].fly||ANIM[ch].run);if(!set)return false;
 const f=set[Math.floor(t/spd)%set.length],img=AIMG(f[0]);if(!img.complete||!img.naturalWidth)return false;o=o||{};
 const hh=h*img.naturalHeight/400,w=img.naturalWidth*hh/img.naturalHeight,ax=f[1]*w;
 X.save();X.translate(x,y);X.rotate(o.rot||0);X.scale((face<0?-1:1)*(o.sx||1),o.sy||1);X.globalAlpha=o.alpha==null?1:o.alpha;
 if(o.flash)X.filter='brightness(1.9)';else if(o.tint)X.filter=o.tint;X.drawImage(img,-ax,-hh,w,hh);X.restore();return true}
function shadow(x,w){X.save();X.fillStyle='rgba(0,0,0,.45)';X.beginPath();X.ellipse(x,GY+4,w,10,0,0,6.28);X.fill();X.restore()}
const NEON=['#ff2fd0','#00f0ff','#ffe600','#39ff14','#ff6a00','#b14cff'];
function drawBG(){
 const g=X.createLinearGradient(0,0,0,H);g.addColorStop(0,'#05001a');g.addColorStop(.55,'#1a0638');g.addColorStop(1,'#000');X.fillStyle=g;X.fillRect(0,0,W,H);
 for(let i=0;i<70;i++){const sx=((i*397)%W-camX*.02+W*5)%W,sy=(i*131)%300;X.fillStyle='rgba(255,255,255,'+(.3+.5*Math.abs(Math.sin(frame*.02+i)))+')';X.fillRect(sx,sy,2,2)}
 // FAR: Storage District skyline panels (parallax .15), darkened
 const sd=[IMG('sd_left'),IMG('sd_center'),IMG('sd_right')],off=camX*.15;
 X.save();X.globalAlpha=.55;for(let i=-1;i<6;i++){const x=i*1280-off%1280;const im=sd[((i+Math.floor(off/1280))%3+3)%3];if(im.complete)X.drawImage(im,x,-40,1280,720)}X.restore();
 X.fillStyle='rgba(10,0,40,.35)';X.fillRect(0,0,W,H);
 // SNACK CITY SPIRE — featured, very slow parallax
 const sp=IMG('spire');if(sp.complete){const sx=700-camX*.04;X.save();X.shadowColor='#00e5ff';X.shadowBlur=40;X.globalAlpha=.95;
  X.drawImage(sp,sx-60,10,520,520*sp.naturalHeight/sp.naturalWidth);X.restore();
  X.save();X.globalCompositeOperation='lighter';const gl=X.createRadialGradient(sx+190,90,10,sx+190,90,260);gl.addColorStop(0,'rgba(0,229,255,'+(.25+.1*Math.sin(frame*.05))+')');gl.addColorStop(1,'rgba(0,0,0,0)');X.fillStyle=gl;X.fillRect(sx-100,-100,600,500);X.restore();
  }
 // MID: Food Brands storefront row (parallax .45) with neon frames
 const so=camX*.45,SW=300,SH=190;
 for(let i=Math.floor(so/SW)-1;i<Math.floor(so/SW)+6;i++){const x=i*SW-so,im=STORES[((i%12)+12)%12],y=GY-SH-120;
  X.fillStyle='#0a0618';X.fillRect(x,y-14,SW,SH+120);
  if(im.complete){X.drawImage(im,x+12,y,SW-24,SH)}
  const col=NEON[((i%6)+6)%6],fl=(Math.sin(frame*.07+i*1.7)>-.92)?1:.25;
  X.save();X.globalAlpha=fl;X.strokeStyle=col;X.lineWidth=4;X.shadowColor=col;X.shadowBlur=22;X.strokeRect(x+10,y-2,SW-20,SH+4);X.restore();
  X.fillStyle='rgba(0,0,20,.38)';X.fillRect(x+12,y,SW-24,SH)}
 // NEAR: street — wet neon asphalt
 const sg=X.createLinearGradient(0,GY-120,0,H);sg.addColorStop(0,'#14112a');sg.addColorStop(.4,'#0b0a18');sg.addColorStop(1,'#030308');X.fillStyle=sg;X.fillRect(0,GY-120,W,H);
 X.save();X.globalAlpha=.22;X.scale(1,-.35);X.translate(0,-(GY-120)*2/.35*.35);X.restore();
 for(let i=0;i<14;i++){const x=((i*170-camX)%2380+2380)%2380-200;X.fillStyle=NEON[i%6];X.globalAlpha=.12;X.fillRect(x,GY-110,60,230);X.globalAlpha=1}
 X.strokeStyle='#ff2fd0';X.shadowColor='#ff2fd0';X.shadowBlur=18;X.lineWidth=3;X.beginPath();X.moveTo(0,GY-118);X.lineTo(W,GY-118);X.stroke();X.shadowBlur=0;
 for(let i=0;i<10;i++){const x=((i*260-camX)%2600+2600)%2600-130;X.fillStyle='#ffe600';X.globalAlpha=.6;X.fillRect(x,GY+44,110,6);X.globalAlpha=1}
 if(camX>ARENA-1300&&camX<ARENA-150){const ax=ARENA-camX;X.save();X.globalAlpha=.9;glowText('▼ STORAGE YARD 7 ▼',ax+640,GY-150,30,'#B3B650',20);X.restore()}}
function drawBreak(b){if(b.broken){X.fillStyle='#222';X.fillRect(b.x-60,GY-12,120,12);return}
 const sx=b.shakeT?rnd(-4,4):0,x=b.x+sx;shadow(b.x,70);
 X.save();X.shadowBlur=14;
 if(b.type=='dumpster'){X.fillStyle='#1f5f3a';X.shadowColor='#39ff14';X.fillRect(x-80,GY-110,160,110);X.fillStyle='#164a2c';X.fillRect(x-86,GY-122,172,16);X.shadowBlur=0;X.fillStyle='#39ff14';X.font='14px Impact';X.textAlign='center';X.fillText('SNACK CITY SANITATION',x,GY-55)}
 else if(b.type=='crate'){X.fillStyle='#8a5a2b';X.shadowColor='#ffb000';X.fillRect(x-60,GY-120,120,120);X.shadowBlur=0;X.strokeStyle='#5a3a1a';X.lineWidth=8;X.strokeRect(x-56,GY-116,112,112);X.beginPath();X.moveTo(x-56,GY-116);X.lineTo(x+56,GY-4);X.stroke();X.fillStyle='#ffb000';X.font='13px Impact';X.textAlign='center';X.fillText('FRAGILE • PANTRY',x,GY-60)}
 else{X.fillStyle='#dfe8f2';X.shadowColor='#00f0ff';X.fillRect(x-55,GY-200,110,200);X.shadowBlur=0;X.fillStyle='#9aa';X.fillRect(x-55,GY-130,110,4);X.fillRect(x+36,GY-185,6,40);X.fillRect(x+36,GY-115,6,60)}
 X.restore();
 const bb=Math.sin(frame*.15)*4;X.save();X.fillStyle='#fff';X.beginPath();X.roundRect(b.x-42,GY-(b.type=='fridge'?260:180)+bb,84,34,10);X.fill();X.fillStyle='#e00';X.font='20px Impact';X.textAlign='center';X.fillText('HELP!',b.x,GY-(b.type=='fridge'?236:156)+bb);X.restore()}
function drawPlayer(p){if(p.dead){X.globalAlpha=.4;}
 const run=Math.abs(p.vx)>.6&&p.y>=0,bob=run?Math.abs(Math.sin(frame*.35))*6:Math.sin(frame*.08)*2;
 shadow(p.x,55);const sq=p.squash,a=p.atk;let lunge=0;if(a&&a.t<a.len)lunge=Math.sin(a.t/a.len*3.14)*18*p.face;
 const fl=p.inv>0&&p.inv%6<3;
 // aura
 X.save();X.globalCompositeOperation='lighter';const gr=X.createRadialGradient(p.x,GY+p.y-90,10,p.x,GY+p.y-90,120);gr.addColorStop(0,p.ch.col+'55');gr.addColorStop(1,'rgba(0,0,0,0)');X.fillStyle=gr;X.fillRect(p.x-130,GY+p.y-220,260,260);X.restore();
 if(p.poseT>0)p.poseT--;let pose=p.hurt>0||p.stun>0?'hurt':a&&a.pose?a.pose:p.poseT>0?p.poseN:p.y<-2?'jump':run?'walk':'idle';
 if(a&&a.kind=='cable')pose=p.ch.img=='mac'?'swing':pose;p.at=(p.at||0)+(run?Math.abs(p.vx)/4.2:1);
 const o={sx:1/Math.sqrt(sq),sy:sq,rot:p.tilt*.5,flash:p.hurt>8,alpha:fl?.55:1,tint:p.stun>0?'hue-rotate(60deg) brightness(.7)':null};
 if(!anim(p.ch.img,pose,p.at,run?7:30,p.x+lunge,GY+p.y-(run?bob*.4:0),190,p.face,o))sprite(IMG(p.ch.img),p.x+lunge,GY+p.y-bob,175,p.face,{sx:1/Math.sqrt(sq)*(run?1:1),sy:sq,rot:p.tilt+(run?p.face*.06:0),flash:p.hurt>8,alpha:fl?.55:1,tint:p.stun>0?'hue-rotate(60deg) brightness(.7)':null});
 if(a&&a.t>=a.hitAt-2&&a.t<a.hitAt+4&&a.kind=='melee'){X.save();X.globalCompositeOperation='lighter';X.strokeStyle=a.col||'#fff';X.shadowColor=a.col||'#fff';X.shadowBlur=25;X.lineWidth=10;X.beginPath();X.arc(p.x+p.face*60,GY+p.y-100,70,p.face>0?-1.2:2,p.face>0?1.0:4.3);X.stroke();X.restore()}
 if(p.shield){const gray=clamp(p.sp/60,0,1),base=p.id=='mac'?[255,195,0]:[245,163,8],c=base.map(v=>Math.round(v*gray+150*(1-gray)));const cs='rgb('+c.join(',')+')';
  X.save();X.globalCompositeOperation='lighter';X.strokeStyle=cs;X.shadowColor=cs;X.shadowBlur=30;X.lineWidth=6;X.globalAlpha=.85;X.beginPath();X.ellipse(p.x,GY+p.y-95,85,115,0,0,6.28);X.stroke();X.fillStyle=cs;X.globalAlpha=.15;X.fill();X.restore()}
 if(p.stun>0)for(let i=0;i<3;i++){const an=frame*.15+i*2.1;X.fillStyle='#ffe600';X.beginPath();X.arc(p.x+Math.cos(an)*40,GY+p.y-195+Math.sin(an)*8,6,0,6.28);X.fill()}
 glowText('P'+(p.i+1),p.x,GY+p.y-200,20,p.i?'#ff3030':'#00e5ff',10);X.globalAlpha=1}
function drawKale(e){shadow(e.x,45);const walk=Math.abs(e.vx)>.3?Math.sin(frame*.3+e.bob)*.05:0;
 const kp=e.flashT>0?'idle':e.atk>4&&e.atk<20?'attack':Math.abs(e.vx)>.3?'walk':'idle';e.at=(e.at||0)+1;
 if(!anim('kale',kp,e.at,9,e.x,GY,180,e.face,{flash:e.flashT>0,rot:e.flashT>0?-e.face*.12:0,tint:e.stun>0?'brightness(.6)':null}))sprite(IMG('kale'),e.x,GY-(e.atk>0?Math.max(0,e.atk-12):0),180,-e.face,{rot:walk+(e.atk>8&&e.atk<16?e.face*.12:0),flash:e.flashT>0,sy:1+Math.sin(frame*.1+e.bob)*.01,tint:e.stun>0?'brightness(.6)':null});
 X.save();X.globalCompositeOperation='lighter';X.fillStyle='#39ff14';X.shadowColor='#39ff14';X.shadowBlur=14;X.beginPath();X.arc(e.x+e.face*6,GY-160,4,0,6.28);X.fill();X.restore();
 if(e.snare>0){X.fillStyle='rgba(255,176,0,.7)';X.beginPath();X.ellipse(e.x,GY-10,50,14,0,0,6.28);X.fill()}
 if(e.stun>0)glowText('★',e.x,GY-200+Math.sin(frame*.3)*4,24,'#ffe600');
 X.fillStyle='#300';X.fillRect(e.x-30,GY-200,60,5);X.fillStyle='#39ff14';X.fillRect(e.x-30,GY-200,60*e.hp/40,5)}
function drawBoss(){const b=boss;if(!b)return;
 if(b.hp>0||state=='clear'){shadow(b.x,70);const sw=Math.sin(frame*.05)*.03;
  X.save();X.globalCompositeOperation='lighter';const gr=X.createRadialGradient(b.x,GY-130,10,b.x,GY-130,200);gr.addColorStop(0,'rgba(179,182,80,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');X.fillStyle=gr;X.fillRect(b.x-220,GY-350,440,400);X.restore();
  const bp=state=='clear'?'stunned':b.stun>0||b.snare>0?'stunned':b.flashT>0?'hurt':b.drainT>0?'drain':b.atkT>0?'attack':b.moving?'walk':'idle';if(b.atkT>0)b.atkT--;if(b.drainT>0)b.drainT--;
  if(!anim('calorie',bp,frame,14,b.x,GY,300,b.face,{rot:state=='clear'?Math.min(1.4,endT*.02)*-b.face:0,flash:b.flashT>0,alpha:state=='clear'?Math.max(.2,1-endT/200):1,tint:'brightness(1.25) contrast(1.1)'}))sprite(IMG('calorie'),b.x,GY,300,-b.face,{rot:state=='clear'?Math.min(1.4,endT*.02)*-b.face:sw,flash:b.flashT>0,alpha:state=='clear'?Math.max(.2,1-endT/200):1,tint:b.stun>0?'brightness(.7) sepia(.5)':'brightness(1.35) contrast(1.1)'});
  if(b.snare>0){X.fillStyle='rgba(255,176,0,.8)';X.shadowColor='#FFB000';X.shadowBlur=20;X.beginPath();X.ellipse(b.x,GY-8,80,18,0,0,6.28);X.fill();X.shadowBlur=0}
  if(b.stun>0)glowText('★ ★ ★',b.x,GY-290,26,'#ffe600')}
 for(const r of birds){const im=IMG(r.name),hh=r.perched?95:130,flap=1;
  X.save();X.translate(r.x,GY+r.y);X.scale(1,flap);X.translate(-r.x,-(GY+r.y));
  const rp=r.flashT>0||r.st=='fall'?'hurt':/dive|swoop|atk|attack/.test(r.st||'')?'attack':'fly';
  if(!anim(r.name,rp,frame+(r.side>0?5:0),r.perched?12:5,r.x,GY+r.y+hh/2,hh*1.25,r.perched?b.face:1,{flash:r.flashT>0,alpha:r.gone?.5:1}))sprite(im,r.x,GY+r.y+hh/2,hh,r.vx<0?-1:1,{flash:r.flashT>0,alpha:r.gone?.5:1});X.restore();
  if(r.perched){X.save();X.globalAlpha=.25+.15*Math.sin(frame*.1);X.fillStyle=r.name=='stem'?'#96991A':'#A7AE56';X.beginPath();X.moveTo(r.x,GY+r.y);X.arc(r.x,GY+r.y,170,(b.face>0?-1:1)*0+(b.face>0?-2.36:0.78),(b.face>0?2.36:5.5));X.fill();X.restore()}}}
function drawCiv(c){const img=IMG(c.img),hop=Math.abs(Math.sin(c.t*1.4))*10;shadow(c.x,30);
 c.at=(c.at||0)+1;const cheer=c.free&&c.cheer>0;
 if(!anim(c.img,cheer?'cheer':'run',c.at,5,c.x,GY+c.y-(cheer?hop:hop*.3),cheer?100:95,c.vx<0?-1:1,{rot:cheer?Math.sin(frame*.4)*.08:0}))sprite(img,c.x,GY+c.y-hop,c.free&&c.cheer>0?100:92,c.vx<0||(!c.free&&c.vx<0)?-1:1,{rot:c.free&&c.cheer>0?Math.sin(frame*.4)*.15:(c.vx||6)*.02});
 if(!c.free&&frame%40<20)glowText('!',c.x,GY-110,26,'#ff3355')}
function drawWorld(){X.save();X.translate(-camX+(shake?rnd(-shake,shake):0),shake?rnd(-shake,shake):0);
 for(const t of traps){X.save();X.globalAlpha=Math.min(1,t.t/60);X.fillStyle=t.type=='melt'?'#FFB000':'#2a1a02';X.shadowColor=t.type=='melt'?'#FFB000':'#CE5D06';X.shadowBlur=24;X.beginPath();X.ellipse(t.x,GY-2,75,16,0,0,6.28);X.fill();X.restore()}
 breaks.forEach(drawBreak);civs.forEach(drawCiv);drawBoss();enemies.forEach(drawKale);players.forEach(drawPlayer);
 X.save();X.globalCompositeOperation='lighter';
 for(const s of shots){if(s.cable){const p=s.owner;X.strokeStyle='#FFC300';X.shadowColor='#FFC300';X.shadowBlur=20;X.lineWidth=8;X.beginPath();X.moveTo(p.x+p.face*40,GY+p.y-110);for(let i=1;i<=8;i++)X.lineTo(p.x+p.face*(40+s.len*i/8),GY+p.y-110+Math.sin(i+frame)*6);X.stroke();continue}
  if(s.delay>0)continue;X.fillStyle=s.col;X.shadowColor=s.col;X.shadowBlur=18;
  if(s.kind=='fry'){X.save();X.translate(s.x,GY+s.y);X.rotate(Math.atan2(s.vy,s.vx));X.fillRect(-18,-4,36,8);X.restore()}else{X.beginPath();X.arc(s.x,GY+s.y,s.wisp?11:7,0,6.28);X.fill()}}
 for(const q of parts){const a=q.life/(q.ring?q.maxl:q.max);X.globalAlpha=Math.max(0,a);if(q.ring){X.strokeStyle=q.col;X.lineWidth=5;X.shadowColor=q.col;X.shadowBlur=16;X.beginPath();X.ellipse(q.x,GY+q.y,q.r,q.r*.6,0,0,6.28);X.stroke()}else{X.fillStyle=q.col;X.shadowBlur=0;X.fillRect(q.x-q.size/2,GY+q.y-q.size/2,q.size,q.size)}}
 X.restore();X.globalAlpha=1;
 for(const t of texts){X.globalAlpha=Math.min(1,t.t/20);glowText(t.txt,t.x,GY+t.y,t.size,t.col,12)}X.globalAlpha=1;
 X.restore()}
function bar(x,y,w,h,v,col,bg){X.fillStyle=bg||'#200';X.fillRect(x,y,w,h);X.save();X.fillStyle=col;X.shadowColor=col;X.shadowBlur=12;X.fillRect(x,y,w*clamp(v,0,1),h);X.restore();X.strokeStyle='#fff8';X.lineWidth=1.5;X.strokeRect(x,y,w,h)}
function drawHUD(){players.forEach((p,i)=>{const x=i?W-420:20,y=16;X.save();X.fillStyle='rgba(0,0,20,.65)';X.strokeStyle=p.ch.col;X.shadowColor=p.ch.col;X.shadowBlur=14;X.lineWidth=2;X.beginPath();X.roundRect(x,y,400,96,12);X.fill();X.stroke();X.restore();
 const im=IMG(p.ch.img);if(im.complete){X.save();X.beginPath();X.rect(x+6,y+6,80,84);X.clip();X.drawImage(im,x+6,y+6,80,80*im.naturalHeight/im.naturalWidth);X.restore()}
 glowText('P'+(i+1)+' '+p.ch.name,x+96,y+18,20,p.ch.col,8,'left');
 bar(x+96,y+34,290,16,p.hp/p.ch.hp,p.hp/p.ch.hp>.3?'#39ff14':'#ff2a2a');glowText('HP',x+378,y+42,13,'#fff',4,'right');
 bar(x+96,y+56,290,12,p.sp/100,p.sp>=100?'#ffffff':'#00e5ff','#012');glowText('SPECIAL '+Math.floor(p.sp),x+100,y+62,12,'#fff',4,'left');
 glowText(String(p.score).padStart(7,'0'),x+96+290,y+84,18,'#ffe600',8,'right');if(p.dead)glowText(alivePlayers().length?'DOWN — reviving…':'K.O.',x+200,y+84,16,'#f55',8)});
 glowText('RESCUED '+rescued+' / 5',640,30,24,'#7FDBFF',14);glowText('STAGE 1 • STORAGE DISTRICT',640,58,14,'#ff2fd0',10);
 if(boss&&boss.hp>0){const x=340,y=H-58;glowText('COUNT CALORIE',x,y-12,18,'#B3B650',10,'left');bar(x,y,600,18,boss.hp/boss.max,'#B3B650','#120');
  birds.forEach((r,i)=>{glowText(r.name.toUpperCase()+(r.gone?' ✖':r.perched?' (PERCHED)':' '+Math.max(0,r.hp)),x+600-i*170,y-12,14,r.name=='stem'?'#96991A':'#A7AE56',8,'right')})}
 if(banner){const a=Math.min(1,banner.t/20);X.globalAlpha=a;X.fillStyle='rgba(0,0,0,.45)';X.fillRect(0,250,W,120);glowText(banner.txt,640,295,64,'#ff2fd0',30);if(banner.sub)glowText(banner.sub,640,345,22,'#00e5ff',12);X.globalAlpha=1}
 if(flashT>0){X.fillStyle='rgba(255,255,255,'+flashT/14+')';X.fillRect(0,0,W,H)}
 glowText('ESC / START = PAUSE • MOVE LIST',W-14,H-14,13,'#888',2,'right')}
// ---------- MOVE LIST ----------
const ARW={1:'↙',2:'↓',3:'↘',4:'←',5:'·',6:'→',7:'↖',8:'↑',9:'↗'};
function motionStr(m){const s=m.m.filter(d=>d!=5).map(d=>ARW[d]).join(' ');return s}
function btnName(dev,i,b){if(dev=='xbox'||dev=='ps')return PADLAB[dev][b];if(dev=='touch')return 'TAP';return KB[i].lab[b]}
function drawMoveList(x,y,p,i){const dev=inputs[i].dev,pd=pads()[i],pt=pd?padType(pd):'xbox';
 X.save();X.fillStyle='rgba(5,0,25,.88)';X.strokeStyle=p.ch.col;X.shadowColor=p.ch.col;X.shadowBlur=18;X.lineWidth=2;X.beginPath();X.roundRect(x,y,600,470,14);X.fill();X.stroke();X.restore();
 glowText('P'+(i+1)+' — '+p.ch.name,x+20,y+28,28,p.ch.col,12,'left');
 glowText('Keyboard: '+KB[i].lab.dir+' • Pad: '+(pt=='ps'?'PlayStation':'Xbox')+' layout'+(i==0&&touch.active?' • Touch: power buttons':''),x+20,y+56,13,'#aaa',2,'left');
 const hd=['MOVE','INPUT','KEYBOARD','PAD','SP'];const cx=[20,240,335,460,560];hd.forEach((h,j)=>glowText(h,x+cx[j],y+86,14,'#ff2fd0',6,'left'));
 const L=[...p.ch.moves.map(m=>({n:m.name,mo:motionStr(m),b:m.b,c:m.cost})),{n:'Punch combo (x3)',mo:'',b:'p',c:0},{n:'Kick',mo:'',b:'k',c:0},{n:'Jump',mo:'',b:'j',c:0}];
 L.forEach((r,j)=>{const yy=y+116+j*36,bn=k=>({p:'P',k:'K',s:'S',j:'J'})[k];
  glowText(r.n,x+cx[0],yy,17,'#fff',3,'left');glowText((r.mo?r.mo+' + ':'')+bn(r.b),x+cx[1],yy,18,'#ffe600',6,'left');
  glowText((r.mo?r.mo.replace(/→/g,'F').replace(/←/g,'B').replace(/↓/g,'D').replace(/↙/g,'DB').replace(/↘/g,'DF')+'+':'')+KB[i].lab[r.b],x+cx[2],yy,13,'#9ff',3,'left');
  glowText((r.mo?r.mo+'+':'')+PADLAB[pt][r.b],x+cx[3],yy,16,'#9ff',3,'left');glowText(r.c?String(r.c):'FREE',x+cx[4],yy,15,r.c?'#00e5ff':'#39ff14',4,'left')});
 glowText('→ = toward facing, ← = away. SP refills from hits, rescues & slowly over time.',x+20,y+452,12,'#aaa',2,'left')}
// ---------- SCREENS ----------
function drawSelect(){drawBG();X.fillStyle='rgba(0,0,15,.6)';X.fillRect(0,0,W,H);
 const lg=IMG('logo');if(lg.complete)X.drawImage(lg,640-200,6,400,400*lg.naturalHeight/lg.naturalWidth);
 glowText('SELECT YOUR SNACK PACKER',640,262,44,'#00e5ff',20);
 ['mac','fryguy'].forEach((id,j)=>{const ch=CHARS[id],x=330+j*620,y=300;const picks=[0,1].filter(i=>i<mode&&sel.pick[i]==id);
  X.save();X.fillStyle='rgba(10,0,30,.8)';X.strokeStyle=picks.length?ch.col:'#444';X.shadowColor=ch.col;X.shadowBlur=picks.length?30+10*Math.sin(frame*.1):0;X.lineWidth=4;X.beginPath();X.roundRect(x-200,y,400,380,18);X.fill();X.stroke();X.restore();
  sprite(IMG(ch.img),x,y+330+Math.sin(frame*.08+j)*4,300,j?-1:1,{sy:1+Math.sin(frame*.1)*.015});
  glowText(ch.name,x,y+356,34,ch.col,16);
  picks.forEach(i=>glowText((sel.ready[i]?'✔ ':'')+'P'+(i+1),x+(i?150:-150),y+30,30,i?'#ff3030':'#00e5ff',14))});
 glowText(mode==2?'2 PLAYERS — P1: A/D + F  •  P2: ←/→ + ,  •  Pads: stick + '+PADLAB.xbox.p+'/'+PADLAB.ps.p:'1 PLAYER — A/D or ←/→ to choose • F / SPACE / pad '+PADLAB.xbox.j+' / '+PADLAB.ps.j+' to confirm',640,700,16,'#fff',4)}
function updateSelect(){for(let i=0;i<mode;i++){const inp=inputs[i];inp.poll(1);
  if(i==0&&mode==1){for(const k of ['ArrowLeft','ArrowRight'])if(pressed[k])sel.pick[0]=sel.pick[0]=='mac'?'fryguy':'mac'}
  if(sel.ready[i]){if(inp.hit('k'))sel.ready[i]=false;continue}
  if(inp.hit('l')||inp.hit('r'))sel.pick[i]=sel.pick[i]=='mac'?'fryguy':'mac';
  if(inp.hit('p')||inp.hit('j')||(i==0&&pressed['Enter'])){sel.ready[i]=true;burst(0,0,'#fff',1)}}
 if(pressed['Escape'])location.href='../title/index.html';
 if(sel.ready.slice(0,mode).every(v=>v)){reset();state='play'}}
function drawPause(){X.fillStyle='rgba(0,0,10,.7)';X.fillRect(0,0,W,H);glowText('PAUSED',640,60,56,'#ff2fd0',24);
 players.forEach((p,i)=>drawMoveList(players.length==1?340:20+i*640,110,p,i));
 glowText('ESC / START: resume   •   Q / BACK: quit to title',640,H-36,18,'#00e5ff',8)}
function drawEnd(){const clear=state=='clear';X.fillStyle='rgba(0,0,15,'+Math.min(.8,endT/90)+')';X.fillRect(0,0,W,H);if(endT<60)return;
 glowText(clear?'STAGE CLEAR!':'GAME OVER',640,150,90,clear?'#39ff14':'#ff2a2a',34);
 if(clear){glowText(checkmate?'CHECKMATE BONUS +5000':'COUNT CALORIE DEFEATED',640,230,28,'#B3B650',14);
  glowText('CIVILIANS RESCUED: '+rescued+' / 5',640,300,40,'#7FDBFF',18);
  players.forEach((p,i)=>glowText('P'+(i+1)+' '+p.ch.name+'  —  '+String(p.score+rescued*0).padStart(7,'0'),640,370+i*50,30,p.ch.col,12));
  glowText('TIME '+Math.floor(stageT/3600)+':'+String(Math.floor(stageT/60)%60).padStart(2,'0'),640,480,24,'#fff',6)}
 if(frame%60<40)glowText('PRESS PUNCH / ENTER / TAP',640,600,26,'#ffe600',12)}
// ---------- TOUCH ----------
function setupTouch(){const el=document.getElementById('touch');el.style.display='block';touch.active=true;
 const mk=(lab,css,on,off,cls)=>{const b=document.createElement('button');b.textContent=lab;b.style.cssText=css;if(cls)b.className=cls;
  b.addEventListener('touchstart',e=>{e.preventDefault();on()},{passive:false});b.addEventListener('touchend',e=>{e.preventDefault();off&&off()},{passive:false});
  b.addEventListener('mousedown',()=>on());b.addEventListener('mouseup',()=>off&&off());el.appendChild(b);return b};
 const S=(k)=>[()=>{touch[k]=1},()=>{touch[k]=0}];
 [['◀','left:20px;bottom:70px','l'],['▶','left:140px;bottom:70px','r'],['▲','left:80px;bottom:130px','u'],['▼','left:80px;bottom:10px','d']].forEach(a=>mk(a[0],a[1]+';width:60px;height:60px',...S(a[2])));
 [['P','right:150px;bottom:40px','p'],['K','right:80px;bottom:90px','k'],['J','right:20px;bottom:30px','j'],['S','right:90px;bottom:160px','s']].forEach(a=>mk(a[0],a[1]+';width:62px;height:62px',...S(a[2])));
 mk('II','right:16px;top:120px;width:44px;height:44px',()=>{pressed['Escape']=1});
 const row=document.createElement('div');row.id='pw';el.appendChild(row);
 const ch=sel.pick[0];CHARS.mac.moves.concat(CHARS.fryguy.moves).forEach((m,j)=>{});
 touch.rebuild=()=>{row.innerHTML='';if(!players[0])return;players[0].ch.moves.forEach((m,j)=>{const b=document.createElement('button');b.className='pw';b.textContent=m.name+' '+m.cost;b.style.cssText='right:'+(240+(j%3)*92)+'px;bottom:'+(30+Math.floor(j/3)*44)+'px';
  b.addEventListener('touchstart',e=>{e.preventDefault();touch.power=m.id;if(m.b=='s')touch.s=1},{passive:false});b.addEventListener('touchend',e=>{e.preventDefault();touch.s=0},{passive:false});b.addEventListener('mousedown',()=>{touch.power=m.id});row.appendChild(b)})};
 C.addEventListener('touchstart',()=>{if(state=='clear'||state=='gameover')pressed['Enter']=1;if(state=='select'){sel.ready=[true,true]}})}
// ---------- LOOP ----------
let lastStart=[0,0];
function tick(){now=performance.now();
 const st=pads().some(g=>g.buttons[9]&&g.buttons[9].pressed);const stEdge=st&&!lastStart[0];lastStart[0]=st;
 if(state=='select')updateSelect();
 else if(state=='play'){if(pressed['Escape']||pressed['KeyP']||stEdge){paused=!paused}
  if(paused){if(pressed['KeyQ']||pads().some(g=>g.buttons[8]&&g.buttons[8].pressed))location.href='../title/index.html'}else update();
  if(touch.active&&touch.rebuild&&!touch.built){touch.rebuild();touch.built=1}}
 else{update();endT++;inputs[0].poll(1);if(endT>90&&(pressed['Enter']||inputs[0].hit('p')||inputs[0].hit('j'))){if(state=='clear')location.href='../title/index.html';else{reset();state='play'}}}
 for(const k in pressed)delete pressed[k];
 draw();requestAnimationFrame(tick)}
function draw(){if(state=='select'){drawSelect();return}drawBG();drawWorld();drawHUD();if(paused)drawPause();if(state=='clear'||state=='gameover')drawEnd()}
// ---------- BOOT / DEMO MODES (#select1 #select2 #howto #demo=select|play|boss|clear) ----------
function demoBots(n){// scripted presses for screenshots
 for(let f=0;f<n;f++){now+=16.7;update()}}
addEventListener('load',()=>{now=performance.now();const h=location.hash.slice(1);
 if('ontouchstart' in window||/touch/.test(h))setupTouch();
 if(h=='select2'){mode=2}else if(h=='select1'){mode=1}
 else if(h=='howto'){mode=1;reset();state='play';paused=true}
 else if(h.startsWith('demo=')){const d=h.slice(5);mode=2;
  if(d=='select'){sel.ready=[true,false]}
  else if(d=='play'||d=='boss'||d=='pause'){reset();state='play';
   if(d=='play'){players[0].x=1900;players[1].x=2050;camX=1650;breaks[1].hp=1;
    demoBots(5);players.forEach(p=>p.inv=0);spawnKale(2300);spawnKale(2420);spawnKale(1700);spawnKale(2600);banner=null;
    dealHit(breaks[1],5,players[0],'melee',{});civs.push({img:'grapesoda',x:2150,y:0,vx:5,panic:true,t:3});civs.push({img:'cupcake',x:1720,y:0,vx:-5,panic:true,t:1});
    players[1].face=1;startMove(players[1],CHARS.fryguy.moves[0]);players[0].face=-1;players[0].atk={t:0,len:13,hitAt:5,range:120,dmg:6,kind:'melee',w:120,col:'#FFD700'};
    for(let f=0;f<9;f++){now+=16.7;update()}players[0].atk={t:4,len:13,hitAt:5,range:120,dmg:6,kind:'melee',w:120,col:'#FFD700'};players[1].sp=70;banner=null;texts=texts.slice(-4)}
   if(d=='boss'){waves.forEach(w=>w.done=true);players[0].x=ARENA+420;players[1].x=ARENA+560;camX=ARENA;spawnBoss();boss.x=ARENA+820;camLock=ARENA;banner=null;
    traps.push({x:ARENA+800,type:'melt',t:600,owner:players[0]});
    demoBots(10);players.forEach(p=>p.inv=0);hitBoss(14,players[1],'proj',{});birds[1].st='hover';birds[1].x=ARENA+640;birds[1].y=-380;
    players[0].shield=true;players[0].shieldT=999;players[0].sp=55;players[1].face=1;startMove(players[1],CHARS.fryguy.moves[0]);
    for(let f=0;f<14;f++){now+=16.7;update()}ring(birds[1].x,birds[1].y,'#96991A',300,30);ring(birds[1].x,birds[1].y,'#96991A',200,30);for(let f=0;f<6;f++){now+=16.7;update()}banner=null;boss.flashT=0;birds[0].perched=true;birds[0].st='perch';birds[1].perched=false;birds[1].st='hover';birds[1].t=0;birds[1].x=ARENA+560;birds[1].y=-430;shots=shots.filter(s=>s.enemy);texts=texts.filter(t=>/KNOCKED/.test(t.txt));texts=[];pop(ARENA+560,-520,'STEM KNOCKED OFF!','#A7AE56',30);texts[0].t=200}
   if(d=='pause'){paused=true}}}
 draw();requestAnimationFrame(tick)});
