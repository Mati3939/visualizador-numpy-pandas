'use strict';
/* Módulo: Outliers — detección con IQR y z-score, boxplot interactivo */
registerModule({
  id:'outliers',
  title:'Outliers',
  week:'Semanas 8–9',
  lead:'Un outlier es un valor anómalamente lejos del resto. Detectarlo es fácil; '+
       'la decisión difícil es qué hacer con él — y para eso hay que mirar los datos.',
  build(sec){
    const NS='http://www.w3.org/2000/svg';
    const s=(tag,attrs={})=>{
      const n=document.createElementNS(NS,tag);
      for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);
      return n;
    };
    /* sueldos mensuales (miles de CLP) de analistas de datos — inspirado en DataAnalyst.csv del curso */
    const DATA=[650,720,780,810,690,850,920,880,760,730,990,1050,840,910,700,880,820,950,1100,760,890,3900,4800,150];

    const quantile=(arr,q)=>{ /* interpolación lineal, como numpy/pandas */
      const a=[...arr].sort((x,y)=>x-y);
      const pos=(a.length-1)*q, lo=Math.floor(pos), hi=Math.ceil(pos);
      return a[lo]+(a[hi]-a[lo])*(pos-lo);
    };
    const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
    const std=a=>{const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));};
    const fmt$=v=>'$'+Math.round(v).toLocaleString('es-CL');

    const card=el('div',{class:'card'},
      el('h3',{},'Detectar outliers: IQR y z-score'),
      el('p',{class:'note',html:'Sueldos mensuales (miles de pesos) de 24 analistas de datos. '+
        'Mueve el umbral y observa qué puntos quedan marcados como outliers. '+
        'Fíjate cómo la <b>media se arrastra</b> hacia los valores extremos mientras la <b>mediana casi no se mueve</b>: '+
        'por eso el boxplot (basado en cuartiles) es la herramienta robusta para esto.'}));
    sec.append(card);

    /* controles */
    const ctr=el('div',{class:'controls'});card.append(ctr);
    const selM=el('select',{},el('option',{value:'iqr'},'IQR (rango intercuartílico)'),el('option',{value:'z'},'z-score'));
    const rng=el('input',{type:'range',min:0.5,max:3,step:0.25,value:1.5,style:'width:140px'});
    const kLab=el('span',{style:'font-weight:700;min-width:2.4em;display:inline-block'},'k = 1,5');
    const bDrop=el('button',{class:'btn'},'🗑️ Eliminar outliers');
    const bRes=el('button',{class:'btn'},'⟲ Restaurar');
    ctr.append(el('label',{},'método: '),selM,el('label',{style:'margin-left:.6rem'},'umbral: '),rng,kLab,bDrop,bRes);

    /* svg */
    const W=740,H=196,L=54,R=24,plotW=W-L-R;
    const svgWrap=el('div',{style:'overflow-x:auto'});card.append(svgWrap);
    const svg=s('svg',{viewBox:`0 0 ${W} ${H}`,style:'width:100%;max-width:900px;display:block'});
    svgWrap.append(svg);
    const gAxis=s('g'),gBox=s('g'),gFence=s('g'),gPts=s('g');
    svg.append(gAxis,gFence,gBox,gPts);
    /* leyenda */
    card.append(el('div',{class:'legend'},
      el('span',{},el('span',{class:'sw',style:'background:var(--s1)'}),'dato'),
      el('span',{},el('span',{class:'sw',style:'background:var(--s8)'}),'outlier según el umbral'),
      el('span',{},el('span',{class:'sw',style:'background:transparent;border:1px dashed var(--muted)'}),'límites (cercas)')));
    const stats=el('div',{class:'msg'});card.append(stats);
    const chips=el('div');card.append(chips);
    const code=codeBox(card);
    card.append(el('p',{class:'note',html:'<b>¿IQR o z-score?</b> El z-score usa media y desviación estándar, que los mismos outliers '+
      'distorsionan (¡el outlier se esconde a sí mismo!). El IQR usa cuartiles, robustos. Regla práctica del curso: '+
      'boxplot/IQR primero, z-score solo si la variable es aproximadamente normal. Y antes de borrar un outlier pregúntate: '+
      '¿es un error de digitación o un dato real e interesante?'}));

    /* puntos persistentes */
    let active=[...DATA]; // valores vigentes (tras eliminar)
    const circles=DATA.map((v,i)=>{
      const c=s('circle',{r:5.5,fill:'var(--s1)','fill-opacity':.85,style:'transition:opacity .5s, fill .3s'});
      const hit=s('circle',{r:11,fill:'transparent'});
      const t=s('title');t.textContent=`analista ${i+1}: ${fmt$(v)} mil`;
      c.append(t);
      gPts.append(c,hit);
      return {c,hit,v,i,removed:false};
    });

    function config(){ /* reconfigura slider según método */
      if(selM.value==='iqr'){rng.min=0.5;rng.max=3;rng.step=0.25;rng.value=1.5;}
      else{rng.min=1;rng.max=3.5;rng.step=0.25;rng.value=3;}
      update();
    }
    function update(){
      const k=+rng.value;
      kLab.textContent='k = '+String(k).replace('.',',');
      const vals=circles.filter(p=>!p.removed).map(p=>p.v);
      const q1=quantile(vals,.25),q3=quantile(vals,.75),iqr=q3-q1;
      const m=mean(vals),sd=std(vals),med=quantile(vals,.5);
      let lo,hi;
      if(selM.value==='iqr'){lo=q1-k*iqr;hi=q3+k*iqr;}
      else{lo=m-k*sd;hi=m+k*sd;}
      /* escala */
      const vmin=Math.min(...vals,lo),vmax=Math.max(...vals,hi);
      const pad=(vmax-vmin)*.05;
      const x=v=>L+ (v-(vmin-pad))/((vmax+pad)-(vmin-pad))*plotW;
      /* eje */
      gAxis.textContent='';
      gAxis.append(s('line',{x1:L,x2:W-R,y1:H-18,y2:H-18,class:'axisline'}));
      const span=vmax-vmin;
      const step=span>3000?1000:span>1200?500:250;
      for(let v=Math.ceil(vmin/step)*step;v<=vmax;v+=step){
        gAxis.append(s('line',{x1:x(v),x2:x(v),y1:30,y2:H-18,class:'gridline'}));
        const t=s('text',{x:x(v),y:H-4,'text-anchor':'middle'});t.textContent=v.toLocaleString('es-CL');
        gAxis.append(t);
      }
      /* cercas */
      gFence.textContent='';
      for(const [v,lbl] of [[lo,'lím. inf'],[hi,'lím. sup']]){
        gFence.append(s('line',{x1:x(v),x2:x(v),y1:26,y2:H-18,stroke:'var(--muted)','stroke-dasharray':'4 4'}));
        const t=s('text',{x:x(v),y:20,'text-anchor':'middle'});t.textContent=lbl;
        gFence.append(t);
      }
      /* boxplot (siempre por cuartiles, se dibuja sobre los datos vigentes) */
      gBox.textContent='';
      const yB=52,hB=34;
      const inFence=vals.filter(v=>v>=lo&&v<=hi);
      const wLo=Math.min(...inFence),wHi=Math.max(...inFence);
      gBox.append(
        s('line',{x1:x(wLo),x2:x(q1),y1:yB,y2:yB,class:'axisline'}),
        s('line',{x1:x(q3),x2:x(wHi),y1:yB,y2:yB,class:'axisline'}),
        s('line',{x1:x(wLo),x2:x(wLo),y1:yB-8,y2:yB+8,class:'axisline'}),
        s('line',{x1:x(wHi),x2:x(wHi),y1:yB-8,y2:yB+8,class:'axisline'}),
        s('rect',{x:x(q1),y:yB-hB/2,width:Math.max(1,x(q3)-x(q1)),height:hB,rx:4,
          fill:'color-mix(in srgb, var(--s1) 22%, transparent)',stroke:'var(--s1)'}),
        s('line',{x1:x(med),x2:x(med),y1:yB-hB/2,y2:yB+hB/2,stroke:'var(--s1)','stroke-width':2.5}));
      /* puntos */
      const outs=[];
      circles.forEach((p,i)=>{
        const yJ=96+((i*37)%64);
        p.c.setAttribute('cx',x(p.v));p.c.setAttribute('cy',yJ);
        p.hit.setAttribute('cx',x(p.v));p.hit.setAttribute('cy',yJ);
        if(p.removed){p.c.style.opacity=0;p.hit.style.pointerEvents='none';return;}
        p.c.style.opacity=1;p.hit.style.pointerEvents='';
        const isOut=p.v<lo||p.v>hi;
        p.c.setAttribute('fill',isOut?'var(--s8)':'var(--s1)');
        if(isOut)outs.push(p.v);
      });
      /* lecturas */
      stats.innerHTML=`Q1=${fmt$(q1)} · mediana=${fmt$(med)} · Q3=${fmt$(q3)} · `+
        `límites [${fmt$(lo)}, ${fmt$(hi)}] · <b style="color:var(--s8)">${outs.length} outlier${outs.length===1?'':'s'}</b> · `+
        `media=${fmt$(m)} vs mediana=${fmt$(med)}`;
      chips.textContent='';
      outs.sort((a,b)=>a-b).forEach(v=>chips.append(el('span',{class:'chip',style:'border-color:var(--s8);color:var(--s8)'},fmt$(v))));
      if(selM.value==='iqr'){
        code.innerHTML=`Q1, Q3 = df['sueldo'].quantile([0.25, 0.75])\nIQR = Q3 - Q1                        # ${fmt$(iqr)}\nlim_inf = Q1 - <b>${String(k).replace('.',',')}</b>*IQR              # ${fmt$(lo)}\nlim_sup = Q3 + <b>${String(k).replace('.',',')}</b>*IQR              # ${fmt$(hi)}\noutliers = df[(df['sueldo'] < lim_inf) | (df['sueldo'] > lim_sup)]   # ${outs.length} filas`;
      }else{
        code.innerHTML=`z = (df['sueldo'] - df['sueldo'].mean()) / df['sueldo'].std()\noutliers = df[z.abs() > <b>${String(k).replace('.',',')}</b>]        # ${outs.length} filas`;
      }
      return {lo,hi};
    }
    selM.onchange=config;
    rng.oninput=update;
    bDrop.onclick=()=>{
      const {lo,hi}=update();
      circles.forEach(p=>{if(!p.removed&&(p.v<lo||p.v>hi))p.removed=true;});
      update();
    };
    bRes.onclick=()=>{circles.forEach(p=>p.removed=false);update();};
    update();
  }
});
