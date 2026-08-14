/* =========================================================
   Interactive 3D Innovation Systems Cube
   NIS (X) × SSI (Y) × TIS (Z)
   ========================================================= */
(function(){
  "use strict";
  const L = 200;                 // axis length (px)

  // ---- categories per axis ----
  const NIS = ["السعودية","الإمارات","ألمانيا"];                       // X
  const SSI = ["الصحة","الطاقة","النقل","الزراعة"];                     // Y (up)
  const TIS = ["ذكاء اصطناعي","هيدروجين أخضر","تقنية حيوية"];           // Z (toward viewer)

  const tickPos = (i,n)=> (i+1)/(n+1)*L;   // position of category i along its axis

  // ---- real examples: [nisIdx, ssiIdx, tisIdx, title, narrative] ----
  const EX = [
    [0,0,0,"الذكاء الاصطناعي في القطاع الصحي السعودي",
      "خليّة عند تقاطع <b>السعودية × الصحة × الذكاء الاصطناعي</b>. هنا تتفاعل سياسات وزارة الصحة وهيئة البيانات (NIS) مع قاعدة معرفة القطاع الصحي (SSI) مع مسار نضج تقنية الذكاء الاصطناعي العابر للحدود (TIS). وظائف TIS السبع — كتعبئة الموارد وخلق الأسواق — تقيس صحة هذه الخليّة تحديدًا."],
    [0,1,1,"الهيدروجين الأخضر في قطاع الطاقة السعودي",
      "تقاطع <b>السعودية × الطاقة × الهيدروجين الأخضر</b>؛ مشروع نيوم نموذجٌ حيّ. القطاع راسخ (SSI ناضج) لكن التقنية ناشئة عالميًا (TIS في طور التشكّل)، فيتركّز التشخيص على توجيه البحث وتكوين الشرعية."],
    [1,3,2,"التقنية الحيوية في الزراعة الإماراتية",
      "تقاطع <b>الإمارات × الزراعة × التقنية الحيوية</b>. تغيير الإحداثي الوطني (X) وحده يكشف كيف تختلف المنظومة ذاتها باختلاف السياسات والبنية المؤسسية، رغم ثبات القطاع والتقنية تقريبًا."],
    [2,2,0,"الذكاء الاصطناعي في النقل الألماني",
      "تقاطع <b>ألمانيا × النقل × الذكاء الاصطناعي</b>. مقارنة هذه الخليّة بالخليّة السعودية على نفس محوري Y وZ تعزل أثر <b>النظام الوطني</b> منفردًا — وهذه هي قوة الفصل بين المحاور."]
  ];

  const origin = document.getElementById('origin');
  const scene  = document.getElementById('scene');
  const stage  = document.getElementById('stage');
  if(!origin || !scene || !stage) return;

  const billboards = []; // {el, get} -> always face camera
  let rx = -20, ry = -36;

  function el(cls, parent){ const d=document.createElement('div'); d.className=cls; (parent||origin).appendChild(d); return d; }

  // base transform helper (y is "up" amount; CSS up = negative)
  function place(node, x, y, z){ return `translate3d(${x}px,${-y}px,${z}px)`; }

  // ---------- build axes ----------
  function axis(cls, rot, labelAr, labelCode){
    const b = el('bar '+cls); b.style.width = L+'px'; b.style.transform = rot;
    const tip = el('tip '+cls);
    const color = cls==='x'?'#22d3ee':cls==='y'?'#fbbf24':'#c084fc';
    tip.style.borderWidth='6px 0 6px 11px';
    tip.style.borderColor=`transparent transparent transparent ${color}`;
    tip.style.filter=`drop-shadow(0 0 6px ${color})`;
    const tipWrap = el('', origin); tipWrap.style.position='absolute';
    tipWrap.style.transformStyle='preserve-3d';
    tipWrap.appendChild(tip);
    tip.style.position='absolute'; tip.style.left='0'; tip.style.top='-6px';
    tipWrap.style.transform = rot + ` translate3d(${L}px,0,0)`;
    const lab = el('lbl '+cls,scene); lab.innerHTML = `<span class="code">${labelCode}</span>${labelAr}`;
    let lx=0,ly=0,lz=0;
    if(cls==='x'){ lx=L+30; } if(cls==='y'){ ly=L+26; } if(cls==='z'){ lz=L+30; }
    registerBillboard(lab, lx, ly, lz, scene);
  }
  axis('x','rotateZ(0deg)','النظام الوطني','X · NIS');
  axis('y','rotateZ(-90deg)','النظام القطاعي','Y · SSI');
  axis('z','rotateY(-90deg)','النظام التكنولوجي','Z · TIS');

  // ---------- floor grid (X–Z plane) ----------
  const floor = el('floor');
  floor.style.width=L+'px'; floor.style.height=L+'px';
  floor.style.backgroundSize='25px 25px';
  floor.style.transform='rotateX(90deg) scaleY(-1)';
  floor.style.transformOrigin='0 0';

  // ---------- ticks ----------
  const tickEls = {x:[],y:[],z:[]};
  function buildTicks(arr,axisKey){
    arr.forEach((name,i)=>{
      const p = tickPos(i,arr.length);
      const t = el('tick '+axisKey,scene);
      t.innerHTML = `<div class="dot"></div><div class="t">${name}</div>`;
      let x=0,y=0,z=0;
      if(axisKey==='x') x=p; if(axisKey==='y') y=p; if(axisKey==='z') z=p;
      registerBillboard(t,x,y,z,scene);
      tickEls[axisKey].push(t);
    });
  }
  buildTicks(NIS,'x'); buildTicks(SSI,'y'); buildTicks(TIS,'z');

  // ---------- marker + guides ----------
  const marker = el('marker',scene);
  marker.innerHTML = '<div class="halo"></div><div class="core"></div><div class="mlbl" id="mlbl"></div>';
  const mState = {x:0,y:0,z:0};
  registerBillboardLive(marker, ()=>mState);

  let guides=[];
  function clearGuides(){ guides.forEach(g=>g.remove()); guides=[]; }
  function guide(rot,len,x,y,z){
    const g = el('guide'); g.style.width=len+'px';
    g.style.transform = place(g,x,y,z)+' '+rot;
    guides.push(g);
  }

  // ---------- billboard system ----------
  function registerBillboard(node, x,y,z, parent){
    node.style.position='absolute';
    if(parent) parent.appendChild(node);
    billboards.push({el:node, get:()=>({x,y,z})});
  }
  function registerBillboardLive(node, getter){
    billboards.push({el:node, get:getter});
  }
  function applyBillboards(){
    for(const b of billboards){
      const {x,y,z}=b.get();
      b.el.style.transform = place(b.el,x,y,z)+` rotateY(${-ry}deg) rotateX(${-rx}deg)`;
    }
  }

  // ---------- rotation ----------
  function render(){
    scene.style.transform = `translateZ(-40px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    applyBillboards();
  }

  // ---------- selection ----------
  const examplesBox = document.getElementById('examples');
  const readout = document.getElementById('readout');
  let current = 0;

  function chip(cls,txt){ return `<span class="chip ${cls}">${txt}</span>`; }

  function buildExampleButtons(){
    EX.forEach((e,idx)=>{
      const [n,s,t,title] = e;
      const btn = document.createElement('button');
      btn.className='ex'; btn.setAttribute('aria-pressed', idx===0);
      btn.innerHTML = `<span class="title">${title}</span>
        <span class="coords">${chip('x',NIS[n])}${chip('y',SSI[s])}${chip('z',TIS[t])}</span>`;
      btn.addEventListener('click',()=>select(idx));
      examplesBox.appendChild(btn);
    });
  }

  function highlightTicks(n,s,t){
    tickEls.x.forEach((el,i)=>el.classList.toggle('on',i===n));
    tickEls.y.forEach((el,i)=>el.classList.toggle('on',i===s));
    tickEls.z.forEach((el,i)=>el.classList.toggle('on',i===t));
  }

  function select(idx){
    current=idx;
    const [n,s,t,title,story]=EX[idx];
    const px=tickPos(n,NIS.length), py=tickPos(s,SSI.length), pz=tickPos(t,TIS.length);
    mState.x=px; mState.y=py; mState.z=pz;
    const ml = document.getElementById('mlbl');
    if(ml) ml.textContent = title.split(' في ')[0];

    clearGuides();
    guide('rotateZ(-90deg)', py, px, 0, pz);              // vertical drop to floor
    guide('rotateY(90deg)',  pz, px, 0, pz);              // floor -> X axis (along -z)
    guide('rotateZ(180deg)', px, px, 0, pz);              // floor -> Z axis (along -x)

    highlightTicks(n,s,t);
    document.querySelectorAll('.ex').forEach((b,i)=>b.setAttribute('aria-pressed', i===idx));

    readout.innerHTML = `<div class="rt">${title}</div>
      <div class="rd">${story}</div>
      <div class="formula">CELL = <span class="c">NIS:${NIS[n]}</span> × <span class="a">SSI:${SSI[s]}</span> × <span class="v">TIS:${TIS[t]}</span></div>`;
    render();
  }

  // ---------- interaction: drag ----------
  let drag=false, lx=0, ly=0, autoSpin=false, raf;
  function down(e){ drag=true; autoSpin=false; spinBtn.setAttribute('aria-pressed',false);
    const p=pt(e); lx=p.x; ly=p.y; }
  function move(e){ if(!drag) return; const p=pt(e);
    ry += (p.x-lx)*0.4; rx -= (p.y-ly)*0.4;
    rx=Math.max(-85,Math.min(85,rx)); lx=p.x; ly=p.y; render(); e.preventDefault(); }
  function up(){ drag=false; }
  function pt(e){ const t=e.touches?e.touches[0]:e; return {x:t.clientX,y:t.clientY}; }

  stage.addEventListener('mousedown',down); window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  stage.addEventListener('touchstart',down,{passive:true}); stage.addEventListener('touchmove',move,{passive:false}); window.addEventListener('touchend',up);

  // ---------- buttons ----------
  const spinBtn=document.getElementById('spin');
  spinBtn.addEventListener('click',()=>{ autoSpin=!autoSpin; spinBtn.setAttribute('aria-pressed',autoSpin); if(autoSpin) loop(); });
  document.getElementById('reset').addEventListener('click',()=>{ rx=-20; ry=-36; render(); });
  function loop(){ if(!autoSpin) return; ry+=0.35; render(); raf=requestAnimationFrame(loop); }

  // ---------- init ----------
  buildExampleButtons();
  select(0);
  render();
})();
