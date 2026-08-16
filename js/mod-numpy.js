'use strict';
/* Módulo 1: Arrays NumPy — reshape, axis, máscaras booleanas y broadcasting */
registerModule({
  id:'numpy',
  title:'Arrays NumPy',
  lead:'Un array es una grilla de valores del mismo tipo. Aquí puedes ver cómo se mueven '+
       'las celdas al cambiar la forma, qué recorre realmente el axis, cómo filtra una máscara '+
       'booleana y por qué las funciones arg… devuelven posiciones y no valores.',
  build(sec){

    /* ---------- Tarjeta 1: reshape ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{html:'Cambiar la forma: <code>reshape</code>'}),
        el('p',{class:'note',html:'Los 12 valores <b>siempre son los mismos y en el mismo orden</b> (orden C: fila por fila). '+
          'Reshape solo cambia cómo se agrupan. Mira cómo viaja cada celda.'}));
      sec.append(card);
      const ctr=el('div');card.append(ctr);
      const wrap=el('div',{style:'overflow-x:auto'});card.append(wrap);
      const grid=new CellGrid(wrap);
      const msg=el('div',{class:'msg'});card.append(msg);
      const code=codeBox(card);
      const vals=Array.from({length:12},(_,i)=>i+1);
      function render(r,c){
        grid.setCells(vals.map((v,i)=>({id:'v'+i, text:v, r:Math.floor(i/c), c:i%c})));
      }
      function pick(shape){
        msg.textContent='';msg.className='msg';
        if(shape==='bad'){
          grid.shake();
          msg.className='msg err';
          msg.textContent='ValueError: cannot reshape array of size 12 into shape (5,3) — 5×3=15 ≠ 12';
          code.innerHTML='a = np.arange(1, 13)\na.reshape(<b>5, 3</b>)   # 💥 5·3 = 15 celdas, pero solo hay 12';
          return;
        }
        const [r,c]=shape;
        render(r,c);
        code.innerHTML=`a = np.arange(1, 13)      # shape (12,)\na.reshape(<b>${r}, ${c}</b>)          # shape (${r}, ${c})`;
      }
      const SHAPES=[[1,12],[2,6],[3,4],[4,3],[6,2],[12,1]];
      const shapeBtns=btnGroup(ctr,[
        ...SHAPES.map(s=>({label:`${s[0]} × ${s[1]}`,value:s})),
        {label:'5 × 3 ✗',value:'bad'},
      ],v=>{pick(v); setHashParams({shape:v==='bad'?'5x3':v.join('x')});},false);
      /* #numpy?shape=4x3 abre directo con esa forma (link compartible) */
      const si=SHAPES.findIndex(s=>s.join('x')===hashParams().shape);
      shapeBtns[si<0?0:si].classList.add('on');
      if(si>0){ pick(SHAPES[si]); }
      else{
        render(1,12);
        code.innerHTML='a = np.arange(1, 13)      # shape (12,)\na.reshape(<b>1, 12</b>)';
      }
    }

    /* ---------- Tarjeta 2: axis ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{html:'El famoso <code>axis</code>'}),
        el('p',{class:'note',html:'<b>axis = el eje que se recorre (y desaparece).</b> Con <code>axis=0</code> la suma '+
          '<b>baja por cada columna</b> consumiendo las filas (↓): queda un valor por columna. Con <code>axis=1</code> '+
          '<b>avanza por cada fila</b> consumiendo las columnas (→): queda un valor por fila. '+
          'Fíjate en la dirección del barrido amarillo.'}));
      sec.append(card);
      const ctr=el('div');card.append(ctr);
      const wrap=el('div',{style:'overflow-x:auto'});card.append(wrap);
      const grid=new CellGrid(wrap);
      const code=codeBox(card);
      const M=[[2,7,1,8],[3,5,9,4],[6,0,2,5]];
      const nR=3,nC=4;
      let run=0;
      const res=[];      // celdas de resultado ya calculadas
      const hl=new Set(); // celdas actualmente barridas (amarillo)
      function draw(){
        grid.setCells([
          ...M.flatMap((row,r)=>row.map((v,c)=>({id:`m${r}_${c}`,text:v,r,c,cls:hl.has(r+'_'+c)?'hl':''}))),
          ...res]);
      }
      draw();
      code.textContent='M = np.array([[2,7,1,8],\n              [3,5,9,4],\n              [6,0,2,5]])';
      async function anim(mode){
        const t=++run;
        res.length=0; hl.clear(); draw();
        /* el barrido amarillo avanza celda a celda EN LA DIRECCIÓN del eje */
        if(mode==='a0'){
          code.innerHTML='M.sum(<b>axis=0</b>)   # ↓ baja por cada columna consumiendo las filas\n# array([11, 12, 12, 17])';
          for(let c=0;c<nC;c++){
            hl.clear();
            for(let r=0;r<nR;r++){
              hl.add(`${r}_${c}`); draw();
              await sleep(200); if(t!==run)return;
            }
            res.push({id:'r'+c,text:M[0][c]+M[1][c]+M[2][c],r:nR+0.5,c,cls:'res'});
            hl.clear(); draw();
            await sleep(160); if(t!==run)return;
          }
        }else if(mode==='a1'){
          code.innerHTML='M.sum(<b>axis=1</b>)   # → avanza por cada fila consumiendo las columnas\n# array([18, 21, 13])';
          for(let r=0;r<nR;r++){
            hl.clear();
            for(let c=0;c<nC;c++){
              hl.add(`${r}_${c}`); draw();
              await sleep(200); if(t!==run)return;
            }
            res.push({id:'r'+r,text:M[r].reduce((a,b)=>a+b),r,c:nC+0.5,cls:'res'});
            hl.clear(); draw();
            await sleep(160); if(t!==run)return;
          }
        }else{
          code.innerHTML='M.sum()          # sin axis: colapsa TODO\n# 52';
          M.forEach((row,r)=>row.forEach((_,c)=>hl.add(`${r}_${c}`)));
          draw();
          await sleep(550); if(t!==run)return;
          hl.clear();
          res.push({id:'tot',text:52,r:nR+0.5,c:(nC-1)/2,cls:'res'});
          draw();
        }
      }
      btnGroup(ctr,[
        {label:'sum(axis=0) ↓',value:'a0'},
        {label:'sum(axis=1) →',value:'a1'},
        {label:'sum() total',value:'tot'},
      ],anim,false);
    }

    /* ---------- Tarjeta 3: máscaras booleanas ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{html:'Filtrado con máscaras booleanas'}),
        el('p',{class:'note',html:'La condición produce un array de <code>True/False</code> con la misma forma. '+
          'Al indexar con esa máscara, NumPy <b>extrae solo las celdas True</b>, en orden fila por fila, '+
          'y devuelve un array 1D.'}));
      sec.append(card);
      const A=[[4,9,1,7],[6,2,8,3],[0,5,9,2]];
      const ops={'>':(a,b)=>a>b,'>=':(a,b)=>a>=b,'<':(a,b)=>a<b,'==':(a,b)=>a===b};
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const selOp=el('select',{},Object.keys(ops).map(o=>el('option',{},o)));
      const rng=el('input',{type:'range',min:0,max:9,value:5});
      const rngVal=el('span',{style:'font-weight:700;min-width:1.2em;display:inline-block'},'5');
      const chk=el('input',{type:'checkbox',id:'npmask'});
      ctr.append(el('label',{},'condición: A '),selOp,rng,rngVal,
        el('label',{for:'npmask',style:'margin-left:.8rem'},chk,' ver máscara booleana'));
      const wrap=el('div',{style:'overflow-x:auto'});card.append(wrap);
      const grid=new CellGrid(wrap);
      const cnt=el('div',{class:'msg okc'});card.append(cnt);
      const code=codeBox(card);
      function render(){
        const op=selOp.value, k=+rng.value, showBool=chk.checked;
        rngVal.textContent=k;
        const defs=[];const picked=[];
        A.forEach((row,r)=>row.forEach((v,c)=>{
          const t=ops[op](v,k);
          if(t)picked.push(v);
          defs.push({id:`a${r}_${c}`, r, c,
            text:showBool?(t?'True':'False'):v,
            cls:showBool?(t?'boolT':'boolF'):(t?'ok':'off')});
        }));
        defs.push({id:'lbl',text:'resultado →',r:4,c:0,w:2,cls:'hd'});
        picked.forEach((v,i)=>defs.push({id:'p'+i,text:v,r:4,c:i+2,cls:'res'}));
        grid.setCells(defs);
        cnt.textContent=`quedaron ${picked.length} de 12 valores`;
        code.innerHTML=`mask = A <b>${op} ${k}</b>        # array de booleanos, shape (3, 4)\nA[mask]           # array([${picked.join(', ')}])`;
      }
      selOp.onchange=render; rng.oninput=render; chk.onchange=render;
      render();
    }

    /* ---------- Tarjeta 4: broadcasting ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{},'Broadcasting'),
        el('p',{class:'note',html:'¿Cómo se suma una matriz (3, 4) con un vector (4,)? NumPy <b>estira virtualmente</b> '+
          'el vector — sin copiar memoria — hasta que las formas calcen, y recién ahí opera elemento a elemento.'}));
      sec.append(card);
      const wrap=el('div',{style:'overflow-x:auto'});card.append(wrap);
      const grid=new CellGrid(wrap);
      const code=codeBox(card);
      const A=[[1,2,3,4],[5,6,7,8],[9,10,11,12]], b=[10,20,30,40];
      const off=5.4, offR=10.8;
      const dA=()=>A.flatMap((row,r)=>row.map((v,c)=>({id:`A${r}_${c}`,text:v,r,c})));
      const dPlus={id:'plus',text:'+',r:1,c:4.35,cls:'hd'};
      function reset(){
        grid.setCells([...dA(),dPlus,
          ...b.map((v,c)=>({id:'b'+c,text:v,r:1,c:off+c,cls:'ok'}))]);
        code.textContent='A.shape   # (3, 4)\nb.shape   # (4,)\nA + b     # ¿funciona? ¡sí!';
      }
      const steps=[
        {d:'<b>Formas distintas.</b> A es (3, 4) y b es (4,). Para operar elemento a elemento, las formas deben calzar. '+
           'NumPy compara las formas desde la derecha: el 4 calza con el 4, y a b le falta la dimensión de las filas.',
         async run(){ reset(); }},
        {d:'<b>b se estira (broadcast).</b> NumPy repite virtualmente la fila de b 3 veces — las copias punteadas '+
           'no existen en memoria, solo en la aritmética. Ahora ambos lados son (3, 4).',
         async run(){
           grid.setCells([...dA(),dPlus,
             ...b.map((v,c)=>({id:'b'+c,text:v,r:0,c:off+c,cls:'ok'})),
             ...[1,2].flatMap(r=>b.map((v,c)=>({id:`g${r}_${c}`,text:v,r,c:off+c,cls:'ok ghost'})))]);
           code.innerHTML='A.shape   # (3, 4)\nb.shape   # (4,)  →  se estira a <b>(3, 4)</b>';
           await sleep(500);
         }},
        {d:'<b>Suma elemento a elemento.</b> Con las formas ya iguales, cada celda del resultado es '+
           'A[i, j] + b[j]. El resultado es (3, 4).',
         async run(){
           grid.setCells([...dA(),dPlus,
             ...b.map((v,c)=>({id:'b'+c,text:v,r:0,c:off+c,cls:'ok'})),
             ...[1,2].flatMap(r=>b.map((v,c)=>({id:`g${r}_${c}`,text:v,r,c:off+c,cls:'ok ghost'}))),
             {id:'eq',text:'=',r:1,c:offR-0.65,cls:'hd'},
             ...A.flatMap((row,r)=>row.map((v,c)=>({id:`R${r}_${c}`,text:v+b[c],r,c:offR+c,cls:'res'})))]);
           code.innerHTML='A + b\n# array([[11, 22, 33, 44],\n#        [15, 26, 37, 48],\n#        [19, 30, 41, 52]])';
           await sleep(300);
         }},
      ];
      new Stepper(card,steps,reset,'numpy');
      reset();
    }

    /* ---------- Tarjeta 5: np.where ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{html:'Buscar y decidir: <code>np.where</code>'}),
        el('p',{class:'note',html:'Con <b>tres argumentos</b> es un if/else vectorizado: recorre el array y devuelve '+
          'otro <b>del mismo largo</b>. Con <b>un solo argumento</b> cambia de oficio: devuelve las <b>posiciones</b> '+
          'donde la condición se cumple, no los valores.'}));
      sec.append(card);
      const ctr=el('div');card.append(ctr);
      const wrap=el('div',{style:'overflow-x:auto'});card.append(wrap);
      const grid=new CellGrid(wrap);
      const msg=el('div',{class:'msg'});card.append(msg);
      const code=codeBox(card);
      const n=[12,45,8,60,33,5,27,51], L=n.length;
      const lbl=(id,text,r)=>({id,text,r,c:L+0.35,w:2,cls:'hd'});
      const filaIdx=()=>[...n.map((v,i)=>({id:'wi'+i,text:i,r:0,c:i,cls:'hd'})),lbl('lw0','posición',0)];
      const filaVal=cls=>[...n.map((v,i)=>({id:'wn'+i,text:v,r:1,c:i,cls:cls(v)})),lbl('lw1','ventas',1)];

      function ternario(){
        grid.setCells([...filaIdx(),...filaVal(v=>v>=30?'ok':'off'),
          ...n.map((v,i)=>({id:'wr'+i,text:v>=30?'alta':'baja',r:2,c:i,cls:'res'})),
          lbl('lw2','resultado',2)]);
        msg.className='msg okc';
        msg.textContent='8 valores entran, 8 salen: np.where no filtra, reemplaza.';
        code.innerHTML="np.where(ventas >= 30, <b>'alta'</b>, <b>'baja'</b>)\n"+
          "# array(['baja', 'alta', 'baja', 'alta', 'alta', 'baja', 'baja', 'alta'])";
      }
      function posiciones(){
        const pos=n.map((v,i)=>v>=30?i:null).filter(i=>i!==null);
        grid.setCells([...filaIdx(),...filaVal(v=>v>=30?'ok':'off'),
          ...pos.map(i=>({id:'wp'+i,text:i,r:2,c:i,cls:'res'})),
          lbl('lw2','np.where',2)]);
        msg.className='msg okc';
        msg.textContent=`quedaron ${pos.length} posiciones, no ${pos.length} ventas`;
        code.innerHTML="np.where(ventas >= 30)\n"+
          `# (array([${pos.join(', ')}]),)   ← <b>índices</b>, y viene dentro de una tupla\n`+
          `ventas[np.where(ventas >= 30)]   # array([${pos.map(i=>n[i]).join(', ')}])`;
      }
      function anidado(){
        const cat=v=>v>=50?'A':v>=30?'B':'C';
        const clsCat=v=>v>=50?'hl':v>=30?'ok':'off';
        grid.setCells([...filaIdx(),...filaVal(clsCat),
          ...n.map((v,i)=>({id:'wr'+i,text:cat(v),r:2,c:i,cls:'res'})),
          lbl('lw2','tramo',2)]);
        msg.className='msg';
        msg.textContent='El tercer argumento es otro np.where: se evalúa solo donde el primero dio False.';
        code.innerHTML="np.where(ventas >= 50, 'A',\n"+
          "         np.where(ventas >= 30, <b>'B'</b>, <b>'C'</b>))\n"+
          "# el np.where de adentro decide el resto: primero se pregunta por A";
      }
      btnGroup(ctr,[
        {label:'if/else (3 argumentos)',value:ternario},
        {label:'solo condición → posiciones',value:posiciones},
        {label:'anidado (3 tramos)',value:anidado},
      ],f=>f());
      ternario();
    }

    /* ---------- Tarjeta 6: argsort, argmin y argmax ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{html:'Ordenar por índices: <code>argsort</code>, <code>argmin</code>, <code>argmax</code>'}),
        el('p',{class:'note',html:'Las funciones que empiezan con <b>arg</b> no devuelven valores: devuelven '+
          '<b>posiciones</b>. Por eso sirven para arrastrar otro array — ordenas los tiempos y los nombres '+
          'los siguen.'}));
      sec.append(card);
      const wrap=el('div',{style:'overflow-x:auto'});card.append(wrap);
      const grid=new CellGrid(wrap);
      const code=codeBox(card);
      const nom=['Ana','Beto','Cata','Dani','Eli'], t=[42,35,51,38,47], L=nom.length;
      const orden=t.map((v,i)=>i).sort((a,b)=>t[a]-t[b]);   // argsort = [1,3,0,4,2]
      const lbl=(id,text,r)=>({id,text,r,c:L+0.35,w:2,cls:'hd'});
      const cabecera=()=>[...nom.map((v,i)=>({id:'ai'+i,text:i,r:0,c:i,cls:'hd'})),lbl('la0','posición',0)];
      /* col(i) = dónde se dibuja el corredor i: orig lo deja en la largada, dest lo lleva al podio */
      const cuerpo=(col,clsT)=>[
        ...nom.map((v,i)=>({id:'an'+i,text:v,r:1,c:col(i),cls:'hd'})),
        ...t.map((v,i)=>({id:'at'+i,text:v,r:2,c:col(i),cls:clsT?clsT(i):''})),
        lbl('la1','corredor',1),lbl('la2','tiempo',2)];
      const orig=i=>i, dest=i=>orden.indexOf(i);

      function reset(){
        grid.setCells([...cabecera(),...cuerpo(orig)]);
        code.textContent="nombres = np.array(['Ana', 'Beto', 'Cata', 'Dani', 'Eli'])\n"+
          "tiempos = np.array([42, 35, 51, 38, 47])";
      }
      const steps=[
        {d:'<b>Dos arrays paralelos.</b> La posición 0 es Ana con 42 minutos, la 1 es Beto con 35… '+
           'El vínculo entre nombre y tiempo es la posición: si ordeno solo los tiempos, lo rompo.',
         async run(){ reset(); }},
        {d:'<b><code>np.argsort</code> responde «¿de dónde saco el que va aquí?».</b> En la posición 0 del '+
           'resultado va un 1: el tiempo más bajo (35) está en la posición 1. Después el 3 (38), el 0 (42)… '+
           'No es el array ordenado, es la <b>receta</b> para ordenarlo.',
         async run(){
           grid.setCells([...cabecera(),...cuerpo(orig),
             ...orden.map((i,j)=>({id:'ao'+j,text:i,r:3,c:j,cls:'res'})),
             lbl('la3','argsort',3)]);
           code.innerHTML="orden = np.argsort(tiempos)\n"+
             `# array([${orden.join(', ')}])   ← posiciones, no tiempos`;
           await sleep(400);
         }},
        {d:'<b>Indexar con esa receta reordena de verdad.</b> Cada corredor viaja a su lugar en el podio, '+
           'y como uso los <b>mismos índices</b> en ambos arrays, cada nombre llega con su tiempo.',
         async run(){
           grid.setCells([...cabecera(),...cuerpo(dest),
             ...orden.map((i,j)=>({id:'ao'+j,text:i,r:3,c:j,cls:'res'})),
             lbl('la3','argsort',3)]);
           code.innerHTML="tiempos[orden]   # array([35, 38, 42, 47, 51])\n"+
             "nombres[orden]   # array(['Beto', 'Dani', 'Ana', 'Eli', 'Cata'])";
           await sleep(600);
         }},
        {d:'<b><code>argmin</code> y <code>argmax</code> son los extremos de esa receta:</b> el primero y el '+
           'último índice del argsort. Ojo con la confusión clásica: <code>min()</code> devuelve el tiempo (35) '+
           'y <code>argmin()</code> devuelve <b>dónde está</b> (1).',
         async run(){
           const mn=orden[0], mx=orden[L-1];
           grid.setCells([...cabecera(),
             ...cuerpo(orig,i=>i===mn?'hl':i===mx?'ok':'off'),
             {id:'ao0',text:mn,r:3,c:0,cls:'res'},{id:'ao'+(L-1),text:mx,r:3,c:L-1,cls:'res'},
             lbl('la3','argsort',3)]);
           code.innerHTML="tiempos.min()      # 35   ← el valor\n"+
             `np.argmin(tiempos) # <b>${mn}</b>    ← la posición de Beto\n`+
             `np.argmax(tiempos) # <b>${mx}</b>    ← la posición de Cata\n`+
             "nombres[np.argmin(tiempos)]   # 'Beto'";
           await sleep(300);
         }},
      ];
      new Stepper(card,steps,reset,'numpy');
      reset();
    }
  }
});
