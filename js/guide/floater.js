/* ═══ guide/floater.js — نافذة الدليل العائمة ═══
   حاوية ذاتية لا تعتمد واجهةَ الإرساء اليوم: تُبنى مرةً وتُعرض
   وتُخفى. سحبٌ بسيطٌ بمقبضها العلوي. وواجهتُها المعنية بالعميل —
   floaterOpen/Close/Body — تبقى ثابتةً ولو رُقّيت لاحقاً إلى
   الإرساء الكامل عبر dock.js. */
let root = null;

export function ensureFloater() {
  if (root && document.body.contains(root)) return root;
  const stage = (typeof document !== "undefined" && document.getElementById("stage"))
    || document.body;
  root = document.createElement("aside");
  root.id = "gdFloater";
  root.dir = "rtl";
  root.hidden = true;
  root.innerHTML = `
 <header class="gd-fh"><b>الدليل التعليمي</b>
  <button class="gd-fx" title="إغلاق" aria-label="إغلاق">✕</button></header>
 <div class="gd-body"></div>`;
  stage.appendChild(root);

  const head = root.querySelector(".gd-fh");
  const closeBtn = root.querySelector(".gd-fx");
  if (closeBtn) closeBtn.onclick = () => floaterClose();

  let drag = null;
  head.addEventListener("pointerdown", e => {
    drag = { x: e.clientX - root.offsetLeft, y: e.clientY - root.offsetTop };
    if (head.setPointerCapture) head.setPointerCapture(e.pointerId);
  });
  head.addEventListener("pointermove", e => {
    if (!drag) return;
    root.style.left = (e.clientX - drag.x) + "px";
    root.style.top = (e.clientY - drag.y) + "px";
    root.style.right = "auto";
    root.style.bottom = "auto";
  });
  head.addEventListener("pointerup", () => { drag = null; });
  head.addEventListener("pointercancel", () => { drag = null; });

  return root;
}

export function floaterOpen() {
  const r = ensureFloater();
  r.hidden = false;
  return r;
}
export function floaterClose() { if (root) root.hidden = true; }
export function floaterIsOpen() { return !!(root && !root.hidden); }
export function floaterBody() {
  const r = ensureFloater();
  return r.querySelector(".gd-body");
}
