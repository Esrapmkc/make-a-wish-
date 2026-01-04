\
/**
 * Birthday Wish Card — GitHub Pages friendly (HTML/CSS/JS only).
 *
 * URL params (optional):
 *  - to=Name
 *  - from=Name
 *  - msg=Your%20message%20here%0ASecond%20line...
 *
 * Tip: use \n (new line) to make it easier to fit 5+ sentences.
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

let rafId = null;
let timer = null;
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

function parseParams() {
  const p = new URLSearchParams(location.search);
  const to = (p.get("to") || "").trim();
  const from = (p.get("from") || "").trim();

  // Support: msg can include \n. Also allow | as newline (easy for Etsy links).
  let msg = p.get("msg");
  if (!msg) {
    msg = "Happy Birthday!\nMay your day be full of joy and laughter.\nI hope all your dreams come true this year.\nYou deserve the very best—today and always.\nSo grateful to have you in my life.";
  }
  msg = msg.replaceAll("|", "\n");

  cardTo.textContent = to ? `TO: ${to}` : "";
  cardFrom.textContent = from ? `FROM: ${from}` : "";
  cardMsg.textContent = msg;

  fitTextToBox(cardMsg, $(".cardTextBox"), 14, 28);
}

function fitTextToBox(textEl, boxEl, minPx, maxPx) {
  // Shrink-to-fit so 5+ sentences always stay inside the card.
  let size = maxPx;
  textEl.style.fontSize = size + "px";

  const fits = () => {
    // Use scrollHeight to detect overflow.
    return boxEl.scrollHeight <= boxEl.clientHeight + 1;
  };

  // First, try max; then shrink.
  while (!fits() && size > minPx) {
    size -= 1;
    textEl.style.fontSize = size + "px";
  }
}

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

/* Sparkles (gold + silver, visible and twinkly) */
const sparkles = [];
function initSparkles() {
  sparkles.length = 0;
  const count = Math.floor(Math.min(210, Math.max(110, innerWidth * innerHeight / 12000)));
  for (let i = 0; i < count; i++) {
    sparkles.push({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 0.7 + Math.random() * 1.6,
      a: 0.15 + Math.random() * 0.6,
      t: Math.random() * Math.PI * 2,
      sp: 0.006 + Math.random() * 0.02,
      col: Math.random() < 0.55 ? golds[(Math.random() * golds.length) | 0] : silvers[(Math.random() * silvers.length) | 0],
      glint: Math.random() < 0.35
    });
  }
}

/* FX particles (burst + confetti) */
const fx = [];
function spawnBurst(x, y, strength = 1) {
  const n = Math.floor(90 * strength);
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = (1.2 + Math.random() * 4.2) * strength;
    const col = Math.random() < 0.6 ? golds[(Math.random() * golds.length) | 0] : silvers[(Math.random() * silvers.length) | 0];
    fx.push({
      kind: "spark",
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 0.5,
      r: 0.9 + Math.random() * 2.6,
      a: 1,
      life: 55 + (Math.random() * 50) | 0,
      col,
      glint: Math.random() < 0.55
    });
  }
}

function spawnConfetti(side = "both") {
  const y = innerHeight * (0.35 + Math.random() * 0.2);
  const leftX = -10;
  const rightX = innerWidth + 10;

  const makePiece = (x0, dir) => {
    const n = 120;
    for (let i = 0; i < n; i++) {
      const col = Math.random() < 0.5 ? golds[(Math.random() * golds.length) | 0] : silvers[(Math.random() * silvers.length) | 0];
      fx.push({
        kind: "confetti",
        x: x0,
        y: y + (Math.random() * 160 - 80),
        vx: (dir * (4 + Math.random() * 6)) + (Math.random() * 1.2),
        vy: -2 - Math.random() * 4,
        w: 6 + Math.random() * 8,
        h: 2 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() * 0.25 - 0.125),
        a: 1,
        life: 150 + (Math.random() * 60) | 0,
        col
      });
    }
  };

  if (side === "left" || side === "both") makePiece(leftX, 1);
  if (side === "right" || side === "both") makePiece(rightX, -1);
}

