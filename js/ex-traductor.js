'use strict';
/* Traductor de tracebacks (idea 14): pega un error real de NumPy/Pandas
   y recibe la explicación en español + el arreglo típico + el módulo que lo ilustra. */
(function(){

const ERRORES=[
 {re:/SettingWithCopyWarning/i,nombre:'SettingWithCopyWarning',
  trad:'Estás escribiendo sobre una COPIA filtrada del DataFrame, no sobre el original.',
  causa:'Encadenaste un filtro y luego una asignación: <code>df[df.x &gt; 0][\'y\'] = 1</code> o guardaste el filtro en una variable y escribiste ahí.',
  fix:"df.loc[df['x'] > 0, 'y'] = 1   # filtrar y asignar EN UNA sola operación",
  mod:['wrangling','Data wrangling']},
 {re:/truth value of a (Series|DataFrame|array.*) is ambiguous/i,nombre:'ValueError: truth value is ambiguous',
  trad:'Python intentó evaluar una Serie completa como si fuera un solo True/False.',
  causa:'Máscaras combinadas sin paréntesis (el <code>&amp;</code> se evalúa antes que <code>&gt;</code>), o usaste <code>and/or</code> en vez de <code>&amp;</code>/<code>|</code>.',
  fix:"df[(df['edad'] > 60) & (df['presion'] > 140)]   # paréntesis en CADA condición",
  mod:['df','DataFrames']},
 {re:/cannot reshape array of size (\d+) into shape/i,nombre:'ValueError: cannot reshape',
  trad:'El número de celdas no calza: reshape nunca inventa ni bota datos.',
  causa:'filas × columnas debe ser exactamente el tamaño del array (p. ej. 12 no se puede volver 5×3=15).',
  fix:"a.reshape(3, 4)      # 3·4 = 12 ✓\na.reshape(2, -1)     # el -1 deja que numpy calcule la otra dimensión",
  mod:['numpy','Arrays NumPy']},
 {re:/operands could not be broadcast together/i,nombre:'ValueError: broadcast',
  trad:'Las formas (shapes) de los arrays no son compatibles para operar elemento a elemento.',
  causa:'Broadcasting solo estira dimensiones de tamaño 1 o iguales: (3,4) + (4,) funciona; (3,4) + (3,) no.',
  fix:"A.shape, b.shape     # imprime las formas y compáralas\nb.reshape(-1, 1)     # a veces basta convertir b en columna",
  mod:['numpy','Arrays NumPy']},
 {re:/Can only use \.str accessor/i,nombre:'AttributeError: .str accessor',
  trad:'Intentaste usar métodos de texto en una columna que no es de texto.',
  causa:'La columna es numérica o mixta (por NaN o números colados entre los strings).',
  fix:"df['col'] = df['col'].astype(str).str.lower()",
  mod:['wrangling','Data wrangling']},
 {re:/Can only use \.dt accessor/i,nombre:'AttributeError: .dt accessor',
  trad:'La columna aún es texto: .dt solo funciona sobre fechas ya parseadas.',
  causa:'Faltó <code>pd.to_datetime</code> antes de pedir .dt.month, .dt.days, etc.',
  fix:"df['fecha'] = pd.to_datetime(df['fecha'])\ndf['fecha'].dt.month   # ahora sí",
  mod:['fechas','Fechas']},
 {re:/'Series' object has no attribute '(upper|lower|strip|split|replace\b|title)'/i,nombre:'AttributeError en Serie (método de string)',
  trad:'Llamaste un método de string directo sobre la Serie completa.',
  causa:'Los métodos de texto van tras el accesor <code>.str</code> cuando se aplican a toda la columna.',
  fix:"df['comuna'].str.upper()   # con .str",
  mod:['wrangling','Data wrangling']},
 {re:/'DataFrame' object has no attribute 'append'/i,nombre:"AttributeError: append ya no existe",
  trad:'df.append() se eliminó en pandas 2: las tablas se apilan con pd.concat.',
  causa:'Material o tutoriales antiguos usan append; el pandas actual (Colab incluido) ya no lo tiene.',
  fix:"df = pd.concat([df, df_nuevo], ignore_index=True)",
  mod:['merge','Joins y concat']},
 {re:/You are trying to merge on .* and .* columns|MergeError/i,nombre:'MergeError: llaves de tipos distintos',
  trad:'Las columnas llave de ambas tablas no tienen el mismo tipo (una es texto, la otra número).',
  causa:'Un CSV cargó el id como string y el otro como int — pasa mucho al combinar fuentes distintas.',
  fix:"df1['id'] = df1['id'].astype(int)   # igualar tipos ANTES del merge\npd.merge(df1, df2, on='id')",
  mod:['merge','Joins y concat']},
 {re:/KeyError/i,nombre:'KeyError',
  trad:'Pediste una columna o etiqueta que no existe en el DataFrame (o ya no existe).',
  causa:'Un typo, espacios invisibles en el nombre (<code>\' monto\'</code>), o la columna se volvió índice después de un groupby / set_index.',
  fix:"df.columns.tolist()          # 1) mira los nombres reales\ndf.columns = df.columns.str.strip()   # 2) limpia espacios\nresumen = resumen.reset_index()       # 3) si venía de un groupby",
  mod:['groupby','GroupBy y pivoteo']},
 {re:/single positional indexer is out-of-bounds|index \d+ is out of bounds/i,nombre:'IndexError: fuera de rango',
  trad:'Pediste una posición que no existe (la tabla o el array es más corto de lo que crees).',
  causa:'Un filtro dejó menos filas de las esperadas y luego <code>iloc[n]</code> apuntó al vacío.',
  fix:"len(df)          # verifica el largo real antes de indexar\ndf.iloc[-1]      # o usa índices negativos para el final",
  mod:['df','DataFrames']},
 {re:/UnicodeDecodeError|codec can't decode/i,nombre:'UnicodeDecodeError',
  trad:'El archivo no está en UTF-8: los acentos/eñes vienen en otra codificación.',
  causa:'CSV exportado desde Excel en Windows (latin-1 / cp1252) — el caso típico de la clase 21.',
  fix:"pd.read_csv('datos.csv', encoding='latin-1')",
  mod:null},
 {re:/FileNotFoundError|No such file or directory/i,nombre:'FileNotFoundError',
  trad:'Python no encuentra el archivo en la carpeta donde está buscando.',
  causa:'En Colab los archivos subidos viven en <code>/content/</code> y se borran al reiniciar el entorno; también puede ser un typo en el nombre.',
  fix:"import os; os.listdir()      # mira qué archivos ve Python realmente",
  mod:null},
 {re:/NameError.*not defined/i,nombre:'NameError',
  trad:'Usaste una variable que Python no conoce todavía.',
  causa:'En un notebook: la celda que la define no se ejecutó (o el kernel se reinició). También puede ser un typo.',
  fix:"# Ejecuta las celdas en orden (Entorno de ejecución → Ejecutar todo en Colab)",
  mod:null},
 {re:/TypeError.*(unsupported operand|can only concatenate str|not supported between instances)/i,nombre:'TypeError: tipos incompatibles',
  trad:'Estás mezclando texto con números en una operación aritmética o comparación.',
  causa:'La columna quedó como object (texto) al cargar el CSV — números con $, puntos de miles o espacios.',
  fix:"df['monto'] = pd.to_numeric(df['monto'], errors='coerce')\n# los no convertibles quedan NaN: revísalos después",
  mod:['nulos','Valores perdidos']},
];

const EJEMPLOS=[
 ["KeyError: 'sucursal'","KeyError tras un groupby"],
 ["ValueError: The truth value of a Series is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all().","máscara sin paréntesis"],
 ["SettingWithCopyWarning: A value is trying to be set on a copy of a slice from a DataFrame.","asignar sobre una copia"],
 ["AttributeError: Can only use .dt accessor with datetimelike values","fechas sin parsear"],
 ["ValueError: cannot reshape array of size 12 into shape (5,3)","reshape imposible"],
];

registerExercise({
  id:'traductor',
  title:'Traductor de errores',
  lead:'Pega el traceback tal cual te lo escupió Python y recibe qué significa, '+
       'por qué pasa y cómo se arregla — en español.',
  build(sec){
    const card=el('div',{class:'card'},
      el('h3',{},'Pega tu error aquí'),
      el('p',{class:'note',html:'Consejo de lectura: en un traceback largo, la información útil está en la '+
        '<b>última línea</b> (el tipo de error) y en la primera línea que apunte a <b>tu</b> código.'}));
    sec.append(card);
    const ta=el('textarea',{class:'tberror',rows:5,
      placeholder:'KeyError: \'sucursal\'\n…o el traceback completo, da lo mismo'});
    card.append(ta);
    const ctr=el('div',{class:'controls'});card.append(ctr);
    const out=el('div');card.append(out);
    const chips=el('div',{class:'controls'},el('label',{},'o prueba uno: '));
    EJEMPLOS.forEach(([txt,lbl])=>chips.append(
      el('button',{class:'btn',onclick:()=>{ta.value=txt;traducir();}},lbl)));
    card.append(chips);

    function traducir(){
      out.textContent='';
      const txt=ta.value.trim();
      if(!txt)return;
      const hit=ERRORES.find(e=>e.re.test(txt));
      if(!hit){
        out.append(el('div',{class:'card',style:'margin:.6rem 0'},
          el('h3',{},'🤷 No lo tengo catalogado (todavía)'),
          el('p',{class:'note',html:'Pistas generales: ① lee la <b>última línea</b> del traceback — ahí está el tipo '+
            'de error y el mensaje; ② ubica la flecha que apunta a una línea escrita por ti (no de las librerías); '+
            '③ imprime <code>df.dtypes</code> y <code>df.columns</code> — la mitad de los errores del curso son '+
            'una columna con el tipo o el nombre equivocado.'})));
        return;
      }
      const c=el('div',{class:'card',style:'margin:.6rem 0'});
      c.append(el('h3',{},'🔍 '+hit.nombre),
        el('p',{class:'note',html:'<b>Qué significa:</b> '+hit.trad}),
        el('p',{class:'note',html:'<b>Por qué pasa:</b> '+hit.causa}));
      const fx=codeBox(c);fx.textContent=hit.fix;
      if(hit.mod)c.append(el('p',{class:'note',html:
        `📚 Está ilustrado en el <a href="#${hit.mod[0]}">módulo ${hit.mod[1]}</a>.`}));
      out.append(c);
    }
    ctr.append(el('button',{class:'btn primary',onclick:traducir},'Traducir error'));
    ta.addEventListener('input',()=>{ if(ta.value.length>8)traducir(); });
  },
});
})();
