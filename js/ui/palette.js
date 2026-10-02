/* ═══ لوحة الأوامر ═══
   فهرس واحد للأدوات والأفعال والمقاسات والقوالب وسجلّ الأوامر. */
import * as R from "../tools/registry.js";
import {allItems} from "./ribbon/schema.js";
import {runSpec,setClean,setTheme} from "./ribbon/wire.js";
import {HOOK} from "./bus.js";
import {SIZES,TPL,applySize} from "../tools/presets.js";
import {parsePlan,planReady} from "../ai/plan.js";
import {trial,commit,rollback} from "../ai/run.js";
import {V,fit} from "./canvas.js";
import {JR,jrText,jrPlan,jrClear,jrCount,jrTainted,jrMute} from "../core/journal.js";
import {snapTake,snapList,snapRestore,snapsLoad} from "../io/snaps.js";
import {escapeHtml as esc} from "../core/escape.js";
import {norm,toLat,score} from "./searchcommon.js";
import {UIS} from "./store.js";
import {undo,redo,editFailed} from "../core/state.js";
import {apply as applyTemplate} from "../core/templates.js";
import {setImage as setUnderlayImage,MAX_SRC as UNDERLAY_MAX_SRC}
 from "../core/underlay.js";
import {toggleHistoryPanel} from "./historypanel.js";
import {toggleBlockPanel} from "./blockpanel.js";
import {macroList,macroCount,delMacro,recActive} from "../core/macros.js";
import {playMacro} from "../ai/macrorun.js";
import {toggleRecord} from "../tools/macros.js";
/* اتجاهٌ واحد فقط: palette يستورد guideOpen لفتح نتيجة الدليل عند
   النقر. guide/wire.js لا يستورد palette.js بالمقابل (يتلقّاها
   حقناً عبر extendPalette من app.js) — فلا دورة. */
import {guideOpen} from "../guide/wire.js";

const $=s=>document.querySelector(s);
let BODY=null,NT=-1,LIST=[],IDX=0,OPEN=0;
const box=()=>$("#palette");
/* ═══ إقحام الدليل — G4 ═══
   entries: مدخلات guide/catalog تُدفَع كـkind:"guide". extendPalette
   إضافةٌ وحيدة نظيفة لا تعيد كتابة الملف — انظر قرار المرحلة ١. */