function drawSparkles() {
  sCtx.clearRect(0, 0, innerWidth, innerHeight);

  // Soft bloom glow behind sparkles (for visibility).
  sCtx.save();
  sCtx.globalAlpha = 0.18;
  sCtx.fillStyle = "#ffffff";
  sCtx.beginPath();
  sCtx.arc(innerWidth * 0.5, innerHeight * 0.38, Math.min(innerWidth, innerHeight) * 0.55, 0, Math.PI * 2);
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
    sCtx.arc(sp.x, sp.y, sp.r * (0.85 + pulse * 0.6), 0, Math.PI * 2);
    sCtx.fill();

    // Glint cross (sparkly look).
    if (sp.glint) {
      sCtx.globalAlpha = a * 0.7;
      sCtx.strokeStyle = sp.col;
      sCtx.lineWidth = 1;
      sCtx.beginPath();
      sCtx.moveTo(sp.x - 5, sp.y);
      sCtx.lineTo(sp.x + 5, sp.y);
      sCtx.moveTo(sp.x, sp.y - 5);
      sCtx.lineTo(sp.x, sp.y + 5);
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
      p.vy = p.vy * 0.986 + 0.08; // gravity
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
        fCtx.moveTo(p.x - 6, p.y);
        fCtx.lineTo(p.x + 6, p.y);
        fCtx.moveTo(p.x, p.y - 6);
        fCtx.lineTo(p.x, p.y + 6);
        fCtx.stroke();
      }
      fCtx.restore();
    } else {
      // confetti
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

/* Timeline */
function startCountdown() {
  state = "countdown";
  opened = false;

  document.body.classList.remove("is-blown", "show-envelope", "opening");
  helperText.textContent = "Mumlar sönünce mektup gelecek…";

  // Start at 5, go to 0.
  let t = 5;
  countNum.textContent = String(t);

  clearInterval(timer);
  timer = setInterval(() => {
    t -= 1;
    if (t < 0) return;

    countNum.textContent = String(t);

    // small shimmer burst each tick (subtle)
    if (t > 0) {
      const origin = getCandleOrigin();
      spawnBurst(origin.x, origin.y, 0.12);
    }

    if (t === 0) {
      clearInterval(timer);
      blowOut();
    }
  }, 1000);
}

function getCandleOrigin() {
  const cake = $("#cakeImg");
  const r = cake.getBoundingClientRect();

  // Use the candle area (same relative coords we used for flames).
  const cx = r.left + r.width * 0.52;
  const cy = r.top + r.height * 0.47;
  return { x: cx, y: cy };
}

function blowOut() {
  state = "envelope";
  document.body.classList.add("is-blown");

  const origin = getCandleOrigin();
  // Big glitter burst like "blown sparkle".
  spawnBurst(origin.x, origin.y, 1.0);
  spawnBurst(origin.x + 18, origin.y + 6, 0.7);
  spawnBurst(origin.x - 18, origin.y + 8, 0.7);

  // Slight delay then show envelope.
  setTimeout(() => {
    document.body.classList.add("show-envelope");
    helperText.textContent = "Mektuba tıkla, konfeti patlasın 🎉";
  }, 520);
}

function openEnvelope() {
  if (opened || state !== "envelope") return;
  opened = true;

  // Confetti from both sides + pop sound
  spawnConfetti("both");
  safePlay(popSound);

  document.body.classList.add("opening");

  // Extra glitter around the envelope
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
  // Keep sparkles on screen; cake still visible behind because canvas is global.
  document.body.classList.remove("show-envelope");
  document.body.classList.remove("opening");

  // Re-fit text once the card is on screen.
  requestAnimationFrame(() => fitTextToBox(cardMsg, $(".cardTextBox"), 14, 28));
}

function restart() {
  clearInterval(timer);
  fx.length = 0;
  setScene("cake");
  startCountdown();
}

/* Controls */
envelope.addEventListener("click", openEnvelope);
envelope.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openEnvelope();
  }
});
restartBtn.addEventListener("click", restart);

/* Main loop */
function loop() {
  drawSparkles();
  drawFx();
  rafId = requestAnimationFrame(loop);
}

function boot() {
  resize();
  parseParams();
  initSparkles();
  setScene("cake");
  startCountdown();
  loop();

  // First interaction: unlock audio on iOS by a gentle click.
  window.addEventListener("pointerdown", () => { safePlay(popSound); popSound.pause(); popSound.currentTime = 0; }, { once: true });
}

boot();
