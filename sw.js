/* ═══ Service Worker — CivilDraft ═══
   القاعدة: الشبكة أولاً لكل شيءٍ من نفس الأصل، والكاش احتياطٌ عند
   انقطاع الاتصال فقط. لا «كاش أولاً» لأي مورد (HTML منه) — وإلا علق
   المستخدم على نسخةٍ قديمة بعد كل ترقية، وهو ما يمنعه no-cache في
   netlify.toml و_headers. ما نجح جلبُه يُخزَّن (r.ok وحده) فيعمل
   التطبيق بلا اتصال بعد زيارةٍ واحدة.
   طلباتُ المزوّد الخارجيّ (المفتاح في ترويسته) وغير GET لا نعترضها.
   رفع CACHE يُسقِط كل ما قبله عند التفعيل. */
const CACHE="civildraft-v2";
const CORE=["./","./index.html","./css/theme.css","./css/base.css","./js/app.js"];

self.addEventListener("install",e=>{
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));
 self.skipWaiting();
});
self.addEventListener("activate",e=>{
 e.waitUntil(caches.keys().then(ks=>Promise.all(
  ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
 self.clients.claim();
});
self.addEventListener("fetch",e=>{
 const req=e.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;
 e.respondWith(
  fetch(req).then(r=>{
   if(r&&r.ok&&r.type==="basic"){
    const c=r.clone();
    caches.open(CACHE).then(cache=>cache.put(req,c)).catch(()=>{});
   }
   return r;
  }).catch(()=>caches.match(req).then(hit=>
   hit||(req.mode==="navigate"?caches.match("./index.html"):undefined)))
 );
});
