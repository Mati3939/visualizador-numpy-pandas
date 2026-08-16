'use strict';
/* Módulo: leer archivos — un archivo se consume y en su lugar nace un DataFrame.
   Todas las salidas de esta tarjeta están verificadas ejecutando pandas de verdad:
   los escenarios son casos cerrados, no una emulación de read_csv en JavaScript. */
(function(){

/* ---------- los cinco archivos ---------- */

/* CSV exportado por un Excel en español: separador ; y coma decimal */
const CSV=['id;nombre;nota','1;Ana;6,2','2;Beto;5,8','3;Caro;4,5','4;Dani;6,9'];

const JSON_L=['[',
  '  {"id": 1, "nombre": "Ana",  "nota": 6.2},',
  '  {"id": 2, "nombre": "Beto", "nota": 5.8},',
  '  {"id": 3, "nombre": "Caro", "nota": 4.5},',
  '  {"id": 4, "nombre": "Dani", "nota": 6.9}',
  ']'];

const HTML_L=['<table>',
  '  <tr><th>id</th><th>nombre</th><th>nota</th></tr>',
  '  <tr><td>1</td><td>Ana</td><td>6.2</td></tr>',
  '  <tr><td>2</td><td>Beto</td><td>5.8</td></tr>',
  '</table>'];

/* bytes reales del parquet que escribió pandas con este mismo df */
const BYTES=['PAR1 15 04 15 40 15 38 4c 15 08 15 00 12 00 00',
             'a0 01 00 00 00 41 6e 61 04 00 00 00 42 65 74 6f',
             '04 00 00 00 43 61 72 6f 04 00 00 00 44 61 6e 69',
             '…  9a 99 99 99 99 99 18 40 66 66 66 66 66 66 17'];

/* planilla: fila 1 el título, fila 2 vacía, fila 3 el encabezado */
const HOJA1=[['Notas finales 2026-2','',''],['','',''],['id','nombre','nota'],
             ['1','Ana','6.2'],['2','Beto','5.8'],['3','Caro','4.5'],['4','Dani','6.9']];
const HOJA2=[['id','asistencia',''],['1','0.92',''],['2','0.71',''],['3','0.85',''],['4','0.60','']];

/* ---------- escenarios (salidas verificadas con pandas) ----------
   Los decimales van como texto ('6.2') a propósito: fmt() del core imprime los
   números con coma a la chilena, y acá hace falta el punto de pandas para que
   se distinga una nota float64 (6.2) de una que quedó como texto (6,2).       
   cols/index/rows = el DataFrame resultante
   head = líneas del archivo que se consumen al armar las columnas
   src  = por cada fila del df, las líneas del archivo que la produjeron       */

const FORMATOS=[
{id:'csv',label:'CSV',icono:'📄',archivo:{nombre:'notas.csv',tipo:'texto',lineas:CSV},
 nota:'Texto plano: cada línea es una fila y un carácter separa los campos. Es el formato más común… '+
      'y el que más se rompe, porque ese carácter no siempre es una coma.',
 escenarios:[
  {label:'bien leído',
   code:"df = pd.read_csv('notas.csv', <b>sep=';'</b>, <b>decimal=','</b>)",
   cols:['id','nombre','nota'],index:[0,1,2,3],
   rows:[[1,'Ana','6.2'],[2,'Beto','5.8'],[3,'Caro','4.5'],[4,'Dani','6.9']],
   dtypes:['int64','object','float64'],head:[0],src:[[1],[2],[3],[4]],
   msg:'El encabezado se convirtió en los nombres de columna y el índice 0,1,2,3 lo inventó pandas: '+
       'en el archivo no existe.'},
  {label:'read_csv() a secas',peligro:true,
   code:"df = pd.read_csv('notas.csv')   # sep=',' por defecto",
   cols:['id;nombre;nota'],index:['1;Ana;6','2;Beto;5','3;Caro;4','4;Dani;6'],
   rows:[[2],[8],[5],[9]],
   dtypes:['int64'],head:[0],src:[[1],[2],[3],[4]],
   msg:'Al partir por comas, la única coma de cada línea es la del decimal: quedó UNA columna llamada '+
       '«id;nombre;nota», el nombre y la parte entera se fueron al índice y la nota quedó cortada por la mitad.'},
  {label:'header=None',
   code:"df = pd.read_csv('notas.csv', sep=';', <b>header=None</b>)",
   cols:[0,1,2],index:[0,1,2,3,4],
   rows:[['id','nombre','nota'],['1','Ana','6,2'],['2','Beto','5,8'],['3','Caro','4,5'],['4','Dani','6,9']],
   dtypes:['object','object','object'],head:[],src:[[0],[1],[2],[3],[4]],
   msg2:'header=None: ninguna línea se gasta en el encabezado, así que pandas numera las columnas 0,1,2.',
   msg:'Sin encabezado pandas numera las columnas 0,1,2 y la primera línea pasa a ser un dato más. '+
       'Ojo con los tipos: ahora la columna de notas es texto, porque «nota» no es un número.'},
  {label:'index_col=0',
   code:"df = pd.read_csv('notas.csv', sep=';', decimal=',', <b>index_col=0</b>)",
   cols:['nombre','nota'],index:[1,2,3,4],
   rows:[['Ana','6.2'],['Beto','5.8'],['Caro','4.5'],['Dani','6.9']],
   dtypes:['object','float64'],head:[0],src:[[1],[2],[3],[4]],
   msg:'La columna id salió del cuerpo y se volvió el índice: el df quedó con dos columnas, no tres.'},
 ]},

{id:'excel',label:'Excel',icono:'📊',archivo:{nombre:'notas.xlsx',tipo:'planilla',hojas:['Hoja1','Hoja2']},
 nota:'Una planilla no es texto: trae celdas con formato, varias hojas y, casi siempre, un título '+
      'arriba que a pandas no le sirve de nada.',
 escenarios:[
  {label:'Hoja1 con skiprows=2',hoja:0,
   code:"df = pd.read_excel('notas.xlsx', sheet_name='Hoja1', <b>skiprows=2</b>)",
   cols:['id','nombre','nota'],index:[0,1,2,3],
   rows:[[1,'Ana','6.2'],[2,'Beto','5.8'],[3,'Caro','4.5'],[4,'Dani','6.9']],
   dtypes:['int64','object','float64'],head:[2],src:[[3],[4],[5],[6]],
   msg:'skiprows=2 salta el título y la fila en blanco: recién ahí está el encabezado de verdad.'},
  {label:'Hoja1 sin skiprows',hoja:0,peligro:true,
   code:"df = pd.read_excel('notas.xlsx', sheet_name='Hoja1')",
   cols:['Notas finales 2026-2','Unnamed: 1','Unnamed: 2'],index:[0,1,2,3,4,5],
   rows:[[null,null,null],['id','nombre','nota'],['1','Ana','6.2'],['2','Beto','5.8'],
         ['3','Caro','4.5'],['4','Dani','6.9']],
   dtypes:['object','object','object'],head:[0],src:[[1],[2],[3],[4],[5],[6]],
   msg:'Pandas tomó el título como encabezado y bautizó el resto «Unnamed: 1» y «Unnamed: 2». '+
       'La fila vacía entró como NaN y todas las columnas quedaron de tipo object.'},
  {label:'Hoja2',hoja:1,
   code:"df = pd.read_excel('notas.xlsx', <b>sheet_name='Hoja2'</b>)",
   cols:['id','asistencia'],index:[0,1,2,3],
   rows:[[1,'0.92'],[2,'0.71'],[3,'0.85'],[4,'0.60']],
   dtypes:['int64','float64'],head:[0],src:[[1],[2],[3],[4]],
   msg:'Un mismo archivo guarda varias hojas y read_excel lee UNA. Sin sheet_name lee la primera.'},
 ]},

{id:'json',label:'JSON',icono:'🔤',archivo:{nombre:'notas.json',tipo:'texto',lineas:JSON_L},
 nota:'El formato en que hablan las APIs web. No tiene forma de tabla — es una lista de objetos con '+
      'llaves — y aun así sale un DataFrame: cada llave se vuelve una columna.',
 escenarios:[
  {label:'read_json',
   code:"df = pd.read_json('notas.json')",
   cols:['id','nombre','nota'],index:[0,1,2,3],
   rows:[[1,'Ana','6.2'],[2,'Beto','5.8'],[3,'Caro','4.5'],[4,'Dani','6.9']],
   dtypes:['int64','object','float64'],head:[],src:[[1],[2],[3],[4]],
   msg2:'Acá las columnas no salen de una línea: salen de las llaves que se repiten en cada objeto.',
   msg:'Las columnas salen de las llaves («id», «nombre», «nota»), que se repiten en cada objeto; '+
       'el corchete de apertura y el de cierre solo marcan dónde empieza y termina la lista.'},
 ]},

{id:'bin',label:'Parquet / pickle',icono:'💾',archivo:{nombre:'notas.parquet',tipo:'bytes',lineas:BYTES},
 nota:'Un binario no se puede abrir en un editor de texto: eso de arriba son los bytes reales del '+
      'archivo. A cambio ocupa menos y guarda los tipos adentro.',
 escenarios:[
  {label:'read_parquet',
   code:"df = pd.read_parquet('notas.parquet')",
   cols:['id','nombre','nota'],index:[0,1,2,3],
   rows:[[1,'Ana','6.2'],[2,'Beto','5.8'],[3,'Caro','4.5'],[4,'Dani','6.9']],
   dtypes:['int64','object','float64'],head:[],src:[[0],[1],[2],[3]],deUnaVez:true,
   msg2:'Los nombres de las columnas vienen guardados dentro del archivo, no en una primera línea legible.',
   msg:'Acá no hay nada que adivinar: el archivo trae guardado que id es int64 y nota es float64. '+
       'Por eso no existe un sep ni un decimal que configurar — y por eso mismo no se puede leer a ojo.'},
 ]},

{id:'web',label:'Tabla web',icono:'🌐',archivo:{nombre:'pagina.html',tipo:'texto',lineas:HTML_L},
 nota:'read_html busca las etiquetas &lt;table&gt; de una página y arma un DataFrame con cada una.',
 escenarios:[
  {label:'read_html',
   code:"tablas = pd.read_html('pagina.html')\ndf = tablas<b>[0]</b>   # devuelve una LISTA de DataFrames",
   cols:['id','nombre','nota'],index:[0,1],
   rows:[[1,'Ana','6.2'],[2,'Beto','5.8']],
   dtypes:['int64','object','float64'],head:[1],src:[[2],[3]],
   msg:'El error clásico: read_html no devuelve un DataFrame sino una lista con todas las tablas de la '+
       'página. Aunque haya una sola, hay que sacarla con [0]. Los &lt;th&gt; son el encabezado.'},
 ]},
];

registerModule({
  id:'lectura',
  title:'Leer archivos',
  lead:'Un archivo no es un DataFrame. Aquí puedes ver de qué está hecho cada formato por dentro y '+
       'cómo pandas lo consume línea por línea para armar la tabla — incluidas las veces en que sale mal.',
  build(sec){
    const card=el('div',{class:'card'},
      el('h3',{html:'Del archivo al <code>DataFrame</code>'}),
      el('p',{class:'note',html:'Arriba, el archivo tal como está guardado. Abajo, el DataFrame que nace de él. '+
        'Avanza paso a paso y fíjate en dos cosas: <b>de dónde salen los nombres de las columnas</b> y '+
        '<b>de dónde sale el índice</b>.'}));
    sec.append(card);

    const ctrFmt=el('div');card.append(ctrFmt);
    const notaFmt=el('p',{class:'note'});card.append(notaFmt);
    const paper=el('div',{class:'filebox'});card.append(paper);
    const ctrEsc=el('div');card.append(ctrEsc);
    const code=codeBox(card);
    const dfmount=el('div',{class:'dfzone'});card.append(dfmount);
    const msg=el('div',{class:'msg'});card.append(msg);

    let F=FORMATOS[0], E=F.escenarios[0], tabla=null, lineEls=[], run=0;

    /* ---- mitad de arriba: dibujar el archivo según su formato ---- */
    function pintarArchivo(){
      paper.textContent='';lineEls=[];
      const a=F.archivo;
      paper.append(el('div',{class:'filebar'},
        el('span',{class:'fileic'},F.icono),el('span',{},a.nombre),
        el('span',{class:'filekind'},a.tipo==='bytes'?'binario':a.tipo==='planilla'?'planilla':'texto plano')));
      if(a.tipo==='planilla'){
        const filas=(E.hoja===1?HOJA2:HOJA1);
        const g=el('div',{class:'sheet'});
        g.append(el('div',{class:'sh corner'},''));
        ['A','B','C'].forEach(c=>g.append(el('div',{class:'sh'},c)));
        filas.forEach((row,r)=>{
          const num=el('div',{class:'sh'},String(r+1));
          g.append(num);
          const cs=row.map(v=>el('div',{class:'sc'+(v===''?' vacia':'')},v));
          cs.forEach(c=>g.append(c));
          lineEls.push({row:[num,...cs]});
        });
        paper.append(el('div',{class:'sheetwrap'},g));
        const tabs=el('div',{class:'tabs'},a.hojas.map((h,i)=>
          el('span',{class:'tab'+((E.hoja||0)===i?' on':'')},h)));
        paper.append(tabs);
      }else{
        const box=el('div',{class:a.tipo==='bytes'?'lines bytes':'lines'});
        a.lineas.forEach((ln,i)=>{
          const d=el('div',{class:'fileline'},ln);
          box.append(d);lineEls.push({row:[d]});
        });
        paper.append(box);
      }
    }
    /* al consumirse, la línea deja de estar «leyéndose»: si no, queda el resaltado bajo la atenuación */
    const marcar=(i,cls)=>{const L=lineEls[i];if(!L)return;
      L.row.forEach(e=>{if(cls==='gone')e.classList.remove('leyendo'); e.classList.add(cls);});};
    const limpiar=()=>lineEls.forEach(L=>L.row.forEach(e=>e.classList.remove('gone','leyendo')));

    /* ---- mitad de abajo: el df, que empieza sin nada ---- */
    function pintarDf(nCols,nFilas){
      dfmount.textContent='';
      if(nCols===0){
        dfmount.append(el('div',{class:'dfvacio'},'df — todavía no existe'));
        tabla=null;return;
      }
      tabla=new DfTable(dfmount,{caption:'df',columns:E.cols.slice(0,nCols),
        index:E.index.slice(0,nFilas),rows:E.rows.slice(0,nFilas)});
      if(nFilas>0)tabla.rowEls[nFilas-1].classList.add('entra');
    }
    function pintarTipos(){
      if(!tabla)return;
      tabla.headEls.forEach((h,i)=>{
        h.append(el('span',{class:'dtype'},E.dtypes[i]));
      });
    }

    /* ---- pasos ---- */
    function reset(){
      run++;limpiar();pintarDf(0,0);
      code.innerHTML=E.code;
      msg.className='msg';msg.textContent='';
    }
    const steps=[
      {d:'<b>El archivo, tal como está guardado.</b> Todavía no hay ningún DataFrame: solo un archivo '+
         'en el disco y una línea de código a punto de leerlo.',
       async run(){ reset(); }},
      {d:'<b>El encabezado se convierte en las columnas.</b> Esa primera línea deja de ser un dato: '+
         'pasa a ser el nombre de cada columna.',
       async run(){
         const r=++run;limpiar();
         E.head.forEach(i=>marcar(i,'leyendo'));
         await sleep(320);if(r!==run)return;
         E.head.forEach(i=>marcar(i,'gone'));
         pintarDf(E.cols.length,0);
         msg.className='msg';
         msg.textContent=E.msg2||'';
       }},
      {d:'<b>Cada fila del archivo se vuelve una fila del df</b> — y le toca un índice nuevo, 0, 1, 2…, '+
         'que en el archivo no estaba escrito en ninguna parte.',
       async run(){
         const r=++run;limpiar();
         E.head.forEach(i=>marcar(i,'gone'));
         pintarDf(E.cols.length,0);
         for(let f=0;f<E.rows.length;f++){
           if(E.deUnaVez){
             lineEls.forEach((L,i)=>marcar(i,'gone'));
             pintarDf(E.cols.length,E.rows.length);break;
           }
           E.src[f].forEach(i=>marcar(i,'leyendo'));
           await sleep(260);if(r!==run)return;
           E.src[f].forEach(i=>marcar(i,'gone'));
           pintarDf(E.cols.length,f+1);
           await sleep(120);if(r!==run)return;
         }
         msg.className='msg okc';
         msg.textContent=`el archivo quedó consumido: ${E.rows.length} filas × ${E.cols.length} columnas`;
       }},
      {d:'<b>Y recién al final aparecen los tipos.</b> Pandas los deduce mirando los valores de cada '+
         'columna — salvo en los binarios, que ya los traen guardados.',
       async run(){
         const r=++run;limpiar();
         lineEls.forEach((L,i)=>marcar(i,'gone'));
         pintarDf(E.cols.length,E.rows.length);
         pintarTipos();
         if(r!==run)return;
         msg.className='msg'+(E.peligro?' err':' okc');
         msg.innerHTML=E.msg;
       }},
    ];
    const stepper=new Stepper(card,steps,reset,'lectura');

    /* ---- selectores ---- */
    function pintarEscenarios(){
      ctrEsc.textContent='';
      if(F.escenarios.length<2)return;   // un solo caso: el grupo de botones sobra
      btnGroup(ctrEsc,F.escenarios.map(e=>({label:e.label,value:e})),e=>{
        E=e;pintarArchivo();stepper.go(-1);
      });
    }
    btnGroup(ctrFmt,FORMATOS.map(f=>({label:f.icono+' '+f.label,value:f})),f=>{
      F=f;E=f.escenarios[0];
      notaFmt.innerHTML=f.nota;
      pintarEscenarios();pintarArchivo();stepper.go(-1);
    });
    notaFmt.innerHTML=F.nota;
    pintarEscenarios();pintarArchivo();reset();
  }
});
})();
