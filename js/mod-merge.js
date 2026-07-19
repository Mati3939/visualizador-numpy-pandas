'use strict';
/* Módulo: Joins y concatenación — merge con llaves conectadas, Venn y concat */
registerModule({
  id:'merge',
  title:'Joins y concat',
  lead:'merge une dos tablas emparejando filas por una llave común. El parámetro how decide '+
       'qué pasa con las filas que no encuentran pareja.',
  build(sec){
    const NS='http://www.w3.org/2000/svg';
    const s=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);
      for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};

    /* ---------- Tarjeta 1: merge ---------- */
    {
      /* inspirado en estudiantes.csv / carreras.csv de la Semana 12 */
      const EST=[['Valentina',10],['Matías',20],['Camila',10],['Joaquín',30],['Antonia',99]];
      const CAR=[[10,'ICI'],[20,'IECI'],[30,'IIND'],[40,'Arquitectura']];
      const KEYCLS={10:'g0',20:'g1',30:'g2'};
      const KEYCOL={10:'var(--s1)',20:'var(--s2)',30:'var(--s3)'};
      const MATCH=[['Valentina',10,'ICI'],['Matías',20,'IECI'],['Camila',10,'ICI'],['Joaquín',30,'IIND']];
      const LEFTONLY=[['Antonia',99,null]], RIGHTONLY=[[null,40,'Arquitectura']];

      const card=el('div',{class:'card'},
        el('h3',{html:'<code>merge</code>: unir por una llave'}),
        el('p',{class:'note',html:'Cada línea conecta una llave <code>id_carrera</code> que existe en ambas tablas. '+
          'Antonia (99) y Arquitectura (40) <b>no tienen pareja</b>: su destino depende de <code>how</code>.'}));
      sec.append(card);

      const ctr=el('div');card.append(ctr);
      const holder=el('div',{style:'position:relative'});card.append(holder);
      const cols=el('div',{class:'flexcols',style:'gap:4.5rem'});holder.append(cols);
      const dEst=el('div'),dCar=el('div');cols.append(dEst,dCar);
      const tEst=new DfTable(dEst,{caption:'estudiantes',columns:['nombre','id_carrera'],index:[0,1,2,3,4],rows:EST});
      const tCar=new DfTable(dCar,{caption:'carreras',columns:['id_carrera','carrera'],index:[0,1,2,3],rows:CAR});
      const overlay=s('svg',{style:'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'});
      holder.append(overlay);
      const venn=s('svg',{viewBox:'0 0 150 90',style:'width:130px;display:block'});
      const vennWrap=el('div',{class:'controls'},venn,el('span',{class:'msg',id:'mergemsg'}));
      card.append(vennWrap);
      const resMount=el('div');card.append(resMount);
      const code=codeBox(card);
      card.append(el('p',{class:'note',html:'Ojo con las llaves repetidas: Camila y Valentina comparten la carrera 10, '+
        'y ambas encuentran pareja — un join puede <b>duplicar</b> información del lado derecho (ICI aparece dos veces). '+
        'Si ambos lados tienen la llave repetida, el resultado crece multiplicativamente.'}));

      let how='inner';
      function markKeys(){
        tEst.clearMarks();tCar.clearMarks();
        EST.forEach((r,ri)=>{const k=r[1];
          tEst.cell(ri,1).classList.add(KEYCLS[k]||'hl');});
        CAR.forEach((r,ri)=>{const k=r[0];
          tCar.cell(ri,0).classList.add(KEYCLS[k]||'hl');});
        /* filas que este how descarta */
        if(how==='inner'||how==='right')tEst.rowEls[4].classList.add('roff');
        if(how==='inner'||how==='left')tCar.rowEls[3].classList.add('roff');
      }
      function drawLinks(){
        overlay.textContent='';
        const base=holder.getBoundingClientRect();
        EST.forEach((re,ri)=>{
          CAR.forEach((rc,ci)=>{
            if(re[1]!==rc[0])return;
            const a=tEst.cell(ri,1).getBoundingClientRect();
            const b=tCar.cell(ci,0).getBoundingClientRect();
            const x1=a.right-base.left, y1=a.top+a.height/2-base.top;
            const x2=b.left-base.left,  y2=b.top+b.height/2-base.top;
            if(x2<=x1)return; // layout apilado (pantalla angosta): no dibujar
            const mx=(x1+x2)/2;
            overlay.append(s('path',{d:`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`,
              fill:'none',stroke:KEYCOL[re[1]],'stroke-width':2,'stroke-opacity':.75}));
          });
        });
      }
      function drawVenn(){
        venn.textContent='';
        const defs=s('defs');
        const clip=s('clipPath',{id:'vclip'});clip.append(s('circle',{cx:95,cy:45,r:32}));
        defs.append(clip);venn.append(defs);
        const fill='color-mix(in srgb, var(--s1) 45%, transparent)';
        const none='transparent';
        const L=s('circle',{cx:55,cy:45,r:32,fill:(how==='left'||how==='outer')?fill:none,stroke:'var(--muted)'});
        const R=s('circle',{cx:95,cy:45,r:32,fill:(how==='right'||how==='outer')?fill:none,stroke:'var(--muted)'});
        const inter=s('circle',{cx:55,cy:45,r:32,fill:fill,'clip-path':'url(#vclip)'});
        venn.append(L,R,inter);
        const t1=s('text',{x:38,y:48,'text-anchor':'middle'});t1.textContent='izq';
        const t2=s('text',{x:112,y:48,'text-anchor':'middle'});t2.textContent='der';
        venn.append(t1,t2);
      }
      function render(){
        markKeys();drawVenn();
        let rows=[...MATCH];
        if(how==='left')rows=[...MATCH,...LEFTONLY];
        if(how==='right')rows=[...MATCH,...RIGHTONLY];
        if(how==='outer')rows=[...MATCH,...LEFTONLY,...RIGHTONLY];
        resMount.textContent='';
        const t=new DfTable(resMount,{caption:`resultado — how='${how}' (${rows.length} filas)`,
          columns:['nombre','id_carrera','carrera'],index:[...rows.keys()],rows});
        rows.forEach((r,ri)=>{const k=r[1];
          t.cell(ri,1).classList.add(KEYCLS[k]||'hl');});
        $('#mergemsg').innerHTML={
          inner:'<b>inner</b>: solo las filas con pareja en ambas tablas. Antonia y Arquitectura quedan fuera.',
          left:'<b>left</b>: todas las filas de la izquierda. Antonia entra, pero su carrera es <b>NaN</b>.',
          right:'<b>right</b>: todas las filas de la derecha. Arquitectura entra sin estudiante (nombre NaN).',
          outer:'<b>outer</b>: todo el mundo entra; lo que no calza se rellena con NaN.',
        }[how];
        code.innerHTML=`pd.merge(estudiantes, carreras,\n         on='id_carrera', how=<b>'${how}'</b>)   # ${rows.length} filas`;
        requestAnimationFrame(drawLinks);
      }
      const HOWS=['inner','left','right','outer'];
      /* #merge?how=outer abre directo con ese how (link compartible) */
      if(HOWS.includes(hashParams().how))how=hashParams().how;
      const howBtns=btnGroup(ctr,HOWS.map(h=>({label:h,value:h})),
        v=>{how=v;setHashParams({how:v});render();},false);
      howBtns[HOWS.indexOf(how)].classList.add('on');
      window.addEventListener('resize',drawLinks);
      RELAYOUT.push(drawLinks);
      render();
    }

    /* ---------- Tarjeta 2: concat ---------- */
    {
      const MAR=[['Café',2500],['Té',1800]], ABR=[['Jugo',2200],['Café',2600]];
      const STK=[[12],[8]];
      const card=el('div',{class:'card'},
        el('h3',{html:'<code>pd.concat</code>: apilar tablas'}),
        el('p',{class:'note',html:'concat no empareja nada: simplemente <b>apila</b>. Con <code>axis=0</code> apila filas '+
          '(¡y los índices se repiten si no usas <code>ignore_index=True</code>!); con <code>axis=1</code> pega columnas '+
          'alineando por índice.'}));
      sec.append(card);
      const ctr=el('div',{class:'controls'});card.append(ctr);
      const selAx=el('select',{},el('option',{value:'0'},'axis=0 (apilar filas)'),el('option',{value:'1'},'axis=1 (pegar columnas)'));
      const chk=el('input',{type:'checkbox',id:'igidx'});
      const chkLab=el('label',{for:'igidx'},chk,' ignore_index=True');
      ctr.append(selAx,chkLab);
      const cols=el('div',{class:'flexcols'});card.append(cols);
      const dA=el('div'),dB=el('div'),dR=el('div');cols.append(dA,dB,dR);
      const code=codeBox(card);
      function render(){
        dA.textContent='';dB.textContent='';dR.textContent='';
        const ax=selAx.value, ig=chk.checked;
        chkLab.style.display=ax==='0'?'':'none';
        const tA=new DfTable(dA,{caption:'ventas_marzo',columns:['producto','monto'],index:[0,1],rows:MAR});
        let tB,tR;
        if(ax==='0'){
          tB=new DfTable(dB,{caption:'ventas_abril',columns:['producto','monto'],index:[0,1],rows:ABR});
          const idx=ig?[0,1,2,3]:[0,1,0,1];
          tR=new DfTable(dR,{caption:'pd.concat([marzo, abril])',columns:['producto','monto'],
            index:idx,rows:[...MAR,...ABR]});
          [0,1].forEach(ri=>tR.rowEls[ri].querySelectorAll('.dfc:not(.i)').forEach(c=>c.classList.add('g0')));
          [2,3].forEach(ri=>tR.rowEls[ri].querySelectorAll('.dfc:not(.i)').forEach(c=>c.classList.add('g1')));
          if(!ig)[2,3].forEach(ri=>tR.rowEls[ri]._idx.classList.add('hl'));
          code.innerHTML=`pd.concat([ventas_marzo, ventas_abril]${ig?', <b>ignore_index=True</b>':''})`+
            (ig?'':'\n# ⚠️ índice repetido: 0, 1, 0, 1 — df.loc[0] devolvería DOS filas');
        }else{
          tB=new DfTable(dB,{caption:'stock',columns:['stock'],index:[0,1],rows:STK});
          tR=new DfTable(dR,{caption:'pd.concat([...], axis=1)',columns:['producto','monto','stock'],
            index:[0,1],rows:MAR.map((r,i)=>[...r,...STK[i]])});
          tR.cellEls.forEach(row=>{row[0].classList.add('g0');row[1].classList.add('g0');row[2].classList.add('g1');});
          code.innerHTML=`pd.concat([ventas_marzo, stock], <b>axis=1</b>)   # alinea por índice`;
        }
        tA.cellEls.forEach(row=>row.forEach(c=>c.classList.add('g0')));
        tB.cellEls.forEach(row=>row.forEach(c=>c.classList.add('g1')));
      }
      selAx.onchange=render;chk.onchange=render;
      render();
    }
  }
});
