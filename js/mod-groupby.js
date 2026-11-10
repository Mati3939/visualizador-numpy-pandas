'use strict';
/* Módulo: GroupBy y pivoteo — split-apply-combine animado y pivot_table como heatmap */
registerModule({
  id:'groupby',
  title:'GroupBy y pivoteo',
  lead:'groupby es split-apply-combine: separar las filas por una llave, aplicar una función '+
       'a cada grupo y recombinar los resultados. agg resume, transform devuelve un valor por fila '+
       'y filter se queda con grupos enteros.',
  build(sec){
    /* ventas de una cafetería universitaria */
    const COLS=['producto','sucursal','monto'];
    const ROWS=[
      ['Café','Centro',2500],['Té','Campus',1800],['Café','Campus',2600],
      ['Jugo','Centro',2200],['Té','Centro',1900],['Café','Centro',2400],
      ['Jugo','Campus',2100],['Té','Campus',1700],['Café','Campus',2700]];
    const KEYS=['Café','Jugo','Té'];               // groupby ordena las llaves alfabéticamente (sort=True)
    const GCLS={ 'Café':'g0','Té':'g1','Jugo':'g2' };
    const AGG={
      sum:  {label:'sum',  f:a=>a.reduce((x,y)=>x+y,0)},
      mean: {label:'mean', f:a=>a.reduce((x,y)=>x+y,0)/a.length},
      count:{label:'count',f:a=>a.length},
      max:  {label:'max',  f:a=>Math.max(...a)},
    };
    const groupsOf=key=>ROWS.map((r,i)=>[r,i]).filter(([r])=>r[0]===key);

    /* ---------- Tarjeta 1: split-apply-combine ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{html:'<code>groupby</code> paso a paso'}),
        el('p',{class:'note',html:'9 boletas de una cafetería. Vamos a calcular el total vendido por producto: '+
          '<code>df.groupby(\'producto\')[\'monto\'].sum()</code>'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const selA=el('select',{},Object.keys(AGG).map(k=>el('option',{value:k},AGG[k].label)));
      ctr.append(el('label',{},'función de agregación: '),selA);
      const cols=el('div',{class:'flexcols'});card.append(cols);
      const left=el('div'),right=el('div');cols.append(left,right);
      const table=new DfTable(left,{caption:'df (boletas)',columns:COLS,index:[...ROWS.keys()],rows:ROWS});
      const resMount=el('div');right.append(resMount);
      const code=codeBox(card);
      const origOrder=[...table.rowEls];

      let resTable=null;
      function clearResult(){resMount.textContent='';resTable=null;}
      function showResult(upTo /* nº de grupos listos */){
        clearResult();
        const agg=AGG[selA.value];
        const rows=KEYS.slice(0,upTo).map(k=>[agg.f(groupsOf(k).map(([r])=>r[2]))]);
        resTable=new DfTable(resMount,{caption:`resultado (${agg.label})`,columns:['monto'],
          index:KEYS.slice(0,upTo),rows});
        rows.forEach((_,ri)=>{
          resTable.cell(ri,0).classList.add(GCLS[KEYS[ri]]);
          resTable.rowEls[ri]._idx.classList.add(GCLS[KEYS[ri]]);
        });
      }
      function colorRows(){
        ROWS.forEach((r,ri)=>{
          table.rowEls[ri].querySelectorAll('.dfc').forEach(c=>c.classList.add(GCLS[r[0]]));
        });
      }
      function reset(){
        table.clearMarks();clearResult();
        origOrder.forEach(r=>table.root.append(r));
        code.innerHTML=`df.groupby('producto')['monto'].<b>${AGG[selA.value].label}</b>()`;
      }
      const steps=[
        {d:'<b>La llave.</b> <code>groupby(\'producto\')</code> etiqueta cada fila según su valor '+
           'en la columna <code>producto</code>. Cada color es un grupo: todavía no se movió nada.',
         async run(){ colorRows(); }},
        {d:'<b>Split.</b> Conceptualmente, las filas se separan en un mini-DataFrame por grupo '+
           '(4 boletas de Café, 2 de Jugo, 3 de Té). El orden original deja de importar.',
         async run(last){
           colorRows();
           flipRows(table.root,()=>{
             KEYS.forEach(k=>groupsOf(k).forEach(([,ri])=>table.root.append(table.rowEls[ri])));
           });
           if(last)await sleep(600);
         }},
        {d:'<b>Apply.</b> A la columna <code>monto</code> de cada grupo se le aplica la función. '+
           'Cada grupo completo colapsa en un único valor.',
         async run(last){
           colorRows();
           KEYS.forEach(k=>groupsOf(k).forEach(([,ri])=>table.root.append(table.rowEls[ri])));
           for(let g=0;g<KEYS.length;g++){
             if(last){
               groupsOf(KEYS[g]).forEach(([,ri])=>table.cell(ri,2).classList.add('hl'));
               await sleep(420);
             }
             showResult(g+1);
           }
         }},
        {d:'<b>Combine.</b> Los tres valores se recombinan en una Serie cuyo <b>índice es la llave</b> '+
           '(ya no 0…8, sino Café/Jugo/Té, en orden alfabético). Eso es todo groupby: split → apply → combine.',
         async run(){
           colorRows();
           KEYS.forEach(k=>groupsOf(k).forEach(([,ri])=>table.root.append(table.rowEls[ri])));
           table.rowEls.forEach(r=>r.classList.add('roff'));
           showResult(3);
           const agg=AGG[selA.value];
           const vals=KEYS.map(k=>fmt(agg.f(groupsOf(k).map(([r])=>r[2]))));
           code.innerHTML=`df.groupby('producto')['monto'].<b>${agg.label}</b>()\n# producto\n`+
             KEYS.map((k,i)=>`# ${k.padEnd(8)}${vals[i]}`).join('\n')+`\n# Name: monto, dtype: ${agg.label==='mean'?'float64':'int64'}`;
         }},
      ];
      const st=new Stepper(card,steps,reset,'groupby');
      selA.onchange=()=>st.go(st.i);
      reset();
    }

    buildQueDevuelve(sec,COLS,ROWS,GCLS);
    buildConNombre(sec);

    /* ---------- Tarjeta 4: pivot_table ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{html:'<code>pivot_table</code>: groupby en dos dimensiones'}),
        el('p',{class:'note',html:'Un pivote agrupa por <b>dos llaves a la vez</b>: una queda como índice (filas) '+
          'y la otra se convierte en columnas. La celda (Café, Centro) contiene la agregación de las boletas '+
          'que cumplen ambas condiciones. El color codifica la magnitud (más oscuro = más alto).'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const selA=el('select',{},['sum','mean','count'].map(k=>el('option',{value:k},k)));
      ctr.append(el('label',{},'aggfunc: '),selA);
      const mount=el('div');card.append(mount);
      const code=codeBox(card);
      const SUC=['Campus','Centro'];
      const RAMP=['--seq100','--seq200','--seq300','--seq400','--seq500','--seq600','--seq700'];
      function render(){
        mount.textContent='';
        const agg=AGG[selA.value];
        const rows=KEYS.map(k=>SUC.map(s=>{
          const sub=ROWS.filter(r=>r[0]===k&&r[1]===s).map(r=>r[2]);
          return agg.f(sub);
        }));
        const t=new DfTable(mount,{caption:'pivot (producto × sucursal)',columns:SUC,index:KEYS,rows});
        const flat=rows.flat(),lo=Math.min(...flat),hi=Math.max(...flat);
        rows.forEach((row,ri)=>row.forEach((v,ci)=>{
          const k=hi===lo?3:Math.round((v-lo)/(hi-lo)*6);
          const c=t.cell(ri,ci);
          c.style.background=`var(${RAMP[k]})`;
          /* la rampa es fija en ambos temas: la tinta también debe serlo */
          c.style.color=k>=3?'#fff':'#0b0b0b';
          c.style.fontWeight='600';
        }));
        code.innerHTML=`pd.pivot_table(df, values='monto',\n               index='producto', columns='sucursal',\n               aggfunc=<b>'${selA.value}'</b>)`;
      }
      selA.onchange=render;
      render();
    }
  }
});

