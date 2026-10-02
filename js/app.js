/* ═══ نقطة الدخول ═══
   يوصّل الطبقات، يستعيد آخر مشروع، ويربط المفاتيح.
   لا نظام سكربت: سطر الإدخال يقبل إحداثيات وأسماء أدوات فقط. */

import {SAFE,fatal,bootOk} from "./bootguard.js";
import {errMsg} from "./core/escape.js";

import "./tools/draw.js";
import "./tools/sketch.js";
import "./tools/openings.js";
import "./tools/parts.js";
import "./tools/roof.js";
import "./tools/areas.js";
import "./tools/modify.js";
import "./tools/annotate.js";
import "./tools/ref.js";
import "./tools/boq.js";
import "./tools/boqreport.js";
import "./tools/elev.js";
import "./tools/section.js";
import "./tools/sheet.js";
import "./tools/clouds.js";
import "./tools/groups.js";
import "./tools/macros.js";
import "./ui/hygiene.js";
import "./ui/gate.js";
import "./ui/levelManager.js";
import "./ui/styleManager.js";
import {refreshUnderlayPanel} from "./ui/underlayPanel.js";
import {refreshPricingPanel} from "./ui/pricingPanel.js";
import "./ui/view3d.js";
import {installDefaults as installBlockDefaults}
 from "./core/blocks.js";
import {initBlockTool} from "./tools/blocks.js";
import {initBlockPanel,toggleBlockPanel}
 from "./ui/blockpanel.js";
import "./ui/appcmds.js";      /* أوامر التطبيق النصية (مرحلة الربط) */
import "./ui/viewcmds.js";     /* أوامر المناظر المسمّاة */
import {installDefaults as installTemplateDefaults,apply as applyTemplate}
 from "./core/templates.js";
import {onChange as onUnderlayChange,onWarn as onUnderlayWarn}
 from "./core/underlay.js";
import {BLK_LAY} from "./core/laydef.js";
import {loadCode} from "./core/code.js";
import {jrAdd,jrTaint} from "./core/journal.js";
import {snapsLoad,snapAutoStart} from "./io/snaps.js";
import {wirePalette,extendPalette} from "./ui/palette.js";
import {wireTour,tourMaybe,tourStart} from "./ui/tour.js";
import {initWelcome} from "./ui/welcome.js";
import {createHelpBot} from "./ui/helpbot.js";
import {mountHelpButton} from "./ui/helpbutton.js";
/* هجرة الحفظ التلقائي الثانوي — لمرّة واحدة، ثم صمت. لا نظامَ
   ثانياً بعد اليوم؛ الأساسي في state.js + io/store.js يكفي. */
import {migrateAutosave} from "./core/migrate-autosave.js";

import {S,restore,setAfterEdit,setSaveError,setRefLost,saveNow,
        saveResume,saveMode,undo,redo,touch,autosave,ensureShape,shapeNotes,
        edit,editFailed,pack,loadState} from "./core/state.js";
import {clamp} from "./core/units.js";
import {osSummary,MODES} from "./core/osnap.js";
import {showAll} from "./core/layers.js";
import * as R from "./tools/registry.js";
import {resize,draw,fit,cv,setShift,delSel,setSel,
        selList,hitTest,UI,V} from "./ui/canvas.js";
import {buildTools,buildOptbar,syncOptbar,syncTools} from "./ui/optbar.js";
import {buildSide,loadForms,wireForms,refresh,renderProps,
        rep,eInfo,syncToggles} from "./ui/props.js";
import {wireInspector,runInspect,clearFindings} from "./ui/inspector.js";
import {wireDefaults,renderDefaults,syncDefaults} from "./ui/defaults.js";
import {wireAI} from "./ui/ai.js";
import {HOOK} from "./ui/bus.js";
import {loadUI,uiSet,UIS,setUiError} from "./ui/store.js";
import {mountIcons} from "./ui/icons.js";
import {buildRibbon,buildQAT,setTab,syncRibbon,
        syncRibbonTogs,invalidateSync} from "./ui/ribbon/render.js";
import {wireRibbon,setShell,setClean,setTheme,ribbonSel,
        autoFit,ktOn,revealSec,runSpec,ACT} from "./ui/ribbon/wire.js";
