'use strict';
/* =====================================================================
   Módulo: Valores perdidos (Semana 4)
   dropna() y fillna() sobre un mismo DataFrame de ejemplo (empleados).
   ===================================================================== */
(function(){

/* ---- dataset: empleados (null = NaN) ---- */
const NULOS_COLS = ['nombre','edad','sueldo','ciudad','evaluación'];
const NULOS_IDX  = [0,1,2,3,4,5,6,7];
const NULOS_ROWS = [
  ['Rosa',34,950,'Concepción',6.2],
  ['Juan',null,780,'Talcahuano',5.1],
  ['Elsa',41,null,null,5.9],
  ['Iván',29,640,'Hualpén',null],
  ['Mía',null,null,'Concepción',6.7],
  [null,null,null,null,null],
  ['Leo',52,1200,null,4.8],
  ['Ana',38,null,'Talcahuano',6.0]
];
const NULOS_NUM_COLS = [1,2,4]; // edad, sueldo, evaluación — únicas columnas numéricas
function nulosData(){ return NULOS_ROWS.map(r=>r.slice()); } // copia fresca (independiente) para cada tabla

/* ---- estadísticas de columna, sobre los valores presentes ---- */
function colStats(c){
  const vals = NULOS_ROWS.map(r=>r[c]).filter(v=>v!==null);
  const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
  const s = [...vals].sort((a,b)=>a-b);
  const mid = Math.floor(s.length/2);
  const median = s.length%2 ? s[mid] : (s[mid-1]+s[mid])/2;
  return {mean, median};
}

/* ---- lógica de dropna(): array de booleanos "¿se elimina esta fila/columna?" ----
   thresh cuenta valores NO nulos; la referencia es siempre la dimensión "cruzada":
   al tirar filas (axis=0) se compara contra las 5 columnas; al tirar columnas
   (axis=1) se compara contra las 8 filas. */
function computeDropna(axis, how, thresh){
  const nrows = NULOS_ROWS.length, ncols = NULOS_COLS.length;
  const flags = [];
  if(axis===0){
    for(const row of NULOS_ROWS){
      const nn = row.filter(v=>v!==null).length;
      flags.push(thresh!=null ? nn<thresh : (how==='all' ? nn===0 : nn<ncols));
    }
  } else {
    for(let c=0;c<ncols;c++){
      let nn=0;
      for(let r=0;r<nrows;r++) if(NULOS_ROWS[r][c]!==null) nn++;
      flags.push(thresh!=null ? nn<thresh : (how==='all' ? nn===0 : nn<nrows));
    }
  }
  return flags;
}
function dropnaCode(axis, how, thresh){
  const parts=[];
  if(thresh!=null){
    parts.push(`<b>thresh=${thresh}</b>`);
    if(axis===1) parts.push('<b>axis=1</b>');
  } else {
    if(axis===1) parts.push('<b>axis=1</b>');
    if(how==='all') parts.push("<b>how='all'</b>");
  }
  return `df.dropna(${parts.join(', ')})`;
}

/* ---- lógica de fillna(): plan de celdas {r,c,val} a rellenar, en orden de lectura ---- */
function computeFillPlan(strategy){
  const cols = (strategy==='ffill'||strategy==='bfill') ? [0,1,2,3,4] : NULOS_NUM_COLS;
  const plan = [];
  if(strategy==='zero'){
    for(const c of cols) for(let r=0;r<NULOS_ROWS.length;r++)
      if(NULOS_ROWS[r][c]===null) plan.push({r,c,val:0});
  } else if(strategy==='mean' || strategy==='median'){
    const stats={}; for(const c of cols) stats[c]=colStats(c);
    for(const c of cols) for(let r=0;r<NULOS_ROWS.length;r++)
      if(NULOS_ROWS[r][c]===null) plan.push({r,c,val: strategy==='mean'?stats[c].mean:stats[c].median});
  } else if(strategy==='ffill'){
    for(const c of cols){
      let last=null;
      for(let r=0;r<NULOS_ROWS.length;r++){
        if(NULOS_ROWS[r][c]!==null) last=NULOS_ROWS[r][c];
        else if(last!==null) plan.push({r,c,val:last});
      }
    }
  } else if(strategy==='bfill'){
    for(const c of cols){
      let next=null;
      for(let r=NULOS_ROWS.length-1;r>=0;r--){
        if(NULOS_ROWS[r][c]!==null) next=NULOS_ROWS[r][c];
        else if(next!==null) plan.push({r,c,val:next});
      }
    }
  }
  plan.sort((a,b)=> a.r-b.r || a.c-b.c); // se aplica en orden de lectura: fila por fila
  return plan;
}
function leftoverNaN(strategy, plan){
  if(strategy!=='ffill' && strategy!=='bfill') return [];
  const filled = new Set(plan.map(p=>p.r+'_'+p.c));
  const out=[];
  for(let c=0;c<5;c++) for(let r=0;r<NULOS_ROWS.length;r++)
    if(NULOS_ROWS[r][c]===null && !filled.has(r+'_'+c)) out.push(`fila ${r} · ${NULOS_COLS[c]}`);
  return out;
}
function fillnaCode(strategy){
  if(strategy==='zero') return 'df.fillna(0)';
  if(strategy==='mean') return 'df.fillna(df.mean(numeric_only=True))';
  if(strategy==='median') return 'df.fillna(df.median(numeric_only=True))';
  if(strategy==='ffill') return "df.ffill()  # equivalente: df.fillna(method='ffill')";
  if(strategy==='bfill') return "df.bfill()  # equivalente: df.fillna(method='bfill')";
  return 'df.fillna(...)';
}

function build(section){
  /* ===================== Tarjeta 1: ¿dónde están los NaN? ===================== */
  const c1 = el('div',{class:'card'});
  c1.append(el('h3',{},'¿Dónde están los NaN?'));
  const t1 = new DfTable(c1, {columns:NULOS_COLS, index:NULOS_IDX, rows:nulosData(),
    caption:'df — empleados (Biobío)'});

  function showMatriz(){
    t1.cellEls.flat().forEach(cell=>{ cell.className = 'dfc ' + (cell._isnan ? 'missnan' : 'miss'); });
  }
  btnGroup(c1, [
    {label:'Ver valores', value:'valores'},
    {label:'Ver matriz de nulos', value:'matriz'}
  ], v=>{ if(v==='matriz') showMatriz(); else t1.clearMarks(); });

  const isnaCounts = NULOS_COLS.map((_,i)=> NULOS_ROWS.filter(r=>r[i]===null).length);
  const maxLen = Math.max(...NULOS_COLS.map(c=>c.length));
  const isnaLines = NULOS_COLS.map((c,i)=> c.padEnd(maxLen+4)+isnaCounts[i]);
  codeBox(c1).textContent = 'df.isna().sum()\n\n'+isnaLines.join('\n')+'\ndtype: int64';

  c1.append(el('div',{class:'note'},
    el('p',{style:'margin:.35rem 0'}, el('b',{},'MCAR'),
      ' — perdido completamente al azar: la ausencia no depende de nada, ni de lo observado ni del propio valor. Ej: una hoja de la encuesta se traspapeló.'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},'MAR'),
      ' — perdido al azar, pero condicionado: la probabilidad de faltar depende de otra columna que sí observamos. Ej: los empleados recién contratados aún no tienen evaluación.'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},'MNAR'),
      ' — perdido no al azar: la ausencia depende del propio valor que falta. Ej: quienes ganan menos evitan declarar su sueldo.')
  ));
  section.append(c1);

  /* ===================== Tarjeta 2: dropna() ===================== */
  const c2 = el('div',{class:'card'});
  c2.append(el('h3',{},el('code',{},'dropna()'),' — eliminar filas o columnas con nulos'));
  const t2 = new DfTable(c2, {columns:NULOS_COLS, index:NULOS_IDX, rows:nulosData(),
    caption:'df — empleados (Biobío)'});

  const axisSel = el('select',{onchange:()=>updateCode2()},
    el('option',{value:'0'},'0 — filas'), el('option',{value:'1'},'1 — columnas'));
  const howSel = el('select',{onchange:()=>updateCode2()},
    el('option',{value:'any'},'any'), el('option',{value:'all'},'all'));
  const threshInput = el('input',{type:'number',min:'0',max:'5',placeholder:'—',oninput:()=>updateCode2()});
  const msg2 = el('div',{class:'msg'});

  c2.append(el('div',{class:'controls'},
    el('label',{},'axis'), axisSel,
    el('label',{},'how'), howSel,
    el('label',{},'thresh (mínimo de valores NO nulos)'), threshInput,
    el('button',{class:'btn primary',onclick:()=>onAplicarDropna()},'Aplicar dropna()'),
    el('button',{class:'btn',onclick:()=>onRestaurarDropna()},'Restaurar')
  ));
  c2.append(msg2);
  const cb2 = codeBox(c2);
  c2.append(el('div',{class:'note'},
    'Si defines ', el('b',{},'thresh'), ', pandas ', el('b',{},'ignora how'),
    ': en dropna(), thresh y how son mutuamente excluyentes. thresh cuenta valores NO nulos: al eliminar filas (axis=0) se compara contra las 5 columnas; al eliminar columnas (axis=1) se compara contra las 8 filas — la referencia cambia según el eje, aunque el control de abajo esté limitado a 0-5.'
  ));
  section.append(c2);

  let busy2=false;
  function readDropnaParams(){
    const axis=Number(axisSel.value), how=howSel.value;
    const raw=threshInput.value, thresh = raw===''? null : Number(raw);
    return {axis,how,thresh};
  }
  function updateCode2(){
    const {axis,how,thresh}=readDropnaParams();
    cb2.innerHTML = dropnaCode(axis,how,thresh);
  }
  function resetCard2(){
    t2.clearMarks();
    t2.headEls.forEach(h=>{ h.style.opacity=''; });
    t2.cellEls.flat().forEach(c=>{ c.style.opacity=''; });
    msg2.className='msg'; msg2.textContent='';
  }
  async function onAplicarDropna(){
    if(busy2) return; busy2=true;
    try{
      resetCard2(); // por si venía una corrida anterior sin restaurar: nunca se apilan marcas
      const {axis,how,thresh}=readDropnaParams();
      const flags = computeDropna(axis,how,thresh);
      const dropIdx = flags.map((f,i)=>f?i:-1).filter(i=>i>=0);
      for(const i of dropIdx){
        if(axis===0){
          t2.rowEls[i].classList.add('roff');
        } else {
          t2.headEls[i].classList.add('roff'); t2.headEls[i].style.opacity='.16';
          t2.cellEls.forEach(row=>{ row[i].classList.add('roff'); row[i].style.opacity='.16'; });
        }
        await sleep(120);
      }
      const total = axis===0? NULOS_ROWS.length : NULOS_COLS.length;
      const noun = axis===0? 'filas':'columnas';
      const verbo = dropIdx.length===1? 'Se elimina':'Se eliminan';
      msg2.className='msg okc';
      msg2.textContent = `${verbo} ${dropIdx.length} de ${total} ${noun}`;
      updateCode2();
    } finally { busy2=false; }
  }
  function onRestaurarDropna(){ if(busy2) return; resetCard2(); }
  updateCode2();

  /* ===================== Tarjeta 3: fillna() ===================== */
  const c3 = el('div',{class:'card'});
  c3.append(el('h3',{},el('code',{},'fillna()'),' — imputar valores'));
  const t3 = new DfTable(c3, {columns:NULOS_COLS, index:NULOS_IDX, rows:nulosData(),
    caption:'df — empleados (Biobío)'});

  const stratSel = el('select',{onchange:()=>updateCode3(stratSel.value)},
    el('option',{value:'zero'},'0 (constante)'),
    el('option',{value:'mean'},'media de la columna'),
    el('option',{value:'median'},'mediana de la columna'),
    el('option',{value:'ffill'},'ffill (anterior)'),
    el('option',{value:'bfill'},'bfill (siguiente)'));

  c3.append(el('div',{class:'controls'},
    el('label',{},'estrategia'), stratSel,
    el('button',{class:'btn primary',onclick:()=>onAplicarFill()},'Aplicar'),
    el('button',{class:'btn',onclick:()=>onRestaurarFill()},'Restaurar')
  ));
  const note3 = el('div',{class:'note'});
  c3.append(note3);
  const cb3 = codeBox(c3);
  c3.append(el('div',{class:'note'},
    el('p',{style:'margin:.35rem 0'}, el('b',{},'0 (constante): '),
      'inmediato, pero si la columna no es naturalmente cero (sueldo, evaluación) mete un valor irreal que puede sesgar promedios y modelos.'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},'Media: '),
      'conserva el promedio original, pero reduce artificialmente la varianza — la columna queda "más pareja" de lo que en realidad es.'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},'Mediana: '),
      'parecida a la media pero robusta ante outliers; suele ser una opción por defecto razonable para columnas numéricas.'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},'ffill: '),
      'arrastra el valor de la fila de arriba — solo tiene sentido cuando el orden de las filas es real (series de tiempo, mediciones consecutivas).'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},'bfill: '),
      'lo mismo pero mirando hacia abajo; igual que ffill, es arbitrario si las filas no tienen un orden temporal o lógico.')
  ));
  section.append(c3);

  let busy3=false;
  function updateNote3(strategy, plan){
    let txt='';
    if(strategy==='zero'){
      txt = 'Cada NaN de las columnas numéricas (edad, sueldo, evaluación) se reemplaza por 0. Las columnas de texto (nombre, ciudad) no se tocan.';
    } else if(strategy==='mean'){
      txt = `media(edad)=${fmt(colStats(1).mean)} · media(sueldo)=${fmt(colStats(2).mean)} · media(evaluación)=${fmt(colStats(4).mean)}  (nombre y ciudad no son numéricas, quedan igual)`;
    } else if(strategy==='median'){
      txt = `mediana(edad)=${fmt(colStats(1).median)} · mediana(sueldo)=${fmt(colStats(2).median)} · mediana(evaluación)=${fmt(colStats(4).median)}  (nombre y ciudad no son numéricas, quedan igual)`;
    } else if(strategy==='ffill'){
      txt = 'Cada NaN se reemplaza por el valor anterior de su columna (fila de arriba).';
    } else if(strategy==='bfill'){
      txt = 'Cada NaN se reemplaza por el valor siguiente de su columna (fila de abajo).';
    }
    const leftover = leftoverNaN(strategy, plan);
    if(leftover.length) txt += ` Quedan como NaN, sin ${strategy==='ffill'?'valor anterior':'valor siguiente'}: ${leftover.join(', ')}.`;
    note3.textContent = txt;
  }
  function updateCode3(strategy){ cb3.textContent = fillnaCode(strategy); }
  function resetCard3(){
    t3.render(); // reconstruye la tabla desde los datos originales (vuelve a marcar _isnan)
    note3.textContent='';
  }
  async function onAplicarFill(){
    if(busy3) return; busy3=true;
    try{
      resetCard3(); // evita mezclar el resultado con una estrategia aplicada antes, sin pasar por Restaurar
      const strategy = stratSel.value;
      const plan = computeFillPlan(strategy);
      for(const {r,c,val} of plan){
        const cell = t3.cellEls[r][c];
        cell.textContent = fmt(val);
        cell.classList.remove('nan');
        cell.classList.add('fill');
        await sleep(150);
      }
      updateNote3(strategy, plan);
      updateCode3(strategy);
    } finally { busy3=false; }
  }
  function onRestaurarFill(){
    if(busy3) return;
    resetCard3();
    updateCode3(stratSel.value);
  }
  updateCode3('zero');
}

registerModule({
  id:'nulos',
  title:'Valores perdidos',
  week:'Semana 4',
  lead:'Los datos reales llegan con huecos. Antes de modelar hay que decidir: ¿dónde están los NaN, los elimino o los relleno? Cada decisión cambia lo que tus datos dicen.',
  build
});

})();
