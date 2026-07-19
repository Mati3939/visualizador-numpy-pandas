'use strict';
/* =====================================================================
   Banco de ejercicios — salidas verificadas con NumPy/Pandas reales.
   Contextos calcados de las evaluaciones 2026-1 del curso:
     Control 1 (epidemiología), Control 2 (laboratorio), Control 3 (nulos),
     Control 4 (VeloCity/wrangling), Control 5 (SERNATUR/EDA),
     Certamen 1 (radiografías), Guía GroupBy (cafetería Concepción),
     Ejercicios Integradores 1-2 (fechas, joins).
   ===================================================================== */

/* ---------------- Predice la salida ---------------- */
const BANCO_PREDICE=[

/* ===== NumPy ===== */
{id:'p01',tema:'numpy',origen:'Control 1 · epidemiología',nivel:1,
 code:"casos = np.array([[0, 1, 2],\n                  [3, 4, 5]])\nprint(casos.sum(axis=0))",
 opciones:['[3 5 7]','[ 3 12]','15','ValueError'],correcta:0,
 explica:"<b>axis=0 colapsa las filas</b>: suma hacia abajo, columna por columna (0+3, 1+4, 2+5). "+
  "axis=1 daría [ 3 12] (por fila) y sin axis daría 15. Míralo animado en el <a href='#numpy'>módulo Arrays NumPy</a>.",
 visual(m){const g=new CellGrid(m);g.setCells([
   {id:'a',text:0,r:0,c:0},{id:'b',text:1,r:0,c:1},{id:'c',text:2,r:0,c:2},
   {id:'d',text:3,r:1,c:0},{id:'e',text:4,r:1,c:1},{id:'f',text:5,r:1,c:2},
   {id:'r0',text:3,r:2,c:0,cls:'res'},{id:'r1',text:5,r:2,c:1,cls:'res'},{id:'r2',text:7,r:2,c:2,cls:'res'}]);}},

{id:'p02',tema:'numpy',origen:'Control 1 · epidemiología',nivel:1,
 code:"casos = np.array([12, 45, 8, 60, 33, 5])\nbrote = casos > 30\nprint(brote.sum())",
 opciones:['3','138','True','[45 60 33]'],correcta:0,
 explica:"<code>casos &gt; 30</code> es un array de booleanos y al sumarlos <b>True vale 1</b>: "+
  "cuenta cuántos superan el umbral (45, 60 y 33). Para sumar los valores sería <code>casos[brote].sum()</code> = 138."},

{id:'p03',tema:'numpy',origen:'Certamen 1 · datos médicos',nivel:1,
 code:"temp = np.array([36.2, 38.5, 37.1, 39.0])\nprint(np.where(temp >= 37.5, 'fiebre', 'normal'))",
 opciones:["['normal' 'fiebre' 'normal' 'fiebre']","['fiebre' 'normal' 'fiebre' 'normal']",
  "['fiebre' 'fiebre']","TypeError"],correcta:0,
 explica:"<code>np.where(cond, A, B)</code> evalúa elemento a elemento: donde la condición es True pone A, "+
  "donde es False pone B. El resultado <b>siempre tiene el mismo largo</b> que el array original."},

{id:'p04',tema:'numpy',origen:'Clase 02 · operaciones',nivel:2,
 code:"A = np.ones((3, 4), dtype=int)\nb = np.array([10, 20, 30, 40])\nprint((A + b).shape)",
 opciones:['(3, 4)','(4, 3)','(3,)','ValueError'],correcta:0,
 explica:"<b>Broadcasting</b>: b tiene shape (4,) y calza con las columnas de A (3, 4), así que "+
  "se «estira» copiándose en cada fila. El resultado conserva la forma grande. "+
  "Míralo en el <a href='#numpy'>módulo Arrays NumPy</a>."},

{id:'p05',tema:'numpy',origen:'Control 1 · epidemiología',nivel:1,
 code:"a = np.arange(12)\nprint(a.reshape(5, 3))",
 opciones:['ValueError','una matriz 5×3 rellena con ceros al final','una matriz 4×3','[[0 1 2 3 4], [5 6 7 8 9], ...]'],correcta:0,
 explica:"5 × 3 = 15 celdas pero el array tiene 12: <code>cannot reshape array of size 12 into shape (5,3)</code>. "+
  "reshape <b>nunca inventa ni bota datos</b>. Prueba el caso 5×3 ✗ en el <a href='#numpy'>módulo Arrays NumPy</a>."},

/* ===== DataFrames ===== */
{id:'p06',tema:'df',origen:'Control 2 · laboratorio',nivel:2,
 code:"s1 = pd.Series([10, 20, 30], index=['a', 'b', 'c'])\ns2 = pd.Series([1, 2, 3], index=['b', 'c', 'd'])\nprint((s1 + s2)['a'])",
 opciones:['nan','11','10','KeyError'],correcta:0,
 explica:"Las Series se suman <b>alineando por índice</b>, no por posición: 'a' existe solo en s1, "+
  "y algo + nada = <b>NaN</b>. Solo 'b' (20+1) y 'c' (30+2) tienen pareja."},

{id:'p07',tema:'df',origen:'Certamen 1 · datos médicos',nivel:2,
 code:"df = pd.DataFrame({'ciudad':\n  ['Stgo','Conce','Valpo','Temuco','Arica']})\nprint(len(df.loc[1:3]), len(df.iloc[1:3]))",
 opciones:['3 2','2 2','3 3','2 3'],correcta:0,
 explica:"<code>loc</code> va por <b>etiqueta</b> e incluye ambos extremos (filas 1, 2 y 3). "+
  "<code>iloc</code> va por <b>posición</b> y excluye el final (filas 1 y 2), como los slices de Python. "+
  "Compáralo en el <a href='#df'>módulo DataFrames</a>.",
 visual(m){
   const t1=new DfTable(m,{caption:"df.loc[1:3] — 3 filas",columns:['ciudad'],index:[0,1,2,3,4],
     rows:[['Stgo'],['Conce'],['Valpo'],['Temuco'],['Arica']]});
   [1,2,3].forEach(r=>t1.cell(r,0).classList.add('sel'));
   const t2=new DfTable(m,{caption:"df.iloc[1:3] — 2 filas",columns:['ciudad'],index:[0,1,2,3,4],
     rows:[['Stgo'],['Conce'],['Valpo'],['Temuco'],['Arica']]});
   [1,2].forEach(r=>t2.cell(r,0).classList.add('sel'));}},

{id:'p08',tema:'df',origen:'Control 2 · laboratorio',nivel:1,
 code:"urgencia = pd.Series(['alta','baja','alta',\n                      'media','alta','baja'])\nprint(urgencia.value_counts().index[0])",
 opciones:["'alta'","'media'","3","'baja'"],correcta:0,
 explica:"<code>value_counts()</code> entrega las categorías <b>ordenadas de más a menos frecuente</b>: "+
  "alta (3), baja (2), media (1). Su índice son las categorías; sus valores, los conteos."},

/* ===== Nulos ===== */
{id:'p09',tema:'nulos',origen:'Control 3 · valores faltantes',nivel:1,
 code:"df = pd.DataFrame({'glucosa': [90, None, 110, None],\n                   'presion': [120, 130, None, 125]})\nprint(df.isnull().sum()['glucosa'])",
 opciones:['2','1','3','NaN'],correcta:0,
 explica:"<code>isnull()</code> marca cada celda como True/False y <code>.sum()</code> cuenta por columna: "+
  "glucosa tiene 2 nulos, presion 1. Es el diagnóstico estándar del <a href='#nulos'>módulo Valores perdidos</a>."},

{id:'p10',tema:'nulos',origen:'Control 3 · valores faltantes',nivel:2,
 code:"df = pd.DataFrame({'a': [1, None, 3, None],\n                   'b': [None, None, 7, 8],\n                   'c': [9, 10, 11, None]})\nprint(len(df.dropna(thresh=2)))",
 opciones:['2','4','1','3'],correcta:0,
 explica:"<code>thresh=2</code> exige <b>al menos 2 valores no nulos</b> para que la fila sobreviva. "+
  "Las filas 1 ([NaN, NaN, 10]) y 3 ([NaN, 8, NaN]) tienen solo 1 y se van.",
 visual(m){dfDiff(m,
   {columns:['a','b','c'],index:[0,1,2,3],rows:[[1,null,9],[null,null,10],[3,7,11],[null,8,null]]},
   {columns:['a','b','c'],index:[0,2],rows:[[1,null,9],[3,7,11]]},
   'dropna(thresh=2) — filas eliminadas en rojo');}},

{id:'p11',tema:'nulos',origen:'Control 3 · valores faltantes',nivel:1,
 code:"s = pd.Series([10.0, None, 14.0, None, 18.0])\nprint(s.fillna(s.mean())[1])",
 opciones:['14.0','10.5','NaN','21.0'],correcta:0,
 explica:"<code>mean()</code> <b>ignora los NaN</b>: (10+14+18)/3 = 14. Ambos huecos se rellenan con 14.0. "+
  "Ojo: imputar con la media achata la varianza — el <a href='#nulos'>módulo Valores perdidos</a> muestra los casos borde.",
 visual(m){dfDiff(m,
   {columns:['valor'],index:[0,1,2,3,4],rows:[[10],[null],[14],[null],[18]]},
   {columns:['valor'],index:[0,1,2,3,4],rows:[[10],[14],[14],[14],[18]]},
   'fillna(media) — celdas imputadas en verde');}},

{id:'p12',tema:'nulos',origen:'Clase 12 · datos faltantes',nivel:1,
 code:"s = pd.Series([2.0, 4.0, None])\nprint(s.mean())",
 opciones:['3.0','2.0','nan','TypeError'],correcta:0,
 explica:"Por defecto <code>skipna=True</code>: pandas suma lo que hay (6.0) y divide por los datos "+
  "<b>válidos</b> (2), no por el largo (3). Los NaN no arrastran el promedio… hasta que imputas con ceros."},

/* ===== Outliers ===== */
{id:'p13',tema:'outliers',origen:'Clase 15 · outliers',nivel:2,
 code:"sueldos = pd.Series([950, 1000, 1100, 1200,\n                     1250, 1300, 1400, 5000])\nQ1, Q3 = sueldos.quantile([0.25, 0.75])\nIQR = Q3 - Q1\nfuera = (sueldos < Q1-1.5*IQR) | (sueldos > Q3+1.5*IQR)\nprint(sueldos[fuera].tolist())",
 opciones:['[5000]','[]','[950, 5000]','[1400, 5000]'],correcta:0,
 explica:"Q1=1075, Q3=1325 → IQR=250 y límites [700, 1700]. Solo el 5000 queda fuera. "+
  "Juega con el umbral en el <a href='#outliers'>módulo Outliers</a>."},

{id:'p14',tema:'outliers',origen:'Clase 15 · outliers',nivel:3,
 code:"notas = pd.Series([60.0, 62.0, 58.0, 61.0, 95.0])\nz = (notas - notas.mean()) / notas.std()\nprint((z.abs() > 1.5).sum())",
 opciones:['1','0','2','5'],correcta:0,
 explica:"El 95 dispara la media a 67.2 y la desviación a 15.6, así que su z es solo 1.78: "+
  "<b>el outlier infla la desviación y casi se esconde a sí mismo</b>. Por eso el curso prefiere IQR o MAD, "+
  "que usan medianas robustas."},

/* ===== Wrangling ===== */
{id:'p15',tema:'wrangling',origen:'Control 4 · VeloCity',nivel:1,
 code:"df = pd.DataFrame({'patente':\n  ['AA11','BB22','AA11','CC33','AA11']})\nprint(df.duplicated().sum())",
 opciones:['2','3','1','0'],correcta:0,
 explica:"<code>keep='first'</code> por defecto: la <b>primera</b> AA11 no se marca como duplicada; "+
  "las otras dos sí. Cambia el keep en el <a href='#wrangling'>módulo Data wrangling</a>."},

{id:'p16',tema:'wrangling',origen:'Control 4 · VeloCity',nivel:2,
 code:"df = pd.DataFrame({'patente':\n  ['AA11','BB22','AA11','CC33','AA11']})\nprint(df.drop_duplicates(keep=False)['patente'].tolist())",
 opciones:["['BB22', 'CC33']","['BB22', 'CC33', 'AA11']","['AA11', 'BB22', 'CC33']","[]"],correcta:0,
 explica:"<code>keep=False</code> es el modo drástico: elimina <b>todas</b> las copias, "+
  "incluida la original. AA11 desaparece por completo.",
 visual(m){dfDiff(m,
   {columns:['patente'],index:[0,1,2,3,4],rows:[['AA11'],['BB22'],['AA11'],['CC33'],['AA11']]},
   {columns:['patente'],index:[1,3],rows:[['BB22'],['CC33']]},
   "drop_duplicates(keep=False)");}},

{id:'p17',tema:'wrangling',origen:'Clase 17 · binning',nivel:2,
 code:"edades = pd.Series([18, 25, 40, 65])\ncat = pd.cut(edades, bins=[0, 18, 40, 65, 120],\n             labels=['niñez','joven','adulto','mayor'])\nprint(cat[0])",
 opciones:["niñez","joven","NaN","ValueError"],correcta:0,
 explica:"Los intervalos de <code>pd.cut</code> son <b>(a, b]</b>: abiertos a la izquierda y cerrados a la derecha. "+
  "18 cae en (0, 18] → 'niñez'. El 40 y el 65 también caen en su intervalo «de abajo»."},

{id:'p18',tema:'wrangling',origen:'Control 4 · VeloCity',nivel:2,
 code:"resp = pd.Series(['sí', 'no', 's/r', 'sí'])\nprint(resp.map({'sí': 1, 'no': 0}).tolist())",
 opciones:["[1.0, 0.0, nan, 1.0]","[1, 0, 's/r', 1]","[1, 0, 0, 1]","KeyError"],correcta:0,
 explica:"<code>map</code> convierte en <b>NaN todo lo que no esté en el diccionario</b> ('s/r' se pierde), "+
  "y con NaN la columna pasa a float. <code>replace</code> habría dejado 's/r' intacto — "+
  "compáralos en el <a href='#wrangling'>módulo Data wrangling</a>."},

/* ===== GroupBy ===== */
{id:'p19',tema:'groupby',origen:'Guía GroupBy · cafetería',nivel:2,
 code:"df = pd.DataFrame({\n  'sucursal': ['Centro','San Pedro','Centro',\n               'Talcahuano','San Pedro'],\n  'total': [4000, 3000, 2000, 9000, 4500]})\nprint(df.groupby('sucursal')['total'].sum().index[0])",
 opciones:["'Centro'","'Talcahuano'","'San Pedro'","el primero que aparece en df"],correcta:0,
 explica:"groupby entrega los grupos <b>ordenados alfabéticamente por llave</b>, no por valor ni por aparición. "+
  "Talcahuano lidera en plata (9000) pero para verlo primero necesitas <code>.sort_values(ascending=False)</code> — "+
  "la pregunta 1 de la guía de GroupBy."},

{id:'p20',tema:'groupby',origen:'Guía GroupBy · cafetería',nivel:2,
 code:"df = pd.DataFrame({'cat': ['a','a','b','b'],\n                   'monto': [1, None, 3, 4]})\nprint(df.groupby('cat')['monto'].count()['a'])",
 opciones:['1','2','1.0','NaN'],correcta:0,
 explica:"<code>count()</code> cuenta <b>valores no nulos</b>: el NaN de 'a' no cuenta. "+
  "Para contar filas (transacciones) usa <code>.size()</code>, que daría 2. "+
  "La diferencia aparece en la pregunta 3 de la guía."},

{id:'p21',tema:'groupby',origen:'Guía GroupBy · pregunta 7',nivel:2,
 code:"df = pd.DataFrame({'producto': ['café','café','té'],\n                   'sucursal': ['Centro','SP','Centro'],\n                   'monto': [100, 150, 80]})\np = pd.pivot_table(df, values='monto', index='producto',\n                   columns='sucursal', aggfunc='sum')\nprint(p.loc['té', 'SP'])",
 opciones:['nan','0','80','KeyError'],correcta:0,
 explica:"El té nunca se vendió en SP: la tabla cruzada rellena esa celda con <b>NaN</b> "+
  "(usa <code>fill_value=0</code> si prefieres 0). El heatmap del <a href='#groupby'>módulo GroupBy</a> lo muestra en gris.",
 visual(m){const t=new DfTable(m,{caption:"pivot_table (producto × sucursal)",columns:['Centro','SP'],
   index:['café','té'],rows:[[100,150],[80,null]]});}},

/* ===== Joins ===== */
{id:'p22',tema:'merge',origen:'Clase 19 · joins',nivel:2,
 code:"ventas = pd.DataFrame({'id_cli': [1, 2, 2, 3],\n                       'monto': [10, 20, 30, 40]})\nclientes = pd.DataFrame({'id_cli': [1, 2, 4],\n                         'nombre': ['Ana','Beto','Dani']})\nm = pd.merge(ventas, clientes, on='id_cli', how='inner')\nprint(len(m))",
 opciones:['3','4','2','7'],correcta:0,
 explica:"El id 2 está repetido a la izquierda y <b>ambas filas encuentran a Beto</b> (2 filas); "+
  "Ana aporta 1; el id 3 no tiene pareja y el 4 tampoco → quedan fuera con inner. "+
  "Mira las líneas entre llaves en el <a href='#merge'>módulo Joins</a>.",
 visual(m){const t=new DfTable(m,{caption:"resultado inner (3 filas)",columns:['id_cli','monto','nombre'],
   index:[0,1,2],rows:[[1,10,'Ana'],[2,20,'Beto'],[2,30,'Beto']]});}},

{id:'p23',tema:'merge',origen:'Ej. Integrador 2 · P2.1',nivel:2,
 code:"m = pd.merge(ventas, clientes,\n             on='id_cli', how='left')\nprint(m['nombre'].isnull().sum())\n# ventas: id_cli 1,2,2,3 — clientes: 1,2,4",
 opciones:['1','0','2','4'],correcta:0,
 explica:"<code>left</code> conserva las 4 filas de ventas; el id 3 no existe en clientes y su nombre queda "+
  "<b>NaN</b>. Validar cuántos NaN deja un merge es exactamente la P2.3 del Ejercicio Integrador 2."},

{id:'p24',tema:'merge',origen:'Clase 20 · concat',nivel:2,
 code:"t1 = pd.DataFrame({'v': [1, 2]})\nt2 = pd.DataFrame({'v': [3, 4]})\nc = pd.concat([t1, t2])\nprint(len(c.loc[0]))",
 opciones:['2','1','4','KeyError'],correcta:0,
 explica:"Sin <code>ignore_index=True</code> el índice queda <b>0, 1, 0, 1</b> y <code>loc[0]</code> "+
  "devuelve DOS filas. La trampa clásica del concat — está animada en el <a href='#merge'>módulo Joins</a>.",
 visual(m){const t=new DfTable(m,{caption:"concat sin ignore_index",columns:['v'],
   index:[0,1,0,1],rows:[[1],[2],[3],[4]]});
   t.rowEls[0]._idx.classList.add('hl');t.rowEls[2]._idx.classList.add('hl');}},

/* ===== Fechas ===== */
{id:'p25',tema:'fechas',origen:'Clase 22 · fechas',nivel:1,
 code:"f = pd.Series(pd.to_datetime(\n  ['2024-03-15', '2024-07-01', '2024-12-25']))\nprint(f.dt.month.tolist())",
 opciones:['[3, 7, 12]',"['marzo', 'julio', 'diciembre']",'[15, 1, 25]','AttributeError'],correcta:0,
 explica:"El accesor <code>.dt</code> extrae componentes de fechas ya parseadas: "+
  "<code>.dt.month</code> da el número de mes. Para el nombre existe <code>.dt.month_name()</code>."},

{id:'p26',tema:'fechas',origen:'Guía GroupBy · día de la semana',nivel:2,
 code:"f = pd.Series(pd.to_datetime(['2024-03-15']))\nprint(f.dt.day_name()[0])",
 opciones:["Friday","Viernes","4","viernes"],correcta:0,
 explica:"<code>day_name()</code> habla <b>inglés</b> por defecto — el clásico «¿por qué me salió Friday?» "+
  "de la guía de GroupBy. Se puede pedir en español con <code>day_name(locale='es_CL')</code> si el sistema lo tiene."},

{id:'p27',tema:'fechas',origen:'Ej. Integrador 2 · P3.2',nivel:1,
 code:"plazo = (pd.to_datetime('2026-03-20')\n         - pd.to_datetime('2026-03-02'))\nprint(plazo.days)",
 opciones:['18','19',"'18 days'","TypeError"],correcta:0,
 explica:"Restar dos fechas da un <b>Timedelta</b> («18 days») y <code>.days</code> saca el entero. "+
  "Así se calculan atrasos y duraciones en el Ejercicio Integrador 2."},

{id:'p28',tema:'fechas',origen:'Ej. Integrador 1 · P1.2',nivel:2,
 code:"print('10-01-2024' > '02-12-2024')",
 opciones:['True','False','SyntaxError','depende del formato regional'],correcta:0,
 explica:"Son <b>strings</b>: compara carácter a carácter y '1' &gt; '0', así que enero «gana» a diciembre. "+
  "Por eso el paso 1 de todo análisis temporal es <code>pd.to_datetime</code> — las fechas como texto ordenan mal."},

/* ===== Ampliación fase simulacro (salidas verificadas con pandas 3) ===== */
{id:'p29',tema:'df',origen:'Control 2 · laboratorio',nivel:1,
 code:"df = pd.DataFrame({'nota': [3.5, 6.2, 4.0, 5.8, 6.9],\n                   'curso': ['A','B','A','B','A']})\nprint(df[df['nota'] >= 4.0].shape)",
 opciones:['(4, 2)','(4,)','(5, 2)','(2, 4)'],correcta:0,
 explica:"El filtro deja 4 filas (solo el 3.5 cae) y las 2 columnas se conservan: shape <b>(filas, columnas)</b>. "+
  "Filtrar filas nunca cambia el número de columnas."},

{id:'p30',tema:'df',origen:'Control 2 · laboratorio',nivel:2,
 code:"urgencia = pd.Series(['alta','baja','alta','media'])\nprint(urgencia.value_counts(normalize=True)['alta'])",
 opciones:['0.5','2','50','0.25'],correcta:0,
 explica:"<code>normalize=True</code> convierte los conteos en <b>proporciones</b> que suman 1: "+
  "alta aparece 2 de 4 veces → 0.5. Para porcentaje, multiplica por 100."},

{id:'p31',tema:'df',origen:'Certamen 1 · datos médicos',nivel:1,
 code:"examenes = pd.Series(['glicemia','hemograma','glicemia',\n                      'orina','hemograma'])\nprint(examenes.nunique())",
 opciones:['3','5','2',"['glicemia', 'hemograma', 'orina']"],correcta:0,
 explica:"<code>nunique()</code> cuenta los valores <b>distintos</b> (3). La lista de valores en sí "+
  "la entrega <code>unique()</code> — números versus contenido."},

{id:'p32',tema:'df',origen:'Control 2 · laboratorio',nivel:2,
 code:"notas = pd.Series([3.9, 4.5, 5.1])\nprint(notas.astype(int).tolist())",
 opciones:['[3, 4, 5]','[4, 5, 5]','[4, 4, 5]','TypeError'],correcta:0,
 explica:"<code>astype(int)</code> <b>trunca</b> (corta los decimales), no redondea: 3.9 → 3. "+
  "Si quieres redondear primero: <code>notas.round().astype(int)</code>."},

{id:'p33',tema:'viz',origen:'Control 5 · SERNATUR',nivel:1,
 code:"# Pregunta de negocio:\n# «¿Cómo se DISTRIBUYEN los precios\n#  de los tours? ¿Hay dos grupos?»\n# ¿Qué gráfico corresponde?",
 opciones:['histograma (plt.hist)','gráfico de torta (plt.pie)','línea (plt.plot)','barras por tour (plt.bar)'],correcta:0,
 explica:"«Cómo se reparte una variable numérica» = <b>distribución</b> = histograma (o boxplot). "+
  "La torta es para composición, la línea para tiempo. El mapa completo está en el "+
  "<a href='#viz'>módulo Visualización</a>."},

{id:'p34',tema:'viz',origen:'Control 5 · SERNATUR',nivel:1,
 code:"# «¿Se recuperó el turismo DESPUÉS\n#  de la pandemia? Muestra la evolución\n#  mes a mes 2019-2024.»\n# ¿Qué gráfico corresponde?",
 opciones:['línea (plt.plot)','histograma (plt.hist)','torta por año','scatter (plt.scatter)'],correcta:0,
 explica:"Evolución en el <b>tiempo</b> = línea, con los meses en el eje x (y los datos agregados antes "+
  "con <a href='#fechas'>resample</a>). Es la pregunta 3.4 literal del Control 5."},

{id:'p35',tema:'viz',origen:'Control 5 · SERNATUR',nivel:2,
 code:"# «¿Qué actividad vende más?\n#  Compara las 5 categorías.»\n# ¿Qué gráfico Y qué preparación?",
 opciones:["barras con value_counts() ordenado","torta con los 5 porcentajes","línea de las 5 actividades","histograma de actividades"],correcta:0,
 explica:"Comparar <b>categorías</b> = barras, ordenadas de mayor a menor (value_counts ya ordena). "+
  "Con 5 categorías la torta obliga a comparar ángulos — el ojo compara largos mucho mejor."},

{id:'p36',tema:'viz',origen:'Control 5 · SERNATUR',nivel:2,
 code:"# «¿Los tours más largos son más caros?\n#  (duración vs precio, 200 tours)»\n# ¿Qué gráfico corresponde?",
 opciones:['dispersión (plt.scatter)','dos líneas superpuestas','barras agrupadas','dos histogramas'],correcta:0,
 explica:"<b>Relación entre dos variables numéricas</b> = dispersión, con <code>alpha</code> para ver "+
  "densidad. Si además quieres medirla: la matriz de correlación de la pregunta 3.2 del Control 5."},

{id:'p37',tema:'viz',origen:'Clase 09 · matplotlib',nivel:2,
 code:"fig, ax = plt.subplots()\nax.plot(meses, ventas)\nplt.title('Ventas')   # ¿funciona?",
 opciones:['sí, pero lo limpio es ax.set_title(...)','no: TypeError','solo si hay un único subplot… y este lo es','no: el título queda vacío'],correcta:0,
 explica:"<code>plt.title</code> actúa sobre «los ejes actuales», que aquí son los mismos <code>ax</code> — "+
  "funciona, pero mezclar interfaces se rompe con subplots. La regla del curso: si partiste con "+
  "<code>fig, ax</code>, todo va por <code>ax.set_*</code>."},

{id:'p38',tema:'groupby',origen:'Guía GroupBy · pregunta 6',nivel:2,
 code:"df = pd.DataFrame({'suc': ['C','C','SP'],\n                   'total': [100, 200, 50]})\nr = df.groupby('suc')['total'].agg(['sum','mean'])\nprint(r.loc['C'].tolist())",
 opciones:['[300.0, 150.0]','[300]','[100, 200]','KeyError'],correcta:0,
 explica:"<code>agg(['sum','mean'])</code> devuelve un <b>DataFrame</b> con una columna por función: "+
  "para C, suma 300 y promedio 150. Una pasada, varias respuestas — la pregunta 6 de la guía."},

{id:'p39',tema:'groupby',origen:'Guía GroupBy · cafetería',nivel:1,
 code:"df = pd.DataFrame({'suc': ['C','C','SP'],\n                   'total': [100, 200, 50]})\nprint(df.groupby('suc').size().sum())",
 opciones:['3','2','350','1'],correcta:0,
 explica:"<code>size()</code> cuenta filas por grupo (2 y 1) y la suma reconstruye el total de filas: 3. "+
  "Chequeo de sanidad clásico: <b>ningún groupby debe perder filas</b>."},

{id:'p40',tema:'groupby',origen:'Guía GroupBy · pregunta 9',nivel:3,
 code:"df = pd.DataFrame({'suc': ['C','C','SP'],\n                   'cat': ['x','y','x'], 'v': [1,2,3]})\ng = df.groupby(['suc','cat'])['v'].sum()\nprint(type(g.index).__name__)",
 opciones:["MultiIndex","Index","RangeIndex","tuple"],correcta:0,
 explica:"Agrupar por DOS llaves deja un índice <b>jerárquico</b> (MultiIndex) de pares (suc, cat). "+
  "Por eso el idxmax de la pregunta 9 de la guía devuelve tuplas — y <code>reset_index()</code> lo aplana."},

{id:'p41',tema:'fechas',origen:'Clase 22 · fechas',nivel:1,
 code:"f = pd.to_datetime(pd.Series(['2026-03-15']))\nprint(f.dt.year[0])",
 opciones:['2026',"'2026'",'26','AttributeError'],correcta:0,
 explica:"<code>.dt.year</code> entrega el año como <b>número entero</b>, listo para filtrar "+
  "(<code>f.dt.year == 2026</code>) o agrupar por año."},

{id:'p42',tema:'fechas',origen:'Ej. Integrador 2 · P3.4',nivel:2,
 code:"r = pd.date_range('2026-01-01',\n                  periods=3, freq='W')\nprint(r[0].strftime('%Y-%m-%d'))",
 opciones:["2026-01-04","2026-01-01","2026-01-07","2026-01-08"],correcta:0,
 explica:"<code>freq='W'</code> ancla al <b>domingo</b>: la primera fecha generada no es el 1 de enero "+
  "(jueves) sino el primer domingo, el 4. La trampa está animada en el <a href='#fechas'>módulo Fechas</a>."},

{id:'p43',tema:'fechas',origen:'Ej. Integrador 2 · P3.2',nivel:2,
 code:"d = (pd.to_datetime('2026-04-10')\n     - pd.to_datetime('2026-04-03'))\nprint(d > pd.Timedelta(days=5))",
 opciones:['True','False','TypeError','7'],correcta:0,
 explica:"La resta da un Timedelta de 7 días, y los Timedelta <b>se comparan directo</b> contra otros "+
  "Timedelta: 7 > 5 → True. Así se filtran los pedidos atrasados en el Integrador 2."},

{id:'p44',tema:'nulos',origen:'Control 3 · valores faltantes',nivel:2,
 code:"s = pd.Series([10.0, None, 20.0])\nprint(s.mean(), s.fillna(0).mean())",
 opciones:['15.0 10.0','15.0 15.0','10.0 10.0','nan 10.0'],correcta:0,
 explica:"Antes: (10+20)/2 = 15. Después de imputar con 0: (10+0+20)/3 = 10. <b>Imputar con ceros "+
  "arrastra el promedio</b> — el motivo de la regla «nunca fillna(0) en variables de magnitud» del Control 3."},

{id:'p45',tema:'nulos',origen:'Ayudantía · nulos disfrazados',nivel:2,
 code:"s = pd.Series(['12', 'sin dato', '15'])\nprint(s.isnull().sum())",
 opciones:['0','1','2','TypeError'],correcta:0,
 explica:"Para pandas, <code>'sin dato'</code> es un string tan válido como '12': <b>isnull() solo ve "+
  "NaN/None reales</b>. Los nulos disfrazados se destapan antes con "+
  "<code>replace({'sin dato': np.nan})</code> — sección 2 de la ayudantía de nulos."},

{id:'p46',tema:'nulos',origen:'Control 3 · valores faltantes',nivel:2,
 code:"df = pd.DataFrame({'a': [1, None, None],\n                   'b': [2, None, 5]})\nprint(len(df.dropna(how='all')), len(df.dropna()))",
 opciones:['2 1','1 1','2 2','3 1'],correcta:0,
 explica:"<code>how='all'</code> solo bota filas <b>completamente vacías</b> (la del medio); el default "+
  "<code>how='any'</code> bota cualquier fila con al menos un NaN (quedan 1). Misma función, dos filosofías."},

{id:'p47',tema:'merge',origen:'Clase 19 · joins',nivel:2,
 code:"ventas = pd.DataFrame({'id_cli': [1, 2, 2, 3],\n                       'monto': [10, 20, 30, 40]})\nclientes = pd.DataFrame({'id_cli': [1, 2, 4],\n                         'nombre': ['Ana','Beto','Dani']})\nprint(len(pd.merge(ventas, clientes,\n                   on='id_cli', how='outer')))",
 opciones:['5','7','4','3'],correcta:0,
 explica:"outer = los 3 matches (1, 2, 2) + la venta huérfana del id 3 + el cliente sin ventas id 4 "+
  "= <b>5 filas</b>, rellenando con NaN lo que falte de cada lado. El Venn del "+
  "<a href='#merge'>módulo Joins</a> pintado completo."},

{id:'p48',tema:'merge',origen:'Ej. Integrador 2 · P2.3',nivel:3,
 code:"m = pd.merge(ventas, clientes, on='id_cli',\n             how='outer', indicator=True)\nprint(m['_merge'].value_counts()['left_only'])\n# ventas: id 1,2,2,3 — clientes: 1,2,4",
 opciones:['1','2','3','0'],correcta:0,
 explica:"<code>indicator=True</code> agrega la columna <code>_merge</code> que audita el join: "+
  "both (3), <b>left_only (1: la venta del id 3)</b>, right_only (1: Dani). "+
  "La herramienta profesional para validar un merge sin contar a mano."},
];

