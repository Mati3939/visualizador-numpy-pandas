'use strict';
/* =====================================================================
   Motor de ejercicios — secciones del menú «Ejercicios»
     · Predice la salida (idea 1): código → el estudiante elige qué imprime
       → se revela la respuesta con visual y explicación.
     · Detective de bugs (idea 2): código con UN error plantado → el
       estudiante hace clic en la línea culpable.
   Los bancos viven en js/ex-banco.js (BANCO_PREDICE, BANCO_BUGS):
     predice: {tema, origen, nivel, code, opciones[], correcta, explica, visual?}
     bug:     {tema, origen, nivel, lineas[], bug, pista, explica, fix, visual?}
   `visual(mount)` es opcional y dibuja la respuesta con DfTable/CellGrid/dfDiff.
   ===================================================================== */

const EX_TEMAS=[
  ['todos','Todos'],['numpy','NumPy'],['df','DataFrames'],['viz','Visualización'],
  ['nulos','Nulos'],['outliers','Outliers'],['wrangling','Wrangling'],
  ['groupby','GroupBy'],['merge','Joins'],['fechas','Fechas'],
];
const NIVEL=n=>'●'.repeat(n)+'○'.repeat(3-n);

/* barra común: filtro por tema + marcador de sesión */
function exToolbar(sec,onFilter){
  const score={ok:0,tot:0,racha:0};
  const marker=el('span',{class:'exscore'},'0/0 · racha 0');
  const bar=el('div',{class:'controls'});
  btnGroup(bar,EX_TEMAS.map(([v,l])=>({label:l,value:v})),onFilter);
  bar.append(marker);
  sec.append(bar);
  return {
    score,
    hit(ok){ score.tot++; if(ok){score.ok++; score.racha++;}else score.racha=0;
      marker.textContent=`${score.ok}/${score.tot} · racha ${score.racha}`;
      if(ok&&score.racha>0&&score.racha%5===0)marker.textContent+=' 🔥'; },
  };
}
function exMeta(q){
  return el('div',{class:'exmeta'},
    el('span',{class:'exbadge'},q.origen),
    el('span',{class:'exnivel',title:'dificultad'},NIVEL(q.nivel||1)));
}
/* baraja sin mutar el banco */
const exShuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};

/* ---------------- Predice la salida ---------------- */
registerExercise({
  id:'predice',
  title:'Predice la salida',
  lead:'Lee el código, decide qué imprime y recién entonces revela la respuesta. '+
       'Preguntas basadas en los controles y certámenes reales del curso.',
  build(sec){
    const banco=(typeof BANCO_PREDICE!=='undefined')?BANCO_PREDICE:[];
    if(!banco.length){sec.append(el('p',{class:'note'},'No hay banco cargado.'));return;}
    let filtro='todos', lista=banco, i=0;
    const tb=exToolbar(sec,v=>{filtro=v; lista=v==='todos'?banco:banco.filter(q=>q.tema===v); i=0; show();});
    const host=el('div');sec.append(host);
    function show(){
      host.textContent='';
      if(!lista.length){host.append(el('p',{class:'note'},'No hay preguntas de este tema todavía.'));return;}
      const q=lista[i%lista.length];
      const card=el('div',{class:'card exq'},exMeta(q),
        el('h3',{},`Pregunta ${ (i%lista.length)+1} de ${lista.length}`));
      const code=codeBox(card); code.textContent=q.code;
      card.append(el('p',{class:'note'},'¿Qué imprime? Piensa tu respuesta antes de elegir.'));
      const opts=el('div',{class:'exopts'});card.append(opts);
      const reveal=el('div',{class:'exreveal'});card.append(reveal);
      let done=false;
      q.opciones.forEach((o,oi)=>{
        const b=el('button',{class:'btn exopt',onclick:()=>{
          if(done)return; done=true;
          const ok=(oi===q.correcta);
          tb.hit(ok);
          [...opts.children].forEach((bb,bi)=>{
            bb.disabled=true;
            if(bi===q.correcta)bb.classList.add('good');
            else if(bi===oi)bb.classList.add('bad');
          });
          reveal.append(el('div',{class:'msg '+(ok?'okc':'err')},
            ok?'✔ ¡Correcto!':'✘ No era esa — mira por qué:'));
          reveal.append(el('p',{class:'note',html:q.explica}));
          if(q.visual){const vm=el('div',{class:'exvisual'});reveal.append(vm);q.visual(vm);RELAYOUT.forEach(f=>f());}
        }},el('pre',{class:'optcode'},o));
        opts.append(b);
      });
      const nav=el('div',{class:'controls'},
        el('button',{class:'btn',onclick:()=>{i=(i-1+lista.length)%lista.length;show();}},'◀ Anterior'),
        el('button',{class:'btn primary',onclick:()=>{i=(i+1)%lista.length;show();}},'Siguiente ▶'),
        el('button',{class:'btn',onclick:()=>{lista=exShuffle(lista);i=0;show();}},'🔀 Barajar'));
      card.append(nav);
      host.append(card);
    }
    show();
  },
});

