/* ============================================================
   HERO — particle flame. Gravity slider morphs a rising Earth
   flame (1 g) into a blue sphere (microgravity).
   Educational illustration only.
   ============================================================ */
(function(){
  const cv=document.getElementById("flame"), ctx=cv.getContext("2d");
  const slider=document.getElementById("gSlider"), gVal=document.getElementById("gVal"), gNote=document.getElementById("gNote");
  let W,H,DPR,visible=true, mx=0,my=0;
  function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);}
  addEventListener("resize",resize); resize();
  addEventListener("mousemove",e=>{mx=(e.clientX/innerWidth-.5);my=(e.clientY/innerHeight-.5);});

  const N=1700,P=[];
  const gauss=()=>(Math.random()+Math.random()+Math.random()-1.5)/0.75;
  for(let i=0;i<N;i++){
    const x=gauss(),y=gauss(),z=gauss(),l=Math.hypot(x,y,z)||1,sh=.82+Math.random()*.22;
    P.push({sx:x/l*sh,sy:y/l*sh,sz:z/l*sh,seed:Math.random(),a:Math.random()*Math.PI*2,r:Math.sqrt(Math.random()),sz2:.7+Math.random()*1.5});
  }
  let g=0,gt=0;
  const lerp=(a,b,t)=>a+(b-a)*t;
  function note(){
    const v=gt;
    gVal.textContent=v.toFixed(2)+" g";
    gNote.textContent = v<.03 ? "Microgravity (ISS): no buoyancy, so the flame becomes a blue sphere fed by diffusion."
      : v>.97 ? "Earth (1 g): hot gases rise, giving the familiar teardrop flame."
      : "Illustrative blend only. There is no partial-gravity combustion data in NASA PSI yet.";
  }
  slider.addEventListener("input",()=>{gt=slider.value/100;note();}); note();
  new IntersectionObserver(es=>visible=es[0].isIntersecting).observe(cv);

  function frame(ts){
    requestAnimationFrame(frame);
    if(!visible) return;
    const t=ts/1000; g+=(gt-g)*.07;
    ctx.clearRect(0,0,W,H);
    const cx = W>820 ? W*.70 : W*.5, cy = H*.46 + (W>820?0:H*.12), R=Math.min(W,H)*(W>820?.27:.2);
    const col1=lerp(76,255,g), col2=lerp(201,150,g), col3=lerp(255,60,g);
    // glow
    const gr=ctx.createRadialGradient(cx,cy,0,cx,cy,R*1.9);
    gr.addColorStop(0,`rgba(${col1|0},${col2|0},${col3|0},${.28+.0*g})`); gr.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation="lighter";
    const ry=t*.18+mx*.9, cr=Math.cos(ry), sr=Math.sin(ry), tilt=my*.3;
    for(let i=0;i<N;i++){
      const p=P[i];
      const tt=(p.seed+t*.2*g)%1;
      // flame (teardrop) coordinates, y down
      const w=.62*Math.sin(Math.PI*Math.pow(tt,.7))*(1-.35*tt);
      let xf=Math.cos(p.a)*p.r*w, zf=Math.sin(p.a)*p.r*w, yf=1.1-tt*2.4;
      xf+=Math.sin(t*4+p.seed*30)*.07*tt;
      const X=lerp(p.sx,xf,g), Y=lerp(p.sy,yf,g), Z=lerp(p.sz,zf,g);
      const rx=X*cr+Z*sr, rz=-X*sr+Z*cr, ry2=Y+tilt*rz;
      const s=3/(3+rz);
      const px=cx+rx*R*s, py=cy+ry2*R*s;
      // colour
      const heat=1-tt;
      const fr=255, fg=lerp(110,205,heat), fb=lerp(40,100,heat);
      const br=lerp(60,150,(rz+1)/2), bg=lerp(170,230,(rz+1)/2), bb=255;
      const r=lerp(br,fr,g), gg=lerp(bg,fg,g), b=lerp(bb,fb,g);
      const a=lerp(.30+.38*(rz+1)/2, .22+.30*heat, g);
      ctx.fillStyle=`rgba(${r|0},${gg|0},${b|0},${a})`;
      ctx.beginPath(); ctx.arc(px,py,p.sz2*s*(1.25+g*.1),0,6.283); ctx.fill();
    }
    ctx.globalCompositeOperation="source-over";
  }
  requestAnimationFrame(frame);
})();
