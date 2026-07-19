'use strict';
/* Módulo: Fechas — to_datetime, accesor .dt, Timedelta, resample y date_range
   (clase 22 de 2026-1 y Ejercicio Integrador 2). Datos verificados con pandas. */
(function(){
registerModule({
  id:'fechas',
  title:'Fechas',
  lead:'Una fecha guardada como texto ordena mal y no se puede restar. El flujo del curso: '+
       'parsear con to_datetime, extraer componentes con .dt, restar para obtener Timedelta '+
       'y agrupar en el tiempo con resample.',
  build(sec){

    /* ---------- Tarjeta 1: to_datetime + .dt ---------- */
    {
      const FECHAS=['2026-03-02','2026-03-15','2026-04-01','2026-04-18','2026-05-05'];
      const MONTOS=[8990,12500,7490,15990,9990];
      /* salidas reales de pandas para cada accesor */
      const DT={
        month:{col:'mes',vals:[3,3,4,4,5],code:".dt.month"},
        day:{col:'dia',vals:[2,15,1,18,5],code:".dt.day"},
        year:{col:'año',vals:[2026,2026,2026,2026,2026],code:".dt.year"},
        day_name:{col:'dia_sem',vals:['Monday','Sunday','Wednesday','Saturday','Tuesday'],code:".dt.day_name()"},
      };
      const card=el('div',{class:'card'},
        el('h3',{html:'<code>pd.to_datetime</code> y el accesor <code>.dt</code>'}),
        el('p',{class:'note',html:'Pedidos de una app de delivery. La columna llega como <b>texto</b>: '+
          'primero se parsea y recién entonces <code>.dt</code> puede extraer componentes.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const mount=el('div');card.append(mount);
      const code=codeBox(card);
      const note=el('p',{class:'note'});card.append(note);
      let parsed=false, acc=null;
      function render(){
        mount.textContent='';
        const cols=['fecha','monto'], rows=FECHAS.map((f,i)=>[f,MONTOS[i]]);
        if(acc){cols.push(DT[acc].col); rows.forEach((r,i)=>r.push(DT[acc].vals[i]));}
        const t=new DfTable(mount,{caption:parsed
          ?'df — fecha: datetime64[ns] ✓':'df — fecha: object (texto) ⚠️',
          columns:cols,index:[0,1,2,3,4],rows});
        if(acc)rows.forEach((_,i)=>t.cell(i,2).classList.add('dnew'));
        if(parsed)FECHAS.forEach((_,i)=>t.cell(i,0).classList.add('sel'));
        if(!parsed){
          code.textContent="df['fecha'].dtype   # object — solo texto disfrazado de fecha";
          note.innerHTML='Como texto, <code>.dt</code> no existe y el orden es alfabético. Parsea primero.';
        }else if(!acc){
          code.innerHTML="df['fecha'] = <b>pd.to_datetime</b>(df['fecha'])\ndf['fecha'].dtype   # datetime64[ns] ✓";
          note.innerHTML='Ahora sí: la columna es una fecha de verdad. Prueba los accesores <code>.dt</code>.';
        }else{
          code.innerHTML=`df['${DT[acc].col}'] = df['fecha']<b>${DT[acc].code}</b>`;
          note.innerHTML=acc==='day_name'
            ?'<b>day_name() habla inglés</b> por defecto — el clásico «¿por qué me salió Monday?». '+
             'Para español: <code>day_name(locale=\'es_CL\')</code> (si el sistema lo tiene instalado).'
            :'La columna nueva (azul) es numérica: sirve para filtrar y agrupar por periodo.';
        }
      }
      const bParse=el('button',{class:'btn primary',onclick:()=>{parsed=true;bParse.disabled=true;accBtns.forEach(b=>b.disabled=false);render();}},'pd.to_datetime(df[\'fecha\'])');
      ctr.append(bParse);
      const accBtns=btnGroup(ctr,[
        {label:'.dt.month',value:'month'},{label:'.dt.day',value:'day'},
        {label:'.dt.year',value:'year'},{label:'.dt.day_name()',value:'day_name'},
      ],v=>{acc=v;render();},false);
      accBtns.forEach(b=>b.disabled=true);
      render();
    }

    /* ---------- Tarjeta 2: Timedelta ---------- */
    {
      const PED=['2026-03-02','2026-03-15','2026-04-01','2026-04-18'];
      const ENT=['2026-03-05','2026-03-26','2026-04-02','2026-04-30'];
      const DIAS=[3,11,1,12]; /* (entrega - pedido).dt.days verificado */
      const card=el('div',{class:'card'},
        el('h3',{html:'Restar fechas: <code>Timedelta</code>'}),
        el('p',{class:'note',html:'Pedido y entrega de 4 despachos. Restar dos columnas de fecha '+
          'da un <b>Timedelta</b> («3 days») y <code>.dt.days</code> lo convierte en número — '+
          'así se calculan demoras y atrasos en el Ejercicio Integrador 2.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const mount=el('div');card.append(mount);
      const code=codeBox(card);
      let conDias=false;
      function render(){
        mount.textContent='';
        const cols=['pedido','entrega']; const rows=PED.map((p,i)=>[p,ENT[i]]);
        if(conDias){cols.push('demora'); rows.forEach((r,i)=>r.push(DIAS[i]));}
        const t=new DfTable(mount,{columns:cols,index:[0,1,2,3],rows});
        if(conDias){
          rows.forEach((_,i)=>t.cell(i,2).classList.add('dnew'));
          const max=Math.max(...DIAS), maxI=DIAS.indexOf(max);
          t.cell(maxI,2).classList.add('hl');
          code.innerHTML="df['demora'] = (df['entrega'] - df['pedido'])<b>.dt.days</b>\ndf['demora'].max()   # "+max+" días — el despacho más lento";
        }else{
          code.textContent="df['entrega'] - df['pedido']   # Serie de Timedelta: '3 days', '11 days', …";
        }
      }
      btnGroup(ctr,[
        {label:'restar fechas',value:false},
        {label:"+ columna demora (.dt.days)",value:true},
      ],v=>{conDias=v;render();});
      render();
    }

    /* ---------- Tarjeta 3: resample (groupby en el tiempo) ---------- */
    {
      /* boletas desordenadas, como llegan en la vida real */
      const ROWS=[['2026-03-03',1200],['2026-04-05',900],['2026-03-18',800],['2026-05-10',700],
                  ['2026-04-22',1100],['2026-03-29',1500],['2026-05-19',1300],['2026-05-30',600]];
      const MESCLS={3:'g0',4:'g1',5:'g2'};
      const MESNOM={3:'marzo',4:'abril',5:'mayo'};
      const SUMS=[['2026-03-31',3500],['2026-04-30',2000],['2026-05-31',2600]]; /* verificado */
      const card=el('div',{class:'card'},
        el('h3',{html:'<code>resample</code>: groupby en el tiempo'}),
        el('p',{class:'note',html:'Ventas sueltas de la cafetería → total por mes. '+
          '<code>resample(\'ME\')</code> agrupa por periodo calendario (ME = fin de mes; '+
          'en versiones antiguas de pandas se escribía <code>\'M\'</code>).'}));
      sec.append(card);
      const holder=el('div',{style:'display:flex;gap:1.4rem;flex-wrap:wrap;align-items:flex-start'});
      card.append(holder);
      const mLeft=el('div'),mRight=el('div');holder.append(mLeft,mRight);
      const code=codeBox(card);
      let t=null;
      const mes=f=>+f.slice(5,7);
      function reset(){
        mLeft.textContent='';mRight.textContent='';
        t=new DfTable(mLeft,{caption:'ventas (como llegaron)',columns:['fecha','monto'],
          index:[...ROWS.keys()],rows:ROWS.map(r=>[...r])});
        code.textContent="serie = df.set_index('fecha').resample('ME')['monto'].sum()";
      }
      const steps=[
        {d:'<b>Etiquetar.</b> <code>set_index(\'fecha\')</code> + <code>resample(\'ME\')</code> asignan cada boleta '+
           'a su periodo: un color por mes.',
         async run(){
           ROWS.forEach((r,i)=>{
             t.cell(i,0).classList.add(MESCLS[mes(r[0])]);
             t.cell(i,1).classList.add(MESCLS[mes(r[0])]);
           });
         }},
        {d:'<b>Ordenar.</b> El índice temporal ordena cronológicamente — las boletas de cada mes quedan juntas.',
         async run(){
           const order=[...ROWS.keys()].sort((a,b)=>ROWS[a][0]<ROWS[b][0]?-1:1);
           flipRows(t.root,()=>{
             order.forEach(i=>t.root.append(t.rowEls[i]));
           });
           await sleep(650);
         }},
        {d:'<b>Colapsar.</b> Cada grupo se reduce a UNA fila con la suma del mes. Ojo: la etiqueta es el '+
           '<b>fin de mes</b> (2026-03-31), no el inicio.',
         async run(){
           mRight.textContent='';
           const tr=new DfTable(mRight,{caption:"resample('ME')['monto'].sum()",
             columns:['monto'],index:SUMS.map(s=>s[0]),rows:SUMS.map(s=>[s[1]])});
           SUMS.forEach((s,i)=>tr.cell(i,0).classList.add(MESCLS[mes(s[0])]));
           code.innerHTML="serie = df.set_index('fecha').resample(<b>'ME'</b>)['monto'].sum()\n# 2026-03-31    3500   ← marzo\n# 2026-04-30    2000   ← abril\n# 2026-05-31    2600   ← mayo";
         }},
      ];
      reset();
      new Stepper(card,steps,reset,'fechas');
      card.append(el('p',{class:'note',html:'La agrupación por mes también se logra con '+
        '<code>df.groupby(df[\'fecha\'].dt.month)</code> — pero resample respeta el calendario '+
        '(meses sin ventas aparecen con 0) y permite frecuencias como \'W\' o \'D\'.'}));
    }

    /* ---------- Tarjeta 4: date_range ---------- */
    {
      const RANGES={ /* pd.date_range('2026-01-01', periods=6, freq=…) verificado */
        'D':  ['2026-01-01','2026-01-02','2026-01-03','2026-01-04','2026-01-05','2026-01-06'],
        'W':  ['2026-01-04','2026-01-11','2026-01-18','2026-01-25','2026-02-01','2026-02-08'],
        'ME': ['2026-01-31','2026-02-28','2026-03-31','2026-04-30','2026-05-31','2026-06-30'],
        '12h':['01-01 00:00','01-01 12:00','01-02 00:00','01-02 12:00','01-03 00:00','01-03 12:00'],
      };
      const NOTAS={
        'D':'Un día tras otro: la base para construir calendarios completos y detectar días sin datos.',
        'W':'<b>\'W\' ancla al domingo</b>: la primera fecha no es el 1 de enero sino el primer domingo (2026-01-04).',
        'ME':'Fin de cada mes — las mismas etiquetas que produce <code>resample(\'ME\')</code>.',
        '12h':'También hay frecuencias con hora: cada 12 horas, \'6h\', \'30min\'…',
      };
      const card=el('div',{class:'card'},
        el('h3',{html:'<code>pd.date_range</code>: fabricar fechas'}),
        el('p',{class:'note',html:'Genera secuencias regulares de fechas. En el Ejercicio Integrador 2 se usa '+
          'para armar el calendario completo y descubrir días sin pedidos.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const chips=el('div');card.append(chips);
      const code=codeBox(card);
      const note=el('p',{class:'note'});card.append(note);
      function render(freq){
        chips.textContent='';
        RANGES[freq].forEach(f=>chips.append(el('span',{class:'chip'},f)));
        code.innerHTML=`pd.date_range('2026-01-01', periods=6, freq=<b>'${freq}'</b>)`;
        note.innerHTML=NOTAS[freq];
      }
      btnGroup(ctr,[
        {label:"freq='D' (diaria)",value:'D'},{label:"'W' (semanal)",value:'W'},
        {label:"'ME' (mensual)",value:'ME'},{label:"'12h'",value:'12h'},
      ],render);
      render('D');
    }
  }
});
})();