import {guideRegister} from "./guide/wire.js";
import {wireAppMenu} from "./ui/appmenu.js";
import {initDock,wsApply,dockStats} from "./ui/dock.js";
import {WS} from "./ui/layout.js";
import {wireStatus,syncStatus,buildStatus} from "./ui/statusbar.js";
import {initLevelBar} from "./ui/levelbar.js";
import {wireNav,syncNav,runNav,viewSave} from "./ui/navbar.js";
import {wireOverlay,syncOverlay} from "./ui/overlay.js";
import {setTheme as setCanvasTheme} from "./ui/canvas.js";
import {wireCmd,applyCmd,cmdMenuClose} from "./ui/cmdline.js";
import {wireDyn,syncDyn} from "./ui/dyninput.js";
import {wireCtx,ctxOpen} from "./ui/ctxmenu.js";
import {wireQuick,quickSel} from "./ui/quickprops.js";
import {initHistoryPanel,refreshHistoryPanel} from "./ui/historypanel.js";
import {help} from "./ui/helppan.js";
import {initSugg} from "./ui/sugg.js";
import {initKeymap,rbToggle} from "./ui/keymap.js";
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
/* ═══ سطر الإدخال ═══ مُعرَّفة هنا (قبل build) كي تكون جاهزةً حين
   يستدعيها build() عبر initSugg/initKeymap — لا اعتماد دائريّ. */
const cl=$("#clIn"), clP=$("#clPrompt"), clL=$("#clLive"),
      clSug=$("#clSug");

/* ═══ البناء ═══
   مخزن الواجهة أوّلاً: wirePanels يقرأ منه حالة الأقسام، والقشرة
   تُبنى بعد اللوحة الجانبية لأن الوكالة تنقر أزرارها.
   مرحلة البناء ملفوفةٌ بمصيدة: عطبٌ في أي نداءٍ هنا يُقال بسببه
   المرئيّ بدل أن يُسقط تقييم الوحدة كلّها فتبقى شاشةٌ بيضاء صامتة. */
