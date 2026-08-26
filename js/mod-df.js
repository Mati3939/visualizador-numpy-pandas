'use strict';
/* =====================================================================
   Módulo: DataFrames
   ===================================================================== */
(function(){

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

  registerModule({
    id:'df',
    title:'DataFrames',
    lead:'Un DataFrame es una tabla: cada columna es una Serie con un tipo, y cada fila tiene una etiqueta en el índice.',
    build(section){
      buildAnatomia(section);
      buildLocIloc(section);
      buildColumnas(section);
    }
  });

  /* ---------------- Tarjeta 1: Anatomía de un DataFrame ---------------- */
  function buildAnatomia(section){
    const card = el('div',{class:'card'}, el('h3',{},'Anatomía de un DataFrame'));
    section.append(card);

    const table = new DfTable(card,{index:DATA.index,columns:DATA.columns,rows:DATA.rows,caption:'df — estudiantes'});

    const ITEMS=[
      {label:'Índice', value:'index'},
      {label:'Columnas', value:'columns'},
      {label:'Una fila = una Serie', value:'row'},
      {label:'Una columna = una Serie', value:'col'},
      {label:'Valores (.values)', value:'values'},
    ];
    btnGroup(card, ITEMS, pick, true);

    const noteEl = el('div',{class:'note'});
    card.append(noteEl);
    const code = codeBox(card);

    const NOTES = {
      index:'El índice etiqueta cada fila. No es una columna: vive aparte y se usa con <b>.loc</b>.',
      columns:'Los nombres de columna etiquetan cada Serie que compone el DataFrame.',
      row:'Una fila completa, tomada con <b>.loc</b>, es una Serie: mezcla tipos de dato (texto y número), así que su dtype es <b>object</b>.',
      col:'Una columna es una Serie con un solo tipo de dato — aquí, <b>float64</b> para promedio.',
      values:'<b>.values</b> entrega solo la matriz de datos, como un array de NumPy: sin índice ni nombres de columna.',
    };
    const CODES = {
      index:`df.<b>index</b>\n# Index(['E01', 'E02', 'E03', 'E04', 'E05'], dtype='object')`,
      columns:`df.<b>columns</b>\n# Index(['nombre', 'carrera', 'promedio', 'generación'], dtype='object')`,
      row:`df.loc[<b>'E03'</b>]\n# nombre         Camila\n# carrera           ICI\n# promedio          4.9\n# generación       2022\n# Name: E03, dtype: object`,
      col:`df[<b>'promedio'</b>]\n# E01    6.1\n# E02    5.4\n# E03    4.9\n# E04    6.5\n# E05    5.8\n# Name: promedio, dtype: float64`,
      values:`df.<b>values</b>\n# array([['Valentina', 'ICI', 6.1, 2023],\n#        ['Matías', 'IECI', 5.4, 2024],\n#        ['Camila', 'ICI', 4.9, 2022],\n#        ['Joaquín', 'IIND', 6.5, 2023],\n#        ['Antonia', 'IECI', 5.8, 2024]], dtype=object)`,
    };

    function pick(v){
      table.clearMarks();
      if(v==='index'){
        table.rowEls.forEach(r=>r._idx.classList.add('hl'));
      }else if(v==='columns'){
        table.headEls.forEach(h=>h.classList.add('hl'));
      }else if(v==='row'){
        table.cellEls[2].forEach(c=>c.classList.add('sel'));
        table.rowEls[2]._idx.classList.add('sel');
      }else if(v==='col'){
        table.rowEls.forEach((r,i)=>table.cellEls[i][2].classList.add('sel'));
        table.headEls[2].classList.add('sel');
      }else if(v==='values'){
        table.cellEls.flat().forEach(c=>c.classList.add('hl'));
      }
      noteEl.innerHTML = NOTES[v];
      code.innerHTML = CODES[v];
    }

    pick('index');
  }

  /* ---------------- Tarjeta 2: loc vs iloc ---------------- */
  function buildLocIloc(section){
    const card = el('div',{class:'card'}, el('h3',{},'df.loc vs df.iloc'));
    section.append(card);

    const leftDiv = el('div',{});
    const rightDiv = el('div',{});
    card.append(el('div',{class:'flexcols'}, leftDiv, rightDiv));
    const tableLoc = new DfTable(leftDiv,{index:DATA.index,columns:DATA.columns,rows:DATA.rows,caption:'df.loc — por ETIQUETA'});
    const tableIloc = new DfTable(rightDiv,{index:DATA.index,columns:DATA.columns,rows:DATA.rows,caption:'df.iloc — por POSICIÓN'});

    const PRESETS=[
      {label:"df.loc['E03']", value:'loc1'},
      {label:"df.loc['E02':'E04', 'nombre':'promedio']", value:'loc2'},
      {label:"df.loc[df['promedio'] >= 5.5]", value:'loc3'},
      {label:'df.iloc[0]', value:'iloc1'},
      {label:'df.iloc[1:3]', value:'iloc2'},
      {label:'df.iloc[1:3, 0:2]', value:'iloc3'},
    ];
    btnGroup(card, PRESETS, pick, false);

    const noteEl = el('div',{class:'note'},'Elige un preset arriba para ver qué filas y columnas selecciona.');
    card.append(noteEl);
    const code = codeBox(card);
    code.textContent = '# elige un botón arriba ↑';

    /* marca como .sel las celdas de rows×cols (cols=null → toda la fila) y
       atenúa con .roff las filas no involucradas de esa misma tabla */
    function markSelection(table, rows, cols){
      const allCols = table.o.columns.map((_,c)=>c);
      const useCols = cols || allCols;
      table.o.index.forEach((_,i)=>{
        if(!rows.includes(i)) table.rowEls[i].classList.add('roff');
      });
      rows.forEach(i=>{
        table.rowEls[i]._idx.classList.add('sel');
        useCols.forEach(c=>table.cellEls[i][c].classList.add('sel'));
      });
      useCols.forEach(c=>table.headEls[c].classList.add('sel'));
    }

    const NOTES = {
      loc1:"df.loc['E03'] selecciona la fila con etiqueta 'E03': una Serie con los datos de Camila.",
      loc2:"El slice de etiquetas <b>incluye el extremo final</b>: 'E02':'E04' trae E02, E03 y E04. Igual con columnas: 'nombre':'promedio' trae nombre, carrera y promedio.",
      loc3:"df.loc también acepta una condición booleana: trae todas las filas donde la máscara es True — aquí, promedio ≥ 5.5 (Valentina, Joaquín y Antonia).",
      iloc1:'df.iloc[0] trae la fila en la POSICIÓN 0 (la primera), sin importar su etiqueta de índice.',
      iloc2:'El slice de posiciones <b>excluye el extremo final</b>: 1:3 trae las posiciones 1 y 2 (no la 3) — igual que en una lista de Python.',
      iloc3:'Slice de posiciones en filas y columnas: 1:3 trae las filas en posición 1 y 2, y 0:2 trae las columnas en posición 0 y 1 (nombre, carrera). <b>Ambos excluyen su extremo final</b>.',
    };
    const CODES = {
      loc1:`df.loc[<b>'E03'</b>]`,
      loc2:`df.loc[<b>'E02':'E04'</b>, <b>'nombre':'promedio'</b>]`,
      loc3:`df.loc[<b>df['promedio'] >= 5.5</b>]`,
      iloc1:`df.iloc[<b>0</b>]`,
      iloc2:`df.iloc[<b>1:3</b>]`,
      iloc3:`df.iloc[<b>1:3</b>, <b>0:2</b>]`,
    };

    function pick(v){
      tableLoc.clearMarks();
      tableIloc.clearMarks();
      if(v==='loc1') markSelection(tableLoc,[2]);
      else if(v==='loc2') markSelection(tableLoc,[1,2,3],[0,1,2]);
      else if(v==='loc3') markSelection(tableLoc,[0,3,4]);
      else if(v==='iloc1') markSelection(tableIloc,[0]);
      else if(v==='iloc2') markSelection(tableIloc,[1,2]);
      else if(v==='iloc3') markSelection(tableIloc,[1,2],[0,1]);
      noteEl.innerHTML = NOTES[v];
      code.innerHTML = CODES[v];
    }
  }

  /* ---------------- Tarjeta 3: crear, modificar y eliminar columnas ---------------- */
  function buildColumnas(section){
    const card = el('div',{class:'card'}, el('h3',{},'Columnas: crear, modificar y eliminar'));
    section.append(card);
    card.append(el('div',{class:'note'},
      'Catálogo de una tienda de bicicletas. Una columna nueva se crea asignándole algo a un nombre que '+
      'todavía no existe — y ese algo puede ser una operación entre columnas, una condición o un solo valor.'));

    const IDX  = ['B-01','B-02','B-03','B-04','B-05'];
    const BASE = [
      ['Urbana 100', 'urbana',    289990, 15],
      ['MTB Trail',  'montaña',   549990,  8],
      ['Ruta Pro',   'ruta',     1199990,  3],
      ['Plegable X', 'urbana',    349990, 12],
      ['Eléctrica Z','eléctrica',1590000,  5],
    ];
    const COLS = ['modelo','tipo','precio','stock'];

    const tabla = new DfTable(card,{index:IDX, columns:COLS.slice(), rows:BASE.map(r=>r.slice()),
                                    caption:'bicicletas'});

    /* cada paso reconstruye el estado completo: así rehacer la secuencia
       desde el principio siempre deja la tabla igual */
    function pintar(cols, rows, marcas){
      tabla.o.columns = cols;
      tabla.o.rows = rows;
      tabla.render();
      (marcas||[]).forEach(([c,cls])=>{
        tabla.headEls[c].classList.add(cls);
        tabla.rowEls.forEach((_,r)=>tabla.cellEls[r][c].classList.add(cls));
      });
    }
    const base = ()=>BASE.map(r=>r.slice());
    const stockNuevo = [17,10,5,14,7];

    /* se crea después del Stepper para que quede debajo de la botonera */
    let cod;

    function reset(){
      pintar(COLS.slice(), base());
      if(cod) cod.mark(null);
    }

    const pasos = [
      {d:'Una columna nueva a partir de otras dos: se multiplica <b>precio</b> por <b>stock</b> fila a fila. '+
          'Como el nombre <b>valor_inventario</b> no existía, la columna se crea al final.',
       run(){
         const rows = base().map((r,i)=>r.concat([r[2]*r[3]]));
         pintar(COLS.concat(['valor_inventario']), rows, [[4,'dnew']]);
         cod.mark(0);
       }},
      {d:'Una condición devuelve una columna <b>booleana</b>: un True o un False por fila. '+
          'Es la misma máscara que usabas para filtrar, pero acá la guardamos como columna.',
       run(){
         const rows = base().map(r=>r.concat([r[2]*r[3], r[3]<10 ? 'True':'False']));
         pintar(COLS.concat(['valor_inventario','bajo_stock']), rows, [[5,'dnew']]);
         cod.mark(1);
       }},
      {d:'Si asignas un <b>solo valor</b>, ese valor se repite en todas las filas. '+
          'No hace falta escribirlo cinco veces: Pandas lo reparte solo.',
       run(){
         const rows = base().map(r=>r.concat([r[2]*r[3], r[3]<10 ? 'True':'False', 'Concepción']));
         pintar(COLS.concat(['valor_inventario','bajo_stock','sucursal']), rows, [[6,'dnew']]);
         cod.mark(2);
       }},
      {d:'Si el nombre <b>ya existe</b>, la asignación no crea nada: <b>reemplaza</b> la columna. '+
          'Y acá está la trampa: <b>valor_inventario</b> y <b>bajo_stock</b> NO se recalculan solas. '+
          'Se calcularon una vez y quedaron congeladas — mira B-02, que ahora tiene stock 10 pero sigue '+
          'marcada como bajo_stock True.',
       run(){
         const rows = base().map((r,i)=>{
           const rr = r.slice(); rr[3] = stockNuevo[i];
           return rr.concat([r[2]*r[3], r[3]<10 ? 'True':'False', 'Concepción']);
         });
         pintar(COLS.concat(['valor_inventario','bajo_stock','sucursal']), rows,
                [[3,'dchg'],[4,'hl'],[5,'hl']]);
         cod.mark(3);
       }},
      {d:'<b>drop</b> con <b>columns=</b> saca las columnas auxiliares y devuelve una tabla nueva: '+
          'salieron <b>bajo_stock</b> y <b>sucursal</b>. Si no reasignas el resultado a una variable, '+
          'el DataFrame original queda intacto.',
       run(){
         const rows = base().map((r,i)=>{
           const rr = r.slice(); rr[3] = stockNuevo[i];
           return rr.concat([r[2]*r[3]]);
         });
         pintar(COLS.concat(['valor_inventario']), rows);
         cod.mark(4);
       }},
    ];

    new Stepper(card, pasos, reset, 'df');
    cod = codeSteps(card, [
      `bicicletas[<b>'valor_inventario'</b>] = bicicletas['precio'] * bicicletas['stock']`,
      `bicicletas[<b>'bajo_stock'</b>]      = bicicletas['stock'] &lt; 10`,
      `bicicletas[<b>'sucursal'</b>]        = 'Concepción'`,
      `bicicletas[<b>'stock'</b>]           = bicicletas['stock'] + 2`,
      `bicicletas = bicicletas.<b>drop</b>(columns=['bajo_stock', 'sucursal'])`,
    ]);
    reset();
  }

})();
