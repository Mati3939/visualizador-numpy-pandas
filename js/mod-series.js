'use strict';
/* =====================================================================
   Módulo: Series — el bloque básico de Pandas
   Cuatro tarjetas: anatomía, etiqueta vs posición, alineación de índices
   y fill_value.
   ===================================================================== */
(function(){

  /* ventas diarias de una cafetería, en miles de pesos */
  const DIAS  = ['lunes','martes','miércoles','jueves','viernes'];
  const VENTAS= [120, 95, 143, 210, 187];

  /* población de comunas del Biobío: nace de un diccionario */
  const COMUNAS = ['Concepción','Talcahuano','San Pedro de la Paz','Coronel','Chiguayante'];
  const POBLA   = [223351, 149461, 139625, 118885, 89806];

  /* dos almacenes de barrio con surtidos parcialmente distintos */
  const NORTE = {pan:45, leche:30, huevos:25, queso:12};
  const SUR   = {pan:38, leche:22, arroz:18, fideos:27};
  /* la unión de etiquetas sale ORDENADA, no en el orden original */
  const UNION = ['arroz','fideos','huevos','leche','pan','queso'];

  registerModule({
    id:'series',
    title:'Series',
    lead:'Una Serie es un array de NumPy con etiquetas. Esa etiqueta es la que manda: '+
         'decide qué devuelve un recorte y, sobre todo, con qué se suma cada valor '+
         'cuando operas dos Series entre sí.',
    build(sec){
      buildAnatomia(sec);
      buildLocIloc(sec);
      buildAlineacion(sec);
      buildFillValue(sec);
    }
  });

  /* ---------------- Tarjeta 1: anatomía de una Serie ---------------- */
  function buildAnatomia(sec){
    const card = el('div',{class:'card'}, el('h3',{},'Anatomía de una Serie'));
    sec.append(card);

    const izq = el('div',{}), der = el('div',{});
    card.append(el('div',{class:'flexcols'}, izq, der));

    const tVentas = new DfTable(izq,{
      index:DIAS, columns:['ventas_miles_pesos'],
      rows:VENTAS.map(v=>[v]),
      caption:'ventas — construida desde una lista'
    });
    const tPobla = new DfTable(der,{
      index:COMUNAS, columns:['poblacion'],
      rows:POBLA.map(v=>[v]),
      caption:'poblacion — construida desde un diccionario'
    });

    const ITEMS=[
      {label:'El índice', value:'index'},
      {label:'Los valores', value:'values'},
      {label:'.name', value:'name'},
      {label:'dtype · size · shape', value:'attrs'},
      {label:'Desde un diccionario', value:'dict'},
    ];
    btnGroup(card, ITEMS, pick, true);

    const noteEl = el('div',{class:'note'});
    card.append(noteEl);
    const code = codeBox(card);

    const NOTES = {
      index:'El <b>índice</b> es lo que separa una Serie de un array: cada valor queda etiquetado. '+
            'No es una columna de datos, vive aparte y es con lo que trabajan <b>.loc</b> y la alineación.',
      values:'<b>.values</b> devuelve un array de NumPy pelado, sin etiquetas. Por eso todo lo que sabes '+
             'de arrays sigue sirviendo: la Serie es ese array <i>más</i> el índice.',
      name:'Una Serie puede tener <b>nombre</b>. Cuando esa Serie pase a ser una columna de un DataFrame, '+
           'el nombre será el encabezado de la columna.',
      attrs:'Los mismos atributos que ya usabas en NumPy. Ojo con <b>shape</b>: una Serie es '+
            'unidimensional, así que su forma es <b>(5,)</b> — un solo eje, igual que un vector.',
      dict:'Si construyes la Serie desde un <b>diccionario</b>, las llaves se convierten en el índice y '+
           'los valores en los datos. No hace falta pasar <b>index=</b> por separado.',
    };
    const CODES = {
      index:`ventas.<b>index</b>\n# Index(['lunes', 'martes', 'miércoles', 'jueves', 'viernes'], dtype='object')`,
      values:`ventas.<b>values</b>\n# array([120,  95, 143, 210, 187])`,
      name:`ventas.<b>name</b> = 'ventas_miles_pesos'`,
      attrs:`print(ventas.<b>dtype</b>)   # int64\nprint(ventas.<b>size</b>)    # 5\nprint(ventas.<b>shape</b>)   # (5,)`,
      dict:`poblacion = pd.Series(<b>{</b>\n    'Concepción': 223351,\n    'Talcahuano': 149461,\n    'San Pedro de la Paz': 139625,\n    'Coronel': 118885,\n    'Chiguayante': 89806\n<b>}</b>)`,
    };

    function pick(v){
      tVentas.clearMarks(); tPobla.clearMarks();
      if(v==='index'){
        tVentas.rowEls.forEach(r=>r._idx.classList.add('hl'));
      }else if(v==='values'){
        tVentas.cellEls.flat().forEach(c=>c.classList.add('sel'));
      }else if(v==='name'){
        tVentas.headEls[0].classList.add('sel');
      }else if(v==='attrs'){
        tVentas.cellEls.flat().forEach(c=>c.classList.add('hl'));
      }else if(v==='dict'){
        tPobla.rowEls.forEach(r=>r._idx.classList.add('hl'));
        tPobla.cellEls.flat().forEach(c=>c.classList.add('sel'));
      }
      noteEl.innerHTML = NOTES[v];
      code.innerHTML = CODES[v];
    }
    pick('index');
  }

  /* ---------------- Tarjeta 2: etiqueta vs posición ---------------- */
  function buildLocIloc(sec){
    const card = el('div',{class:'card'}, el('h3',{},'Etiqueta o posición: .loc y .iloc'));
    sec.append(card);

    const izq = el('div',{}), der = el('div',{});
    card.append(el('div',{class:'flexcols'}, izq, der));

    const tLoc = new DfTable(izq,{
      index:DIAS, columns:['ventas'], rows:VENTAS.map(v=>[v]),
      caption:'.loc — la misma Serie vista por ETIQUETA'
    });
    const tIloc = new DfTable(der,{
      index:[0,1,2,3,4], columns:['ventas'], rows:VENTAS.map(v=>[v]),
      caption:'.iloc — la misma Serie vista por POSICIÓN'
    });

    const PRESETS=[
      {label:"ventas.loc['jueves']", value:'l1'},
      {label:'ventas.iloc[3]', value:'i1'},
      {label:"ventas.loc['martes':'jueves']", value:'l2'},
      {label:'ventas.iloc[1:3]', value:'i2'},
      {label:"ventas.loc[['lunes','viernes']]", value:'l3'},
      {label:'ventas[ventas > 130]', value:'m1'},
    ];
    btnGroup(card, PRESETS, pick, false);

    const noteEl = el('div',{class:'note'},'Elige un recorte arriba para ver qué días entrega.');
    card.append(noteEl);
    const code = codeBox(card);
    code.textContent = '# elige un botón arriba ↑';

    /* marca las filas seleccionadas y atenúa el resto de esa tabla */
    function marcar(t, filas){
      t.o.index.forEach((_,i)=>{ if(!filas.includes(i)) t.rowEls[i].classList.add('roff'); });
      filas.forEach(i=>{
        t.rowEls[i]._idx.classList.add('sel');
        t.cellEls[i][0].classList.add('sel');
      });
    }

    const NOTES = {
      l1:"Con <b>.loc</b> pides la etiqueta: el día se escribe tal cual. Devuelve un solo número, un escalar.",
      i1:"Con <b>.iloc</b> pides la posición. El jueves es el <i>cuarto</i> día, pero su posición es <b>3</b>: "+
         "se cuenta desde cero. Devuelve exactamente el mismo valor que el botón anterior.",
      l2:"El slice por <b>etiqueta incluye el extremo final</b>: de martes a jueves entrega <b>tres</b> días. "+
         "Compáralo con el botón de al lado, que es el recorte equivalente por posición.",
      i2:"El slice por <b>posición excluye el extremo final</b>: 1:3 entrega las posiciones 1 y 2, o sea "+
         "<b>dos</b> días. Misma idea que en las listas de Python y en los arrays de NumPy.",
      l3:"Con una <b>lista</b> de etiquetas dentro del accesor puedes pedir días sueltos, en el orden que quieras. "+
         "Ojo con los dobles corchetes: los de afuera son el accesor, los de adentro la lista.",
      m1:"Una <b>máscara booleana</b>: la condición se evalúa día por día y solo sobreviven los días donde dio "+
         "True. El resultado conserva las etiquetas originales, así que sabes <i>cuáles</i> días fueron.",
    };
    const CODES = {
      l1:`ventas.loc[<b>'jueves'</b>]\n# 210`,
      i1:`ventas.iloc[<b>3</b>]\n# 210`,
      l2:`ventas.loc[<b>'martes':'jueves'</b>]\n# martes        95\n# miércoles    143\n# jueves       210`,
      i2:`ventas.iloc[<b>1:3</b>]\n# martes        95\n# miércoles    143`,
      l3:`ventas.loc[<b>['lunes','viernes']</b>]\n# lunes      120\n# viernes    187`,
      m1:`ventas[<b>ventas > 130</b>]\n# miércoles    143\n# jueves       210\n# viernes      187`,
    };

    function pick(v){
      tLoc.clearMarks(); tIloc.clearMarks();
      if(v==='l1') marcar(tLoc,[3]);
      else if(v==='i1') marcar(tIloc,[3]);
      else if(v==='l2') marcar(tLoc,[1,2,3]);
      else if(v==='i2') marcar(tIloc,[1,2]);
      else if(v==='l3') marcar(tLoc,[0,4]);
      else if(v==='m1') marcar(tLoc,[2,3,4]);
      noteEl.innerHTML = NOTES[v];
      code.innerHTML = CODES[v];
    }
  }

  /* ---------------- Tarjeta 3: alineación de índices ---------------- */
  function buildAlineacion(sec){
    const card = el('div',{class:'card'}, el('h3',{},'Alineación: con qué se suma cada valor'));
    sec.append(card);
    card.append(el('div',{class:'note'},
      'Dos almacenes de barrio venden surtidos parecidos pero no iguales. '+
      'Al sumar las dos Series, Pandas no aparea posición con posición: aparea ETIQUETA con etiqueta.'));

    const izq = el('div',{}), der = el('div',{});
    card.append(el('div',{class:'flexcols'}, izq, der));

    const nk = Object.keys(NORTE), sk = Object.keys(SUR);
    const tN = new DfTable(izq,{index:nk, columns:['norte'], rows:nk.map(k=>[NORTE[k]]),
                               caption:'almacen_norte'});
    const tS = new DfTable(der,{index:sk, columns:['sur'], rows:sk.map(k=>[SUR[k]]),
                                caption:'almacen_sur'});

    const res = el('div',{});
    card.append(res);
    const tR = new DfTable(res,{
      index:UNION, columns:['norte','sur','norte + sur'],
      rows:UNION.map(()=>['','','']),
      caption:'resultado'
    });

    /* escribe una celda respetando cómo clearMarks repinta los NaN */
    function set(t,r,c,v){
      const d = t.cellEls[r][c];
      d._isnan = (v===null);
      d.textContent = v===null ? 'NaN' : (v===''? '' : fmt(v));
      d.className = 'dfc' + (v===null?' nan':'');
    }
    function vaciar(){
      UNION.forEach((_,r)=>[0,1,2].forEach(c=>set(tR,r,c,'')));
    }
    function reset(){
      tN.clearMarks(); tS.clearMarks(); tR.clearMarks();
      vaciar();
    }

    const pasos = [
      {d:'Pandas mira primero las <b>etiquetas</b> de las dos Series, no sus posiciones. '+
          '<b>pan</b> y <b>leche</b> están en las dos; <b>huevos</b> y <b>queso</b> solo en el norte; '+
          '<b>arroz</b> y <b>fideos</b> solo en el sur.',
       run(){
         tN.rowEls.forEach(r=>r._idx.classList.add('hl'));
         tS.rowEls.forEach(r=>r._idx.classList.add('hl'));
       }},
      {d:'Arma la <b>unión</b> de las dos listas de etiquetas — y la deja <b>ordenada alfabéticamente</b>. '+
          'Por eso el resultado no sale en el orden en que escribiste ninguna de las dos Series.',
       run(){
         tR.rowEls.forEach(r=>r._idx.classList.add('hl'));
       }},
      {d:'Cada Serie se <b>reindexa</b> a esa unión. Donde una Serie no tenía la etiqueta, '+
          'aparece <b>NaN</b>: no es un cero, es un hueco.',
       run(){
         UNION.forEach((k,r)=>{
           set(tR,r,0, k in NORTE ? NORTE[k] : null);
           set(tR,r,1, k in SUR   ? SUR[k]   : null);
         });
       }},
      {d:'Recién ahora suma, fila por fila. <b>NaN + número = NaN</b>, así que solo quedan con valor las dos '+
          'etiquetas que estaban en ambas Series. Y fíjate en el tipo: el resultado es <b>float64</b>, '+
          'porque NaN solo existe entre los flotantes.',
       run(){
         UNION.forEach((k,r)=>{
           const hay = (k in NORTE) && (k in SUR);
           set(tR,r,2, hay ? fmt(NORTE[k]+SUR[k])+',0' : null);
           if(hay) tR.cellEls[r][2].classList.add('sel');
         });
       }},
    ];

    new Stepper(card, pasos, reset, 'series');
    const code = codeBox(card);
    code.innerHTML = `almacen_norte + almacen_sur\n`+
      `# arroz      NaN\n# fideos     NaN\n# huevos     NaN\n`+
      `# leche     52.0\n# pan       83.0\n# queso      NaN\n# dtype: float64`;
    reset();
  }

  /* ---------------- Tarjeta 4: fill_value ---------------- */
  function buildFillValue(sec){
    const card = el('div',{class:'card'}, el('h3',{},'fill_value: rellenar antes de operar'));
    sec.append(card);

    const tR = new DfTable(card,{
      index:UNION, columns:['norte','sur','resultado'],
      rows:UNION.map(k=>[
        k in NORTE ? NORTE[k] : null,
        k in SUR   ? SUR[k]   : null,
        null
      ]),
      caption:'almacen_norte y almacen_sur, alineados'
    });

    const OPTS=[
      {label:'almacen_norte + almacen_sur', value:'suma'},
      {label:'almacen_norte.add(almacen_sur, fill_value=0)', value:'add'},
    ];
    btnGroup(card, OPTS, pick, true);

    const noteEl = el('div',{class:'note'});
    card.append(noteEl);
    const code = codeBox(card);

    function set(t,r,c,v,cls){
      const d = t.cellEls[r][c];
      d._isnan = (v===null);
      d.textContent = v===null ? 'NaN' : fmt(v);
      d.className = 'dfc' + (v===null?' nan':'') + (cls?' '+cls:'');
    }

    function pick(v){
      tR.clearMarks();
      UNION.forEach((k,r)=>{
        const n = k in NORTE, s = k in SUR;
        if(v==='suma'){
          set(tR,r,2, (n&&s) ? fmt(NORTE[k]+SUR[k])+',0' : null, (n&&s)?'sel':'');
        }else{
          const total = (n?NORTE[k]:0) + (s?SUR[k]:0);
          set(tR,r,2, fmt(total)+',0', (n&&s)?'sel':'fill');
        }
      });
      noteEl.innerHTML = v==='suma'
        ? 'Con el operador <b>+</b>, una etiqueta que falta en una de las dos Series arrastra el NaN al '+
          'resultado. De seis productos, solo dos quedan con número.'
        : 'Con <b>.add(..., fill_value=0)</b> el hueco se rellena con 0 <b>antes</b> de sumar, así que la '+
          'etiqueta que existía en una sola Serie conserva su valor. Las celdas marcadas son las que se '+
          'salvaron gracias al relleno. Ojo: si una etiqueta faltara en <i>las dos</i> Series, seguiría '+
          'siendo NaN — fill_value tapa el hueco de una, no inventa datos.';
      code.innerHTML = v==='suma'
        ? `almacen_norte <b>+</b> almacen_sur\n# leche     52.0\n# pan       83.0\n# (el resto, NaN)`
        : `almacen_norte.<b>add</b>(almacen_sur, <b>fill_value=0</b>)\n`+
          `# arroz     18.0\n# fideos    27.0\n# huevos    25.0\n`+
          `# leche     52.0\n# pan       83.0\n# queso     12.0`;
    }
    pick('suma');
  }

})();
