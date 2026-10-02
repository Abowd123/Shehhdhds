/* ═══ الخطّ المتعدّد الحرّ — PL ═══
   سلسلة نقاط صريحة (≥2) بانتفاخات اختيارية وخيار إغلاق. كيان مكانيّ
   مستقلّ عن اتحاد الجدران كالسقف، لكنه مفتوح بطبيعته فلا تُغلق
   حلقته قسراً. لا بصمة ولا مشتقّ يُعاد حسابه. */
import {S,touchView} from "./state.js";
import {V} from "./validate.js";
import {newId,clamp} from "./units.js";
import {nearOnSeg,pip,pArea,bboxOf} from "./geom.js";
import {bulgeArc,inSweep} from "./arcmath.js";
import {normLevel} from "./level.js";

const R=v=>Math.round(v);
const dist_pt=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
export const plineById=id=>S.plines.find(p=>p.id===id)||null;

/* طول المسار الحقيقي — الأقواس بمداها لا بوترها */
export const plineLen=p=>{
 const P=(p&&p.pts)||[], n=P.length;
 let s=0;
 for(let i=0;i+1<n;i++){
  const a=P[i], b=P[i+1];
  const bg=(p.bulge&&p.bulge[i])?+p.bulge[i]:0;
  const A=bulgeArc(a,b,bg);
  s+=A?A.r*Math.abs(A.sweep):dist_pt(a,b);
 }
 if(p&&p.closed===1&&n>2){
  const bg=(p.bulge&&p.bulge[n-1])?+p.bulge[n-1]:0;
  const A=bulgeArc(P[n-1],P[0],bg);
  s+=A?A.r*Math.abs(A.sweep):dist_pt(P[n-1],P[0]);
 }
 return s;
};
/* صندوق الامتداد الكامل — كل الرؤوس، موسَّعاً بأكبر سهمٍ لقوسٍ فيه (سهم
   القوس = |bulge|·الوتر/2). الفهرس المكانيّ يرشّح به فلا يفوته رأسٌ أوسط. */
export const plineBox=p=>{
 const P=(p&&p.pts)||[];
 const B=bboxOf(P);
 if(!B)return null;
 let sag=0;
 const n=P.length, m=(p.closed===1&&n>2)?n:n-1;
 for(let i=0;i<m;i++){
  const bg=(p.bulge&&p.bulge[i])?Math.abs(+p.bulge[i]):0;
  if(bg)sag=Math.max(sag,bg*dist_pt(P[i],P[(i+1)%n])/2);
 }
 return sag?{x0:B.x0-sag,y0:B.y0-sag,x1:B.x1+sag,y1:B.y1+sag}:B;
};
export const plineArea=p=>(p&&p.closed===1&&(p.pts||[]).length>2)
 ? Math.abs(pArea(p.pts)) : 0;

/* تنظيف: يُسقِط المكرّر المتلاصق وحده — لا افتراض إغلاق، ولا رفض هنا
   (الرفض للأقل من نقطتين في addPline) */
function cleanPts(pts,tol){
 const T=Math.max(0,tol||0), a=[];
 (pts||[]).forEach(p=>{
  if(!Array.isArray(p)||!isFinite(p[0])||!isFinite(p[1]))return;
  const q=[R(p[0]),R(p[1])];
  if(a.length&&dist_pt(a[a.length-1],q)<=T)return;
  a.push(q);
 });
 return a;
}

export function addPline(pts,opt){
 const o=opt||{};
 /* يُمرَّر بالمُدقِّق قبل الكتابة — عقد COVER في validate.test.js */
 V("pline",{pts:pts||[],closed:o.closed?1:0,bulge:o.bulge});
 const P=cleanPts(pts,1);
 if(P.length<2)throw new Error("الخطّ المتعدّد يحتاج نقطتين على الأقل");
 const p={id:newId("PL"), pts:P,
  closed:o.closed?1:0,
  level:normLevel(S.meta.level)};
 if(Array.isArray(o.bulge)&&o.bulge.length){
  const bg=o.bulge.slice(0,P.length).map(v=>{
   const b=+v;
   return (!isFinite(b)||Math.abs(b)<1e-4)?0:clamp(b,-8,8);
  });
  if(p.closed===1&&bg.length===P.length&&!bg[P.length-1])bg.pop();
  p.bulge=bg;
 }
 S.plines.push(p); touchView();
 return p;
}
export function delPline(p){
 const i=S.plines.indexOf(p);
 if(i<0)return false;
 S.plines.splice(i,1); touchView();
 return true;
}

/* الإصابة: داخل الحلقة إن أُغلقت، أو بُعدٌ عن القطعة/قوسها */
export const plineAt=(x,y,cand,tol)=>{
 let best=null, bd=(tol==null)?150:tol;
 (cand||S.plines).forEach(p=>{
  const P=p.pts||[], n=P.length;
  if(n<2)return;
  if(p.closed===1&&n>2&&pip(P,x,y)){best=p;bd=0;return}
  const m=p.closed===1?n:n-1;
  for(let i=0;i<m;i++){
   const a=P[i], b=P[(i+1)%n];
   const bg=(p.bulge&&p.bulge[i])?+p.bulge[i]:0;
   const A=bulgeArc(a,b,bg);
   if(!A){
    const d=nearOnSeg(a,b,x,y).d;
    if(d<bd){bd=d;best=p}
   }else{
    const ang=Math.atan2(y-A.cy,x-A.cx);
    if(!inSweep(A,ang))continue;
    const d=Math.abs(Math.hypot(x-A.cx,y-A.cy)-A.r);
    if(d<bd){bd=d;best=p}
   }
  }
 });
 return best;
};

/* أوّليات المشهد — قطعة line أو arc لكل ضلع، والهوية في oid */
export function plinePrims(p){
 const L="A-PLINE", out=[], P=p.pts||[], n=P.length;
 if(n<2)return out;
 const m=p.closed===1?n:n-1;
 for(let i=0;i<m;i++){
  const a=P[i], b=P[(i+1)%n];
  const bg=(p.bulge&&p.bulge[i])?+p.bulge[i]:0;
  const A=bulgeArc(a,b,bg);
  if(A)out.push({t:"arc",L,cx:R(A.cx),cy:R(A.cy),r:R(A.r),
   a0:A.a0*180/Math.PI,a1:A.a1*180/Math.PI,oid:p.id});
  else out.push({t:"line",L,a,b,oid:p.id});
 }
 return out;
}
