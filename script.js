/**
 * URL params:
 *  - to=Name
 *  - from=Name
 *  - msg=Line1|Line2|Line3 (| = newline)
 */

const $ = (sel) => document.querySelector(sel);

const cakeScene = $("#cakeScene");
const cardScene = $("#cardScene");
const countNum = $("#countNum");
const wishPrompt = $("#wishPrompt");
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

let state = "countdown";
let opened = false;

const golds = ["#FFD36A", "#FFCF4E", "#FFC14A", "#FFE6A6"];
const silvers = ["#E8ECFF", "#FFFFFF", "#DCE2FF", "#F2F4FF"];

let countdownTimer = null;

/* --- helpers --- */
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

function safePlay(audioEl) {
  try {
    audioEl.currentTime = 0;
    const p = audioEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {}
}

/* --- message --- */
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

/* --- scenes --- */
function setScene(which) {
  if (which === "cake") {
    cakeScene.classList.add("scene--active");
    cardScene.classList.remove("scene--active");
  } else {
    cakeScene.classList.remove("scene--active");
    cardScene.classList.add("scene--active");
  }
}

/* --- sparkles background --- */
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

/* --- FX particles --- */
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

/* --- Origin point near top of cake --- */
function getCakeOrigin() {
  const r = cakeImg.getBoundingClientRect();
  return { x: r.left + r.width * 0.52, y: r.top + r.height * 0.46 };
}

/* --- Countdown (guaranteed) --- */
function startCountdown() {
  state = "countdown";
  opened = false;

  document.body.classList.remove("show-envelope", "opening");
  helperText.textContent = "Your surprise will appear when the timer ends…";

  // prompt is visible at start
  if (wishPrompt) wishPrompt.classList.remove("hide");

  if (countdownTimer) clearInterval(countdownTimer);

  let t = 5;
  countNum.textContent = String(t);

  countdownTimer = setInterval(() => {
    t -= 1;
    if (t >= 0) countNum.textContent = String(t);

    if (t > 0) {
      const o = getCakeOrigin();
      spawnBurst(o.x, o.y, 0.08);
    }

    if (t <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      revealEnvelope();
    }
  }, 1000);
}

function revealEnvelope() {
  state = "envelope";

  // When envelope appears, hide the "Blow..." prompt
  if (wishPrompt) wishPrompt.classList.add("hide");

  const o = getCakeOrigin();
  spawnBurst(o.x, o.y, 1.0);
  spawnBurst(o.x + 18, o.y + 6, 0.75);
  spawnBurst(o.x - 18, o.y + 8, 0.75);

  setTimeout(() => {
    document.body.classList.add("show-envelope");
    helperText.textContent = "Tap the envelope to pop confetti 🎉";
  }, 520);
}

function openEnvelope() {
  if (opened || state !== "envelope") return;
  opened = true;

  spawnConfetti();
  safePlay(popSound);

  document.body.classList.add("opening");

  const e = envelope.getBoundingClientRect();
  spawnBurst(e.left + e.width * 0.5, e.top + e.height * 0.35, 0.55);

  setTimeout(() => showCard(), 780);
}

function showCard() {
  state = "card";
  setScene("card");
  helperText.textContent = "";
  document.body.classList.remove("show-envelope", "opening");
  requestAnimationFrame(() => fitTextToBox(cardMsg, $(".cardTextBox"), 14, 28));
}

function restart() {
  fx.length = 0;
  setScene("cake");
  startCountdown();
}

/* --- Controls --- */
function bindControls() {
  envelope.addEventListener("click", () => openEnvelope());
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEnvelope();
    }
  });
  restartBtn.addEventListener("click", () => restart());
}

/* --- Loop --- */
function loop() {
  drawSparkles();
  drawFx();
  requestAnimationFrame(loop);
}

/* --- Boot --- */
function boot() {
  resize();
  parseParams();
  initSparkles();
  setScene("cake");

  // ensure prompt visible from the start
  if (wishPrompt) wishPrompt.classList.remove("hide");

  startCountdown();

  // iOS audio unlock
  window.addEventListener("pointerdown", () => {
    safePlay(popSound);
    popSound.pause();
    popSound.currentTime = 0;
  }, { once: true });

  bindControls();
  loop();
}

boot();
