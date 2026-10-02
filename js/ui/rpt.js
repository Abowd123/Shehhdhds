/* ═══ نافذة التقارير ═══
   مضيفٌ واحد لنوافذ «قبل الحذف» و«بوابة التسليم» و«إدارة الطوابق».
   لا #helpBox: ذاك مملوكٌ لنافذة المساعدة (helppan.js) ويغلقه keymap.js.
   لا onclick ولا style مضمَّن — CSP لا يسمح: كل ربطٍ addEventListener،
   والأنماط من css/report.css. كل نصٍّ آتٍ من المشروع يمرّ بـesc. */
import {escapeHtml as esc} from "../core/escape.js";

let box=null;

const onKey=e=>{
 if(e.key==="Escape"){e.stopPropagation(); rptClose()}
};
export function rptClose(){
 if(box){box.remove(); box=null}
 if(typeof document!=="undefined")
  document.removeEventListener("keydown",onKey,true);
}
export const rptIsOpen=()=>!!box;
export const rptBox=()=>box;

/* body: HTML جاهزٌ (المُنادي مسؤولٌ عن تهريب ما يُدرجه بـesc) */
export function rptOpen(title,body){
 rptClose();
 box=document.createElement("div");
 box.className="rpt";
 box.setAttribute("role","dialog");
 box.setAttribute("aria-modal","true");
 box.setAttribute("aria-label",String(title));
 box.setAttribute("dir","rtl");
 box.innerHTML=`<div class="rpt-h"><h3>${esc(title)}</h3>`
  +`<button type="button" class="rpt-x" data-rpt="close" `
  +`aria-label="إغلاق">×</button></div>`
  +`<div class="rpt-b">${body}</div>`;
 box.addEventListener("click",e=>{
  if(e.target.closest&&e.target.closest("[data-rpt=close]"))rptClose();
 });
 document.body.appendChild(box);
 document.addEventListener("keydown",onKey,true);
 return box;
}
