/**
 * URL params:
 *  - to=Name
 *  - from=Name
 *  - msg=Line1|Line2|Line3 ...  (| = newline)
 */

const $ = (sel) => document.querySelector(sel);

const cakeScene = $("#cakeScene");
const cardScene = $("#cardScene");
const countNum = $("#countNum");
const helperText = $("#helperText");
const envelope = $("#envelope");
const restartBtn = $("#restartBtn");

const popSound = $("#popSound");

const cardTo = $("#cardTo");
const cardFrom = $("#cardFrom");
const cardMsg = $("#cardMsg");

const sparkleCanvas = $("#sparkleCanvas");
const fxCanvas = $("#fxCanvas");
const sCtx = sparkleCanvas.getContext("2d");
const fCtx = fxCanvas.getContext("2d");

const cakeImg = $("#cakeImg");
const markImg = $("#markImg");
const flamesEl = $("#flames");

let timerRaf = null;
let state = "countdown"; // countdown -> envelope -> card
let opened = false;

const golds = ["#FFD36A", "#FFCF4E", "#FFC14A", "#FFE6A6"];
const silvers = ["#E8ECFF", "#FFFFFF", "#DCE2FF", "#F2F4FF"];

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  for (const c of [sparkleCanvas, fxCanvas]) {
    c.width = Math.floor(innerWidth * dpr);
    c.height = Math.floor(innerHeight * dpr);
    c.style.width = innerWidth + "px";
    c.style.height = innerHeight + "px";
  }
  sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);

/* -------- Message -------- */
function parseParams() {
  const p = new URLSearchParams(location.search);
  const to = (p.get("to") || "").trim();
  const from = (p.get("from") || "").trim();

  let msg = p.get("msg");
  if (!msg) {
    msg =
      "Happy Birthday!|May your day be full of joy and laughter.|" +
      "I hope all your dreams come true this year.|" +
      "You deserve the very best—today and always.|" +
      "So grateful to have you in my life.";
  }
  msg = msg.replaceAll("|", "\n");

  cardTo.textContent = to ? `TO: ${to}` : "";
  cardFrom.textContent = from ? `FROM: ${from}` : "";
  cardMsg.textContent = msg;

  // 5+ cümle taşmasın: otomatik küçült
  requestAnimationFrame(() => fitTextToBox(cardMsg, $(".cardTextBox"), 14, 28));
}

function fitTextToBox(textEl, boxEl, minPx, maxPx) {
  let size = maxPx;
  textEl.style.fontSize = size + "px";

  const fits = () => boxEl.scrollHeight <= boxEl.clientHeight + 1;

  while (!fits() && size > minPx) {
    size -= 1;
    textEl.style.fontSize = size + "px";
  }
}

/* -------- Scene -------- */
function setScene(which) {
  if (which === "cake") {
    cakeScene.classList.add("scene--active");
    cardScene.classList.remove("scene--active");
  } else {
    cakeScene.classList.remove("scene--active");
    cardScene.classList.add("scene--active");
  }
}

function safePlay(audioEl) {
  try {
    audioEl.currentTime = 0;
    const p = audioEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {}
}

/* -------- Sparkles (background) -------- */
const sparkles = [];
function initSparkles() {
  sparkles.length = 0;
  const count = Math.floor(Math.min(280, Math.max(160, innerWidth * innerHeight / 9000)));
  for (let i = 0; i < count; i++) {
    sparkles.push({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 0.8 + Math.random() * 1.8,
      a: 0.25 + Math.random() * 0.65,
      t: Math.random() * Math.PI * 2,
      sp: 0.008 + Math.random() * 0.022,
      col: Math.random() < 0.55 ? golds[(Math.random() * golds.length) | 0] : silvers[(Math.random() * silvers.length) | 0],
      glint: Math.random() < 0.45
    });
  }
}

/* -------- FX particles -------- */
const fx = [];
function spawnBurst(x, y, strength = 1) {
  const n = Math.floor(110 * strength);
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = (1.4 + Math.random() * 4.6) * strength;
    const col = Math.random() < 0.6 ? golds[(Math.random() * golds.length) | 0] : silvers[(Math.random() * silvers.length) | 0];
    fx.push({
      kind: "spark",
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 0.6,
      r: 1.0 + Math.random() * 2.8,
      a: 1,
      life: 60 + (Math.random() * 60) | 0,
      col,
      glint: Math.random() < 0.6
    });
  }
}