function build(){
 const bm=document.getElementById("bootMsg");
 if(bm)bm.remove();

 const uiLoaded=loadUI(SAFE);
 loadCode();
 snapsLoad();
 mountIcons();

 /* ═══ الناقل ═══ أوّلاً — التوصيل ينادي report وprompt وtoggles،
    فلا يجوز أن تُملأ الخطّافات بعده. */
 HOOK.props=()=>{renderProps(); ribbonSel(); quickSel()};
 HOOK.refresh=r=>refresh(!!r);
 HOOK.status=m=>eInfo(m);
 HOOK.report=(c,m)=>rep(c,m);
 HOOK.prompt=()=>syncPrompt();
 HOOK.toggles=()=>{syncToggles();renderOsPop();syncRibbonTogs();
  syncStatus();syncNav();syncOverlay()};
 HOOK.help=()=>help();
 HOOK.defs=()=>syncDefaults();
 HOOK.ctx=(x,y)=>ctxOpen(x,y);
 /* سطح العمل يحمل القشرة والتبويب، وdock.js لا يعرفهما — فيُبلّغ */
 HOOK.ws=w=>{
  if(w.shell&&w.shell!==UIS.shell)setShell(w.shell);
  if(w.tab)setTab(w.tab);
  if((w.clean?1:0)!==(UIS.clean?1:0))setClean(w.clean?1:0);
  syncRibbonTogs();
 };
 HOOK.clean=v=>setClean(!!v);      /* مالكٌ واحد للشاشة النظيفة */

 R.H.draw=draw;
 R.H.rep=(c,m)=>rep(c,m);
 R.H.prompt=()=>syncPrompt();
 R.H.refresh=()=>refresh(false);
 R.H.hit=(x,y,k)=>hitTest(x,y,k);
 R.H.sel=()=>selList();
 R.H.setSel=l=>setSel(l||[],null);
 R.H.del=()=>delSel();

 /* ═══ تتبّع الاستخدام الفعلي + تلميح سياقي — مرحلة ٩أ، 16.2+16.3 ═══
    خطّافٌ واحدٌ لا نداءان منفصلان لـH.begin: يسجّل أول استخدامٍ حقيقي
    لكل أداة (usage.js، طبقةٌ فوق coverage() لا بديلاً عنها)، وعند أول
    استخدامٍ فعلي يظهر تلميحٌ خفيف في السجلّ يوجّه إلى الدليل التعليمي
    (Ctrl+K) دون فتح floater.js تلقائياً — لا مقاطعة للعمل.
    loadUsage() تُنادى مرّةً واحدة هنا عند الإقلاع (لا داخل الخطّاف
    نفسه) فلا تُعاد قراءة localStorage مع كل begin. */
 import("./guide/usage.js").then(U=>{
  U.loadUsage();
  R.H.begin=d=>{
   if(U.markUsed(d.id)){
    rep("in",`أداة «${d.label||d.id}» — الدليل التعليمي (Ctrl+K) فيه شرحها الكامل`);
   }
  };
 });

 /* ═══ الدليل التعليمي — G4 ═══ يُسجَّل بعد اكتمال HOOK وR.H
    (يعتمد عليهما زرّ «جرّب في مشروعي» وActions.guide)، وقبل أي
    استعمالٍ لـpalette أو الشريط. حقنٌ من app.js وحده — فلا دورة
    استيراد guide↔ui. */
 guideRegister({ACT,R,HOOK,extendPalette});

 /* ═══ هجرة الحفظ التلقائي الثانوي ═══
    كانت هذه المساحة تُنشئ createAutosave فتتنازع مع النظام الأساسي
    (كتابةٌ مزدوجةٌ كلَّ ثماني ثوانٍ، وحوارُ استعادةٍ قد يعرض نسخةً
    أقدم فيطرد آخرَ عملٍ سليم). وبعد المراجعة: الأساسي يكفي، ولم
    يبقَ من الثانويّ إلا هجرةُ لقطةٍ قديمةٍ لمرّةٍ واحدة — تنقل
    mistar.autosave إلى civildraft.autosave ثم تصمت. */
 migrateAutosave().then(r=>{
  if(r&&r.from)rep("in","نُقلت نسخةٌ احتياطية قديمة "
   +"إلى المخزن الجديد — لا تُستَخدَم تلقائياً.");
 });

 setAfterEdit(reload=>{
  try{refresh(!!reload)}
  catch(e){rep("er","تحديث الواجهة: "+errMsg(e))}
  refreshHistoryPanel();
  refreshUnderlayPanel();   /* التراجع والإعادة لا يمرّان بإشعار الصورة */
  refreshPricingPanel();    /* الكميّات خلف لوح التسعير تتبدّل بالتراجع */
 });
 setSaveError(onSaveFail);          /* دالّةٌ مُعرَّفة أدناه */
 /* المرجع خارج التاريخ: نسخةٌ تجاوزت الحدّ فزالت — يُقال ولا
    تُخترَع كياناتٌ، والرسم سليم */
 setRefLost(()=>rep("wr","المرجع المستورد لم يعد في متناول "
  +"التراجع — أعِد استيراده إن احتجتَه. رسمك سليم."));
 /* تفضيلات الواجهة: الفشل يُقال لحظةَ وقوعه لا في الإقلاع التالي */
 setUiError(n=>rep("wr","تعذّر حفظ تفضيلات الواجهة"
  +((n==="QuotaExceededError")?" — التخزين ممتلئ":(n?` — ${n}`:""))
  +" · تخطيط اللوحات والمناظر لن يبقى بعد إغلاق الصفحة. "
  +"امسح ما لا تحتاجه من «CivilDraft ← امسح كل ما هو محفوظ محلّياً»."));

 /* ═══ التوصيل ═══ */
 setCanvasTheme(UIS.theme);   /* يضبط data-theme ويُبطل كاش النقوش */
 document.documentElement.dataset.shell=UIS.shell;
 buildTools();
 buildSide();
 wireForms();
 wireInspector();
 R.loadOpts();
 wireDefaults();
 initDock();      /* بعد buildSide: يحصد الأقسام ويوزّعها بالتخطيط */
 wireAI();
 buildOptbar();
 buildQAT();
 wireAppMenu();
 wireRibbon();
 wireStatus();
 initLevelBar();
 wireNav();
 wireOverlay();
 wireCmd();
 wireDyn();
 wireCtx();
 wireQuick();
  wirePalette();
  wireTour();
  initSugg({cl,clSug,syncPrompt});
  initKeymap({cl,syncPrompt});

 /* ═══ روبوت الإرشاد ═══ إضافيٌّ ومستقلٌّ عن لوحة المرجع الثابتة
    (#helpBox / F1 / #bHelp أعلاه) — زرٌّ منفصل في الشريط يفتح
    دردشةً تشرح الأدوات وتُفعِّلها. R.begin يقبل id الأداة مباشرةً،
    فلا حاجة لتخمين اسم دالّة الدخول. */
 const helpBot=createHelpBot({activate:toolId=>R.begin(toolId)});
 mountHelpButton({onClick:()=>helpBot.toggle()});

 initHistoryPanel();
 installBlockDefaults();
 installTemplateDefaults();
 initBlockPanel();
 initBlockTool({
  addInstance:inst=>{(S.blocks||(S.blocks=[])).push(inst)},
  redraw:()=>draw(),
  snap:w=>[Math.round(w[0]),Math.round(w[1])],
  defaultLayer:BLK_LAY
 });
 onUnderlayChange(()=>{draw(); refreshUnderlayPanel()});
 /* تحذيرُ حجمٍ من underlay.js (رفض تحميل أو خطر تخزين احتياطيّ)
    يُعرَض كما تُعرَض أخطاء الحفظ — سطرٌ في الترويسة، لا حوار. */
 onUnderlayWarn(m=>rep("er",m));
 /* القشرة آخراً */
 setShell(UIS.shell);
 if(UIS.clean)setClean(1);
 /* أول تشغيلٍ بلا تفضيلات محفوظة: سطحُ «معماري» — لوحاتُ رسمٍ
    وتفتيشٍ أهونُ من التخطيط الكامل، ويغيّرها المستخدم متى شاء. */
 if(!SAFE && !uiLoaded && !UIS.wsCur){
  wsApply("arch",1);
 }
 /* PWA (41): وضع الإنقاذ لا يسجّل عاملاً — الإنقاذ يعني «بلا كاش ولا
    حالةٍ محفوظة». العطب هنا لا يمسّ الإقلاع. */
 if(!SAFE&&typeof navigator!=="undefined"&&"serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{});
 }
 autoFit();
}
function useTemplate(name){
 const r=applyTemplate(name);
 if(!editFailed()&&r){rep("ok","طُبّق القالب");draw();refresh(false)}
}
try{build()}
catch(e){
 fatal((e&&e.stack)?String(e.stack).split("\n").slice(0,4).join("\n")
  :errMsg(e),"بناء الواجهة");
}
/* الحفظ التلقائي يُبلّغ عن فشله مرّةً — الصمت هو ما كان يفقد
   المستخدمَ جلستَه بلا كلمة */
