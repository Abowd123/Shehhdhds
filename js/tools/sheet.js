/* ═══ أدوات الأوراق والمنافذ — 4B ═══
   vport: خطوتان تلتقطان مستطيل النموذج ثم تثبتان منفذاً وسط
   منطقة الرسم على الورقة النشطة بمقياس موحّد.
   addsheet/delsheet/renamesheet/nextsheet/prevsheet: أوامر فورية
   تدير قائمة S.sheets عبر edit() الذرية. */
import {S,edit} from "../core/state.js";
import {defTool,H,dirty,rec,pvRect,ov} from "./registry.js";
import {addCallout} from "../core/callouts.js";
import {mkSheet,mkViewport,sheetPapers,activeSheetDef,kForScale} from "../core/sheet.js";
import {LIM} from "../core/limits.js";
import {dim2} from "../core/units.js";

const R=v=>Math.round(v);

/* إنشاء ورقةٍ مفردة عند أول استخدام لنظام الأوراق (ترحيلٌ من
   S.sheet المفرد القديم إن لم تكن S.sheets موجودة بعد). */
function ensureSheetsMigrate(){
 if(!Array.isArray(S.sheets))S.sheets=[];
 if(!S.sheets.length){
  const sh=mkSheet({
   size:S.sheet.size, customW:S.sheet.customW, customH:S.sheet.customH,
   orient:S.sheet.orient,
   margin:S.sheet.margin, tb:S.sheet.tb,
   north:S.sheet.north, cx:S.sheet.cx, cy:S.sheet.cy});
  S.sheets.push(sh);
  S.activeSheet=sh.id;
 }
 let sh=activeSheetDef();
 if(!sh){S.activeSheet=S.sheets[0].id; sh=S.sheets[0];}
 return sh;
}

/* ═══ إنشاء منفذ من مستطيل نموذج ═══
   يدخل في معاملة الأداة القائمة (joinTxn) فلا يدفع خطوة تاريخ
   منفردة — registry يفعل ذلك عند finish.
   خيار scale: مقياسٌ قياسيٌّ مفروضٌ (1:50 … 1:1000) يثبّت k=1/scale
   ولا يتّسع ولا يتقلّص لِيحتوي النطاق؛ إن تجاوز الإطار الداخليّ
   للورقة أُنشئ كما هو بمقياسه الصريح وشُرح بالتحذير — لا تشويه.
   وبلا خيارٍ: التلقائيُّ السابق كما كان حرفاً. */
function makeViewport(ctx,a,b){
 const x0=Math.min(a[0],b[0]), y0=Math.min(a[1],b[1]);
 const x1=Math.max(a[0],b[0]), y1=Math.max(a[1],b[1]);
 const mw=x1-x0, mh=y1-y0;
 if(mw<LIM.vpModelRectMM.min||mh<LIM.vpModelRectMM.min){
  H.rep("er","النطاق دون 1 مم — انقر ركنين صالحين");
  return false;
 }
 const sh=ensureSheetsMigrate();
 if(!sh)return false;
 if(!Array.isArray(sh.viewports))sh.viewports=[];
 if(sh.viewports.length>=LIM.viewportsPerSheet.max){
  H.rep("er",`بلغت ورقة «${sh.name}» الحد الأقصى `
   +`${LIM.viewportsPerSheet.max} منفذاً`);
  return false;
 }
 const papers=sheetPapers(sh);
 const pad=Math.max(10, +sh.margin||0);
 const iw=papers.w-2*pad, ih=papers.h-2*pad;
 if(iw<=0||ih<=0){
  H.rep("er","مقاس الورقة لا يترك فراغاً بعد الهامش");
  return false;
 }
 /* مقياسٌ قياسيٌّ مفروضٌ إن اختير، وإلا فتلقائيٌّ يحتوي النطاق */
 const scSel=parseInt(String(ov("vport","scale")||0),10);
 const k=scSel>0?kForScale(scSel):Math.min(iw/mw, ih/mh);
 const pw=mw*k, ph=mh*k;
 if(pw>LIM.vpPaperRectMM.max||ph>LIM.vpPaperRectMM.max){
  H.rep("er",`منفذ ${dim2(R(pw),R(ph),"مم")} يتجاوز حدّه — `
   +`اختر مقياساً أصغر أو نطاقاً أصغر`);
  return false;
 }
 const over=!(pw<=iw&&ph<=ih);
 const px0=(papers.w-pw)/2, py0=(papers.h-ph)/2;
 const n=sh.viewports.length+1;
 const vp=mkViewport({
  name:`منفذ ${n}`,
  modelRect:{x0,y0,x1,y1},
  paperRect:{x0:R(px0),y0:R(py0),x1:R(px0+pw),y1:R(py0+ph)},
  visible:1
 });
 sh.viewports.push(vp);
 S.activeSheet=sh.id;
 /* المقياس المعروض: المفروض باسمه الصريح · التلقائيُّ كما كان */
 const s=scSel>0?scSel:Math.max(1,Math.round(1000/k/50)*50);
 H.rep(over?"wr":"ok",
  (over?`⚠ يتجاوز الإطار الداخلي للورقة — كبّر الورقة أو اختر `
   +`مقياساً أصغر. `:"")+`أُنشئ «${vp.name}» · النموذج `
  +`${dim2((mw/1000).toFixed(3),(mh/1000).toFixed(3),"م")} · `
  +`الورقة ${dim2(R(pw),R(ph),"مم")} · قريب من 1:${s}`);
 dirty(ctx);
 return true;
}