function spawnConfetti() {
  const y = innerHeight * (0.36 + Math.random() * 0.2);
  const leftX = -10;
  const rightX = innerWidth + 10;

  const makeSide = (x0, dir) => {
    const n = 130;
    for (let i = 0; i < n; i++) {
      const col = Math.random() < 0.5 ? golds[(Math.random() * golds.length) | 0] : silvers[(Math.random() * silvers.length) | 0];
      fx.push({
        kind: "confetti",
        x: x0,
        y: y + (Math.random() * 170 - 85),
        vx: (dir * (4.2 + Math.random() * 6.3)) + (Math.random() * 1.2),
        vy: -2.2 - Math.random() * 4.2,
        w: 6 + Math.random() * 9,
        h: 2 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() * 0.25 - 0.125),
        a: 1,
        life: 160 + (Math.random() * 70) | 0,
        col
      });
    }
  };

  makeSide(leftX, 1);
  makeSide(rightX, -1);
}

function drawSparkles() {
  sCtx.clearRect(0, 0, innerWidth, innerHeight);

  // daha görünür "bloom"
  sCtx.save();
  sCtx.globalAlpha = 0.22;
  sCtx.fillStyle = "#ffffff";
  sCtx.beginPath();
  sCtx.arc(innerWidth * 0.5, innerHeight * 0.42, Math.min(innerWidth, innerHeight) * 0.60, 0, Math.PI * 2);
  sCtx.fill();
  sCtx.restore();

  for (const sp of sparkles) {
    sp.t += sp.sp;
    const pulse = 0.55 + Math.sin(sp.t) * 0.45;
    const a = sp.a * pulse;

    sCtx.save();
    sCtx.globalAlpha = a;
    sCtx.fillStyle = sp.col;
    sCtx.beginPath();
    sCtx.arc(sp.x, sp.y, sp.r * (0.85 + pulse * 0.7), 0, Math.PI * 2);
    sCtx.fill();

    if (sp.glint) {
      sCtx.globalAlpha = a * 0.75;
      sCtx.strokeStyle = sp.col;
      sCtx.lineWidth = 1;
      sCtx.beginPath();
      sCtx.moveTo(sp.x - 6, sp.y);
      sCtx.lineTo(sp.x + 6, sp.y);
      sCtx.moveTo(sp.x, sp.y - 6);
      sCtx.lineTo(sp.x, sp.y + 6);
      sCtx.stroke();
    }
    sCtx.restore();
  }
}

function drawFx() {
  fCtx.clearRect(0, 0, innerWidth, innerHeight);

  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i];
    p.life -= 1;
    if (p.life <= 0 || p.a <= 0.01) {
      fx.splice(i, 1);
      continue;
    }

    if (p.kind === "spark") {
      p.vx *= 0.986;
      p.vy = p.vy * 0.986 + 0.085;
      p.x += p.vx;
      p.y += p.vy;
      p.a *= 0.985;

      fCtx.save();
      fCtx.globalAlpha = p.a;
      fCtx.fillStyle = p.col;
      fCtx.beginPath();
      fCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      fCtx.fill();

      if (p.glint) {
        fCtx.globalAlpha = p.a * 0.7;
        fCtx.strokeStyle = p.col;
        fCtx.lineWidth = 1;
        fCtx.beginPath();
        fCtx.moveTo(p.x - 7, p.y);
        fCtx.lineTo(p.x + 7, p.y);
        fCtx.moveTo(p.x, p.y - 7);
        fCtx.lineTo(p.x, p.y + 7);
        fCtx.stroke();
      }
      fCtx.restore();
    } else {
      p.vx *= 0.995;
      p.vy = p.vy * 0.992 + 0.12;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.a *= 0.993;

      fCtx.save();
      fCtx.globalAlpha = p.a;
      fCtx.translate(p.x, p.y);
      fCtx.rotate(p.rot);
      fCtx.fillStyle = p.col;
      fCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      fCtx.restore();
    }
  }
}

