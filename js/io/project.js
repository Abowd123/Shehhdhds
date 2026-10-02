/* ═══ حفظ المشروع وفتحه · التنزيل · اختيار الملفّ ═══
   الملفّ نصٌّ صريح: كل ما رسمته وكل خياراتك، بلا حقل مشتقّ واحد. */
import {S,pack,loadState,ensureShape,clearHistory,snapshot,COLLS,
        LSK,shapeNotes} from "../core/state.js";
import {toJSON as blocksJSON,fromJSON as blocksLoad,
        checkDefs as blocksCheck} from "../core/blocks.js";
import {toJSON as priceJSON,fromJSON as priceLoad} from "../core/pricing.js";
import {stripTitle} from "../core/sheet.js";

/* النسخة 2 (B2): أُضيف السقف roofs. ملفّات النسخة 1 تُرحَّل عبر
   migrations[1]؛ والحقول الإضافية اختيارية وتُقرأ بلا كسر. */
export const VERSION=2;

/* ═══ جدول الترحيل ═══ migrations[v] تنقل ملفّاً من الإصدار v إلى v+1.
   الملفّ بلا __ver يُعامَل إصداراً 0. الإصدار 0→1 لا يغيّر شيئاً: الحقول
   الإضافية اختيارية وتُقرأ بلا كسر. عند رفع VERSION أضِف مدخلاً جديداً هنا
   — وإلّا رُفض الملف القديم برسالةٍ صريحة بدل أن يمرّ مُهمَلاً. */
export const migrations={
 0:d=>d,
 /* 1→2 (B2): السقف كيانٌ جديد. الحقول الإضافية تُقرأ بلا كسر، وensureShape
    يُطبِّع كلَّ ما يدخل — فهنا نُثبِّت وجودَ المصفوفتين فحسب. */
 1:d=>{
  if(!Array.isArray(d.roofs))d.roofs=[];
  if(!Array.isArray(d.levelDefs))
   d.levelDefs=[{n:0,name:"أرضي",elev:0,h:3000,slab:200,color:"#cccccc"}];
  return d;
 },
};
export function migrate(d){
 let v=d.__ver||0;
 while(v<VERSION){
  const f=migrations[v];
  if(typeof f!=="function")
   throw new Error(`لا ترحيلَ معرَّف من إصدار الملفّ ${v} إلى ${v+1}`);
  const r=f(d);
  if(!r||typeof r!=="object"||Array.isArray(r))
   throw new Error(`ترحيل الإصدار ${v} أعاد ما ليس كائناً`);
  d=r; v++;
 }
 return d;
}

