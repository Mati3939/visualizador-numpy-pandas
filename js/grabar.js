'use strict';
/* Grabar animaciones (idea 13): captura la pestaña con getDisplayMedia +
   MediaRecorder y descarga un .webm — listo para Canvas o para convertir a GIF.
   Sin dependencias; el botón solo aparece si el navegador lo soporta. */
(function(){
  function init(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia||!window.MediaRecorder)return;
    const hdr=document.querySelector('.hdrbtns');
    if(!hdr)return;
    const btn=el('button',{id:'btnRec',
      title:'Graba la pantalla mientras corres una animación y descarga un .webm '+
            '(sirve para slides, Canvas o convertir a GIF)'},'🎥 Grabar');
    hdr.append(btn);
    let rec=null;

    async function start(){
      let stream;
      try{
        stream=await navigator.mediaDevices.getDisplayMedia({
          video:{frameRate:30},
          audio:false,
          /* sugerir "esta pestaña" en el diálogo de Chrome/Edge */
          preferCurrentTab:true,selfBrowserSurface:'include'});
      }catch(_){return;/* canceló el diálogo */}
      const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ?'video/webm;codecs=vp9':'video/webm';
      const chunks=[];
      rec=new MediaRecorder(stream,{mimeType:mime});
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      rec.onstop=()=>{
        stream.getTracks().forEach(t=>t.stop());
        const blob=new Blob(chunks,{type:'video/webm'});
        const mod=hashId()||'animacion';
        const a=el('a',{href:URL.createObjectURL(blob),
          download:`visualizador-${mod}-${new Date().toISOString().slice(0,10)}.webm`});
        document.body.append(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(a.href),5000);
        rec=null;btn.textContent='🎥 Grabar';btn.classList.remove('rec-on');
      };
      /* si el usuario corta la compartición desde la barra del navegador */
      stream.getVideoTracks()[0].addEventListener('ended',()=>{if(rec&&rec.state!=='inactive')rec.stop();});
      rec.start();
      btn.textContent='⏹ Detener';btn.classList.add('rec-on');
    }
    btn.onclick=()=>{ if(rec&&rec.state!=='inactive')rec.stop(); else start(); };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