/* -------- Candle auto-detect from cake_mark.png --------
   mark görselindeki kırmızı işaretleri yakalayıp alevleri otomatik yerleştirir.
*/
async function detectCandlePoints() {
  await waitForImage(markImg);

  const targetW = 320; // küçültüp tarıyoruz (hızlı)
  const scale = targetW / markImg.naturalWidth;
  const targetH = Math.round(markImg.naturalHeight * scale);

  const off = document.createElement("canvas");
  off.width = targetW;
  off.height = targetH;
  const ctx = off.getContext("2d");
  ctx.drawImage(markImg, 0, 0, targetW, targetH);

  const img = ctx.getImageData(0, 0, targetW, targetH);
  const data = img.data;

  const mask = new Uint8Array(targetW * targetH);
  for (let i = 0; i < targetW * targetH; i++) {
    const r = data[i * 4 + 0];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];
    // kırmızıyı yakala
    if (a > 40 && r > 160 && g < 120 && b < 120) mask[i] = 1;
  }

  const visited = new Uint8Array(targetW * targetH);
  const pts = [];

  const neighbors = (idx) => {
    const x = idx % targetW;
    const y = (idx / targetW) | 0;
    const res = [];
    // 4-neighbor
    if (x > 0) res.push(idx - 1);
    if (x < targetW - 1) res.push(idx + 1);
    if (y > 0) res.push(idx - targetW);
    if (y < targetH - 1) res.push(idx + targetW);
    return res;
  };

  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || visited[i]) continue;

    // BFS component
    const stack = [i];
    visited[i] = 1;

    let sumX = 0, sumY = 0, count = 0;

    while (stack.length) {
      const cur = stack.pop();
      const x = cur % targetW;
      const y = (cur / targetW) | 0;

      sumX += x;
      sumY += y;
      count++;

      for (const nb of neighbors(cur)) {
        if (mask[nb] && !visited[nb]) {
          visited[nb] = 1;
          stack.push(nb);
        }
      }
    }

    // küçük gürültüleri at
    if (count > 20) {
      const cx = sumX / count;
      const cy = sumY / count;

      // yüzde koordinata çevir (orijinal boyuta geri)
      const px = (cx / targetW) * 100;
      const py = (cy / targetH) * 100;

      pts.push({ x: px, y: py, area: count });
    }
  }

  // soldan sağa sırala
  pts.sort((a, b) => a.x - b.x);

  // çok yakın olanları birleştir (bazen işaret kalın olabiliyor)
  const merged = [];
  for (const p of pts) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.x - p.x) < 1.2 && Math.abs(last.y - p.y) < 1.2) {
      // average
      last.x = (last.x + p.x) / 2;
      last.y = (last.y + p.y) / 2;
      last.area += p.area;
    } else {
      merged.push({ ...p });
    }
  }

  return merged;
}

function waitForImage(imgEl) {
  return new Promise((resolve) => {
    if (imgEl.complete && imgEl.naturalWidth) return resolve();
    imgEl.addEventListener("load", resolve, { once: true });
    imgEl.addEventListener("error", resolve, { once: true });
  });
}

function buildFlames(points) {
  flamesEl.innerHTML = "";

  // Eğer hiç bulamazsa: elle 4 alev (fallback)
  const pts = points && points.length ? points : [
    { x: 46, y: 46 }, { x: 49.5, y: 45.5 }, { x: 53, y: 45.2 }, { x: 56, y: 45 }
  ];

  pts.forEach((p, idx) => {
    const d = (idx * 0.08).toFixed(2) + "s";
    const flame = document.createElement("div");
    flame.className = "flame";
    flame.style.setProperty("--x", `${p.x}%`);
    flame.style.setProperty("--y", `${p.y}%`);
    flame.style.setProperty("--d", d);
    flamesEl.appendChild(flame);
  });

  return pts;
}

