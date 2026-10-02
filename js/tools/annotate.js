/* ═══ أدوات التأشير ═══
   البُعد ثلاث نقرات: طرف، طرف، موضع الخطّ — كلّها صريحة.
   السلسلة تُبنى من قيَم تكتبها، لا من مطابقة تُخمَّن. */
import {S,edit,editFailed} from "../core/state.js";
import {addLive,refreshLive,liveWouldChange} from "../core/live.js";
import {regionAt} from "../core/areas.js";
import {regionLoops} from "../core/render.js";
import {roomDims} from "../core/autodim.js";
import {m2,m3,M,Mx,clamp,mnum} from "../core/units.js";
import {addDim,posFromPt,dimValue,fmtLen,dimGeom,DK,
        addDimRad,addDimDia,addDimAng,
        parseVals,addChain,chainSum,chainCompare,
        addText,addLead,addLevel,addAxis,
        axLabel,levelStr} from "../core/dims.js";
import {defTool,H,rec,dirty,ov,ovLen,ovNum,ovOn,
        pvLine} from "./registry.js";

const GRN="#5cd98e", YEL="#ffd06b", PNK="#ff9aa2";

/* ═══ بُعد ═══ */
defTool({
 id:"dim", alias:"d1 بعد قياسات", label:"بُعد",
 hint:"طرف · طرف · موضع الخطّ",
 opts:[
  {k:"kind",label:"النوع",type:"sel",
   items:[["h","أفقي"],["v","رأسي"],["al","محاذٍ"]],def:"h"},
  {k:"txt", label:"نصّ بديل",type:"text",def:"",
   hint:"يُعرَض بدل المقاس مع علامة *"}],
 steps:[
  {p:"الطرف الأول"},
  {p:"الطرف الثاني", base:0},
  {p:"موضع خطّ البُعد", base:"none", restart:1,
   each(ctx,p){
    const a=ctx.pts[0], b=ctx.pts[1];
    const kind=ov("dim","kind");
    const d=addDim(kind,a,b,posFromPt(kind,a,b,p),
     String(ov("dim","txt")||"").trim());
    rec(ctx,d,"dims");
    H.rep("ok",`${d.id} ${DK[d.kind]} ${fmtLen(dimValue(d))} م`
     +(d.txt?` · نصّ بديل «${d.txt}» — علامة * تدلّ عليه`:""));
   }}],
 prev(ctx,g){
  const P=ctx.pts;
  if(!g)return [];
  if(P.length===1)return [pvLine(P[0],g,YEL)];
  if(P.length>=2){
   const kind=ov("dim","kind");
   const gm=dimGeom({kind,a:P[0],b:P[1],
    pos:posFromPt(kind,P[0],P[1],g)});
   if(!gm)return [pvLine(P[0],P[1],YEL)];
   return [pvLine(P[0],P[1],"#4b5a6b"),
           pvLine(gm.p1,gm.p2,GRN),
           pvLine(P[0],gm.p1,"#3d4a58"),
           pvLine(P[1],gm.p2,"#3d4a58")];
  }
  return [];
 }});