let EXTRA=null;
export function extendPalette(entries){
 EXTRA=entries;
 NT=-1;                 /* يُبطل كاش build() ليُعاد البناء فيه الدور القادم */
}
function build(){
 const n=R.toolList().length;
 if(BODY&&n===NT)return BODY;
 NT=n; const out=[];
 R.toolList().filter(d=>d&&d.id).forEach(d=>{
  const al=Object.keys(R.TOOLS).filter(k=>R.TOOLS[k]===d&&k!==d.id);
  out.push({kind:"cmd",key:d.id,label:d.label,sub:[d.id,...al].join(" · "),
   hay:norm([d.id,d.label,...al,d.hint||""].join(" ")),
   destruct:!!d.destruct});
 });
 const seen=new Set(["delSel"]);
 allItems().filter(i=>(i.act||i.cmd)&&!seen.has(i.act||i.cmd)).forEach(i=>{
  const key=i.act||i.cmd; seen.add(key);
  out.push({kind:i.act?"act":"cmd",key,label:i.n||key,sub:"أمر",
   hay:norm(`${i.n||""} ${key}`)});
 });
 SIZES.forEach(p=>out.push({kind:"size",key:p.id,ref:p,label:p.label,
  sub:`${p.sub} · ${p.tool}`,hay:norm(`${p.label} ${p.cat} ${p.sub} ${p.tool}`)}));
 TPL.forEach(t=>out.push({kind:"tpl",key:t.id,ref:t,label:t.label,sub:t.sub,
  hay:norm(`${t.label} ${t.sub} قالب`)}));
 const fn=[
  {key:"jr.copy",label:"سجلّ الأوامر: انسخه",sub:"نصّ أسطرٍ بنحو سطر الإدخال",fn:jrCopy},
  {key:"jr.replay",label:"سجلّ الأوامر: أعِد تشغيله",sub:"يُنفَّذ على الحالة الجارية",fn:jrReplay},
  {key:"jr.clear",label:"سجلّ الأوامر: امسحه",sub:"يبدأ التسجيل من الآن",fn:()=>{
   jrClear();HOOK.report("in","مُسح سجلّ الأوامر");
  }},
  {key:"macro.rec",label:"ماكرو: ابدأ/أوقف التسجيل",
   sub:"يحفظ ما تنفّذه بين المرّتين · المشوب يُرفَض",
   fn:()=>{toggleRecord(); HOOK.prompt()}},
  {key:"macro.list",label:"ماكرو: شغّل…",sub:"خطوة تراجعٍ واحدة لكل تشغيل",
   fn:()=>paletteMacros(0)},
  {key:"macro.del",label:"ماكرو: احذف…",sub:"يُسأل قبل الحذف",
   fn:()=>paletteMacros(1)},
  {key:"snap.now",label:"لقطة الآن",sub:"نسخة كاملة تعبر إغلاق الصفحة",fn:snapNow},
  {key:"snap.list",label:"استعادة لقطة…",sub:"آخر ١٢ لقطة · الاستعادة خطوة تراجع",fn:paletteSnaps},
  {key:"ribbon.edit",label:"تخصيص الشريط",sub:"إخفاء/إعادة تسمية/ترتيب",
   fn:()=>import("./ribbon/editor.js").then(M=>M.openRibbonEditor())}
 ];
 fn.forEach(f=>out.push({kind:"fn",key:f.key,ref:f,label:f.label,sub:f.sub,hay:norm(f.label+" "+f.sub)}));
 /* D12-EP3: أفعال التطبيق — twelve extras كانت ميتة في cmdpalette.js */
 const app=[
  {key:"app.undo",label:"تراجع",sub:"Ctrl+Z · يرجّع اللي فات",
   aliases:"undo u",
   fn:()=>{if(undo())HOOK.report("in","اتعمل تراجع");
           else HOOK.report("in","مافيش حاجة تتراجع عنها");}},
  {key:"app.redo",label:"إعادة",sub:"Ctrl+Shift+Z",
   aliases:"redo",
   fn:()=>{if(redo())HOOK.report("in","اتعملت إعادة");
           else HOOK.report("in","مافيش حاجة تتعملها إعادة");}},
  {key:"app.save",label:"حفظ",sub:"Ctrl+S · ينزّل ملف المشروع",
   aliases:"save حفظ ملف",
   fn:()=>{const b=document.querySelector("#xSave");
           if(b)b.click();}},
  {key:"app.history",label:"لوحة السجل",sub:"Ctrl+Shift+H · قفز لأي خطوة",
   aliases:"history سجل",
   fn:()=>toggleHistoryPanel()},
  {key:"app.clean",label:"شاشة نظيفة",sub:"Ctrl+0 · يخفي القشرة",
   aliases:"clean screen نظافة",
   fn:()=>setClean(!UIS.clean)},
  {key:"app.theme",label:"تبديل السمة",sub:"Ctrl+Shift+T · داكن/فاتح",
   aliases:"theme سمة",
   fn:()=>setTheme(UIS.theme==="dark"?"light":"dark")},
  {key:"app.fit",label:"ملاءمة العرض",sub:"يظهر الرسم كلّه",
   aliases:"fit zoom fit",
   fn:()=>{fit();HOOK.status("مُلوئم");}},
  {key:"app.blocks",label:"لوحة العناصر",sub:"B · كتل ورموز جاهزة",
   aliases:"blocks عناصر",
   fn:()=>toggleBlockPanel()},
  {key:"app.underlay",label:"تحميل صورة مرجعية",sub:"خلفية للتتبّع والمعايرة",
   aliases:"underlay مرجع صورة",
   fn:()=>chooseUnderlay()},
  {key:"app.tpl-room",label:"قالب غرفة مستطيلة",sub:"قالب جاهز",
   aliases:"room قالب غرفة",
   fn:()=>useTemplate("room")},
  {key:"app.tpl-studio",label:"قالب استوديو",sub:"قالب جاهز",
   aliases:"studio قالب استوديو",
   fn:()=>useTemplate("studio")},
  {key:"app.tpl-office",label:"قالب مكتب",sub:"قالب جاهز",
   aliases:"office قالب مكتب",
   fn:()=>useTemplate("office")},
  {key:"app.tpl-villa",label:"قالب فيلا دور أرضي",sub:"14 × 10 م · أبواب وشبابيك ومناطق",
   aliases:"villa قالب فيلا بيت",
   fn:()=>useTemplate("villa")},
  {key:"app.tpl-apt3",label:"قالب شقة ٣ غرف",sub:"12 × 10 م · أبواب وشبابيك ومناطق",
   aliases:"apartment apt flat قالب شقة",
   fn:()=>useTemplate("apt3")}
 ];
 app.forEach(f=>out.push({kind:"fn",key:f.key,ref:f,label:f.label,sub:f.sub,
  hay:norm(`${f.label} ${f.sub} ${f.aliases}`)}));
 if(EXTRA)EXTRA.forEach(g=>out.push({
  kind:"guide",key:"g."+g.id,ref:g,label:g.title,sub:g.sub,
  hay:norm(`${g.title} ${g.sub} ${g.hay}`)}));
 BODY=out; return BODY;
}
function rank(raw){
 const q=norm(raw),qa=norm(toLat(raw));
 return build().map(it=>({it,s:Math.max(score(it.hay,q),qa!==q?score(it.hay,qa):0)}))
  .filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,12);
}
function render(){
 const B=box(); if(!B)return;
 B.querySelector(".pl").innerHTML=LIST.length
  ?LIST.map((x,i)=>`<div class="it${i===IDX?" sel":""}" data-i="${i}">
    <span class="lb">${esc(x.it.label)}${x.it.destruct?' <b class="dg">هادم</b>':""}</span>
    <span class="sb">${esc(x.it.sub)}</span></div>`).join("")
  :`<div class="nm">لا نتيجة</div>`;
}
export function paletteClose(){
 const B=box(); if(!B||!OPEN)return;
 OPEN=0; B.hidden=true; $("#clIn")?.focus();
}
export function paletteOpen(){
 const B=box(); if(!B)return;
 OPEN=1; B.hidden=false; const inp=B.querySelector("input");
 inp.value=""; IDX=0; LIST=build().filter(x=>["wall","rect","door","win","area","dim",
  "move","copy","offset","measure"].includes(x.key)).map(it=>({it,s:1}));
 render(); inp.focus();
}
export const paletteToggle=()=>OPEN?paletteClose():paletteOpen();
export const paletteIsOpen=()=>!!OPEN;
function runTpl(t){
 const at=[Math.round(V.cx/100)/10,Math.round(V.cy/100)/10];
 const p=parsePlan("```plan\n"+t.lines(at).join("\n")+"\n```",1,400);
 if(!planReady(p)){HOOK.report("er",`«${t.label}» مرفوض: `+(p.errs[0]||"سطر غير مفهوم"));return}
 const r=trial(p.lines,{stopOnError:1});
 if(r.errs){rollback(r);HOOK.report("er",`تعذّر «${t.label}» — أُرجع كل شيء`);return}
 const n=commit(r);HOOK.report("ok",`${t.label} · ${n} كياناً · Ctrl+Z يتراجع عنها`);
 HOOK.refresh(1);
}
function jrCopy(){
 const n=jrCount();
 if(!n){HOOK.report("in","السجلّ فارغ");return}
 if(navigator.clipboard?.writeText)
  navigator.clipboard.writeText(jrText()).then(
   ()=>HOOK.report("ok",`نُسخ ${n} سطراً${jrTainted()?" · مشوب":""}`),
   ()=>HOOK.report("er","تعذّر النسخ — المتصفّح منع الحافظة"));
 else HOOK.report("er","الحافظة غير متاحة");
}
function jrReplay(){
 const n=jrCount();
 if(!n){HOOK.report("in","السجلّ فارغ");return}
 if(jrTainted()&&!confirm(`السجلّ مشوب بـ ${jrTainted()} عملية لا يُعبّر عنها بسطر. الإعادة ستختلف. متابعة؟`))return;
 const p=parsePlan(jrPlan(),1,JR.max);
 if(!planReady(p)){HOOK.report("er",`السجلّ غير قابل للإعادة: `+(p.errs[0]||"سطر غير مفهوم"));return}
 jrMute(1); let r=null; try{r=trial(p.lines,{stopOnError:1})}finally{jrMute(0)}
 if(!r||r.errs){if(r)rollback(r);HOOK.report("er","تعذّرت الإعادة — أُرجع كل شيء");return}
 const made=commit(r);HOOK.report("ok",`أُعيد ${r.ran} سطراً · ${made} كياناً`);
 HOOK.refresh(1);
}
/* ═══ D12-EP3: أفعال التطبيق ═══ كانت تُحقَن في cmdpalette.js الميت
   (initCmdPalette {extra}) فأُنشئت ولم تُستدعَ قط. صارت هنا أفعالاً
   محليةً تُبنى في الفهرس نفسه — منفّذُها واحدٌ هو run(). */
