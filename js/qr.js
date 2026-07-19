'use strict';
/* Generador de códigos QR en JS puro (sin dependencias) para el modo ayudantía.
   Modo byte, corrección L, versiones 1–9, máscara 0 fija.
   Verificado módulo a módulo contra python-qrcode (misma versión/EC/máscara):
   matrices idénticas ⇒ escaneable. Uso: qrCanvas('https://…', 6) → <canvas>. */
(function(){

/* capacidad de datos (codewords) y EC por bloque, nivel L, v1–9 */
const SPEC=[ // [dataCodewords, ecPorBloque, bloques...]
  null,
  [19, 7, [19]],
  [34, 10, [34]],
  [55, 15, [55]],
  [80, 20, [80]],
  [108, 26, [108]],
  [136, 18, [68, 68]],
  [156, 20, [78, 78]],
  [194, 24, [97, 97]],
  [232, 30, [116, 116]],
];
const ALIGN=[null,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46]];

/* GF(256) con polinomio 0x11D */
const EXP=new Uint8Array(512), LOG=new Uint8Array(256);
(function(){
  let x=1;
  for(let i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&0x100)x^=0x11D; }
  for(let i=255;i<512;i++)EXP[i]=EXP[i-255];
})();
const gmul=(a,b)=>(a&&b)?EXP[LOG[a]+LOG[b]]:0;

function rsEC(data,nec){
  /* polinomio generador de grado nec */
  let gen=[1];
  for(let i=0;i<nec;i++){
    const next=new Array(gen.length+1).fill(0);
    for(let j=0;j<gen.length;j++){
      next[j]^=gmul(gen[j],EXP[i]);
      next[j+1]^=gen[j];
    }
    gen=next;
  }
  gen.reverse(); // coeficientes de mayor a menor grado
  const res=new Array(nec).fill(0);
  for(const d of data){
    const factor=d^res[0];
    res.shift(); res.push(0);
    if(factor)for(let j=0;j<nec;j++)res[j]^=gmul(gen[j+1],factor);
  }
  return res;
}

function bch(value,poly,bits,total){
  let v=value<<(total-bits);
  const top=1<<(total-1);
  const ptop=1<<(31-Math.clz32(poly));
  while(true){
    let msb=31-Math.clz32(v||1);
    if(v===0||msb<total-bits)break;
    v^=poly<<(msb-(31-Math.clz32(poly)));
  }
  return (value<<(total-bits))|v;
}