/* ═══ سلسلة أبعاد بقيَم مكتوبة ═══ */
defTool({
 id:"chain", alias:"ch سلسله", label:"سلسلة",
 hint:"اكتب القيَم في الشريط ثم انقر البداية وموضع الخطّ",
 opts:[
  {k:"vals", label:"القيَم م",type:"text",def:"",
   hint:"مثل: 3 2.5 4 · أو 3*4 لتكرار"},
  {k:"axis", label:"المحور",type:"sel",
   items:[["h","أفقي"],["v","رأسي"]],def:"h"},
  {k:"total",label:"خطّ المجموع",type:"chk",def:1}],
 start(ctx){
  try{ctx.v.vals=parseVals(ov("chain","vals"))}
  catch(e){H.rep("er",e.message); return false}
  H.rep("in",`${ctx.v.vals.length} قيمة · المجموع `
   +`${fmtLen(ctx.v.vals.reduce((s,v)=>s+v,0))} م`);
  return true;
 },
 steps:[
  {p:"نقطة بداية السلسلة"},
  {p:"موضع خطّ السلسلة", base:0, restart:1,
   each(ctx,p){
    const ax=ov("chain","axis");
    const c=addChain(ax,ctx.pts[0],(ax==="h")?p[1]:p[0],
     ctx.v.vals, ovOn("chain","total")?1:0);
    rec(ctx,c,"chains");
    H.rep("ok",`${c.id} ${ctx.v.vals.length} قيمة · `
     +`${fmtLen(chainSum(c))} م · القيَم كما كتبتها`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g||!ctx.v.vals)return [];
  const ax=ov("chain","axis");
  const b=ctx.pts[0];
  const pos=(ax==="h")?g[1]:g[0];
  const pt=v=>(ax==="h")?[b[0]+v,pos]:[pos,b[1]+v];
  const o=[pvLine(b,pt(0),"#3d4a58")];
  let s=0;
  ctx.v.vals.forEach(v=>{
   o.push(pvLine(pt(s),pt(s+v),GRN));
   s+=v;
  });
  return o;
 }});

/* ═══ مقارنة السلسلة بالهندسة — تقرير ═══ */
defTool({
 id:"chaincmp", alias:"cc قارن", label:"قارن السلسلة",
 hint:"يعرض فرق كل حدٍّ عن أقرب عقدة — بلا تعديل",
 opts:[{k:"tol",label:"التفاوت م",type:"len",def:"0.06"}],
 start(ctx){
  const L=H.sel().filter(s=>s.k==="chain");
  if(!L.length){H.rep("wr","حدّد سلسلة أولاً");return false}
  L.forEach(s=>{
   const c=S.chains.find(x=>x.id===s.id);
   if(!c)return;
   const r=chainCompare(c,ovLen("chaincmp","tol"));
   H.rep(r.off?"wr":"ok",
    `${c.id}: المجموع ${fmtLen(r.sum)} م · `
    +`${r.off?`${r.off} حدّاً خارج التفاوت`:"كل الحدود مطابقة"}`);
   r.rows.forEach(x=>{
    if(x.ok)return;
    H.rep("in",`  الحدّ ${x.i}: على ${m3(x.at)} م · `
     +`أقرب عقدة ${x.near==null?"—":m3(x.near)} م · `
     +`الفرق ${x.d==null?"—":m3(x.d)} م`);
   });
  });
  H.rep("in","تقرير فقط — لم تُعدَّل قيمة واحدة");
  return false;
 },
 steps:[]});

/* ═══ أبعاد الغرفة ═══
   نقرةٌ داخل غرفةٍ مغلقة ← بُعدٌ أفقيّ أسفلها ورأسيّ يسارها وملصقٌ
   «العرض×الطول · المساحة» في وسطها (core/autodim.js — دالّةٌ خالصة).
   والأبعاد هي أبعادُ الصندوق المحيط بالحلقة: مطابقةٌ للمستطيل، أمّا
   غرفةٌ بشكلٍ آخر (L · قوس) فيُقال ذلك صراحةً — رقمُ العرض×الطول
   لغرفةٍ غير مستطيلة بلا تنبيهٍ يُقرأ كأنّه مساحتُها. المساحة في
   الملصق هي الفعليّة للحلقة دائماً. */
defTool({
 id:"roomdim", alias:"rd أبعادالغرفة", label:"أبعاد الغرفة",
 hint:"انقر داخل غرفةٍ مغلقة · Enter ينهي",
 opts:[
  {k:"off",  label:"إزاحة البُعد م", type:"len", def:"1"},
  {k:"label",label:"ملصق الأبعاد والمساحة", type:"chk", def:1}],
 steps:[
  {p:"انقر داخل الغرفة (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const ring=regionAt(regionLoops(),p[0],p[1]);
    if(!ring)throw new Error(
     "لا حلقة مغلقة تحيط بهذه النقطة — أغلق الجدران أوّلاً");
    const rd=roomDims(ring,{off:ovLen("roomdim","off")||1000});
    if(!rd)throw new Error("الغرفة أصغر من أن تُبعَّد (٣٠ سم)");
    rd.dims.forEach(d=>rec(ctx,addDim(d.kind,d.a,d.b,d.pos),"dims"));
    if(ovOn("roomdim","label"))
     rec(ctx,addText(rd.center,`${rd.sizeText} · ${rd.areaText}`,1,0,"mc"),
      "anno");
    H.rep("ok",`${rd.sizeText} م · ${rd.areaText} — بُعدان`
     +(ovOn("roomdim","label")?" وملصق":""));
    /* الصندوقُ ≠ الغرفة؟ فرقٌ فوق ٢٪ بين المساحة الفعلية وعرض×طول */
    const box=rd.w*rd.h;
    if(box>0&&Math.abs(box-rd.area)/box>0.02)
     H.rep("wr",`الغرفة ليست مستطيلة — العرض×الطول لصندوقها المحيط `
      +`(${(box/1e6).toFixed(2)} م²) والمساحة الفعلية ${rd.areaText}`);
   }}]});

/* ═══ نصّ ═══ */
defTool({
 id:"text", alias:"t نص", label:"نصّ",
 hint:"اكتب النصّ في الشريط ثم انقر موضعه · Enter ينهي",
 opts:[
  {k:"s",  label:"النصّ",type:"text",def:""},
  {k:"hm", label:"الحجم ×",type:"num",def:1},
  {k:"rot",label:"الدوران °",type:"num",def:0},
  {k:"al", label:"المحاذاة",type:"sel",
   items:[["bc","وسط"],["bl","يسار"],["mc","وسط أوسط"]],def:"bc"}],
 steps:[
  {p:"موضع النصّ (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const a=addText(p,ov("text","s"),ovNum("text","hm"),
     ovNum("text","rot"),ov("text","al"));
    rec(ctx,a,"anno");
    H.rep("ok",`${a.id} «${a.s}»`);
   }}]});