/* ---------------- Detective de bugs ---------------- */
registerExercise({
  id:'detective',
  title:'Detective de bugs',
  lead:'Cada código tiene UN error clásico plantado. Haz clic en la línea culpable '+
       'y descubre qué pasa realmente al ejecutarlo.',
  build(sec){
    const banco=(typeof BANCO_BUGS!=='undefined')?BANCO_BUGS:[];
    if(!banco.length){sec.append(el('p',{class:'note'},'No hay banco cargado.'));return;}
    let lista=banco, i=0;
    const tb=exToolbar(sec,v=>{lista=v==='todos'?banco:banco.filter(q=>q.tema===v); i=0; show();});
    const host=el('div');sec.append(host);
    function show(){
      host.textContent='';
      if(!lista.length){host.append(el('p',{class:'note'},'No hay casos de este tema todavía.'));return;}
      const q=lista[i%lista.length];
      const card=el('div',{class:'card exq'},exMeta(q),
        el('h3',{},`Caso ${(i%lista.length)+1} de ${lista.length}: ¿dónde está el bug?`));
      const pre=el('pre',{class:'code buglines'});card.append(pre);
      const reveal=el('div',{class:'exreveal'});card.append(reveal);
      let done=false, intentos=0;
      q.lineas.forEach((ln,li)=>{
        const d=el('div',{class:'bugline',onclick:()=>{
          if(done)return;
          if(li===q.bug){
            done=true; tb.hit(intentos===0);
            d.classList.add('bughit');
            reveal.append(el('div',{class:'msg okc'},intentos===0?'✔ ¡Primer intento!':'✔ Encontrado.'));
            reveal.append(el('p',{class:'note',html:q.explica}));
            const fix=codeBox(reveal); fix.innerHTML='# corregido\n'+q.fix;
            if(q.visual){const vm=el('div',{class:'exvisual'});reveal.append(vm);q.visual(vm);RELAYOUT.forEach(f=>f());}
          }else{
            intentos++;
            d.classList.add('bugmiss');
            setTimeout(()=>d.classList.remove('bugmiss'),450);
            if(intentos===2&&q.pista)reveal.append(el('p',{class:'note',html:'💡 <b>Pista:</b> '+q.pista}));
          }
        }},ln||' ');
        pre.append(d);
      });
      const nav=el('div',{class:'controls'},
        el('button',{class:'btn',onclick:()=>{i=(i-1+lista.length)%lista.length;show();}},'◀ Anterior'),
        el('button',{class:'btn primary',onclick:()=>{i=(i+1)%lista.length;show();}},'Siguiente ▶'),
        el('button',{class:'btn',onclick:()=>{lista=exShuffle(lista);i=0;show();}},'🔀 Barajar'));
      card.append(nav);
      host.append(card);
    }
    show();
  },
});
