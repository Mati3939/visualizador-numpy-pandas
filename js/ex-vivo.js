'use strict';
/* Modo ayudantía en vivo (sin servidor):
   · Proyector: pregunta grande + QR → los estudiantes abren #vivo?q=<id>
   · Celular: 4 botones de colores; al elegir, la pantalla queda de ese color
     y se alza — el histograma lo hace la sala. Revelación sincronizada a viva voz. */
(function(){

const URL_PUB='https://mati3939.github.io/visualizador-numpy-pandas/';
const COLORES=[ /* letra, nombre, var CSS — el color acompaña a la letra, nunca solo */
  ['A','rojo','var(--s8)'],['B','azul','var(--s1)'],
  ['C','verde','var(--s2)'],['D','amarillo','var(--s4)'],
];

registerExercise({
  id:'vivo',
  title:'📡 Modo ayudantía (en vivo)',
  lead:'Proyecta una pregunta con QR; el curso responde desde el celular con '+
       'pantallas de colores. Cero instalación, cero servidor.',
  build(sec){
    const host=el('div');sec.append(host);
    const qid=hashParams().q;
    if(qid){alumno(host,qid);}else{proyector(host);}
  },
});

/* ---------------- vista celular ---------------- */
function alumno(host,qid){
  const q=BANCO_PREDICE.find(x=>x.id===qid);
  if(!q){host.append(el('p',{class:'note'},'Pregunta no encontrada — revisa el QR.'));return;}
  const card=el('div',{class:'card exq'},exMeta(q),
    el('h3',{},'Elige tu respuesta y alza el celular 📱'));
  const code=codeBox(card);code.textContent=q.code;
  const opts=el('div',{class:'exopts'});card.append(opts);
  q.opciones.forEach((o,oi)=>{
    const [letra,nombre,color]=COLORES[oi];
    opts.append(el('button',{class:'btn exopt vivoopt',onclick:()=>alzar(oi),
      style:`border-color:${color}`},
      el('span',{class:'vivoletra',style:`background:${color}`},letra),
      el('pre',{class:'optcode'},o)));
  });
  const reveal=el('div',{class:'exreveal'});card.append(reveal);
  card.append(el('p',{class:'note'},'Cuando el ayudante lo diga:'));
  card.append(el('button',{class:'btn',onclick:()=>{
    reveal.textContent='';
    reveal.append(el('div',{class:'msg okc'},
      `✔ Respuesta: ${COLORES[q.correcta][0]} — ${q.opciones[q.correcta]}`));
    reveal.append(el('p',{class:'note',html:q.explica}));
    if(q.visual){const vm=el('div',{class:'exvisual'});reveal.append(vm);q.visual(vm);RELAYOUT.forEach(f=>f());}
  }},'👀 Ver la respuesta'));
  host.append(card);

  function alzar(oi){
    const [letra,,color]=COLORES[oi];
    const ov=el('div',{class:'vivopantalla',style:`background:${color}`,
      onclick:()=>ov.remove()},
      el('div',{class:'vivoletrona'},letra),
      el('div',{class:'vivotip'},'¡Alza la pantalla! (toca para volver)'));
    document.body.append(ov);
  }
}

/* ---------------- vista proyector ---------------- */
function proyector(host){
  const card=el('div',{class:'card exq'},
    el('h3',{},'Panel del ayudante'),
    el('p',{class:'note',html:'Elige una pregunta (o al azar), proyecta, y pide: '+
      '«respondan con el QR y <b>alcen la pantalla del color</b>». El histograma lo ves tú de un vistazo. '+
      'Consejo: activa «🖥️ Presentar» arriba para agrandar todo.'}));
  const ctr=el('div',{class:'controls'});card.append(ctr);
  const sel=el('select',{});
  BANCO_PREDICE.forEach(q=>sel.append(el('option',{value:q.id},
    `${q.id} · ${q.tema} · ${q.origen}`)));
  const bAzar=el('button',{class:'btn',onclick:()=>{
    sel.selectedIndex=Math.floor(Math.random()*BANCO_PREDICE.length);mostrar();
  }},'🎲 Al azar');
  ctr.append(el('label',{},'pregunta: '),sel,bAzar);
  const escenario=el('div');card.append(escenario);
  host.append(card);

  function mostrar(){
    const q=BANCO_PREDICE.find(x=>x.id===sel.value);
    escenario.textContent='';
    const fila=el('div',{class:'vivofila'});
    const izq=el('div',{class:'vivoizq'});
    izq.append(exMeta(q));
    const code=codeBox(izq);code.textContent=q.code;
    const opts=el('div',{class:'exopts'});izq.append(opts);
    const botones=q.opciones.map((o,oi)=>{
      const [letra,,color]=COLORES[oi];
      const b=el('div',{class:'btn exopt vivoopt'},
        el('span',{class:'vivoletra',style:`background:${color}`},letra),
        el('pre',{class:'optcode'},o));
      opts.append(b);return b;
    });
    const der=el('div',{class:'vivoder'},
      el('div',{class:'note',style:'text-align:center;font-weight:600'},'📱 escanea y responde'));
    der.append(qrCanvas(URL_PUB+'#vivo?q='+q.id,5));
    fila.append(izq,der);
    escenario.append(fila);
    const reveal=el('div',{class:'exreveal'});escenario.append(reveal);
    escenario.append(el('div',{class:'controls'},
      el('button',{class:'btn primary',onclick:()=>{
        reveal.textContent='';
        botones.forEach((b,bi)=>b.classList.add(bi===q.correcta?'good':'bad'));
        reveal.append(el('p',{class:'note',html:q.explica}));
        if(q.visual){const vm=el('div',{class:'exvisual'});reveal.append(vm);q.visual(vm);RELAYOUT.forEach(f=>f());}
      }},'🎭 Revelar respuesta')));
  }
  sel.onchange=mostrar;
  mostrar();
}
})();