/* ═══ قائد ═══ */
defTool({
 id:"lead", alias:"le قائد", label:"قائد",
 hint:"رأس السهم ثم كسرات ثم Enter · النصّ من الشريط",
 opts:[
  {k:"s", label:"النصّ",type:"text",def:""},
  {k:"hm",label:"الحجم ×",type:"num",def:1}],
 steps:[
  {p:"رأس السهم"},
  {p:"نقطة الكسر (Enter ينهي القائد)", loop:1, base:-1, min:1}],
 done(ctx){
  if(ctx.pts.length<2)return;
  const a=addLead(ctx.pts,ov("lead","s"),ovNum("lead","hm"));
  rec(ctx,a,"anno");
  H.rep("ok",`${a.id} قائد «${a.s}» · ${ctx.pts.length} نقطة`);
 },
 prev(ctx,g){
  const P=ctx.pts.concat(g?[g]:[]), o=[];
  for(let i=0;i<P.length-1;i++)o.push(pvLine(P[i],P[i+1],PNK));
  return o;
 }});

/* ═══ منسوب ═══ */
defTool({
 id:"level", alias:"lv منسوب", label:"منسوب",
 hint:"انقر الموضع · القيمة من الشريط · Enter ينهي",
 opts:[
  {k:"z",  label:"المنسوب م",type:"text",def:"0"},
  {k:"pre",label:"سابقة",   type:"text",def:"",hint:"مثل: ت.م"}],
 steps:[
  {p:"موضع المنسوب (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const raw=String(ov("level","z")||"0").trim();
    const neg=/^-/.test(raw);
    /* M() المتساهلة تعيد 0 لكل نصٍّ غير رقمي فيُنشأ «+0.000» بصمت —
       Mx تعيد null فنرفض قبل أي تعديل للحالة */
    const zz=Mx(raw.replace(/^-/,""));
    if(zz==null)throw new Error(`«${raw}» ليست قيمة منسوب صالحة`);
    const z=zz*(neg?-1:1);
    const a=addLevel(p,z,ov("level","pre"));
    rec(ctx,a,"anno");
    H.rep("ok",`${a.id} ${levelStr(a)}`);
   }}]});

