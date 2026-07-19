'use strict';
/* Módulo: Visualización — qué gráfico usar, anatomía de la figura matplotlib
   e interfaz pyplot vs OO. Unidad III de 2026-1 (clase 09, Control 2, C5).
   Mini-gráficos según las specs del skill dataviz: un solo tono para magnitud,
   rampa secuencial para el heatmap (tinta fija sobre la rampa), grilla recesiva. */
(function(){
const NS='http://www.w3.org/2000/svg';
const s=(tag,attrs={},text)=>{
  const n=document.createElementNS(NS,tag);
  for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);
  if(text!=null)n.textContent=text;
  return n;
};
/* mini-lienzo estándar: ejes recesivos y área de trazado */
function lienzo(W=380,H=210,L=34,B=26){
  const svg=s('svg',{viewBox:`0 0 ${W} ${H}`,style:'width:100%;max-width:440px;display:block'});
  svg.append(
    s('line',{x1:L,y1:H-B,x2:W-8,y2:H-B,class:'axisline'}),
    s('line',{x1:L,y1:10,x2:L,y2:H-B,class:'axisline'}));
  return {svg,L,B,W,H,pw:W-L-8-4,ph:H-B-14};
}

registerModule({
  id:'viz',
  title:'Visualización',
  lead:'Antes de elegir colores o estilos, la pregunta es qué quieres mostrar: '+
       'esa respuesta elige el gráfico. Aquí está el mapa del curso y la anatomía '+
       'de una figura de Matplotlib.',
  build(sec){

    /* ---------- Tarjeta 1: ¿Qué gráfico uso? ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{},'¿Qué gráfico uso?'),
        el('p',{class:'note',html:'Elige tu <b>objetivo</b> y mira el gráfico que el curso recomienda '+
          '(sección 3 del Control 5: cada pregunta de negocio pide una forma distinta).'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const holder=el('div',{style:'display:flex;gap:1.2rem;flex-wrap:wrap;align-items:flex-start'});
      card.append(holder);
      const chart=el('div',{style:'flex:1 1 300px;min-width:280px'});
      const side=el('div',{style:'flex:1 1 260px;min-width:240px'});
      holder.append(chart,side);
      const code=codeBox(side);
      const note=el('p',{class:'note'});side.append(note);

      const draw={
        hist(){
          const {svg,L,B,H,pw,ph}=lienzo();
          const bins=[2,5,9,12,8,4,1], bw=pw/bins.length, max=12;
          bins.forEach((v,i)=>{
            const h=v/max*ph;
            svg.append(s('rect',{x:L+4+i*bw,y:H-B-h,width:bw-2,height:h,rx:3,
              fill:'var(--s1)'}));
          });
          svg.append(s('text',{x:L+pw/2,y:H-6,'text-anchor':'middle',class:'axistext'},'precio del tour'));
          return svg;
        },
        linea(){
          const {svg,L,B,H,pw,ph}=lienzo();
          const v=[38,42,35,50,64,58,72,80,74,88];
          const x=i=>L+8+i*(pw-12)/(v.length-1), y=k=>H-B-(k/90)*ph;
          [25,50,75].forEach(g=>svg.append(s('line',{x1:L,x2:L+pw,y1:y(g),y2:y(g),class:'gridline'})));
          svg.append(s('path',{d:v.map((k,i)=>(i?'L':'M')+x(i)+','+y(k)).join(' '),
            fill:'none',stroke:'var(--s1)','stroke-width':2}));
          const last=v.length-1;
          svg.append(s('circle',{cx:x(last),cy:y(v[last]),r:4,fill:'var(--s1)'}));
          svg.append(s('text',{x:x(last)-4,y:y(v[last])-8,'text-anchor':'end',class:'axistext'},'88'));
          svg.append(s('text',{x:L+pw/2,y:H-6,'text-anchor':'middle',class:'axistext'},'mes'));
          return svg;
        },
        barras(){
          const {svg,L,B,H,pw,ph}=lienzo();
          const cats=[['Trekking',92],['Kayak',71],['Rafting',55],['Cabalgata',30]];
          const bh=(ph-16)/cats.length;
          cats.forEach(([n,v],i)=>{
            const w=v/100*(pw-70), yy=16+i*bh;
            svg.append(s('rect',{x:L+2,y:yy,width:w,height:bh-8,rx:3,fill:'var(--s1)'}));
            svg.append(s('text',{x:L+w+6,y:yy+bh/2,class:'axistext','dominant-baseline':'middle'},n+' · '+v));
          });
          return svg;
        },
        scatter(){
          const {svg,L,B,H,pw,ph}=lienzo();
          const pts=[[5,20],[10,26],[14,24],[18,35],[24,33],[30,44],[35,40],[42,55],
                     [50,52],[55,63],[62,60],[70,74],[78,70],[85,84]];
          [25,50,75].forEach(g=>svg.append(s('line',{x1:L,x2:L+pw,y1:H-B-g/100*ph,y2:H-B-g/100*ph,class:'gridline'})));
          pts.forEach(([px,py])=>svg.append(s('circle',{
            cx:L+8+px/90*(pw-12),cy:H-B-py/90*ph,r:4.5,fill:'var(--s1)','fill-opacity':.75})));
          svg.append(s('text',{x:L+pw/2,y:H-6,'text-anchor':'middle',class:'axistext'},'duración (h)'));
          return svg;
        },
        heatmap(){
          const svg=s('svg',{viewBox:'0 0 380 210',style:'width:100%;max-width:440px;display:block'});
          /* rampa fija --seq*: la tinta sobre ella también es fija (no var(--ink)) */
          const RAMP=['var(--seq100)','var(--seq200)','var(--seq300)','var(--seq400)','var(--seq500)','var(--seq600)','var(--seq700)'];
          const INK=['#0b0b0b','#0b0b0b','#0b0b0b','#fff','#fff','#fff','#fff'];
          const vals=[[12,35,60,88],[25,48,74,95],[8,20,42,66]];
          const rows=['Centro','San Pedro','Talcahuano'],colsq=['T1','T2','T3','T4'];
          const cw=70,ch=52,X0=96,Y0=26;
          vals.forEach((row,r)=>{
            svg.append(s('text',{x:X0-8,y:Y0+r*ch+ch/2,'text-anchor':'end',class:'axistext','dominant-baseline':'middle'},rows[r]));
            row.forEach((v,c)=>{
              const step=Math.min(6,Math.floor(v/100*7));
              svg.append(s('rect',{x:X0+c*cw,y:Y0+r*ch,width:cw-3,height:ch-3,rx:4,fill:RAMP[step]}));
              /* tinta fija sobre la rampa fija (no var(--ink)): regla del proyecto */
              svg.append(s('text',{x:X0+c*cw+(cw-3)/2,y:Y0+r*ch+ch/2,'text-anchor':'middle',
                'dominant-baseline':'middle',style:`font-size:12px;font-weight:600;fill:${INK[step]}`},v));
            });
          });
          colsq.forEach((q,c)=>svg.append(s('text',{x:X0+c*cw+(cw-3)/2,y:Y0-8,'text-anchor':'middle',class:'axistext'},q)));
          return svg;
        },
        torta(){
          const svg=s('svg',{viewBox:'0 0 380 210',style:'width:100%;max-width:440px;display:block'});
          const cx=140,cy=105,R=78;
          const parts=[['Trekking',52,'var(--s1)'],['Kayak',31,'var(--s2)'],['Rafting',17,'var(--s3)']];
          let a0=-Math.PI/2;
          parts.forEach(([n,p,c])=>{
            const a1=a0+p/100*2*Math.PI;
            const x0=cx+R*Math.cos(a0),y0=cy+R*Math.sin(a0);
            const x1=cx+R*Math.cos(a1),y1=cy+R*Math.sin(a1);
            svg.append(s('path',{d:`M${cx},${cy} L${x0},${y0} A${R},${R} 0 ${p>50?1:0} 1 ${x1},${y1} Z`,
              fill:c,stroke:'var(--surface)','stroke-width':2}));
            const am=(a0+a1)/2;
            svg.append(s('text',{x:cx+(R+26)*Math.cos(am),y:cy+(R+26)*Math.sin(am),
              'text-anchor':'middle',class:'axistext'},`${n} ${p}%`));
            a0=a1;
          });
          return svg;
        },
      };
      const INFO={
        hist:{t:'Distribución de una variable numérica',c:"plt.hist(df['precio'], bins=20)\nplt.xlabel('precio del tour')",
          n:'El histograma muestra <b>cómo se reparte</b> una variable: ¿simétrica, sesgada, con dos grupos? '+
            'Es la pregunta 3.1 del Control 5. Su hermano resumido es el boxplot del <a href="#outliers">módulo Outliers</a>.'},
        linea:{t:'Evolución en el tiempo',c:"df_mes = df.resample('ME')['ventas'].sum()\nplt.plot(df_mes.index, df_mes.values)",
          n:'La línea es para <b>series temporales</b>: meses, semanas, años en el eje x. '+
            'Pregunta 3.4 del Control 5 («¿se recuperó el turismo tras la pandemia?»). '+
            'El eje temporal sale de <a href="#fechas">resample</a>.'},
        barras:{t:'Comparar categorías',c:"conteo = df['actividad'].value_counts()\nplt.barh(conteo.index, conteo.values)",
          n:'Barras para <b>comparar cantidades entre categorías</b> — ordénalas de mayor a menor '+
            '(value_counts ya lo hace). Horizontales si los nombres son largos. Un solo color: '+
            'la identidad ya la dan las etiquetas.'},
        scatter:{t:'Relación entre dos numéricas',c:"plt.scatter(df['duracion'], df['precio'], alpha=0.6)",
          n:'La dispersión revela <b>correlaciones</b>: ¿a más duración, más precio? '+
            'Con muchos puntos usa <code>alpha</code> para ver la densidad. Es el paso previo '+
            'a la matriz de correlación del Control 5.'},
        heatmap:{t:'Dos categorías × una magnitud',c:"tabla = pd.pivot_table(df, values='ventas',\n        index='sucursal', columns='trimestre')\nsns.heatmap(tabla, annot=True, cmap='Blues')",
          n:'El heatmap pinta una <b>tabla cruzada</b>: el color codifica magnitud con UNA rampa '+
            '(claro→oscuro), nunca un arcoíris. Es el pivote del <a href="#groupby">módulo GroupBy</a> con color, '+
            'y la pregunta 3.2 del Control 5 (matriz de correlación).'},
        torta:{t:'Composición (pocas partes)',c:"plt.pie(partes, labels=nombres, autopct='%1.0f%%')",
          n:'La torta solo funciona con <b>pocas categorías</b> (≤4) que suman 100%. '+
            'Con más partes o valores parecidos, el ojo compara mal ángulos: prefiere barras. '+
            'El curso la enseña — y también sus límites.'},
      };
      function pick(k){
        chart.textContent='';
        chart.append(el('div',{class:'note',style:'font-weight:600;margin-bottom:.3rem'},INFO[k].t));
        chart.append(draw[k]());
        code.textContent=INFO[k].c;
        note.innerHTML=INFO[k].n;
      }
      btnGroup(ctr,[
        {label:'📊 distribución',value:'hist'},{label:'📈 evolución temporal',value:'linea'},
        {label:'🏷️ comparar categorías',value:'barras'},{label:'⚬⚬ relación entre variables',value:'scatter'},
        {label:'🔥 tabla cruzada',value:'heatmap'},{label:'🥧 composición',value:'torta'},
      ],pick);
      pick('hist');
    }

    /* ---------- Tarjeta 2: anatomía de la figura ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{},'Anatomía de una figura'),
        el('p',{class:'note',html:'Cada pieza de un gráfico tiene su línea de código. '+
          'Haz clic en una parte para ver quién la dibuja.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const W=560,H=300,L=64,B=46,T=40,R=20;
      const svg=s('svg',{viewBox:`0 0 ${W} ${H}`,style:'width:100%;max-width:640px;display:block'});
      card.append(svg);
      const code=codeBox(card);
      const pw=W-L-R, ph=H-T-B;
      const x=i=>L+10+i*(pw-20)/9, y=v=>H-B-(v/100)*ph;
      const centro=[38,42,35,50,64,58,72,80,74,88], sanpedro=[30,28,34,40,38,49,55,52,60,66];
      const G={};
      G.grid=s('g');[25,50,75].forEach(g=>G.grid.append(s('line',{x1:L,x2:W-R,y1:y(g),y2:y(g),class:'gridline'})));
      G.ejes=s('g');
      G.ejes.append(s('line',{x1:L,y1:H-B,x2:W-R,y2:H-B,class:'axisline'}),
                    s('line',{x1:L,y1:T,x2:L,y2:H-B,class:'axisline'}));
      G.ticks=s('g');
      'EFMAMJJASO'.split('').forEach((m,i)=>G.ticks.append(s('text',{x:x(i),y:H-B+16,'text-anchor':'middle',class:'axistext'},m)));
      [0,25,50,75,100].forEach(v=>G.ticks.append(s('text',{x:L-8,y:y(v)+4,'text-anchor':'end',class:'axistext'},v)));
      G.serie=s('g');
      G.serie.append(
        s('path',{d:centro.map((k,i)=>(i?'L':'M')+x(i)+','+y(k)).join(' '),fill:'none',stroke:'var(--s1)','stroke-width':2}),
        s('path',{d:sanpedro.map((k,i)=>(i?'L':'M')+x(i)+','+y(k)).join(' '),fill:'none',stroke:'var(--s2)','stroke-width':2}));
      G.titulo=s('g');G.titulo.append(s('text',{x:L,y:22,style:'font-weight:700;font-size:15px;fill:var(--ink)'},'Ventas cafetería 2026'));
      G.xlabel=s('g');G.xlabel.append(s('text',{x:L+pw/2,y:H-8,'text-anchor':'middle',class:'axistext'},'mes'));
      G.ylabel=s('g');G.ylabel.append(s('text',{x:16,y:T+ph/2,class:'axistext',transform:`rotate(-90 16 ${T+ph/2})`,'text-anchor':'middle'},'miles de $'));
      G.leyenda=s('g');
      const ly=T+8;
      G.leyenda.append(
        s('rect',{x:W-R-150,y:ly-12,width:132,height:44,rx:6,fill:'var(--surface)',stroke:'var(--border)'}),
        s('line',{x1:W-R-140,x2:W-R-118,y1:ly,y2:ly,stroke:'var(--s1)','stroke-width':2}),
        s('text',{x:W-R-112,y:ly+4,class:'axistext'},'Centro'),
        s('line',{x1:W-R-140,x2:W-R-118,y1:ly+20,y2:ly+20,stroke:'var(--s2)','stroke-width':2}),
        s('text',{x:W-R-112,y:ly+24,class:'axistext'},'San Pedro'));
      Object.values(G).forEach(g=>svg.append(g));
      const FULL={
        titulo:"ax.set_title('Ventas cafetería 2026')",
        serie:"ax.plot(meses, centro, label='Centro')\nax.plot(meses, sanpedro, label='San Pedro')",
        leyenda:"ax.legend()",
        xlabel:"ax.set_xlabel('mes')",
        ylabel:"ax.set_ylabel('miles de $')",
        ticks:"ax.set_xticks(range(10), list('EFMAMJJASO'))",
        grid:"ax.grid(alpha=0.3)",
        ejes:"fig, ax = plt.subplots()   # la figura y sus ejes (el lienzo)",
      };
      function hl(k){
        Object.entries(G).forEach(([kk,g])=>{g.style.opacity=(k===kk)?1:.25;g.style.transition='opacity .3s';});
        code.innerHTML=Object.entries(FULL).map(([kk,c])=>kk===k?`<b>${c}</b>`:c).join('\n');
      }
      btnGroup(ctr,[
        {label:'título',value:'titulo'},{label:'series',value:'serie'},{label:'leyenda',value:'leyenda'},
        {label:'xlabel',value:'xlabel'},{label:'ylabel',value:'ylabel'},{label:'ticks',value:'ticks'},
        {label:'grilla',value:'grid'},{label:'ejes (ax)',value:'ejes'},
      ],hl,false);
      code.textContent=Object.values(FULL).join('\n');
      card.append(el('p',{class:'note',html:'Dos series ⇒ <b>leyenda obligatoria</b>; un color por serie '+
        'y ese color <b>no cambia</b> aunque filtres. La grilla va tenue: es apoyo, no protagonista.'}));
    }

    /* ---------- Tarjeta 3: pyplot vs interfaz OO ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{html:'<code>plt.plot</code> vs <code>fig, ax</code> (interfaz OO)'}),
        el('p',{class:'note',html:'Las dos interfaces dibujan lo mismo. La clase 09 recomienda la '+
          '<b>orientada a objetos</b>: cada gráfico vive en su <code>ax</code> y los subgráficos son triviales.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const holder=el('div',{style:'display:flex;gap:1.2rem;flex-wrap:wrap;align-items:flex-start'});
      card.append(holder);
      const cchart=el('div',{style:'flex:0 1 340px;min-width:260px'});
      const ccode=el('div',{style:'flex:1 1 300px;min-width:260px'});
      holder.append(cchart,ccode);
      const code=codeBox(ccode);
      const note=el('p',{class:'note'});ccode.append(note);
      function mini(){
        const {svg,L,B,H,pw,ph}=lienzo(300,170,30,22);
        const v=[35,50,44,66,60,80];
        const xx=i=>L+8+i*(pw-12)/(v.length-1), yy=k=>H-B-(k/90)*ph;
        svg.append(s('path',{d:v.map((k,i)=>(i?'L':'M')+xx(i)+','+yy(k)).join(' '),
          fill:'none',stroke:'var(--s1)','stroke-width':2}));
        return svg;
      }
      function panel4(){
        const wrap=el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:.4rem'});
        for(let i=0;i<4;i++){
          const {svg,L,B,H,pw,ph}=lienzo(150,95,20,14);
          const v=Array.from({length:6},(_,j)=>20+((i*13+j*29)%60));
          const xx=k=>L+4+k*(pw-8)/5, yy=k=>H-B-(k/90)*ph;
          svg.append(s('path',{d:v.map((k,j)=>(j?'L':'M')+xx(j)+','+yy(k)).join(' '),
            fill:'none',stroke:['var(--s1)','var(--s2)','var(--s3)','var(--s4)'][i],'stroke-width':2}));
          wrap.append(svg);
        }
        return wrap;
      }
      const MODOS={
        plt:{draw:mini,c:"plt.plot(meses, ventas)\nplt.title('Ventas')\nplt.xlabel('mes')\nplt.show()",
          n:'La interfaz <b>pyplot</b> dibuja sobre «la figura actual» implícita. Cómoda para un gráfico rápido, '+
            'confusa cuando hay varios.'},
        oo:{draw:mini,c:"fig, ax = plt.subplots()\nax.plot(meses, ventas)\nax.set_title('Ventas')\nax.set_xlabel('mes')",
          n:'La interfaz <b>OO</b>: pides la figura y sus ejes, y cada orden va dirigida a un <code>ax</code> '+
            'específico. Es la forma recomendada del curso — y nota que los métodos cambian a <code>set_*</code>.'},
        sub:{draw:panel4,c:"fig, axs = plt.subplots(2, 2, figsize=(10, 6))\naxs[0, 0].plot(x, ventas)\naxs[0, 1].plot(x, costos)\naxs[1, 0].plot(x, clientes)\naxs[1, 1].plot(x, margen)",
          n:'Con OO los <b>subgráficos</b> son una grilla de axes: <code>axs[fila, columna]</code>. '+
            'Cuatro medidas distintas = cuatro paneles, jamás dos escalas en un mismo eje.'},
      };
      function pick(k){
        cchart.textContent='';cchart.append(MODOS[k].draw());
        code.textContent=MODOS[k].c;note.innerHTML=MODOS[k].n;
      }
      btnGroup(ctr,[
        {label:'pyplot (implícita)',value:'plt'},{label:'fig, ax (OO)',value:'oo'},
        {label:'subplots 2×2',value:'sub'},
      ],pick);
      pick('plt');
    }
  }
});
})();
