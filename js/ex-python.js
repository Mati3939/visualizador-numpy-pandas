'use strict';
/* Python real (idea 9): NumPy y Pandas de verdad corriendo en el navegador
   vía Pyodide (WebAssembly). Carga diferida: no pesa nada hasta que se pide. */
(function(){

const EJEMPLOS={
 numpy:"import numpy as np\n\ncasos = np.array([[10, 12, 8],\n                  [20, 25, 30]])\nprint(casos.sum(axis=0))\nprint(casos.mean(axis=1))",
 pandas:"import pandas as pd\n\ndf = pd.DataFrame({\n  'sucursal': ['Centro','San Pedro','Centro','Talcahuano'],\n  'total': [4000, 3000, 2000, 9000]})\n\ndf.groupby('sucursal')['total'].sum().sort_values(ascending=False)",
 fechas:"import pandas as pd\n\nf = pd.Series(pd.to_datetime(['2026-03-02','2026-04-15','2026-04-20']))\nprint(f.dt.month.tolist())\nprint((f.max() - f.min()).days, 'días de rango')",
};

registerExercise({
  id:'python',
  title:'Python real (Pyodide)',
  lead:'NumPy y Pandas auténticos corriendo en tu navegador. Escribe código, ejecútalo '+
       'y compara con lo que predijiste — sin instalar nada.',
  build(sec){
    const card=el('div',{class:'card'},
      el('h3',{},'🐍 Sandbox de NumPy/Pandas'),
      el('p',{class:'note',html:'La primera vez descarga el intérprete (~15 MB, <b>requiere internet</b>); '+
        'después todo corre local en tu navegador. Nada sale de tu equipo.'}));
    sec.append(card);
    const ctr=el('div',{class:'controls'});card.append(ctr);
    const bLoad=el('button',{class:'btn primary'},'⬇️ Cargar Python (una vez)');
    const status=el('span',{class:'msg',style:'margin:0'},'');
    ctr.append(bLoad,status);
    const ta=el('textarea',{class:'pyin',rows:9,spellcheck:'false'});
    ta.value=EJEMPLOS.pandas;
    const run=el('button',{class:'btn primary',disabled:''},'▶ Ejecutar (Ctrl+Enter)');
    const chips=el('div',{class:'controls'},el('label',{},'ejemplos: '));
    Object.entries({numpy:'NumPy',pandas:'GroupBy',fechas:'Fechas'}).forEach(([k,lbl])=>
      chips.append(el('button',{class:'btn',onclick:()=>{ta.value=EJEMPLOS[k];}},lbl)));
    const out=el('pre',{class:'code',style:'min-height:3rem;white-space:pre-wrap'});
    out.textContent='# la salida aparecerá aquí';
    card.append(ta,el('div',{class:'controls'},run),chips,out);
    card.append(el('p',{class:'note',html:'Tip de ayudantía: predice la salida ANTES de ejecutar '+
      '(como en <a href="#predice">Predice la salida</a>). Si te lanza un error críptico, '+
      'pásalo por el <a href="#traductor">Traductor de errores</a>.'}));

    let py=null, cargando=false;
    async function cargar(){
      if(py||cargando)return; cargando=true;
      bLoad.disabled=true;
      try{
        status.textContent='descargando intérprete…';
        if(!window.loadPyodide){
          await new Promise((res,rej)=>{
            const sc=document.createElement('script');
            sc.src='https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
            sc.onload=res; sc.onerror=()=>rej(new Error('sin conexión al CDN'));
            document.head.append(sc);
          });
        }
        py=await loadPyodide();
        status.textContent='instalando numpy y pandas…';
        await py.loadPackage(['numpy','pandas']);
        py.runPython('import sys, io');
        status.textContent='✅ listo — ejecuta tu código';
        status.className='msg okc';
        bLoad.style.display='none';
        run.disabled=false;
      }catch(e){
        status.textContent='✘ no se pudo cargar ('+e.message+'). ¿Hay internet?';
        status.className='msg err';
        bLoad.disabled=false; cargando=false;
      }
    }
    bLoad.onclick=cargar;

    async function ejecutar(){
      if(!py)return;
      run.disabled=true; out.textContent='⏳ ejecutando…';
      py.runPython('sys.stdout = io.StringIO(); sys.stderr = sys.stdout');
      try{
        const r=await py.runPythonAsync(ta.value);
        let txt=py.runPython('sys.stdout.getvalue()');
        if(r!==undefined&&r!==null){
          txt+=(txt&&!txt.endsWith('\n')?'\n':'')+r.toString();
          if(r.destroy)try{r.destroy();}catch(_){/* valores primitivos no tienen destroy */}
        }
        out.textContent=txt.trim()||'(sin salida — usa print() o deja una expresión al final)';
      }catch(e){
        const txt=py.runPython('sys.stdout.getvalue()');
        /* del traceback de Pyodide, lo útil es de la línea del código del usuario hacia abajo */
        const msg=String(e.message||e).split('\n').filter(l=>!/pyodide|_pyodide|<exec>"?, line 0/.test(l)).join('\n');
        out.textContent=(txt?txt+'\n':'')+msg.trim();
      }
      run.disabled=false;
    }
    run.onclick=ejecutar;
    ta.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();ejecutar();}
    });
  },
});
})();