export function toJSON(opts){
 const strip=!!(opts&&opts.stripAuthor);
 const d=pack();
 /* نسخةٌ لا S: نستبدل مرجع d.title بكائنٍ جديد فلا تُكتَب S.title */
 if(strip)d.title=stripTitle(d.title||S.title);
 /* underlay صار حقلاً من KEYS — pack() يُدرجه تلقائياً ضمن d،
    فلا داعي لتصديرٍ منفصل كما كان أيّام underlay.js وحدةً قائمةً
    بذاتها خارج S (انظر 3.3). */
 return JSON.stringify(Object.assign({__app:"civildraft",
  __ver:VERSION, __saved:new Date().toISOString()},d,
  {blockDefs:blocksJSON(), pricing:priceJSON()}));
}
export function fromJSON(txt){
 let d=null;
 try{d=JSON.parse(txt)}
 catch(e){throw new Error("الملفّ ليس JSON صالحاً")}
 if(!d||typeof d!=="object")throw new Error("الملفّ فارغ");
 /* الملفّات القديمة كُتِبت بـ__app:"mistar" (الاسم الأصلي قبل إعادة
    التسمية) — تُقبَل هنا لأجل التوافق، لكن toJSON لا تكتبها بعد
    الآن؛ فكل ملفٍّ جديدٍ يُسمّى باسمه الصحيح. */
 if(d.__app&&d.__app!=="civildraft"&&d.__app!=="mistar")
  throw new Error(`الملفّ من «${d.__app}» لا من CivilDraft`);
 if(!Array.isArray(d.walls))
  throw new Error("لا مصفوفة جدران — ليس ملفّ CivilDraft");
 /* ═══ 2.6: كلُّ فحصٍ قبل أيّ كتابة ═══
    فشلُ فحصٍ هنا لا يمسّ المشروع الحاليّ ولا تاريخه (D11: كان
    loadState يُبدِّل الحالة ثم تفشل blockDefs فيبقى مشروعٌ مختلط
    والتاريخ ممسوح). */
 if(d.__ver!=null&&(!Number.isInteger(d.__ver)||d.__ver<0))
  throw new Error(`رقم إصدار الملفّ غير صالح: ${JSON.stringify(d.__ver).slice(0,20)}`);
 if(d.__ver>VERSION)
  throw new Error(`الملفّ من إصدارٍ أحدث (${d.__ver}) من هذا البرنامج `
   +`(${VERSION}) — حدِّث البرنامج ولا تفتحه هنا`);
 const fileVer=d.__ver||0;
 d=migrate(d);
 const allIds=new Set();
 let dupCross=null;
 COLLS.forEach(k=>{
  if(d[k]===undefined)return;
  if(!Array.isArray(d[k]))
   throw new Error(`«${k}» في الملفّ ليست مصفوفة — لم يُغيَّر المشروع`);
  const seen=new Set();
  d[k].forEach(e=>{
   const id=e&&e.id;
   if(id==null)return;
   if(seen.has(id))
    throw new Error(`معرّف «${id}» مكرّر في «${k}» — لم يُغيَّر المشروع`);
   seen.add(id);
   if(allIds.has(id))dupCross=id;
   allIds.add(id);
  });
 });
 if(dupCross)
  throw new Error(`معرّف «${dupCross}» مكرّر عبر المجموعات — لم يُغيَّر المشروع`);
 if(Array.isArray(d.blocks)){
  d.blocks.forEach(b=>{
   if(b&&b.id&&allIds.has(b.id))
    throw new Error(`معرّف «${b.id}» مكرّر عبر المجموعات — لم يُغيَّر المشروع`);
  });
 }
 /* تعريفات الكتل: blockDefs صارمة، و«blocks» الكائنيّة القديمة تُفحَص
    إن حملت defs (التوافق مع النسخة الأولى) */
 let defsData=null;
 if(d.blockDefs!==undefined&&d.blockDefs!==null)defsData=d.blockDefs;
 else if(d.blocks&&typeof d.blocks==="object"&&!Array.isArray(d.blocks)
  &&Array.isArray(d.blocks.defs))defsData=d.blocks;
 if(defsData){
  const c=blocksCheck(defsData);
  if(!c.ok)
   throw new Error(`تعريفات الكتل فاسدة — لم يُغيَّر المشروع: ${c.why}`);
 }
 /* ═══ التطبيق داخل معاملة ═══ لقطةٌ قبل، ورجوعٌ كاملٌ عند أيّ رمي —
    وإلّا ترك فشلٌ متأخّر (تسعير · ensureShape) مشروعاً مختلطاً. */
 const pre=snapshot(), prePrice=priceJSON();
 try{
  loadState(d,false);
  if(defsData){
   const r=blocksLoad(defsData);
   if(!r.ok)throw new Error(`تعريفات الكتل: ${r.why}`);
  }
  if(d.pricing)priceLoad(d.pricing);
  /* underlay: loadState → apply() يُعيده من d.underlay مباشرةً
     (مفتاحٌ في KEYS). ملفٌّ قديم بلا أبعادٍ محفوظة (w/h) يُعاد
     تحميل صورته تلقائياً عند أوّل رسم، وظهورها يحتاج تفعيلاً يدوياً
     مرّةً واحدة (انظر ensureShape). */
  ensureShape();
 }catch(e){
  loadState(JSON.parse(pre),false);
  priceLoad(prePrice);
  throw e;
 }
 clearHistory();
 const notes=shapeNotes();
 return {walls:S.walls.length, opens:S.opens.length,
  areas:S.areas.length, dims:S.dims.length,
  chains:S.chains.length, anno:S.anno.length,
  cols:S.cols.length, fixt:S.fixt.length,
  stairs:S.stairs.length,
   blocks:Array.isArray(S.blocks)?S.blocks.length:0,
  ref:(S.ref&&S.ref.ents)?S.ref.ents.length:0,
  ver:fileVer, notes};
}
export function dl(name,data,mime){
 const b=(data instanceof Blob)?data
  :new Blob([data],{type:mime||"application/octet-stream"});
 const u=URL.createObjectURL(b);
 const a=document.createElement("a");
 a.href=u; a.download=name;
 document.body.appendChild(a);
 a.click();
 setTimeout(()=>{URL.revokeObjectURL(u); a.remove()},1200);
 return b.size;
}
/* ═══ سقف الحجم ═══
   pairs(txt) يبني مصفوفةً من زوجٍ لكل سطرَين، فملفٌّ ٢٠٠ م.ب يعطي
   ملايين المصفوفات قبل أن يبدأ التحويل — والخيط الرئيسي محتجزٌ بلا
   مؤشّرٍ ولا إلغاء. فالسؤال قبل القراءة لا بعدها. */
export const MAXFILE=24*1024*1024;      /* ٢٤ م.ب */

export function pickFile(cb,max){
 const i=document.createElement("input");
 i.type="file"; i.accept=".json,.mistar,application/json";
 i.onchange=()=>{
  const f=i.files&&i.files[0];
  if(!f){cb(null,null);return}
  const lim=max||MAXFILE;
  if(f.size>lim&&!confirm(
   `الملفّ ${humanSize(f.size)} — أكبر من ${humanSize(lim)}. `
   +`متابعة؟`)){cb(null,null); return}
  const r=new FileReader();
  r.onload=()=>cb(String(r.result||""),f.name);
  r.onerror=()=>cb(null,null);
  r.readAsText(f,"utf-8");
 };
 i.click();
}
/* قارئ ثنائي — DXF قد يكون CP1256 فلا يُقرأ نصّاً مباشرةً */
export function pickBin(accept,cb,max){
 const i=document.createElement("input");
 i.type="file";
 i.accept=accept||".dxf";
 i.onchange=()=>{
  const f=i.files&&i.files[0];
  if(!f){cb(null,null);return}
  const lim=max||MAXFILE;
  if(f.size>lim&&!confirm(
   `الملفّ ${humanSize(f.size)} — أكبر من ${humanSize(lim)}. `
   +`تحليله قد يُجمِّد الصفحة دقائق ولا يمكن إلغاؤه. متابعة؟`)){
   cb(null,null); return;
  }
  const r=new FileReader();
  r.onload=()=>cb(r.result,f.name);
  r.onerror=()=>cb(null,null);
  r.readAsArrayBuffer(f);
 };
 i.click();
}
export const humanSize=n=>(n<1024)?`${n} بايت`
 :((n<1048576)?`${(n/1024).toFixed(1)} ك.ب`
 :`${(n/1048576).toFixed(2)} م.ب`);