/* ---------------- Detective de bugs ---------------- */
const BANCO_BUGS=[

{id:'b01',tema:'numpy',origen:'Control 1 · epidemiología',nivel:1,
 lineas:["# promedio de casos POR SEMANA (columnas = semanas)",
         "casos = np.array([[10, 12, 8],",
         "                  [20, 25, 30]])   # filas = regiones",
         "prom = casos.mean(axis=1)",
         "print(prom)   # ¿una cifra por semana?"],
 bug:3,pista:"¿Qué dirección colapsa cada axis?",
 explica:"<code>axis=1</code> colapsa las <b>columnas</b> → entrega un promedio por región (2 valores), "+
  "no por semana. Para colapsar las filas y quedarte con 3 cifras (una por semana) es <code>axis=0</code>.",
 fix:"prom = casos.mean(axis=0)   # [15.  18.5 19. ]"},

{id:'b02',tema:'df',origen:'Certamen 1 · datos médicos',nivel:1,
 lineas:["df = pd.DataFrame({'edad': [30, 70, 45],",
         "                   'presion': [120, 160, 135]})",
         "riesgo = df[df['edad'] > 60 & df['presion'] > 140]",
         "print(riesgo)"],
 bug:2,pista:"¿Qué operador se evalúa primero: > o &?",
 explica:"<code>&amp;</code> tiene <b>más precedencia</b> que <code>&gt;</code>: Python intenta "+
  "<code>60 &amp; df['presion']</code> primero y explota con «The truth value of a Series is ambiguous». "+
  "Cada condición necesita sus paréntesis.",
 fix:"riesgo = df[(df['edad'] > 60) & (df['presion'] > 140)]"},

{id:'b03',tema:'df',origen:'Control 2 · laboratorio',nivel:2,
 lineas:["df = pd.DataFrame({'v': [10, 20, 30, 40, 50]})",
         "primeros_tres = df.loc[0:3]",
         "print(len(primeros_tres))   # esperaba 3…"],
 bug:1,pista:"loc va por etiqueta, no por posición.",
 explica:"<code>loc[0:3]</code> incluye <b>ambos extremos</b> (0, 1, 2 y 3): son 4 filas. "+
  "Para «las primeras tres» se usa <code>iloc[0:3]</code> o <code>head(3)</code>.",
 fix:"primeros_tres = df.iloc[0:3]   # filas 0, 1, 2"},

{id:'b04',tema:'wrangling',origen:'Control 4 · VeloCity',nivel:3,
 lineas:["df = pd.DataFrame({'estado': ['activo','baja','activo'],",
         "                   'tarifa': [1000, 900, 1200]})",
         "activos = df[df['estado'] == 'activo']",
         "activos['tarifa'] = 1500",
         "print(df)   # df sigue igual… y salta un warning"],
 bug:3,pista:"¿activos es el DataFrame original o una copia?",
 explica:"<code>activos</code> es una <b>copia filtrada</b>: escribir sobre ella dispara el "+
  "<i>SettingWithCopyWarning</i> y el df original no cambia. Para modificar el original se filtra y asigna "+
  "en una sola operación con <code>loc</code>.",
 fix:"df.loc[df['estado'] == 'activo', 'tarifa'] = 1500"},

{id:'b05',tema:'nulos',origen:'Control 3 · valores faltantes',nivel:1,
 lineas:["df = pd.DataFrame({'a': [1, None, 3]})",
         "df.dropna()",
         "print(df.isnull().sum()['a'])   # ¡sigue habiendo 1 nulo!"],
 bug:1,pista:"¿dropna modifica df o devuelve algo?",
 explica:"<code>dropna()</code> <b>devuelve una copia</b> sin nulos; si no la guardas, no pasó nada. "+
  "El clásico «lo limpié pero siguen los NaN» del Control 3.",
 fix:"df = df.dropna()"},

{id:'b06',tema:'merge',origen:'Clase 20 · bicicletas Concepción',nivel:2,
 lineas:["enero = pd.DataFrame({'viajes': [120, 90]})",
         "febrero = pd.DataFrame({'viajes': [150, 80]})",
         "anual = pd.concat([enero, febrero])",
         "print(anual.loc[1])   # esperaba UNA fila"],
 bug:2,pista:"¿Cómo quedó el índice después de apilar?",
 explica:"concat apila <b>conservando los índices originales</b>: quedan 0, 1, 0, 1 y "+
  "<code>loc[1]</code> trae dos filas. Al apilar periodos hay que renumerar.",
 fix:"anual = pd.concat([enero, febrero], ignore_index=True)"},

{id:'b07',tema:'groupby',origen:'Guía GroupBy · cafetería',nivel:2,
 lineas:["ventas = pd.DataFrame({'sucursal': ['C','SP','C'],",
         "                       'total': [100, 200, 50]})",
         "resumen = ventas.groupby('sucursal')['total'].sum()",
         "print(resumen['sucursal'])   # KeyError ?!"],
 bug:2,pista:"Después del groupby, ¿dónde quedó la columna sucursal?",
 explica:"Tras el groupby, la llave <b>deja de ser columna y pasa a ser el índice</b>: "+
  "<code>resumen['sucursal']</code> busca una etiqueta que no existe. Con "+
  "<code>reset_index()</code> vuelve a ser columna (imprescindible antes de un merge).",
 fix:"resumen = ventas.groupby('sucursal')['total'].sum().reset_index()"},

{id:'b08',tema:'wrangling',origen:'Control 4 · VeloCity',nivel:2,
 lineas:["duraciones = pd.Series([5, 25, 70, 130])",
         "tramo = pd.cut(duraciones, bins=[0, 30, 60, 120],",
         "               labels=['corto','medio','largo'])",
         "print(tramo.tolist())   # el 130 desapareció"],
 bug:1,pista:"¿Hasta dónde llega el último bin?",
 explica:"El 130 queda <b>fuera del último intervalo</b> (0–120] y pd.cut lo convierte en NaN "+
  "<b>sin avisar</b> — igual que el 70, que sí cae en (60, 120]. Un viaje de 130 min se pierde en silencio.",
 fix:"tramo = pd.cut(duraciones, bins=[0, 30, 60, np.inf],\n               labels=['corto','medio','largo'])"},

{id:'b09',tema:'merge',origen:'Ej. Integrador 2 · P2.1',nivel:2,
 lineas:["pedidos = pd.DataFrame({'id_cli': [1, 2, 3]})",
         "clientes = pd.DataFrame({'id_cli': [1, 2],",
         "                         'ciudad': ['C','SP']})",
         "tabla = pd.merge(pedidos, clientes,",
         "                 on='id_cli', how='inner')",
         "# el informe debía incluir TODOS los pedidos"],
 bug:4,pista:"¿Qué hace inner con los pedidos sin cliente registrado?",
 explica:"<code>inner</code> <b>bota en silencio</b> el pedido del cliente 3, que no está en la tabla de clientes. "+
  "Si el análisis exige conservar todos los pedidos, corresponde <code>left</code> (y luego decidir qué hacer con los NaN).",
 fix:"                 on='id_cli', how='left'"},

{id:'b10',tema:'fechas',origen:'Ej. Integrador 1 · P1.2',nivel:2,
 lineas:["df = pd.DataFrame({'fecha':",
         "  ['10-05-2024', '02-01-2025', '20-11-2024']})",
         "df['fecha'] = df['fecha'].astype(str)",
         "antigua = df.sort_values('fecha')['fecha'].iloc[0]",
         "print(antigua)   # sale '02-01-2025' ?!"],
 bug:2,pista:"¿Ordenar texto es lo mismo que ordenar fechas?",
 explica:"Como texto, '02-01-2025' &lt; '10-05-2024' porque '0' &lt; '1': el orden es alfabético, no temporal. "+
  "Había que <b>parsear</b> con <code>pd.to_datetime</code> indicando que el día va primero.",
 fix:"df['fecha'] = pd.to_datetime(df['fecha'], format='%d-%m-%Y')"},

{id:'b11',tema:'wrangling',origen:'Clase 17 · cadenas',nivel:1,
 lineas:["df = pd.DataFrame({'comuna': ['stgo', 'conce']})",
         "df['comuna'] = df['comuna'].upper()",
         "print(df)"],
 bug:1,pista:"upper() es de strings… ¿y qué es df['comuna']?",
 explica:"Una columna es una <b>Serie</b>, no un string: los métodos de texto van tras el accesor "+
  "<code>.str</code>. Sin él: <i>AttributeError: 'Series' object has no attribute 'upper'</i>.",
 fix:"df['comuna'] = df['comuna'].str.upper()"},

{id:'b12',tema:'wrangling',origen:'Control 4 · VeloCity',nivel:2,
 lineas:["df = pd.DataFrame({'id_viaje': [1, 2, 3],",
         "  'patente': ['AA11', 'AA11', 'BB22']})",
         "repetidos = df.duplicated().sum()",
         "print(repetidos)   # 0 … ¿y las patentes repetidas?"],
 bug:2,pista:"¿duplicated compara una columna o la fila entera?",
 explica:"<code>duplicated()</code> compara la <b>fila completa</b> y el id_viaje distinto hace única "+
  "cada fila. Para buscar patentes repetidas hay que mirar solo esa columna con <code>subset</code>.",
 fix:"repetidos = df.duplicated(subset='patente').sum()   # 1"},
];
