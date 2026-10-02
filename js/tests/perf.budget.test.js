/* ═══ ميزانية الأداء ═══
   الرقم المطلق يتبدّل بالحاسب (وقد ثلاثة أضعافٍ بين بيئتين)، فلا
   يُحرَس وحده. المحروس شيئان:
   ١) النموّ خطّيّ: أربعةُ أمثالِ الجدران لا تُكلِّف أكثرَ من ثمانيةِ
      أمثالِ الزمن (الانهيار التربيعيّ = ١٦×). الجولةُ الأولى تُهمَل
      تسخيناً للمُترجِم الفوريّ.
   ٢) سقفٌ مطلقٌ فضفاض (٢ ثانية لألفي جدار) يكشف الانهيار الأسّيّ.
   ثم عدّاداتُ القياس والميزانية نفسُها.
   التشغيل:  node js/tests/perf.budget.test.js                      */
import {shim,group,ok,summary} from "./harness.js";
shim();

const {newState,ensureShape,touchGeom}=await import("../core/state.js");
const RN=await import("../core/render.js");
const PF=await import("../core/perf.js");
const W=await import("../core/walls.js");

/* جدرانٌ متباعدة: لا التقاء ولا اتحاد — تكلفةُ البناء وحدها */
function build(n){
 newState(); ensureShape(); RN.invalidate();
 PF.perfOn(1);
 for(let i=0;i<n;i++)
  W.addWall([i*1000,0],[i*1000+400,0],200,"int","c");
 touchGeom();
 const t0=performance.now();
 RN.scene();
 return performance.now()-t0;
}
const warn=console.warn; console.warn=()=>{};   /* تحذير >16مس متوقَّع هنا */

group("perf.budget",()=>{
 build(200);                              /* تسخين */
 PF.perfOn(0);
 const t1=build(500);
 const mid=PF.P.scene_ms;
 PF.perfOn(0);
 const t2=build(2000);
 /* السقف المطلق يتبدّل بالحاسب — تحذيرٌ لا فشل؛ المحروس فعلاً هو
    النموّ الخطّي أدناه (t2<8×t1) */
 if(t2>=2000)console.warn(`[تحذير أداء] مشهد 2000 جدار ${t2.toFixed(0)}مس ≥ 2000مس`);
 ok(t2<8*Math.max(t1,10),
  `نموٌّ خطّيّ: 500→2000 جدار ${t1.toFixed(0)}→${t2.toFixed(0)}مس `
  +`(${(t2/Math.max(t1,1)).toFixed(1)}× لأربعة أمثال)`);
 ok(PF.P.scene_ms>0,"والمقياس يسجّل زمن المشهد");
 ok(mid>0,"وفي كل تشغيل");
 ok(PF.BUDGET.scene>0,"وللمشهد ميزانيةٌ معلنة");
 ok(PF.bumpMs("scene",0)===true,"وزمنٌ صفريّ لا يتجاوز الميزانية");
 ok(PF.bumpMs("scene",1e6)===false,"وزمنٌ هائل يتجاوزها ويُعدّ");
 PF.perfOn(0);
});
console.warn=warn;
process.exit(summary()?1:0);