/* ═══ محور ═══ */
defTool({
 id:"axis", alias:"ax محور", label:"محور",
 hint:"انقر موضع المحور · Enter ينهي",
 opts:[
  {k:"dir",label:"الاتجاه",type:"sel",
   items:[["x","رأسي (حرف)"],["y","أفقي (رقم)"]],def:"x"}],
 steps:[
  {p:"موضع المحور (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const d=ov("axis","dir");
    const v=addAxis(d,(d==="x")?p[0]:p[1]);
    dirty(ctx);
    const A=(d==="y")?S.grid.ys:S.grid.xs;
    H.rep("ok",`محور ${axLabel(d,A.indexOf(v))} على `
     +`${m3(v)} م · ${A.length} محوراً`);
   }}],
 prev(ctx,g){
  if(!g)return [];
  const d=ov("axis","dir"), L=9e5;
  return [(d==="x")
   ? pvLine([g[0],g[1]-L],[g[0],g[1]+L],YEL)
   : pvLine([g[0]-L,g[1]],[g[0]+L,g[1]],YEL)];
 }});

/* ═══ بُعد نصف قطر ═══
   مركز القوس · نقطة على القوس · موضع النصّ. المركز يُلتقَط بـcen
   (osnap.js). القيمة تُخزَّن r صريحةً لا مرتبطةً بالقوس. */
