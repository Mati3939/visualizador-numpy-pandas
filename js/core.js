'use strict';
/* =====================================================================
   Núcleo del Visualizador TOPD
   API para módulos:
     registerModule({id, title, lead, build(section)})
     el(tag, attrs, ...hijos)  $(sel)  fmt(x)  sleep(ms)
     CellGrid(mount)           — rejilla de celdas animadas (arrays NumPy)
     DfTable(mount, opts)      — tabla estilo DataFrame (divs animables)
     Stepper(mount, steps, reset) — animación paso a paso (← → en teclado)
     flipRows(container, mutate)  — anima reordenación de filas
     codeBox(mount)  btnGroup(mount, items, onpick)
   Convenciones CSS: ver css/app.css (.cell .hl .ok .res .off …, .dfc .nan …)
   ===================================================================== */
const $=(s,r=document)=>r.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function el(tag,attrs={},...kids){
  const n=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class')n.className=v;
    else if(k==='html')n.innerHTML=v;
    else if(k.startsWith('on'))n.addEventListener(k.slice(2),v);
    else if(k==='style')n.style.cssText=v;
    else n.setAttribute(k,v);
  }
  for(const k of kids.flat(9)){ if(k==null)continue; n.append(k.nodeType?k:document.createTextNode(k)); }
  return n;
}
const fmt=x=>(typeof x==='number'&&!Number.isInteger(x))?x.toFixed(1).replace('.',','):String(x);
const RELAYOUT=[];
function cellMetrics(){
  const cs=getComputedStyle(document.documentElement);
  return {size:parseFloat(cs.getPropertyValue('--cell')), gap:parseFloat(cs.getPropertyValue('--cellgap'))};
}

/* Rejilla de celdas con posiciones (fila, col) animadas por transform */
class CellGrid{
  constructor(mount){
    this.stage=el('div',{class:'stage'});
    mount.append(this.stage);
    this.cells=new Map();
    RELAYOUT.push(()=>this.layout());
  }
  /* defs: [{id, text, r, c, cls, w}] — w = ancho en unidades de celda */
  setCells(defs){
    const seen=new Set();
    for(const d of defs){
      seen.add(d.id);
      let c=this.cells.get(d.id);
      if(!c){
        c=el('div',{class:'cell'});
        c._new=true; // se posiciona sin transición: no debe "volar" desde (0,0)
        this.stage.append(c); this.cells.set(d.id,c);
      }
      c.textContent=d.text;
      c.className='cell '+(d.cls||'');
      c._pos=[d.r,d.c,d.w||1];
    }
    for(const [id,c] of [...this.cells]){ if(!seen.has(id)){ c.remove(); this.cells.delete(id); } }
    this.layout();
  }
  patch(id,{text,cls}={}){
    const c=this.cells.get(id); if(!c)return;
    if(text!==undefined)c.textContent=text;
    if(cls!==undefined)c.className='cell '+cls;
  }
  layout(){
    if(!this.stage.isConnected)return; // visuales de ejercicios ya descartados
    const {size,gap}=cellMetrics(); let mr=0, mc=0;
    for(const c of this.cells.values()){
      const [r,cc,w]=c._pos;
      if(c._new){ c.style.transition='none'; }
      c.style.width=(size*w+gap*(w-1))+'px'; c.style.height=size+'px';
      c.style.transform=`translate(${cc*(size+gap)}px,${r*(size+gap)}px)`;
      if(c._new){ c._new=false; void c.offsetWidth; requestAnimationFrame(()=>{c.style.transition='';}); }
      mr=Math.max(mr,r+1); mc=Math.max(mc,cc+w);
    }
    this.stage.style.height=(mr*(size+gap)-gap)+'px';
    this.stage.style.width=(mc*(size+gap)-gap)+'px';
  }
  shake(){ this.stage.classList.remove('shake'); void this.stage.offsetWidth; this.stage.classList.add('shake'); }
}

