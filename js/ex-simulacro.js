'use strict';
/* Modo Simulacro: ensayo cronometrado por evaluación, con nota chilena
   (exigencia 60%), diagnóstico por tema e historial en localStorage. */
(function(){

const URL_PUB='https://mati3939.github.io/visualizador-numpy-pandas/';
const TODOS=['numpy','df','viz','nulos','outliers','wrangling','groupby','merge','fechas'];
const EVALS=[
 {id:'c1',label:'Control 1 · NumPy',temas:['numpy']},
 {id:'c2',label:'Control 2 · NumPy + Pandas',temas:['numpy','df']},
 {id:'c3',label:'Control 3 · Valores faltantes',temas:['nulos','df']},
 {id:'c4',label:'Control 4 · Data wrangling',temas:['wrangling','outliers']},
 {id:'c5',label:'Control 5 · EDA completo',temas:['viz','fechas','groupby']},
 {id:'cert1',label:'Certamen 1 · NumPy, Pandas y visualización',temas:['numpy','df','viz']},
 {id:'cert2',label:'Certamen 2 · de nulos a fechas',temas:['nulos','outliers','wrangling','groupby','merge','fechas']},
 {id:'examen',label:'Examen · todo el curso',temas:TODOS},
];
const NOMBRE_TEMA={numpy:'NumPy',df:'DataFrames',viz:'Visualización',nulos:'Nulos',
  outliers:'Outliers',wrangling:'Wrangling',groupby:'GroupBy',merge:'Joins',fechas:'Fechas'};
const NB_TEMA={ /* notebook de refuerzo por tema (link a Colab) */
  numpy:'02_numpy_mascaras',df:'04_dataframes',viz:'05_visualizacion',
  nulos:'06_valores_faltantes',outliers:'07_outliers_wrangling',
  wrangling:'07_outliers_wrangling',groupby:'08_groupby_pivoteo',
  merge:'09_joins',fechas:'10_fechas_integrador'};
const nbLink=t=>`https://colab.research.google.com/github/Mati3939/visualizador-numpy-pandas/blob/main/notebooks/${NB_TEMA[t]}.ipynb`;

const nota60=p=>{ /* escala chilena 1.0–7.0, exigencia 60% */
  const n=p>=.6 ? 4+3*(p-.6)/.4 : 1+3*p/.6;
  return Math.round(Math.max(1,Math.min(7,n))*10)/10;
};
const fmtNota=n=>n.toFixed(1).replace('.',',');
const mmss=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const HKEY='topd_sim_hist';
const leerHist=()=>{try{return JSON.parse(localStorage.getItem(HKEY))||[];}catch(_){return [];}};
const guardarHist=h=>{try{localStorage.setItem(HKEY,JSON.stringify(h.slice(-20)));}catch(_){/* modo incógnito */}};

/* muestreo estratificado: intercala temas para que el ensayo cubra el temario */
function muestrear(temas,n){
  const pool=[...BANCO_PREDICE,...BANCO_BUGS].filter(q=>temas.includes(q.tema));
  const grupos={};
  pool.forEach(q=>(grupos[q.tema]=grupos[q.tema]||[]).push(q));
  Object.values(grupos).forEach(g=>g.sort(()=>Math.random()-.5));
  const orden=Object.keys(grupos).sort(()=>Math.random()-.5);
  const out=[];
  while(out.length<Math.min(n,pool.length)){
    for(const t of orden){
      if(out.length>=Math.min(n,pool.length))break;
      if(grupos[t].length)out.push(grupos[t].pop());
    }
  }
  return out.sort(()=>Math.random()-.5);
}

registerExercise({
  id:'simulacro',
  title:'🎓 Simulacro de prueba',
  lead:'Ensayo cronometrado con preguntas del temario de cada evaluación. '+
       'Nota al final, diagnóstico por tema y links para repasar justo lo que fallaste.',
  build(sec){
    const host=el('div');sec.append(host);
    let timer=null;
    const pararTimer=()=>{if(timer){clearInterval(timer);timer=null;}};

    function config(){
      pararTimer();
      host.textContent='';
      const card=el('div',{class:'card exq'},
        el('h3',{},'Elige tu evaluación'),
        el('p',{class:'note',html:'Preguntas al azar del temario (2 minutos por pregunta, sin feedback '+
          'hasta el final — como la prueba real). El diagnóstico te dice exactamente qué repasar.'}));
      const lista=el('div',{class:'exopts'});
      EVALS.forEach(ev=>{
        const pool=[...BANCO_PREDICE,...BANCO_BUGS].filter(q=>ev.temas.includes(q.tema));
        const n=Math.min(10,pool.length);
        lista.append(el('button',{class:'btn exopt',onclick:()=>correr(ev)},
          el('b',{},ev.label),
          el('span',{class:'note',style:'display:block;margin:.1rem 0 0'},
            `${n} preguntas · ${mmss(n*120)} min · temas: ${ev.temas.map(t=>NOMBRE_TEMA[t]).join(', ')}`)));
      });
      card.append(lista);
      const hist=leerHist();
      if(hist.length){
        card.append(el('h3',{style:'margin-top:1rem'},'Tus últimos ensayos'));
        const tb=el('div',{class:'simhist'});
        hist.slice(-6).reverse().forEach(h=>{
          tb.append(el('div',{class:'simhrow'},
            el('span',{},h.fecha),el('span',{},h.label),
            el('span',{class:'simnota '+(h.nota>=4?'okc':'err')},fmtNota(h.nota)),
            el('span',{class:'note'},`${h.ok}/${h.n}`)));
        });
        card.append(tb);
      }
      host.append(card);
    }

    function correr(ev){
      const qs=muestrear(ev.temas,10);
      const total=qs.length*120;
      let restante=total, i=0;
      const resp=qs.map(()=>null); /* índice elegido / línea clickeada / null=en blanco */
      host.textContent='';
      const card=el('div',{class:'card exq'});
      const head=el('div',{class:'simhead'},
        el('b',{},ev.label),
        el('span',{class:'simreloj'},mmss(restante)),
        el('span',{class:'exscore'},''));
      const barra=el('div',{class:'bossbar',style:'width:100%'},
        el('div',{class:'bossfill simfill',style:'width:100%'}));
      const cuerpo=el('div');
      card.append(head,barra,cuerpo);
      host.append(card);
      const reloj=head.querySelector('.simreloj');

      timer=setInterval(()=>{
        restante--;
        reloj.textContent=mmss(Math.max(0,restante));
        barra.firstChild.style.width=(restante/total*100)+'%';
        if(restante<=60)reloj.classList.add('err');
        if(restante<=0){pararTimer();resultados(ev,qs,resp,total);}
      },1000);

      function pregunta(){
        if(i>=qs.length){pararTimer();resultados(ev,qs,resp,total-restante);return;}
        const q=qs[i];
        head.querySelector('.exscore').textContent=`pregunta ${i+1}/${qs.length}`;
        cuerpo.textContent='';
        cuerpo.append(exMeta(q));
        const avanzar=()=>{i++;pregunta();};
        if(q.opciones){ /* predice: opción múltiple */
          const code=codeBox(cuerpo);code.textContent=q.code;
          const opts=el('div',{class:'exopts'});cuerpo.append(opts);
          q.opciones.forEach((o,oi)=>opts.append(
            el('button',{class:'btn exopt',onclick:()=>{resp[i]=oi;avanzar();}},
              el('pre',{class:'optcode'},o))));
        }else{ /* detective: clic en la línea culpable */
          cuerpo.append(el('p',{class:'note'},'¿Dónde está el bug? Haz clic en la línea culpable.'));
          const pre=el('pre',{class:'code buglines'});cuerpo.append(pre);
          q.lineas.forEach((ln,li)=>pre.append(
            el('div',{class:'bugline',onclick:()=>{resp[i]=li;avanzar();}},ln||' ')));
        }
        cuerpo.append(el('div',{class:'controls'},
          el('button',{class:'btn',onclick:()=>{resp[i]=null;avanzar();}},'Saltar (queda en blanco)')));
      }
      pregunta();
    }

    function resultados(ev,qs,resp,usado){
      pararTimer();
      const ok=qs.filter((q,k)=>resp[k]===(q.opciones?q.correcta:q.bug)).length;
      const nota=nota60(ok/qs.length);
      const hist=leerHist();
      hist.push({fecha:new Date().toISOString().slice(0,10),label:ev.label,
                 nota,ok,n:qs.length});
      guardarHist(hist);
      host.textContent='';
      const card=el('div',{class:'card exq'});
      card.append(el('h3',{},`Resultado — ${ev.label}`),
        el('div',{class:'simnotona '+(nota>=4?'okc':'err')},fmtNota(nota)),
        el('p',{class:'note',style:'text-align:center'},
          `${ok} de ${qs.length} correctas · exigencia 60% · tiempo usado ${mmss(usado)}`));

      /* diagnóstico por tema */
      const porTema={};
      qs.forEach((q,k)=>{
        porTema[q.tema]=porTema[q.tema]||{ok:0,n:0};
        porTema[q.tema].n++;
        if(resp[k]===(q.opciones?q.correcta:q.bug))porTema[q.tema].ok++;
      });
      card.append(el('h3',{style:'margin-top:1rem'},'Diagnóstico por tema'));
      Object.entries(porTema).sort((a,b)=>(a[1].ok/a[1].n)-(b[1].ok/b[1].n)).forEach(([t,r])=>{
        const bien=r.ok===r.n;
        card.append(el('div',{class:'simhrow'},
          el('span',{},(bien?'✅ ':'⚠️ ')+NOMBRE_TEMA[t]),
          el('span',{class:bien?'okc':'err'},`${r.ok}/${r.n}`),
          el('span',{class:'note',html:bien?'dominado':
            `repasa el <a href="#${t}">módulo</a> · <a href="${nbLink(t)}" target="_blank" rel="noopener">notebook</a> · `+
            `<a href="#predice">más ejercicios</a>`})));
      });

      /* revisión de las falladas */
      const malas=qs.map((q,k)=>({q,k})).filter(({q,k})=>resp[k]!==(q.opciones?q.correcta:q.bug));
      if(malas.length){
        card.append(el('h3',{style:'margin-top:1rem'},'Revisa lo que fallaste'));
        malas.forEach(({q,k})=>{
          const det=el('details',{class:'simrev'});
          det.append(el('summary',{},
            `${resp[k]===null?'⬜ en blanco':'✘'} — ${q.origen} (${NOMBRE_TEMA[q.tema]})`));
          const code=codeBox(det);code.textContent=q.opciones?q.code:q.lineas.join('\n');
          det.append(el('p',{class:'note',html:'<b>Respuesta:</b> '+
            (q.opciones?`<code>${q.opciones[q.correcta]}</code>`:`la línea ${q.bug+1}`)}));
          det.append(el('p',{class:'note',html:q.explica}));
          if(q.visual){const vm=el('div',{class:'exvisual'});det.append(vm);q.visual(vm);}
          card.append(det);
        });
      }

      const msg=`🎓 Ensayo «${ev.label}» — nota ${fmtNota(nota)} (${ok}/${qs.length})\n`+
                `¿Me ganas? ${URL_PUB}#simulacro`;
      const bCopy=el('button',{class:'btn',onclick:()=>{
        navigator.clipboard.writeText(msg).then(()=>{bCopy.textContent='✅ copiado';});
      }},'📋 Copiar resultado (WhatsApp)');
      card.append(el('div',{class:'controls',style:'margin-top:1rem'},
        el('button',{class:'btn primary',onclick:()=>correr(ev)},'⚔️ Otro intento'),
        el('button',{class:'btn',onclick:config},'↩ Elegir otra evaluación'),
        bCopy));
      host.append(card);
      RELAYOUT.forEach(f=>f());
    }

    config();
  },
});
})();