defTool({
 id:"dimrad", alias:"dra نصف_قطر", label:"بعد نصف قطر",
 hint:"مركز القوس · نقطة على القوس · موضع النصّ",
 steps:[
  {p:"مركز القوس (التقط cen)"},
  {p:"نقطة على القوس", base:0,
   each(ctx,p){
    const c=ctx.pts[0];
    const r=Math.hypot(p[0]-c[0], p[1]-c[1]);
    if(r<10)throw new Error("نصف القطر أقل من 10 مم — انقر نقطةً أبعد عن المركز");
    ctx.v.r=r;
   }},
  {p:"موضع النصّ", base:0, restart:1,
   each(ctx,p){
    const c=ctx.pts[0];
    const d=addDimRad(c,ctx.v.r,p);
    rec(ctx,d,"dims");
    H.rep("ok",`${d.id} R ${fmtLen(dimValue(d))} م`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const c=ctx.pts[0];
  const r=ctx.v.r||Math.hypot(g[0]-c[0], g[1]-c[1]);
  const ang=Math.atan2(g[1]-c[1], g[0]-c[0]);
  const edge=[c[0]+Math.cos(ang)*r, c[1]+Math.sin(ang)*r];
  return [pvLine(c,edge,YEL), pvLine(edge,g,GRN)];
 }});

/* ═══ بُعد قطر ═══ */
defTool({
 id:"dimdia", alias:"ddi قطر", label:"بعد قطر",
 hint:"مركز الدائرة · نقطة على المحيط · موضع النصّ",
 steps:[
  {p:"مركز الدائرة (التقط cen)"},
  {p:"نقطة على المحيط", base:0,
   each(ctx,p){
    const c=ctx.pts[0];
    const r=Math.hypot(p[0]-c[0], p[1]-c[1]);
    if(r<10)throw new Error("نصف القطر أقل من 10 مم — انقر نقطةً أبعد عن المركز");
    ctx.v.r=r;
   }},
  {p:"موضع النصّ", base:0, restart:1,
   each(ctx,p){
    const c=ctx.pts[0];
    const d=addDimDia(c,ctx.v.r,p);
    rec(ctx,d,"dims");
    H.rep("ok",`${d.id} ⌀ ${fmtLen(dimValue(d))} م`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const c=ctx.pts[0];
  const r=ctx.v.r||Math.hypot(g[0]-c[0], g[1]-c[1]);
  const ang=Math.atan2(g[1]-c[1], g[0]-c[0]);
  const e1=[c[0]+Math.cos(ang)*r, c[1]+Math.sin(ang)*r];
  const e2=[c[0]-Math.cos(ang)*r, c[1]-Math.sin(ang)*r];
  return [pvLine(e1,e2,YEL), pvLine(e1,g,GRN)];
 }});

/* ═══ بُعد زاويّ ═══
   رأس · نقطة على الضلع الأول · نقطة على الضلع الثاني. نصف قطر القوس
   يُشتقّ من طول الضلع الأول (٦٠٪ منه بين ٠.٨ و٤ م). */
defTool({
 id:"dimang", alias:"dan زاوي", label:"بعد زاوي",
 hint:"رأس الزاوية · نقطة على الضلع 1 · نقطة على الضلع 2",
 steps:[
  {p:"رأس الزاوية"},
  {p:"نقطة على الضلع الأول", base:0},
  {p:"نقطة على الضلع الثاني", base:0, restart:1,
   each(ctx,p){
    const vc=ctx.pts[0], p1=ctx.pts[1];
    const r=Math.max(800,
     Math.min(4000, Math.hypot(p1[0]-vc[0],p1[1]-vc[1])*0.6));
    const d=addDimAng(vc,p1,p,r);
    rec(ctx,d,"dims");
    H.rep("ok",`${d.id} ${dimValue(d).toFixed(1)}°`);
   }}],
 prev(ctx,g){
  if(!g)return [];
  if(ctx.pts.length===1)return [pvLine(ctx.pts[0],g,YEL)];
  if(ctx.pts.length===2)
   return [pvLine(ctx.pts[0],ctx.pts[1],"#6d7987"),
           pvLine(ctx.pts[0],g,GRN)];
  return [];
 }});

/* ═══ حقل حيّ ═══ المصدر المجهول يُرفَض عند الإنشاء برسالةٍ تسمّي صورته
   المقبولة — لا حقلُ «—» يُنشأ. */
const LVF=[["raw","خام"],["m","متر"],["m2","م²"],["mm","مم"]];
defTool({
 id:"livetext", alias:"lf حقل_حي نص_مشتق", label:"حقل حيّ",
 hint:"اكتب المصدر في الشريط ثم انقر موضعه · Enter ينهي",
 opts:[
  {k:"src",label:"المصدر",type:"text",def:"meta:scale",
   hint:"مثل meta:scale · meta:wallH · area:A3:area · dim:D7:value · count:walls:count"},
  {k:"fmt",label:"الصيغة",type:"sel",items:LVF,def:"raw"},
  {k:"pre",label:"سابقة",type:"text",def:""},
  {k:"suf",label:"لاحقة",type:"text",def:""},
  {k:"rot",label:"الدوران °",type:"num",def:0},
  {k:"hm",label:"الحجم ×",type:"num",def:1}],
 steps:[
  {p:"موضع الحقل (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const f=addLive(String(ov("livetext","src")||"").trim(),p,{
     fmt:ov("livetext","fmt"), pre:ov("livetext","pre"),
     suf:ov("livetext","suf"), rot:ovNum("livetext","rot"),
     hm:ovNum("livetext","hm")});
    rec(ctx,f,"livefields");
    H.rep("ok",`${f.id} «${f.cached}» · ${f.src}`
     +(f.stale?" · متوسَّم قديماً (*)":""));
   }}]});

/* ═══ تحديث الحقول — الأمر الصريح الوحيد الذي يغيّر النصّ المشتقّ.
   يمرّ بـ edit() ⇒ خطوة تراجع واحدة، والفشل يُرجَع كلّه. وفحصٌ مسبق
   بلا كتابة يمنع خطوة تراجعٍ فارغة حين لا يتغيّر شيء. أمرٌ لحظيّ:
   يعيد false فلا يبقى في وضع أداة. */
defTool({
 id:"liverefresh", alias:"lvr حدث_الحقول حقل_حي_تحديث", label:"تحديث الحقول",
 hint:"يعيد حساب نصوص الحقول الحيّة وحدها — الغائب يبقى «—» متوسَّماً",
 own:1,
 start(){
  if(!(S.livefields||[]).length){
   H.rep("in","لا حقول حيّة في المشروع");
   return false;
  }
  if(!liveWouldChange()){
   H.rep("in","لا تغيير — النصوص محدَّثة");
   return false;
  }
  const r=edit(()=>refreshLive(),"تحديث الحقول الحيّة",{bump:"view"});
  if(r===undefined||editFailed()){
   H.rep("er","تعذّر تحديث الحقول — أُرجعت الحالة");
   return false;
  }
  H.rep(r.n?"ok":"in",
   `حُدِّث ${r.n} حقل`+(r.stale?` · ${r.stale} ما زال قديماً`:""));
  if(r.stale)
   H.rep("wr","الحقل المتوسَّم بعلامة * مصدرُه قديم أو غائب — "
    +"يُعاد حسابه عند زوال علّته أو إصلاح مصدره.");
  return false;
 },
 steps:[]});