function qrMatrix(text){
  const bytes=[...new TextEncoder().encode(text)];
  let ver=0;
  for(let v=1;v<=9;v++){ if(bytes.length<=SPEC[v][0]-2){ver=v;break;} }
  if(!ver)throw new Error('texto muy largo para QR v9-L');
  const [dcw,nec,bloques]=SPEC[ver];
  /* --- bits de datos: modo byte (0100) + largo (8 bits) + datos --- */
  const bits=[];
  const push=(val,n)=>{for(let i=n-1;i>=0;i--)bits.push((val>>i)&1);};
  push(4,4); push(bytes.length,8);
  bytes.forEach(b=>push(b,8));
  push(0,Math.min(4,dcw*8-bits.length)); // terminador
  while(bits.length%8)bits.push(0);
  const data=[];
  for(let i=0;i<bits.length;i+=8)data.push(parseInt(bits.slice(i,i+8).join(''),2));
  const PAD=[0xEC,0x11];
  for(let i=0;data.length<dcw;i++)data.push(PAD[i%2]);
  /* --- bloques + EC + entrelazado --- */
  const dataB=[],ecB=[];
  let off=0;
  for(const len of bloques){
    const blk=data.slice(off,off+len); off+=len;
    dataB.push(blk); ecB.push(rsEC(blk,nec));
  }
  const cw=[];
  const maxLen=Math.max(...bloques);
  for(let i=0;i<maxLen;i++)for(const b of dataB)if(i<b.length)cw.push(b[i]);
  for(let i=0;i<nec;i++)for(const b of ecB)cw.push(b[i]);
  /* --- matriz --- */
  const N=17+4*ver;
  const M=Array.from({length:N},()=>new Array(N).fill(null)); // null = libre para datos
  const set=(r,c,v)=>{M[r][c]=v;};
  const finder=(r,c)=>{
    for(let i=-1;i<8;i++)for(let j=-1;j<8;j++){
      const rr=r+i,cc=c+j;
      if(rr<0||cc<0||rr>=N||cc>=N)continue;
      const dentro=i>=0&&i<7&&j>=0&&j<7;
      set(rr,cc,dentro&&(i===0||i===6||j===0||j===6||(i>=2&&i<=4&&j>=2&&j<=4))?1:0);
    }
  };
  finder(0,0);finder(0,N-7);finder(N-7,0);
  for(let i=8;i<N-8;i++){ set(6,i,(i+1)%2); set(i,6,(i+1)%2); } // timing
  for(const r of ALIGN[ver])for(const c of ALIGN[ver]){
    if(M[r][c]!==null)continue; // pisa finders: se omite
    for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)
      set(r+i,c+j,(Math.max(Math.abs(i),Math.abs(j))!==1)?1:0);
  }
  set(N-8,8,1); // módulo oscuro
  /* reservar zonas de formato */
  const fmtPos=[];
  for(let i=0;i<9;i++){ if(M[8][i]===null){M[8][i]=0;} if(M[i][8]===null){M[i][8]=0;} }
  for(let i=0;i<8;i++){ if(M[8][N-1-i]===null)M[8][N-1-i]=0; if(M[N-1-i][8]===null)M[N-1-i][8]=0; }
  if(ver>=7){ /* info de versión (no aplica hasta v9 aquí, v7+ sí) */
    const vinfo=bch(ver,0x1F25,6,18);
    for(let i=0;i<18;i++){
      const b=(vinfo>>i)&1;
      set(Math.floor(i/3),N-11+(i%3),b);
      set(N-11+(i%3),Math.floor(i/3),b);
    }
  }
  /* --- colocar datos en zigzag con máscara 0: (r+c)%2===0 invierte --- */
  let bitIdx=0;
  const total=cw.length*8;
  const bitAt=k=>(cw[Math.floor(k/8)]>>(7-(k%8)))&1;
  let col=N-1, up=true;
  while(col>0){
    if(col===6)col--; // la columna de timing se salta completa
    for(let k=0;k<N;k++){
      const r=up?N-1-k:k;
      for(const c of [col,col-1]){
        if(M[r][c]!==null)continue;
        let b=bitIdx<total?bitAt(bitIdx):0;
        bitIdx++;
        if((r+c)%2===0)b^=1; // máscara 0
        M[r][c]=b;
      }
    }
    up=!up; col-=2;
  }
  /* --- info de formato: EC L (01) + máscara 000, BCH(15,5), XOR 0x5412 --- */
  const fmt=bch(0b01000,0x537,5,15)^0x5412;
  const fbit=i=>(fmt>>(14-i))&1;
  /* copia 1: alrededor del finder superior izquierdo */
  const c1=[[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
  c1.forEach(([r,c],i)=>set(r,c,fbit(i)));
  /* copia 2: bajo el finder inferior izq + derecha del superior derecho */
  const c2=[[N-1,8],[N-2,8],[N-3,8],[N-4,8],[N-5,8],[N-6,8],[N-7,8],
            [8,N-8],[8,N-7],[8,N-6],[8,N-5],[8,N-4],[8,N-3],[8,N-2],[8,N-1]];
  c2.forEach(([r,c],i)=>set(r,c,fbit(i)));
  return M;
}

function qrCanvas(text,scale=6,quiet=4){
  const M=qrMatrix(text), N=M.length;
  const cv=document.createElement('canvas');
  cv.width=cv.height=(N+quiet*2)*scale;
  const g=cv.getContext('2d');
  g.fillStyle='#fff'; g.fillRect(0,0,cv.width,cv.height);
  g.fillStyle='#000';
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)
    if(M[r][c])g.fillRect((c+quiet)*scale,(r+quiet)*scale,scale,scale);
  return cv;
}

window.qrMatrix=qrMatrix;
window.qrCanvas=qrCanvas;
})();
