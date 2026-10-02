/* ═══ اختبار اتّجاه الأقواس — ورشة W1 ═══
   القوسُ ذو الاجتياح السالب يُرسم بقصره لا بطريقه الطويل عبر
   SVG وDXF وPDF، ويُقاس صندوقُه عبر primsBBox — وكلٌّ يلتقي مع
   قاعدة القماش: ccw = (a1 < a0) (مطوَّقة في ui/canvas.js بتمرير
   الوسيط السادس ctx.arc صراحةً).

   التشغيل:  node js/tests/arc-direction.test.js
*/
import {shim,shimCanvas,group,ok,eq,near,summary} from "./harness.js";
shim(); shimCanvas();
const {newState}=await import("../core/state.js");
const {primsBBox}=await import("../core/render.js");
const {toSVG}=await import("../io/svg.js");
const {toDXF}=await import("../io/dxf.js");
const {toPDF}=await import("../io/pdf.js");

const box={x0:-2000,y0:-2000,x1:2000,y1:2000};
const mk=(a0,a1)=>({t:"arc",L:"0",cx:0,cy:0,r:1000,a0,a1});
const near0=(v,e)=>Math.abs(v-e)<=1;
const dec=new TextDecoder();

function dxfEntity(s,type){
 const lines=s.split("\n");
 for(let i=0;i<lines.length;i++){
  if(lines[i].trim()!=="0"||(lines[i+1]||"").trim()!==type)continue;
  const p={};
  for(let j=i+2;j<lines.length;j++){
   const code=lines[j].trim();
   if(code==="0")break;
   p[code]=(lines[j+1]||"").trim();
   j++;
  }
  return p;
 }
 return null;
}

/* big من قَدْر الاجتياح، sweep من علامته — كما في العقد المتّفق عليه */
const CASES=[
 {id:"ccw-90",    a0:0,a1:90,   n:1, big:0,sweep:0, dxf:[0,90],
  bb:[0,0,1000,1000]},
 {id:"cw-90",     a0:0,a1:-90,  n:1, big:0,sweep:1, dxf:[-90,0],
  bb:[0,-1000,1000,0]},
 {id:"ccw-270",   a0:0,a1:270,  n:3, big:1,sweep:0, dxf:[0,270],
  bb:[-1000,-1000,1000,1000]},
 {id:"cw-270",    a0:0,a1:-270, n:3, big:1,sweep:1, dxf:[-270,0],
  bb:[-1000,-1000,1000,1000]},
 {id:"circle+360",a0:0,a1:360,  n:4, circle:1,
  bb:[-1000,-1000,1000,1000]},
 {id:"circle-360",a0:0,a1:-360, n:4, circle:1,
  bb:[-1000,-1000,1000,1000]},
];

const checkSVG=(txt,c)=>{
 if(c.circle)return /<circle /.test(txt);
 const m=/A 1000 1000 0 ([01]) ([01])/.exec(txt);
 return !!m && +m[1]===c.big && +m[2]===c.sweep;
};
const checkDXF=(s,c)=>{
 const e=dxfEntity(s,"ARC");
 if(c.circle)return !e && /\nCIRCLE\n/.test(s);
 return !!e
  && Math.abs(parseFloat(e["50"])-c.dxf[0])<0.001
  && Math.abs(parseFloat(e["51"])-c.dxf[1])<0.001;
};
const checkPDF=(stream,c)=>{
 const n=(stream.match(/ c\n/g)||[]).length;
 return n===c.n;
};
const checkBB=(bb,exp)=>!!bb
 && near0(bb.x0,exp[0]) && near0(bb.y0,exp[1])
 && near0(bb.x1,exp[2]) && near0(bb.y1,exp[3]);

group("اتجاه الأقواس عبر SVG/DXF/PDF/BBox",()=>{
 CASES.forEach(c=>{
  newState();
  const g=mk(c.a0,c.a1), prims=[g];

  const svg=toSVG(prims,box,{});
  ok(checkSVG(svg.txt,c),`SVG  ${c.id} — big/sweep صحيحان`);

  const dxf=toDXF(prims,box,{});
  ok(checkDXF(dxf,c),`DXF  ${c.id} — الطرفان/الدائرة صحيحان`);

  const pdf=toPDF(prims,box,{});
  const pdfStream=typeof pdf.stream==="string"?pdf.stream:dec.decode(pdf.stream);
  ok(checkPDF(pdfStream,c),
   `PDF  ${c.id} — عدد مقاطع بيزيه ${c.n}`);

  const bb0=primsBBox(prims);
  ok(checkBB(bb0,c.bb),
   `BBox ${c.id} — ${JSON.stringify(bb0)} ≈ ${JSON.stringify(c.bb)}`);
 });
});

const r=summary();
process.exit(r?1:0);
