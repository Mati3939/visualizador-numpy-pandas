'use strict';
/* Módulo: Outliers — error vs valor real, detección (regla de negocio, IQR,
   z-score, percentiles), tratamiento (eliminar, corregir, nulo + imputar,
   acotar con clip, conservar) y outliers que solo se ven en contexto
   (dentro de cada grupo y en dos dimensiones). Salidas verificadas con pandas. */
(function(){
const NS='http://www.w3.org/2000/svg';
const s=(tag,attrs={},text)=>{
  const n=document.createElementNS(NS,tag);
  for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);
  if(text!=null)n.textContent=text;
  return n;
};
const quantile=(arr,q)=>{ /* interpolación lineal, como numpy/pandas */
  const a=[...arr].sort((x,y)=>x-y);
  const pos=(a.length-1)*q, lo=Math.floor(pos), hi=Math.ceil(pos);
  return a[lo]+(a[hi]-a[lo])*(pos-lo);
};
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const std=a=>{const m=mean(a);return Math.sqrt(a.reduce((t,x)=>t+(x-m)**2,0)/(a.length-1));};
const limitesIqr=(a,k=1.5)=>{const q1=quantile(a,.25),q3=quantile(a,.75),i=q3-q1;return [q1-k*i,q3+k*i];};
const coma=v=>String(v).replace('.',',');
const n1=v=>coma(Math.round(v*10)/10);
const pesos=v=>'$'+Math.round(v).toLocaleString('es-CL');

registerModule({
  id:'outliers',
  title:'Outliers',
  lead:'Un outlier es un valor que se aleja mucho del resto. Detectarlo no significa eliminarlo: '+
       'primero se detecta, luego se investiga (¿error o valor real?) y recién entonces se decide.',
  build(sec){

    /* ---------- Tarjeta 1: ¿error o valor real? ---------- */
    {
      const NOTAS=[5.2,4.8,6.1,5.5,3.9,65,5.0,4.4,6.3,5.7];
      const card=el('div',{class:'card'},
        el('h3',{},'¿Error o valor real?'),
        el('p',{class:'note',html:'Notas de un control donde un ayudante digitó <b>65</b> en vez de <b>6.5</b>. '+
          'Un solo dato mal ingresado y el promedio del curso queda fuera de la escala de 1.0 a 7.0.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const mount=el('div');card.append(mount);
      const stats=el('div',{class:'msg'});card.append(stats);
      const code=codeBox(card);
      let corregida=false;
      function render(){
        mount.textContent='';
        const vals=NOTAS.map(v=>corregida&&v>7?v/10:v);
        const t=new DfTable(mount,{caption:corregida?'notas (corregidas)':'notas',columns:['nota'],
          index:vals.map((_,i)=>i),rows:vals.map(v=>[v])});
        t.cell(5,0).classList.add(corregida?'dchg':'out8');
        const m=mean(vals), med=quantile(vals,.5);
        stats.innerHTML=`media = <b style="color:${corregida?'var(--s2)':'var(--s8)'}">${coma(m.toFixed(2))}</b> · `+
          `mediana = <b>${coma(med.toFixed(2))}</b>`+(corregida?' — ahora ambas son razonables'
            :' — la media se fue a más de 11; la mediana casi ni se movió');
        code.innerHTML=corregida
          ?"notas[notas > 7] = notas[notas > 7] / 10   # causa conocida: faltó el punto\nnotas.mean()     # 5.34\nnotas.median()   # 5.35"
          :"notas.mean()     # 11.19  ← imposible en escala 1–7\nnotas.median()   # 5.35   ← robusta: casi no cambia";
      }
      ctr.append(el('button',{class:'btn primary',onclick:e=>{corregida=!corregida;
        e.target.textContent=corregida?'⟲ volver al error':'✏️ corregir: 65 → 6.5';render();}},'✏️ corregir: 65 → 6.5'));
      render();
      const tabla=el('div',{class:'dfwrap',style:'margin-top:.6rem'});
      new DfTable(tabla,{caption:'Dos orígenes muy distintos',columns:['tipo','ejemplo','¿qué hacer?'],
        index:['error','real'],rows:[
          ['error de registro o medición','nota 65, edad -3, sensor que marca 999','corregir; si no se puede, convertir en NaN'],
          ['valor real extremo','pedido de $450.000 un día de celebración','normalmente conservar: es información']]});
      card.append(tabla);
    }

    /* ---------- Tarjeta 2: detección numérica ---------- */
    {
      /* tiempos de entrega (min) de 24 pedidos: 20 normales, 2 de días de lluvia
         (reales) y 2 errores de la app (-4 y 999) */
      const PED=[[22],[25],[28],[30],[31],[33],[34],[35],[36],[38],[40],[41],[43],[45],[47],
        [29],[32],[37],[26],[39],[68,'lluvia'],[74,'lluvia'],[-4,'error'],[999,'error']];
      const card=el('div',{class:'card'},
        el('h3',{},'Detectar: regla de negocio, IQR, z-score y percentiles'),
        el('p',{class:'note',html:'Tiempos de entrega (minutos) de 24 pedidos de una app de delivery en Concepción. '+
          'Hay dos <b>errores</b> de la app y dos pedidos de <b>días de lluvia</b> (reales). '+
          'Cambia el criterio y mira qué marca cada uno. Con el 999 dentro, la caja queda aplastada: '+
          '<b>los outliers grandes esconden todo lo demás</b>. Elimina los marcados y vuelve a mirar.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const selM=el('select',{},
        el('option',{value:'regla'},'Regla de negocio (0 < t ≤ 300)'),
        el('option',{value:'iqr'},'IQR (rango intercuartílico)'),
        el('option',{value:'z'},'Puntaje z'),
        el('option',{value:'pct'},'Percentiles'));
      const rng=el('input',{type:'range',style:'width:140px'});
      const kLab=el('span',{style:'font-weight:700;min-width:5.5em;display:inline-block'});
      const bDrop=el('button',{class:'btn'},'🗑️ Filtrar los marcados');
      const bRes=el('button',{class:'btn'},'⟲ Restaurar');
      ctr.append(el('label',{},'criterio: '),selM,rng,kLab,bDrop,bRes);

      const W=740,H=196,L=54,R=24,plotW=W-L-R;
      const svgWrap=el('div',{style:'overflow-x:auto'});card.append(svgWrap);
      /* min-width: en un celular el gráfico se desplaza horizontal en vez de encogerse */
      const svg=s('svg',{viewBox:`0 0 ${W} ${H}`,style:'width:100%;max-width:900px;min-width:540px;display:block'});
      svgWrap.append(svg);
      const gAxis=s('g'),gBox=s('g'),gFence=s('g'),gPts=s('g');
      svg.append(gAxis,gFence,gBox,gPts);
      card.append(el('div',{class:'legend'},
        el('span',{},el('span',{class:'sw',style:'background:var(--s1)'}),'pedido'),
        el('span',{},el('span',{class:'sw',style:'background:var(--s8)'}),'marcado por el criterio'),
        el('span',{},el('span',{class:'sw',style:'background:transparent;border:1px dashed var(--muted)'}),'límites')));
      const stats=el('div',{class:'msg'});card.append(stats);
      const chips=el('div');card.append(chips);
      const code=codeBox(card);
      const note=el('p',{class:'note'});card.append(note);

      const pts=PED.map(([v,tag],i)=>{
        const c=s('circle',{r:5.5,fill:'var(--s1)','fill-opacity':.85,style:'transition:opacity .5s, fill .3s'});
        const t=s('title');t.textContent=`pedido ${i}: ${v} min`+(tag==='lluvia'?' (día de lluvia)':tag==='error'?' (error de la app)':'');
        c.append(t);gPts.append(c);
        return {c,v,tag,removed:false};
      });

      const CFG={
        regla:{dis:true,lab:()=>'',},
        iqr:{min:1,max:3,step:.5,val:1.5,lab:k=>'k = '+coma(k)},
        z:{min:2,max:3.5,step:.25,val:3,lab:k=>'|z| > '+coma(k)},
        pct:{min:1,max:10,step:1,val:1,lab:k=>`p${k} – p${100-k}`},
      };
      function config(){
        const c=CFG[selM.value];
        rng.disabled=!!c.dis;rng.style.visibility=c.dis?'hidden':'';
        if(!c.dis){rng.min=c.min;rng.max=c.max;rng.step=c.step;rng.value=c.val;}
        update();
      }
      function limites(vals,k){
        const m=selM.value;
        if(m==='regla')return [0,300];
        if(m==='iqr')return limitesIqr(vals,k);
        if(m==='z'){const mu=mean(vals),sd=std(vals);return [mu-k*sd,mu+k*sd];}
        return [quantile(vals,k/100),quantile(vals,1-k/100)];
      }
      const esOut=(v,lo,hi)=>selM.value==='regla'?(v<=lo||v>hi):(v<lo||v>hi);
      function update(){
        const m=selM.value, k=+rng.value;
        kLab.textContent=CFG[m].lab(k);
        const vals=pts.filter(p=>!p.removed).map(p=>p.v);
        const [lo,hi]=limites(vals,k);
        const vmin=Math.min(...vals,lo),vmax=Math.max(...vals,hi);
        const pad=(vmax-vmin)*.05;
        const x=v=>L+(v-(vmin-pad))/((vmax+pad)-(vmin-pad))*plotW;
        gAxis.textContent='';
        gAxis.append(s('line',{x1:L,x2:W-R,y1:H-18,y2:H-18,class:'axisline'}));
        const span=vmax-vmin;
        const step=span>600?200:span>150?50:span>60?10:5;
        for(let v=Math.ceil(vmin/step)*step;v<=vmax;v+=step){
          gAxis.append(s('line',{x1:x(v),x2:x(v),y1:30,y2:H-18,class:'gridline'}),
            s('text',{x:x(v),y:H-4,'text-anchor':'middle'},v));
        }
        gFence.textContent='';
        for(const [v,lbl] of [[lo,'lím. inf'],[hi,'lím. sup']]){
          gFence.append(s('line',{x1:x(v),x2:x(v),y1:26,y2:H-18,stroke:'var(--muted)','stroke-dasharray':'4 4'}),
            s('text',{x:x(v),y:20,'text-anchor':'middle'},lbl));
        }
        /* boxplot de los datos vigentes (siempre con bigotes 1.5·IQR, como sns.boxplot) */
        gBox.textContent='';
        const q1=quantile(vals,.25),q3=quantile(vals,.75),med=quantile(vals,.5);
        const [bLo,bHi]=limitesIqr(vals);
        const dentro=vals.filter(v=>v>=bLo&&v<=bHi);
        const wLo=Math.min(...dentro),wHi=Math.max(...dentro),yB=52,hB=34;
        gBox.append(
          s('line',{x1:x(wLo),x2:x(q1),y1:yB,y2:yB,class:'axisline'}),
          s('line',{x1:x(q3),x2:x(wHi),y1:yB,y2:yB,class:'axisline'}),
          s('line',{x1:x(wLo),x2:x(wLo),y1:yB-8,y2:yB+8,class:'axisline'}),
          s('line',{x1:x(wHi),x2:x(wHi),y1:yB-8,y2:yB+8,class:'axisline'}),
          s('rect',{x:x(q1),y:yB-hB/2,width:Math.max(1,x(q3)-x(q1)),height:hB,rx:4,
            fill:'color-mix(in srgb, var(--s1) 22%, transparent)',stroke:'var(--s1)'}),
          s('line',{x1:x(med),x2:x(med),y1:yB-hB/2,y2:yB+hB/2,stroke:'var(--s1)','stroke-width':2.5}));
        const outs=[];
        pts.forEach((p,i)=>{
          const yJ=96+((i*37)%64);
          p.c.setAttribute('cx',x(p.v));p.c.setAttribute('cy',yJ);
          if(p.removed){p.c.style.opacity=0;return;}
          p.c.style.opacity=1;
          const o=esOut(p.v,lo,hi);
          p.c.setAttribute('fill',o?'var(--s8)':'var(--s1)');
          if(o)outs.push(p);
        });
        stats.innerHTML=`límites [${n1(lo)}, ${n1(hi)}] · <b style="color:var(--s8)">${outs.length} marcado${outs.length===1?'':'s'}</b> · `+
          `media = ${n1(mean(vals))} vs mediana = ${n1(med)}`;
        chips.textContent='';
        outs.sort((a,b)=>a.v-b.v).forEach(p=>chips.append(el('span',{class:'chip',style:'border-color:var(--s8);color:var(--s8)'},
          `${p.v} min`+(p.tag?` · ${p.tag}`:''))));
        const kk=coma(k).replace(',','.');
        code.innerHTML={
          regla:"imposibles = (df['tiempo_min'] &lt;= 0) | (df['tiempo_min'] &gt; 300)\n"+
                `df.loc[imposibles]          # ${outs.length} filas`,
          iqr:"def limites_iqr(serie, k=1.5):\n    q1 = serie.quantile(0.25)\n    q3 = serie.quantile(0.75)\n"+
              "    iqr = q3 - q1\n    return q1 - k * iqr, q3 + k * iqr\n\n"+
              `inf, sup = limites_iqr(df['tiempo_min'], k=<b>${kk}</b>)   # (${n1(lo)}, ${n1(hi)})\n`+
              `df[~df['tiempo_min'].between(inf, sup)]           # ${outs.length} filas`,
          z:"z = (df['tiempo_min'] - df['tiempo_min'].mean()) / df['tiempo_min'].std()\n"+
            `df[z.abs() &gt; <b>${kk}</b>]          # ${outs.length} filas`,
          pct:`p_inf = df['tiempo_min'].quantile(<b>${k/100}</b>)\np_sup = df['tiempo_min'].quantile(<b>${(100-k)/100}</b>)\n`+
              `df[~df['tiempo_min'].between(p_inf, p_sup)]   # ${outs.length} filas`,
        }[m];
        const hayErr=pts.some(p=>!p.removed&&p.tag==='error');
        note.innerHTML={
          regla:'El primer criterio, siempre: el <b>conocimiento del contexto</b>. Un tiempo negativo o de 16 horas es imposible '+
            'por definición. Detecta errores con certeza, pero no ve valores posibles y raros.',
          iqr:'Q1 − k·IQR y Q3 + k·IQR: el mismo criterio que usa el boxplot para los bigotes. Es <b>robusto</b> porque usa cuartiles. '+
            'Con <b>k = 3</b> solo marca los extremos de verdad.'+(hayErr?'':' Sin los errores, ¿qué marca? Los días de lluvia: <b>reales</b>, se conservan.'),
          z:hayErr?'Con el 999 dentro, la desviación estándar se infla a ~197 y el z solo ve al 999: el <b>-4 se esconde</b>. '+
              'La media y la desviación se dejan mover por los mismos outliers que buscamos.'
            :'Sin los errores, |z| &gt; 3 no marca nada: el 74 tiene z ≈ 2.9. El z supone forma de campana; <b>ante la duda, IQR</b>.',
          pct:'Siempre marca la misma proporción, <b>haya o no outliers</b>: fíjate que termina marcando pedidos normales. '+
            'Es útil para controlar cuántos datos tocas, por ejemplo al acotar con <code>clip</code>.',
        }[m];
        return {lo,hi};
      }
      selM.onchange=config;
      rng.oninput=update;
      bDrop.onclick=()=>{
        const {lo,hi}=update();
        pts.forEach(p=>{if(!p.removed&&esOut(p.v,lo,hi))p.removed=true;});
        update();
      };
      bRes.onclick=()=>{pts.forEach(p=>p.removed=false);update();};
      config();
    }

    /* ---------- Tarjeta 3: tratamiento ---------- */
    {
      const COLS=['tipo_local','monto'];
      const IDX=[0,1,2,3,4,5];
      const BASE=[['Café',4500],['Sushi',18900],['Pizzería',15990],
        ['Supermercado',1250000],['Supermercado',210000],['Comida rápida',8990]];
      const card=el('div',{class:'card'},
        el('h3',{},'Tratar: cinco caminos'),
        el('p',{class:'note',html:'Seis pedidos. El de <b>$1.250.000</b> es un error (dos ceros de más); '+
          'el de <b>$210.000</b> es una compra grande real. Ningún tratamiento es «el correcto» en general: '+
          'depende de si es error o valor real, y de la pregunta que quieres responder.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const mount=el('div');card.append(mount);
      const stats=el('div',{class:'msg'});card.append(stats);
      const code=codeBox(card);
      const note=el('p',{class:'note'});card.append(note);
      const med=a=>quantile(a,.5);
      const T={
        conservar:{
          after:()=>({columns:COLS,index:IDX,rows:BASE.map(r=>[...r])}),
          col:'monto',
          code:"# nada que hacer: el valor es real y relevante",
          n:'Se <b>conserva</b> lo real y relevante. Pero ojo: aquí el error de $1.250.000 sigue dentro y '+
            'arrastra la media a más de $250.000 por pedido.'},
        eliminar:{
          after:()=>({columns:COLS,index:[0,1,2,4,5],rows:BASE.filter((_,i)=>i!==3).map(r=>[...r])}),
          col:'monto',
          code:"df = df[df['monto'] &lt;= 500_000]   # filtrar con una máscara",
          n:'<b>Eliminar la fila</b>: para errores evidentes que no se pueden corregir y que son pocos. '+
            'Se pierde también el resto de la fila (tipo de local, fecha…).'},
        corregir:{
          after:()=>({columns:COLS,index:IDX,rows:BASE.map(([t,m])=>[t,m>500000?m/100:m])}),
          col:'monto',
          code:"erroneo = df['monto'] &gt; 500_000\ndf['monto_corregido'] = erroneo                    # marcar antes de tocar\ndf.loc[erroneo, 'monto'] = df.loc[erroneo, 'monto'] / 100",
          n:'<b>Corregir</b> cuando la causa se conoce (unidades, decimales, ceros de más). Es lo mejor que puede pasarle a un error.'},
        nulo:{
          after:()=>{
            const resto=BASE.filter(r=>r[1]<=500000).map(r=>r[1]);
            return {columns:[...COLS,'monto_imputado'],index:IDX,
              rows:BASE.map(([t,m])=>[t,m>500000?med(resto):m,m>500000?'True':'False'])};
          },
          col:'monto',
          code:"invalido = df['monto'] &gt; 500_000\ndf['monto_imputado'] = invalido\ndf.loc[invalido, 'monto'] = np.nan\n"+
               "df['monto'] = df['monto'].fillna(df['monto'].median())   # 15990",
          n:'<b>Convertir en NaN e imputar</b> con las herramientas de <a href="#nulos">Valores perdidos</a>: '+
            'el error no se puede corregir, pero el resto de la fila sirve. La mediana se calcula <b>sin</b> el error.'},
        clip:{
          after:()=>({columns:[...COLS,'monto_acotado'],index:IDX,
            rows:BASE.map(([t,m])=>{const c=m>500000?m/100:m;return [t,c,Math.min(c,100000)];})}),
          col:'monto_acotado',
          code:"df.loc[df['monto'] &gt; 500_000, 'monto'] /= 100       # primero los errores\n"+
               "df['monto_acotado'] = df['monto'].clip(upper=100_000)   # en una columna NUEVA",
          n:'<b>Acotar</b> (capping): el $210.000 es real, pero distorsiona el «pedido típico». <code>clip</code> lo deja en el tope. '+
            'Va en una columna nueva: la original sirve para la venta total, la acotada para describir lo típico. '+
            'En la práctica el tope suele ser un percentil: <code>df[\'monto\'].quantile(0.99)</code>.'},
      };
      function pick(k){
        const tr=T[k];
        mount.textContent='';
        const before={columns:COLS,index:IDX,rows:BASE.map(r=>[...r])};
        const after=tr.after();
        dfDiff(mount,before,after,'df  —  rojo: eliminado · verde: cambiado · azul: nuevo');
        const v0=BASE.map(r=>r[1]);
        const ci=after.columns.indexOf(tr.col);
        const v1=after.rows.map(r=>r[ci]);
        stats.innerHTML=`${tr.col}: media ${pesos(mean(v0))} → <b>${pesos(mean(v1))}</b> · `+
          `mediana ${pesos(med(v0))} → <b>${pesos(med(v1))}</b>`;
        code.innerHTML=tr.code;
        note.innerHTML=tr.n;
      }
      btnGroup(ctr,[
        {label:'conservar',value:'conservar'},{label:'eliminar fila',value:'eliminar'},
        {label:'corregir',value:'corregir'},{label:'NaN + imputar',value:'nulo'},
        {label:'acotar con clip',value:'clip'},
      ],pick);
      pick('conservar');
      card.append(el('p',{class:'note',html:'Trabaja sobre una copia (<code>limpio = df.copy()</code>) y '+
        '<b>marca</b> qué filas tocaste antes de modificarlas, igual que al imputar nulos.'}));
    }

    /* ---------- Tarjeta 4: outliers que solo se ven en contexto ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{},'Outliers que solo se ven en contexto'),
        el('p',{class:'note',html:'Hay valores que no son extremos mirando la columna completa, '+
          'pero sí <b>dentro de su grupo</b> o <b>en combinación</b> con otra variable.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const W=640,H=250,L=60,R=20,T=20,B=34;
      const svgWrap=el('div',{style:'overflow-x:auto'});card.append(svgWrap);
      const svg=s('svg',{viewBox:`0 0 ${W} ${H}`,style:'width:100%;max-width:760px;min-width:480px;display:block'});
      svgWrap.append(svg);
      const msg=el('div',{class:'msg'});card.append(msg);
      const code=codeBox(card);
      const note=el('p',{class:'note'});card.append(note);

      const GR={'Café':[3200,3800,4100,4500,4900,5200,15000],
                'Pizzería':[12000,13500,14990,15990,16500,17990,19990]};
      /* distancia (km), tiempo (min), día de lluvia */
      const SC=[[1,18],[1.5,20],[2,22],[2.5,23],[3,26],[3.5,28],[4,30],[4.5,31],[5,35],[6,38],
        [7,43],[8,47],[9,52],[10,57],[9,58],[1.2,48,1],[2,55,1],[3,62,1],[6,70,1]];

      function grupos(porGrupo){
        svg.textContent='';
        const todos=Object.values(GR).flat();
        const x=v=>L+(v-0)/(22000)*(W-L-R);
        [0,5000,10000,15000,20000].forEach(v=>svg.append(
          s('line',{x1:x(v),x2:x(v),y1:T,y2:H-B,class:'gridline'}),
          s('text',{x:x(v),y:H-B+16,'text-anchor':'middle'},'$'+v.toLocaleString('es-CL'))));
        const filas=Object.keys(GR), rowH=(H-T-B)/filas.length;
        let marcados=[];
        const glob=limitesIqr(todos);
        filas.forEach((g,gi)=>{
          const y0=T+gi*rowH+rowH/2;
          svg.append(s('text',{x:L-8,y:y0+4,'text-anchor':'end',style:'font-weight:600;fill:var(--ink2)'},g));
          const [lo,hi]=porGrupo?limitesIqr(GR[g]):glob;
          const xl=Math.max(L,x(lo)),xh=Math.min(W-R,x(hi));
          svg.append(s('rect',{x:xl,y:y0-rowH*.32,width:Math.max(0,xh-xl),height:rowH*.64,rx:6,
            fill:'color-mix(in srgb, var(--s1) 10%, transparent)',stroke:'var(--muted)','stroke-dasharray':'4 4'}));
          GR[g].forEach((v,i)=>{
            const o=v<lo||v>hi; if(o)marcados.push(`${g} ${pesos(v)}`);
            svg.append(s('circle',{cx:x(v),cy:y0+((i%3)-1)*9,r:6,fill:o?'var(--s8)':'var(--s1)','fill-opacity':.85}));
          });
        });
        msg.innerHTML=marcados.length?`<span style="color:var(--s8)">marcados: ${marcados.join(', ')}</span>`:'ningún pedido marcado';
        if(porGrupo){
          code.textContent="df['outlier_en_su_grupo'] = False\nfor tipo in df['tipo_local'].unique():\n"+
            "    del_tipo = df['tipo_local'] == tipo\n    inf, sup = limites_iqr(df.loc[del_tipo, 'monto'])\n"+
            "    fuera = del_tipo & ~df['monto'].between(inf, sup)\n    df.loc[fuera, 'outlier_en_su_grupo'] = True";
          note.innerHTML='Con límites <b>por grupo</b> (zona sombreada) el café de $15.000 salta: es normal en una pizzería, '+
            'pero rarísimo en un café. Para verlo de un vistazo: <code>sns.boxplot(data=df, x=\'tipo_local\', y=\'monto\')</code>.';
        }else{
          code.textContent="inf, sup = limites_iqr(df['monto'])   # una sola franja para todos\ndf[~df['monto'].between(inf, sup)]   # 0 filas";
          note.innerHTML='Con <b>una sola franja</b> para toda la columna, los $15.000 del café quedan escondidos entre las pizzas.';
        }
      }
      function dispersion(){
        svg.textContent='';
        const x=d=>L+d/11*(W-L-R), y=t=>H-B-t/80*(H-T-B);
        [0,20,40,60,80].forEach(t=>svg.append(s('line',{x1:L,x2:W-R,y1:y(t),y2:y(t),class:'gridline'}),
          s('text',{x:L-8,y:y(t)+4,'text-anchor':'end'},t)));
        [0,2,4,6,8,10].forEach(d=>svg.append(s('text',{x:x(d),y:H-B+16,'text-anchor':'middle'},d)));
        svg.append(s('text',{x:(L+W-R)/2,y:H-2,'text-anchor':'middle'},'distancia (km)'),
          s('text',{x:14,y:(T+H-B)/2,'text-anchor':'middle',transform:`rotate(-90 14 ${(T+H-B)/2})`},'tiempo (min)'));
        /* regla: tiempo > 25 + 5·distancia */
        svg.append(s('line',{x1:x(0),y1:y(25),x2:x(11),y2:y(80),stroke:'var(--muted)','stroke-dasharray':'5 4'}),
          s('text',{x:x(10.8),y:y(80)+14,'text-anchor':'end'},'25 + 5·km'));
        SC.forEach(([d,t,ll])=>{
          const c=s('circle',{cx:x(d),cy:y(t),r:6,fill:ll?'var(--s8)':'var(--s1)','fill-opacity':.8});
          const ti=s('title');ti.textContent=`${d} km · ${t} min`+(ll?' · día de lluvia':'');c.append(ti);
          svg.append(c);
        });
        msg.innerHTML='<span style="color:var(--s8)">4 entregas lentas para su distancia: todas de días de lluvia</span>';
        code.textContent="sns.scatterplot(data=df, x='distancia_km', y='tiempo_min')\n\n"+
          "lentas = df[df['tiempo_min'] > 25 + 5 * df['distancia_km']]\nlentas['fecha'].value_counts()   # 09-09 y 23-09: lluvia";
        note.innerHTML='Un tiempo de 48 minutos es normal para un pedido a 8 km, pero muy raro a 1 km. Ninguna columna por separado lo delata; '+
          'el <b>gráfico de dispersión</b> sí. Son reales (lluvia intensa): eliminarlos sería perder justo lo que a operaciones le interesa.';
      }
      btnGroup(ctr,[
        {label:'límites globales',value:'glob'},{label:'límites por grupo',value:'grupo'},
        {label:'dos variables (dispersión)',value:'sc'},
      ],v=>v==='sc'?dispersion():grupos(v==='grupo'));
      grupos(false);
    }

    /* ---------- Tarjeta 5: el orden con nulos ---------- */
    sec.append(el('div',{class:'card'},
      el('h3',{},'Nulos y outliers juntos: el orden importa'),
      el('p',{class:'note',html:'Los outliers mueven la media y la mediana; si imputas los nulos <b>antes</b> de tratar los errores, '+
        'contaminas la imputación. El flujo recomendado:'}),
      el('ol',{class:'note',html:
        '<li><b>Leer</b> y revisar: <code>info()</code>, <code>describe()</code> (mira el mínimo y el máximo: ¿tienen sentido?).</li>'+
        '<li>Convertir <b>nulos disfrazados</b> y <b>errores imposibles</b> en <code>NaN</code>.</li>'+
        '<li>Detectar <b>outliers</b> y decidir: corregir, acotar o conservar.</li>'+
        '<li><b>Imputar</b> los nulos con los datos ya limpios (ver <a href="#nulos">Valores perdidos</a>).</li>'+
        '<li><b>Verificar</b> con gráficos y <code>describe()</code>.</li>'}),
      el('p',{class:'note',html:'El objetivo nunca es que el boxplot quede «sin puntos», sino que '+
        '<b>cada valor extremo que quede tenga una explicación</b>.'})));
  }
});
})();
