'use strict';
/* =====================================================================
   Módulo: Data wrangling
   ===================================================================== */
(function(){

  registerModule({
    id:'wrangling',
    title:'Data wrangling',
    lead:'Limpiar y transformar: duplicados, reemplazos, tramos con cut y qcut, texto con .str, ordenamiento y ranking.',
    build(section){
      buildDuplicados(section);
      buildReemplazo(section);
      buildCut(section);
      buildTexto(section);
      buildOrden(section);
    }
  });

  /* ---------------- Tarjeta 1: Duplicados ---------------- */
  function buildDuplicados(section){
    const DATA = {
      index:[0,1,2,3,4,5,6],
      columns:['cliente','producto','monto'],
      rows:[
        ['Ana','Café',2500],
        ['Luis','Té',1800],
        ['Ana','Café',2500],
        ['Marta','Jugo',2200],
        ['Luis','Té',1800],
        ['Pedro','Café',2600],
        ['Ana','Café',2500],
      ]
    };
    // grupos de filas exactamente iguales en todas las columnas
    const GROUPS = [[0,2,6],[1,4]];
    function dupRows(keep){
      const out=[];
      for(const g of GROUPS){
        if(keep==='first') out.push(...g.slice(1));
        else if(keep==='last') out.push(...g.slice(0,-1));
        else out.push(...g); // keep === 'false' → False
      }
      return out.sort((a,b)=>a-b);
    }
    function keepDisplay(keep){ return keep==='false' ? 'False' : `'${keep}'`; }

    const card = el('div',{class:'card'}, el('h3',{},'Duplicados'));
    section.append(card);
    const table = new DfTable(card,{index:DATA.index,columns:DATA.columns,rows:DATA.rows,caption:'df — ventas'});

    const selectKeep = el('select',{},
      el('option',{value:'first'},"'first'"),
      el('option',{value:'last'},"'last'"),
      el('option',{value:'false'},'False'),
    );
    const controls = el('div',{class:'controls'},
      el('label',{},'keep = '),
      selectKeep,
      el('button',{class:'btn',onclick:()=>marcar()},'Marcar duplicated(keep=…)'),
      el('button',{class:'btn',onclick:()=>dropDup()},'drop_duplicates()'),
      el('button',{class:'btn',onclick:()=>restaurar()},'Restaurar'),
    );
    card.append(controls);
    const msg = el('div',{class:'msg'},'.duplicated().sum() = —');
    card.append(msg);
    const code = codeBox(card);

    /* token de corrida: cualquier botón invalida la animación en vuelo */
    let run1=0;
    function marcar(){
      run1++;
      table.clearMarks();
      const keep = selectKeep.value;
      const rows = dupRows(keep);
      rows.forEach(i=>{
        table.rowEls[i]._idx.classList.add('dupe');
        table.cellEls[i].forEach(c=>c.classList.add('dupe'));
      });
      msg.textContent = `.duplicated().sum() = ${rows.length}`;
      code.innerHTML = `df.duplicated(keep=<b>${keepDisplay(keep)}</b>)`;
    }

    async function dropDup(){
      const t = ++run1;
      table.clearMarks();
      const keep = selectKeep.value;
      const rows = dupRows(keep);
      msg.textContent = `.duplicated().sum() = ${rows.length}`;
      code.innerHTML = `df.drop_duplicates(keep=<b>${keepDisplay(keep)}</b>)`;
      for(const i of rows){
        table.rowEls[i]._idx.classList.add('dupe');
        table.cellEls[i].forEach(c=>c.classList.add('dupe'));
        table.rowEls[i].classList.add('roff');
        await sleep(180); if(t!==run1) return;
      }
    }

    function restaurar(){
      run1++;
      table.clearMarks();
      msg.textContent = '.duplicated().sum() = —';
      code.textContent = '# elige "keep" y presiona un botón ↑';
    }

    restaurar();
  }

  /* ---------------- Tarjeta 2: Reemplazo y mapeo ---------------- */
  function buildReemplazo(section){
    const DATA = {
      index:[0,1,2,3,4],
      columns:['respuesta','comuna'],
      rows:[
        ['sí','Concepción'],
        ['no','Talcahuano'],
        ['sí','Hualpén'],
        ['s/r','Concepción'],
        ['no','Hualpén'],
      ]
    };

    const card = el('div',{class:'card'}, el('h3',{},'Reemplazo y mapeo'));
    section.append(card);
    const table = new DfTable(card,{index:DATA.index,columns:DATA.columns,rows:DATA.rows,caption:'df — encuesta'});

    const controls = el('div',{class:'controls'},
      el('button',{class:'btn',onclick:()=>doReplace()},"replace({'sí':1,'no':0})"),
      el('button',{class:'btn',onclick:()=>doMap()},"map({'sí':1,'no':0})"),
      el('button',{class:'btn',onclick:()=>restaurar()},'Restaurar'),
    );
    card.append(controls);
    const note = el('div',{class:'note'},'Elige una operación para ver cómo transforma la columna «respuesta».');
    card.append(note);
    const code = codeBox(card);
    code.textContent = '# elige un botón arriba ↑';

    /* token de corrida compartido por replace/map/restaurar */
    let run2=0;
    async function doReplace(){
      const t = ++run2;
      table.render();
      for(let i=0;i<DATA.rows.length;i++){
        const cell = table.cellEls[i][0];
        cell.classList.add('hl');
        await sleep(350); if(t!==run2) return;
        const val = DATA.rows[i][0];
        cell.classList.remove('hl');
        if(val==='sí'){ cell.textContent='1'; cell.classList.add('fill'); }
        else if(val==='no'){ cell.textContent='0'; cell.classList.add('fill'); }
        // 's/r' no está en el diccionario → se deja intacto
      }
      note.innerHTML = "replace() solo cambia los valores presentes en el diccionario ('sí'→1, 'no'→0). <b>'s/r' no está en el diccionario, así que queda igual.</b>";
      code.innerHTML = `df['respuesta'] = df['respuesta'].<b>replace</b>({'sí': 1, 'no': 0})`;
    }

    async function doMap(){
      const t = ++run2;
      table.render();
      for(let i=0;i<DATA.rows.length;i++){
        const cell = table.cellEls[i][0];
        cell.classList.add('hl');
        await sleep(350); if(t!==run2) return;
        const val = DATA.rows[i][0];
        cell.classList.remove('hl');
        if(val==='sí'){ cell.textContent='1'; cell.classList.add('fill'); }
        else if(val==='no'){ cell.textContent='0'; cell.classList.add('fill'); }
        else{ cell.textContent='NaN'; cell.className='dfc nan'; }
      }
      note.innerHTML = "<b>map() reemplaza según el diccionario, pero cualquier valor que NO sea una clave se convierte en NaN.</b> Por eso 's/r' se pierde como dato — a diferencia de replace(), que lo deja intacto.";
      code.innerHTML = `df['respuesta'] = df['respuesta'].<b>map</b>({'sí': 1, 'no': 0})`;
    }

    function restaurar(){
      run2++;
      table.render();
      note.textContent = 'Elige una operación para ver cómo transforma la columna «respuesta».';
      code.textContent = '# elige un botón arriba ↑';
    }
  }

  /* ---------------- Tarjeta 3: Discretización con pd.cut y pd.qcut ---------------- */
  function buildCut(section){
    const NOMBRES = ['Sofía','Benjamín','Pedro','Elena','Rosa','Manuel','Diego','Emilia'];
    const EDADES  = [15,22,34,45,61,70,28,8];
    const DATA = {
      index: EDADES.map((_,i)=>i),
      columns:['nombre','edad','grupo'],
      rows: NOMBRES.map((n,i)=>[n,EDADES[i],''])
    };
    const BINS = [0,18,40,65,120];
    const LABELS = ['niñez','adulto joven','adulto','mayor'];
    const GCLS = ['g0','g1','g2','g3'];
    function binIndex(age,bins){
      for(let i=0;i<bins.length-1;i++){
        if((age>bins[i] || (i===0 && age===bins[0])) && age<=bins[i+1]) return i;
      }
      return -1;
    }
    /* cuantiles como pandas (interpolación lineal) para los bordes de qcut */
    function cuantil(sorted,q){
      const pos=(sorted.length-1)*q, lo=Math.floor(pos), hi=Math.ceil(pos);
      return sorted[lo]+(sorted[hi]-sorted[lo])*(pos-lo);
    }
    const ORD=[...EDADES].sort((a,b)=>a-b);
    const QBINS=[0,.25,.5,.75,1].map(q=>cuantil(ORD,q));
    const fmtB=x=>String(Math.round(x*100)/100);

    const card = el('div',{class:'card'}, el('h3',{},'Discretización: pd.cut y pd.qcut'));
    section.append(card);
    const table = new DfTable(card,{index:DATA.index,columns:DATA.columns,rows:DATA.rows,caption:'df — personas'});

    const controls = el('div',{class:'controls'},
      el('button',{class:'btn',onclick:()=>aplicar('cut')},'pd.cut(bins=[0,18,40,65,120])'),
      el('button',{class:'btn',onclick:()=>aplicar('qcut')},'pd.qcut(q=4)'),
      el('button',{class:'btn',onclick:()=>restaurar()},'Restaurar'),
    );
    card.append(controls);
    const legend = el('div',{class:'legend'});
    card.append(legend);
    const note = el('div',{class:'note'});
    card.append(note);
    const code = codeBox(card);

    const MODOS={
      cut:{bins:BINS,labels:LABELS,
        tramos:LABELS.map((l,i)=>`${l}  (${BINS[i]}, ${BINS[i+1]}]`),
        nota:'<b>cut usa los bordes que tú defines.</b> Los intervalos son <b>(a, b]</b>: abiertos a la izquierda, '+
          'cerrados a la derecha, así que alguien de exactamente 18 años cae en «niñez». Los tramos quedan con '+
          'cantidades distintas de personas.',
        code:`pd.cut(df['edad'],\n       bins=<b>[0, 18, 40, 65, 120]</b>,\n       labels=<b>['niñez', 'adulto joven', 'adulto', 'mayor']</b>)`},
      qcut:{bins:QBINS,labels:['Q1','Q2','Q3','Q4'],
        tramos:['Q1','Q2','Q3','Q4'].map((l,i)=>`${l}  (${fmtB(QBINS[i])}, ${fmtB(QBINS[i+1])}]`),
        nota:'<b>qcut usa cuantiles:</b> los bordes salen de los datos para que cada tramo tenga la '+
          '<b>misma cantidad</b> de personas (aquí, 2 por tramo). Úsalo cuando quieres grupos parejos; '+
          'usa cut cuando los tramos tienen significado propio (edades legales, notas).',
        code:`pd.qcut(df['edad'], <b>q=4</b>,\n        labels=<b>['Q1', 'Q2', 'Q3', 'Q4']</b>)\n# bordes: ${QBINS.map(fmtB).join(', ')}`},
    };

    let run=0;
    async function aplicar(modo){
      const t=++run, m=MODOS[modo];
      table.render();
      legend.textContent='';
      m.tramos.forEach((txt,i)=>legend.append(el('span',{},
        el('span',{class:'sw',style:`background:var(--s${i+1})`}),txt)));
      note.innerHTML=m.nota; code.innerHTML=m.code;
      for(let i=0;i<DATA.rows.length;i++){
        const cell = table.cellEls[i][2];
        cell.classList.add('hl');
        await sleep(300); if(t!==run) return;
        const bi = binIndex(DATA.rows[i][1],m.bins);
        cell.classList.remove('hl');
        cell.textContent = m.labels[bi];
        cell.classList.add(GCLS[bi]);
      }
    }
    function restaurar(){
      run++;
      table.render();
      legend.textContent='';
      note.innerHTML='Elige <b>cut</b> (bordes fijos) o <b>qcut</b> (cuantiles) para llenar la columna «grupo».';
      code.textContent='# elige un botón arriba ↑';
    }
    restaurar();
  }

  /* ---------------- Tarjeta 4: Texto con .str ---------------- */
  function buildTexto(section){
    const CRUDO=[' CONCEPCIÓN','concepción ','Concepción','san pedro','San Pedro ','LOTA'];
    const card = el('div',{class:'card'}, el('h3',{html:'Limpiar texto con <code>.str</code>'}));
    section.append(card);
    card.append(el('p',{class:'note',html:'Estación de cada reclamo, escrita a mano. Para <code>groupby</code> o '+
      '<code>value_counts</code>, <code>" CONCEPCIÓN"</code> y <code>"Concepción"</code> son <b>dos estaciones distintas</b>. '+
      'Activa los métodos y mira cuántos valores distintos quedan. Los espacios se marcan con ·.'}));
    const chkStrip=el('input',{type:'checkbox',id:'wr-strip'});
    const selCase=el('select',{},['(nada)','lower','upper','title'].map(v=>el('option',{value:v},v)));
    card.append(el('div',{class:'controls'},
      chkStrip,el('label',{for:'wr-strip',html:' <code>.str.strip()</code>'}),
      el('label',{html:'&nbsp; mayúsculas: '}),selCase));
    const mount=el('div');card.append(mount);
    const note=el('p',{class:'note'});card.append(note);
    const code=codeBox(card);
    const CASE={lower:s=>s.toLowerCase(),upper:s=>s.toUpperCase(),
      title:s=>s.toLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase())};
    function render(){
      const f=s=>{ let r=chkStrip.checked?s.trim():s; if(CASE[selCase.value])r=CASE[selCase.value](r); return r; };
      const vals=CRUDO.map(f);
      const n=new Set(vals).size;
      mount.textContent='';
      new DfTable(mount,{caption:'df[\'estacion\']',columns:['estacion'],index:CRUDO.map((_,i)=>i),
        rows:vals.map(v=>[`"${v.replace(/ /g,'·')}"`])});
      note.innerHTML=`<b>${n} valores distintos</b> (deberían ser 3). `+(n===3
        ?'Listo: hacía falta <b>las dos cosas</b>, sacar los espacios y unificar las mayúsculas.'
        :'Con un solo método no alcanza: <code>strip</code> no toca las mayúsculas y <code>title</code> no saca los espacios.');
      const chain=(chkStrip.checked?'.str.strip()':'')+(CASE[selCase.value]?`.str.${selCase.value}()`:'');
      code.innerHTML=`df['estacion'] = df['estacion']<b>${chain||''}</b>\ndf['estacion'].nunique()   # ${n}`+
        (chain.includes(').str')?'\n# cada método lleva su propio .str':'');
      relayout();
    }
    chkStrip.onchange=render; selCase.onchange=render;
    render();
  }

  /* ---------------- Tarjeta 5: Ordenamiento y ranking ---------------- */
  function buildOrden(section){
    const DATA = {
      index:['E01','E02','E03','E04','E05'],
      columns:['nombre','carrera','promedio','generación'],
      rows:[
        ['Valentina','ICI',6.1,2023],
        ['Matías','IECI',5.4,2024],
        ['Camila','ICI',4.9,2022],
        ['Joaquín','IIND',6.5,2023],
        ['Antonia','IECI',6.1,2024],
      ]
    };

    const card = el('div',{class:'card'}, el('h3',{},'Ordenamiento y ranking'));
    section.append(card);
    const table = new DfTable(card,{index:DATA.index,columns:DATA.columns,rows:DATA.rows,caption:'df — estudiantes'});

    const selCol = el('select',{},
      el('option',{value:'promedio'},'promedio'),
      el('option',{value:'nombre'},'nombre'),
      el('option',{value:'generación'},'generación'),
    );
    const selAsc = el('select',{},
      el('option',{value:'true'},'True'),
      el('option',{value:'false'},'False'),
    );
    const controls = el('div',{class:'controls'},
      el('label',{},'by = '), selCol,
      el('label',{},'ascending = '), selAsc,
      el('button',{class:'btn',onclick:()=>doSort()},'sort_values()'),
      el('button',{class:'btn',onclick:()=>doRestore()},'Restaurar orden original'),
    );
    card.append(controls);
    const code = codeBox(card);
    code.innerHTML = `df.sort_values(by=<b>'promedio'</b>, ascending=<b>True</b>)`;

    /* ranking con rank: qué hace cada method con el empate en 6,1 */
    const selMet = el('select',{},['min','first','dense','average'].map(m=>el('option',{value:m},`'${m}'`)));
    card.append(el('div',{class:'controls'},
      el('label',{html:'<code>rank(ascending=False, method=</code>'}), selMet, el('label',{html:'<code>)</code>'})));
    const rankMount = el('div'); card.append(rankMount);
    const rankNote = el('p',{class:'note'}); card.append(rankNote);
    const rankCode = codeBox(card);
    const NOTA_MET = {
      min:"<b>'min'</b>: los empatados reciben el lugar más bajo del empate (2 y 2) y el siguiente salta al 4, como en un podio.",
      first:"<b>'first'</b>: desempata por orden de aparición: Valentina (E01) va antes que Antonia (E05).",
      dense:"<b>'dense'</b>: empatados en 2 y el siguiente es 3, sin saltos.",
      average:"<b>'average'</b> (por defecto): los empatados se reparten los lugares 2 y 3 y reciben 2,5.",
    };
    function rankear(){
      const col = DATA.columns.indexOf('promedio');
      const vals = DATA.rows.map(r=>r[col]);
      const desc = vals.map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]);
      const pos = new Array(vals.length);
      desc.forEach(([,i],k)=>{ pos[i]=k+1; });
      const distintos = [...new Set(vals)].sort((a,b)=>b-a);
      const lugar = vals.map((v,i)=>{
        const emp = desc.map(([w],k)=>w===v?k+1:null).filter(x=>x!=null);
        const m = selMet.value;
        if(m==='min') return Math.min(...emp);
        if(m==='first') return pos[i];
        if(m==='dense') return distintos.indexOf(v)+1;
        return emp.reduce((a,b)=>a+b,0)/emp.length;
      });
      rankMount.textContent='';
      new DfTable(rankMount,{caption:"df['lugar']",columns:['promedio','lugar'],index:DATA.index,
        rows:vals.map((v,i)=>[v,lugar[i]])});
      rankNote.innerHTML = NOTA_MET[selMet.value];
      rankCode.innerHTML = `df['lugar'] = df['promedio'].rank(ascending=False, method=<b>'${selMet.value}'</b>)`;
      relayout();
    }
    selMet.onchange = rankear;
    rankear();

    function doSort(){
      const col = selCol.value;
      const asc = selAsc.value==='true';
      const colIdx = DATA.columns.indexOf(col);
      const order = DATA.rows.map((_,i)=>i).sort((a,b)=>{
        const va=DATA.rows[a][colIdx], vb=DATA.rows[b][colIdx];
        const cmp = (typeof va==='number') ? (va-vb) : String(va).localeCompare(String(vb),'es');
        return asc ? cmp : -cmp;
      });
      flipRows(table.root, ()=>{
        order.forEach(i=>table.root.appendChild(table.rowEls[i]));
      });
      code.innerHTML = `df.sort_values(by=<b>'${col}'</b>, ascending=<b>${asc?'True':'False'}</b>)`;
    }

    function doRestore(){
      flipRows(table.root, ()=>{
        DATA.rows.forEach((_,i)=>table.root.appendChild(table.rowEls[i]));
      });
      code.innerHTML = `df.sort_values(by=<b>'promedio'</b>, ascending=<b>True</b>)`;
    }
  }

})();