/* ---------- Tarjeta 2: agg, transform, filter y head — ¿qué devuelve cada uno? ---------- */
function buildQueDevuelve(sec,COLS,ROWS,GCLS){
  const card=el('div',{class:'card'},
    el('h3',{html:'<code>agg</code>, <code>transform</code>, <code>filter</code> y <code>head</code>: ¿qué devuelve cada uno?'}),
    el('p',{class:'note',html:'Las cuatro parten del mismo <code>groupby(\'producto\')</code>. La diferencia está en el '+
      '<b>largo</b> del resultado: una fila por grupo, una por fila original, o algunas filas originales.'}));
  sec.append(card);
  const prom={}, n={};
  ROWS.forEach(r=>{prom[r[0]]=(prom[r[0]]||0)+r[2]; n[r[0]]=(n[r[0]]||0)+1;});
  Object.keys(prom).forEach(k=>{prom[k]/=n[k];});
  const llaves=Object.keys(prom).sort((a,b)=>a.localeCompare(b,'es'));
  const OPS={
    agg:{code:"df.groupby('producto')['monto'].<b>mean()</b>",
      nota:'<b>Resume:</b> una fila por grupo (3), con la llave como índice. Las 9 boletas desaparecen.',
      tabla:()=>({caption:'resultado — 3 filas',columns:['monto'],index:llaves,
        rows:llaves.map(k=>[prom[k]]),grupo:i=>llaves[i]})},
    transform:{code:"df['prom_producto'] = df.groupby('producto')['monto'].<b>transform('mean')</b>",
      nota:'<b>Un valor por fila:</b> el promedio de su producto, repetido en cada boleta (9 filas, el mismo largo de '+
        '<code>df</code>). Por eso se puede guardar como columna, restar (<code>monto - prom_producto</code>) o usar en '+
        '<code>fillna</code> para imputar por grupo.',
      tabla:()=>({caption:'df con la columna nueva — 9 filas',columns:[...COLS,'prom_producto'],index:[...ROWS.keys()],
        rows:ROWS.map(r=>[...r,prom[r[0]]]),grupo:i=>ROWS[i][0],nueva:3})},
    filter:{code:"df.groupby('producto').<b>filter(lambda g: len(g) >= 3)</b>",
      nota:'<b>Grupos enteros:</b> la función recibe cada grupo completo (<code>g</code> es un DataFrame) y devuelve '+
        'True o False. Quedan <b>todas las filas</b> de los grupos que cumplen: Café (4) y Té (3). Jugo (2) sale entero.',
      tabla:()=>{
        const ix=[...ROWS.keys()].filter(i=>n[ROWS[i][0]]>=3);
        return {caption:`filas que quedan — ${ix.length} de 9`,columns:COLS,index:ix,
          rows:ix.map(i=>ROWS[i]),grupo:j=>ROWS[ix[j]][0]};
      }},
    head:{code:"df.sort_values('monto', ascending=False)\n  .groupby('producto').<b>head(1)</b>",
      nota:'<b>Las primeras de cada grupo</b>, en el orden en que vienen. Como antes se ordenó de mayor a menor, '+
        'es la boleta más alta de cada producto. Sin ordenar antes, saldría la primera boleta de cada uno.',
      tabla:()=>{
        const ord=[...ROWS.keys()].sort((a,b)=>ROWS[b][2]-ROWS[a][2]);
        const vistos=new Set();
        const ix=ord.filter(i=>{ if(vistos.has(ROWS[i][0]))return false; vistos.add(ROWS[i][0]); return true; });
        return {caption:'la boleta más alta de cada producto — 3 filas',columns:COLS,index:ix,
          rows:ix.map(i=>ROWS[i]),grupo:j=>ROWS[ix[j]][0]};
      }},
  };
  btnGroup(card,[{label:'agg',value:'agg'},{label:'transform',value:'transform'},
    {label:'filter',value:'filter'},{label:'head',value:'head'}],v=>render(v));
  const cols=el('div',{class:'flexcols'});card.append(cols);
  const left=el('div'),right=el('div');cols.append(left,right);
  const orig=new DfTable(left,{caption:'df (9 boletas)',columns:COLS,index:[...ROWS.keys()],rows:ROWS});
  ROWS.forEach((r,ri)=>orig.rowEls[ri].querySelectorAll('.dfc').forEach(c=>c.classList.add(GCLS[r[0]])));
  const nota=el('p',{class:'note'});card.append(nota);
  const code=codeBox(card);
  function render(op){
    right.textContent='';
    const o=OPS[op], t=o.tabla();
    const tab=new DfTable(right,t);
    t.rows.forEach((row,ri)=>row.forEach((_,ci)=>{
      const c=tab.cell(ri,ci);
      c.classList.add(GCLS[t.grupo(ri)]);
      if(ci===t.nueva)c.classList.add('dnew');
    }));
    nota.innerHTML=o.nota; code.innerHTML=o.code;
    relayout();
  }
  render('agg');
}