/* Tabla estilo DataFrame construida con divs (permite animar filas) */
class DfTable{
  /* opts: {columns:[...], index:[...], rows:[[...]], caption}
     null en una celda se muestra como NaN (clase .nan) */
  constructor(mount,opts){
    this.o=opts;
    this.wrap=el('div',{class:'dfwrap'});
    if(opts.caption)this.wrap.append(el('div',{class:'note',style:'font-weight:600;margin-bottom:.25rem'},opts.caption));
    this.root=el('div',{class:'df'});
    this.wrap.append(this.root); mount.append(this.wrap);
    this.render();
    /* si el texto de alguna celda cambia (fillna, pd.cut, …), realinear columnas */
    this._mo=new MutationObserver(()=>{
      if(this._raf)return;
      this._raf=requestAnimationFrame(()=>{this._raf=0; this._align();});
    });
    this._mo.observe(this.root,{childList:true,characterData:true,subtree:true});
    RELAYOUT.push(()=>this._align());
  }
  /* columnas uniformes tipo planilla: todas las filas comparten el ancho máximo de cada columna */
  _align(){
    if(!this.root.isConnected||this.root.offsetParent===null)return;
    const rows=[...this.root.children];
    if(!rows.length)return;
    const n=this.o.columns.length+1;
    rows.forEach(r=>r.style.gridTemplateColumns=`repeat(${n}, max-content)`);
    const w=Array(n).fill(0);
    rows.forEach(r=>[...r.children].forEach((c,i)=>{w[i]=Math.max(w[i],c.getBoundingClientRect().width);}));
    const tpl=w.map(x=>Math.ceil(x)+'px').join(' ');
    rows.forEach(r=>r.style.gridTemplateColumns=tpl);
  }
  render(){
    const {columns,index,rows}=this.o;
    this.root.textContent='';
    const tpl=`repeat(${columns.length+1}, max-content)`;
    const hr=el('div',{class:'dfrow',style:`grid-template-columns:${tpl}`},
      el('div',{class:'dfc i'},''), columns.map(c=>el('div',{class:'dfc h'},c)));
    this.root.append(hr);
    this.rowEls=[]; this.cellEls=[]; this._raf=0;
    rows.forEach((row,ri)=>{
      const cells=row.map(v=>{
        const d=el('div',{class:'dfc'+(v===null?' nan':'')}, v===null?'NaN':fmt(v));
        d._isnan=(v===null); return d;
      });
      const idx=el('div',{class:'dfc i'}, String(index[ri]));
      const r=el('div',{class:'dfrow',style:`grid-template-columns:${tpl}`}, idx, cells);
      this.root.append(r); this.rowEls.push(r); this.cellEls.push(cells); r._idx=idx;
    });
    this.headEls=[...hr.children].slice(1);
    this._align();
  }
  cell(r,c){return this.cellEls[r][c];}
  clearMarks(){
    this.rowEls.forEach(r=>r.classList.remove('roff'));
    this.cellEls.flat().forEach(c=>{ c.className='dfc'+(c._isnan?' nan':''); });
    this.headEls.forEach(h=>h.className='dfc h');
    this.rowEls.forEach(r=>r._idx.className='dfc i');
  }
}
/* FLIP: anima la reordenación vertical de las filas de un contenedor */
function flipRows(container,mutate){
  const els=[...container.children];
  const first=new Map(els.map(e=>[e,e.getBoundingClientRect().top]));
  mutate();
  const after=[...container.children];
  after.forEach(e=>{
    if(!first.has(e))return;
    const d=first.get(e)-e.getBoundingClientRect().top;
    if(Math.abs(d)<1)return;
    e.style.transition='none'; e.style.transform=`translateY(${d}px)`;
    requestAnimationFrame(()=>{ e.style.transition='transform .55s cubic-bezier(.4,0,.2,1)'; e.style.transform=''; });
  });
}

/* Paso a paso con botones y teclado */
let ACTIVE_STEPPER=null;
const STEPPERS_BY_MOD={};
class Stepper{
  /* steps: [{d:descripción html, run:async fn(esUltimo)}] ; reset: fn estado inicial
     modId: registra el stepper para las flechas del teclado en ese módulo */
  constructor(mount,steps,reset,modId){
    this.steps=steps; this.reset=reset; this.i=-1; this._run=0;
    this.cnt=el('span',{class:'cnt'},'inicio');
    this.desc=el('div',{class:'stepdesc',html:'Presiona <b>▶ Siguiente</b> para avanzar paso a paso.'});
    const bPrev=el('button',{class:'btn',onclick:()=>this.go(this.i-1)},'◀ Anterior');
    const bNext=el('button',{class:'btn primary',onclick:()=>this.go(this.i+1)},'▶ Siguiente');
    const bRe=el('button',{class:'btn',onclick:()=>this.go(-1)},'⟲ Reiniciar');
    const bar=el('div',{class:'stepper',onclick:()=>ACTIVE_STEPPER=this},bPrev,bNext,bRe,this.cnt);
    mount.append(bar,this.desc);
    if(modId)(STEPPERS_BY_MOD[modId]=STEPPERS_BY_MOD[modId]||[]).push(this);
  }
  async go(i){
    if(i<-1||i>=this.steps.length)return;
    ACTIVE_STEPPER=this;
    const tok=++this._run;
    this.i=i;
    if(i===-1){ this.reset(); this.cnt.textContent='inicio';
      this.desc.innerHTML='Presiona <b>▶ Siguiente</b> para avanzar paso a paso.'; return; }
    this.reset();
    this.cnt.textContent=`paso ${i+1}/${this.steps.length}`;
    this.desc.innerHTML=this.steps[i].d;
    for(let k=0;k<=i;k++){
      if(this._run!==tok)return; // otro clic interrumpió esta corrida
      await this.steps[k].run(k===i);
    }
  }
}

