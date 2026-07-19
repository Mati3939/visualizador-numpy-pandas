'use strict';
/* =====================================================================
   Módulo: Data wrangling (Semanas 9–10)
   ===================================================================== */
(function(){

  registerModule({
    id:'wrangling',
    title:'Data wrangling',
    lead:'Limpiar y transformar: duplicados, reemplazos, discretización y ordenamiento.',
    build(section){
      buildDuplicados(section);
      buildReemplazo(section);
      buildCut(section);
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

    function marcar(){
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
      table.clearMarks();
      const keep = selectKeep.value;
      const rows = dupRows(keep);
      msg.textContent = `.duplicated().sum() = ${rows.length}`;
      code.innerHTML = `df.drop_duplicates(keep=<b>${keepDisplay(keep)}</b>)`;
      for(const i of rows){
        table.rowEls[i]._idx.classList.add('dupe');
        table.cellEls[i].forEach(c=>c.classList.add('dupe'));
        table.rowEls[i].classList.add('roff');
        await sleep(180);
      }
    }

    function restaurar(){
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

    async function doReplace(){
      table.render();
      for(let i=0;i<DATA.rows.length;i++){
        const cell = table.cellEls[i][0];
        cell.classList.add('hl');
        await sleep(350);
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
      table.render();
      for(let i=0;i<DATA.rows.length;i++){
        const cell = table.cellEls[i][0];
        cell.classList.add('hl');
        await sleep(350);
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
      table.render();
      note.textContent = 'Elige una operación para ver cómo transforma la columna «respuesta».';
      code.textContent = '# elige un botón arriba ↑';
    }
  }

  /* ---------------- Tarjeta 3: Discretización con pd.cut ---------------- */
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
    function binIndex(age){
      for(let i=0;i<BINS.length-1;i++){ if(age>BINS[i] && age<=BINS[i+1]) return i; }
      return -1;
    }

    const card = el('div',{class:'card'}, el('h3',{},'Discretización con pd.cut'));
    section.append(card);
    const table = new DfTable(card,{index:DATA.index,columns:DATA.columns,rows:DATA.rows,caption:'df — personas'});

    const controls = el('div',{class:'controls'},
      el('button',{class:'btn',onclick:()=>aplicar()},'Aplicar pd.cut(bins=[0,18,40,65,120])'),
      el('button',{class:'btn',onclick:()=>restaurar()},'Restaurar'),
    );
    card.append(controls);

    const legend = el('div',{class:'legend'},
      el('span',{}, el('span',{class:'sw',style:'background:var(--s1)'}),'niñez  (0, 18]'),
      el('span',{}, el('span',{class:'sw',style:'background:var(--s2)'}),'adulto joven  (18, 40]'),
      el('span',{}, el('span',{class:'sw',style:'background:var(--s3)'}),'adulto  (40, 65]'),
      el('span',{}, el('span',{class:'sw',style:'background:var(--s4)'}),'mayor  (65, 120]'),
    );
    card.append(legend);

    const note = el('div',{class:'note',html:'Los intervalos de pd.cut son <b>(a, b]</b>: abiertos a la izquierda, cerrados a la derecha. Por eso alguien de exactamente 18 años cae en «niñez», no en «adulto joven».'});
    card.append(note);

    const code = codeBox(card);
    code.innerHTML = `pd.cut(df['edad'],\n       bins=<b>[0, 18, 40, 65, 120]</b>,\n       labels=<b>['niñez', 'adulto joven', 'adulto', 'mayor']</b>)`;

    async function aplicar(){
      for(let i=0;i<DATA.rows.length;i++){
        const cell = table.cellEls[i][2];
        cell.classList.add('hl');
        await sleep(300);
        const bi = binIndex(DATA.rows[i][1]);
        cell.classList.remove('hl');
        cell.textContent = LABELS[bi];
        cell.classList.add(GCLS[bi]);
      }
    }
    function restaurar(){ table.render(); }
  }

  /* ---------------- Tarjeta 4: Ordenamiento ---------------- */
  function buildOrden(section){
    const DATA = {
      index:['E01','E02','E03','E04','E05'],
      columns:['nombre','carrera','promedio','generación'],
      rows:[
        ['Valentina','ICI',6.1,2023],
        ['Matías','IECI',5.4,2024],
        ['Camila','ICI',4.9,2022],
        ['Joaquín','IIND',6.5,2023],
        ['Antonia','IECI',5.8,2024],
      ]
    };

    const card = el('div',{class:'card'}, el('h3',{},'Ordenamiento'));
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
