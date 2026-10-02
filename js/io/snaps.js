/* ═══ اللقطات الزمنية ═══
   نسخة كاملة تعبر إغلاق الصفحة. الاستعادة تمرّ بـ edit() لتصبح
   خطوة تراجع واحدة، وتبقى قائمة الفهرس خفيفة في localStorage. */
import {S,pack,loadState,edit,editFailed} from "../core/state.js";
import {snapPut,snapGet,snapDel,mode} from "./store.js";

/* ═══ هجرة المفتاح من الاسم القديم — دفعة 3.9 ═══
   كسابقتها في ui/store.js وtools/registry.js وai/net.js:
   النسخ لا النقل، والقديم يبقى نسخةً احتياطية صامتة لا تُقرَأ ولا
   يُكتَب فيها. وشرطُ الهجرة: توجد نسخةٌ قديمة ولا توجد جديدة —
   الجديدُ الموجود لا يُكتَب فوقه أبداً.
   وكانت هذه الوحدة تكتب مباشرةً في «mistar.snaps» — الاسمُ الوحيد
   في مسار اللقطات النشط الذي بقي بلا هجرة رغم أن io/store.js يقرأ
   الاسم القديم نفسه (snapIds) لغرضٍ مختلف تماماً: نقل مثيلات
   IndexedDB من قاعدة mistar القديمة، لا فهرس localStorage. */
const K="civildraft.snaps";
const OLD_K="mistar.snaps";
let MIGD=false;
function migrateKey(){
 if(MIGD)return; MIGD=true;
 if(typeof localStorage==="undefined")return;
 try{
  if(localStorage.getItem(K)!==null)return;
  const v=localStorage.getItem(OLD_K);
  if(v!==null)localStorage.setItem(K,v);
 }catch(e){}
}
export const SNAP={max:12,list:[]};
const read=()=>{
 migrateKey();
 try{const a=JSON.parse(localStorage.getItem(K)||"[]");return Array.isArray(a)?a:[]}
 catch(e){return []}
};
const write=a=>{try{localStorage.setItem(K,JSON.stringify(a))}catch(e){}};
export const snapList=()=>SNAP.list.slice();
/* 45+46: snapsLoad تبقى متزامنة (يناديها app.js وpalette.js بلا await ويقرؤون
   القائمة فوراً)؛ والتنظيف يجري في الخلفية بعدها عبر snapsClean. */
export const snapsLoad=()=>{
 SNAP.list=read();
 snapsClean().catch(()=>{});
 return SNAP.list;
};
/* يحذف من الفهرس ما لا مخزنَ له. لا يُنظَّف شيء إن لم يكن IndexedDB متاحاً:
   snapGet ترجع null حينها لكل لقطة، فالتنظيف كان سيمحو فهرساً سليماً
   كلَّه لمجرد أن القاعدة لم تُفتح (سقف الفتح 5 ث). */
export async function snapsClean(){
 const dead=new Set();
 let checked=false;
 for(const e of SNAP.list.slice()){
  if(!e||!e.id){ dead.add(e); continue; }
  let d=null;
  try{ d=await snapGet(e.id); }catch(err){ return {ok:0,err:"تعذّر القراءة"}; }
  /* mode() لا تُحسَم إلا بعد أوّل استدعاءٍ فعليّ (open() كسولةٌ داخل
     snapGet) — فحصها قبل أيّ await هنا كان يقرأها "?" دائماً ويُسقِط
     فهرساً سليماً. نفحصها فور أول نتيجة، لا قبل الحلقة ولا بعدها كلّها،
     فنوفّر بقية الاستعلامات إن لم يكن IndexedDB متاحاً دون أن نُخاطر
     بقراءةٍ سابقةٍ لأوانها. */
  if(!checked){
   checked=true;
   if(mode()!=="idb")return {ok:0,err:"IndexedDB غير متاح — لا تنظيف"};
  }
  if(!d)dead.add(e);
 }
 if(!dead.size)return {ok:1,dropped:0};
 SNAP.list=SNAP.list.filter(x=>!dead.has(x));   /* لا يمسّ ما التُقط أثناء الفحص */
 try{ write(SNAP.list); }catch(e){}
 return {ok:1,dropped:dead.size};
}
export async function snapTake(why){
 if(!S.walls.length&&!S.areas.length)return {ok:0,err:"فارغ"};
 const id="s"+Date.now()+"_"+Math.random().toString(36).slice(2,6);
 try{
  const r=await snapPut(id,pack());
  if(!r.ok)return r;
 }catch(e){ return {ok:0,err:(e&&e.message)||"خطأ"}; }
 SNAP.list.unshift({id,t:Date.now(),why:String(why||"يدوية").slice(0,40),
  w:S.walls.length,o:S.opens.length,a:S.areas.length});
 while(SNAP.list.length>SNAP.max){
  const old=SNAP.list.pop();
  try{ await snapDel(old.id); }catch(e){}
 }
 try{ write(SNAP.list); }catch(e){}
 return {ok:1,id};
}
export async function snapRestore(id){
 let d=null;
 try{ d=await snapGet(id); }catch(e){ return {ok:0,err:"تعذّر القراءة"}; }
 if(!d||!Array.isArray(d.walls))return {ok:0,err:"اللقطة مفقودة"};
 let ok=false;
 try{ edit(()=>{loadState(d,false); ok=true;},"استعادة لقطة"); }
 catch(e){ return {ok:0,err:(e&&e.message)||"تعذّر التطبيق"}; }
 if(!ok||editFailed())return {ok:0,err:"تعذّر التطبيق"};
 return {ok:1,w:d.walls.length};
}
export async function snapDrop(id){
 try{ await snapDel(id); }catch(e){}
 SNAP.list=SNAP.list.filter(x=>x.id!==id);
 try{ write(SNAP.list); }catch(e){}
}
let T=null,lastV=-1;
export function snapAutoStart(min){
 if(T)clearInterval(T);
 lastV=S.__ver;
 T=setInterval(()=>{
  if(S.__ver===lastV)return;
  lastV=S.__ver;
  snapTake("تلقائية").catch(()=>{});   /* 47+48: لا Promise مرفوض من المؤقت */
 },Math.max(2,+min||10)*60000);
}
// للاختبارات: إيقاف المؤقت
export function snapAutoStop(){
 if(T){ clearInterval(T); T=null; }
}
