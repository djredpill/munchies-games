// THE MUNCHIES — synthesized audio (Web Audio API, no sample files). Shared by title + side-scroller.
const SND=(()=>{
 const LS='munchies_audio';let cfg={music:.6,sfx:.8,mMute:false,sMute:false};
 try{Object.assign(cfg,JSON.parse(localStorage.getItem(LS)||'{}'))}catch(e){}
 const save=()=>{try{localStorage.setItem(LS,JSON.stringify(cfg))}catch(e){}};
 let ac=null,master,mBus,sBus,noiseBuf,voices=0;const MAXV=14,last={};
 function init(){if(ac)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ac=new AC();
  master=ac.createDynamicsCompressor();master.threshold.value=-14;master.ratio.value=4;master.connect(ac.destination);
  mBus=ac.createGain();sBus=ac.createGain();mBus.connect(master);sBus.connect(master);apply();
  noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
 function apply(){if(!ac)return;const t=ac.currentTime;mBus.gain.setTargetAtTime(cfg.mMute?0:cfg.music*.55,t,.05);sBus.gain.setTargetAtTime(cfg.sMute?0:cfg.sfx,t,.02)}
 function unlock(){init();if(ac&&ac.state!='running')ac.resume();if(ac&&!unlock.done){unlock.done=1;// iOS: play a silent buffer inside the gesture
   const b=ac.createBufferSource();b.buffer=ac.createBuffer(1,1,22050);b.connect(ac.destination);b.start(0)}
  if(pend&&ac&&ac.state=='running'){const p=pend;pend=null;music(p)}}
 ['pointerdown','touchstart','touchend','mousedown','keydown'].forEach(ev=>addEventListener(ev,unlock,{capture:true,passive:true}));
 setInterval(()=>{const g=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];if(g.some(p=>p.buttons.some(b=>b.pressed)))unlock()},250);
 // ---- voice helpers ----
 function ok(name,gap){if(!ac||ac.state!='running'||cfg.sMute||cfg.sfx<=0)return false;const t=ac.currentTime;if(voices>=MAXV)return false;if(last[name]&&t-last[name]<(gap||.04))return false;last[name]=t;return true}
 function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec)}
 function track(node,end){voices++;node.onended=()=>{voices--}}
 function tone(type,f0,f1,dur,vol,o){o=o||{};const t=ac.currentTime+(o.at||0),os=ac.createOscillator(),g=ac.createGain();os.type=type;os.frequency.setValueAtTime(f0,t);if(f1)os.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  if(o.vib){const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=o.vib;lg.gain.value=o.vibD||20;l.connect(lg);lg.connect(os.frequency);l.start(t);l.stop(t+dur+.05)}
  let n=os;if(o.lp){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=o.lp;os.connect(f);n=f}
  n.connect(g);g.connect(o.bus||sBus);env(g,t,o.a||.005,vol,dur);os.start(t);os.stop(t+dur+.05);track(os)}
 function noise(dur,vol,ftype,f0,f1,o){o=o||{};const t=ac.currentTime+(o.at||0),s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf;s.loop=true;
  f.type=ftype||'lowpass';f.Q.value=o.q||1;f.frequency.setValueAtTime(f0,t);if(f1)f.frequency.exponentialRampToValueAtTime(f1,t+dur);
  s.connect(f);f.connect(g);g.connect(o.bus||sBus);env(g,t,o.a||.003,vol,dur);s.start(t,Math.random()*.5);s.stop(t+dur+.05);track(s)}
 const r=(a,b)=>a+Math.random()*(b-a);
 // ---- sound effects ----
 const FX={
  punch(){noise(.09,.5,'lowpass',2200,300);tone('sine',180,60,.1,.5)},
  kick(){noise(.12,.45,'bandpass',1400,250,{q:2});tone('triangle',140,45,.15,.55)},
  hit(){noise(.07,.4,'highpass',2500,900);tone('square',r(380,460),120,.07,.18)},
  hurt(){tone('sawtooth',420,140,.22,.25,{lp:1800});noise(.1,.25,'bandpass',900,400)},
  jump(){tone('square',260,640,.14,.12,{lp:2500})},
  land(){noise(.08,.3,'lowpass',500,80);tone('sine',90,45,.09,.35)},
  swing(){noise(.28,.35,'bandpass',400,3500,{q:3,a:.06})},           // Mac: cable swing whoosh
  claw(){for(let i=0;i<3;i++)noise(.06,.35,'highpass',4000,1500,{at:i*.045});tone('sawtooth',700,200,.12,.12)},
  shield(){tone('triangle',330,660,.35,.22,{vib:12,vibD:15});tone('sine',990,990,.4,.08,{a:.05})},
  melt(){tone('sine',300,90,.5,.25,{vib:7,vibD:40});noise(.4,.12,'lowpass',600,200,{a:.05})}, // gooey trap
  fry(){tone('square',900,1500,.05,.08);noise(.06,.2,'highpass',3000,5000)},  // fry throw flick
  sizzle(){noise(.6,.3,'highpass',5000,2500,{a:.02});noise(.4,.15,'bandpass',8000,6000,{q:4,a:.05})},
  leap(){tone('sawtooth',200,900,.3,.15,{lp:3000});noise(.25,.15,'bandpass',600,2500,{q:2})},
  slam(){tone('sine',110,35,.45,.7);noise(.4,.5,'lowpass',1200,60)},
  oil(){for(let i=0;i<4;i++)tone('sine',r(200,320),r(80,120),.09,.18,{at:i*.07})},
  flash(){tone('sawtooth',300,2400,.25,.15,{lp:6000});noise(.5,.3,'highpass',2000,8000,{a:.01})},
  drain(){tone('sawtooth',55,52,.35,.12,{lp:400,vib:6,vibD:3,a:.05});tone('sine',110,108,.35,.08,{a:.05})},
  wisp(){tone('sine',600,1400,.3,.12,{vib:18,vibD:80})},
  shriek(){tone('sawtooth',1800,2600,.6,.12,{vib:30,vibD:250,lp:5000,a:.03});noise(.6,.12,'bandpass',3500,4500,{q:6,a:.03})},
  flap(){noise(.12,.25,'lowpass',700,150,{a:.02})},
  kale(){noise(.1,.3,'bandpass',800,300,{q:2});tone('square',150,90,.1,.12)},
  kaleShot(){tone('square',800,300,.12,.08)},
  crate(){for(let i=0;i<5;i++)noise(.07,.35,'bandpass',r(400,1200),r(150,300),{q:3,at:i*.03});tone('sine',120,50,.2,.4)},
  dumpster(){tone('triangle',95,70,.6,.5);tone('square',190,140,.4,.12,{lp:900});noise(.3,.4,'lowpass',1500,200)},
  fridge(){for(let i=0;i<6;i++)tone('triangle',r(1800,3200),r(1200,2000),.15,.08,{at:i*.04});noise(.25,.35,'highpass',3000,1200);tone('sine',140,60,.2,.3)},
  rescue(){[523,659,784,1047].forEach((f,i)=>tone('triangle',f,0,.18,.2,{at:i*.08}));noise(.5,.06,'highpass',6000,4000,{at:.1,a:.05})},
  cheer(){[784,988].forEach((f,i)=>tone('sine',f,f*1.02,.12,.12,{at:i*.07}))},
  points(){tone('square',1320,1760,.07,.06)},
  pickup(){[880,1320].forEach((f,i)=>tone('square',f,0,.06,.08,{at:i*.05}))},
  meter(){[660,880,1100,1320].forEach((f,i)=>tone('triangle',f,0,.1,.12,{at:i*.05}))},
  ko(){tone('sawtooth',400,40,1,.3,{lp:1500});noise(.6,.3,'lowpass',800,60)},
  clear(){[523,659,784,1047,784,1047,1319].forEach((f,i)=>tone('square',f,0,i==6?.6:.14,.12,{at:i*.11,lp:4000}))},
  over(){[392,330,262,196].forEach((f,i)=>tone('triangle',f,0,.35,.2,{at:i*.25}))},
  nav(){tone('square',740,0,.04,.07)},
  select(){tone('square',880,1760,.08,.1);tone('triangle',1320,0,.12,.08,{at:.06})},
  back(){tone('square',600,300,.08,.08)},
  counter(){tone('square',220,110,.15,.2);noise(.1,.3,'highpass',2000,800)}
 };
 const GAP={drain:.3,flap:.18,points:.08,hit:.05,meter:.5,cheer:.3,fry:.03,kaleShot:.1,wisp:.08};
 function play(n){if(!FX[n]||!ok(n,GAP[n]))return;try{FX[n]()}catch(e){}}
 // ---- music: tiny step sequencer with lookahead scheduling ----
 const N=s=>440*Math.pow(2,(s-69)/12);
 const SONGS={
  stage:{bpm:124,bars:[[57,57,69,57,60,57,64,57],[53,53,65,53,57,53,60,53],[48,48,60,48,55,48,60,48],[55,55,67,55,59,55,62,55]],
   chords:[[69,72,76],[65,69,72],[60,64,67],[67,71,74]],lead:[76,0,79,76,0,74,72,0, 77,0,76,72,0,69,72,0, 72,0,76,79,0,84,79,0, 79,0,78,74,0,71,74,0],kick:'x...x...x...x...',snare:'....x.......x...',hat:'..x...x...x...xx',arp:1},
  boss:{bpm:142,bars:[[38,38,50,38,39,38,50,41],[38,38,50,38,44,43,41,39],[36,36,48,36,37,36,48,39],[37,37,49,37,44,43,41,40]],
   chords:[[62,65,69],[62,65,68],[60,63,67],[61,65,68]],lead:[74,0,75,0,74,0,72,70, 69,0,0,68,0,0,65,0, 72,0,73,0,72,0,70,68, 67,0,68,0,70,0,73,0],kick:'x..x..x.x..x..x.',snare:'....x.......x..x',hat:'xxxxxxxxxxxxxxxx',arp:0},
  title:{bpm:108,bars:[[45,45,57,45,52,45,57,45],[41,41,53,41,48,41,53,41],[48,48,60,48,55,48,60,48],[43,43,55,43,50,43,55,43]],
   chords:[[69,72,76],[65,69,72],[67,72,76],[67,71,74]],lead:[],kick:'x.......x.......',snare:'........x.......',hat:'..x...x...x...x.',arp:1}};
 let cur=null,step=0,nextT=0,timer=null,pend=null;
 function mt(type,f,t,dur,vol,lp){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=f;let n=o;if(lp){const fl=ac.createBiquadFilter();fl.type='lowpass';fl.frequency.value=lp;o.connect(fl);n=fl}n.connect(g);g.connect(mBus);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.start(t);o.stop(t+dur+.02)}
 function mn(t,dur,vol,ft,f){const s=ac.createBufferSource(),fl=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf;fl.type=ft;fl.frequency.value=f;s.connect(fl);fl.connect(g);g.connect(mBus);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.start(t,Math.random()*.5);s.stop(t+dur+.02)}
 function schedStep(S,i,t){const sx=60/S.bpm/4,bar=(i>>4)%4,s=i%16;
  if(S.kick[s]=='x'){const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(40,t+.12);o.connect(g);g.connect(mBus);g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.start(t);o.stop(t+.2)}
  if(S.snare[s]=='x')mn(t,.14,.35,'highpass',1500);
  if(S.hat[s]=='x')mn(t,.03,.12,'highpass',7000);
  if(s%2==0){const b=S.bars[bar][s/2];mt('sawtooth',N(b-12+12),t,sx*1.8,.22,cur=='boss'?500:700)}
  if(S.arp){const ch=S.chords[bar];mt('square',N(ch[s%3]+(s%6>2?12:0)),t,sx*.9,.05,2600)}
  else if(s%4==0){S.chords[bar].forEach(n=>mt('sawtooth',N(n),t,sx*3.5,.035,1400))}
  const L=S.lead;if(L.length){const n=L[(bar*8+(s>>1))%L.length];if(s%2==0&&n)mt(cur=='boss'?'sawtooth':'square',N(n),t,sx*1.7,.07,cur=='boss'?2000:3200)}}
 function music(name){if(name==cur&&timer)return;stopMusic();if(!name)return;if(!ac||ac.state!='running'){pend=name;return}
  cur=name;step=0;nextT=ac.currentTime+.08;const S=SONGS[name];
  timer=setInterval(()=>{if(!ac)return;const sx=60/S.bpm/4;while(nextT<ac.currentTime+.15){if(!cfg.mMute&&cfg.music>0)schedStep(S,step,nextT);step++;nextT+=sx}},30)}
 function stopMusic(){if(timer)clearInterval(timer);timer=null;cur=null;pend=null}
 return{play,music,stopMusic,unlock,cfg,
  setMusic(v){cfg.music=Math.max(0,Math.min(1,v));cfg.mMute=false;apply();save()},setSfx(v){cfg.sfx=Math.max(0,Math.min(1,v));cfg.sMute=false;apply();save()},
  toggleMusic(){cfg.mMute=!cfg.mMute;apply();save()},toggleSfx(){cfg.sMute=!cfg.sMute;apply();save()},get current(){return cur}}
})();
