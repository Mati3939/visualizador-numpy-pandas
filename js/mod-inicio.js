'use strict';
/* Portada: el menú del curso es, como corresponde, un DataFrame */
(function(){

/* columnas = temas (módulos); filas = contenidos. null → NaN (no hay contenido ahí) */
const TEMAS=[
  {col:'NumPy',     mod:'numpy',    items:[['reshape',0],['axis',1],['máscaras',2],['broadcasting',3]]},
  {col:'DataFrames',mod:'df',       items:[['anatomía',0],['loc vs iloc',1]]},
  {col:'Nulos',     mod:'nulos',    items:[['matriz de nulos',0],['dropna',1],['fillna',2]]},
  {col:'Outliers',  mod:'outliers', items:[['boxplot',0],['IQR / z-score',0]]},
  {col:'Wrangling', mod:'wrangling',items:[['duplicados',0],['replace / map',1],['pd.cut',2],['sort_values',3]]},
  {col:'GroupBy',   mod:'groupby',  items:[['split-apply-combine',0],['pivot_table',1]]},
  {col:'Joins',     mod:'merge',    items:[['merge',0],["how='...'",0],['concat',1]]},
];
const NFILAS=Math.max(...TEMAS.map(t=>t.items.length));

registerModule({
  id:'inicio',
  title:'Visualizador TOPD',
  week:'portada',
  lead:'Aprende NumPy y Pandas viendo qué celda va a dónde. Y como corresponde, '+
       'el menú también es un DataFrame: haz clic en una celda para ir a ese contenido.',
  build(sec){
    const card=el('div',{class:'card menu-df'});
    sec.append(card);
    const mount=el('div');card.append(mount);
    const rows=[];
    for(let r=0;r<NFILAS;r++)rows.push(TEMAS.map(t=>t.items[r]?t.items[r][0]:null));
    const table=new DfTable(mount,{caption:'df_menu — elige una celda',
      columns:TEMAS.map(t=>t.col),index:[...Array(NFILAS).keys()],rows});
    const code=codeBox(card);
    code.textContent="df_menu.loc[?, ?]        # pasa el mouse por una celda…";

    function go(mod,cardIdx){
      activate(mod);
      setTimeout(()=>{
        const c=document.querySelectorAll('#mod-'+mod+' .card')[cardIdx];
        if(c)c.scrollIntoView({behavior:'smooth',block:'start'});
      },80);
    }
    TEMAS.forEach((t,c)=>{
      const head=table.headEls[c];
      head.style.setProperty('--hcol',`var(--s${c+1})`);
      table.cellEls.forEach(row=>row[c].style.setProperty('--hcol',`var(--s${c+1})`));
      head.onclick=()=>go(t.mod,0);
      head.onmouseenter=()=>{code.innerHTML=`df_menu[<b>'${t.col}'</b>]           # abre el módulo completo`;};
      t.items.forEach((it,r)=>{
        const cell=table.cell(r,c);
        cell.onclick=()=>go(t.mod,it[1]);
        cell.onmouseenter=()=>{code.innerHTML=`df_menu.loc[<b>${r}</b>, <b>'${t.col}'</b>]   # abre → ${it[0]}`;};
      });
    });
    /* las celdas NaN también enseñan algo */
    table.cellEls.forEach((row,r)=>row.forEach((cell,c)=>{
      if(cell._isnan)cell.onmouseenter=()=>{code.innerHTML=`df_menu.loc[<b>${r}</b>, <b>'${TEMAS[c].col}'</b>]   # NaN: ese tema no tiene más contenidos 😉`;};
    }));
    /* entrada escalonada */
    table.rowEls.forEach((r,i)=>r.style.animation=`fadein .45s ${.08+i*.09}s both`);

    card.append(el('p',{class:'note',html:'También puedes navegar con el teclado: <b>1–8</b> cambia de módulo, '+
      '<b>←/→</b> avanza las animaciones paso a paso. El botón <b>«🖥️ Presentar»</b> agranda todo para el proyector, '+
      'y cada módulo tiene un link directo (por ejemplo <code>#groupby</code>) para compartir un tema puntual.'}));
  }
});

})();