let saveWarned=false;
function onSaveFail(r){
 if(saveWarned)return;
 saveWarned=true;
 rep("er","الحفظ التلقائي وقع"
  +((r.err==="QuotaExceededError")?" — التخزين ممتلئ":
    (r.err?` — ${r.err}`:""))
  +(r.refs?` · المرجع ${r.refs} كياناً`:"")
  +" · احفظ المشروع ملفّ (Ctrl+S) عشان تطمّن، ورسمك سليم.");
}
export function syncPrompt(){
 const q=R.promptText();
 const p=(q.tool?q.tool+" · ":"")+q.p;
 if(clP.textContent!==p)clP.textContent=p;
 const lv=q.live||"";
 if(clL.textContent!==lv)clL.textContent=lv;
 const hn=$("#stHint");
 const h=R.active()
  ? (R.T.def.hint||"")+" · Esc يلغي"
  : "لا أداة نشطة · انقر لتحديد · اسحب إطاراً على الفراغ";
 if(hn&&hn.textContent!==h)hn.textContent=h;
 syncTools();
 syncRibbon();
 syncDyn();
 syncOptbar();   /* لا buildOptbar: تُنادى مع كل حركة مؤشّر */
}
/* ═══ الأدوات والأزرار ═══ */
$("#tools").addEventListener("click",e=>{
 const b=e.target.closest("button");
 if(!b)return;
 if(b.id==="bUndo"){
  const ok=undo(); if(ok)jrTaint("تراجع");   /* كمفتاح Ctrl+Z: لا يُعبَّر عنه بسطر */
  rep(ok?"in":"wr","تراجع"); return;
 }
 if(b.id==="bRedo"){
  const ok=redo(); if(ok)jrTaint("إعادة");
  rep(ok?"in":"wr","إعادة"); return;
 }
 if(b.id==="bFit"){fit();eInfo("مُلوئم");return}
 if(b.id==="bHelp"){help();return}
 if(b.id==="bLall"){
  const n=edit(()=>showAll(),"إظهار كل الطبقات");
  if(editFailed())return;
  rep(n?"ok":"in",n?`أُظهرت ${n} طبقة`:"كل الطبقات ظاهرة");
  refresh(false); return;
 }
 const cmd=b.dataset.cmd;
 if(cmd===undefined)return;
 if(cmd==="@insp"){runInspect();return}
 if(!cmd){jrAdd("esc"); R.cancel(true)}
 else{jrAdd(cmd); R.begin(cmd)}
 syncPrompt(); draw(); cl.focus();
});
/* ═══ مفاتيح الحالة ولوحة الالتقاط ═══ rbToggle مستوردةٌ من
   keymap.js الآن — تفويض #status أدناه يستعملها كما هي. */
