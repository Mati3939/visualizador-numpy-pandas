'use strict';
/* Módulo: Visualización — qué gráfico usar, anatomía de la figura matplotlib
   e interfaz pyplot vs OO.
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
       'esa respuesta elige el gráfico. Aquí está el mapa completo, la anatomía '+
       'de una figura de Matplotlib, seaborn y cómo no mentir con la escala.',
  build(sec){

    /* ---------- Tarjeta 1: ¿Qué gráfico uso? ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{},'¿Qué gráfico uso?'),
        el('p',{class:'note',html:'Elige tu <b>objetivo</b> y mira el gráfico que le corresponde: '+
          'cada pregunta pide una forma distinta. El código muestra la versión de <b>matplotlib</b> y la de <b>seaborn</b>.'}));
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
        box(){
          const {svg,L,B,H,pw,ph}=lienzo();
          /* tres zonas: [bigote inf, Q1, mediana, Q3, bigote sup, atípicos] en minutos */
          const G=[['Centro',[12,20,26,31,42,[55]]],['San Pedro',[18,27,33,40,52,[]]],['Talcahuano',[10,15,19,24,33,[47,51]]]];
          const y=v=>H-B-(v/60)*ph, cw=pw/G.length;
          [15,30,45].forEach(g=>svg.append(s('line',{x1:L,x2:L+pw,y1:y(g),y2:y(g),class:'gridline'})));
          G.forEach(([n,[lo,q1,me,q3,hi,outs]],i)=>{
            const cx=L+cw*i+cw/2, bw=cw*.42;
            svg.append(
              s('line',{x1:cx,x2:cx,y1:y(lo),y2:y(q1),class:'axisline'}),
              s('line',{x1:cx,x2:cx,y1:y(q3),y2:y(hi),class:'axisline'}),
              s('line',{x1:cx-bw/4,x2:cx+bw/4,y1:y(lo),y2:y(lo),class:'axisline'}),
              s('line',{x1:cx-bw/4,x2:cx+bw/4,y1:y(hi),y2:y(hi),class:'axisline'}),
              s('rect',{x:cx-bw/2,y:y(q3),width:bw,height:y(q1)-y(q3),rx:3,
                fill:'color-mix(in srgb, var(--s1) 22%, transparent)',stroke:'var(--s1)'}),
              s('line',{x1:cx-bw/2,x2:cx+bw/2,y1:y(me),y2:y(me),stroke:'var(--s1)','stroke-width':2.5}),
              s('text',{x:cx,y:H-8,'text-anchor':'middle',class:'axistext'},n));
            outs.forEach(o=>svg.append(s('circle',{cx,cy:y(o),r:4,fill:'none',stroke:'var(--s8)','stroke-width':1.6})));
          });
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
        hist:{t:'¿Cómo se distribuye una variable?',
          c:`# matplotlib
ax.hist(df['precio'], bins=20)
# seaborn
sns.histplot(data=df, x='precio', bins=20)`,
          n:'El histograma muestra <b>cómo se reparte</b> una variable: ¿simétrica, sesgada, con dos grupos? '+
            'Valores aislados lejos del grueso son candidatos a <a href="#outliers">outliers</a>.'},
        linea:{t:'¿Cómo cambia en el tiempo?',
          c:`# matplotlib
mensual = df.resample('ME', on='fecha')['ventas'].sum()
ax.plot(mensual.index, mensual.values)
# seaborn
sns.lineplot(data=df, x='fecha', y='ventas')`,
          n:'La línea es para <b>series temporales</b>: meses, semanas, años en el eje x. '+
            'Responde «¿subió o bajó?». El eje temporal sale de <a href="#fechas">resample</a>.'},
        barras:{t:'¿Cómo se comparan las categorías?',
          c:`# matplotlib
conteo = df['actividad'].value_counts()
ax.barh(conteo.index, conteo.values)
# seaborn
sns.countplot(data=df, y='actividad')            # cuenta filas
sns.barplot(data=df, x='actividad', y='precio')  # promedia y`,
          n:'Barras para <b>comparar cantidades entre categorías</b>, ordenadas de mayor a menor '+
            '(value_counts ya lo hace). Horizontales si los nombres son largos. Las barras <b>parten en 0</b>.'},
        box:{t:'¿Cómo se comparan distribuciones entre grupos? ¿Hay atípicos?',
          c:`# matplotlib
ax.boxplot([df.loc[df['zona'] == z, 'minutos'] for z in zonas])
# seaborn
sns.boxplot(data=df, x='zona', y='minutos', hue='zona')
sns.violinplot(data=df, x='zona', y='minutos')   # variante`,
          n:'Caja = Q1 a Q3, raya = <b>mediana</b>, bigotes hasta 1.5·IQR y los puntos sueltos son los atípicos. '+
            'Brilla al <b>comparar grupos</b>; el criterio está animado en <a href="#outliers">Outliers</a>.'},
        scatter:{t:'¿Se relacionan dos variables numéricas?',
          c:`# matplotlib
ax.scatter(df['duracion'], df['precio'], alpha=0.6)
# seaborn
sns.scatterplot(data=df, x='duracion', y='precio', hue='region')`,
          n:'La dispersión revela <b>relaciones</b>: ¿a más duración, más precio? '+
            'Con muchos puntos usa <code>alpha</code>; con <code>hue</code> seaborn colorea por categoría y agrega la leyenda.'},
        heatmap:{t:'¿Cómo varía un valor en dos dimensiones? ¿Qué se correlaciona?',
          c:`tabla = pd.pivot_table(df, values='ventas',
        index='sucursal', columns='trimestre')
sns.heatmap(tabla, annot=True, fmt='.0f', cmap='Blues')

sns.heatmap(df.corr(numeric_only=True), annot=True,
            fmt='.2f', cmap='coolwarm', vmin=-1, vmax=1)`,
          n:'El heatmap pinta una <b>tabla</b>: <code>annot=True</code> escribe el número, <code>fmt</code> su formato. '+
            'Rampa secuencial si va de 0 a más; divergente (<code>coolwarm</code>, con <code>vmin=-1, vmax=1</code>) para correlaciones.'},
        torta:{t:'¿Cómo se reparte un total (pocas partes)?',
          c:`ax.pie(partes, labels=nombres, autopct='%1.0f%%', startangle=90)
# seaborn no tiene torta`,
          n:'La torta solo funciona con <b>pocas categorías</b> que suman 100%. '+
            'Con muchas partes o valores parecidos, el ojo compara mal los ángulos: prefiere barras.'},
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
        {label:'🏷️ comparar categorías',value:'barras'},{label:'📦 distribución por grupo',value:'box'},{label:'⚬⚬ relación entre variables',value:'scatter'},
        {label:'🔥 tabla cruzada',value:'heatmap'},{label:'🥧 composición',value:'torta'},
      ],pick);
      pick('hist');
      card.append(el('p',{class:'note',html:'<b>Antes de entregar un gráfico:</b> ¿tiene título (idealmente con la conclusión)? '+
        '¿Ejes con nombre y unidades? Si hay varias series, ¿leyenda? ¿Escala honesta (barras desde 0, ejes compartidos al comparar)? '+
        '¿Los colores ayudan o distraen?'}));
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
        el('p',{class:'note',html:'Las dos interfaces dibujan lo mismo, pero conviene la '+
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
            'específico. Es la forma recomendada — y nota que los métodos cambian a <code>set_*</code>.'},
        sub:{draw:panel4,c:"fig, axs = plt.subplots(2, 2, figsize=(10, 6))\naxs[0, 0].plot(x, ventas)\naxs[0, 1].plot(x, costos)\naxs[1, 0].plot(x, clientes)\naxs[1, 1].plot(x, margen)",
          n:'Con OO los <b>subgráficos</b> son una grilla de axes: <code>axs[fila, columna]</code>. '+
            'Cuatro medidas distintas = cuatro paneles. Si los paneles miden <b>lo mismo</b> (ventas de cada sucursal), '+
            '<code>sharey=True</code> les da la misma escala: sin ella cada uno ajusta la suya y la comparación engaña. '+
            'Cierra con <code>plt.tight_layout()</code> para que los títulos no se pisen.'},
        sns:{draw:panelSns,c:"fig, axes = plt.subplots(1, 2, figsize=(12, 4))\nsns.barplot(data=df, x='sucursal', y='ventas', ax=axes[0])\naxes[0].set_title('Venta diaria promedio')\nsns.barplot(data=df, x='sucursal', y='ticket', ax=axes[1])\naxes[1].set_title('Ticket promedio')\nplt.tight_layout()",
          n:'Las funciones de seaborn reciben <code>ax=</code> para dibujar en un subgráfico específico. '+
            'Ojo: <code>axes</code> de <code>subplots(1, 2)</code> es 1D (<code>axes[0]</code>); el de <code>subplots(2, 2)</code> es 2D (<code>axes[0, 1]</code>).'},
      };
      function panelSns(){
        const wrap=el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:.4rem'});
        [[52,38,61],[9.1,12.4,7.8]].forEach((vals,i)=>{
          const {svg,L,B,H,pw,ph}=lienzo(150,110,20,16);
          const max=Math.max(...vals)*1.15, bw=pw/vals.length;
          vals.forEach((v,j)=>{const h=v/max*ph;
            svg.append(s('rect',{x:L+4+j*bw,y:H-B-h,width:bw-8,height:h,rx:2,fill:'var(--s1)'}));});
          svg.append(s('text',{x:L+pw/2,y:9,'text-anchor':'middle',class:'axistext'},i?'axes[1]':'axes[0]'));
          wrap.append(svg);
        });
        return wrap;
      }
      function pick(k){
        cchart.textContent='';cchart.append(MODOS[k].draw());
        code.textContent=MODOS[k].c;note.innerHTML=MODOS[k].n;
      }
      btnGroup(ctr,[
        {label:'pyplot (implícita)',value:'plt'},{label:'fig, ax (OO)',value:'oo'},
        {label:'subplots 2×2',value:'sub'},{label:'seaborn con ax=',value:'sns'},
      ],pick);
      pick('plt');
    }

    /* ---------- Tarjeta 4: seaborn con data, x, y, hue ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{html:'Seaborn: <code>data=</code>, <code>x=</code>, <code>y=</code>, <code>hue=</code>'}),
        el('p',{class:'note',html:'Seaborn trabaja directo sobre el DataFrame: le das el <code>data</code> y los '+
          '<b>nombres</b> de las columnas. <code>hue</code> colorea por una categoría y arma la leyenda solo.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const holder=el('div',{style:'display:flex;gap:1.2rem;flex-wrap:wrap;align-items:flex-start'});
      card.append(holder);
      const chart=el('div',{style:'flex:1 1 300px;min-width:280px'});
      const side=el('div',{style:'flex:1 1 260px;min-width:240px'});
      holder.append(chart,side);
      const code=codeBox(side);
      const note=el('p',{class:'note'});side.append(note);
      /* préstamos de bicicletas: [temperatura, viajes, tipo de día (0 hábil / 1 fin de semana)] */
      const P=[[8,40,0],[10,52,0],[12,60,0],[14,71,0],[16,80,0],[18,88,0],[20,97,0],[22,104,0],
               [9,22,1],[11,30,1],[13,38,1],[15,47,1],[17,55,1],[19,63,1],[21,70,1],[23,78,1]];
      const COL=['var(--s1)','var(--s2)'], LAB=['hábil','fin de semana'];
      function scatter(hue){
        const {svg,L,B,H,pw,ph}=lienzo();
        const x=v=>L+8+(v-6)/19*(pw-12), y=v=>H-B-(v/115)*ph;
        [25,50,75,100].forEach(g=>svg.append(s('line',{x1:L,x2:L+pw,y1:y(g),y2:y(g),class:'gridline'})));
        P.forEach(([tt,v,d])=>svg.append(s('circle',{cx:x(tt),cy:y(v),r:4.5,fill:hue?COL[d]:'var(--s1)','fill-opacity':.8})));
        if(hue)LAB.forEach((l,i)=>{svg.append(s('circle',{cx:L+14,cy:18+i*16,r:4.5,fill:COL[i]}),
          s('text',{x:L+24,y:22+i*16,class:'axistext'},l));});
        svg.append(s('text',{x:L+pw/2,y:H-6,'text-anchor':'middle',class:'axistext'},'temperatura (°C)'));
        return svg;
      }
      function barras(tipo){
        const {svg,L,B,H,pw,ph}=lienzo();
        const grupos=[P.filter(p=>!p[2]),P.filter(p=>p[2])];
        const vals=tipo==='count'?grupos.map(g=>g.length):grupos.map(g=>g.reduce((a,p)=>a+p[1],0)/g.length);
        const max=tipo==='count'?10:100, bw=pw/2;
        vals.forEach((v,i)=>{
          const h=v/max*ph, cx=L+i*bw+bw/2;
          svg.append(s('rect',{x:L+16+i*bw,y:H-B-h,width:bw-32,height:h,rx:3,fill:'var(--s1)'}),
            s('text',{x:cx+18,y:H-B-h-6,'text-anchor':'start',class:'axistext'},tipo==='count'?String(v):v.toFixed(1).replace('.',',')),
            s('text',{x:cx,y:H-8,'text-anchor':'middle',class:'axistext'},LAB[i]));
          if(tipo==='bar') /* rayita de error: intervalo de confianza que seaborn agrega por defecto */
            svg.append(s('line',{x1:cx,x2:cx,y1:H-B-(v+9)/max*ph,y2:H-B-(v-9)/max*ph,stroke:'var(--ink2)','stroke-width':1.5}));
        });
        return svg;
      }
      const MODOS={
        sinhue:{d:()=>scatter(false),c:"sns.scatterplot(data=df, x='temperatura', y='viajes')",
          n:'Una nube que sube: más calor, más viajes. Pero se ven <b>dos rectas mezcladas</b>… ¿por qué?'},
        hue:{d:()=>scatter(true),c:"sns.scatterplot(data=df, x='temperatura', y='viajes',\n                hue='tipo_dia')",
          n:'Con <code>hue=\'tipo_dia\'</code> aparece la explicación: los fines de semana hay menos viajes a la misma temperatura. '+
            'En matplotlib habría que filtrar cada grupo y llamar <code>ax.scatter</code> dos veces, con su <code>label</code> y su <code>legend()</code>.'},
        bar:{d:()=>barras('bar'),c:"sns.barplot(data=df, x='tipo_dia', y='viajes')\n# altura = PROMEDIO de viajes; la rayita = intervalo de confianza\n# (errorbar=None la quita)",
          n:'<code>sns.barplot</code> <b>resume solo</b>: agrupa por <code>x</code> y dibuja el <b>promedio</b> de <code>y</code>. '+
            'Equivale a <code>df.groupby(\'tipo_dia\')[\'viajes\'].mean()</code> + <code>ax.bar</code>.'},
        count:{d:()=>barras('count'),c:"sns.countplot(data=df, x='tipo_dia')\n# altura = cantidad de FILAS de cada categoría",
          n:'<code>sns.countplot</code> no lleva <code>y</code>: <b>cuenta filas</b> por categoría, como '+
            '<code>value_counts()</code>. Confundir barplot con countplot es un error clásico.'},
      };
      const pick=k=>{chart.textContent='';chart.append(MODOS[k].d());code.textContent=MODOS[k].c;note.innerHTML=MODOS[k].n;};
      btnGroup(ctr,[
        {label:'scatterplot',value:'sinhue'},{label:"+ hue='tipo_dia'",value:'hue'},
        {label:'barplot (promedia)',value:'bar'},{label:'countplot (cuenta)',value:'count'},
      ],pick);
      pick('sinhue');
    }

    /* ---------- Tarjeta 5: escala honesta y anotaciones ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{html:'Escala honesta y anotaciones: <code>set_ylim</code> y <code>bar_label</code>'}),
        el('p',{class:'note',html:'Venta diaria promedio (millones) de tres sucursales. Cambia dónde parte el eje y '+
          'y mira cómo la misma diferencia parece enorme o pequeña.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const holder=el('div',{style:'display:flex;gap:1.2rem;flex-wrap:wrap;align-items:flex-start'});
      card.append(holder);
      const chart=el('div',{style:'flex:1 1 300px;min-width:280px'});
      const side=el('div',{style:'flex:1 1 260px;min-width:240px'});
      holder.append(chart,side);
      const code=codeBox(side);
      const note=el('p',{class:'note'});side.append(note);
      const V=[['Temuco',6.2],['Osorno',5.6],['Pto. Montt',5.9]];
      let desde0=true, etiquetas=false;
      function draw(){
        chart.textContent='';
        const {svg,L,B,H,pw,ph}=lienzo();
        const y0=desde0?0:5.4, y1=desde0?7:6.5;
        const y=v=>H-B-(v-y0)/(y1-y0)*ph, bw=pw/V.length;
        const ticks=desde0?[0,2,4,6]:[5.4,5.6,5.8,6.0,6.2,6.4];
        ticks.forEach(g=>svg.append(s('line',{x1:L,x2:L+pw,y1:y(g),y2:y(g),class:'gridline'}),
          s('text',{x:L-5,y:y(g)+4,'text-anchor':'end',class:'axistext'},g.toFixed(desde0?0:1).replace('.',','))));
        V.forEach(([n,v],i)=>{
          svg.append(s('rect',{x:L+12+i*bw,y:y(v),width:bw-24,height:H-B-y(v),rx:3,fill:'var(--s1)'}),
            s('text',{x:L+i*bw+bw/2,y:H-8,'text-anchor':'middle',class:'axistext'},n));
          if(etiquetas)svg.append(s('text',{x:L+i*bw+bw/2,y:y(v)-6,'text-anchor':'middle',
            style:'font-weight:700;fill:var(--ink)'},v.toFixed(2)));
        });
        chart.append(svg);
        code.innerHTML="fig, ax = plt.subplots()\nax.bar(sucursales, ventas)\n"+
          (etiquetas?"<b>ax.bar_label(ax.containers[0], fmt='%.2f')</b>   # número sobre cada barra\n":"")+
          (desde0?"ax.set_ylim(0, 7)":"<b>ax.set_ylim(5.4, 6.5)</b>   # ⚠️ las barras ya no parten en 0");
        note.innerHTML=desde0
          ?'Las barras parten en <b>0</b>: su largo es proporcional al valor. Temuco vende ~10% más que Osorno, y así se ve.'
          :'Con el eje cortado en 5,4, Temuco <b>parece</b> vender cuatro veces lo de Osorno. En barras la escala debe partir en 0; '+
           'un eje recortado solo es aceptable en líneas.';
      }
      const bEje=el('button',{class:'btn',onclick:()=>{desde0=!desde0;bEje.textContent=desde0?'✂️ cortar el eje y':'↺ eje desde 0';draw();}},'✂️ cortar el eje y');
      const bLab=el('button',{class:'btn',onclick:()=>{etiquetas=!etiquetas;bLab.classList.toggle('on',etiquetas);draw();}},'🔢 bar_label');
      ctr.append(bEje,bLab);
      draw();
    }
  }
});
})();
