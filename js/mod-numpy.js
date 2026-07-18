'use strict';
/* Módulo 1: Arrays NumPy — reshape, axis, máscaras booleanas y broadcasting */
registerModule({
  id:'numpy',
  title:'Arrays NumPy',
  week:'Semanas 1–2',
  lead:'Un array es una grilla de valores del mismo tipo. Aquí puedes ver cómo se mueven '+
       'las celdas al cambiar la forma, qué recorre realmente el axis y cómo filtra una máscara booleana.',
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
      btnGroup(ctr,[
        {label:'1 × 12',value:[1,12]},{label:'2 × 6',value:[2,6]},{label:'3 × 4',value:[3,4]},
        {label:'4 × 3',value:[4,3]},{label:'6 × 2',value:[6,2]},{label:'12 × 1',value:[12,1]},
        {label:'5 × 3 ✗',value:'bad'},
      ],pick);
      render(1,12);
      code.innerHTML='a = np.arange(1, 13)      # shape (12,)\na.reshape(<b>1, 12</b>)';
    }

    /* ---------- Tarjeta 2: axis ---------- */
    {
      const card=el('div',{class:'card'},
        el('h3',{html:'El famoso <code>axis</code>'}),
        el('p',{class:'note',html:'<b>axis = el eje que se colapsa.</b> Con <code>axis=0</code> la operación recorre '+
          'las filas (↓) y deja un resultado <b>por columna</b>; con <code>axis=1</code> recorre las columnas (→) '+
          'y deja un resultado <b>por fila</b>.'}));
      sec.append(card);
      const ctr=el('div');card.append(ctr);
      const wrap=el('div',{style:'overflow-x:auto'});card.append(wrap);
      const grid=new CellGrid(wrap);
      const code=codeBox(card);
      const M=[[2,7,1,8],[3,5,9,4],[6,0,2,5]];
      const nR=3,nC=4;
      let run=0;
      function defsBase(hlCol=-1,hlRow=-1){
        const d=[];
        M.forEach((row,r)=>row.forEach((v,c)=>{
          const hl=(c===hlCol||r===hlRow)?'hl':'';
          d.push({id:`m${r}_${c}`,text:v,r,c,cls:hl});
        }));
        return d;
      }
      function draw(d){grid.setCells(d);}
      draw(defsBase());
      code.textContent='M = np.array([[2,7,1,8],\n              [3,5,9,4],\n              [6,0,2,5]])';
      async function anim(mode){
        const t=++run;
        if(mode==='a0'){
          code.innerHTML='M.sum(<b>axis=0</b>)   # recorre las filas ↓ → un total por COLUMNA\n# array([11, 12, 12, 17])';
          const res=[];
          for(let c=0;c<nC;c++){
            if(t!==run)return;
            draw([...defsBase(c),...res]);
            await sleep(430); if(t!==run)return;
            res.push({id:'r'+c,text:M[0][c]+M[1][c]+M[2][c],r:nR+0.5,c,cls:'res'});
          }
          draw([...defsBase(),...res]);
        }else if(mode==='a1'){
          code.innerHTML='M.sum(<b>axis=1</b>)   # recorre las columnas → → un total por FILA\n# array([18, 21, 13])';
          const res=[];
          for(let r=0;r<nR;r++){
            if(t!==run)return;
            draw([...defsBase(-1,r),...res]);
            await sleep(430); if(t!==run)return;
            res.push({id:'r'+r,text:M[r].reduce((a,b)=>a+b),r,c:nC+0.5,cls:'res'});
          }
          draw([...defsBase(),...res]);
        }else{
          code.innerHTML='M.sum()          # sin axis: colapsa TODO\n# 52';
          draw(defsBase().map(d=>({...d,cls:'hl'})));
          await sleep(500); if(t!==run)return;
          draw([...defsBase(),{id:'tot',text:52,r:nR+0.5,c:(nC-1)/2,cls:'res'}]);
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
  }
});