function useTemplate(name){
 const r=applyTemplate(name);
 if(!editFailed()&&r){HOOK.report("ok","طُبّق القالب");HOOK.refresh(false)}
}
function chooseUnderlay(){
 const i=document.createElement("input");
 i.type="file"; i.accept="image/*";
 i.onchange=()=>{
  const f=i.files&&i.files[0]; if(!f)return;
  if(f.size>UNDERLAY_MAX_SRC*0.75){
   HOOK.report("er",`الصورة ${(f.size/1e6).toFixed(1)} م.ب — `
    +`الحدّ ${(UNDERLAY_MAX_SRC/1e6).toFixed(0)} م.ب تقريباً. `
    +`صغّرها أو اقتطعها قبل التحميل.`);
   return;
  }
  const r=new FileReader();
  r.onload=()=>{setUnderlayImage(String(r.result||""));
   HOOK.status("حُمّلت الصورة المرجعية")};
  r.onerror=()=>HOOK.report("er","تعذّر قراءة الصورة");
  r.readAsDataURL(f);
 };
 i.click();
}
async function snapNow(){
 const r=await snapTake("يدوية");
 HOOK.report(r.ok?"ok":"wr",r.ok?`أُخذت لقطة · ${snapList().length} من 12 محفوظة`
  :(r.err==="فارغ"?"لا شيء يُلتقط — المشروع فارغ":"تعذّرت اللقطة — IndexedDB غير متاح"));
}
/* قائمة الماكروهات: del=0 تشغيل · del=1 حذف. تُبنى عند الطلب لا في
   كاش build() — فلا تتقادم بإضافة ماكرو أو حذفه. */
