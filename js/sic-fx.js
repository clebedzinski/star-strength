/* Weather overlay. Decorative only. Stops when motion is reduced or the effect is off. */
(function () {
  const FX = { canvas: null, ctx: null, type: 'off', intensity: 2, running: false, raf: 0, parts: [], acc: 0, w: 0, h: 0, pal: { snow: '255,255,255', rain: '174,200,235', accent: '245,158,11' } };
  function resize() {
    if (!FX.canvas) return;
    FX.w = window.innerWidth; FX.h = window.innerHeight;
    FX.canvas.width = FX.w; FX.canvas.height = FX.h;
  }
  function spawn(type) {
    if (type === 'snow') return { x: Math.random() * FX.w, y: -8, r: 1 + Math.random() * 2.4, vy: 30 + Math.random() * 40, a: 0.4 + Math.random() * 0.5 };
    if (type === 'rain') return { x: Math.random() * FX.w, y: -20, len: 10 + Math.random() * 12, vy: 480 + Math.random() * 200 };
    if (type === 'fire' || type === 'smoke') return { x: Math.random() * FX.w, y: FX.h + 4, vy: -(40 + Math.random() * 70), life: 1 + Math.random(), age: 0, s: 8 + Math.random() * 16 };
    return { x: Math.random() * FX.w, y: Math.random() * FX.h, r: 0, max: 40 + Math.random() * 70 };
  }
  function frame() {
    if (!FX.running) return;
    FX.raf = requestAnimationFrame(frame);
    const ctx = FX.ctx; if (!ctx) return;
    ctx.clearRect(0, 0, FX.w, FX.h);
    const n = [24, 48, 80][FX.intensity - 1] || 48;
    if (FX.type === 'ripples') {
      if (FX.parts.length < n / 8) FX.parts.push(spawn('ripples'));
      ctx.strokeStyle = 'rgb(' + FX.pal.accent + ')';
      FX.parts.forEach(function (p) { p.r += 0.6; });
      FX.parts = FX.parts.filter(function (p) { return p.r < p.max; });
      FX.parts.forEach(function (p) { ctx.globalAlpha = 1 - p.r / p.max; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.stroke(); });
      ctx.globalAlpha = 1;
      return;
    }
    while (FX.parts.length < n) FX.parts.push(spawn(FX.type));
    if (FX.type === 'snow') {
      ctx.fillStyle = 'rgb(' + FX.pal.snow + ')';
      FX.parts.forEach(function (p) { p.y += p.vy / 60; if (p.y > FX.h) Object.assign(p, spawn('snow')); ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); });
    } else if (FX.type === 'rain') {
      ctx.strokeStyle = 'rgba(' + FX.pal.rain + ',0.7)';
      FX.parts.forEach(function (p) { p.y += p.vy / 60; if (p.y > FX.h) Object.assign(p, spawn('rain')); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3, p.y - p.len); ctx.stroke(); });
    } else {
      FX.parts.forEach(function (p) { p.age += 0.016; p.y += p.vy / 60; });
      FX.parts = FX.parts.filter(function (p) { return p.age < p.life; });
      FX.parts.forEach(function (p) {
        const t = p.age / p.life;
        ctx.globalAlpha = FX.type === 'smoke' ? (1 - t) * 0.25 : (1 - t) * 0.8;
        ctx.fillStyle = FX.type === 'smoke' ? '#cbd5e1' : 'rgb(255,' + Math.round(160 - 80 * t) + ',40)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (FX.type === 'smoke' ? 1 + t : 1), 0, 6.28); ctx.fill();
      });
    }
    ctx.globalAlpha = 1;
  }
  function apply() {
    const reduced = FX.reduced || FX.type === 'off';
    if (reduced) {
      FX.running = false; if (FX.raf) cancelAnimationFrame(FX.raf);
      if (FX.canvas) { FX.canvas.style.display = 'none'; if (FX.ctx) FX.ctx.clearRect(0, 0, FX.w, FX.h); }
      return;
    }
    FX.canvas.style.display = 'block';
    resize(); FX.parts = [];
    if (!FX.running) { FX.running = true; frame(); }
  }
  window.SICFx = {
    init: function () {
      FX.canvas = document.getElementById('fx-canvas');
      if (!FX.canvas) return;
      FX.ctx = FX.canvas.getContext('2d');
      window.addEventListener('resize', resize);
      window.addEventListener('pointerdown', function (e) {
        if (FX.type === 'ripples' && FX.running) FX.parts.push({ x: e.clientX, y: e.clientY, r: 0, max: 120 });
      }, { passive: true });
      document.addEventListener('visibilitychange', function () { if (document.hidden) { FX.running = false; } else apply(); });
      apply();
    },
    configure: function (opts) {
      FX.type = opts.type || 'off';
      FX.intensity = opts.intensity || 2;
      FX.reduced = !!opts.reduced;
      if (opts.accent) FX.pal.accent = opts.accent;
      apply();
    }
  };
})();
