/* ═══ بطاقة الترحيب — أول تشغيل ═══
   تظهر للجلسات الفارغة (بلا جدران ولا مناطق) لمرّة، بزرّي بداية
   كبيرين ورقائق قوالب وجولة. إغلاقُها يُثبَّت في UIS.welcomed —
   تفضيلُ نافذةٍ لا بياناتِ رسم. D12-EP6. */
import {S} from "../core/state.js";
import {UIS,uiSet} from "./store.js";

const $=s=>document.querySelector(s);

export function initWelcome(opts={}){
 const SAFE=!!opts.safe;
 if(SAFE||S.walls.length||S.areas.length||UIS.welcomed)return false;

 const stage=$("#stage");
 if(!stage)return false;

 let root=$("#welcome");
 if(!root){
  root=document.createElement("div");
  root.id="welcome";
  root.setAttribute("dir","rtl");
  stage.appendChild(root);
 }
 root.innerHTML=`<div class="wc">
 <button type="button" class="wc-close" data-wc="close"
  title="إغلاق" aria-label="إغلاق بطاقة الترحيب">✕</button>
 <h3>أهلاً وسهلاً في CivilDraft</h3>
 <p>ابدأ بخطوة بسيطة: ارسم أول جدار، أو حمّل ملفّ DXF كمرجع
  ترسم فوقه. وإن كنت عايز تبدأ بسرعة، جرّب قالب جاهز.</p>
 <div class="wc-actions">
  <button type="button" class="wc-pri" data-wc="wall">
   <span>ارسم أول جدار</span>
   <small>فعّلنا الأداة — انقر وانطلق</small></button>
  <button type="button" class="wc-pri" data-wc="dxf">
   <span>افتح ملفّ DXF</span>
   <small>يُستورد مرجعاً جامداً تحت رسمك</small></button>
 </div>
 <div class="wc-chips">
  <button type="button" class="wc-chip" data-wc="tpl-room">غرفة سريعة</button>
  <button type="button" class="wc-chip" data-wc="tpl-studio">استوديو</button>
  <button type="button" class="wc-chip" data-wc="tpl-office">مكتب</button>
  <button type="button" class="wc-chip" data-wc="tpl-villa">فيلا</button>
  <button type="button" class="wc-chip" data-wc="tpl-apt3">شقة ٣ غرف</button>
  <button type="button" class="wc-chip" data-wc="tour">جولة سريعة</button>
 </div>
</div>`;
 root.hidden=false;

 function close(){
  root.hidden=true;
  uiSet("welcomed",1);
 }

 root.addEventListener("click",e=>{
  /* نقرٌ على الخلفية خارج البطاقة يُغلق كالنقر على ✕ */
  if(!e.target.closest(".wc")){close(); return}
  const k=e.target.closest("[data-wc]")?.dataset.wc;
  if(!k)return;
  if(k==="close"){close(); return}
  if(k==="wall"){close(); if(opts.startWall)opts.startWall(); return}
  if(k==="dxf"){close(); if(opts.openDxf)opts.openDxf(); return}
  if(k==="tour"){close(); if(opts.openTour)opts.openTour(); return}
  if(k.startsWith("tpl-")){
   const name=k.slice(4);
   close();
   if(opts.useTemplate)opts.useTemplate(name);
   return;
  }
 });

 return true;
}
