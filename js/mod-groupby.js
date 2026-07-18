'use strict';
/* Módulo: GroupBy y pivoteo — split-apply-combine animado y pivot_table como heatmap */
registerModule({
  id:'groupby',
  title:'GroupBy y pivoteo',
  week:'Semana 11',
  lead:'groupby es split-apply-combine: separar las filas por una llave, aplicar una función '+
       'a cada grupo y recombinar los resultados en una tabla indexada por la llave.',
  build(sec){
    /* ventas de una cafetería universitaria — inspirado en cafe_sales.csv del curso */
    const COLS=['producto','sucursal','monto'];
    const ROWS=[
      ['Café','Centro',2500],['Té','Campus',1800],['Café','Campus',2600],
      ['Jugo','Centro',2200],['Té','Centro',1900],['Café','Centro',2400],
      ['Jugo','Campus',2100],['Té','Campus',1700],['Café','Campus',2700]];
    const KEYS=['Café','Té','Jugo'];               // orden de aparición → orden de grupos
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
           '(4 boletas de Café, 3 de Té, 2 de Jugo). El orden original deja de importar.',
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
           '(ya no 0…8, sino Café/Té/Jugo). Eso es todo groupby: split → apply → combine.',
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

    /* ---------- Tarjeta 2: pivot_table ---------- */
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
