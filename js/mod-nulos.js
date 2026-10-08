'use strict';
/* =====================================================================
   Módulo: Valores perdidos
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
function computeDropna(axis, how, thresh, subset){
  const nrows = NULOS_ROWS.length, ncols = NULOS_COLS.length;
  const flags = [];
  if(axis===0){
    /* subset: solo se miran esas columnas (y thresh se cuenta dentro de ellas) */
    const cols = subset && subset.length ? subset : NULOS_COLS.map((_,i)=>i);
    for(const row of NULOS_ROWS){
      const nn = cols.filter(c=>row[c]!==null).length;
      flags.push(thresh!=null ? nn<thresh : (how==='all' ? nn===0 : nn<cols.length));
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
function dropnaCode(axis, how, thresh, subset){
  const parts=[];
  if(axis===0 && subset && subset.length)
    parts.push(`<b>subset=[${subset.map(c=>"'"+NULOS_COLS[c]+"'").join(', ')}]</b>`);
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
  } else if(strategy==='moda' || strategy==='sininfo'){
    /* ciudad: Concepción y Talcahuano empatan con 2; mode()[0] toma la primera (orden alfabético) */
    for(let r=0;r<NULOS_ROWS.length;r++)
      if(NULOS_ROWS[r][3]===null) plan.push({r,c:3,val: strategy==='moda'?'Concepción':'Sin información'});
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
  if(strategy==='moda') return "moda = df['ciudad'].mode()[0]   # mode() devuelve una Serie: puede haber empate\ndf['ciudad'] = df['ciudad'].fillna(moda)";
  if(strategy==='sininfo') return "df['ciudad'] = df['ciudad'].fillna('Sin información')";
  if(strategy==='ffill') return "df.ffill()   # fillna(method='ffill') ya no existe en pandas 3";
  if(strategy==='bfill') return "df.bfill()   # fillna(method='bfill') ya no existe en pandas 3";
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
  const conNulo = NULOS_ROWS.filter(r=>r.some(v=>v===null)).length;
  codeBox(c1).textContent = 'df.isna().sum()\n\n'+isnaLines.join('\n')+'\ndtype: int64\n\n'+
    'df.isna().any(axis=1).sum()     # filas con al menos un NaN\n'+conNulo+'\n'+
    '(~df.isna().any(axis=1)).sum()  # filas completas\n'+(NULOS_ROWS.length-conNulo);

  c1.append(el('div',{class:'note'},
    el('p',{style:'margin:.35rem 0'}, el('b',{},'MCAR'),
      ' — perdido completamente al azar: la ausencia no depende de nada, ni de lo observado ni del propio valor. Ej: una hoja de la encuesta se traspapeló.'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},'MAR'),
      ' — perdido al azar, pero condicionado: la probabilidad de faltar depende de otra columna que sí observamos. Ej: los empleados recién contratados aún no tienen evaluación.'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},'MNAR'),
      ' — perdido no al azar: la ausencia depende del propio valor que falta. Ej: quienes ganan menos evitan declarar su sueldo.')
  ));
  section.append(c1);

  /* ===================== Tarjeta: nulos disfrazados ===================== */
  const FICHAS_COLS = ['estudiante','nota_c1','colegio'];
  const FICHAS_ROWS = [['Antonia',5.8,'Particular'],['Bruno',999,'-'],['Catalina',6.1,'Subvencionado'],
    ['Diego',4.4,'sin dato'],['Emilia',-1,'Municipal'],['Felipe',5.2,'Subvencionado']];
  const DISFRACES = [999,-1,'-','sin dato'];
  const cD = el('div',{class:'card'});
  cD.append(el('h3',{},'Nulos disfrazados'));
  cD.append(el('p',{class:'note',html:'No todos los faltantes llegan como <code>NaN</code>. Un <code>999</code>, un <code>-1</code>, '+
    'un <code>\'-\'</code> o un <code>\'sin dato\'</code> son valores válidos para pandas: <code>isna()</code> no los ve y se cuelan en los cálculos.'}));
  const tD = new DfTable(cD, {columns:FICHAS_COLS, index:[0,1,2,3,4,5], rows:FICHAS_ROWS.map(r=>r.slice()),
    caption:'fichas — notas del Control 1'});
  const cbD = el('pre',{class:'code'});
  const msgD = el('div',{class:'msg'});
  const notaD = el('div',{class:'note',html:'Si los datos vienen de un archivo, se resuelve al leer: '+
    '<code>pd.read_csv(\'fichas.csv\', na_values=[\'-\', \'sin dato\', 999, -1])</code>. '+
    '<b>Regla de oro:</b> antes de analizar una columna, mira sus extremos con <code>describe()</code> y sus categorías con '+
    '<code>unique()</code> o <code>value_counts()</code>; ahí aparecen los disfraces.'});
  section.append(cD);

  const disfrazadas = ()=> FICHAS_ROWS.flatMap((row,r)=>row.map((v,c)=>({r,c,v})))
    .filter(({c,v})=>c>0 && DISFRACES.includes(v));
  function estadoD(paso){
    if(paso===0){
      cbD.textContent = "fichas['nota_c1'].mean().round(2)\n169.92      # ¿un promedio de notas sobre 7?\n\n"+
        "fichas.isna().sum().sum()\n0           # pandas no ve ningún nulo";
      msgD.className='msg'; msgD.textContent='';
    } else if(paso===1){
      cbD.textContent = "fichas['nota_c1'].describe()   # min -1 y max 999: imposibles para una nota\n"+
        "fichas['colegio'].unique()\n<ArrowStringArray>\n['Particular', '-', 'Subvencionado', 'sin dato', 'Municipal']\nLength: 5, dtype: str";
      msgD.className='msg err'; msgD.textContent='4 disfraces: 999 y -1 ("no rindió"), \'-\' y \'sin dato\'.';
    } else {
      cbD.textContent = "fichas.loc[fichas['nota_c1'].isin([999, -1]), 'nota_c1'] = np.nan\n"+
        "fichas.loc[fichas['colegio'].isin(['-', 'sin dato']), 'colegio'] = np.nan\n\n"+
        "fichas['nota_c1'].mean().round(2)\n5.37        # ahora sí: promedio de las 4 notas reales";
      msgD.className='msg okc'; msgD.textContent='Ahora isna() los cuenta y mean() los ignora.';
    }
  }
  btnGroup(cD, [
    {label:'Como llegó', value:0},
    {label:'Buscar disfraces', value:1},
    {label:'Convertir a NaN', value:2}
  ], paso=>{
    tD.render();
    for(const {r,c} of disfrazadas()){
      const cell = tD.cellEls[r][c];
      if(paso===1) cell.classList.add('out8');
      if(paso===2){ cell.textContent='NaN'; cell._isnan=true; cell.className='dfc nan'; }
    }
    estadoD(paso);
  });
  cD.append(cbD, msgD, notaD);
  estadoD(0);

  /* ===================== Tarjeta: ¿qué hacen los métodos con los NaN? ===================== */
  const cM = el('div',{class:'card'});
  cM.append(el('h3',{},'¿Qué hacen los métodos con los NaN?'));
  cM.append(el('p',{class:'note',html:'Las agregaciones (<code>count</code>, <code>mean</code>, <code>sum</code>…) <b>se saltan</b> los NaN. '+
    'Las operaciones fila a fila (<code>+</code>, <code>/</code>…) los <b>propagan</b>: con un NaN de por medio, el resultado es NaN.'}));
  const tM = new DfTable(cM, {columns:NULOS_COLS, index:NULOS_IDX, rows:nulosData(),
    caption:'df — empleados (Biobío)'});
  const cbM = el('pre',{class:'code'});
  const SUELDO=2, EDAD=1;
  const METODOS = {
    len:{c:'len(df)\n8', d:'Cuenta filas, tengan o no nulos.',
      mark(){ tM.rowEls.forEach(r=>r._idx.classList.add('hl')); }},
    count:{c:"df['sueldo'].count()\n4", d:'count() cuenta solo los valores presentes: 4 de 8.',
      mark(){ NULOS_ROWS.forEach((r,i)=>{ if(r[SUELDO]!==null) tM.cellEls[i][SUELDO].classList.add('sel'); }); }},
    mean:{c:"df['sueldo'].mean()\n892.5       # (950 + 780 + 640 + 1200) / 4",
      d:'mean() divide por los 4 presentes, no por 8. Es skipna=True, el valor por defecto.',
      mark(){ NULOS_ROWS.forEach((r,i)=>{ if(r[SUELDO]!==null) tM.cellEls[i][SUELDO].classList.add('sel'); }); }},
    skip:{c:"df['sueldo'].mean(skipna=False)\nnan", d:'Con skipna=False basta un NaN para que el resultado sea NaN.',
      mark(){ NULOS_ROWS.forEach((r,i)=>{ if(r[SUELDO]===null) tM.cellEls[i][SUELDO].classList.add('out8'); }); }},
    div:{c:"(df['sueldo'] / df['edad']).round(2)\n0    27.94\n1      NaN\n2      NaN\n3    22.07\n4      NaN\n5      NaN\n6    23.08\n7      NaN\ndtype: float64",
      d:'Fila a fila: si falta el sueldo o la edad, esa fila da NaN. Solo 3 de 8 filas tienen resultado.',
      mark(){ NULOS_ROWS.forEach((r,i)=>{ for(const c of [EDAD,SUELDO])
        tM.cellEls[i][c].classList.add(r[EDAD]!==null&&r[SUELDO]!==null?'sel':(r[c]===null?'out8':'hl')); }); }}
  };
  const msgM = el('div',{class:'msg'});
  btnGroup(cM, [
    {label:'len(df)',value:'len'},{label:'.count()',value:'count'},{label:'.mean()',value:'mean'},
    {label:'.mean(skipna=False)',value:'skip'},{label:'sueldo / edad',value:'div'}
  ], k=>{ tM.clearMarks(); METODOS[k].mark(); cbM.textContent=METODOS[k].c; msgM.textContent=METODOS[k].d; });
  cM.append(cbM, msgM);
  cbM.textContent=METODOS.len.c; msgM.textContent=METODOS.len.d;
  section.append(cM);
  METODOS.len.mark();

  /* ===================== Tarjeta 2: dropna() ===================== */
  const c2 = el('div',{class:'card'});
  c2.append(el('h3',{},el('code',{},'dropna()'),' — eliminar filas o columnas con nulos'));
  const t2 = new DfTable(c2, {columns:NULOS_COLS, index:NULOS_IDX, rows:nulosData(),
    caption:'df — empleados (Biobío)'});

  const axisSel = el('select',{onchange:()=>{ subsetSel.disabled = axisSel.value==='1'; updateCode2(); }},
    el('option',{value:'0'},'0 — filas'), el('option',{value:'1'},'1 — columnas'));
  const howSel = el('select',{onchange:()=>updateCode2()},
    el('option',{value:'any'},'any'), el('option',{value:'all'},'all'));
  const SUBSETS = {'':[], edad:[1], sueldo:[2], edad_sueldo:[1,2], ciudad:[3]};
  const subsetSel = el('select',{onchange:()=>updateCode2()},
    el('option',{value:''},'— (todas)'), el('option',{value:'edad'},"['edad']"),
    el('option',{value:'sueldo'},"['sueldo']"), el('option',{value:'edad_sueldo'},"['edad', 'sueldo']"),
    el('option',{value:'ciudad'},"['ciudad']"));
  const threshInput = el('input',{type:'number',min:'0',max:'5',placeholder:'—',oninput:()=>updateCode2()});
  const msg2 = el('div',{class:'msg'});

  c2.append(el('div',{class:'controls'},
    el('label',{},'axis'), axisSel,
    el('label',{},'how'), howSel,
    el('label',{},'subset'), subsetSel,
    el('label',{},'thresh (mínimo de valores NO nulos)'), threshInput,
    el('button',{class:'btn primary',onclick:()=>onAplicarDropna()},'Aplicar dropna()'),
    el('button',{class:'btn',onclick:()=>onRestaurarDropna()},'Restaurar')
  ));
  c2.append(msg2);
  const cb2 = codeBox(c2);
  c2.append(el('div',{class:'note'},
    el('b',{},'thresh'), ' y ', el('b',{},'how'), ' no se pueden usar juntos: pasar ambos da ',
    el('code',{},'TypeError'), ' (por eso, si defines thresh, el código omite how). thresh cuenta valores NO nulos: al eliminar filas (axis=0) se compara contra las 5 columnas; al eliminar columnas (axis=1) se compara contra las 8 filas — la referencia cambia según el eje, aunque el control de abajo esté limitado a 0-5.'
  ), el('div',{class:'note',style:'margin-top:.5rem',html:'<b>subset</b> mira solo esas columnas: <code>df.dropna(subset=[\'sueldo\'])</code> '+
    'bota las filas sin sueldo y no le importa que falte la ciudad. Es lo sensato cuando el nulo impide el análisis '+
    '(por ejemplo, falta la variable que quieres estudiar); un <code>dropna()</code> a ciegas aquí deja 1 fila de 8.'}));
  section.append(c2);

  /* token de corrida: Restaurar aborta la animación en vuelo en vez de ignorarse */
  let run2=0;
  function readDropnaParams(){
    const axis=Number(axisSel.value), how=howSel.value;
    const raw=threshInput.value, thresh = raw===''? null : Number(raw);
    const subset = axis===0 ? SUBSETS[subsetSel.value] : [];
    return {axis,how,thresh,subset};
  }
  function updateCode2(){
    const {axis,how,thresh,subset}=readDropnaParams();
    cb2.innerHTML = dropnaCode(axis,how,thresh,subset);
  }
  function resetCard2(){
    t2.clearMarks();
    t2.headEls.forEach(h=>{ h.style.opacity=''; });
    t2.cellEls.flat().forEach(c=>{ c.style.opacity=''; });
    msg2.className='msg'; msg2.textContent='';
  }
  async function onAplicarDropna(){
    const t = ++run2;
    resetCard2(); // por si venía una corrida anterior sin restaurar: nunca se apilan marcas
    const {axis,how,thresh,subset}=readDropnaParams();
    const flags = computeDropna(axis,how,thresh,subset);
    const dropIdx = flags.map((f,i)=>f?i:-1).filter(i=>i>=0);
    for(const i of dropIdx){
      if(axis===0){
        t2.rowEls[i].classList.add('roff');
      } else {
        t2.headEls[i].classList.add('roff'); t2.headEls[i].style.opacity='.16';
        t2.cellEls.forEach(row=>{ row[i].classList.add('roff'); row[i].style.opacity='.16'; });
      }
      await sleep(120); if(t!==run2) return;
    }
    const total = axis===0? NULOS_ROWS.length : NULOS_COLS.length;
    const noun = axis===0? 'filas':'columnas';
    const verbo = dropIdx.length===1? 'Se elimina':'Se eliminan';
    msg2.className='msg okc';
    msg2.textContent = `${verbo} ${dropIdx.length} de ${total} ${noun}`;
    updateCode2();
  }
  function onRestaurarDropna(){ run2++; resetCard2(); }
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
    el('option',{value:'moda'},'moda (ciudad)'),
    el('option',{value:'sininfo'},"'Sin información' (ciudad)"),
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
      'parecida a la media pero robusta ante outliers y colas largas (precios, sueldos, superficies): ahí la media se va hacia arriba y la mediana no.'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},'Moda: '),
      'para texto no hay media ni mediana. Ojo con dos cosas: mode() devuelve una Serie (puede haber empate, por eso el [0]) e infla la categoría más común.'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},"'Sin información': "),
      'una categoría nueva no inventa datos y deja analizar después si los que no respondieron son distintos. Suele ser la opción más honesta.'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},'ffill: '),
      'arrastra el valor de la fila de arriba — solo tiene sentido cuando el orden de las filas es real (series de tiempo, mediciones consecutivas).'),
    el('p',{style:'margin:.35rem 0'}, el('b',{},'bfill: '),
      'lo mismo pero mirando hacia abajo; igual que ffill, es arbitrario si las filas no tienen un orden temporal o lógico.')
  ));
  section.append(c3);

  let run3=0;
  function updateNote3(strategy, plan){
    let txt='';
    if(strategy==='zero'){
      txt = 'Cada NaN de las columnas numéricas (edad, sueldo, evaluación) se reemplaza por 0. Las columnas de texto (nombre, ciudad) no se tocan.';
    } else if(strategy==='mean'){
      txt = `media(edad)=${fmt(colStats(1).mean)} · media(sueldo)=${fmt(colStats(2).mean)} · media(evaluación)=${fmt(colStats(4).mean)}  (nombre y ciudad no son numéricas, quedan igual)`;
    } else if(strategy==='median'){
      txt = `mediana(edad)=${fmt(colStats(1).median)} · mediana(sueldo)=${fmt(colStats(2).median)} · mediana(evaluación)=${fmt(colStats(4).median)}  (nombre y ciudad no son numéricas, quedan igual)`;
    } else if(strategy==='moda'){
      txt = "Concepción y Talcahuano empatan con 2 apariciones: mode() devuelve las dos y [0] toma Concepción. Los 3 NaN de ciudad pasan a ser Concepción.";
    } else if(strategy==='sininfo'){
      txt = "Los 3 NaN de ciudad pasan a una categoría propia. value_counts() la mostrará como una ciudad más.";
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
    const t = ++run3;
    resetCard3(); // evita mezclar el resultado con una estrategia aplicada antes, sin pasar por Restaurar
    const strategy = stratSel.value;
    const plan = computeFillPlan(strategy);
    for(const {r,c,val} of plan){
      const cell = t3.cellEls[r][c];
      cell.textContent = fmt(val);
      cell.classList.remove('nan');
      cell.classList.add('fill');
      await sleep(150); if(t!==run3) return;
    }
    updateNote3(strategy, plan);
    updateCode3(strategy);
  }
  function onRestaurarFill(){
    run3++;
    resetCard3();
    updateCode3(stratSel.value);
  }
  updateCode3('zero');

  /* ===================== Tarjeta: imputar por grupo y marcar lo imputado ===================== */
  const ARR_COLS = ['comuna','arriendo','arriendo_imputado'];
  const ARR_ROWS = [['Concepción',520],['San Pedro',640],['Talcahuano',380],['Concepción',null],['San Pedro',600],
    ['Talcahuano',350],['Concepción',470],['San Pedro',null],['Talcahuano',null],['Concepción',560]];
  const COMUNAS = ['Concepción','San Pedro','Talcahuano'];
  const mediana = xs=>{ const s=[...xs].sort((a,b)=>a-b), m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; };
  const presentes = com=>ARR_ROWS.filter(r=>(com==null||r[0]===com)&&r[1]!==null).map(r=>r[1]);
  const MED_GENERAL = mediana(presentes());
  const MED_GRUPO = Object.fromEntries(COMUNAS.map(c=>[c, mediana(presentes(c))]));
  const ARR=1, MARCA=2;

  const cG = el('div',{class:'card'});
  cG.append(el('h3',{},'Imputar por grupo y marcar lo imputado'));
  cG.append(el('p',{class:'note',html:'Una mediana <b>general</b> trata igual a todas las filas. Pero un arriendo sin dato en Talcahuano '+
    'se parece más a los otros de Talcahuano que al resto del Gran Concepción: conviene imputar con la <b>mediana de su grupo</b>. '+
    'Y antes de rellenar, se guarda en una columna <b>qué valores fueron inventados</b>.'}));
  const tG = new DfTable(cG, {columns:ARR_COLS, index:ARR_ROWS.map((_,i)=>i),
    rows:ARR_ROWS.map(r=>[r[0], r[1], '']), caption:'df — arriendos (miles de $)'});
  const cbG = codeSteps(cG, [
    "df['arriendo_imputado'] = df['arriendo'].isna()   # marcar ANTES de rellenar",
    "for comuna in df['comuna'].unique():",
    "    grupo = df['comuna'] == comuna",
    "    mediana_grupo = df.loc[grupo, 'arriendo'].median()",
    "    df.loc[grupo &amp; df['arriendo'].isna(), 'arriendo'] = mediana_grupo"
  ]);
  const pasosG = [
    {d:'Primero se <b>marca</b>: <code>isna()</code> deja True donde falta el arriendo. Si se rellena antes, ya no hay cómo saber cuáles eran inventados.',
     async run(){ cbG.mark(0);
       ARR_ROWS.forEach((r,i)=>{ const c=tG.cellEls[i][MARCA]; c.textContent = r[ARR]===null?'True':'False';
         if(r[ARR]===null) c.classList.add('hl'); }); }},
    ...COMUNAS.map((com,g)=>({
      d:`Grupo <b>${com}</b>: la mediana de sus arriendos con dato es <b>${MED_GRUPO[com]}</b>. Solo sus NaN la reciben.`,
      async run(){ cbG.mark(4);
        ARR_ROWS.forEach((r,i)=>{ if(r[0]!==com) return;
          tG.cellEls[i][0].classList.add('g'+g);
          if(r[ARR]===null){ const c=tG.cellEls[i][ARR]; c.textContent=fmt(MED_GRUPO[com]); c._isnan=false; c.className='dfc fill'; } }); }})),
    {d:`Con la mediana <b>general</b> (${MED_GENERAL}) los tres NaN habrían recibido lo mismo: la fila 8 de Talcahuano quedaría en ${MED_GENERAL} `+
       `y no en ${MED_GRUPO['Talcahuano']}, más que cualquier arriendo real de su comuna. `+
       'Gracias a <code>arriendo_imputado</code>, <code>df[df[\'arriendo_imputado\']]</code> muestra lo inventado para revisarlo.',
     async run(ultimo){ if(ultimo) cbG.mark(null); }}
  ];
  const resetG = ()=>{ tG.render(); ARR_ROWS.forEach((_,i)=>{ tG.cellEls[i][MARCA].textContent=''; }); cbG.mark(null); };
  new Stepper(cG, pasosG, resetG, 'nulos');
  cG.append(el('div',{class:'note',html:'Con <code>groupby</code> (lo verás más adelante) el bucle cabe en una línea: '+
    '<code>df[\'arriendo\'].fillna(df.groupby(\'comuna\')[\'arriendo\'].transform(\'median\'))</code>.'}));
  section.append(cG);
  resetG();

  /* ===================== Tarjeta: series de tiempo — ffill, bfill, interpolate ===================== */
  const HORAS = Array.from({length:12},(_,i)=>String(6+i).padStart(2,'0')+':00');
  const REAL = [9.8,9.5,10.2,11.6,13.4,15.3,17.1,18.6,19.7,20.3,20.1,19.2];
  const CORTES = [2,5,6,7];
  const SENSOR = REAL.map((v,i)=>CORTES.includes(i)?null:v);
  /* misma lógica que pandas: limit cuenta desde el borde del corte en la dirección de relleno */
  function rellenar(metodo, limit){
    const out = SENSOR.slice(), n=out.length;
    if(metodo==='ffill' || metodo==='bfill'){
      const idx = metodo==='ffill' ? [...out.keys()] : [...out.keys()].reverse();
      let ult=null, racha=0;
      for(const i of idx){
        if(SENSOR[i]!==null){ ult=SENSOR[i]; racha=0; continue; }
        racha++;
        if(ult!==null && (limit==null || racha<=limit)) out[i]=ult;
      }
    } else if(metodo==='interp'){
      for(let i=0;i<n;i++){
        if(SENSOR[i]!==null) continue;
        let a=i-1; while(a>=0 && SENSOR[a]===null) a--;
        let b=i+1; while(b<n && SENSOR[b]===null) b++;
        if(a<0 || b>=n) continue;
        if(limit!=null && i-a>limit) continue;
        out[i] = SENSOR[a] + (SENSOR[b]-SENSOR[a])*(i-a)/(b-a);
      }
    }
    return out;
  }
  const cT = el('div',{class:'card'});
  cT.append(el('h3',{},'Series de tiempo: ',el('code',{},'ffill'),', ',el('code',{},'bfill'),' e ',el('code',{},'interpolate')));
  cT.append(el('p',{class:'note',html:'El sensor de un invernadero en Chillán perdió conexión a las 08:00 y entre las 11:00 y las 13:00. '+
    'En datos ordenados en el tiempo, la mejor pista de un valor faltante es <b>lo que pasó justo antes y justo después</b>. '+
    'La línea gris gruesa es la temperatura real, que en la práctica no conoces.'}));
  const NS='http://www.w3.org/2000/svg';
  const sv=(tag,attrs={},text)=>{ const n=document.createElementNS(NS,tag);
    for(const [k,v] of Object.entries(attrs)) n.setAttribute(k,v); if(text!=null) n.textContent=text; return n; };
  const W=640, H=250, L=40, R=14, T=12, B=30, YMIN=8, YMAX=22;
  const px=i=>L+(W-L-R)*i/(HORAS.length-1), py=v=>T+(H-T-B)*(1-(v-YMIN)/(YMAX-YMIN));
  const svgT=sv('svg',{viewBox:`0 0 ${W} ${H}`,style:'width:100%;max-width:720px;min-width:420px;display:block',
    role:'img','aria-label':'Temperatura por hora: valores reales, datos disponibles y valores rellenados'});
  for(let v=10; v<=22; v+=4){
    svgT.append(sv('line',{x1:L,x2:W-R,y1:py(v),y2:py(v),class:'gridline'}),
      sv('text',{x:L-6,y:py(v)+4,'text-anchor':'end'},v+'°'));
  }
  HORAS.forEach((h,i)=>{ if(i%2===0) svgT.append(sv('text',{x:px(i),y:H-10,'text-anchor':'middle'},h)); });
  svgT.append(sv('line',{x1:L,x2:W-R,y1:H-B,y2:H-B,class:'axisline'}));
  svgT.append(sv('path',{d:REAL.map((v,i)=>(i?'L':'M')+px(i)+','+py(v)).join(' '),fill:'none',
    stroke:'var(--muted)','stroke-width':6,'stroke-linecap':'round','stroke-linejoin':'round',opacity:.3}));
  const gT=sv('g');
  svgT.append(gT);
  cT.append(el('div',{style:'overflow-x:auto'}, svgT));
  cT.append(el('div',{class:'note',html:'<span style="color:var(--ink)">●</span> dato disponible · '+
    '<span style="color:var(--s6)">○</span> valor rellenado · <span style="color:var(--muted);opacity:.6">━</span> temperatura real'}));

  let metodoT='nada';
  const btnsT = btnGroup(cT, [
    {label:'Con huecos',value:'nada'},{label:'ffill()',value:'ffill'},
    {label:'bfill()',value:'bfill'},{label:'interpolate()',value:'interp'}
  ], m=>{ metodoT=m; dibujarT(); });
  const limSel = el('select',{onchange:()=>dibujarT()},
    el('option',{value:''},'sin límite'), el('option',{value:'1'},'limit=1'));
  btnsT[0].parentNode.append(el('label',{},'límite'), limSel);
  const cbT = el('pre',{class:'code'});
  const msgT = el('div',{class:'msg'});
  cT.append(cbT, msgT, el('div',{class:'note',html:'<b>Ningún método adivina</b> lo que pasó en un corte largo. '+
    'Con <code>limit</code> solo se rellenan los primeros N valores de cada corte y el resto queda NaN: el tramo dudoso sigue a la vista. '+
    '<b>Ojo:</b> los tres métodos suponen filas <b>ordenadas en el tiempo</b>; si no lo están, primero <code>sort_index()</code> o <code>sort_values()</code>.'}));
  section.append(cT);

  function dibujarT(){
    const limit = limSel.value==='' ? null : Number(limSel.value);
    const vals = metodoT==='nada' ? SENSOR : rellenar(metodoT, limit);
    gT.textContent='';
    let d='';  /* la línea del método une solo tramos consecutivos con valor */
    vals.forEach((v,i)=>{ if(v===null) return; d += (i>0 && vals[i-1]!==null ? 'L':'M')+px(i)+','+py(v)+' '; });
    gT.append(sv('path',{d,fill:'none',stroke:'var(--s1)','stroke-width':2,
      'stroke-dasharray': metodoT==='nada'?'none':'5 4'}));
    vals.forEach((v,i)=>{
      if(v===null){ gT.append(sv('text',{x:px(i),y:H-B-6,'text-anchor':'middle',style:'fill:var(--s8);font-weight:600'},'NaN')); return; }
      const relleno = SENSOR[i]===null;
      gT.append(sv('circle',{cx:px(i),cy:py(v),r:relleno?5:3.5,
        fill:relleno?'var(--surface)':'var(--ink)', stroke:relleno?'var(--s6)':'none','stroke-width':2.5}));
    });
    const lim = limit==null ? '' : `limit=${limit}`;
    const llamada = {ffill:`sensor.ffill(${lim})`, bfill:`sensor.bfill(${lim})`, interp:`sensor.interpolate(${lim})`}[metodoT];
    const r3 = x=>String(Math.round(x*1000)/1000);
    cbT.textContent = metodoT==='nada'
      ? "sensor.isna().sum()\n4"
      : llamada + (metodoT==='interp' && !lim ? "      # con índice de fechas: interpolate(method='time')" : '') +
        '\n# valores en las horas que faltaban:\n' +
        CORTES.map(i=>`${HORAS[i]}  →  ${vals[i]===null?'NaN':r3(vals[i])}`).join('\n');
    if(metodoT==='nada'){
      msgT.className='msg'; msgT.textContent='4 lecturas perdidas: una suelta (08:00) y un corte de 3 horas (11:00 a 13:00).';
      return;
    }
    const rellenos = CORTES.filter(i=>vals[i]!==null);
    const err = rellenos.reduce((a,i)=>a+Math.abs(vals[i]-REAL[i]),0)/rellenos.length;
    const faltan = CORTES.length - rellenos.length;
    msgT.className = 'msg '+(err<1?'okc':'err');
    msgT.textContent = `Error promedio en los ${rellenos.length} valores rellenados: ${err.toFixed(2).replace('.',',')} °C`+
      (faltan ? ` · quedan ${faltan} NaN por el límite` : '') +
      ({ffill:' · ffill repite el último valor: queda un escalón plano mientras la temperatura subía.',
        bfill:' · bfill adelanta el valor siguiente: el escalón queda arriba.',
        interp:' · interpolate traza una recta entre el valor anterior y el siguiente.'}[metodoT]);
  }
  dibujarT();
}

registerModule({
  id:'nulos',
  title:'Valores perdidos',
  lead:'Los datos reales llegan con huecos, y a veces disfrazados. Hay que encontrarlos, decidir si se eliminan o se rellenan y con qué: cada decisión cambia lo que tus datos dicen.',
  build
});

})();
