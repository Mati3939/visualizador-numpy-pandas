'use strict';
/* Python real (idea 9): NumPy y Pandas de verdad corriendo en el navegador
   vía Pyodide (WebAssembly). Carga diferida: no pesa nada hasta que se pide. */
(function(){

const EJEMPLOS={
 numpy:"import numpy as np\n\ncasos = np.array([[10, 12, 8],\n                  [20, 25, 30]])\nprint(casos.sum(axis=0))\nprint(casos.mean(axis=1))",
 pandas:"import pandas as pd\n\ndf = pd.DataFrame({\n  'sucursal': ['Centro','San Pedro','Centro','Talcahuano'],\n  'total': [4000, 3000, 2000, 9000]})\n\ndf.groupby('sucursal')['total'].sum().sort_values(ascending=False)",
 fechas:"import pandas as pd\n\nf = pd.Series(pd.to_datetime(['2026-03-02','2026-04-15','2026-04-20']))\nprint(f.dt.month.tolist())\nprint((f.max() - f.min()).days, 'días de rango')",
 limpieza:"import pandas as pd\n\ndf = pd.DataFrame({\n  'patente': ['AA11', 'BB22', 'AA11', 'CC33'],\n  'monto': [1200, None, 1200, 900]})\n\ndf = df.drop_duplicates()\ndf['monto'] = df['monto'].fillna(df['monto'].median())\ndf['tramo'] = pd.cut(df['monto'], bins=[0, 1000, 2000],\n                     labels=['bajo', 'alto'])",
};

/* Ayudante Python para el modo paso a paso (idea 15): ejecuta el script
   sentencia por sentencia y captura un snapshot JSON de cada DataFrame/Serie. */
const PYHELPER=`
import ast, json, sys, io
import numpy as _np
import pandas as _pd

def _clean(v):
    try:
        if _pd.isna(v): return None
    except Exception:
        pass
    if isinstance(v, bool) or isinstance(v, _np.bool_): return bool(v)
    if isinstance(v, (int, float, str)): return v
    if isinstance(v, (_np.integer, _np.floating)): return v.item()
    return str(v)

def _snap(val):
    try:
        if isinstance(val, _pd.DataFrame):
            t = max(0, len(val) - 8)
            d = val.head(8)
            return {'kind': 'df', 'trunc': t,
                    'columns': [str(c) for c in d.columns],
                    'index': [str(i) for i in d.index],
                    'rows': [[_clean(v) for v in row] for row in d.itertuples(index=False)]}
        if isinstance(val, _pd.Series):
            t = max(0, len(val) - 8)
            d = val.head(8)
            nom = str(val.name) if val.name is not None else 'valor'
            return {'kind': 'series', 'trunc': t, 'columns': [nom],
                    'index': [str(i) for i in d.index],
                    'rows': [[_clean(v)] for v in d.values]}
    except Exception:
        return None
    return None

def _pasos(src):
    tree = ast.parse(src)
    ns = {}
    pasos = []
    for node in tree.body:
        seg = ast.get_source_segment(src, node) or '...'
        buf = io.StringIO(); old = sys.stdout; sys.stdout = buf
        err = None
        try:
            code = compile(ast.Module(body=[node], type_ignores=[]), '<paso>', 'exec')
            exec(code, ns)
        except Exception as e:
            err = type(e).__name__ + ': ' + str(e)
        finally:
            sys.stdout = old
        snaps = {}
        for k, v in list(ns.items()):
            if k.startswith('_') or k in ('np', 'pd'): continue
            s = _snap(v)
            if s: snaps[k] = s
        pasos.append({'linea': node.lineno, 'src': seg, 'out': buf.getvalue(),
                      'err': err, 'vars': snaps})
        if err: break
    return json.dumps(pasos)
`;

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
    const bPasos=el('button',{class:'btn',disabled:'',
      title:'Ejecuta sentencia por sentencia y muestra cómo cambia cada DataFrame'},'🎬 Paso a paso');
    const chips=el('div',{class:'controls'},el('label',{},'ejemplos: '));
    Object.entries({numpy:'NumPy',pandas:'GroupBy',fechas:'Fechas',limpieza:'Limpieza (paso a paso)'}).forEach(([k,lbl])=>
      chips.append(el('button',{class:'btn',onclick:()=>{ta.value=EJEMPLOS[k];}},lbl)));
    const out=el('pre',{class:'code',style:'min-height:3rem;white-space:pre-wrap'});
    out.textContent='# la salida aparecerá aquí';
    const player=el('div');
    card.append(ta,el('div',{class:'controls'},run,bPasos),chips,out,player);
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
        py.runPython(PYHELPER);
        status.textContent='✅ listo — ejecuta tu código';
        status.className='msg okc';
        bLoad.style.display='none';
        run.disabled=false;
        bPasos.disabled=false;
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

    /* ---------- 🎬 Paso a paso: TU código animado (idea 15) ---------- */
    function pasoAPaso(){
      if(!py)return;
      player.textContent=''; out.textContent='⏳ analizando…';
      let pasos;
      try{
        py.globals.set('_SRC',ta.value);
        pasos=JSON.parse(py.runPython('_pasos(_SRC)'));
        out.textContent='# modo paso a paso: usa ◀ ▶ abajo';
      }catch(e){
        out.textContent='✘ error al analizar: '+String(e.message||e).split('\n').pop();
        return;
      }
      if(!pasos.length){out.textContent='(script vacío)';return;}
      const lineas=ta.value.split('\n');
      const pane=el('pre',{class:'code buglines'});
      const lineEls=lineas.map((ln,i)=>{
        const d=el('div',{class:'bugline',style:'cursor:default'},
          String(i+1).padStart(2,' ')+'  '+(ln||' '));
        pane.append(d);return d;
      });
      const visor=el('div');
      const cnt=el('span',{class:'cnt'},'');
      const bPrev=el('button',{class:'btn',onclick:()=>ir(i-1)},'◀ Anterior');
      const bNext=el('button',{class:'btn primary',onclick:()=>ir(i+1)},'▶ Siguiente');
      const bCerrar=el('button',{class:'btn',onclick:()=>{player.textContent='';}},'✖ Cerrar');
      player.append(el('div',{class:'card',style:'margin:.8rem 0'},
        el('h3',{},'🎬 Tu código, paso a paso'),
        pane,el('div',{class:'stepper'},bPrev,bNext,bCerrar,cnt),visor));
      let i=-1;
      function ir(k){
        if(k<0||k>=pasos.length)return;
        i=k;
        const p=pasos[i];
        cnt.textContent=`paso ${i+1}/${pasos.length}`;
        /* resaltar la(s) línea(s) de esta sentencia */
        lineEls.forEach(d=>d.classList.remove('bughit','bugmiss'));
        const nLin=p.src.split('\n').length;
        for(let L=p.linea-1;L<p.linea-1+nLin&&L<lineEls.length;L++)
          lineEls[L].classList.add(p.err?'bugmiss':'bughit');
        visor.textContent='';
        if(p.out)visor.append(el('pre',{class:'code',style:'white-space:pre-wrap'},p.out.trim()));
        if(p.err){
          visor.append(el('div',{class:'msg err'},'💥 '+p.err));
          visor.append(el('p',{class:'note',html:'¿Críptico? Pégalo en el <a href="#traductor">Traductor de errores</a>.'}));
        }
        /* diffs de las variables tabulares */
        const prev=(i>0)?pasos[i-1].vars:{};
        let algo=false;
        for(const [nombre,snap] of Object.entries(p.vars)){
          const antes=prev[nombre];
          const cap=nombre+(snap.trunc>0?`  (primeras 8 filas de ${snap.trunc+8})`:'');
          if(!antes){
            new DfTable(visor,{caption:cap+' — nueva',columns:snap.columns,
              index:snap.index,rows:snap.rows});
            algo=true;
          }else if(JSON.stringify(antes)!==JSON.stringify(snap)){
            dfDiff(visor,antes,snap,cap+' — cambió en este paso');
            algo=true;
          }
        }
        if(!algo&&!p.out&&!p.err)
          visor.append(el('p',{class:'note'},'Este paso no cambió ningún DataFrame ni imprimió nada.'));
        RELAYOUT.forEach(f=>f());
      }
      ir(0);
    }
    bPasos.onclick=pasoAPaso;
  },
});
})();
