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
const MODULES=[]; // {id, title, lead, build(section)}
function registerModule(m){MODULES.push(m);}

function buildShell(){
  const nav=$('#nav'), main=$('#main');
  if(!MODULES.length)return;
  MODULES.forEach((m,i)=>{
    const b=el('button',{onclick:()=>activate(m.id)},`${i+1}. ${m.title}`);
    b.dataset.mod=m.id; nav.append(b);
    const sec=el('section',{class:'module',id:'mod-'+m.id},
      el('h2',{},m.title),
      el('p',{class:'lead'},m.lead||''));
    main.append(sec);
    m._built=false; m._sec=sec;
  });
  /* #id en la URL abre ese módulo directamente (link compartible por tema) */
  const wanted=location.hash.slice(1);
  activate(MODULES.some(m=>m.id===wanted)?wanted:MODULES[0].id);
  window.addEventListener('hashchange',()=>{
    const id=location.hash.slice(1);
    if(MODULES.some(m=>m.id===id))activate(id);
  });
}
function activate(id){
  document.querySelectorAll('.module').forEach(s=>s.classList.toggle('active',s.id==='mod-'+id));
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.mod===id));
  /* en móvil el nav scrollea horizontal: dejar visible la pestaña activa */
  const on=document.querySelector('#nav button.on');
  if(on)on.scrollIntoView({inline:'center',block:'nearest'});
  const m=MODULES.find(x=>x.id===id);
  if(!m._built){ m.build(m._sec); m._built=true; }
  /* siempre re-layout: el módulo pudo construirse oculto o cambió la tipografía */
  RELAYOUT.forEach(f=>f());
  ACTIVE_STEPPER=(STEPPERS_BY_MOD[id]||[null])[0];
  if(location.hash!=='#'+id)history.replaceState(null,'','#'+id);
  window.scrollTo({top:0});
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
    else if(/^[1-9]$/.test(e.key)){const m=MODULES[+e.key-1]; if(m)activate(m.id);}
  });
  buildShell();
});
