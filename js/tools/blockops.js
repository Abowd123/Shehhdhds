/* ═══ عمليات تأليف الكتل — MT3 ═══
   طبقةٌ خلفيةٌ فوق core/blocks.js و core/state.js: كلُّ عمليةٍ
   معاملةُ edit() واحدة، فخطأٌ واحدٌ يرجِع الحالة كلَّها، والتعريفاتُ
   تمرّ بـsafeBlockName/defineBlock → V("blockDef") → checkPrims،
   فلا مسارَ مختصرًا يتجاوز بوّابات التحقق. */

import {S,edit} from "../core/state.js";
import * as BLK from "../core/blocks.js";

/* إنشاءُ تعريفٍ من بدائيات مجمَّدة — المتصل (UI) يجمعها من التحديد
   ثم ينادي هذا بالنتيجة، فيبقى هذا الملفّ بلا علاقةٍ بالقماش
   أو ents.js، ويُختبَر على Node مباشرة. */
export function createBlock(name,title,prims,base){
 return edit(()=>{
  if(!name)throw new Error("اسم الكتلة مطلوب");
  const safe=BLK.safeBlockName(name);
  if(BLK.hasBlock(safe))
   throw new Error(`اسم «${safe}» معرَّف مسبقاً — اختر اسماً آخر`);
  return BLK.defineFromPrims(safe,title,prims,base||[0,0]);
 },`إنشاء كتلة ${name}`);
}

/* إعادة التسمية: الاسم الجديد يمرّ بـsafeBlockName، والمثيلات تُنقَل
   من S.blocks قبل حذف التعريف القديم — لا تكسيرَ روابط، ولا غيابَ
   صامتاً لمثيلٍ يبقى يشير إلى اسمٍ لا يُحَلّ. */
export function renameBlock(oldName,newName,title){
 return edit(()=>{
  if(!oldName||!newName)throw new Error("الاسمان القديم والجديد مطلوبان");
  const safe=BLK.safeBlockName(newName);
  const def=BLK.getBlock(oldName);
  if(!def)return false;
  if(safe!==oldName&&BLK.hasBlock(safe))
   throw new Error(`اسم «${safe}» معرَّف مسبقاً`);
  const moved=(S.blocks||[]).filter(b=>b.block===oldName);
  moved.forEach(b=>{b.block=safe});
  const nextTitle=title!==undefined?String(title).slice(0,120):def.title;
  BLK.defineBlock({...def,name:safe,title:nextTitle});
  if(safe!==oldName)BLK.removeBlock(oldName,{force:true});
  return {from:oldName,to:safe,moved:moved.length};
 },`إعادة تسمية كتلة ${oldName}`);
}

export function setBlockTitle(name,title){
 return edit(()=>{
  const def=BLK.getBlock(name);
  if(!def)return false;
  BLK.defineBlock({...def,
   title:String(title==null?"":title).slice(0,120)});
  return true;
 },`تعديل عنوان كتلة ${name}`);
}

/* الحذف: removeBlock نفسُها ترفض وفي المشروع مثيلاتٌ، ورسالتُها
   تسمّي العدد، فيصعد الخطأ إلى المتصل فيُقال للمستخدم. */
export function deleteBlock(name){
 return edit(()=>{
  if(!BLK.getBlock(name))return false;
  BLK.removeBlock(name);
  return true;
 },`حذف كتلة ${name}`);
}