function getCandleOrigin(points) {
  const r = cakeImg.getBoundingClientRect();
  if (!points || !points.length) {
    return { x: r.left + r.width * 0.52, y: r.top + r.height * 0.47 };
  }
  const avgX = points.reduce((s, p) => s + p.x, 0) / points.length;
  const avgY = points.reduce((s, p) => s + p.y, 0) / points.length;
  return { x: r.left + r.width * (avgX / 100), y: r.top + r.height * (avgY / 100) };
}

/* -------- Timeline (COUNTDOWN raf) -------- */
function startCountdown(points) {
  state = "countdown";
  opened = false;

  document.body.classList.remove("is-blown", "show-envelope", "opening");
  helperText.textContent = "Mumlar sönünce mektup gelecek…";

  const duration = 5000;
  const start = performance.now();

  cancelAnimationFrame(timerRaf);

  const tick = (now) => {
    const elapsed = now - start;
    const remain = Math.max(0, duration - elapsed);
    const seconds = Math.ceil(remain / 1000);

    countNum.textContent = String(seconds);

    // hafif parıltı (tik tik)
    if (remain > 0 && seconds >= 1 && Math.abs(remain % 1000) < 18) {
      const o = getCandleOrigin(points);
      spawnBurst(o.x, o.y, 0.10);
    }

    if (remain <= 0) {
      blowOut(points);
      return;
    }

    timerRaf = requestAnimationFrame(tick);
  };

  timerRaf = requestAnimationFrame(tick);
}

function blowOut(points) {
  state = "envelope";
  document.body.classList.add("is-blown");

  const origin = getCandleOrigin(points);
  spawnBurst(origin.x, origin.y, 1.0);
  spawnBurst(origin.x + 18, origin.y + 6, 0.75);
  spawnBurst(origin.x - 18, origin.y + 8, 0.75);

  setTimeout(() => {
    document.body.classList.add("show-envelope");
    helperText.textContent = "Mektuba tıkla, konfeti patlasın 🎉";
  }, 520);
}

function openEnvelope(points) {
  if (opened || state !== "envelope") return;
  opened = true;

  spawnConfetti();
  safePlay(popSound);

  document.body.classList.add("opening");

  const e = envelope.getBoundingClientRect();
  spawnBurst(e.left + e.width * 0.5, e.top + e.height * 0.35, 0.55);

  setTimeout(() => {
    showCard();
  }, 780);
}

function showCard() {
  state = "card";
  setScene("card");
  helperText.textContent = "";

  document.body.classList.remove("show-envelope");
  document.body.classList.remove("opening");

  requestAnimationFrame(() => fitTextToBox(cardMsg, $(".cardTextBox"), 14, 28));
}

function restart(points) {
  fx.length = 0;
  setScene("cake");
  startCountdown(points);
}

/* -------- Controls -------- */
function bindControls(points) {
  envelope.addEventListener("click", () => openEnvelope(points));
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEnvelope(points);
    }
  });

  restartBtn.addEventListener("click", () => restart(points));
}

/* -------- Main loop -------- */
function loop() {
  drawSparkles();
  drawFx();
  requestAnimationFrame(loop);
}

/* -------- Boot -------- */
async function boot() {
  resize();
  parseParams();
  initSparkles();
  setScene("cake");

  // Alev konumlarını işaretli görselden bul
  await waitForImage(cakeImg);
  const points = buildFlames(await detectCandlePoints());

  // Sayaç kesin başlasın (raf ile)
  startCountdown(points);

  // Ses iOS için ilk tıkla unlock
  window.addEventListener("pointerdown", () => {
    safePlay(popSound);
    popSound.pause();
    popSound.currentTime = 0;
  }, { once: true });

  bindControls(points);
  loop();
}

boot();