/* ================= app shell ================= */
const MODULES=[];   // {id, title, lead, build(section)} — nav principal, teclas 1-9
const EXERCISES=[]; // ídem, pero viven en el menú «Ejercicios» (estudio sin ruido)
function registerModule(m){MODULES.push(m);}
function registerExercise(m){EXERCISES.push(m);}
const allSections=()=>MODULES.concat(EXERCISES);

/* Estado en la URL: #merge?how=outer — compartible por WhatsApp.
   hashId() da el id sin parámetros; hashParams() el objeto {k:v};
   setHashParams(obj) los escribe sin recargar ni re-activar. */
const hashId=()=>decodeURIComponent(location.hash.slice(1).split('?')[0]);
function hashParams(){
  const q=location.hash.split('?')[1]||'';
  return Object.fromEntries(new URLSearchParams(q));
}
function setHashParams(obj){
  const clean=Object.fromEntries(Object.entries(obj).filter(([,v])=>v!=null&&v!==''));
  const q=new URLSearchParams(clean).toString();
  history.replaceState(null,'','#'+hashId()+(q?'?'+q:''));
}

function buildShell(){
  const nav=$('#nav'), main=$('#main');
  if(!MODULES.length)return;
  const mkSection=m=>{
    const sec=el('section',{class:'module',id:'mod-'+m.id},
      el('h2',{},m.title),
      el('p',{class:'lead'},m.lead||''));
    main.append(sec);
    m._built=false; m._sec=sec;
  };
  MODULES.forEach((m,i)=>{
    const b=el('button',{onclick:()=>activate(m.id)},`${i+1}. ${m.title}`);
    b.dataset.mod=m.id; nav.append(b);
    mkSection(m);
  });
  EXERCISES.forEach(mkSection);
  buildExMenu();
  /* #id en la URL abre ese módulo directamente (link compartible por tema) */
  const wanted=hashId();
  activate(allSections().some(m=>m.id===wanted)?wanted:MODULES[0].id);
  window.addEventListener('hashchange',()=>{
    const id=hashId();
    if(allSections().some(m=>m.id===id)&&!document.getElementById('mod-'+id).classList.contains('active'))
      activate(id);
  });
}

/* Menú «Ejercicios»: botón en el header que despliega las secciones de práctica.
   Escondido a propósito: la app se estudia limpia y los ejercicios aparecen al clic. */