/* ═══ التفويض بدل الربط المباشر ═══
   الشريط يُبنى ويُعاد بناؤه بالتخصيص، فالربط المباشر يتوقّف صامتاً
   بعد أول إعادة. التفويض لا يتوقّف. */
$("#status").addEventListener("click",e=>{
 /* زرّا الالتقاط والقطبي يفتحان اللوح نفسه — فيه أنماطُه وزاويته */
 const ob=e.target.closest("#osBtn,#polBtn");
 if(ob){
  pop.hidden=!pop.hidden;
  renderOsPop();
  placeOsPop(ob);
  if(!pop.hidden&&ob.id==="polBtn"){
   const i=$("#polInc");
   if(i){i.focus(); i.select()}
  }
  return;
 }
 const b=e.target.closest("[data-rb]");
 if(b){rbToggle(b.dataset.rb); return}
 const a=e.target.closest("[data-act]");
 if(!a)return;
 if(a.dataset.act==="wsMenu")a.dataset.wsx="1";
 runSpec({act:a.dataset.act});      /* مُنفِّذٌ واحد — يُبلِّغ المجهول */
});
/* بطاقة المنظور تشترك في الأفعال نفسها */
$("#stage").addEventListener("click",e=>{
 const a=e.target.closest("[data-act]");
 if(a)runSpec({act:a.dataset.act});
});

const pop=$("#osPop");
function placeOsPop(btn){
 if(pop.hidden||!btn)return;
 const r=btn.getBoundingClientRect();
 const rtl=getComputedStyle(document.documentElement)
  .direction==="rtl";
 const w=pop.offsetWidth||190;
 const x=rtl?(innerWidth-r.right):r.left;
 pop.style.insetInlineStart=Math.round(
  clamp(x,4,Math.max(4,innerWidth-w-4)))+"px";
}
function renderOsPop(){
 if(pop.hidden)return;
 pop.innerHTML=`<h5>أنماط الالتقاط</h5>`
  +MODES.map(m=>`<label><input type="checkbox" data-os="${m.k}"`
   +`${+S.os[m.k]?" checked":""}> ${m.n}</label>`).join("")
  +`<div class="pi">زاوية القطبي <input type="number" id="polInc"
    class="num" min="1" max="90" step="1"
    value="${clamp(parseInt(S.pol.inc,10)||15,1,90)}"> °</div>
   <div class="fr"><button data-osa="all">الكل</button>
    <button data-osa="none">لا شيء</button></div>`;
}
pop.addEventListener("change",e=>{
 const t=e.target;
 if(t.dataset.os){
  S.os[t.dataset.os]=t.checked?1:0;
  touch(); autosave(); draw();
  eInfo("الالتقاط: "+osSummary());
  return;
 }
 if(t.id==="polInc"){
  S.pol.inc=clamp(parseInt(t.value,10)||15,1,90);
  touch(); autosave(); draw();      /* الخطوط تتبع الزاوية */
  eInfo(`التتبّع القطبي كل ${S.pol.inc}°`);
 }
});
pop.addEventListener("click",e=>{
 const a=e.target.dataset.osa;
 if(!a)return;
 MODES.forEach(m=>{S.os[m.k]=(a==="all")?1:0});
 touch(); renderOsPop(); autosave(); draw();
 eInfo("الالتقاط: "+osSummary());
});
addEventListener("mousedown",e=>{
 if(pop.hidden)return;
 if(!pop.contains(e.target)&&!e.target.closest("#osBtn,#polBtn"))
  pop.hidden=true;
},true);

/* ═══ الإقلاع ═══ */
addEventListener("resize",resize);
/* IndexedDB لا يُعتمَد عليه عند الإغلاق — كتابةٌ متزامنة هنا */
document.addEventListener("visibilitychange",()=>{
 if(document.hidden)saveNow();
 else saveResume();          /* عادت الصفحة: الحفظ الآجل يعمل */
});
addEventListener("beforeunload",()=>saveNow());

