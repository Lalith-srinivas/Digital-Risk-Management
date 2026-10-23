// Stipple Sphere — Originkit (converted to JSX)
import { useEffect, useRef } from "react";

const DEFAULT_COLOR = {
  mode: "gradient",
  colors: ["#5EEAD4", "#818CF8", "#F472B6"],
  dotColor: "#E9E5DF",
  seaColor: "#2F5D9A",
  glow: "#FFFFFF",
};
const DEFAULTS = {
  background: "#000000",
  rows: 60,
  size: 419,
  dotSize: 56,
  seaDots: 35,
  farSide: 18,
  drag: true,
  hover: 5,
  ripple: 5,
  burst: 5,
  speed: 5,
};

const EARTH_SRC = "https://unpkg.com/three-globe@2.31.0/example/img/earth-water.png";
const EARTH_COLOR_SRC = "https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg";
const EARTH_LIFT = 0.65;
const MASK_W = 1024;
const MASK_H = 512;
const AXIAL_TILT = (23.44 * Math.PI) / 180;
const CAM = 3.2;
const FIT = Math.sqrt(CAM * CAM - 1) / CAM;
const NEAR = 0.7;
const LIGHT = [-0.55, 0.5, 0.67];
const PERIOD_S = 40;
const MAX_PITCH = 1.1;
const INERTIA_S = 0.9;
const PITCH_RETURN_S = 1.6;
const LAND_MS = 700;
const HOVER_LIFT = 0.07;
const HOVER_REACH = 0.022;
const TRAIL_REACH = 0.03;
const TRAIL_S = 1.0;
const RIPPLE_LIFT = 0.06;
const RIPPLE_SPEED = 2.4;
const RIPPLE_WIDTH = 0.16;
const MAX_RIPPLES = 6;
const IDLE_AFTER_S = 2.5;
const IDLE_EVERY_S = 2.2;
const IDLE_AMP = 0.55;
const CLICK_SLOP = 5;
const HOLD_MS = 220;
const CHARGE_S = 1.1;
const BURST_REACH = 0.4;
const SPRING_K = [70, 130];
const SPRING_DAMP = 7;
const TREMBLE = 0.025;
const SWELL = 4;
const MAX_SWELL = 5;
const HALO = [2.6, 1.7];
const PAL_STEPS = 64;
const LEVELS = 20;
const BUCKETS = 12;

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function hash1(i, s) {
  let h = Math.imul(i, 374761393) ^ Math.imul(s, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const COLOR_CACHE = new Map();
function rgbOf(c) {
  const hit = COLOR_CACHE.get(c);
  if (hit) return hit;
  let out = [0, 0, 0];
  let s = (c || "").trim();
  if (s.startsWith("var(")) s = s.slice(s.indexOf(",") + 1);
  if (s[0] === "#") {
    let hx = s.slice(1);
    if (hx.length === 3 || hx.length === 4) hx = hx.split("").map((x) => x + x).join("");
    const n = parseInt(hx.slice(0, 6), 16);
    if (!isNaN(n)) out = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  } else {
    const m = s.match(/[\d.]+/g);
    if (m && m.length >= 3) out = [+m[0], +m[1], +m[2]];
  }
  COLOR_CACHE.set(c, out);
  return out;
}

function samplePalette(colors) {
  const pal = colors.map(rgbOf);
  const out = new Float32Array(PAL_STEPS * 3);
  for (let c = 0; c < PAL_STEPS; c++) {
    const x = (c / (PAL_STEPS - 1)) * (pal.length - 1);
    const i = Math.min(pal.length - 1, Math.floor(x)), f = x - i;
    const a = pal[i], b = pal[Math.min(pal.length - 1, i + 1)];
    for (let k = 0; k < 3; k++) out[c * 3 + k] = a[k] + (b[k] - a[k]) * f;
  }
  return out;
}

const MAP_CACHE = new Map();
function loadMap(src) {
  const hit = MAP_CACHE.get(src);
  if (hit) return hit;
  const e = { state: "loading", rgb: null };
  MAP_CACHE.set(src, e);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.onload = () => {
    try {
      const cv = document.createElement("canvas");
      cv.width = MASK_W; cv.height = MASK_H;
      const cx = cv.getContext("2d");
      if (!cx) throw new Error("no 2d");
      cx.drawImage(img, 0, 0, MASK_W, MASK_H);
      const px = cx.getImageData(0, 0, MASK_W, MASK_H).data;
      const out = new Uint8Array(MASK_W * MASK_H * 3);
      for (let i = 0; i < MASK_W * MASK_H; i++) {
        const a = px[i * 4 + 3] / 255;
        for (let k = 0; k < 3; k++) out[i * 3 + k] = px[i * 4 + k] * a;
      }
      e.rgb = out; e.state = "ready";
    } catch { e.state = "failed"; }
  };
  img.onerror = () => { e.state = "failed"; };
  img.src = src;
  return e;
}

const imageSrc = (v) => typeof v === "string" ? v : (v && typeof v.src === "string" ? v.src : "");

function buildDots(rows) {
  const xs = [], ys = [], zs = [], us = [], vs = [];
  for (let j = 0; j < rows; j++) {
    const lat = Math.PI / 2 - ((j + 0.5) / rows) * Math.PI;
    const cl = Math.cos(lat);
    const count = Math.max(1, Math.round(2 * rows * cl));
    for (let i = 0; i < count; i++) {
      const lon = ((i + (j % 2) * 0.5) / count) * TAU - Math.PI;
      xs.push(cl * Math.sin(lon)); ys.push(Math.sin(lat)); zs.push(cl * Math.cos(lon));
      us.push(clamp(Math.floor(((lon + Math.PI) / TAU) * MASK_W), 0, MASK_W - 1));
      vs.push(clamp(Math.floor((0.5 - lat / Math.PI) * MASK_H), 0, MASK_H - 1));
    }
  }
  const n = xs.length;
  const d = {
    n,
    x: Float32Array.from(xs), y: Float32Array.from(ys), z: Float32Array.from(zs),
    dx: new Float32Array(n), dy: new Float32Array(n), dz: new Float32Array(n),
    u: Uint16Array.from(us), v: Uint16Array.from(vs),
    reach: new Float32Array(n), k: new Float32Array(n), pick: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const jx = d.x[i] + (hash1(i, 1) - 0.5) * 1.2;
    const jy = d.y[i] + (hash1(i, 2) - 0.5) * 1.2;
    const jz = d.z[i] + (hash1(i, 3) - 0.5) * 1.2;
    const l = Math.hypot(jx, jy, jz) || 1;
    d.dx[i] = jx / l; d.dy[i] = jy / l; d.dz[i] = jz / l;
    d.reach[i] = 0.5 + hash1(i, 4) * 1.0;
    d.k[i] = SPRING_K[0] + hash1(i, 5) * (SPRING_K[1] - SPRING_K[0]);
    d.pick[i] = hash1(i, 6);
  }
  return d;
}

const mul3 = (a, b) =>
  a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));