function buildExMenu(){
  if(!EXERCISES.length)return;
  const btn=el('button',{id:'btnEx',title:'Ejercicios y práctica'},'🎯 Ejercicios');
  const panel=el('div',{id:'exmenu',class:'exmenu'});
  EXERCISES.forEach(m=>{
    panel.append(el('button',{class:'exitem',onclick:()=>{close(); activate(m.id);}},
      el('b',{},m.title), el('span',{},m.lead||'')));
  });
  const close=()=>{panel.classList.remove('open'); btn.classList.remove('on');};
  btn.onclick=e=>{e.stopPropagation(); panel.classList.toggle('open'); btn.classList.toggle('on');};
  document.addEventListener('click',e=>{ if(!panel.contains(e.target))close(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape')close(); });
  const hdr=$('.hdrbtns'); hdr.prepend(btn);
  document.querySelector('header').append(panel);
}

function activate(id){
  document.querySelectorAll('.module').forEach(s=>s.classList.toggle('active',s.id==='mod-'+id));
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.mod===id));
  const isEx=EXERCISES.some(m=>m.id===id);
  const bEx=$('#btnEx'); if(bEx)bEx.classList.toggle('active-ex',isEx);
  /* en móvil el nav scrollea horizontal: dejar visible la pestaña activa */
  const on=document.querySelector('#nav button.on');
  if(on)on.scrollIntoView({inline:'center',block:'nearest'});
  const m=allSections().find(x=>x.id===id);
  const keep=(hashId()===id); // conservar ?params si ya estábamos en este módulo
  if(!keep)history.replaceState(null,'','#'+id);
  if(!m._built){ m.build(m._sec); m._built=true; }
  /* siempre re-layout: el módulo pudo construirse oculto o cambió la tipografía */
  RELAYOUT.forEach(f=>f());
  ACTIVE_STEPPER=(STEPPERS_BY_MOD[id]||[null])[0];
  window.scrollTo({top:0});
}

/* Diff de DataFrames estilo git: filas eliminadas en rojo tachado, filas/columnas
   nuevas en azul, celdas cambiadas (imputadas, reemplazadas…) en verde.
   before/after: {columns, index, rows} como DfTable. Devuelve la DfTable. */
function dfDiff(mount,before,after,caption){
  const cols=[...before.columns, ...after.columns.filter(c=>!before.columns.includes(c))];
  const index=[...before.index, ...after.index.filter(i=>!before.index.includes(i))];
  const get=(o,ix,c)=>{
    const r=o.index.indexOf(ix), k=o.columns.indexOf(c);
    return (r<0||k<0)?undefined:o.rows[r][k];
  };
  const rows=index.map(ix=>cols.map(c=>{
    const av=get(after,ix,c);
    return av!==undefined?av:(get(before,ix,c)??null);
  }));
  const t=new DfTable(mount,{columns:cols,index,rows,caption});
  index.forEach((ix,r)=>{
    const inA=after.index.includes(ix), inB=before.index.includes(ix);
    cols.forEach((c,ci)=>{
      const cell=t.cell(r,ci);
      const av=get(after,ix,c), bv=get(before,ix,c);
      if(!inA||!after.columns.includes(c))cell.classList.add('ddel');
      else if(!inB||!before.columns.includes(c))cell.classList.add('dnew');
      else if(av!==bv)cell.classList.add('dchg');
    });
    if(!inA)t.rowEls[r]._idx.classList.add('ddel');
    else if(!inB)t.rowEls[r]._idx.classList.add('dnew');
  });
  t.headEls.forEach((h,ci)=>{
    const c=cols[ci];
    if(!after.columns.includes(c))h.classList.add('ddel');
    else if(!before.columns.includes(c))h.classList.add('dnew');
  });
  return t;
}
/* helpers UI */
function codeBox(mount){const c=el('pre',{class:'code'});mount.append(c);return c;}
function btnGroup(mount,items,onpick,activeFirst=true){
  /* items: [{label,value}] — botones excluyentes; devuelve los botones */
  const wrap=el('div',{class:'controls'});
  const btns=items.map((it,i)=>el('button',{class:'btn'+((activeFirst&&i===0)?' on':''),onclick:()=>{
    btns.forEach(b=>b.classList.remove('on')); btns[i].classList.add('on'); onpick(it.value);
  }},it.label));
  wrap.append(...btns); mount.append(wrap); return btns;
}

/* tema, presentación y teclado */
document.addEventListener('DOMContentLoaded',()=>{
  const btnTheme=$('#btnTheme'), btnPres=$('#btnPres');
  const THEMES=[['','🌗 Auto'],['light','☀️ Claro'],['dark','🌙 Oscuro']];
  let themeIdx=0;
  btnTheme.onclick=()=>{
    themeIdx=(themeIdx+1)%3;
    const [v,label]=THEMES[themeIdx];
    if(v)document.documentElement.dataset.theme=v; else delete document.documentElement.dataset.theme;
    btnTheme.textContent=label;
  };
  btnPres.onclick=()=>{
    const on=document.documentElement.classList.toggle('presenta');
    btnPres.textContent=on?'🖥️ Normal':'🖥️ Presentar';
    RELAYOUT.forEach(f=>f());
  };
  document.addEventListener('keydown',e=>{
    if(e.target.matches('input,select,textarea'))return;
    if(e.key==='ArrowRight'&&ACTIVE_STEPPER){ACTIVE_STEPPER.go(ACTIVE_STEPPER.i+1);e.preventDefault();}
    else if(e.key==='ArrowLeft'&&ACTIVE_STEPPER){ACTIVE_STEPPER.go(ACTIVE_STEPPER.i-1);e.preventDefault();}
    else if(/^[0-9]$/.test(e.key)){const m=MODULES[e.key==='0'?9:+e.key-1]; if(m)activate(m.id);}
  });
  buildShell();
});
