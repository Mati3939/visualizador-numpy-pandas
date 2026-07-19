'use strict';
/* Boss final (idea 12): un DataFrame corrupto se sana con cada operación
   correcta. 6 rondas = el pipeline del Certamen 2. Salidas verificadas
   (mediana de monto 12990; mediana de edad con el 950 adentro = 34). */
(function(){

/* estados del df por ronda (before/after de cada curación) */
const D0={columns:['id','fecha','ciudad','monto','edad'],
  index:[0,1,2,3,4,5,6,7],
  rows:[
    [101,'15-03-2026','stgo',12990,34],
    [102,'02-04-2026','CONCE',null,27],
    [102,'02-04-2026','CONCE',null,27],
    [103,'28-03-2026','stgo',8990,950],
    [104,'10-05-2026','Conce  ',15990,41],
    [105,'07-04-2026','STGO',null,19],
    [106,'19-05-2026','conce',22990,33],
    [107,'30-04-2026','stgo',7490,52]]};
const D1={...D0,index:[0,1,3,4,5,6,7],
  rows:D0.rows.filter((_,i)=>i!==2)};
const D2={...D1,rows:D1.rows.map(r=>[r[0],r[1],r[2],r[3]??12990,r[4]])};
const D3={...D2,rows:D2.rows.map(r=>[r[0],r[1],r[2],r[3],r[4]===950?34:r[4]])};
const D4={...D3,rows:D3.rows.map(r=>[r[0],r[1],r[2].trim().toLowerCase(),r[3],r[4]])};
const ISO=f=>f.split('-').reverse().join('-');
const D5={...D4,rows:D4.rows.map(r=>[r[0],ISO(r[1]),r[2],r[3],r[4]])};
const D6={columns:[...D5.columns,'nombre'],index:D5.index,
  rows:D5.rows.map(r=>[...r,({101:'Ana',102:'Beto',103:'Carla',104:'Dani',105:'Elisa',107:'Gino'})[r[0]]??null])};

const RONDAS=[
 {mal:'🧟 El jefe clonó una boleta: la fila 2 es una copia exacta de la fila 1.',
  meta:'Elimina los duplicados exactos sin tocar el resto.',
  ops:["df.drop_duplicates()","df.duplicated()","df.dropna()"],ok:0,
  explica:"<code>duplicated()</code> solo <b>marca</b> (devuelve booleanos, no limpia) y <code>dropna()</code> "+
   "ataca nulos, no copias. <code>drop_duplicates()</code> conserva la primera aparición y bota el clon.",
  before:D0,after:D1},
 {mal:'👻 Quedan 2 montos NaN — el jefe se alimenta de nulos.',
  meta:'Rellena los montos sin perder filas y sin inventar compras gratis.',
  ops:["df['monto'] = df['monto'].fillna(df['monto'].median())","df = df.dropna()","df['monto'] = df['monto'].fillna(0)"],ok:0,
  explica:"<code>dropna()</code> sacrificaría 2 de 7 filas (¡28%!) y <code>fillna(0)</code> inventa compras "+
   "de $0 que hunden el promedio. La <b>mediana</b> (12 990) imputa sin distorsionar — el criterio del Control 3.",
  before:D1,after:D2},
 {mal:'👹 Un cliente dice tener 950 años. El jefe ruge con energía de outlier.',
  meta:'Neutraliza la edad imposible sin eliminar al cliente.',
  ops:["df.loc[df['edad'] > 120, 'edad'] = df['edad'].median()","df = df.sort_values('edad')","df['edad'] = df['edad'].fillna(34)"],ok:0,
  explica:"Ordenar no cura nada y la edad no está nula (fillna no la toca: está <i>mal</i>, no <i>vacía</i>). "+
   "Se detecta con una condición y se reemplaza por la mediana — que es 34 <b>incluso con el 950 adentro</b>: "+
   "por eso la mediana es la métrica robusta del <a href='#outliers'>módulo Outliers</a>.",
  before:D2,after:D3},
 {mal:"🐍 'stgo', 'STGO', 'Conce  ' con espacios… el caos de mayúsculas alimenta al jefe.",
  meta:'Deja todas las ciudades en un formato único.',
  ops:["df['ciudad'] = df['ciudad'].str.strip().str.lower()","df['ciudad'] = df['ciudad'].map({'stgo': 'stgo'})","df['ciudad'] = df['ciudad'].replace('STGO', 'stgo')"],ok:0,
  explica:"El <code>map</code> incompleto convierte en <b>NaN</b> todo lo que no esté en el diccionario "+
   "(¡adiós conce!) y el <code>replace</code> puntual deja pasar 'CONCE' y 'Conce  '. "+
   "<code>.str.strip().str.lower()</code> normaliza TODO de una pasada — clase 17 de cadenas.",
  before:D3,after:D4},
 {mal:'⏳ Las fechas son texto DD-MM-AAAA: el jefe distorsiona el tiempo (ordena alfabético).',
  meta:'Convierte la columna a fechas de verdad.',
  ops:["df['fecha'] = pd.to_datetime(df['fecha'], format='%d-%m-%Y')","df['fecha'] = df['fecha'].astype(str)","df = df.sort_values('fecha')"],ok:0,
  explica:"Ya eran texto (astype(str) no hace nada) y ordenarlas como texto pone el 02-04 antes del 15-03 "+
   "por pura suerte alfabética. <code>pd.to_datetime</code> con <code>format</code> las vuelve fechas "+
   "reales — mira el <a href='#fechas'>módulo Fechas</a>.",
  before:D4,after:D5},
 {mal:'💀 Fase final: el jefe esconde los nombres de los clientes en otra tabla.',
  meta:'Trae el nombre de cada cliente SIN perder ninguna boleta.',
  ops:["df = pd.merge(df, clientes, on='id', how='left')","df = pd.merge(df, clientes, on='id', how='inner')","df = pd.concat([df, clientes])"],ok:0,
  explica:"<code>concat</code> apila filas (no empareja llaves) y <code>inner</code> botaría la boleta del "+
   "cliente 106, que no está en la tabla de clientes. <code>left</code> conserva las 7 boletas y deja "+
   "NaN donde no hay nombre — el <a href='#merge'>módulo Joins</a> en acción.",
  before:D5,after:D6},
];

registerExercise({
  id:'boss',
  title:'Boss final: el DataFrame corrupto',
  lead:'Un dataset poseído por todos los males del semestre. Elige la operación correcta '+
       'en cada ronda para sanarlo — el Certamen 2 como videojuego.',
  build(sec){
    const host=el('div');sec.append(host);
    let ronda=0,vidas=3,fallos=0;
    function barra(){
      const hp=Math.round((RONDAS.length-ronda)/RONDAS.length*100);
      return el('div',{class:'bosshdr'},
        el('div',{},el('b',{},'🐉 DataFrame corrupto '),
          el('div',{class:'bossbar'},el('div',{class:'bossfill',style:`width:${hp}%`})),
          el('span',{class:'bosslbl'},`${RONDAS.length-ronda} males restantes`)),
        el('div',{class:'bossvidas'},'❤️'.repeat(vidas)+'🖤'.repeat(3-vidas)));
    }
    function gameover(){
      host.textContent='';
      host.append(el('div',{class:'card exq',style:'text-align:center'},
        el('h3',{},'💀 El jefe te venció'),
        el('p',{class:'note'},'Los nulos y duplicados dominan la tabla… por ahora. Repasa los módulos y vuelve.'),
        el('button',{class:'btn primary',onclick:()=>{ronda=0;vidas=3;fallos=0;show();}},'⚔️ Revancha')));
    }
    function victoria(){
      host.textContent='';
      const card=el('div',{class:'card exq'},
        el('h3',{},'🏆 ¡DataFrame purificado!'),
        el('p',{class:'note',html:`Venciste con <b>${vidas} vida${vidas===1?'':'s'}</b> y ${fallos} fallo${fallos===1?'':'s'}. `+
          'La tabla quedó limpia, tipada y con su join listo — exactamente el estado en que debe llegar un dataset al análisis.'}));
      new DfTable(card,{caption:'df final — limpio y enriquecido',...D6});
      card.append(el('button',{class:'btn primary',style:'margin-top:.6rem',
        onclick:()=>{ronda=0;vidas=3;fallos=0;show();}},'⚔️ Jugar de nuevo'));
      host.append(card);
      RELAYOUT.forEach(f=>f());
    }
    function show(){
      host.textContent='';
      const R=RONDAS[ronda];
      const card=el('div',{class:'card exq'});
      card.append(barra());
      card.append(el('h3',{},`Ronda ${ronda+1} de ${RONDAS.length}`),
        el('p',{class:'note',html:'<b>'+R.mal+'</b><br>🎯 '+R.meta}));
      const mount=el('div');card.append(mount);
      new DfTable(mount,{caption:'estado actual del df',...R.before});
      const opts=el('div',{class:'exopts'});card.append(opts);
      const reveal=el('div',{class:'exreveal'});card.append(reveal);
      /* opciones barajadas para que la correcta no sea siempre la primera */
      const orden=[...R.ops.keys()].sort(()=>Math.random()-.5);
      let done=false;
      orden.forEach(oi=>{
        const b=el('button',{class:'btn exopt',onclick:()=>{
          if(done)return;
          if(oi===R.ok){
            done=true;
            [...opts.children].forEach(bb=>bb.disabled=true);
            b.classList.add('good');
            reveal.append(el('div',{class:'msg okc'},'✔ ¡Golpe crítico! El df sana:'));
            const vm=el('div',{class:'exvisual'});reveal.append(vm);
            dfDiff(vm,R.before,R.after,'antes → después');
            reveal.append(el('p',{class:'note',html:R.explica}));
            reveal.append(el('button',{class:'btn primary',onclick:()=>{ronda++; (ronda>=RONDAS.length)?victoria():show();}},
              ronda===RONDAS.length-1?'🏆 Rematar al jefe':'▶ Siguiente ronda'));
            RELAYOUT.forEach(f=>f());
          }else{
            fallos++;vidas--;
            b.classList.add('bad');b.disabled=true;
            card.querySelector('.bossvidas').textContent='❤️'.repeat(Math.max(0,vidas))+'🖤'.repeat(3-Math.max(0,vidas));
            if(vidas<=0){gameover();return;}
            reveal.append(el('p',{class:'note',html:'💥 El jefe contraataca (−1 vida). Pista: piensa qué hace '+
              '<i>exactamente</i> esa línea… y qué NO hace.'}));
          }
        }},el('pre',{class:'optcode'},R.ops[oi]));
        opts.append(b);
      });
      host.append(card);
      RELAYOUT.forEach(f=>f());
    }
    show();
  },
});
})();