function sphereFromView(yaw, pitch) {
  const cy = Math.cos(-yaw), sy = Math.sin(-yaw);
  const cp = Math.cos(-pitch), sp = Math.sin(-pitch);
  const ct = Math.cos(-AXIAL_TILT), st = Math.sin(-AXIAL_TILT);
  return mul3(
    mul3([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], [[1, 0, 0], [0, cp, -sp], [0, sp, cp]]),
    [[ct, -st, 0], [st, ct, 0], [0, 0, 1]]
  );
}

export default function StippleSphere(props) {
  const { background = DEFAULTS.background, drag = DEFAULTS.drag, style } = props;
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      W = root.offsetWidth; H = root.offsetHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(root);

    const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let reduce = !!(mq && mq.matches);
    const onMq = () => { reduce = !!(mq && mq.matches); };
    mq?.addEventListener?.("change", onMq);

    let yaw = 0, pitch = 0, vYaw = 0, vPitch = 0;
    let M = sphereFromView(0, 0);
    const ripples = [];

    let R = 1;
    const viewPoint = (x, y) => {
      const nx = (x - W / 2) / (R * FIT), ny = -(y - H / 2) / (R * FIT);
      const d2 = nx * nx + ny * ny;
      if (d2 > 1) return null;
      return [nx, ny, Math.sqrt(1 - d2)];
    };

    const addRipple = (v, amp) => {
      ripples.push({
        x: M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
        y: M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
        z: M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
        t: 0, amp,
      });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
    };

    let px = 0, py = 0, over = false;
    let dragging = false, dragId = -1, lastX = 0, lastY = 0, lastT = 0;
    let downX = 0, downY = 0, downT = 0, pressed = false, wandered = false, holding = false;
    let quiet = 0;

    const local = (e) => {
      const b = root.getBoundingClientRect();
      px = (e.clientX - b.left) * (b.width ? W / b.width : 1);
      py = (e.clientY - b.top) * (b.height ? H / b.height : 1);
    };
    const onMove = (e) => {
      local(e); over = true; quiet = 0;
      if (pressed && Math.hypot(px - downX, py - downY) >= CLICK_SLOP) wandered = true;
      if (!dragging || e.pointerId !== dragId) return;
      const now = performance.now();
      const dts = Math.max(0.001, (now - lastT) / 1000);
      const dYaw = (px - lastX) / R, dPitch = (py - lastY) / R;
      yaw += dYaw; pitch = clamp(pitch + dPitch, -MAX_PITCH, MAX_PITCH);
      vYaw += (dYaw / dts - vYaw) * 0.4; vPitch += (dPitch / dts - vPitch) * 0.4;
      lastX = px; lastY = py; lastT = now;
    };
    const onLeave = () => { if (!dragging && !pressed) over = false; };
    const onDown = (e) => {
      local(e); over = true; quiet = 0;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!viewPoint(px, py)) return;
      pressed = true; wandered = false; holding = false;
      downX = px; downY = py; downT = performance.now();
      root.setPointerCapture?.(e.pointerId);
      dragId = e.pointerId;
      if (!(propsRef.current.drag ?? DEFAULTS.drag)) return;
      dragging = true; lastX = px; lastY = py; lastT = downT;
      vYaw = 0; vPitch = 0; root.style.cursor = "grabbing";
    };
    const onUp = (e) => {
      if (!pressed || e.pointerId !== dragId) return;
      const p = propsRef.current;
      const v = viewPoint(downX, downY);
      if (e.type === "pointerup" && v && (p.ripple ?? DEFAULTS.ripple) > 0) {
        if (holding || !wandered) addRipple(v, 1);
      }
      if (!wandered && !holding) { vYaw = 0; vPitch = 0; }
      pressed = false; holding = false;
      if (dragging) {
        dragging = false;
        if (performance.now() - lastT > 80) { vYaw = 0; vPitch = 0; }
      }
      root.style.cursor = "";
      if (e.type === "pointercancel") over = false;
    };
    const onMenu = (e) => { if (pressed) e.preventDefault(); };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerenter", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    root.addEventListener("contextmenu", onMenu);

    let dots = null, rowsKey = -1;
    let land = new Float32Array(0), grown = new Float32Array(0), heat = new Float32Array(0);
    let off = new Float32Array(0), vel = new Float32Array(0), landKey = "";
    let palRGB = new Float32Array(0), palKey = "";
    let tint = new Uint8Array(0), tintKey = "";
    const styles = new Map();
    let hoverAmt = 0, hv = [0, 0, 1], charge = 0, idleT = 0, time = 0, last = -1, raf = 0;
    const ln = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
    const Lx = LIGHT[0] / ln, Ly = LIGHT[1] / ln, Lz = LIGHT[2] / ln;
    const paths = new Map();

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now; time += dt;
      if (W < 2 || H < 2) return;
      const p = propsRef.current;

      const rows = clamp(Math.round(p.rows ?? DEFAULTS.rows), 16, 100);
      if (rows !== rowsKey || !dots) {
        dots = buildDots(rows); rowsKey = rows;
        land = new Float32Array(dots.n); grown = new Float32Array(dots.n);
        heat = new Float32Array(dots.n); off = new Float32Array(dots.n);
        vel = new Float32Array(dots.n); tint = new Uint8Array(dots.n * 3);
        landKey = ""; tintKey = "";
      }
      const D = dots;

      const col = { ...DEFAULT_COLOR, ...p.color };
      const mode = col.mode;
      const listed = (col.colors ?? []).filter((c) => typeof c === "string" && c.trim());
      const pal = listed.length ? listed : [col.dotColor];
      if (pal.join("|") !== palKey) { palRGB = samplePalette(pal); palKey = pal.join("|"); }
      const nPal = pal.length;
      const dotRGB = rgbOf(col.dotColor), seaRGB = rgbOf(col.seaColor), glowRGB = rgbOf(col.glow);

      const userSrc = imageSrc(p.map);
      const user = userSrc ? loadMap(userSrc) : null;
      const own = !!(user && user.state !== "failed");
      const mask = own && user ? user : loadMap(EARTH_SRC);
      const mk = mask.rgb ? (own ? userSrc : EARTH_SRC) + rows : "";
      if (mk && mk !== landKey && mask.rgb) {
        const px2 = mask.rgb;
        for (let i = 0; i < D.n; i++) {
          const k = (D.v[i] * MASK_W + D.u[i]) * 3;
          land[i] = own ? (Math.max(px2[k], px2[k + 1], px2[k + 2]) > 127 ? 1 : 0) : px2[k] < 128 ? 1 : 0;
        }
        landKey = mk;
      }

      let tinted = false;
      if (mode === "image") {
        const src = own ? userSrc : EARTH_COLOR_SRC;
        const cm = own && user ? user : loadMap(EARTH_COLOR_SRC);
        if (cm.rgb && tintKey !== src + rows) {
          const lift = (v) => (own ? v : 255 * Math.pow(v / 255, EARTH_LIFT));
          for (let i = 0; i < D.n; i++) {
            const k = (D.v[i] * MASK_W + D.u[i]) * 3;
            tint[i * 3] = lift(cm.rgb[k]); tint[i * 3 + 1] = lift(cm.rgb[k + 1]); tint[i * 3 + 2] = lift(cm.rgb[k + 2]);
          }
          tintKey = src + rows;
        }
        tinted = tintKey === src + rows;
      }

      const gk = reduce ? 1 : (dt * 1000) / LAND_MS;
      for (let i = 0; i < D.n; i++) {
        const t = land[i];
        grown[i] = t > grown[i] ? Math.min(t, grown[i] + gk) : Math.max(t, grown[i] - gk);
      }

      const spd = Math.max(0, p.speed ?? DEFAULTS.speed) / 5;
      if (!dragging) {
        const decay = Math.exp(-dt / INERTIA_S);
        yaw += ((reduce ? 0 : (TAU * spd) / PERIOD_S) + (reduce ? 0 : vYaw)) * dt;
        pitch = clamp(pitch + (reduce ? 0 : vPitch) * dt, -MAX_PITCH, MAX_PITCH);
        vYaw *= decay; vPitch *= decay;
        pitch *= Math.exp(-dt / PITCH_RETURN_S);
      }
      M = sphereFromView(yaw, pitch);

      const cx = W / 2, cy = H / 2;
      R = Math.max(20, (p.size ?? DEFAULTS.size) / 2);

      const hk = Math.max(0, p.hover ?? DEFAULTS.hover) / 5;
      const pv = over && !dragging ? viewPoint(px, py) : null;
      if (pv) hv = pv;
      const ek = reduce ? 1 : 1 - Math.exp(-dt / 0.25);
      hoverAmt += ((pv && hk > 0 ? 1 : 0) - hoverAmt) * ek;

      const bk = Math.max(0, p.burst ?? DEFAULTS.burst) / 5;
      if (pressed && !holding && !wandered && bk > 0 && !reduce && now - downT > HOLD_MS) holding = true;
      charge = holding ? Math.min(1, charge + dt / CHARGE_S) : 0;
      const spread = (1 - Math.pow(1 - charge, 3)) * BURST_REACH * bk;

      const rk = Math.max(0, p.ripple ?? DEFAULTS.ripple) / 5;
      const rippleLife = Math.PI / RIPPLE_SPEED + 0.3;
      for (let k = ripples.length - 1; k >= 0; k--) {
        ripples[k].t += reduce ? rippleLife : dt;
        if (ripples[k].t >= rippleLife) ripples.splice(k, 1);
      }
      quiet += dt;
      if (!reduce && rk > 0 && !pressed && quiet > IDLE_AFTER_S && landKey) {
        idleT += dt;
        if (idleT >= IDLE_EVERY_S) {
          idleT = 0;
          for (let tries = 0; tries < 24; tries++) {
            const i = Math.floor(Math.random() * D.n);
            if (!land[i]) continue;
            const x = D.x[i], y = D.y[i], z = D.z[i];
            const vz = M[0][2] * x + M[1][2] * y + M[2][2] * z;
            if (vz < 0.35) continue;
            ripples.push({ x, y, z, t: 0, amp: IDLE_AMP });
            if (ripples.length > MAX_RIPPLES) ripples.shift();
            break;
          }
        }
      } else idleT = IDLE_EVERY_S * 0.6;

      const dotFrac = clamp(p.dotSize ?? DEFAULTS.dotSize, 10, 100) / 100;
      const sea = clamp(p.seaDots ?? DEFAULTS.seaDots, 0, 100) / 100;
      const far = clamp(p.farSide ?? DEFAULTS.farSide, 0, 100) / 100;
      const r0 = (R * FIT * (Math.PI / rows) * dotFrac) / 2;
      const m = M;
      const cool = Math.exp(-dt / TRAIL_S);
      const steps = reduce ? 0 : Math.ceil(dt / (1 / 120));
      const h = steps ? dt / steps : 0;
      paths.clear();
      const haloOuter = new Path2D(), haloInner = new Path2D();
      let anyHalo = false;

      for (let i = 0; i < D.n; i++) {
        const x = D.x[i], y = D.y[i], z = D.z[i];
        const vx = m[0][0] * x + m[1][0] * y + m[2][0] * z;
        const vy = m[0][1] * x + m[1][1] * y + m[2][1] * z;
        const vz = m[0][2] * x + m[1][2] * y + m[2][2] * z;

        let ht = heat[i] * cool, lift = 0;
        if (hoverAmt > 0.001 && vz > 0) {
          const d = 1 - (vx * hv[0] + vy * hv[1] + vz * hv[2]);
          if (d < TRAIL_REACH * 6) {
            lift += HOVER_LIFT * hk * hoverAmt * Math.exp(-d / HOVER_REACH);
            ht = Math.max(ht, Math.min(1, hk) * hoverAmt * Math.exp(-d / TRAIL_REACH));
          }
        }
        for (const rp of ripples) {
          const th = Math.acos(clamp(x * rp.x + y * rp.y + z * rp.z, -1, 1));
          const o = (th - rp.t * RIPPLE_SPEED) / RIPPLE_WIDTH;
          if (o > -3 && o < 3) {
            const w = Math.exp(-o * o) * (1 - rp.t / rippleLife) ** 2 * rp.amp;
            lift += RIPPLE_LIFT * rk * w;
            ht = Math.max(ht, Math.min(1, rk) * w);
          }
        }

        if (spread > 0 || off[i] !== 0 || vel[i] !== 0) {
          const target = spread * D.reach[i] + (charge > 0 ? TREMBLE * charge * Math.sin(time * 23 + i * 1.7) : 0);
          let o = off[i], v = vel[i];
          for (let s = 0; s < steps; s++) {
            v += (D.k[i] * (target - o) - SPRING_DAMP * v) * h; o += v * h;
          }
          if (steps === 0) { o = target; v = 0; }
          else if (target === 0 && Math.abs(o) < 1e-4 && Math.abs(v) < 1e-3) { o = 0; v = 0; }
          off[i] = o; vel[i] = v;
        }
        heat[i] = ht;

        const flying = off[i] !== 0 || vel[i] !== 0;
        const glowHt = ht;
        if (flying) ht = Math.max(ht, Math.min(0.7, Math.abs(vel[i]) * 0.25 + off[i] * 0.4));

        const o = off[i];
        const k = 1 + lift;
        let qx = vx * k, qy = vy * k, qz = vz * k;
        if (o !== 0) {
          const ddx = D.dx[i], ddy = D.dy[i], ddz = D.dz[i];
          qx += (m[0][0] * ddx + m[1][0] * ddy + m[2][0] * ddz) * o;
          qy += (m[0][1] * ddx + m[1][1] * ddy + m[2][1] * ddz) * o;
          qz += (m[0][2] * ddx + m[1][2] * ddy + m[2][2] * ddz) * o;
        }
        const persp = CAM / Math.max(NEAR, CAM - qz);
        const s = persp * FIT * R;
        const sx = cx + qx * s, sy2 = cy - qy * s;

        const size = sea + (1 - sea) * grown[i];
        const rad = r0 * Math.min(MAX_SWELL, persp * size * (1 + lift * SWELL));
        if (rad < 0.25) continue;

        const nz = o > 0 ? clamp(qz / Math.max(1, Math.hypot(qx, qy, qz)), -1, 1) : vz;
        const front = clamp((nz + 0.2) / 0.45, 0, 1);
        const fs = front * front * (3 - 2 * front);
        const lit = 0.35 + 0.65 * Math.max(0, vx * Lx + vy * Ly + vz * Lz);
        const alpha = Math.min(1, (far + (1 - far) * fs) * (1 - fs + fs * lit) + lift * 6 + ht * 0.6 * fs);
        if (alpha < 0.01) continue;

        let br, bg, bb;
        if (mode === "mono") {
          br = dotRGB[0]; bg = dotRGB[1]; bb = dotRGB[2];
        } else if (mode === "image") {
          const g = tinted ? grown[i] : 0;
          br = seaRGB[0] + (tint[i * 3] - seaRGB[0]) * g;
          bg = seaRGB[1] + (tint[i * 3 + 1] - seaRGB[1]) * g;
          bb = seaRGB[2] + (tint[i * 3 + 2] - seaRGB[2]) * g;
        } else {
          let t;
          if (mode === "bands") t = (y + 1) / 2;
          else if (mode === "scatter") t = nPal > 1 ? Math.floor(D.pick[i] * nPal) / (nPal - 1) : 0;
          else t = clamp((vx - vy) * 0.3536 + 0.5, 0, 1);
          const pi = Math.round(t * (PAL_STEPS - 1)) * 3;
          br = palRGB[pi]; bg = palRGB[pi + 1]; bb = palRGB[pi + 2];
        }

        const hm = ht * 0.85;
        const qr = Math.round(((br + (glowRGB[0] - br) * hm) / 255) * (LEVELS - 1));
        const qg = Math.round(((bg + (glowRGB[1] - bg) * hm) / 255) * (LEVELS - 1));
        const qb = Math.round(((bb + (glowRGB[2] - bb) * hm) / 255) * (LEVELS - 1));
        const ai = Math.min(BUCKETS - 1, Math.floor(alpha * BUCKETS));
        const key = ((qr * LEVELS + qg) * LEVELS + qb) * BUCKETS + ai;
        let path = paths.get(key);
        if (!path) { path = new Path2D(); paths.set(key, path); }
        path.moveTo(sx + rad, sy2);
        path.arc(sx, sy2, rad, 0, TAU);

        if (glowHt > 0.45 && fs > 0.5 && !flying) {
          haloOuter.moveTo(sx + rad * HALO[0], sy2);
          haloOuter.arc(sx, sy2, rad * HALO[0], 0, TAU);
          haloInner.moveTo(sx + rad * HALO[1], sy2);
          haloInner.arc(sx, sy2, rad * HALO[1], 0, TAU);
          anyHalo = true;
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (anyHalo) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = col.glow;
        ctx.globalAlpha = 0.05; ctx.fill(haloOuter);
        ctx.globalAlpha = 0.08; ctx.fill(haloInner);
        ctx.globalCompositeOperation = "source-over";
      }

      const keys = Array.from(paths.keys()).sort((a, b) => (a % BUCKETS) - (b % BUCKETS));
      for (const key of keys) {
        ctx.globalAlpha = ((key % BUCKETS) + 1) / BUCKETS;
        const code = Math.floor(key / BUCKETS);
        let st = styles.get(code);
        if (!st) {
          const c = [Math.floor(code / (LEVELS * LEVELS)), Math.floor(code / LEVELS) % LEVELS, code % LEVELS];
          st = `rgb(${c.map((v) => Math.round((v / (LEVELS - 1)) * 255)).join(",")})`;
          styles.set(code, st);
        }
        ctx.fillStyle = st;
        ctx.fill(paths.get(key));
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      mq?.removeEventListener?.("change", onMq);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerenter", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      root.removeEventListener("contextmenu", onMenu);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        ...style,
        overflow: "hidden",
        background,
        cursor: drag ? "grab" : "pointer",
        touchAction: "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none" }}
      />
    </div>
  );
}