export function paletteMacros(del){
 if(recActive()&&!del){HOOK.report("wr","أوقف التسجيل أولاً");return}
 const L=macroList();
 if(!L.length){HOOK.report("in","لا ماكروهات محفوظة — «ماكرو: ابدأ التسجيل» يبدأ أولها");return}
 paletteOpen();
 LIST=L.map(m=>({s:1,it:{kind:del?"macrod":"macro",key:m.name,ref:m,
  label:m.name,sub:`${m.lines.length} سطراً${del?" · حذف":""}`}}));
 IDX=0; render();
}
export function paletteSnaps(){
 paletteOpen(); const L=snapList();
 if(!L.length){HOOK.report("in","لا لقطات بعد — «لقطة الآن» تأخذ أولها");paletteClose();return}
 LIST=L.map(m=>({s:1,it:{kind:"snapr",key:m.id,ref:m,
  label:`${new Date(m.t).toLocaleString("ar")} · ${m.why}`,
  sub:`${m.w} جدار · ${m.o} فتحة · ${m.a} منطقة`}})); IDX=0; render();
}
export function wirePalette(){
 const B=box(); if(!B)return;
 B.innerHTML=`<div class="pw" role="dialog" aria-modal="true" aria-label="لوحة الأوامر">
  <input type="text" spellcheck="false" autocomplete="off" placeholder="اكتب اسم أداة أو أمر…">
  <div class="pl"></div><div class="ft">↑↓ تنقّل · Enter ينفّذ · Esc يغلق</div></div>`;
 B.hidden=true; const inp=B.querySelector("input");
 inp.addEventListener("input",()=>{LIST=rank(inp.value);IDX=0;render()});
 inp.addEventListener("keydown",e=>{
  e.stopPropagation();
  if(e.key==="Escape"){e.preventDefault();paletteClose();return}
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(LIST.length)
   {IDX=(IDX+(e.key==="ArrowDown"?1:-1)+LIST.length)%LIST.length;render()}return}
  if(e.key==="Enter"){e.preventDefault();run(LIST[IDX])}
 });
 B.querySelector(".pl").addEventListener("mousedown",e=>{
  const it=e.target.closest("[data-i]");if(it){e.preventDefault();run(LIST[+it.dataset.i])}
 });
 B.addEventListener("mousedown",e=>{if(e.target===B)paletteClose()});
 snapsLoad();
}
function run(x){
 if(!x)return; paletteClose();
 if(x.it.kind==="macro"){
  const r=playMacro(x.it.ref);
  if(r.ok){HOOK.report("ok",`ماكرو «${x.it.ref.name}» · ${r.ran} سطراً · ${r.made} كياناً — Ctrl+Z يتراجع عنه كلّه`);
   HOOK.refresh(1)}
  else HOOK.report("er",r.error);
  return;
 }
 if(x.it.kind==="macrod"){
  if(!confirm(`حذف الماكرو «${x.it.ref.name}»؟`))return;
  const gone=delMacro(x.it.ref.name);
  HOOK.report(gone?"ok":"er",gone?`حُذف «${x.it.ref.name}» · ${macroCount()} متبقٍّ`
   :"تعذّر الحذف");
  return;
 }
 if(x.it.kind==="cmd"){R.histAdd(x.it.key);R.begin(x.it.key);HOOK.prompt();return}
 if(x.it.kind==="act"){runSpec({act:x.it.key});return}
 if(x.it.kind==="size"){applySize(x.it.ref);HOOK.report("in",`${x.it.label} — انقر الموضع`);HOOK.prompt();return}
 if(x.it.kind==="tpl"){runTpl(x.it.ref);return}
 if(x.it.kind==="fn"){x.it.ref.fn();return}
 if(x.it.kind==="guide"){guideOpen(x.it.ref.id);return}
 if(x.it.kind==="snapr"){
  const m=x.it.ref;
  if(!confirm(`استعادة لقطة ${new Date(m.t).toLocaleString("ar")}؟\nعملك الحالي يُستبدل، و Ctrl+Z يعيده.`))return;
  snapRestore(m.id).then(r=>{if(r.ok){HOOK.report("ok",`استُعيدت اللقطة · ${r.w} جدار`);HOOK.refresh(1)}
   else HOOK.report("er",r.err)});
 }
}