(async function boot(){
 let had=false;
 if(SAFE)rep("wr","شغّال في وضع الإنقاذ: الجلسة والتفضيلات متحمّلوش. "
  +"المحفوظ في مكانه زي ما هو — شيل ?safe وارجع عادي.");
 else{
  try{had=await restore()}
  catch(e){rep("er","تعذّر استعادة الجلسة: "+errMsg(e))}
 }
 ensureShape();
 /* ما قوّمته ensureShape عند التحميل (قوسٌ استُقيم، فتحةٌ طُرحت):
    يُقال ولا يُخفى — شفافية المشروع نفسها في warcnoelev وdtxt وastale. */
 shapeNotes().forEach(([sev,msg])=>rep(sev,msg));
 loadForms();
 clearFindings();
  if(!SAFE)snapAutoStart(10);
 refresh(true);
 /* تحسينٌ اختياريّ: استيرادٌ ديناميكيّ كي لا يُسقط غيابُ الملفّ (نسخةٌ
    ناقصة/كاش قديم) الإقلاعَ كلّه — يُسجَّل تحذيراً ويُكمل التطبيق. */
 import("./ui/viewport.js").then(m=>m.initViewport())
  .catch(e=>console.warn("[viewport] تعذّر تحميل تحسين الهاتف:",e&&e.message));
 resize();
 if(had){
  fit();
  rep("in",`أهلين من جديد — جلسة فاتت لسه محمّلة: ${S.walls.length} جدار · `
   +`${S.opens.length} فتحة · ${S.areas.length} منطقة`
   +((S.ref&&S.ref.ents&&S.ref.ents.length)
     ?` · مرجع ${S.ref.ents.length} كياناً`:""));
  /* العائد قد يكون كائناً — الترميم يحمل عدد ما رُمِّم */
  const via=(had&&had.via)||had;
  if(via==="migrate")rep("ok","نُقلت الجلسة إلى IndexedDB — "
   +"لا حدَّ ٥ م.ب بعد الآن");
  if(via==="healed")rep("wr","آخر إغلاقٍ لم يتّسع للمرجع في "
   +`الحفظ السريع، فرُمِّم من النسخة الكاملة (${had.refs} كياناً). `
   +"رسمك من الأحدث والمرجع من الأسبق — راجعه إن كنت حاذيتَه "
   +"قُبيل الإغلاق.");
 }else{
  V.k=0.05; V.cx=6000; V.cy=4000;
  draw();
  rep("in","أهلاً بيك! ابدأ بأول نقطة جدار، أو لو حابّ تجرّب "
   +"اكتب 3×4 واضغط Enter. وF1 فيها كل حاجة.");
  /* ═══ لا حوارَ استعادةٍ ثانياً ═══
     كانت هذه المساحة تسأل عن نسخةٍ احتياطيةٍ ثانويةٍ إن لم يُعِد
     الأساسيّ شيئاً. وبعد إزالة النظام الثانوي لم يبقَ سؤال: الأساسيّ
     يعرف جلسته، واللقطةُ القديمةُ صارت صامتةً في مخزنها الجديد،
     ومن احتاجها ناداها بيده (peekOldAutosave). */
 }
 if(saveMode()==="ls")rep("wr","IndexedDB غير متاح — الحفظ "
  +"التلقائي في localStorage بحدّ ٥ م.ب، ومرجعٌ كبير قد لا يُحفَظ. "
  +"احفظ ملفّاً بين حينٍ وحين.");
 ribbonSel();
 syncRibbonTogs();
 if(UIS.wsCur)rep("in",
  `سطح العمل: ${(WS[UIS.wsCur]&&WS[UIS.wsCur].n)||UIS.wsCur}`);
 syncPrompt();
 cl.focus();
  /* البطاقةُ الافتتاحيةُ تُلغي الجولةَ التلقائيةَ ساعةَ ظهورها:
     لا تراكبَ وصفي افتتاح. «جولة سريعة» تُعيدها يدوياً. */
  const welcoming=initWelcome({
   safe:SAFE,
   startWall:()=>{R.begin("wall"); syncPrompt(); draw(); cl.focus()},
   openDxf:()=>runSpec({act:"rImp"}),
   useTemplate,
   openTour:()=>tourStart()
  });
  if(!welcoming)tourMaybe(SAFE,had);
  bootOk();
})().catch(e=>fatal(errMsg(e),"الإقلاع"));