/* ═══ الأداة الرئيسية: منفذ ورقة ═══ */
defTool({
 id:"vport",
 label:"منفذ ورقة",
 ico:"sheet",
 opts:[{k:"scale",type:"sel",label:"مقياس المنفذ",def:"0",
  items:[["0","تلقائي"],["50","1:50"],["100","1:100"],
   ["200","1:200"],["500","1:500"],["1000","1:1000"]]}],
 steps:[
  {p:"الزاوية الأولى لنطاق النموذج", k:"a"},
  {p:"الزاوية المقابلة", k:"b",
   each(ctx){
    if(makeViewport(ctx, ctx.pts[0], ctx.pts[1]))
     H.rep("in","انقر ركنين لإنشاء منفذ آخر · Esc للخروج");
   },
   restart:1}
 ],
 prev(ctx,ghost){
  const P=(ctx&&ctx.pts)||[];
  if(P.length===1&&ghost)return [pvRect(P[0],ghost,"cell")];
  if(P.length>=2)return [pvRect(P[0],P[1],"cell")];
  return [];
 }
});

/* ═══ وسم تفصيلة — DC ═══
   منفذُ المصدر ثم منفذُ الهدف بمعرّفَيهما (نصّاً) ثم موضع الرمز على
   النموذج. الأداة تعيد نفسها بعد كل وسم (restart) فتسأل عن المعرّفين
   من جديد. الوسم كيانٌ في S.callouts فيُسجَّل بـrec للتراجع. */
const vpOfId=raw=>{
 const q=String(raw||"").trim();
 const out=[];
 (S.sheets||[]).forEach(sh=>(sh.viewports||[]).forEach(vp=>{
  if(vp&&vp.id===q)out.push({sh,vp});
 }));
 if(!out.length)throw new Error(`لا منفذ بمعرّف «${q}»`);
 if(out.length>1)throw new Error(`«${q}» مكرر في أكثر من ورقة`);
 return out[0];
};
defTool({
 id:"detail", alias:"dc detail تفصيله وسم", label:"وسم تفصيلة",
 hint:"معرّف منفذ المصدر · معرّف الهدف · موضع الرمز على النموذج",
 steps:[
  {p:"معرّف منفذ المصدر", text:1, k:"src",
   each(ctx,s){const a=vpOfId(s); ctx.v.src={sh:a.sh.id,vp:a.vp.id}}},
  {p:"معرّف منفذ الهدف", text:1, k:"tgt",
   each(ctx,s){const a=vpOfId(s); ctx.v.tgt={sh:a.sh.id,vp:a.vp.id}}},
  {p:"موضع الرمز", k:"pos", base:"none", restart:1,
   each(ctx,p){
    const c=addCallout({srcSheet:ctx.v.src.sh, srcVp:ctx.v.src.vp,
     tgtSheet:ctx.v.tgt.sh, tgtVp:ctx.v.tgt.vp, pos:p});
    rec(ctx,c,"callouts");
    H.rep("ok",`${c.label} · ${ctx.v.src.sh} → ${ctx.v.tgt.sh}`);
   }}],
 prev(ctx,g){
  if(ctx&&ctx.v&&ctx.v.src&&ctx.v.tgt&&g)
   return [pvRect([g[0]-700,g[1]-700],[g[0]+700,g[1]+700],"#ffd06b")];
  return [];
 }});

