/* ═══ CSP بلا 'unsafe-inline' للأنماط ═══
   node js/tests/csp.test.js
   السياسة تحجب: سمةَ style في HTML المُدرَج · عنصرَ <style> · setAttribute
   ("style") · وأيضاً style.cssText المضبوطة من JS (خرقٌ فعليّ رغم أنه
   يبدو CSSOM — راجع MDN: "styles that are applied in JavaScript by
   setting the style attribute directly, or by setting cssText" مذكورةٌ
   صراحةً ضمن حالات الحجب). وتسمح فقط: ملفّاتِ css · وخصائص مفردة على
   style (el.style.color=…، el.style.display=…) لأنها ليست سلسلة
   نصّية تُحلَّل كـHTML/CSS بل تعيين خاصّية DOM مباشرةً.
   فما يُفحَص هنا هو أن لا شيءَ من المحجوب بقي — إذ لا متصفّحَ في هذه
   السلسلة يُظهر العطب (الصفحةُ تبدو بلا أنماطٍ فحسب، أو صندوق عطب
   الإقلاع نفسه يظهر بلا تنسيق — وهذا أخطر مكانٍ يمكن أن يقع فيه،
   لأنه المسار الوحيد الذي يُخبر المستخدم أن شيئاً قد انهار). */
import {readFileSync,readdirSync,statSync,existsSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {shim,group,ok,eq,summary} from "./harness.js";
shim();
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const rd=p=>readFileSync(join(ROOT,p),"utf8");
const walk=(d,out)=>{readdirSync(d).forEach(n=>{const p=join(d,n);
 if(statSync(p).isDirectory()){ if(n!=="tests"&&n!=="node_modules")walk(p,out) }
 else if(/\.js$/.test(n))out.push(p)}); return out};
const JS=walk(join(ROOT,"js"),[]).map(p=>[p.slice(ROOT.length),readFileSync(p,"utf8")]);
const HTML=rd("index.html");
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");

group("السياسة: style-src بلا unsafe-inline في المواضع الثلاثة",()=>{
 ok(!/style-src[^;"]*'unsafe-inline'/.test(rd("_headers")),"_headers");
 ok(!/style-src[^;"]*'unsafe-inline'/.test(rd("netlify.toml")),"netlify.toml");
 const meta=HTML.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/);
 ok(!!meta,"وسم CSP موجود");
 ok(meta&&!/'unsafe-inline'/.test(meta[1]),"وسم index.html");
 ok(meta&&/style-src 'self';/.test(meta[1]),"style-src 'self' وحده");
});

group("لا شيءَ مما تحجبه السياسة بقي",()=>{
 ok(!/<style[\s>]/.test(strip(HTML.replace(/<!--[\s\S]*?-->/g,""))),
  "لا عنصر <style> في index.html");
 ok(!/\sstyle\s*=/.test(HTML.replace(/<!--[\s\S]*?-->/g,"")),
  "لا سمة style في index.html (ولا في noscript)");
 /* استثناءٌ ضيّقٌ ومُبرَّر: exporter.js لا يُدرِج شيئاً في DOM التطبيق
    الخاضع لسياسة index.html — يبني مستنداً مستقلاً منفصلاً (ملفّ
    civildraft-guide.html يُنزَّل ويُفتح بمفرده بلا خادم ولا وصلَ
    بأوراق CSS خارجية ممكناً). سياسة style-src للتطبيق الحيّ لا تسري
    ولا يمكن أن تسري على مستندٍ آخر يُصدَّر كملفٍّ قائم بذاته؛ فرضها
    هنا يعني منع هذا المستند من أن يُنسَّق أصلاً. */
 const SELF_CONTAINED_DOC=["js/guide/exporter.js"];
 const bad=[];
 JS.forEach(([f,src])=>{
  if(SELF_CONTAINED_DOC.includes(f.replace(/^[\\/]/,"")))return;
  const c=strip(src);
  if(/\bstyle\s*=\s*\\?["']/.test(c))bad.push(f+": style=");
  if(/createElement\(\s*["']style["']\s*\)/.test(c))bad.push(f+": <style>");
  if(/setAttribute\(\s*["']style["']/.test(c))bad.push(f+": setAttribute(style)");
  if(/<style[\s>]/.test(c))bad.push(f+": <style في قالب");
  if(/\.style\.cssText\s*=/.test(c))bad.push(f+": style.cssText= (محجوبٌ فعلياً)");
 });
 eq(bad.length,0,"لا style= ولا <style> ولا setAttribute في JS"+
  (bad.length?" — "+bad.join(" · "):""));
});

group("كل ملفّ css مربوط وكل رابطٍ موجود",()=>{
 const links=[...HTML.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 ok(links.length>=15,`روابط الأنماط (${links.length})`);
 links.forEach(h=>ok(existsSync(join(ROOT,h)),`${h} موجود`));
 const files=readdirSync(join(ROOT,"css")).filter(n=>n.endsWith(".css"));
 files.forEach(n=>ok(links.includes("css/"+n),`css/${n} مربوط`));
 ok(links.indexOf("css/boot.css")===0,"boot.css أوّلاً: الشعار يظهر قبل السكربت");
});

group("الأصناف المساعدة معرَّفة ومستعمَلة (بلا يتيم ولا ناقص)",()=>{
 const css=["util.css","panels.css"].map(n=>rd("css/"+n)).join("\n");
 const defined=new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m=>m[1]));
 const used=new Set();
 JS.forEach(([f,src])=>{
  for(const m of strip(src).matchAll(/class="([^"]*)"/g))
   m[1].split(/\s+/).forEach(t=>{ if(t&&!t.includes("$")&&!t.includes("{"))used.add(t) });
 });
 const utils=[...defined].filter(c=>/^u-[0-9a-f]{5}$/.test(c));
 ok(utils.length>=15,`أصناف u- مولَّدة (${utils.length})`);
 utils.forEach(c=>ok(used.has(c),`.${c} مستعمَل`));
 const missing=[...used].filter(c=>/^u-[0-9a-f]{5}$/.test(c)&&!defined.has(c));
 eq(missing.length,0,"لا صنف u- مستعمَل بلا تعريف"+(missing.length?" — "+missing:""));
 /* أصناف panels.css التي تُبنى بشرطٍ (${on?"":" off"}) تُفحَص من نصّ القالب */
 const all=strip(JS.map(x=>x[1]).join("\n"));
 ["lrow","lbtn","lsw","lname","lcnt","rrow","rgrow","rmark","insrow",
  "rsrc","rsn","rsc","m1"].forEach(c=>{
   ok(defined.has(c),`.${c} معرَّف في panels.css`);
   ok(new RegExp(`class="[^"]*\\b${c}\\b`).test(all),`.${c} يُستعمَل في قالب`);
  });
 ["off","cur","dim","lk","stale","clk","bad","er","wr","in"].forEach(m=>
  ok(new RegExp(`\\.\\w+\\.${m}\\b`).test(css),`مُعدِّل .${m} معرَّف`));
});

group("ما كان يُحقَن صار ملفّاً: لا وحدة تحقن CSS",()=>{
 ["js/ui/historypanel.js","js/ui/blockpanel.js"].forEach(f=>{
  const s=rd(f);
  ok(!/injectCss/.test(s),`${f}: لا injectCss`);
 });
 ["history","blocks"].forEach(n=>{
  const c=rd(`css/${n}.css`);
  ok(c.length>800&&!/\$\{/.test(c),`css/${n}.css بلا قوالب غير مُحلَّلة`);
 });
 ok(/#histPanel/.test(rd("css/history.css")),"ولوحة التاريخ");
 ok(/#blkPanel/.test(rd("css/blocks.css")),"ولوحة العناصر");
});

const {paintBg}=await import("../ui/props.js").catch(()=>({}));
group("لون الطبقة: data-bg → CSSOM (يعمل تحت السياسة)",()=>{
 if(typeof paintBg!=="function"){ ok(true,"props.js يحتاج DOM كاملاً — يُفحَص ساكناً"); return }
 const mk=v=>({st:{},getAttribute:k=>k==="data-bg"?v:null,
  get style(){return this.st}});
 const a=mk("#ff0000"), b=mk("#00ff00");
 paintBg({querySelectorAll:s=>{ eq(s,"[data-bg]","المحدِّد"); return [a,b] }});
 eq(a.st.background,"#ff0000","اللون الأول");
 eq(b.st.background,"#00ff00","الثاني");
});
group("توازن الأقواس {} في كل css/*.css",()=>{
 /* بعد إزالة التعليقات والنصوص: أي عمق سالب أو غير صفري في النهاية عطبٌ
    يجعل المحلّل يبتلع القاعدة التالية بصمت (كان في modern.css: قاعدة
    prefers-reduced-motion تسقط) */
 const clean=s=>s.replace(/\/\*[\s\S]*?\*\//g,"")
  .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g,'""');
 const bal=s=>{ let d=0,min=0;
  for(const c of clean(s)){ if(c==="{")d++; else if(c==="}"){ d--; if(d<min)min=d } }
  return {d,min} };
 const files=readdirSync(join(ROOT,"css")).filter(n=>n.endsWith(".css"));
 ok(files.length>=15,`ملفّات css المفحوصة (${files.length})`);
 files.forEach(n=>{ const {d,min}=bal(rd("css/"+n));
  ok(min>=0&&d===0,`css/${n}: أقواس متوازنة (نهاية ${d}، أدنى عمق ${min})`) });
 /* الفاحص نفسه يكشف العطب: نسخة modern.css القديمة بالسطرين اليتيمين */
 const broken=bal("@keyframes a{from{opacity:0}to{opacity:1}}\n 50%{opacity:1}\n}\n@media x{*{a:b}}");
 ok(broken.min<0,"الفاحص يفشل عند قوس زائد (عمق سالب)");
 ok(bal("a{b:c").d!==0,"الفاحص يفشل عند قوس ناقص");
 ok(bal("a{content:\"}\"} /* } */").d===0,"لا يتأثر بالأقواس داخل النصوص والتعليقات");
});

process.exit(summary());