/* ---------- Tarjeta 3: agregaciones con nombre, size vs count y as_index ---------- */
function buildConNombre(sec){
  const COLS=['estacion','monto'];
  const ROWS=[['Lota',1700],['Coronel',null],['Lota',2400],['Coronel',3100],['Lota',null],['Coronel',null]];
  const card=el('div',{class:'card'},
    el('h3',{html:'Agregaciones con nombre: <code>size</code>, <code>count</code> y <code>as_index</code>'}),
    el('p',{class:'note',html:'Reembolsos de reclamos: solo algunos reclamos tienen monto. '+
      '<code>nombre=(\'columna\', \'función\')</code> junta varias agregaciones en una sola tabla y elige el nombre de cada columna.'}));
  sec.append(card);
  const chk=el('input',{type:'checkbox',id:'gb-asindex'});
  card.append(el('div',{class:'controls'},chk,el('label',{for:'gb-asindex',html:' <code>as_index=False</code>'})));
  const cols=el('div',{class:'flexcols'});card.append(cols);
  const left=el('div'),right=el('div');cols.append(left,right);
  new DfTable(left,{caption:'df (6 reclamos)',columns:COLS,index:[...ROWS.keys()],rows:ROWS});
  card.append(el('p',{class:'note',html:'<b>size cuenta filas, count cuenta datos:</b> Coronel tiene 3 reclamos pero un solo '+
    'monto. <code>sum</code> también ignora los NaN. Con <code>as_index=False</code> la estación queda como columna '+
    'y el índice vuelve a ser 0, 1, 2…'}));
  const code=codeBox(card);
  const llaves=[...new Set(ROWS.map(r=>r[0]))].sort((a,b)=>a.localeCompare(b,'es'));
  const fila=k=>{
    const g=ROWS.filter(r=>r[0]===k), m=g.map(r=>r[1]).filter(v=>v!=null);
    return [g.length,m.length,m.reduce((a,b)=>a+b,0)];
  };
  function render(){
    right.textContent='';
    const noIdx=chk.checked;
    new DfTable(right,noIdx
      ?{caption:'resultado — la estación es una columna',columns:['estacion','reclamos','con_monto','total'],
        index:llaves.map((_,i)=>i),rows:llaves.map(k=>[k,...fila(k)])}
      :{caption:'resultado — la estación es el índice',columns:['reclamos','con_monto','total'],
        index:llaves,rows:llaves.map(fila)});
    code.innerHTML=`df.groupby('estacion'${noIdx?', <b>as_index=False</b>':''}).agg(\n`+
      `    reclamos=('monto', 'size'),\n    con_monto=('monto', 'count'),\n    total=('monto', 'sum'),\n)`;
    relayout();
  }
  chk.onchange=render;
  render();
}