/* ═══ الأوامر الفورية لإدارة الأوراق ═══ */
defTool({
 id:"addsheet",
 label:"ورقة جديدة",
 ico:"sheet",
 own:1,
 start(ctx){
  const arg=(ctx&&ctx.arg)?String(ctx.arg).trim().slice(0,200):null;
  if(!Array.isArray(S.sheets))S.sheets=[];
  if(S.sheets.length>=LIM.sheets.max){
   H.rep("er",`بلغت الحد الأقصى ${LIM.sheets.max} ورقة`);
   return true;
  }
  let name=null;
  edit(()=>{
   const nm=arg||`ورقة ${S.sheets.length+1}`;
   const sh=mkSheet({name:nm,size:S.sheet.size,
    customW:S.sheet.customW,customH:S.sheet.customH,
    orient:S.sheet.orient,margin:S.sheet.margin,
    tb:S.sheet.tb,north:S.sheet.north});
   S.sheets.push(sh);
   S.activeSheet=sh.id;
   name=nm;
  },"ورقة جديدة");
  if(name)H.rep("ok",`أُضيفت ورقة «${name}»`);
 },
 steps:[]
});

defTool({
 id:"renamesheet",
 label:"إعادة تسمية الورقة",
 ico:"sheet",
 own:1,
 start(ctx){
  const sh=activeSheetDef();
  if(!sh){H.rep("er","لا ورقة نشطة"); return true;}
  const arg=(ctx&&ctx.arg)?String(ctx.arg).trim():null;
  let v;
  if(arg)v=arg.slice(0,200);
  else{
   const nm=window.prompt("اسم الورقة:",sh.name||"");
   if(nm==null)return true;
   v=String(nm).trim().slice(0,200)||sh.name;
  }
  edit(()=>{const t=activeSheetDef(); if(t)t.name=v;},
   "إعادة تسمية ورقة");
  H.rep("ok",`سُمّيت الورقة «${v}»`);
 },
 steps:[]
});

defTool({
 id:"delsheet",
 label:"حذف ورقة",
 ico:"del",
 own:1,
 start(ctx){
  const sh=activeSheetDef();
  if(!sh){H.rep("er","لا ورقة نشطة"); return true;}
  if(!window.confirm(`حذف ورقة «${sh.name}» مع منافذها؟`))return true;
  const id=sh.id;
  edit(()=>{
   if(!Array.isArray(S.sheets))return;
   S.sheets=S.sheets.filter(x=>x.id!==id);
   if(S.activeSheet===id)S.activeSheet=(S.sheets[0]||{}).id||null;
  },"حذف ورقة");
  H.rep("ok","حُذفت الورقة");
 },
 steps:[]
});

defTool({
 id:"nextsheet",
 label:"الورقة التالية",
 ico:"redo",
 own:1,
 start(){
  /* الحارس قبل edit(): وإلا دُفعت خطوةُ تاريخٍ فارغة تستهلك ضغطة undo */
  if(!Array.isArray(S.sheets)||S.sheets.length<2){
   H.rep("in","لا ورقة أخرى للانتقال إليها"); return;
  }
  edit(()=>{
   const i=S.sheets.findIndex(x=>x.id===S.activeSheet);
   const j=(i+1)%S.sheets.length;
   S.activeSheet=S.sheets[j].id;
  },"الورقة التالية");
 },
 steps:[]
});

defTool({
 id:"prevsheet",
 label:"الورقة السابقة",
 ico:"undo",
 own:1,
 start(){
  /* الحارس قبل edit(): وإلا دُفعت خطوةُ تاريخٍ فارغة تستهلك ضغطة undo */
  if(!Array.isArray(S.sheets)||S.sheets.length<2){
   H.rep("in","لا ورقة أخرى للانتقال إليها"); return;
  }
  edit(()=>{
   const i=S.sheets.findIndex(x=>x.id===S.activeSheet);
   const j=(i-1+S.sheets.length)%S.sheets.length;
   S.activeSheet=S.sheets[j].id;
  },"الورقة السابقة");
 },
 steps:[]
});
