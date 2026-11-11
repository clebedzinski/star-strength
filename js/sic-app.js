/* SIC application shell. Behavior lives in sic-logic.js. Skins only change composition. */
(function () {
  const SIC = window.SIC;
  const DATA = window.SICData;
  const CFG = window.SIC_CONFIG || { appVersion: '1.0.0-sic', bugReportEndpoint: '', bugReportVerified: false };
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo') === '1';
  const ids = SIC.createIds(1000);
  const ui = {
    tab: params.get('tab') || 'log',
    mini: params.get('mini') === '1',
    miniOpen: params.get('mini') === '1',
    pop: null,
    overlay: null,
    whatsBar: false,
    welcome: false,
    flipped: false,
    miniWide: false,
    padOn: false,
    padFamily: 'generic',
    padIndex: 0,
    dialog: null,
    historyReverse: false,
    historyMuscle: 'all',
    historyView: 'sessions',
    historyOpen: {},
    console: [],
    quoteIndex: 0,
    toast: null,
    calc: { weight: '225', reps: '5' },
    builder: null,
    testInput: '',
    folderStatus: { routines: '', history: '', backups: '' },
    bugPreview: false,
    settingsCat: null,
    settingsSub: 'skin'
  };
  const runtime = { logLockUntil: 0, undo: null, restAlive: { batman: false, robin: false }, nodes: [], saveTimer: 0, dirty: false, lastError: '', bugVerified: false, handles: {}, metro: null, phase: 'READY' };
  let state = null;
  let audioCtx = null;
  let userSound = false;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function fmtClock(sec) { sec = Math.max(0, Math.round(sec)); return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); }
  function fmtW(n) { n = Number(n) || 0; return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10); }
  function muscleIcon(m) { return (DATA.muscleIcon ? DATA.muscleIcon(m, 28) : ''); }
  function partner() { return SIC.activePartner(state); }
  function skin() { return SIC.getSkin(state); }
  function map() { return SIC.inputMap(state.settings.inputMap, state.settings.psConfirmSwap); }
  function prompt(action) {
    if (!state.settings.showPrompts) return '';
    const last = state.settings.lastInput;
    if (last !== 'keyboard' && last !== 'xbox' && last !== 'playstation') return '';
    return SIC.promptFor(action, last, map());
  }
  function lum(hex) {
    const rgb = SIC.hexToRgb(hex) || { r: 11, g: 15, b: 23 };
    const f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
  }
  function contrast(a, b) {
    const L1 = lum(a), L2 = lum(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }
  function inkFor(bg) { return lum(bg) > 0.45 ? '#0F172A' : '#F8FAFC'; }
  function reducedMotion() {
    if (state.settings.motion === 'reduce') return true;
    if (state.settings.motion === 'full') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function native() { return window.SicNative || null; }
  function platformName() {
    try { if (native() && native().getPlatform) return String(native().getPlatform()); } catch (e) {}
    return 'web';
  }
  function bugEndpoint() { return (state.settings.bugEndpoint || CFG.bugReportEndpoint || '').trim(); }
  function bugStatus() { return SIC.bugFeatureStatus({ endpoint: bugEndpoint(), verified: !!(runtime.bugVerified || CFG.bugReportVerified) }); }

  function memoryStorage(seed) {
    const m = Object.assign({}, seed || {});
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; },
      key: function (i) { return Object.keys(m)[i] || null; },
      get length() { return Object.keys(m).length; }
    };
  }
  const storage = demo ? memoryStorage({}) : window.localStorage;

  function readAll() {
    const raw = {}, decoded = {};
    const keys = [];
    for (let i = 0; i < storage.length; i++) keys.push(storage.key(i));
    SIC.APP_KEYS.concat(keys).forEach(function (k) {
      if (!k || raw[k] !== undefined) return;
      const v = storage.getItem(k);
      if (v == null) return;
      raw[k] = v;
      decoded[k] = SIC.decodeStored(v);
    });
    return { raw: raw, decoded: decoded };
  }

  function bootState() {
    const bundle = readAll();
    const migrated = SIC.migrate(bundle, { now: Date.now(), id: ids });
    state = migrated.state;
    if (!demo && !bundle.raw.ss_migration_v1 && Object.keys(migrated.backup.legacy).length) {
      try { storage.setItem('ss_migration_v1', JSON.stringify(migrated.backup)); } catch (e) { runtime.lastError = 'Could not store the migration backup.'; }
    }
    const days = Object.keys((state.routines[state.activeRoutineId] && state.routines[state.activeRoutineId].days) || {});
    if (state.settings.activeDay && days.indexOf(state.settings.activeDay) >= 0) state.activeDay = state.settings.activeDay;
    else state.activeDay = SIC.autoDay(state.routines[state.activeRoutineId], Date.now());
    runtime.bugVerified = !!state.settings.bugVerified;
    if (demo) seedDemo();
    if (params.get('skin') && (SIC.SKIN_SLUGS.indexOf(params.get('skin')) >= 0)) state.skinId = params.get('skin');
    if (params.get('panel')) ui.overlay = params.get('panel');
    if (params.get('panel') === 'builder') ui.builder = { name: '', days: [{ name: 'Push', exercises: ['Barbell Bench Press'] }] };
    if (params.get('panel') === 'xml') ui.xmlPreview = { routineCount: 2, historyCount: 1, routineConflicts: [{ id: 't', name: 'Test', existingName: 'Test' }], historyConflicts: [{ id: 'h' }] };
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) state.settings.lastInput = 'touch';
    if (params.get('set')) ui.settingsCat = params.get('set');
    if (params.get('sub')) ui.settingsSub = params.get('sub');
    if (!demo) {
      let seenWelcome = '';
      try { seenWelcome = storage.getItem('ss_seen_welcome') || ''; } catch (e) {}
      if (!seenWelcome) ui.welcome = true;
      else if (storage.getItem('ss_seen_version') !== CFG.appVersion) ui.whatsBar = true;
    }
  }

  function seedDemo() {
    const ex = state.routines.bls5.days.Push[0];
    state.activeDay = 'Push';
    const data = SIC.ensureExerciseSession(state, ex, ids);
    if (params.get('blank') !== '1' && data.sets.length < 4) SIC.addSet(state, ex.id, ids);
    if (params.get('blank') !== '1') {
      data.sets[0].weight = '185'; data.sets[0].reps = '5'; data.sets[0].done = true;
      data.sets[1].weight = '205'; data.sets[1].reps = '5'; data.sets[1].done = true;
      data.sets[2].weight = '225'; data.sets[2].reps = '5'; data.sets[2].done = true;
      data.sets[3].weight = '225'; data.sets[3].reps = '';
    }
    state.focus = { exerciseId: ex.id, setId: data.sets[params.get('blank') === '1' ? 0 : 3].id };
    state.history.unshift({ id: 'demo_prev', ts: Date.now() - 86400000, date: 'Yesterday', routineName: state.routines.bls5.name, dayName: 'Push', duo: false, exercises: [{ exercise: ex.name, muscle: 'CHEST', partner: 'batman', sets: [{ type: 'Normal', weight: '205', reps: '5' }, { type: 'Normal', weight: '205', reps: '5' }, { type: 'Normal', weight: '225', reps: '3' }] }] });
    state.personalRecords = SIC.recalcPRs(state.history);
  }

  function markDirty() { runtime.dirty = true; paintSave('dirty'); if (state.settings.autosave) scheduleSave(); }
  function scheduleSave() { clearTimeout(runtime.saveTimer); runtime.saveTimer = setTimeout(function () { persist('auto'); }, 350); }
  function paintSave(kind) {
    const el = $('save-state'); if (!el) return;
    el.dataset.kind = kind;
    el.textContent = kind === 'error' ? 'Save error' : kind === 'dirty' ? (state.settings.autosave ? 'Saving…' : 'Unsaved') : 'Saved';
    el.hidden = kind !== 'error' && kind !== 'dirty';
  }
  function executeOps(ops) {
    ops.forEach(function (op) {
      if (op.op === 'set') storage.setItem(op.key, op.value);
      else storage.removeItem(op.key);
    });
  }
  function persist(reason) {
    if (demo) { runtime.dirty = false; paintSave('saved'); return { ok: true, demo: true }; }
    const payload = {
      ss_routines: state.routines, ss_history: state.history, ss_current_session: state.currentSession,
      ss_prs: state.personalRecords, ss_custom_themes: state.themes, ss_duo_mode: state.duoMode,
      ss_partner_names: state.partnerNames, ss_active_theme_id: state.activeThemeId, ss_sound: state.soundEnabled,
      ss_fx: state.fx, ss_rest: state.rest, ss_active_routine_id: state.activeRoutineId, ss_settings: state.settings,
      ss_skin: state.skinId, ss_skin_overrides: state.skinOverrides, ss_community_skins: state.communitySkins,
      ss_profiles: state.profiles, ss_profile_vault: state.profileVault, ss_snapshots: state.snapshots,
      ss_bug_queue: state.settings.bugQueue || [], ss_schema_version: SIC.SCHEMA
    };
    try {
      Object.keys(payload).forEach(function (k) { executeOps(SIC.planAtomicWrite(k, payload[k])); });
      const snap = SIC.pushSnapshot(state.snapshots, { at: Date.now(), reason: reason || 'auto', session: state.currentSession, routineId: state.activeRoutineId, day: state.activeDay }, 5);
      state.snapshots = snap;
      executeOps(SIC.planAtomicWrite('ss_snapshots', snap));
      runtime.dirty = false;
      runtime.lastError = '';
      paintSave('saved');
      try { storage.setItem('ss_rev', String(Date.now())); runtime.rev = storage.getItem('ss_rev'); } catch (err) {}
      pushNativeState();
      return { ok: true };
    } catch (e) {
      runtime.lastError = e && e.message ? e.message : 'storage';
      paintSave('error');
      return { ok: false, error: runtime.lastError };
    }
  }

  function pushNativeState() {
    const n = native();
    if (!n || !n.writeSharedState) return;
    try { n.writeSharedState(JSON.stringify({ at: Date.now(), mini: ui.miniOpen, skin: state.skinId, routine: state.activeRoutineId, day: state.activeDay })); } catch (e) {}
  }

  function applyChrome() {
    const pal = SIC.effectivePalette(state);
    const sk = skin();
    const root = document.documentElement;
    const bg = pal.bg;
    const card = pal.card || pal.surface || bg;
    let text = pal.text;
    if (contrast(text, bg) < 4.5) text = inkFor(bg);
    if (contrast(text, card) < 4.5) text = inkFor(card);
    let muted = pal.muted || text;
    if (contrast(muted, card) < 3) muted = lum(card) > 0.45 ? '#334155' : '#cbd5e1';
    const light = lum(bg) > 0.45;
    const onAccent = contrast(pal.onAccent || '#000000', pal.accent) < 3 ? inkFor(pal.accent) : (pal.onAccent || inkFor(pal.accent));
    root.style.setProperty('--bg', bg);
    root.style.setProperty('--card', card);
    root.style.setProperty('--border', pal.border);
    root.style.setProperty('--text', text);
    root.style.setProperty('--accent', pal.accent);
    root.style.setProperty('--accent-2', pal.accent2 || pal.accent);
    root.style.setProperty('--on-accent', onAccent);
    root.style.setProperty('--muted', muted);
    root.style.setProperty('--field-bg', light ? '#ffffff' : '#0f172a');
    root.style.setProperty('--field-text', light ? '#0f172a' : '#f8fafc');
    root.style.setProperty('--field-border', light ? '#64748b' : '#94a3b8');
    root.style.setProperty('--surface', pal.surface || pal.bg);
    root.style.setProperty('--font', pal.font || sk.font || "Inter, system-ui, sans-serif");
    root.style.setProperty('--radius', (sk.radius || 12) + 'px');
    root.style.setProperty('--panel-opacity', String(SIC.clampOpacity(state.settings.panelOpacity, 0.6)));
    const timer = Object.assign({}, sk.timer, state.settings.timer.style === 'auto' ? {} : state.settings.timer);
    root.style.setProperty('--timer-opacity', String(SIC.clampOpacity(state.settings.timer.opacity || timer.opacity || 1, 0.6)));
    const scaleCap = function (n) { const x = Number(n) || 1; return String(Math.max(0.85, Math.min(1.15, x))); };
    root.style.setProperty('--timer-scale', scaleCap(state.settings.timer.scale || timer.scale || 1));
    root.style.setProperty('--metro-opacity', String(SIC.clampOpacity(state.settings.metronome.opacity || 1, 0.6)));
    root.style.setProperty('--metro-scale', scaleCap(state.settings.metronome.scale || 1));
    const showPrompts = state.settings.lastInput === 'keyboard' || state.settings.lastInput === 'xbox' || state.settings.lastInput === 'playstation';
    document.body.className = 'sic skin-' + sk.layout + ' density-' + (sk.density || 'regular') + (showPrompts ? ' show-prompts' : '');
    const typeScale = Math.max(0.95, Math.min(1.12, Number(state.settings.textScale) || 1));
    document.documentElement.style.fontSize = (16 * typeScale) + 'px';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', pal.bg);
    if (window.SICFx) {
      const rgb = SIC.hexToRgb(pal.accent) || { r: 245, g: 158, b: 11 };
      window.SICFx.configure({ type: state.fx.type, intensity: state.fx.intensity, reduced: reducedMotion(), accent: rgb.r + ',' + rgb.g + ',' + rgb.b });
    }
    applyArt();
  }
  function artUrl(file) {
    const packed = window.SIC_ART && window.SIC_ART[file];
    if (packed) return packed;
    return new URL('assets/skins/' + file, location.href).href;
  }
  function applyArt() {
    const packs = {
      pixelforecast: { bg: 'pixelforecast/background.webp', frame: 'pixelforecast/window-frame.webp', sky: 'pixelforecast/sky-tile.webp', mini: 'pixelforecast/mini-window.webp' },
      irondial: { bg: 'irondial/background.webp', ring: 'irondial/dial-ring.webp', bolt: 'irondial/bolt.webp', mini: 'irondial/mini-puck.webp' }
    };
    const pack = packs[state.skinId] || {};
    ['bg', 'frame', 'sky', 'ring', 'bolt', 'mini'].forEach(function (key) {
      document.documentElement.style.setProperty('--art-' + key, pack[key] ? 'url("' + artUrl(pack[key]) + '")' : 'none');
    });
  }

  function view() {
    const p = partner();
    const exercises = SIC.visibleExercises(state).map(function (item) {
      const data = SIC.ensureExerciseSession(state, item.exercise, ids);
      return {
        id: item.exercise.id, name: item.exercise.name, muscle: item.exercise.muscle || 'OTHER', target: item.exercise.target || '',
        notes: data.notes || '', source: item.source,
        sets: (data.sets || []).map(function (s, i) {
          const prev = SIC.previousFor(state, item.exercise.name, p, i);
          return {
            id: s.id, type: s.type || 'Normal', index: i,
            weight: s[SIC.fieldPair(p, 'weight')] || '',
            reps: s[SIC.fieldPair(p, 'reps')] || '',
            hintW: s[SIC.hintField(p, 'weight')] || '',
            hintR: s[SIC.hintField(p, 'reps')] || '',
            prev: prev ? prev.weight + '×' + prev.reps : '—',
            done: SIC.setDone(s, p)
          };
        })
      };
    });
    const cur = SIC.findCurrent(state);
    exercises.forEach(function (ex) { ex.sets.forEach(function (s) { s.current = !!(cur && cur.set && cur.set.id === s.id); }); ex.current = !!(cur && cur.exercise && cur.exercise.id === ex.id); });
    const now = Date.now();
    return {
      exercises: exercises,
      current: cur,
      partner: p,
      name: state.partnerNames[p] || p,
      duo: state.duoMode,
      rest: { batman: SIC.restRemaining(state, 'batman', now), robin: SIC.restRemaining(state, 'robin', now) },
      routine: state.routines[state.activeRoutineId],
      day: state.activeDay
    };
  }

  function ptag(action) { const g = prompt(action); return g ? '<span class="prompt">' + esc(g) + '</span>' : ''; }
  function logBtn(extra) { return '<button type="button" class="log-set" data-act="log-set" data-focus="1" ' + (extra || '') + '>LOG SET' + ptag('logSet') + '</button>'; }
  function finishBtn() { return '<button type="button" class="finish" data-act="finish" data-focus="1">FINISH WORKOUT' + ptag('finishChord') + '</button>'; }
  function stepper(ex, set, field, minus, plus) {
    return '<span class="stepper"><button type="button" data-act="nudge" data-focus="1" data-ex="' + esc(ex) + '" data-set="' + esc(set) + '" data-field="' + field + '" data-dir="-1" aria-label="' + minus + '">' + minus + ptag(field === 'weight' ? 'weightDown' : 'repsDown') + '</button><button type="button" data-act="nudge" data-focus="1" data-ex="' + esc(ex) + '" data-set="' + esc(set) + '" data-field="' + field + '" data-dir="1" aria-label="' + plus + '">' + plus + ptag(field === 'weight' ? 'weightUp' : 'repsUp') + '</button></span>';
  }
  function numInput(ex, set, field, value, hint) {
    const label = field === 'weight' ? (state.settings.units === 'kg' ? 'Kilograms' : 'Pounds') : 'Reps';
    return '<input data-lockrender="1" data-act="field" data-ex="' + esc(ex) + '" data-set="' + esc(set) + '" data-field="' + field + '" inputmode="decimal" value="' + esc(value) + '" placeholder="" aria-label="' + label + '">';
  }
  function typeSelect(ex, set, value) {
    return '<select data-act="field" data-ex="' + esc(ex) + '" data-set="' + esc(set) + '" data-field="type">' + SIC.SET_TYPES.map(function (t) { return '<option' + (t === value ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>';
  }
  function tabBar() { return '<nav class="tabs" aria-label="Sections">' + tabs() + '</nav>'; }
  function tabs() {
    return ['log', 'routines', 'history', 'analytics'].map(function (t) {
      const label = t === 'log' ? 'Log' : t[0].toUpperCase() + t.slice(1);
      return '<button type="button" class="tab" data-act="tab" data-tab="' + t + '" data-focus="1" aria-current="' + (ui.tab === t ? 'true' : 'false') + '">' + label + '</button>';
    }).join('');
  }
  function daySelect() {
    const days = Object.keys((viewCache.routine && viewCache.routine.days) || {});
    return '<select data-act="day" aria-label="Workout day">' + days.map(function (d) { return '<option' + (d === state.activeDay ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') + '</select>';
  }
  let viewCache = null;
  function datalist() {
    return '<datalist id="ex-db">' + DATA.exerciseDatabase.map(function (e) { return '<option value="' + esc(e.name) + '"></option>'; }).join('') + '</datalist>';
  }
  function adder() {
    return '<div class="card"><strong>Add exercise</strong><div class="row"><input id="add-name" data-lockrender="1" list="ex-db" placeholder="Exercise name" aria-label="Exercise to add"><button type="button" class="primary" data-act="add-ask" data-focus="1">Add</button></div>' + datalist() + '<p class="muted">You choose today only, or part of this routine from now on. History is kept either way.</p></div>';
  }
  function restLine() {
    const v = viewCache;
    const bits = ['<span class="timer-readout" data-rest="batman">Rest ' + fmtClock(v.rest.batman) + '</span>'];
    if (state.duoMode) bits.push('<span class="timer-readout" data-rest="robin">' + esc(state.partnerNames.robin) + ' ' + fmtClock(v.rest.robin) + '</span>');
    bits.push('<span class="metro-readout" data-metro>' + esc(runtime.phase) + '</span>');
    return '<div class="row">' + bits.join('') + '<button type="button" class="ghost" data-act="overlay" data-overlay="rest">Rest</button><button type="button" class="ghost" data-act="overlay" data-overlay="tempo">Tempo</button></div>';
  }
  function partners() {
    if (!state.duoMode) return '';
    return '<div class="row">' + ['batman', 'robin'].map(function (p) {
      return '<button type="button" class="ghost" data-act="partner" data-partner="' + p + '" aria-current="' + (state.activePartner === p ? 'true' : 'false') + '">' + esc(state.partnerNames[p]) + '</button>';
    }).join('') + '</div>';
  }
  function setBlock(ex, s) {
    const unit = state.settings.units === 'kg' ? 'kg' : 'lb';
    return '<div class="setline' + (s.current ? ' current' : '') + '"><div class="setline-top"><button type="button" class="ghost" data-act="del-set" data-ex="' + esc(ex.id) + '" data-set="' + esc(s.id) + '" aria-label="Delete set ' + (s.index + 1) + '">Delete</button><strong>Set ' + (s.index + 1) + '</strong>' + typeSelect(ex.id, s.id, s.type) + '<span class="prev">Last ' + esc(s.prev) + '</span><button type="button" class="done ' + (s.done ? 'on' : '') + '" data-act="toggle-done" data-ex="' + esc(ex.id) + '" data-set="' + esc(s.id) + '" aria-label="Mark set ' + (s.index + 1) + ' done">' + (s.done ? 'Done' : 'Log') + '</button></div><label>' + unit + ' ' + numInput(ex.id, s.id, 'weight', s.weight, s.hintW) + '</label><label>Reps ' + numInput(ex.id, s.id, 'reps', s.reps, s.hintR) + '</label></div>';
  }
  function ico(name) {
    const paths = {
      bug: '<path d="M8 9h8v6a4 4 0 0 1-8 0V9z"/><path d="M9 9V7a3 3 0 0 1 6 0v2M5 13h3M16 13h3M7 7 5 5M17 7l2-2M7 17l-2 2M17 17l2 2"/>',
      drum: '<ellipse cx="12" cy="14" rx="7" ry="4"/><path d="M5 14V10c0-2 3-4 7-4s7 2 7 4v4M12 6V3M9 3h6"/>',
      calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
      mini: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="12" width="7" height="5" rx="1"/>',
      lift: '<path d="M6 9v6M18 9v6M3 10v4M21 10v4M6 12h12"/>',
      cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
      clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>',
      chart: '<path d="M4 19h16M7 16l3-5 3 3 4-7"/>',
      trash: '<path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12"/>',
      check: '<path d="M5 12l5 5L20 7"/>',
      plus: '<path d="M12 5v14M5 12h14"/>'
    };
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || '') + '</svg>';
  }
  function classicTabs() {
    return [['log', 'Log', 'lift'], ['routines', 'Routines', 'cal'], ['history', 'History', 'clock'], ['analytics', 'Analytics', 'chart']].map(function (t) {
      return '<button type="button" class="tab" data-act="tab" data-tab="' + t[0] + '" data-pad="1" data-focus="1" aria-current="' + (ui.tab === t[0] ? 'true' : 'false') + '">' + ico(t[2]) + '<span>' + t[1] + '</span></button>';
    }).join('');
  }
  function classicFinish() {
    return '<button type="button" class="ss-end" data-act="finish" data-pad="1" data-focus="1" aria-label="Finish workout">' + ico('check') + '<span>Finish</span>' + ptag('finishChord') + '</button>';
  }
  function whatsStrip() {
    if (!ui.whatsBar || ui.overlay === 'whats') return '';
    return '<div class="whats-strip"><span>What\'s new</span><button type="button" data-act="overlay" data-overlay="whats">Read</button><button type="button" data-act="whats-close">Dismiss</button></div>';
  }
  function welcomeHTML() {
    if (!ui.welcome) return '';
    return '<section class="welcome" role="region" aria-label="Welcome"><h2>Strength in Character</h2><p class="welcome-tag">BE YOUR OWN BIGGEST FAN</p><ol><li>LOG SET records this set, then moves to the next.</li><li>Duo hands the next set to your partner. Each person keeps their own previous numbers.</li><li>Rest counts down after a set. Tempo is the click on screen.</li></ol><p>A sample routine is already on this day.</p><button type="button" data-act="welcome-skip">Skip welcome</button></section>';
  }
  function classicCard(ex) {
    const done = ex.sets.filter(function (s) { return s.done; }).length;
    const prBucket = (state.personalRecords && state.personalRecords[partner()]) || {};
    const pr = prBucket[ex.name];
    const curSet = ex.sets.find(function (s) { return s.current; }) || ex.sets[0];
    const rows = ex.sets.map(function (s) {
      return '<tr class="' + (s.current ? 'ss-current' : '') + '"><td><button type="button" class="icon-btn" data-act="del-set" data-ex="' + esc(ex.id) + '" data-set="' + esc(s.id) + '" aria-label="Delete set ' + (s.index + 1) + '">' + ico('trash') + '</button></td><td class="ss-n">' + (s.index + 1) + '</td><td>' + typeSelect(ex.id, s.id, s.type) + '</td><td class="ss-prev">' + esc(s.prev) + '</td><td>' + numInput(ex.id, s.id, 'weight', s.weight, s.hintW) + '</td><td>' + numInput(ex.id, s.id, 'reps', s.reps, s.hintR) + '</td><td><button type="button" class="ss-done' + (s.done ? ' on' : '') + '" data-act="toggle-done" data-ex="' + esc(ex.id) + '" data-set="' + esc(s.id) + '" aria-label="Mark set ' + (s.index + 1) + ' done">' + ico('check') + '</button></td></tr>';
    }).join('');
    return '<article class="ss-card' + (ex.current ? ' ss-on' : '') + '"><div class="ss-card-head"><div class="ss-ex"><div class="ss-muscle">' + muscleIcon(ex.muscle) + '</div><div class="ss-ex-copy"><h3 class="' + (ex.current ? 'ex-name' : '') + '">' + esc(ex.name) + '</h3><div class="ss-meta"><span class="ss-chip">' + esc(ex.target) + (ex.source === 'extra' ? ' · today' : '') + '</span>' + (ex.current && curSet ? '<span class="set-progress ss-chip">Set ' + (curSet.index + 1) + ' of ' + ex.sets.length + '</span>' : '') + (pr ? '<span class="ss-pr">PR ' + fmtW(pr.weight) + '</span>' : '') + '</div></div></div><div class="ss-card-side">' + (ex.current ? '<button type="button" class="log-set ss-log" data-act="log-set" data-pad="1" data-focus="1">LOG SET' + ptag('logSet') + '</button>' : '') + '<button type="button" class="icon-btn" data-act="manage" data-ex="' + esc(ex.id) + '" aria-label="Manage sets">' + ico('plus') + '</button><button type="button" class="icon-btn" data-act="remove-ask" data-ex="' + esc(ex.id) + '" aria-label="Remove exercise">' + ico('trash') + '</button></div></div><input class="ss-note" data-lockrender="1" data-act="field" data-ex="' + esc(ex.id) + '" data-field="notes" value="' + esc(ex.notes) + '" placeholder="Add notes..." aria-label="Notes"><table class="ss-table"><thead><tr><th></th><th>SET</th><th>TYPE</th><th>PREV</th><th>LBS</th><th>REPS</th><th>DONE</th></tr></thead><tbody>' + rows + '</tbody></table><div class="ss-foot"><button type="button" class="ss-add" data-act="add-set" data-ex="' + esc(ex.id) + '">' + ico('plus') + ' Add Set</button><span class="ss-count">Completed: ' + done + '/' + ex.sets.length + '</span></div></article>';
  }
  function classicTable(ex) {
    const rows = ex.sets.map(function (s) { return setBlock(ex, s); }).join('');
    const current = ex.sets.find(function (s) { return s.current; }) || ex.sets[0];
    return '<article class="card"><div class="spread"><div class="row">' + muscleIcon(ex.muscle) + '<div><h3 style="margin:0">' + esc(ex.name) + '</h3><div class="muted">' + esc(ex.target) + (ex.source === 'extra' ? ' · today only' : '') + '</div></div></div>' + partners() + '</div><label class="stack">Notes<input data-lockrender="1" data-act="field" data-ex="' + esc(ex.id) + '" data-field="notes" value="' + esc(ex.notes) + '" placeholder="Optional note" aria-label="Notes"></label>' + rows + '<div class="actions"><button type="button" class="ghost" data-act="add-set" data-ex="' + esc(ex.id) + '">Add set</button><button type="button" class="ghost" data-act="manage" data-ex="' + esc(ex.id) + '">Manage sets' + ptag('manageSets') + '</button><button type="button" class="ghost" data-act="remove-ask" data-ex="' + esc(ex.id) + '">Remove</button></div><div class="actions">' + (current ? stepper(ex.id, current.id, 'weight', '− lb', '+ lb') + stepper(ex.id, current.id, 'reps', '− rep', '+ rep') : '') + logBtn() + '</div></article>';
  }
  function classicLog(v) {
    const cards = v.exercises.map(classicCard).join('') || '<div class="ss-card">No exercises on this day.</div>';
    return cards + '<div class="ss-card ss-append"><h3>' + ico('plus') + ' Add Extra Exercise Today</h3><div class="ss-addrow"><input id="add-name" data-lockrender="1" list="ex-db" placeholder="Type exercise name to append..." aria-label="Exercise to add"><button type="button" class="ss-end" data-act="add-ask" data-focus="1">Append</button></div>' + datalist() + '</div>';
  }
  function classicShell(inner) {
    const routine = viewCache.routine;
    const rest = viewCache.rest[viewCache.partner] || 0;
    const resting = rest > 0 && state.settings.restEnabled !== false;
    const pattern = state.settings.tempo[partner()] || { e: 1, p1: 0, c: 1, p2: 0 };
    const glyphs = ui.padOn ? '<div class="pad-glyphs">' + ({
      xbox: 'A Log · B Back · X Partner · Y Skip rest',
      playstation: '✕ Log · ○ Back · □ Partner · △ Skip rest',
      switch: 'A Log · B Back · X Partner · Y Skip rest',
      generic: 'A Log · B Back · X Partner · Y Skip rest'
    }[ui.padFamily] || 'A Log · B Back · X Partner · Y Skip rest') + '</div>' : '';
    const status = '<div class="ss-status">' + glyphs +
      '<div class="zone-rest ss-restbar" data-resting="' + (resting ? 'true' : 'false') + '"><span class="rest-count timer-readout" data-rest="' + viewCache.partner + '">' + fmtClock(rest) + '</span><button type="button" data-act="rest-nudge" data-sec="-15" data-pad="1">−15s</button><button type="button" data-act="rest-nudge" data-sec="15" data-pad="1">+15s</button><button type="button" data-act="rest-stop" data-pad="1">Skip</button><button type="button" data-act="rest-toggle" data-pad="1">' + (state.settings.restEnabled === false ? 'Turn rest on' : 'Turn rest off') + '</button></div>' +
      '<div class="zone-tempo ss-tempobar" data-tempo-live="' + (state.settings.tempo.running ? 'on' : 'off') + '"><span data-metro>' + esc(runtime.phase) + '</span><span class="ss-pattern">' + pattern.e + '-' + pattern.p1 + '-' + pattern.c + '-' + pattern.p2 + '</span><button type="button" data-act="tempo-toggle" data-pad="1">' + (state.settings.tempo.running ? 'Tempo off' : 'Tempo on') + '</button></div></div>';
    const duo = state.duoMode ? partnerBar() : '';
    return '<div class="classic"><div class="ss-dock"><header class="ss-head"><div class="ss-brand"><div class="ss-star" aria-hidden="true">★</div><div class="ss-titles"><h1>Strength in Character</h1><p>BE YOUR OWN BIGGEST FAN</p></div></div><div class="ss-tools"><button type="button" data-act="overlay" data-overlay="bug" aria-label="Bug report" title="Bug report">' + ico('bug') + '</button><button type="button" data-act="overlay" data-overlay="rest" aria-label="Rest timers" title="Rest timers"><span class="ss-zzz">Zzz</span></button><button type="button" data-act="overlay" data-overlay="tempo" aria-label="Tempo" title="Tempo">' + ico('drum') + '</button><button type="button" data-act="overlay" data-overlay="calc" aria-label="Calculator" title="1RM and plates">' + ico('calc') + '</button><button type="button" data-act="mini-open" data-pad="1" aria-label="Mini" title="Mini">' + ico('mini') + '</button><button type="button" data-act="overlay" data-overlay="settings" data-pad="1" aria-label="Settings" title="Settings">' + ico('gear') + '</button></div></header><nav class="ss-tabs" aria-label="Sections">' + classicTabs() + '</nav><div class="ss-routine"><div class="ss-routine-name"><h2>' + esc(routine ? routine.name : '') + '</h2></div><div class="ss-routine-actions">' + daySelect() + classicFinish() + '</div></div>' + duo + status + '</div><div class="ss-scroll">' + welcomeHTML() + whatsStrip() + (ui.tab === 'log' ? '' : backLog()) + inner + '</div></div>';
  }
  function vName() { return state.duoMode ? state.partnerNames[partner()] : 'Star Strength Classic'; }
  function curFocus() {
    const cur = viewCache.exercises.find(function (e) { return e.current; }) || viewCache.exercises[0] || null;
    const set = cur && (cur.sets.find(function (s) { return s.current; }) || cur.sets[0]);
    return { cur: cur, set: set };
  }
  function setDots(ex) {
    if (!ex) return '';
    return ex.sets.map(function (s) {
      return '<button type="button" class="setdot' + (s.current ? ' on' : '') + (s.done ? ' done' : '') + '" data-act="focus-set" data-ex="' + esc(ex.id) + '" data-set="' + esc(s.id) + '" aria-label="Set ' + (s.index + 1) + '">' + (s.index + 1) + '</button>';
    }).join('');
  }
  function nudgePad(ex, set) {
    if (!ex || !set) return '<p>No exercise on this day.</p>';
    const id = esc(ex.id), sid = esc(set.id);
    const col = function (field, label, step) {
      return '<div class="nudge-col"><span>' + label + '</span><div class="nudge-row"><button type="button" data-act="nudge" data-focus="1" data-ex="' + id + '" data-set="' + sid + '" data-field="' + field + '" data-dir="-1" aria-label="Decrease ' + label + '">−</button>' + numInput(ex.id, set.id, field, set[field === 'weight' ? 'weight' : 'reps'], '') + '<button type="button" data-act="nudge" data-focus="1" data-ex="' + id + '" data-set="' + sid + '" data-field="' + field + '" data-dir="1" aria-label="Increase ' + label + '">+</button></div></div>';
    };
    return '<div class="nudge-pad">' + col('weight', state.settings.units === 'kg' ? 'Kilograms' : 'Pounds', '') + col('reps', 'Reps', '') + '</div><p class="prev">Previous ' + esc(set.prev) + ' · set ' + (set.index + 1) + ' of ' + ex.sets.length + '</p>';
  }
  function exOverview() {
    return '<div class="ex-wrap">' + viewCache.exercises.map(function (e) {
      return '<button type="button" class="ex-chip' + (e.current ? ' on' : '') + '" data-act="focus-ex" data-ex="' + esc(e.id) + '">' + esc(e.name) + '</button>';
    }).join('') + '</div>';
  }
  function addRow() {
    return '<div class="add-row"><input id="add-name" data-lockrender="1" list="ex-db" placeholder="Add exercise" aria-label="Exercise to add"><button type="button" class="primary" data-act="add-ask" data-focus="1">Add</button></div>' + datalist();
  }
  function manageRow(ex) {
    if (!ex) return '';
    return '<div class="manage-row"><button type="button" data-act="add-set" data-ex="' + esc(ex.id) + '">Add set</button><button type="button" data-act="manage" data-ex="' + esc(ex.id) + '">Sets</button><button type="button" data-act="remove-ask" data-ex="' + esc(ex.id) + '">Remove</button></div>';
  }
  function skinBar() {
    return '<div class="skin-bar">' + daySelect() + '<button type="button" data-act="overlay" data-overlay="settings" aria-label="Settings">' + ico('gear') + '</button><button type="button" data-act="mini-open" aria-label="Mini">' + ico('mini') + '</button>' + finishBtn() + '</div>';
  }
  function clock() { const d = new Date(); return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  function partnerBar() {
    const keys = state.duoMode ? ['batman', 'robin'] : ['batman'];
    return '<div class="who' + (ui.flipped ? ' flip' : '') + '" role="group" aria-label="Active partner">' + keys.map(function (p) {
      const on = partner() === p;
      return '<button type="button" class="who-btn ' + p + (on ? ' on' : '') + '" data-act="partner" data-partner="' + p + '" data-pad="1" aria-current="' + (on ? 'true' : 'false') + '"><i></i><span>' + esc(state.partnerNames[p] || (p === 'batman' ? 'Partner 1' : 'Partner 2')) + '</span>' + (on ? '<b>lifting</b>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function backLog() {
    return '<button type="button" class="back-log" data-act="back-log">← Log</button>';
  }
  function dayRocker(cls) {
    return '<div class="' + cls + '"><button type="button" data-act="day-step" data-dir="-1" aria-label="Previous day">‹</button><strong>' + esc(state.activeDay || '') + '</strong><button type="button" data-act="day-step" data-dir="1" aria-label="Next day">›</button></div>';
  }
  function typed(ex, set, field) {
    if (!ex || !set) return '';
    return numInput(ex.id, set.id, field, field === 'weight' ? set.weight : set.reps, '');
  }
  function pixelTaskbar() {
    return '<nav class="taskbar" aria-label="Pixel taskbar"><button type="button" data-act="tab" data-tab="log" aria-current="' + (ui.tab === 'log' ? 'true' : 'false') + '">Log</button><button type="button" data-act="tab" data-tab="routines" aria-current="' + (ui.tab === 'routines' ? 'true' : 'false') + '">Routines</button><button type="button" data-act="tab" data-tab="history" aria-current="' + (ui.tab === 'history' ? 'true' : 'false') + '">History</button><button type="button" data-act="tab" data-tab="analytics" aria-current="' + (ui.tab === 'analytics' ? 'true' : 'false') + '">Analytics</button><button type="button" class="px-settings" data-act="overlay" data-overlay="settings">Settings</button><button type="button" data-act="mini-open">Mini</button><button type="button" class="px-end" data-act="finish" aria-label="Finish workout">End</button><span class="px-clock">' + clock() + '</span></nav>';
  }
  function pixelShell(inner) {
    if (ui.tab !== 'log') return '<div class="pixel-desk">' + backLog() + partnerBar() + '<section class="win px-win"><header><span>' + esc(ui.tab.toUpperCase()) + '</span></header><div class="body">' + inner + '</div></section>' + pixelTaskbar() + '</div>';
    const f = curFocus(), cur = f.cur, set = f.set;
    const id = cur ? esc(cur.id) : '', sid = set ? esc(set.id) : '';
    const list = viewCache.exercises.map(function (e) {
      return '<button type="button" class="px-bullet' + (e.current ? ' on' : '') + '" data-act="focus-ex" data-ex="' + esc(e.id) + '">' + esc(e.name) + '</button>';
    }).join('');
    return '<div class="pixel-desk">' + partnerBar() + '<div class="px-sky"><section class="win px-win"><header><span>ROUTINE</span></header><div class="body">' + dayRocker('px-day') + '<div class="px-bullets">' + list + '</div><div class="px-add"><input id="add-name" data-lockrender="1" list="ex-db" placeholder="New" aria-label="Exercise to add"><button type="button" data-act="add-ask">Load</button></div>' + datalist() + '</div></section><div class="px-stack"><section class="win px-win"><header><span>SET LOG</span></header><div class="body"><strong class="px-ex">' + esc(cur ? cur.name : 'Empty') + '</strong><div class="px-figures"><label>LBS' + typed(cur, set, 'weight') + '</label><label>REPS' + typed(cur, set, 'reps') + '</label></div><p class="px-prev">Last ' + esc(set ? set.prev : '—') + '</p><button type="button" class="px-log" data-act="log-set">LOG SET</button></div></section><section class="win px-win rest"><header><span>REST</span></header><div class="body"><div class="px-clockbig timer-readout" data-rest="batman">' + fmtClock(viewCache.rest.batman) + '</div><div class="px-restbar"></div></div></section><section class="win px-win tempo"><header><span>TEMPO</span></header><div class="body px-phases"><span>ECC</span><span>PAUSE</span><span>CON</span><span>PAUSE</span></div></section></div></div><div class="px-city" aria-hidden="true"></div><div class="px-sets">' + setDots(cur) + '<button type="button" data-act="add-set" data-ex="' + id + '" aria-label="Add set">+</button><button type="button" data-act="manage" data-ex="' + id + '">Sets</button><button type="button" data-act="finish">End</button></div>' + pixelTaskbar() + '</div>';
  }
  function ironShell(inner) {
    if (ui.tab !== 'log') return '<div class="dial-stage">' + backLog() + partnerBar() + '<div class="iron-panel">' + inner + '</div></div>';
    const f = curFocus(), cur = f.cur, set = f.set;
    const id = cur ? esc(cur.id) : '', sid = set ? esc(set.id) : '';
    const pct = viewCache.rest.batman > 0 ? Math.max(0, Math.min(1, viewCache.rest.batman / ((state.rest.batman.total || state.rest.batman.duration) || 1))) : 0.08;
    const dash = Math.round(Math.max(0.08, pct) * 276);
    return '<div class="dial-stage metal">' + partnerBar() + '<p class="iron-kicker">' + esc(cur ? cur.name : 'No plate') + ' · last ' + esc(set ? set.prev : '—') + '</p><div class="dial-wrap"><div class="dial"><svg class="rim" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="steel" cx="40%" cy="35%"><stop offset="0" stop-color="#8b939c"/><stop offset="1" stop-color="#1c2128"/></radialGradient></defs><circle cx="50" cy="50" r="48" fill="url(#steel)"/><circle cx="50" cy="50" r="44" fill="none" stroke="#2a3038" stroke-width="8"/><circle cx="50" cy="50" r="40" fill="none" stroke="#ff7a18" stroke-width="3" stroke-dasharray="' + dash + ' 251" stroke-linecap="round" transform="rotate(-90 50 50)"/></svg><button type="button" class="bolt l" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="weight" data-dir="-1" aria-label="Decrease weight">−</button><button type="button" class="bolt r" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="weight" data-dir="1" aria-label="Increase weight">+</button><div class="hub-stack"><label>LBS' + typed(cur, set, 'weight') + '</label><button type="button" class="hub" data-act="log-set">LOG IT<small>tap to record</small></button><label>REPS' + typed(cur, set, 'reps') + '</label></div></div></div><div class="rep-dial"><span>REPS</span><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="reps" data-dir="-1" aria-label="Fewer reps">−</button><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="reps" data-dir="1" aria-label="More reps">+</button></div><div class="iron-foot">' + dayRocker('iron-day') + '<button type="button" data-act="cycle-ex" data-dir="1">Next</button><button type="button" data-act="add-set" data-ex="' + id + '">Add set</button><button type="button" class="iron-end" data-act="finish">End</button><button type="button" data-act="mini-open" aria-label="Mini">Mini</button><button type="button" data-act="overlay" data-overlay="settings" aria-label="Settings">Settings</button></div></div>';
  }
  function chalkShell(inner) {
    const notes = '<div class="stickies"><button type="button" class="sticky y" data-act="tab" data-tab="log">Log</button><button type="button" class="sticky p" data-act="tab" data-tab="history">History</button><button type="button" class="sticky g" data-act="tab" data-tab="analytics">Stats</button><button type="button" class="sticky r" data-act="log-set">Log it</button><button type="button" class="sticky b" data-act="overlay" data-overlay="settings">Settings</button><button type="button" class="sticky y" data-act="mini-open">Mini</button><button type="button" class="sticky p" data-act="finish">Done</button></div>';
    if (ui.tab !== 'log') return '<div class="wb-frame"><div class="board">' + backLog() + partnerBar() + '<h1>Chalk board</h1>' + notes + inner + '</div></div>';
    const rows = viewCache.exercises.map(function (ex) {
      const s = ex.sets.find(function (x) { return x.current; }) || ex.sets[0];
      return '<tr class="' + (ex.current ? 'on' : '') + '"><td><button type="button" class="chalk-name" data-act="focus-ex" data-ex="' + esc(ex.id) + '">' + esc(ex.name) + '</button></td><td class="ink">' + esc(s ? s.prev : '—') + '</td><td>' + typed(ex, s, 'weight') + '</td><td>' + typed(ex, s, 'reps') + '</td><td><button type="button" class="chalk-check' + (s && s.done ? ' on' : '') + '" data-act="toggle-done" data-ex="' + esc(ex.id) + '" data-set="' + esc(s ? s.id : '') + '" aria-label="Done">✓</button></td></tr>';
    }).join('');
    const cur = curFocus().cur;
    return '<div class="wb-frame"><div class="board">' + partnerBar() + '<div class="wb-top"><h1>Chalk board</h1>' + dayRocker('chalk-day') + '</div><table class="wb-table"><thead><tr><th>Lift</th><th>Prev</th><th>Lbs</th><th>Reps</th><th></th></tr></thead><tbody>' + rows + '</tbody></table><div class="chalk-add"><input id="add-name" data-lockrender="1" list="ex-db" placeholder="Add a lift" aria-label="Exercise to add"><button type="button" data-act="add-ask">Add</button><button type="button" data-act="add-set" data-ex="' + esc(cur ? cur.id : '') + '">Add set</button></div>' + datalist() + notes + '</div></div>';
  }
  function scoreShell(inner) {
    if (ui.tab !== 'log') return '<div class="board-frame stadium">' + backLog() + partnerBar() + inner + '</div>';
    const f = curFocus(), cur = f.cur, set = f.set;
    const id = cur ? esc(cur.id) : '', sid = set ? esc(set.id) : '';
    const prevs = cur ? cur.sets.map(function (s) { return '<button type="button" class="prev-led' + (s.current ? ' on' : '') + '" data-act="focus-set" data-ex="' + id + '" data-set="' + esc(s.id) + '">' + esc(s.weight || '—') + '</button>'; }).join('') : '';
    return '<div class="board-frame stadium">' + partnerBar() + '<div class="marquee"><span>STRENGTH</span>' + dayRocker('score-day') + '<b>' + (set ? (set.index + 1) : 0) + '</b></div><div class="jumbo"><label>LBS' + typed(cur, set, 'weight') + '</label><div class="jumbo-side"><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="weight" data-dir="1" aria-label="Increase weight">+</button><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="weight" data-dir="-1" aria-label="Decrease weight">−</button></div></div><p class="score-name">SET ' + (set ? set.index + 1 : 0) + ' OF ' + (cur ? cur.sets.length : 0) + ' · ' + esc(cur ? cur.name : '') + '</p><div class="rep-led"><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="reps" data-dir="-1" aria-label="Fewer reps">−</button><label>REPS' + typed(cur, set, 'reps') + '</label><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="reps" data-dir="1" aria-label="More reps">+</button></div><button type="button" class="buzzer" data-act="log-set">LOG IT</button><div class="prev-row"><span>PREV</span>' + prevs + '</div><div class="session-strip"><span class="timer-readout" data-rest="batman">' + fmtClock(viewCache.rest.batman) + '</span><span>last ' + esc(set ? set.prev : '—') + '</span><button type="button" data-act="add-set" data-ex="' + id + '">+ set</button><button type="button" class="final" data-act="finish">Final</button></div><nav class="score-links"><button type="button" data-act="tab" data-tab="history">History</button><button type="button" data-act="tab" data-tab="routines">Routines</button><button type="button" data-act="mini-open">Mini</button><button type="button" data-act="overlay" data-overlay="settings">Settings</button></nav></div>';
  }
  function transitShell(inner) {
    if (ui.tab !== 'log') return '<div class="transit map">' + backLog() + partnerBar() + inner + '</div>';
    const f = curFocus(), cur = f.cur, set = f.set;
    const id = cur ? esc(cur.id) : '', sid = set ? esc(set.id) : '';
    const stations = viewCache.exercises.map(function (e) {
      return '<li><button type="button" class="stop-dot' + (e.current ? ' on' : '') + '" data-act="focus-ex" data-ex="' + esc(e.id) + '"><i></i><span>' + esc(e.name.split(' ')[0]) + '</span></button></li>';
    }).join('');
    return '<div class="transit map">' + partnerBar() + '<div class="map-grid"><ol class="route">' + stations + '</ol><section class="board-next"><p>NEXT SET</p><h2>' + esc(cur ? cur.name : 'No service') + '</h2><label>LBS' + typed(cur, set, 'weight') + '</label><label>REPS' + typed(cur, set, 'reps') + '</label><p class="est">Last ' + esc(set ? set.prev : '—') + ' · rest <span class="timer-readout" data-rest="batman">' + fmtClock(viewCache.rest.batman) + '</span></p><div class="plat-nudge"><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="weight" data-dir="-1" aria-label="Decrease weight">−lb</button><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="weight" data-dir="1" aria-label="Increase weight">+lb</button><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="reps" data-dir="-1" aria-label="Fewer reps">−rep</button><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="reps" data-dir="1" aria-label="More reps">+rep</button></div><button type="button" class="depart" data-act="log-set">LOG SET</button></section><aside class="capsule"><span>LINE</span>' + dayRocker('line-badge') + '<button type="button" data-act="add-set" data-ex="' + id + '" aria-label="Add set">+</button></aside></div><div class="transit-ops"><button type="button" data-act="mini-open">Mini</button><button type="button" data-act="tab" data-tab="history">History</button><button type="button" data-act="tab" data-tab="routines">Routines</button><button type="button" data-act="overlay" data-overlay="settings">Settings</button><button type="button" class="endline" data-act="finish">End of line</button></div></div>';
  }
  function vinylShell(inner) {
    if (ui.tab !== 'log') return '<div class="vinyl-page wood">' + backLog() + partnerBar() + inner + '</div>';
    const f = curFocus(), cur = f.cur, set = f.set;
    const id = cur ? esc(cur.id) : '', sid = set ? esc(set.id) : '';
    const fader = function (field, label) {
      return '<label class="fader"><span>' + label + '</span>' + typed(cur, set, field) + '<button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="' + field + '" data-dir="1" aria-label="Increase ' + label + '">+</button><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="' + field + '" data-dir="-1" aria-label="Decrease ' + label + '">−</button></label>';
    };
    const spines = viewCache.exercises.map(function (e) {
      return '<button type="button" class="spine' + (e.current ? ' on' : '') + '" data-act="focus-ex" data-ex="' + esc(e.id) + '">' + esc(e.name) + '</button>';
    }).join('');
    return '<div class="vinyl-page wood">' + partnerBar() + '<div class="console"><div class="deck-unit"><div class="platter"><div class="label"><b>' + esc(cur ? cur.name.split(' ')[0] : '') + '</b></div></div></div><div class="mixer-face"><p class="deck-title">' + esc(cur ? cur.name : 'No track') + '</p><div class="faders">' + fader('weight', 'LBS') + fader('reps', 'REPS') + '</div><p class="px-prev">Last ' + esc(set ? set.prev : '—') + '</p><button type="button" class="vinyl-log" data-act="log-set">LOG SET</button></div><div class="deck-unit"><div class="platter spin"><div class="label">B</div></div></div></div><div class="remote">' + dayRocker('cart-day') + '<button type="button" data-act="add-set" data-ex="' + id + '">+ set</button><button type="button" class="stop" data-act="finish">Stop</button><button type="button" data-act="mini-open">Mini</button><button type="button" data-act="overlay" data-overlay="settings">Settings</button></div><div class="crate">' + spines + '</div></div>';
  }
  function hexShell(inner) {
    if (ui.tab !== 'log') return '<div class="hive honey">' + backLog() + partnerBar() + '<div class="iron-panel">' + inner + '</div></div>';
    const f = curFocus(), cur = f.cur, set = f.set;
    if (!cur || !set) return '<div class="hive honey"><p>Add an exercise.</p></div>';
    const id = esc(cur.id), sid = esc(set.id);
    const cells = viewCache.exercises.slice(0, 6).map(function (e) {
      return '<button type="button" class="hex tiny' + (e.current ? ' on' : '') + '" data-act="focus-ex" data-ex="' + esc(e.id) + '">' + esc(e.name.split(' ')[0]) + '</button>';
    }).join('');
    return '<div class="hive honey">' + partnerBar() + '<div class="flower mock"><button type="button" class="hex" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="weight" data-dir="-1" aria-label="Decrease weight">−<small>lbs</small></button><button type="button" class="hex" data-act="cycle-ex" data-dir="-1">‹</button><button type="button" class="hex" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="weight" data-dir="1" aria-label="Increase weight">+<small>lbs</small></button><button type="button" class="hex" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="reps" data-dir="-1" aria-label="Fewer reps">−<small>reps</small></button><div class="hex core"><b>' + esc(cur.name.split(' ')[0]) + '</b><small>SET ' + (set.index + 1) + '</small><em>' + esc(set.prev) + '</em></div><button type="button" class="hex" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="reps" data-dir="1" aria-label="More reps">+<small>reps</small></button><button type="button" class="hex teal" data-act="add-set" data-ex="' + id + '">+ set</button><button type="button" class="hex main" data-act="log-set">LOG SET</button><button type="button" class="hex teal" data-act="finish">End</button></div><div class="flower mini-flower">' + cells + '</div>' + dayRocker('hex-day') + '<nav class="hex-nav"><button type="button" data-act="tab" data-tab="routines">Routines</button><button type="button" data-act="tab" data-tab="history">History</button><button type="button" data-act="mini-open">Mini</button><button type="button" data-act="overlay" data-overlay="settings">Settings</button></nav></div>';
  }
  function routinesPanel() {
    const cards = Object.keys(state.routines).map(function (id) {
      const r = state.routines[id];
      const on = id === state.activeRoutineId;
      return '<article class="card"><strong>' + esc(r.name) + '</strong><div class="muted">' + Object.keys(r.days || {}).length + ' day split</div><div class="row"><button type="button" class="' + (on ? 'primary' : 'ghost') + '" data-act="use-routine" data-id="' + esc(id) + '">' + (on ? 'Active' : 'Select') + '</button><button type="button" class="ghost" data-act="share-routine" data-id="' + esc(id) + '">Share code</button><button type="button" class="ghost" data-act="xml-one" data-id="' + esc(id) + '">XML</button></div></article>';
    }).join('');
    return '<h2>Routines</h2><div class="row"><button type="button" class="primary" data-act="overlay" data-overlay="import">Import code</button><button type="button" class="ghost" data-act="builder-open">New routine</button><button type="button" class="ghost" data-act="xml-export" data-kind="routines">Export XML</button><button type="button" class="ghost" data-act="xml-file" data-kind="routines">Import XML</button></div>' + cards + '<p class="muted">Other workout apps: no connect button in this version. When an official export exists, it will be a file import with a preview. BLS5 content is unchanged.</p>';
  }
  function historyPanel() {
    const rows = SIC.queryHistory(state.history, { reverse: ui.historyReverse, muscle: ui.historyMuscle });
    const filters = ['all'].concat(SIC.MUSCLE_FILTERS).map(function (m) { return '<button type="button" class="ghost" data-act="hist-muscle" data-muscle="' + m + '" aria-current="' + (ui.historyMuscle === m ? 'true' : 'false') + '">' + m + '</button>'; }).join('');
    if (ui.historyView === 'records') {
      const bucket = state.personalRecords[state.recordsPartner || 'batman'] || {};
      const list = Object.keys(bucket).map(function (name) { return '<article class="record"><strong>' + esc(name) + '</strong><div>' + fmtW(bucket[name].weight) + ' ' + esc(state.settings.units) + '</div></article>'; }).join('') || '<p>No records yet. Finish a workout with LOG SET marks already saved.</p>';
      return '<div class="spread"><h2>Records</h2><button type="button" data-act="hist-view" data-view="sessions">Sessions</button></div>' + list;
    }
    const cards = rows.map(function (h) {
      const open = ui.historyOpen[h.id];
      const stats = SIC.statsForEntries(h.exercises || []);
      return '<article class="card"><button type="button" data-act="hist-open" data-id="' + esc(h.id) + '"><strong>' + esc(h.dayName || 'Workout') + '</strong> · ' + esc(h.routineName || '') + '<div class="muted">' + esc(h.iso || h.date || '') + ' · ' + stats.sets + ' sets · ' + stats.volume + '</div></button>' + (open ? '<div>' + (h.exercises || []).map(function (e) { return '<div><strong>' + esc(e.exercise) + '</strong> ' + esc(e.partner || '') + '<div>' + (e.sets || []).map(function (s) { return esc(s.weight) + '×' + esc(s.reps); }).join('  ') + '</div></div>'; }).join('') + '<div class="row"><button type="button" data-act="hist-edit" data-id="' + esc(h.id) + '">Edit</button><button type="button" data-act="hist-del" data-id="' + esc(h.id) + '">Delete</button></div></div>' : '') + '</article>';
    }).join('') || '<p>No workouts logged yet.</p>';
    return '<div class="spread"><h2>History</h2><div class="row"><button type="button" data-act="hist-view" data-view="records">Records</button><button type="button" data-act="hist-reverse">' + (ui.historyReverse ? 'Oldest first' : 'Newest first') + '</button></div></div><p class="muted">Default order is oldest first. Renames in a routine do not rewrite these cards. Deleting a workout recalculates records from what remains.</p><div class="row" style="flex-wrap:wrap">' + filters + '</div>' + cards;
  }
  function analyticsPanel() {
    return '<h2>Muscle group distribution</h2><p class="muted">Counted sets from history. Warm-ups are included in the split the same way the previous chart counted every logged set.</p><div class="card"><canvas id="muscle-chart" width="640" height="280"></canvas></div>';
  }
  function panel() {
    if (ui.tab === 'routines') return routinesPanel();
    if (ui.tab === 'history') return historyPanel();
    if (ui.tab === 'analytics') return analyticsPanel();
    return '';
  }
  function sharedShell() {
    viewCache = view();
    const f = curFocus();
    const cur = f.cur, set = f.set;
    const id = cur ? esc(cur.id) : '';
    const sid = set ? esc(set.id) : '';
    const resting = viewCache.rest[viewCache.partner] > 0 && state.settings.restEnabled !== false;
    const pattern = state.settings.tempo[partner()] || { e: 1, p1: 0, c: 1, p2: 0 };
    const glyphs = ui.padOn ? '<div class="pad-glyphs">' + ({
      xbox: 'A Log · B Back · X Partner · Y Skip rest',
      playstation: '✕ Log · ○ Back · □ Partner · △ Skip rest',
      switch: 'A Log · B Back · X Partner · Y Skip rest',
      generic: 'A Log · B Back · X Partner · Y Skip rest'
    }[ui.padFamily] || 'A Log · B Back · X Partner · Y Skip rest') + '</div>' : '';
    const partners = ['batman', 'robin'].filter(function (p) { return p === 'batman' || state.duoMode; }).map(function (p) {
      const on = partner() === p;
      return '<button type="button" class="who-btn ' + p + (on ? ' on' : '') + '" data-act="partner" data-partner="' + p + '" data-pad="1" aria-current="' + (on ? 'true' : 'false') + '">' + esc(state.partnerNames[p] || p) + (on ? ' lifting' : '') + '</button>';
    }).join('');
    const list = viewCache.exercises.map(function (e) {
      return '<button type="button" class="ex-pick' + (e.current ? ' on' : '') + '" data-act="focus-ex" data-ex="' + esc(e.id) + '" data-pad="1">' + esc(e.name) + '</button>';
    }).join('');
    const logBody = cur && set
      ? '<svg class="iron-arc" viewBox="0 0 100 100" aria-hidden="true"><circle data-rest-arc cx="50" cy="50" r="40"></circle></svg><h2 class="ex-name">' + esc(cur.name) + '</h2><p class="set-progress">Set ' + (set.index + 1) + ' of ' + cur.sets.length + '</p><div class="entry"><label>Weight <span class="prev">PREV ' + esc(set.prev) + '</span>' + numInput(cur.id, set.id, 'weight', set.weight, '') + '</label><label>Reps <span class="prev">set ' + (set.index + 1) + '</span>' + numInput(cur.id, set.id, 'reps', set.reps, '') + '</label></div><button type="button" class="log-set" data-act="log-set" data-pad="1" data-focus="1">LOG SET</button>'
      : '<p>No exercise on this day.</p>';
    const main = ui.tab === 'log' ? logBody : '<div class="zone-panel">' + backLog() + panel() + '</div>';
    return '<div class="zones">' + welcomeHTML() + glyphs +
      '<header class="zone zone-head"><div class="ss-titles"><h1>Strength in Character</h1><p>BE YOUR OWN BIGGEST FAN</p></div></header>' +
      '<div class="zone zone-partners" role="group" aria-label="Active partner">' + partners + '</div>' +
      '<section class="zone zone-now">' + main + '</section>' +
      '<section class="zone zone-rest" data-resting="' + (resting ? 'true' : 'false') + '"><p class="rest-label">' + (state.settings.restEnabled === false ? 'Rest off' : (resting ? 'Resting' : 'Rest ready')) + '</p><div class="px-meter" aria-hidden="true"><i data-rest-bar></i></div><div class="rest-count timer-readout" data-rest="' + viewCache.partner + '">' + fmtClock(viewCache.rest[viewCache.partner]) + '</div><div class="rest-actions"><button type="button" data-act="rest-nudge" data-sec="-15" data-pad="1">−15s</button><button type="button" data-act="rest-nudge" data-sec="15" data-pad="1">+15s</button><button type="button" data-act="rest-stop" data-pad="1">Skip</button><button type="button" data-act="rest-toggle" data-pad="1">' + (state.settings.restEnabled === false ? 'Turn rest on' : 'Turn rest off') + '</button></div></section>' +
      '<section class="zone zone-tempo" data-tempo-live="' + (state.settings.tempo.running ? 'on' : 'off') + '"><p>Tempo ' + pattern.e + '-' + pattern.p1 + '-' + pattern.c + '-' + pattern.p2 + '</p><div class="tempo-lamp" data-metro>' + esc(runtime.phase) + '</div><button type="button" data-act="tempo-toggle" data-pad="1">' + (state.settings.tempo.running ? 'Tempo off' : 'Tempo on') + '</button></section>' +
      (ui.tab === 'log' ? '<section class="zone zone-list" aria-label="Exercises">' + list + '<div class="add-row"><input id="add-name" data-lockrender="1" list="ex-db" placeholder="Add exercise" aria-label="Exercise to add"><button type="button" data-act="add-ask" data-pad="1">Add</button></div>' + datalist() + '</section>' : '') +
      '<nav class="zone zone-nav" aria-label="Main">' +
      '<button type="button" data-act="tab" data-tab="log" data-pad="1" aria-current="' + (ui.tab === 'log' ? 'true' : 'false') + '">Log</button>' +
      '<button type="button" data-act="tab" data-tab="routines" data-pad="1">Routines</button>' +
      '<button type="button" data-act="tab" data-tab="history" data-pad="1">History</button>' +
      '<button type="button" data-act="tab" data-tab="analytics" data-pad="1">Stats</button>' +
      '<button type="button" data-act="mini-open" data-pad="1">Mini</button>' +
      '<button type="button" data-act="overlay" data-overlay="settings" data-pad="1">Settings</button>' +
      '<button type="button" data-act="finish" data-pad="1">Finish</button>' +
      '</nav></div>';
  }
  function shell() {
    viewCache = view();
    if (state.skinId === 'starclassic') return classicShell(ui.tab === 'log' ? classicLog(viewCache) : panel());
    return sharedShell();
  }

  function miniHTML() {
    if (!ui.miniOpen) return '';
    const v = viewCache || view();
    const cur = v.exercises.find(function (e) { return e.current; }) || v.exercises[0];
    const set = cur && (cur.sets.find(function (s) { return s.current; }) || cur.sets[0]);
    const shape = skin().mini || 'card';
    const id = cur ? esc(cur.id) : '';
    const sid = set ? esc(set.id) : '';
    const name = esc(cur ? cur.name.split(' ').slice(0, 2).join(' ') : 'Lift');
    const prev = esc(set ? set.prev : '—');
    const who = '<b class="mini-who ' + partner() + '">' + esc(state.partnerNames[partner()] || 'You') + '</b>';
    const rest = '<span class="timer-readout" data-rest="' + v.partner + '">' + fmtClock(v.rest[v.partner]) + '</span>';
    const log = '<button type="button" class="mini-log" data-act="log-set">LOG</button>';
    const more = '<button type="button" class="mini-more" data-act="mini-wide" aria-expanded="' + (ui.miniWide ? 'true' : 'false') + '">' + (ui.miniWide ? 'Less' : 'More') + '</button>';
    const fields = ui.miniWide ? '<div class="mini-fields">' + (set ? '<label>Lb ' + numInput(cur.id, set.id, 'weight', set.weight, '') + '</label><label>Reps ' + numInput(cur.id, set.id, 'reps', set.reps, '') + '</label><button type="button" data-act="add-set" data-ex="' + id + '" aria-label="Add set">+</button><button type="button" data-act="manage" data-ex="' + id + '">Sets</button>' : '') + '<button type="button" data-act="back-log">Log</button><button type="button" data-act="overlay" data-overlay="settings">Settings</button></div>' : '';
    const chrome = '<div class="mini-top" data-drag="1">' + who + rest + '<button type="button" data-act="overlay-hide" aria-label="Close mini">×</button></div>';
    const shut = '<button type="button" class="mini-x" data-act="overlay-hide" aria-label="Close mini">×</button>';
    if (shape === 'puck') return '<div class="mini-body">' + shut + '<div class="mini-puck" data-drag="1"><svg class="mini-arc" viewBox="0 0 100 100" aria-hidden="true"><circle data-rest-arc cx="50" cy="50" r="40"></circle></svg>' + who + '<strong>' + name + '</strong><em>Set ' + (set ? (set.index + 1) : '—') + '</em>' + rest + log + '</div>' + more + fields + '</div>';
    if (shape === 'stepped-l') return '<div class="mini-body"><div class="mini-window" data-drag="1">' + shut + who + '<strong>' + name + '</strong><p>Set ' + (set ? (set.index + 1) : '—') + ' · ' + prev + '</p>' + rest + '<i class="px-meter" aria-hidden="true"><b data-rest-bar></b></i>' + log + more + fields + '</div></div>';
    if (shape === 'rail') return '<div class="mini-body"><div class="mini-slate">' + chrome + '<strong>' + name + '</strong><p>prev ' + prev + '</p>' + log + more + fields + '</div></div>';
    if (shape === 'ticket') return '<div class="mini-body"><div class="mini-led">' + chrome + '<em>' + (set ? esc(set.weight || '---') : '---') + '</em><p>' + prev + '</p>' + log + more + fields + '</div></div>';
    if (shape === 'capsule') return '<div class="mini-body"><div class="mini-pill">' + chrome + '<strong>' + name + '</strong><p>' + prev + '</p>' + log + more + fields + '</div></div>';
    if (shape === 'cassette') return '<div class="mini-body">' + shut + '<div class="mini-disc" data-drag="1"><span>' + name + '</span>' + log + '</div><p>' + prev + ' ' + rest + '</p>' + who + more + fields + '</div>';
    if (shape === 'flower') return '<div class="mini-body">' + shut + '<div class="mini-hexes"><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="weight" data-dir="-1" aria-label="Decrease weight">−</button><div class="mini-core"><b>' + name + '</b><small>' + prev + '</small></div><button type="button" data-act="nudge" data-ex="' + id + '" data-set="' + sid + '" data-field="weight" data-dir="1" aria-label="Increase weight">+</button>' + log + '</div>' + who + rest + more + fields + '</div>';
    return '<div class="mini-body"><div class="mini-card">' + chrome + '<strong>' + name + '</strong><p>prev ' + prev + '</p>' + log + more + fields + '</div></div>';
  }
  function popHTML() {
    if (!ui.pop) return '';
    const ex = (viewCache || view()).exercises.find(function (e) { return e.id === ui.pop; });
    if (!ex) return '';
    const style = skin().popout || 'sheet';
    const rows = ex.sets.map(function (s) { return setBlock(ex, s); }).join('');
    return '<div class="pop ' + esc(style) + '" role="dialog" aria-label="Manage sets"><div class="spread"><strong>' + esc(ex.name) + '</strong><button type="button" data-act="pop-close">Close</button></div>' + rows + '<button type="button" class="primary" data-act="add-set" data-ex="' + ex.id + '">Add set</button></div>';
  }

  function settingsCatalog() {
    return [
      { id: 'appearance', title: 'Appearance', blurb: 'Skin, colors, motion', keys: 'skin theme classic midnight barbie font weather motion opacity', subs: [['skin', 'Skin'], ['customize', 'Customize'], ['motion', 'Motion']] },
      { id: 'workout', title: 'Workout', blurb: 'Units, step, duo', keys: 'duo partner units step weight profile', subs: [] },
      { id: 'timers', title: 'Timers & sound', blurb: 'Rest, tempo, haptics', keys: 'rest tempo metronome sound volume haptics quote', subs: [['sounds', 'Sounds'], ['rest', 'Rest'], ['haptics', 'Haptics']] },
      { id: 'input', title: 'Input & mini', blurb: 'Controls and the mini', keys: 'gamepad keyboard mini overlay pip xbox playstation', subs: [] },
      { id: 'data', title: 'Data & files', blurb: 'Save, folders, XML', keys: 'autosave snapshot xml import export folder backup storage', subs: [] },
      { id: 'notes', title: 'Notifications', blurb: 'Sneak peek and quiet hours', keys: 'notification countdown pump quiet ryan', subs: [] },
      { id: 'about', title: 'About & support', blurb: 'Bugs, console, reset', keys: 'bug report console privacy clear version', subs: [] }
    ];
  }
  function settingsHTML() {
    const q = (ui.query || '').toLowerCase().trim();
    const cats = settingsCatalog();
    const head = '<div class="spread"><h2>Settings</h2>' + backLog() + '</div><input class="settings-search" data-lockrender="1" data-act="settings-search" placeholder="Search settings" value="' + esc(ui.query || '') + '" aria-label="Search settings">';
    if (!ui.settingsCat || q) {
      const matches = cats.filter(function (c) {
        if (!q) return true;
        return (c.title + ' ' + c.blurb + ' ' + c.keys + ' ' + c.subs.map(function (s) { return s[1]; }).join(' ')).toLowerCase().indexOf(q) >= 0;
      });
      const cards = matches.map(function (c) {
        const sub = c.subs.find(function (s) { return q && (s[1].toLowerCase().indexOf(q) >= 0 || c.keys.indexOf(q) >= 0); });
        const go = sub ? sub[0] : (c.subs[0] ? c.subs[0][0] : '');
        return '<button type="button" class="set-card" data-act="settings-open" data-cat="' + c.id + '" data-sub="' + esc(go) + '"><strong>' + esc(c.title) + '</strong><span>' + esc(c.blurb) + (q && sub ? ' · ' + esc(sub[1]) : '') + '</span></button>';
      }).join('') || '<p>No setting category matches that search.</p>';
      return head + '<p class="muted">Choose one area. Search opens that area instead of listing every control.</p><div class="set-home">' + cards + '</div>';
    }
    const cat = cats.find(function (c) { return c.id === ui.settingsCat; }) || cats[0];
    const sub = cat.subs.some(function (s) { return s[0] === ui.settingsSub; }) ? ui.settingsSub : (cat.subs[0] ? cat.subs[0][0] : '');
    const crumbs = '<div class="spread"><button type="button" class="ghost" data-act="settings-back">Back</button><strong>' + esc(cat.title) + '</strong></div>';
    const subnav = cat.subs.length ? '<div class="set-sub" role="tablist">' + cat.subs.map(function (s) {
      return '<button type="button" role="tab" aria-selected="' + (sub === s[0] ? 'true' : 'false') + '" data-act="settings-sub" data-sub="' + s[0] + '">' + esc(s[1]) + '</button>';
    }).join('') + '</div>' : '';
    return head + crumbs + subnav + '<div class="set-body">' + settingsBody(cat.id, sub) + '</div>';
  }
  function settingsBody(cat, sub) {
    if (cat === 'appearance' && sub === 'skin') {
      const skins = SIC.builtinSkins().concat(state.communitySkins || []).map(function (s) {
        const finished = s.slug === 'starclassic' || s.slug === 'pixelforecast' || s.slug === 'irondial';
        const look = finished ? '' : '<span class="muted">Beta look</span>';
        return '<button type="button" class="' + (state.skinId === s.slug ? 'on' : '') + '" data-act="skin" data-skin="' + esc(s.slug) + '"><strong>' + esc(s.name) + '</strong>' + look + '</button>';
      }).join('');
      return '<p>Pick the layout. Color variants for a skin are on Customize, and only for the skin that is selected.</p><div class="skin-pick">' + skins + '</div><label class="stack">Install a community skin file<input type="file" id="skin-file" accept="application/json" data-lockrender="1"></label>';
    }
    if (cat === 'appearance' && sub === 'customize') {
      const sk = skin();
      if (state.skinId === 'starclassic') {
        const themes = Object.keys(state.themes).map(function (id) {
          const t = state.themes[id];
          return '<button type="button" data-act="theme" data-theme="' + esc(id) + '" style="background:' + esc(t.card) + ';color:' + esc(t.text) + '">' + esc(t.name) + '</button>';
        }).join('');
        return '<p>These variants belong to Star Strength Classic only.</p><div class="actions">' + themes + '</div>';
      }
      return '<p><strong>' + esc(sk.name) + '</strong> keeps its own colors. Classic variants stay hidden on this skin.</p><button type="button" class="ghost" data-act="skin-reset">Reset this skin\'s overrides</button>';
    }
    if (cat === 'appearance' && sub === 'motion') {
      return '<div class="actions"><button type="button" data-act="motion" data-mode="system">System</button><button type="button" data-act="motion" data-mode="reduce">Reduce</button><button type="button" data-act="motion" data-mode="full">Full</button></div><p>Motion is ' + esc(state.settings.motion) + '. Reduced motion turns weather and bursts off.</p><label class="stack">Weather<select data-act="fx">' + ['off', 'snow', 'rain', 'ripples', 'fire', 'smoke'].map(function (f) { return '<option' + (state.fx.type === f ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select></label><p class="muted">Weather sits faintly behind the controls. Off is the calm default.</p><label class="stack">Text size<input data-lockrender="1" data-act="scale" type="range" min="0.95" max="1.12" step="0.01" value="' + esc(state.settings.textScale || 1) + '"></label>';
    }
    if (cat === 'workout') {
      const profiles = Object.keys(state.profiles.users).map(function (id) { return '<button type="button" data-act="profile" data-id="' + esc(id) + '">' + esc(state.profiles.users[id].name) + '</button>'; }).join('');
      return '<label class="stack">Weight step<input data-lockrender="1" data-act="step" type="number" min="0.5" step="0.5" value="' + esc(state.settings.weightStep) + '"></label><label class="stack">Units<select data-act="units"><option value="lb"' + (state.settings.units === 'lb' ? ' selected' : '') + '>Pounds</option><option value="kg"' + (state.settings.units === 'kg' ? ' selected' : '') + '>Kilograms</option></select></label><button type="button" class="switch ' + (state.settings.restEnabled !== false ? 'on' : '') + '" data-act="rest-toggle">' + (state.settings.restEnabled === false ? 'Rest timer off' : 'Rest timer on') + '</button><label class="stack">Rest seconds<input data-lockrender="1" data-act="rest-seconds" type="number" min="0" max="600" value="' + esc(state.settings.restSeconds != null ? state.settings.restSeconds : ((state.rest.batman && state.rest.batman.duration) || 90)) + '"></label><button type="button" data-act="tempo-toggle">' + (state.settings.tempo.running ? 'Tempo off' : 'Tempo on') + '</button><p class="muted">Numbers are stored in pounds. The screen and XML files convert.</p><button type="button" class="switch ' + (state.duoMode ? 'on' : '') + '" data-act="duo">' + (state.duoMode ? 'Duo on' : 'Duo off') + '</button><div class="grid-2"><label class="stack">Partner 1<input data-lockrender="1" data-act="pname" data-partner="batman" value="' + esc(state.partnerNames.batman) + '"></label><label class="stack">Partner 2<input data-lockrender="1" data-act="pname" data-partner="robin" value="' + esc(state.partnerNames.robin) + '"></label></div><p>Logging a set hands the logger to the other partner. Their sets are not filled in for them.</p><h3>Profiles</h3><div class="actions">' + profiles + '</div>';
    }
    if (cat === 'timers' && sub === 'sounds') {
      const more = ui.soundMore ? Object.keys(state.settings.sounds).map(function (ev) {
        const s = state.settings.sounds[ev];
        return '<div class="card"><strong>' + esc(ev) + '</strong><label>On <input type="checkbox" data-act="sound-on" data-ev="' + ev + '"' + (s.on ? ' checked' : '') + '></label><label class="stack">Repeats<input data-lockrender="1" data-act="sound-repeats" data-ev="' + ev + '" type="number" min="1" max="6" value="' + esc(s.repeats) + '"></label><label class="stack">Instrument<select data-act="sound-inst" data-ev="' + ev + '">' + ['sine', 'square', 'triangle', 'sawtooth'].map(function (i) { return '<option' + (s.instrument === i ? ' selected' : '') + '>' + i + '</option>'; }).join('') + '</select></label><button type="button" data-act="sound-test" data-ev="' + ev + '">Preview</button></div>';
      }).join('') : '';
      const cats = state.settings.soundCats || {};
      const toggles = [['sets', 'Set logged'], ['rest', 'Rest tick, countdown, and done'], ['pr', 'Personal record'], ['finish', 'Workout finished'], ['taps', 'Button taps'], ['duo', 'Partner switch'], ['errors', 'Errors']].map(function (pair) {
        const on = cats[pair[0]] !== false;
        return '<button type="button" class="switch ' + (on ? 'on' : '') + '" data-act="sound-cat" data-cat="' + pair[0] + '">' + pair[1] + (on ? ' on' : ' off') + '</button>';
      }).join('');
      return '<button type="button" class="switch ' + (state.soundEnabled && !state.settings.masterMute ? 'on' : '') + '" data-act="master-sound">' + (state.settings.masterMute || !state.soundEnabled ? 'Muted' : 'Sound on') + '</button><label class="stack">Volume<input data-act="sound-volume" type="range" min="0" max="1" step="0.05" value="' + esc(state.settings.soundVolume == null ? 0.7 : state.settings.soundVolume) + '"></label><div class="actions">' + toggles + '</div><p class="muted">Each skin uses its own synthesized set. Finish workout stops every sound.</p><button type="button" class="ghost" data-act="sound-test" data-ev="setLog">Preview set</button><button type="button" class="ghost" data-act="quote-mode">Line order: ' + esc(state.settings.quoteMode) + '</button><button type="button" class="ghost" data-act="sound-more">' + (ui.soundMore ? 'Hide per-event options' : 'Per-event options') + '</button>' + more;
    }
    if (cat === 'timers' && sub === 'rest') {
      return '<p>Rest is kept as an end time, so it stays accurate if the screen locks.</p><label class="stack">Timer size<input data-lockrender="1" data-act="timer-scale" type="range" min="0.85" max="1.15" step="0.05" value="' + esc(state.settings.timer.scale || 1) + '"></label><label class="stack">Metronome size<input data-lockrender="1" data-act="metro-scale" type="range" min="0.85" max="1.15" step="0.05" value="' + esc(state.settings.metronome.scale || 1) + '"></label><button type="button" data-act="tempo-toggle">' + (state.settings.tempo.running ? 'Stop metronome' : 'Start metronome') + '</button>';
    }
    if (cat === 'timers') {
      return '<button type="button" class="switch ' + (state.settings.haptics ? 'on' : '') + '" data-act="toggle-path" data-path="haptics">Haptics ' + (state.settings.haptics ? 'on' : 'off') + '</button><p class="muted">Vibration is used when the device allows it.</p>';
    }
    if (cat === 'input') {
      const mini = native()
        ? '<p>Android can draw the mini over other apps after you grant Display over other apps. The window is rectangular.</p><div class="actions"><button type="button" data-act="overlay-perm">Permission</button><button type="button" data-act="overlay-show">Show mini</button><button type="button" data-act="overlay-hide">Hide</button></div>'
        : '<p>On the web the mini stays in the page. A desktop browser may offer Picture-in-Picture. A phone browser cannot float over other apps.</p><button type="button" data-act="pip">Pop mini out</button>';
      return '<p>Prompts appear after you use a keyboard or a controller. A touch screen does not stamp "click" on every button.</p><button type="button" data-act="ps-swap">PlayStation confirm swap ' + (state.settings.psConfirmSwap ? 'on' : 'off') + '</button><button type="button" data-act="overlay" data-overlay="inputs">Test inputs</button><p>Last input: ' + esc(state.settings.lastInput) + '</p>' + mini;
    }
    if (cat === 'data') {
      const cap = SIC.storageCapability({ nativeSaf: !!(native() && native().pickDirectory), directoryPicker: typeof window.showDirectoryPicker === 'function', mobileWeb: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) && window.innerWidth < 900 });
      const rows = ['routines', 'history', 'backups'].map(function (kind) {
        return '<div class="card"><strong>' + kind + '</strong><p class="muted">' + esc(ui.folderStatus[kind] || 'No folder grant yet.') + '</p><div class="actions"><button type="button" data-act="folder" data-kind="' + kind + '">Choose folder</button><button type="button" data-act="xml-export" data-kind="' + (kind === 'backups' ? 'bundle' : kind) + '">Export XML</button><button type="button" data-act="xml-file" data-kind="' + (kind === 'backups' ? 'bundle' : kind) + '">Import XML</button></div></div>';
      }).join('');
      return '<button type="button" class="switch ' + (state.settings.autosave ? 'on' : '') + '" data-act="toggle-path" data-path="autosave">Autosave ' + (state.settings.autosave ? 'on' : 'off') + '</button>' + (state.settings.autosave ? '' : '<p class="warn">Autosave is off. Use Save now.</p>') + '<div class="actions"><button type="button" class="primary" data-act="save-now">Save now</button><button type="button" data-act="restore-snap">Restore snapshot</button></div><p>' + state.snapshots.length + ' snapshots on this device. Live data is ' + (platformName() === 'android' ? 'app-private storage' : 'this site\'s localStorage') + '. Folder access: ' + esc(cap) + '.</p><p class="warn">Uninstall or a wiped browser can drop data that was not exported.</p>' + rows + '<button type="button" class="ghost" data-act="folder-reset">Use downloads only</button><input id="xml-file" type="file" accept=".xml,text/xml" class="hidden" data-lockrender="1">';
    }
    if (cat === 'notes') {
      return '<p>Learning stays off until you turn it on. Web notices only show while this page is open. Android reminders use the system alarm. Sneak peek idea: Ryan (ryno).</p><button type="button" class="switch ' + (state.settings.notifications.enabled ? 'on' : '') + '" data-act="toggle-path" data-path="notifications.enabled">' + (state.settings.notifications.enabled ? 'On' : 'Off') + '</button><button type="button" data-act="toggle-path" data-path="notifications.learning">Learning ' + (state.settings.notifications.learning ? 'on' : 'off') + '</button><label class="stack">Manual time<input data-lockrender="1" data-act="manual-time" type="time" value="' + esc(state.settings.notifications.manualTime || '') + '"></label><div class="grid-2"><label class="stack">Quiet from<input data-lockrender="1" data-act="quiet" data-which="start" type="time" value="' + esc(state.settings.quietHours.start) + '"></label><label class="stack">until<input data-lockrender="1" data-act="quiet" data-which="end" type="time" value="' + esc(state.settings.quietHours.end) + '"></label></div><button type="button" data-act="toggle-path" data-path="quietHours.enabled">Quiet hours ' + (state.settings.quietHours.enabled ? 'on' : 'off') + '</button><div class="actions"><button type="button" data-act="sneak">Preview sneak peek</button><button type="button" data-act="notify-permission">Notification permission</button></div>';
    }
    return '<h2>About</h2><p><strong>Strength in Character</strong> ' + esc(CFG.appVersion) + '</p><p class="welcome-tag">BE YOUR OWN BIGGEST FAN</p><h3>Credits</h3><p>The workout sneak-peek notification idea is from Ryan "ryno".</p><h3>Privacy</h3><p>All workout data stays on this device. Use Data &amp; files to export XML when you want a backup. Nothing here is uploaded.</p><h3>Report a bug</h3>' + bugBlock() + '<div class="actions"><button type="button" data-act="overlay" data-overlay="console">Open console</button><button type="button" data-act="clear-data">Clear data</button></div>';
  }
  function bugFields() {
    return '<textarea id="bug-text" data-lockrender="1" rows="4" placeholder="What went wrong?"></textarea><input id="bug-contact" data-lockrender="1" placeholder="Optional contact"><input id="bug-company" class="hp" tabindex="-1" autocomplete="off" data-lockrender="1"><label><input id="bug-diag" type="checkbox" data-act="bug-diag"' + (ui.bugPreview ? ' checked' : '') + '> Include diagnostics</label><pre class="selectable" id="bug-preview">' + (ui.bugPreview ? esc(JSON.stringify(diagnostics(), null, 2)) : '') + '</pre>';
  }
  function bugBlock() {
    if (CFG.bugReportEnabled !== true) {
      return '<p class="bug-status" data-bug-status="disabled">Online bug reporting is coming soon. Share this report with the developer.</p>' + bugFields() + '<div class="actions"><button type="button" data-act="bug-save">Save on this device</button><button type="button" class="primary" data-act="bug-share">Share</button><button type="button" data-act="bug-copy">Copy</button></div><div id="bug-result" class="muted"></div>';
    }
    const status = bugStatus();
    return '<p class="bug-status" data-bug-status="' + status + '">Bug reports: ' + (status === 'unconfigured' ? 'not configured. Submit keeps the report on this device.' : status === 'pending' ? 'endpoint saved, waiting for a readable server ack.' : 'a previous ack was received.') + '</p><p class="muted">Reports go to the developer\'s Google Sheet after that owner deploys the Apps Script receiver. Google processes request metadata. Workout logs are not attached. Diagnostics are off unless you preview and include them. No email is required. Setup is in gas/SETUP.md. This build has not verified a live endpoint.</p><label class="selectable">Receiver URL <input data-lockrender="1" data-act="bug-endpoint" value="' + esc(state.settings.bugEndpoint || '') + '" placeholder="https://script.google.com/.../exec"></label>' + bugFields() + '<button type="button" class="primary" data-act="bug-submit">Submit</button><div id="bug-result" class="muted"></div>';
  }
  function diagnostics() {
    return { version: CFG.appVersion, platform: platformName(), skin: state.skinId, viewport: window.innerWidth + 'x' + window.innerHeight, saveState: runtime.dirty ? 'dirty' : 'saved', lastError: runtime.lastError || '' };
  }
  function overlayHTML() {
    if (ui.dialog) return dialogHTML(ui.dialog);
    if (!ui.overlay) return '';
    if (ui.overlay === 'overlay-ask') return '<div class="overlay"><div class="sheet"><h2>Float over other apps</h2><p>Mini mode is a small Strength in Character window that stays on top of other Android apps, like a chat head. Android asks for "Display over other apps". You can turn that off later in system settings. This is not available on iOS or in a phone browser.</p><div class="row"><button type="button" class="primary" data-act="overlay-perm">Continue to Android settings</button><button type="button" data-act="close-overlay">Not now</button></div></div></div>';
    if (ui.overlay === 'settings') return '<div class="overlay"><div class="sheet">' + settingsHTML() + '</div></div>';
    if (ui.overlay === 'bug') return '<div class="overlay"><div class="sheet"><div class="spread"><h2>Bug report</h2><button type="button" data-act="close-overlay">Close</button></div>' + bugBlock() + '</div></div>';
    if (ui.overlay === 'whats') return '<div class="overlay"><div class="sheet"><h2>What\'s new</h2><p>Strength in Character ' + esc(CFG.appVersion) + '. Star Strength Classic is the spreadsheet. The other seven looks are marked Beta look and log the same way.</p><ul><li>LOG SET records the current set and starts rest. Finish is the control that ends the session.</li><li>Duo switches partners and keeps each person\'s previous numbers.</li><li>The workout sneak-peek idea is from Ryan "ryno".</li></ul><p>Online bug reporting is coming soon. Share a report from About if you need the developer to see it.</p><button type="button" class="primary" data-act="whats-close">Continue</button></div></div>';
    if (ui.overlay === 'rest') return '<div class="overlay"><div class="sheet"><div class="spread"><h2>Rest timers</h2><button type="button" data-act="close-overlay">Close</button></div>' + ['batman', 'robin'].filter(function (p) { return p === 'batman' || state.duoMode; }).map(function (p) {
      return '<div class="card"><strong>' + esc(state.partnerNames[p]) + '</strong><div class="timer-readout" data-rest="' + p + '">' + fmtClock(SIC.restRemaining(state, p, Date.now())) + '</div><div class="row">' + [30, 60, 90, 120, 180, 240].map(function (s) { return '<button type="button" data-act="rest-dur" data-partner="' + p + '" data-sec="' + s + '">' + s + 's</button>'; }).join('') + '</div><button type="button" data-act="rest-start" data-partner="' + p + '">Start</button> <button type="button" data-act="rest-stop" data-partner="' + p + '">Stop</button></div>';
    }).join('') + '</div></div>';
    if (ui.overlay === 'tempo') {
      const t = state.settings.tempo[partner()];
      return '<div class="overlay"><div class="sheet"><div class="spread"><h2>Tempo · ' + esc(state.partnerNames[partner()]) + '</h2><button type="button" data-act="close-overlay">Close</button></div><div class="metro-readout" data-metro>' + esc(runtime.phase) + '</div><div class="grid-2"><label>Lower <input data-lockrender="1" data-act="tempo" data-part="e" type="number" min="0" max="10" value="' + t.e + '"></label><label>Bottom <input data-lockrender="1" data-act="tempo" data-part="p1" type="number" min="0" max="10" value="' + t.p1 + '"></label><label>Lift <input data-lockrender="1" data-act="tempo" data-part="c" type="number" min="0" max="10" value="' + t.c + '"></label><label>Top <input data-lockrender="1" data-act="tempo" data-part="p2" type="number" min="0" max="10" value="' + t.p2 + '"></label></div><button type="button" class="primary" data-act="tempo-toggle">' + (state.settings.tempo.running ? 'Stop metronome' : 'Start metronome') + '</button><p class="muted">Each partner has a pattern. The click keeps going unless every active partner is resting, and only one click plays at a time.</p></div></div>';
    }
    if (ui.overlay === 'calc') return '<div class="overlay"><div class="sheet"><div class="spread"><h2>1RM and plates</h2><button type="button" data-act="close-overlay">Close</button></div><div class="grid-2"><label>Weight <input id="calc-w" data-lockrender="1" data-act="calc" value="' + esc(ui.calc.weight) + '"></label><label>Reps <input id="calc-r" data-lockrender="1" data-act="calc" value="' + esc(ui.calc.reps) + '"></label></div><div id="calc-result"></div></div></div>';
    if (ui.overlay === 'summary') return '<div class="overlay"><div class="sheet"><h2>' + esc(ui.summaryTitle || 'Workout saved') + '</h2><p>' + esc(ui.summarySub || '') + '</p><div id="summary-body">' + (ui.summaryHTML || '') + '</div><button type="button" class="primary" data-act="summary-close">LET\'S GOOOOO!</button></div></div>';
    if (ui.overlay === 'alert') return '<div class="overlay"><div class="sheet"><h2>Rest completed</h2><p>' + esc(ui.alertText || '') + '</p><button type="button" class="primary" data-act="alert-close">OK, LOCK IN!</button></div></div>';
    if (ui.overlay === 'console') return '<div class="overlay"><div class="sheet"><div class="spread"><h2>Console</h2><button type="button" data-act="close-overlay">Close</button></div><div class="console-log" id="console-log">' + ui.console.map(esc).join('\n') + '</div><input id="console-input" data-lockrender="1" data-console="1" placeholder="/help is not required — type a / command" aria-label="Console"></div></div>';
    if (ui.overlay === 'inputs') return '<div class="overlay"><div class="sheet"><div class="spread"><h2>Test inputs</h2><button type="button" data-act="close-overlay">Close</button></div><p>Press a key or gamepad button.</p><div id="input-test" class="selectable">' + esc(ui.testInput) + '</div></div></div>';
    if (ui.overlay === 'import') return '<div class="overlay"><div class="sheet"><div class="spread"><h2>Import share code</h2><button type="button" data-act="close-overlay">Close</button></div><textarea id="share-code" data-lockrender="1" rows="5" placeholder="Paste code"></textarea><button type="button" class="primary" data-act="share-import">Import</button></div></div>';
    if (ui.overlay === 'builder') return '<div class="overlay"><div class="sheet"><div class="spread"><h2>New routine</h2><button type="button" class="ghost" data-act="close-overlay">Cancel</button></div><label class="stack">Routine name<input id="builder-name" data-lockrender="1" value="' + esc(ui.builder ? ui.builder.name : '') + '" placeholder="For example, upper lower" aria-label="Routine name"></label><div id="builder-days">' + builderDays() + '</div><div class="actions"><button type="button" class="ghost" data-act="builder-day">Add day</button><button type="button" class="primary" data-act="builder-save">Save routine</button></div></div></div>';
    if (ui.overlay === 'xml') return '<div class="overlay"><div class="sheet"><h2>Import preview</h2>' + importPreviewHTML() + '<div class="actions"><button type="button" class="primary" data-act="xml-apply" data-mode="merge">Merge</button><button type="button" class="ghost" data-act="xml-apply" data-mode="replace">Replace</button><button type="button" class="ghost" data-act="close-overlay">Cancel</button></div></div></div>';
    if (ui.overlay === 'history-edit') return '<div class="overlay"><div class="sheet"><h2>Edit workout</h2>' + historyEditor() + '</div></div>';
    if (ui.overlay === 'add') return '<div class="overlay"><div class="sheet"><h2>Add ' + esc(ui.pendingName || '') + '</h2><p>Permanent keeps it on this day of the routine. Today only leaves the routine and your history as they are.</p><div class="row"><button type="button" class="primary" data-act="add-go" data-mode="permanent">Routine from now on</button><button type="button" data-act="add-go" data-mode="today">Today only</button><button type="button" data-act="close-overlay">Cancel</button></div></div></div>';
    if (ui.overlay === 'remove') return '<div class="overlay"><div class="sheet"><h2>Remove exercise</h2><p>History already saved is kept. Today only hides it for this session. From now on removes it from the routine.</p><div class="row"><button type="button" data-act="remove-go" data-mode="today">Today only</button><button type="button" data-act="remove-go" data-mode="permanent">From now on</button><button type="button" data-act="close-overlay">Cancel</button></div></div></div>';
    if (ui.overlay === 'finish') return '<div class="overlay"><div class="sheet"><h2>Finish workout?</h2><p>This stops every rest timer, the metronome, sounds, and rest alerts. Unlogged sets are not written into history.</p><div class="row">' + (state.duoMode ? '<button type="button" class="primary" data-act="finish-go" data-who="both">Both partners</button><button type="button" data-act="finish-go" data-who="one">Only ' + esc(state.partnerNames[partner()]) + '</button>' : '<button type="button" class="primary" data-act="finish-go" data-who="one">Finish</button>') + '<button type="button" data-act="close-overlay">Cancel</button></div></div></div>';
    if (ui.overlay === 'sneak') return '<div class="overlay"><div class="sheet"><h2>Here\'s a sneak peek of today\'s workout!</h2><p>Countdown to pump:</p><div>' + (viewCache ? viewCache.exercises.map(function (e) { return '<div>' + esc(e.name) + '</div>'; }).join('') : '') + '</div><p class="muted">Idea credited to Ryan (ryno). This preview is inside the app. A system notification depends on the operating system and was not claimed as tested on hardware.</p><button type="button" data-act="close-overlay">Close</button></div></div>';
    if (ui.overlay === 'clear') return '<div class="overlay"><div class="sheet"><h2>Clear SIC data?</h2><p>This removes SIC keys only, after a JSON backup download. Other websites\' storage is left alone. This cannot be undone from inside SIC.</p><button type="button" data-act="clear-go">Download backup and clear</button><button type="button" data-act="close-overlay">Cancel</button></div></div>';
    return '';
  }
  function dialogHTML(d) {
    return '<div class="overlay"><div class="sheet"><h2>' + esc(d.title || 'Notice') + '</h2><p>' + esc(d.message || '') + '</p>' + (d.input ? '<input id="dialog-input" data-lockrender="1" value="' + esc(d.value || '') + '">' : '') + '<div class="row"><button type="button" data-act="dialog-no">Cancel</button><button type="button" class="primary" data-act="dialog-yes">' + esc(d.ok || 'OK') + '</button></div></div></div>';
  }
  function importPreviewHTML() {
    const p = ui.xmlPreview && typeof ui.xmlPreview === 'object' ? ui.xmlPreview : { routineConflicts: [], historyConflicts: [], routineCount: 0, historyCount: 0 };
    const routines = (p.routineConflicts || []).map(function (c) {
      return '<li><strong>' + esc(c.name || c.id) + '</strong> is already on this device as ' + esc(c.existingName || c.id) + '.</li>';
    }).join('') || '<li>No routine conflicts.</li>';
    return '<p>' + (p.routineCount || 0) + ' routines and ' + (p.historyCount || 0) + ' history sessions in this file.</p><p>' + ((p.historyConflicts || []).length) + ' history sessions already exist here and will be skipped on merge.</p><ul class="conflict-list">' + routines + '</ul><p class="muted">Merge adds only new ids. Replace overwrites the imported routines or history. A snapshot is kept first.</p>';
  }
  function builderDays() {
    if (!ui.builder) return '';
    return ui.builder.days.map(function (d, i) {
      return '<div class="card"><label class="stack">Day name<input data-lockrender="1" data-act="builder-name" data-i="' + i + '" value="' + esc(d.name) + '" aria-label="Day name"></label>' + d.exercises.map(function (name, j) { return '<label class="stack">Exercise<input data-lockrender="1" data-act="builder-ex" data-i="' + i + '" data-j="' + j + '" value="' + esc(name) + '" placeholder="Exercise name" aria-label="Exercise name"></label>'; }).join('') + '<button type="button" class="ghost" data-act="builder-ex-add" data-i="' + i + '">Add exercise</button></div>';
    }).join('');
  }
  function historyEditor() {
    const rec = state.history.find(function (h) { return h.id === ui.editId; });
    if (!rec) return '<p>Missing workout.</p>';
    const when = rec.ts ? new Date(rec.ts).toISOString().slice(0, 16) : '';
    return '<label>When <input id="hist-when" data-lockrender="1" type="datetime-local" value="' + esc(when) + '"></label>' + (rec.exercises || []).map(function (e, i) {
      return '<div class="card"><input data-lockrender="1" data-hist="name" data-i="' + i + '" value="' + esc(e.exercise) + '"><select data-hist="partner" data-i="' + i + '"><option' + ((e.partner || 'batman') === 'batman' ? ' selected' : '') + '>batman</option><option' + (e.partner === 'robin' ? ' selected' : '') + '>robin</option></select><select data-hist="muscle" data-i="' + i + '">' + Object.keys({ CHEST: 1, BACK: 1, SHOULDERS: 1, BICEPS: 1, TRICEPS: 1, QUADS: 1, HAMSTRINGS: 1, GLUTES: 1, CALVES: 1, CORE: 1, OTHER: 1 }).map(function (m) { return '<option' + (e.muscle === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select>' + (e.sets || []).map(function (s, j) { return '<div class="row"><select data-hist="type" data-i="' + i + '" data-j="' + j + '">' + SIC.SET_TYPES.map(function (t) { return '<option' + (s.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select><input data-lockrender="1" data-hist="weight" data-i="' + i + '" data-j="' + j + '" value="' + esc(s.weight) + '"><input data-lockrender="1" data-hist="reps" data-i="' + i + '" data-j="' + j + '" value="' + esc(s.reps) + '"></div>'; }).join('') + '</div>';
    }).join('') + '<button type="button" class="primary" data-act="hist-save">Save edits</button><button type="button" data-act="close-overlay">Cancel</button>';
  }

  function render(opts) {
    const typing = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.lockrender === '1';
    if (typing && !(opts && opts.force)) return;
    try { renderNow(); } catch (err) {
      runtime.lastError = err && err.stack ? err.stack : String(err);
      const app = $('app');
      if (app) app.innerHTML = '<div class="card"><h2>Display error</h2><pre class="selectable">' + esc(runtime.lastError) + '</pre></div>';
    }
  }
  function renderNow() {
    applyChrome();
    viewCache = view();
    $('app').innerHTML = shell();
    const mini = $('mini-root');
    mini.hidden = !ui.miniOpen;
    mini.className = 'shape-' + (skin().mini || 'card');
    mini.innerHTML = miniHTML();
    if (ui.miniPos) { mini.style.left = ui.miniPos.x + 'px'; mini.style.top = ui.miniPos.y + 'px'; }
    $('overlay-root').innerHTML = popHTML() + overlayHTML();
    paintRestArt(Date.now());
    drawChart();
    updateCalc();
    const toast = $('toast-root');
    toast.innerHTML = ui.toast ? '<div class="toast"><span>' + esc(ui.toast.text) + '</span>' + (ui.toast.undo ? '<button type="button" data-act="undo">Undo</button>' : '') + '</div>' : '';
  }
  function drawChart() {
    const c = $('muscle-chart'); if (!c) return;
    const ctx = c.getContext('2d');
    const counts = {};
    SIC.MUSCLE_FILTERS.forEach(function (m) { counts[m] = 0; });
    state.history.forEach(function (h) { (h.exercises || []).forEach(function (e) { const k = SIC.muscleKey(e.muscle); counts[k] += (e.sets || []).length; }); });
    const keys = SIC.MUSCLE_FILTERS.filter(function (k) { return counts[k]; });
    const total = keys.reduce(function (a, k) { return a + counts[k]; }, 0) || 1;
    ctx.clearRect(0, 0, c.width, c.height);
    const colors = ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#6366F1', '#14B8A6', '#F97316', '#84CC16', '#F43F5E', '#94A3B8'];
    let ang = -Math.PI / 2;
    keys.forEach(function (k, i) {
      const slice = (counts[k] / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(180, 140); ctx.arc(180, 140, 100, ang, ang + slice); ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      ang += slice;
    });
    ctx.fillStyle = getComputedStyle(document.body).color;
    ctx.font = '12px sans-serif';
    keys.forEach(function (k, i) { ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(320, 24 + i * 18, 10, 10); ctx.fillStyle = getComputedStyle(document.body).color; ctx.fillText(k + ' ' + counts[k], 336, 34 + i * 18); });
    if (!keys.length) { ctx.fillText('Log a workout to see the split.', 20, 40); }
  }
  function updateCalc() {
    const el = $('calc-result'); if (!el) return;
    const w = parseFloat(ui.calc.weight) || 0, r = parseFloat(ui.calc.reps) || 0;
    const one = Math.round(w * (1 + r / 30));
    const unit = state.settings.units;
    const bar = unit === 'kg' ? 20 : 45;
    let side = (w - bar) / 2;
    const plates = unit === 'kg' ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
    const bits = [];
    if (side > 0) plates.forEach(function (p) { const n = Math.floor(side / p + 1e-6); if (n > 0) { side -= n * p; bits.push(n + '×' + p); } });
    el.innerHTML = '<div class="led" style="font-size:40px">' + one + '</div><div>Estimated 1RM ' + esc(unit) + '</div><div>Per side: ' + (bits.join(' ') || 'empty bar') + '</div>';
  }

  function toast(text, undo) { ui.toast = { text: text, undo: !!undo }; render({ force: true }); setTimeout(function () { if (ui.toast && ui.toast.text === text) { ui.toast = null; render({ force: true }); } }, 8000); }
  function openOverlay(name) {
    if (name === 'settings') { ui.settingsCat = null; ui.query = ''; }
    ui.overlay = name;
    if (name === 'builder' && !ui.builder) ui.builder = { name: '', days: [{ name: 'Push', exercises: ['Barbell Bench Press'] }] };
    render({ force: true });
  }
  function closeOverlay() { ui.overlay = null; ui.dialog = null; render({ force: true }); }

  function logSet() {
    const res = SIC.logCurrentSet(state, runtime, Date.now());
    if (!res.ok) { if (res.reason === 'lockout') return; toast(res.reason === 'no-set' ? 'No open set.' : 'Could not log that set.'); return; }
    playEvent('setLog');
    haptic(20);
    syncMetro();
    toast('Logged. Rest started.', true);
    markDirty();
    render({ force: true });
  }
  function doFinish(who) {
    const partners = who === 'both' || !state.duoMode ? (state.duoMode ? ['batman', 'robin'] : ['batman']) : [partner()];
    const res = SIC.finishWorkout(state, { confirmed: true, now: Date.now(), partners: partners, id: ids });
    if (!res.ok) { toast(res.reason === 'incomplete' ? 'Mark at least one set with LOG SET first.' : 'Finish needs a confirmation.'); ui.overlay = null; render({ force: true }); return; }
    stopAudio();
    ui.overlay = 'summary';
    ui.summaryTitle = res.newPRs.length ? 'New personal records' : 'Workout saved';
    ui.summarySub = res.record.routineName + ' · ' + res.record.dayName;
    const stats = SIC.statsForEntries(res.record.exercises);
    ui.summaryHTML = '<div class="grid-2"><div class="card">' + stats.sets + ' sets</div><div class="card">' + stats.volume + ' volume</div></div>' + res.newPRs.map(function (p) { return '<div>' + esc(p.exercise) + ' ' + fmtW(p.weight) + '</div>'; }).join('');
    if (res.newPRs.length) { playEvent('pr'); if (!reducedMotion()) burst(); }
    playEvent('workoutSaved');
    markDirty();
    render({ force: true });
  }
  function burst() {
    if (typeof document === 'undefined') return;
    for (let i = 0; i < 24; i++) {
      const d = document.createElement('i');
      d.style.cssText = 'position:fixed;z-index:95;width:8px;height:8px;left:50%;top:40%;background:' + (i % 2 ? 'var(--accent)' : 'var(--accent-2)') + ';pointer-events:none';
      document.body.appendChild(d);
      const dx = (Math.random() - 0.5) * 300, dy = (Math.random() - 0.8) * 240;
      d.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(' + dx + 'px,' + dy + 'px)', opacity: 0 }], { duration: 700 });
      setTimeout(function () { d.remove(); }, 800);
    }
  }

  function ctxAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function soundCat(name) {
    const map = { setLog: 'sets', restTick: 'rest', countdown: 'rest', restDone: 'rest', metronome: 'rest', workoutSaved: 'finish', pr: 'pr', tap: 'taps', duoFlip: 'duo', error: 'errors', undo: 'errors' };
    const cats = state.settings.soundCats || {};
    return cats[map[name] || 'taps'] !== false;
  }
  function playEvent(name) {
    if (!userSound || !state.soundEnabled || state.settings.masterMute) return;
    if (!soundCat(name)) return;
    const spec = (state.settings.sounds && state.settings.sounds[name]) || { on: true };
    if (spec.on === false) return;
    const palettes = {
      starclassic: { wave: 'triangle', setLog: [523, 659, 784], restTick: [440], countdown: [587, 784], restDone: [523, 784], pr: [659, 880, 1175], workoutSaved: [392, 523, 659, 784], tap: [784], duoFlip: [440, 554], error: [196, 165], undo: [330], metronome: [660] },
      pixelforecast: { wave: 'square', setLog: [523, 659, 784, 1046], restTick: [880], countdown: [1046, 784, 523], restDone: [523, 659, 784, 1046, 784], pr: [784, 988, 1175, 1568], workoutSaved: [392, 523, 659, 784, 1046], tap: [1318], duoFlip: [659, 880], error: [220, 196], undo: [392], metronome: [988] },
      irondial: { wave: 'square', noise: true, setLog: [180, 240], restTick: [140], countdown: [200, 260, 320], restDone: [160, 220, 300], pr: [240, 320, 420], workoutSaved: [140, 180, 240, 320], tap: [420], duoFlip: [180, 280], error: [90], undo: [120], metronome: [300] },
      chalkboard: { wave: 'sawtooth', noise: true, setLog: [300, 420], restTick: [500], countdown: [360, 480], restDone: [280, 360, 520], pr: [400, 520, 680], workoutSaved: [260, 340, 420, 560], tap: [700], duoFlip: [340, 480], error: [140], undo: [220], metronome: [460] },
      scoreboard: { wave: 'sawtooth', setLog: [220, 330], restTick: [196], countdown: [247, 311, 370], restDone: [196, 247, 330, 392], pr: [262, 330, 392, 523], workoutSaved: [165, 220, 277, 330], tap: [440], duoFlip: [196, 262], error: [110], undo: [147], metronome: [294] },
      transitline: { wave: 'sine', setLog: [659, 880], restTick: [784], countdown: [698, 880, 1046], restDone: [523, 659, 784, 1046], pr: [784, 988, 1318], workoutSaved: [523, 659, 784, 1046], tap: [1175], duoFlip: [587, 784], error: [233], undo: [349], metronome: [880] },
      vinyldeck: { wave: 'triangle', noise: true, setLog: [220, 330], restTick: [180], countdown: [247, 330], restDone: [196, 294, 392], pr: [262, 392, 523], workoutSaved: [174, 220, 262, 349], tap: [500], duoFlip: [196, 294], error: [98], undo: [147], metronome: [247] },
      hexhive: { wave: 'sawtooth', setLog: [110, 165, 220], restTick: [146], countdown: [130, 164, 196], restDone: [98, 146, 196], pr: [164, 220, 277], workoutSaved: [82, 110, 146, 196], tap: [246], duoFlip: [130, 196], error: [73], undo: [98], metronome: [174] }
    };
    const skinId = state.skinId && palettes[state.skinId] ? state.skinId : 'starclassic';
    const pal = palettes[skinId];
    const notes = pal[name] || pal.tap;
    const vol = Math.max(0, Math.min(1, state.settings.soundVolume == null ? 0.7 : Number(state.settings.soundVolume))) * (Number(spec.volume) || 0.35);
    try {
      const ctx = ctxAudio();
      let t = ctx.currentTime;
      if (pal.noise && (name === 'tap' || name === 'restTick' || name === 'setLog' || skinId === 'chalkboard' || skinId === 'vinyldeck')) {
        const dur = 0.08;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = skinId === 'chalkboard' ? 'highpass' : 'bandpass';
        filter.frequency.value = skinId === 'irondial' ? 400 : 1800;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol * 0.45, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filter); filter.connect(g); g.connect(ctx.destination);
        src.start(t); src.stop(t + dur);
        runtime.nodes.push(src);
      }
      notes.forEach(function (f, i) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = pal.wave;
        osc.frequency.value = f;
        const start = t + i * (name === 'countdown' ? 0.12 : 0.09);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + (name === 'workoutSaved' || name === 'pr' ? 0.28 : 0.12));
        osc.connect(g); g.connect(ctx.destination);
        osc.start(start); osc.stop(start + 0.32);
        runtime.nodes.push(osc);
      });
    } catch (e) {}
  }
  function stopAudio() {
    if (runtime.metro) { clearInterval(runtime.metro); runtime.metro = null; }
    state.settings.tempo.running = false;
    runtime.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
    runtime.nodes = [];
    runtime.phase = 'READY';
  }
  function syncMetro() {
    const now = Date.now();
    const on = SIC.metronomeShouldClick(state, now);
    if (!on) { if (runtime.metro) { clearInterval(runtime.metro); runtime.metro = null; runtime.phase = 'REST'; } paintMetro(); return; }
    if (runtime.metro) return;
    const p = SIC.metronomePartner(state, now);
    const pat = state.settings.tempo[p] || { e: 1, p1: 0, c: 1, p2: 1 };
    const steps = [];
    for (let i = 0; i < pat.e; i++) steps.push('LOWER');
    for (let i = 0; i < pat.p1; i++) steps.push('BOTTOM');
    for (let i = 0; i < pat.c; i++) steps.push('LIFT');
    for (let i = 0; i < pat.p2; i++) steps.push('TOP');
    if (!steps.length) steps.push('TICK');
    let idx = 0;
    runtime.metro = setInterval(function () {
      if (!SIC.metronomeShouldClick(state, Date.now())) { syncMetro(); return; }
      runtime.phase = steps[idx % steps.length]; idx++;
      playEvent('metronome'); paintMetro();
    }, 1000);
  }
  function paintMetro() { document.querySelectorAll('[data-metro]').forEach(function (el) { el.textContent = runtime.phase; }); }
  function haptic(ms) { if (!state.settings.haptics || !navigator.vibrate) return; try { navigator.vibrate(ms || 15); } catch (e) {} }
  function paintRestArt(now) {
    const p = partner();
    const slot = state.rest[p] || {};
    const total = slot.total || slot.duration || 240;
    const rem = SIC.restRemaining(state, p, now);
    const pct = state.settings.restEnabled === false ? 0 : Math.max(0, Math.min(1, rem / total));
    document.querySelectorAll('[data-rest-arc]').forEach(function (el) {
      const r = Number(el.getAttribute('r')) || 46;
      const circ = 2 * Math.PI * r;
      el.setAttribute('stroke-dasharray', (pct * circ).toFixed(1) + ' ' + circ.toFixed(1));
    });
    document.querySelectorAll('[data-rest-bar]').forEach(function (el) { el.style.width = Math.round(pct * 100) + '%'; });
  }
  function tick() {
    const now = Date.now();
    ['batman', 'robin'].forEach(function (p) {
      const rem = SIC.restRemaining(state, p, now);
      const alive = rem > 0;
      if (runtime.restAlive[p] && !alive && state.rest[p].endAt) {
        state.rest[p].endAt = 0;
        const line = SIC.nextLine(ui.quoteIndex, state.settings.quoteMode, Math.random);
        ui.quoteIndex++;
        const who = state.duoMode ? state.partnerNames[p] + ' — ' : '';
        ui.alertText = who + line.text;
        ui.overlay = ui.overlay || 'alert';
        playEvent('restDone'); haptic(40); markDirty(); render({ force: !document.activeElement || document.activeElement.dataset.lockrender !== '1' });
      }
      runtime.restAlive[p] = alive;
      if (alive) {
        const sec = Math.ceil(rem);
        runtime.lastCue = runtime.lastCue || {};
        if (runtime.lastCue[p] !== sec) {
          runtime.lastCue[p] = sec;
          if (sec > 0 && sec <= 5) playEvent('countdown');
          else if (sec > 5) playEvent('restTick');
        }
      }
      document.querySelectorAll('[data-rest="' + p + '"]').forEach(function (el) {
        const label = el.classList.contains('timer-readout') && el.childNodes.length === 1 ? null : null;
        if (el.dataset.rest === p) el.textContent = (el.textContent.indexOf('Rest') === 0 && p === 'batman' && !state.duoMode ? 'Rest ' : '') + fmtClock(rem);
      });
    });
    syncMetro();
    paintRestArt(now);
    const rim = document.querySelector('[data-rest-rim]');
    if (rim) {
      const total = state.rest.batman.total || state.rest.batman.duration || 1;
      const pct = SIC.restRemaining(state, 'batman', now) / total;
      const dash = Math.round(Math.max(0, Math.min(1, pct)) * 276);
      const arc = rim.querySelectorAll('circle')[1];
      if (arc) arc.setAttribute('stroke-dasharray', dash + ' 276');
    }
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
    a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  async function copyText(text) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
    return false;
  }
  function ask(title, message, value) {
    return new Promise(function (resolve) { ui.dialog = { title: title, message: message, input: value != null, value: value || '', resolve: resolve }; render({ force: true }); });
  }

  function rememberBug(message, contact) {
    const built = SIC.buildBugPayload({ message: message, contact: contact, company: ($('bug-company') && $('bug-company').value) || '', includeDiagnostics: ui.bugPreview, diagnostics: diagnostics(), version: CFG.appVersion, platform: platformName(), skin: state.skinId, id: ids('rpt').replace(/^id_/, 'rpt_') });
    if (!built.ok) { toast(built.error === 'too-large' ? 'Report is over 4 KB.' : 'Add a description first.'); return null; }
    const queue = state.settings.bugQueue || [];
    queue.push(built.payload);
    state.settings.bugQueue = queue.slice(-30);
    markDirty();
    return built.payload;
  }
  function reportPlain(payload) {
    const lines = ['Strength in Character bug report', 'Online bug reporting is coming soon. Share this report with the developer.', '', payload.message || ''];
    if (payload.contact) lines.push('Contact: ' + payload.contact);
    if (payload.diagnostics) lines.push(JSON.stringify(payload.diagnostics));
    lines.push(payload.id || '');
    return lines.join('\n');
  }
  async function shareReport(text) {
    if (navigator.share) {
      try { await navigator.share({ title: 'Strength in Character bug report', text: text }); return 'shared'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    }
    const n = native();
    if (n && n.shareText) {
      try { n.shareText('Strength in Character bug report', text); return 'shared'; } catch (e) {}
    }
    return (await copyText(text)) ? 'copied' : 'saved';
  }
  async function submitBug(message, contact) {
    if (CFG.bugReportEnabled !== true) return;
    const built = rememberBug(message, contact);
    if (!built) return;
    const last = Number(state.settings.bugLast || 0);
    if (Date.now() - last < 15000) { toast('Wait a few seconds before another report.'); return; }
    state.settings.bugLast = Date.now();
    const endpoint = bugEndpoint();
    if (!endpoint) {
      const note = $('bug-result'); if (note) note.textContent = 'Not configured — saved on this device as ' + built.id + '.';
      toast('Saved on this device. Receiver is not deployed.'); return;
    }
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(built), redirect: 'follow' });
      const text = await res.text();
      const ack = SIC.interpretBugResponse(text, built.id);
      const note = $('bug-result');
      if (!ack.confirmed) {
        if (note) note.textContent = 'Not confirmed — saved on this device, will retry. (' + ack.reason + ')';
        toast('Not confirmed — saved on this device.');
      } else {
        runtime.bugVerified = true; state.settings.bugVerified = true;
        state.settings.bugQueue = (state.settings.bugQueue || []).filter(function (r) { return r.id !== ack.id; });
        if (note) note.textContent = 'Submitted ' + ack.id;
        toast('Submitted ' + ack.id);
      }
    } catch (e) {
      const note = $('bug-result'); if (note) note.textContent = 'Not confirmed — saved on this device, will retry.';
      toast('Not confirmed — saved on this device.');
    }
    markDirty();
  }

  async function chooseFolder(kind) {
    const n = native();
    if (n && n.pickDirectory) { n.pickDirectory(kind); ui.folderStatus[kind] = 'Waiting for the system folder picker.'; render({ force: true }); return; }
    const mobile = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) && window.innerWidth < 900;
    if (mobile || typeof window.showDirectoryPicker !== 'function') {
      ui.folderStatus[kind] = 'This browser can download and open files. It will not write to a typed path.';
      render({ force: true }); return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      runtime.handles[kind] = handle;
      ui.folderStatus[kind] = 'Folder granted: ' + (handle.name || 'chosen folder') + '. Permission lasts until the browser clears it.';
    } catch (e) {
      ui.folderStatus[kind] = 'Folder was not granted. Local copy stays here.';
    }
    render({ force: true });
  }
  async function writeFolder(kind, filename, text) {
    const n = native();
    if (n && n.writeTextFile) {
      let ok = false;
      try { ok = !!n.writeTextFile(kind, filename, text); } catch (e) { ok = false; }
      if (ok) { ui.folderStatus[kind] = 'Wrote ' + filename + ' in the chosen folder and checked the bytes.'; toast('Folder write verified.'); return; }
      ui.folderStatus[kind] = 'No folder grant. Downloaded a copy instead. Local data kept.';
    }
    const handle = runtime.handles[kind];
    if (!handle) { download(filename, text, 'application/xml'); return; }
    try {
      const file = await handle.getFileHandle(filename, { create: true });
      const w = await file.createWritable();
      await w.write(text); await w.close();
      const check = await (await file.getFile()).text();
      if (check !== text) throw new Error('verify');
      ui.folderStatus[kind] = 'Wrote and read back ' + filename + '.';
    } catch (e) {
      ui.folderStatus[kind] = 'Could not write the folder. Downloaded a copy instead. Local data was kept.';
      download(filename, text, 'application/xml');
    }
  }

  function onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act !== 'field') userSound = true;
    const act = t.dataset.act;
    if (act !== 'sound-test' && act !== 'log-set' && act !== 'finish' && act !== 'field') playEvent('tap');
    if (act === 'tab') { ui.tab = t.dataset.tab; render({ force: true }); return; }
    if (act === 'log-set') { logSet(); return; }
    if (act === 'finish') { ui.overlay = 'finish'; render({ force: true }); return; }
    if (act === 'finish-go') { doFinish(t.dataset.who); return; }
    if (act === 'nudge') {
      SIC.nudgeSet(state, t.dataset.ex, t.dataset.set, t.dataset.field, Number(t.dataset.dir), partner());
      markDirty(); render({ force: true }); return;
    }
    if (act === 'toggle-done') {
      const ex = t.dataset.ex, setId = t.dataset.set;
      state.focus = { exerciseId: ex, setId: setId };
      const cur = SIC.findCurrent(state);
      if (cur && cur.set && SIC.setDone(cur.set, partner())) { SIC.setDoneFlag && null; cur.set[partner() === 'robin' ? 'p2Done' : 'done'] = false; if (state.rest[partner()]) state.rest[partner()].endAt = 0; markDirty(); render({ force: true }); return; }
      logSet(); return;
    }
    if (act === 'focus-set' || act === 'focus-ex') {
      state.focus = { exerciseId: t.dataset.ex, setId: t.dataset.set || state.focus && state.focus.setId };
      if (!t.dataset.set) { const vis = SIC.visibleExercises(state).find(function (v) { return v.exercise.id === t.dataset.ex; }); const data = vis && state.currentSession[SIC.sessionKey(state.activeRoutineId, state.activeDay, vis.exercise.id)]; const open = data && data.sets && data.sets.find(function (s) { return !SIC.setDone(s, partner()); }); if (open) state.focus.setId = open.id; }
      render({ force: true }); return;
    }
    if (act === 'add-set') { SIC.addSet(state, t.dataset.ex, ids); markDirty(); render({ force: true }); return; }
    if (act === 'del-set') {
      const res = SIC.deleteSet(state, t.dataset.ex, t.dataset.set, { now: Date.now(), runtime: runtime });
      if (!res.ok && res.reason === 'confirm') {
        ui.dialog = { title: 'Delete this set?', message: 'It has numbers or a logged mark. You can undo right after.', ok: 'Delete', resolve: function (yes) { if (!yes) return; SIC.deleteSet(state, t.dataset.ex, t.dataset.set, { confirmed: true, now: Date.now(), runtime: runtime }); toast('Set removed.', true); markDirty(); } };
        render({ force: true }); return;
      }
      toast('Set removed.', true); markDirty(); render({ force: true }); return;
    }
    if (act === 'manage') { ui.pop = t.dataset.ex; render({ force: true }); return; }
    if (act === 'pop-close') { ui.pop = null; render({ force: true }); return; }
    if (act === 'undo') { SIC.undoLast(state, runtime, Date.now()); ui.toast = null; markDirty(); render({ force: true }); return; }
    if (act === 'overlay') { openOverlay(t.dataset.overlay); return; }
    if (act === 'close-overlay' || act === 'alert-close') { ui.overlay = null; render({ force: true }); return; }
    if (act === 'whats-close') { try { storage.setItem('ss_seen_version', CFG.appVersion); } catch (e) {} ui.whatsBar = false; ui.overlay = null; render({ force: true }); return; }
    if (act === 'welcome-skip') { try { storage.setItem('ss_seen_welcome', '1'); storage.setItem('ss_seen_version', CFG.appVersion); } catch (e) {} ui.welcome = false; ui.whatsBar = false; render({ force: true }); return; }
    if (act === 'summary-close') { ui.overlay = null; ui.tab = 'history'; render({ force: true }); return; }
    if (act === 'mini-wide') { ui.miniWide = !ui.miniWide; render({ force: true }); return; }
    if (act === 'mini-open') {
      const n = native();
      if (n && n.showOverlay) {
        if (n.canOverlay && !n.canOverlay()) { ui.overlay = 'overlay-ask'; render({ force: true }); return; }
        persist('mini');
        n.showOverlay();
        return;
      }
      ui.miniOpen = true; render({ force: true }); return;
    }
    if (act === 'overlay-expand') { const n = native(); if (n && n.openApp) n.openApp(); return; }
    if (act === 'mini-close') { ui.miniOpen = false; render({ force: true }); return; }
    if (act === 'mini-min') { ui.miniOpen = false; render({ force: true }); return; }
    if (act === 'day') { /* select change */ return; }
    if (act === 'day-step') {
      const days = Object.keys((viewCache.routine && viewCache.routine.days) || {});
      if (!days.length) return;
      const i = Math.max(0, days.indexOf(state.activeDay));
      const next = days[(i + (Number(t.dataset.dir) || 1) + days.length) % days.length];
      state.activeDay = next; state.settings.activeDay = next; state.focus = null; markDirty(); render({ force: true }); return;
    }
    if (act === 'skin') { state.skinId = t.dataset.skin; markDirty(); render({ force: true }); return; }
    if (act === 'theme') { state.activeThemeId = t.dataset.theme; if (state.skinId !== 'starclassic') state.skinId = 'starclassic'; markDirty(); render({ force: true }); return; }
    if (act === 'partner') { if (t.dataset.partner === 'robin' && !state.duoMode) { state.duoMode = true; } if (state.activePartner !== t.dataset.partner) playEvent('duoFlip'); state.activePartner = t.dataset.partner; ui.flipped = true; markDirty(); render({ force: true }); setTimeout(function () { ui.flipped = false; }, 450); return; }
    if (act === 'back-log') { ui.tab = 'log'; ui.overlay = null; ui.pop = null; render({ force: true }); return; }
    if (act === 'duo') { state.duoMode = !state.duoMode; if (!state.duoMode) { state.activePartner = 'batman'; state.rest.robin.endAt = 0; } markDirty(); render({ force: true }); return; }
    if (act === 'master-sound') { state.soundEnabled = !(state.soundEnabled && !state.settings.masterMute); state.settings.masterMute = !state.soundEnabled; markDirty(); render({ force: true }); return; }
    if (act === 'sound-cat') { state.settings.soundCats = state.settings.soundCats || {}; state.settings.soundCats[t.dataset.cat] = state.settings.soundCats[t.dataset.cat] === false; markDirty(); render({ force: true }); return; }
    if (act === 'basic') { state.settings.basicMode = !state.settings.basicMode; render({ force: true }); return; }
    if (act === 'settings-open') { ui.settingsCat = t.dataset.cat; ui.settingsSub = t.dataset.sub || 'skin'; ui.query = ''; render({ force: true }); return; }
    if (act === 'settings-back') { ui.settingsCat = null; render({ force: true }); return; }
    if (act === 'settings-sub') { ui.settingsSub = t.dataset.sub; render({ force: true }); return; }
    if (act === 'sound-more') { ui.soundMore = !ui.soundMore; render({ force: true }); return; }
    if (act === 'motion') { state.settings.motion = t.dataset.mode; markDirty(); render({ force: true }); return; }
    if (act === 'quote-mode') { state.settings.quoteMode = state.settings.quoteMode === 'cycle' ? 'random' : 'cycle'; markDirty(); render({ force: true }); return; }
    if (act === 'toggle-path') { const path = t.dataset.path.split('.'); let obj = state.settings; for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]]; obj[path[path.length - 1]] = !obj[path[path.length - 1]]; markDirty(); render({ force: true }); return; }
    if (act === 'ps-swap') { state.settings.psConfirmSwap = !state.settings.psConfirmSwap; markDirty(); render({ force: true }); return; }
    if (act === 'save-now') { const r = persist('manual'); toast(r.ok ? 'Saved.' : 'Save error.'); return; }
    if (act === 'restore-snap') {
      const snap = state.snapshots[state.snapshots.length - 1];
      if (!snap || !snap.session) { toast('No snapshot yet.'); return; }
      state.currentSession = SIC.clone(snap.session); if (snap.day) state.activeDay = snap.day; toast('Session snapshot restored.'); markDirty(); render({ force: true }); return;
    }
    if (act === 'clear-data') { ui.overlay = 'clear'; render({ force: true }); return; }
    if (act === 'clear-go') { clearData(); return; }
    if (act === 'use-routine') { state.activeRoutineId = t.dataset.id; state.activeDay = SIC.autoDay(state.routines[state.activeRoutineId]); state.settings.activeDay = state.activeDay; state.focus = null; markDirty(); render({ force: true }); return; }
    if (act === 'share-routine') { shareRoutine(t.dataset.id); return; }
    if (act === 'xml-export' || act === 'xml-one') { exportXml(t.dataset.kind || 'routines', t.dataset.id); return; }
    if (act === 'xml-file') {
      ui.xmlKind = t.dataset.kind || 'bundle';
      const n = native();
      if (n && n.importXml) { n.importXml(ui.xmlKind); return; }
      const input = $('xml-file'); if (input) input.click(); return;
    }
    if (act === 'xml-apply') { applyXml(t.dataset.mode); return; }
    if (act === 'add-ask') { const name = ($('add-name') && $('add-name').value || '').trim(); if (!name) return; ui.pendingName = name; ui.overlay = 'add'; render({ force: true }); return; }
    if (act === 'add-go') { SIC.addExercise(state, { name: ui.pendingName }, t.dataset.mode, ids); ui.overlay = null; markDirty(); render({ force: true }); return; }
    if (act === 'remove-ask') { ui.removeId = t.dataset.ex; ui.overlay = 'remove'; render({ force: true }); return; }
    if (act === 'remove-go') { SIC.removeExercise(state, ui.removeId, t.dataset.mode, { confirmed: true }); ui.overlay = null; markDirty(); render({ force: true }); return; }
    if (act === 'cycle-ex') { cycleEx(Number(t.dataset.dir) || 1); return; }
    if (act === 'rest-start') { const p = t.dataset.partner || partner(); const dur = state.rest[p].duration || 240; state.rest[p].total = dur; state.rest[p].endAt = Date.now() + dur * 1000; runtime.restAlive[p] = true; markDirty(); render({ force: true }); return; }
    if (act === 'rest-stop') { const p = t.dataset.partner || partner(); state.rest[p].endAt = 0; runtime.restAlive[p] = false; syncMetro(); markDirty(); render({ force: true }); return; }
    if (act === 'rest-toggle') { state.settings.restEnabled = state.settings.restEnabled === false; if (state.settings.restEnabled === false) { state.rest.batman.endAt = 0; state.rest.robin.endAt = 0; } markDirty(); render({ force: true }); return; }
    if (act === 'rest-dur') { state.rest[t.dataset.partner].duration = Number(t.dataset.sec); markDirty(); render({ force: true }); return; }
    if (act === 'rest-nudge') { const p = partner(); const rem = SIC.restRemaining(state, p, Date.now()); const next = Math.max(0, rem + Number(t.dataset.sec)); state.rest[p].endAt = next ? Date.now() + next * 1000 : 0; state.rest[p].total = Math.max(state.rest[p].total || 0, next); markDirty(); render({ force: true }); return; }
    if (act === 'tempo-toggle') { state.settings.tempo.running = !state.settings.tempo.running; if (!state.settings.tempo.running) stopAudio(); else { userSound = true; syncMetro(); } markDirty(); render({ force: true }); return; }
    if (act === 'sound-test') { userSound = true; playEvent(t.dataset.ev); return; }
    if (act === 'hist-view') { ui.historyView = t.dataset.view; render({ force: true }); return; }
    if (act === 'hist-reverse') { ui.historyReverse = !ui.historyReverse; render({ force: true }); return; }
    if (act === 'hist-muscle') { ui.historyMuscle = t.dataset.muscle; render({ force: true }); return; }
    if (act === 'hist-open') { ui.historyOpen[t.dataset.id] = !ui.historyOpen[t.dataset.id]; render({ force: true }); return; }
    if (act === 'hist-edit') { ui.editId = t.dataset.id; ui.overlay = 'history-edit'; render({ force: true }); return; }
    if (act === 'hist-save') { saveHistory(); return; }
    if (act === 'hist-del') {
      ui.dialog = { title: 'Delete workout?', message: 'Records are recalculated from the workouts that remain.', ok: 'Delete', resolve: function (yes) { if (!yes) return; state.history = state.history.filter(function (h) { return h.id !== t.dataset.id; }); state.personalRecords = SIC.recalcPRs(state.history); markDirty(); } };
      render({ force: true }); return;
    }
    if (act === 'builder-open') { ui.builder = { name: '', days: [{ name: 'Day 1', exercises: [''] }] }; openOverlay('builder'); return; }
    if (act === 'builder-day') { ui.builder.days.push({ name: 'Day', exercises: [''] }); render({ force: true }); return; }
    if (act === 'builder-ex-add') { ui.builder.days[Number(t.dataset.i)].exercises.push(''); render({ force: true }); return; }
    if (act === 'builder-save') { saveBuilder(); return; }
    if (act === 'share-import') { importShare(); return; }
    if (act === 'bug-save' || act === 'bug-share' || act === 'bug-copy') {
      const payload = rememberBug($('bug-text') ? $('bug-text').value : '', $('bug-contact') ? $('bug-contact').value : '');
      if (!payload) return;
      const note = $('bug-result');
      const text = reportPlain(payload);
      if (act === 'bug-save') { if (note) note.textContent = 'Saved on this device. Online bug reporting is coming soon.'; toast('Saved on this device.'); return; }
      if (act === 'bug-copy') { copyText(text).then(function (ok) { const el = $('bug-result'); if (el) el.textContent = ok ? 'Copied. Online bug reporting is coming soon. Share this report with the developer.' : 'Saved on this device. Copy was not available.'; toast(ok ? 'Copied.' : 'Saved on this device.'); }); return; }
      shareReport(text).then(function (how) { const el = $('bug-result'); if (el) el.textContent = how === 'shared' ? 'Share sheet opened. Online bug reporting is coming soon.' : how === 'copied' ? 'Copied. Online bug reporting is coming soon. Share this report with the developer.' : how === 'cancelled' ? 'Saved on this device.' : 'Saved on this device.'; });
      return;
    }
    if (act === 'bug-submit') { if (CFG.bugReportEnabled === true) submitBug($('bug-text') ? $('bug-text').value : '', $('bug-contact') ? $('bug-contact').value : ''); return; }
    if (act === 'sneak') { ui.overlay = 'sneak'; render({ force: true }); return; }
    if (act === 'notify-permission') { if (window.Notification && Notification.requestPermission) Notification.requestPermission(); else toast('This browser has no notification API.'); return; }
    if (act === 'folder') { chooseFolder(t.dataset.kind); return; }
    if (act === 'folder-reset') { runtime.handles = {}; ui.folderStatus = { routines: 'Downloads only.', history: 'Downloads only.', backups: 'Downloads only.' }; render({ force: true }); return; }
    if (act === 'skin-reset') { state.skinOverrides = {}; markDirty(); render({ force: true }); return; }
    if (act === 'profile') { switchProfile(t.dataset.id); return; }
    if (act === 'dialog-yes' || act === 'dialog-no') { const d = ui.dialog; ui.dialog = null; render({ force: true }); if (d && d.resolve) d.resolve(act === 'dialog-yes', $('dialog-input') && $('dialog-input').value); return; }
    if (act === 'pip') { openPip(); return; }
    if (act === 'overlay-perm') { if (native() && native().requestOverlay) native().requestOverlay(); return; }
    if (act === 'overlay-show') { if (native() && native().showOverlay) native().showOverlay(); return; }
    if (act === 'overlay-hide') { ui.miniOpen = false; if (native() && native().hideOverlay) native().hideOverlay(); render({ force: true }); return; }
  }
  function onInput(e) {
    const t = e.target;
    if (!t.dataset) return;
    if (t.dataset.act === 'field') {
      SIC.updateSetField(state, t.dataset.ex, t.dataset.set, t.dataset.field, t.value, partner());
      markDirty(); return;
    }
    if (t.dataset.act === 'day' || (t.dataset.act == null && t.id === undefined && t.tagName === 'SELECT' && t.parentElement && t.parentElement.classList.contains('routine-bar'))) return;
    if (t.dataset.act === 'settings-search') { ui.query = t.value; if (t.value.trim()) ui.settingsCat = null; const pos = t.selectionStart; render({ force: true }); const again = document.querySelector('[data-act="settings-search"]'); if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (err) {} } return; }
    if (t.dataset.act === 'opacity') { state.settings.panelOpacity = SIC.clampOpacity(t.value, 0.6); markDirty(); applyChrome(); return; }
    if (t.dataset.act === 'step') { state.settings.weightStep = Number(t.value) || 2.5; markDirty(); return; }
    if (t.dataset.act === 'units') { state.settings.units = t.value === 'kg' ? 'kg' : 'lb'; markDirty(); render({ force: true }); return; }
    if (t.dataset.act === 'fx') { state.fx.type = t.value; markDirty(); applyChrome(); return; }
    if (t.dataset.act === 'pname') { state.partnerNames[t.dataset.partner] = t.value.slice(0, 16); markDirty(); return; }
    if (t.dataset.act === 'calc') { if (t.id === 'calc-w') ui.calc.weight = t.value; if (t.id === 'calc-r') ui.calc.reps = t.value; updateCalc(); return; }
    if (t.dataset.act === 'cross') { if (!state.duoMode && Number(t.value) > 50) state.duoMode = true; state.activePartner = Number(t.value) >= 50 ? 'robin' : 'batman'; markDirty(); return; }
    if (t.dataset.act === 'tempo') { state.settings.tempo[partner()][t.dataset.part] = Math.max(0, Math.min(10, parseInt(t.value, 10) || 0)); markDirty(); return; }
    if (t.dataset.act === 'sound-repeats') { state.settings.sounds[t.dataset.ev].repeats = Number(t.value) || 1; markDirty(); return; }
    if (t.dataset.act === 'sound-vol') { state.settings.sounds[t.dataset.ev].volume = Number(t.value); markDirty(); return; }
    if (t.dataset.act === 'sound-inst') { state.settings.sounds[t.dataset.ev].instrument = t.value; markDirty(); return; }
    if (t.dataset.act === 'sound-on') { state.settings.sounds[t.dataset.ev].on = t.checked; markDirty(); return; }
    if (t.dataset.act === 'bug-diag') { ui.bugPreview = t.checked; render({ force: true }); return; }
    if (t.dataset.act === 'bug-endpoint') {
      const next = t.value.trim();
      if (next !== (state.settings.bugEndpoint || '')) { state.settings.bugVerified = false; runtime.bugVerified = false; }
      state.settings.bugEndpoint = next;
      markDirty(); return;
    }
    if (t.dataset.act === 'manual-time') { state.settings.notifications.manualTime = t.value; markDirty(); return; }
    if (t.dataset.act === 'quiet') { state.settings.quietHours[t.dataset.which] = t.value; markDirty(); return; }
    if (t.dataset.act === 'timer-scale') { state.settings.timer.scale = Number(t.value); markDirty(); applyChrome(); return; }
    if (t.dataset.act === 'metro-scale') { state.settings.metronome.scale = Number(t.value); markDirty(); applyChrome(); return; }
    if (t.dataset.act === 'scale') { state.settings.textScale = Number(t.value); document.documentElement.style.fontSize = (16 * Number(t.value)) + 'px'; markDirty(); return; }
    if (t.dataset.act === 'sound-volume') { state.settings.soundVolume = Math.max(0, Math.min(1, Number(t.value))); markDirty(); return; }
    if (t.dataset.act === 'rest-seconds') { state.settings.restSeconds = Math.max(0, Math.min(600, Number(t.value) || 0)); markDirty(); return; }
    if (t.dataset.act === 'builder-name') { ui.builder.days[Number(t.dataset.i)].name = t.value; return; }
    if (t.dataset.act === 'builder-ex') { ui.builder.days[Number(t.dataset.i)].exercises[Number(t.dataset.j)] = t.value; return; }
  }
  function onChange(e) {
    const t = e.target;
    if (t && t.dataset && t.dataset.act === 'day') { state.activeDay = t.value; state.settings.activeDay = t.value; state.focus = null; markDirty(); render({ force: true }); return; }
    if (t && t.id === 'xml-file' && t.files && t.files[0]) {
      const reader = new FileReader();
      reader.onload = function () { previewXml(String(reader.result || '')); };
      reader.readAsText(t.files[0]); t.value = '';
    }
    if (t && t.id === 'skin-file' && t.files && t.files[0]) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const pack = JSON.parse(String(reader.result || ''));
          const res = SIC.validateCommunityPack(pack);
          if (!res.ok) { toast('Skin rejected: ' + res.errors.join(', ')); return; }
          state.communitySkins = (state.communitySkins || []).filter(function (s) { return s.slug !== res.pack.slug; }).concat([res.pack]);
          toast('Skin installed: ' + res.pack.name); markDirty(); render({ force: true });
        } catch (err) { toast('That file is not a skin pack.'); }
      };
      reader.readAsText(t.files[0]); t.value = '';
    }
    onInput(e);
  }

  function cycleEx(dir) {
    const list = SIC.visibleExercises(state);
    if (!list.length) return;
    let idx = list.findIndex(function (item) { return state.focus && item.exercise.id === state.focus.exerciseId; });
    if (idx < 0) idx = 0;
    idx = (idx + dir + list.length) % list.length;
    const ex = list[idx].exercise;
    const data = SIC.ensureExerciseSession(state, ex, ids);
    const open = data.sets.find(function (s) { return !SIC.setDone(s, partner()); }) || data.sets[0];
    state.focus = { exerciseId: ex.id, setId: open && open.id };
    render({ force: true });
  }
  function shareRoutine(id) {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(state.routines[id]))));
    copyText(code).then(function (ok) {
      ui.dialog = { title: ok ? 'Copied' : 'Copy failed', message: ok ? 'Routine share code copied.' : 'Clipboard did not accept the code. Select it below.', input: !ok, value: ok ? '' : code, ok: 'OK', resolve: function () {} };
      render({ force: true });
    });
  }
  function importShare() {
    const raw = $('share-code') ? $('share-code').value : '';
    let obj;
    try { obj = JSON.parse(decodeURIComponent(escape(atob(raw.trim())))); } catch (e) { toast('Invalid code.'); return; }
    const valid = SIC.validateRoutineObject(obj);
    if (!valid.ok) { toast('Invalid code: ' + valid.errors.join(', ')); return; }
    const id = ids('custom');
    const routine = valid.routine; routine.id = id;
    SIC.ensureExerciseSession && null;
    state.routines[id] = routine;
    const ensure = SIC.createIds(3);
    Object.keys(routine.days).forEach(function (day) { routine.days[day].forEach(function (ex) { if (!ex.id) ex.id = ensure('ex'); (ex.sets || []).forEach(function (s) { if (!s.id) s.id = ensure('set'); }); }); });
    ui.overlay = null; toast('Routine imported.'); markDirty(); render({ force: true });
  }
  function exportXml(kind, onlyId) {
    const source = onlyId ? { routines: {}, history: state.history, settings: state.settings } : state;
    if (onlyId) source.routines[onlyId] = state.routines[onlyId];
    const xml = SIC.exportXml(source, onlyId ? 'routines' : (kind || 'bundle'), { now: Date.now(), units: state.settings.units });
    const name = 'sic-' + (onlyId || kind || 'bundle') + '.xml';
    writeFolder(kind === 'history' ? 'history' : 'routines', name, xml);
    toast('XML ready.');
  }
  function previewXml(xml) {
    const parsed = SIC.importXml(xml);
    if (!parsed.ok) { toast('XML rejected: ' + (parsed.errors || []).join(', ')); return; }
    ui.xmlDoc = parsed.doc;
    ui.xmlPreview = SIC.previewImport(state, parsed.doc);
    ui.overlay = 'xml';
    render({ force: true });
  }
  function applyXml(mode) {
    if (!ui.xmlDoc) return;
    const res = SIC.applyImport(state, ui.xmlDoc, mode);
    state.snapshots = SIC.pushSnapshot(state.snapshots, { at: Date.now(), reason: 'import', backup: true, session: res.backup.currentSession }, 5);
    ui.overlay = null; toast(mode === 'replace' ? 'Import replaced that data.' : 'Import merged new records.'); markDirty(); render({ force: true });
  }
  function saveHistory() {
    const rec = state.history.find(function (h) { return h.id === ui.editId; });
    if (!rec) return;
    const when = $('hist-when');
    if (when && when.value) { const d = new Date(when.value); if (!isNaN(d.getTime())) { rec.ts = d.getTime(); rec.iso = SIC.formatIsoOffset(d); rec.date = d.toLocaleDateString(); } }
    document.querySelectorAll('[data-hist="name"]').forEach(function (el) { rec.exercises[Number(el.dataset.i)].exercise = el.value; });
    document.querySelectorAll('[data-hist="partner"]').forEach(function (el) { rec.exercises[Number(el.dataset.i)].partner = el.value === 'robin' ? 'robin' : 'batman'; });
    document.querySelectorAll('[data-hist="muscle"]').forEach(function (el) { rec.exercises[Number(el.dataset.i)].muscle = el.value; });
    document.querySelectorAll('[data-hist="type"]').forEach(function (el) { rec.exercises[Number(el.dataset.i)].sets[Number(el.dataset.j)].type = el.value; });
    document.querySelectorAll('[data-hist="weight"]').forEach(function (el) { rec.exercises[Number(el.dataset.i)].sets[Number(el.dataset.j)].weight = el.value; });
    document.querySelectorAll('[data-hist="reps"]').forEach(function (el) { rec.exercises[Number(el.dataset.i)].sets[Number(el.dataset.j)].reps = el.value; });
    state.personalRecords = SIC.recalcPRs(state.history);
    ui.overlay = null; toast('History updated. Records recalculated.'); markDirty(); render({ force: true });
  }
  function saveBuilder() {
    const name = ($('builder-name') && $('builder-name').value || '').trim();
    if (!name || !ui.builder) { toast('Name the routine first.'); return; }
    const days = {};
    ui.builder.days.forEach(function (d) {
      const label = d.name || 'Day';
      days[label] = d.exercises.filter(Boolean).map(function (exName) {
        const known = DATA.exerciseDatabase.find(function (e) { return e.name.toLowerCase() === exName.toLowerCase(); });
        return { id: ids('ex'), name: known ? known.name : exName, target: '4-6 Reps', muscle: known ? known.muscle : 'OTHER', sets: [{ id: ids('set'), type: 'Normal', weight: '', reps: '', p2Weight: '', p2Reps: '' }] };
      });
    });
    const id = ids('routine');
    state.routines[id] = { id: id, name: name, days: days };
    ui.overlay = null; toast('Routine saved.'); markDirty(); render({ force: true });
  }
  function clearData() {
    const dump = {};
    for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (SIC.isSicKey(k)) dump[k] = storage.getItem(k); }
    download('sic-backup-' + Date.now() + '.json', JSON.stringify(dump, null, 2), 'application/json');
    SIC.keysToClear(Object.keys(dump)).forEach(function (k) { storage.removeItem(k); });
    toast('SIC data cleared.');
    setTimeout(function () { location.reload(); }, 400);
  }
  function switchProfile(id) {
    if (!state.profiles.users[id] || id === state.profiles.activeId) return;
    state.profileVault[state.profiles.activeId] = SIC.snapshotWorkout(state);
    state.profiles.activeId = id;
    if (state.profileVault[id]) {
      const slice = state.profileVault[id];
      ['routines', 'history', 'currentSession', 'personalRecords', 'activeRoutineId', 'activeDay', 'duoMode', 'activePartner', 'partnerNames', 'rest'].forEach(function (k) { if (slice[k] !== undefined) state[k] = SIC.clone(slice[k]); });
    }
    toast('Profile switched.'); markDirty(); render({ force: true });
  }
  function runCommand(line) {
    const parsed = SIC.parseCommand(line);
    if (parsed.cmd === 'unknown' && line.trim()) { ui.console.push('Unknown command.'); return; }
    const res = SIC.applyCommand(state, parsed, { id: ids, now: Date.now(), confirmed: false });
    if (res.message) ui.console.push(res.message);
    if (parsed.cmd === 'deleteuser' && res.reason === 'confirm') {
      ui.dialog = { title: 'Delete profile?', message: res.message + ' A backup is kept in the result.', ok: 'Delete', resolve: function (yes) { if (!yes) return; const done = SIC.applyCommand(state, parsed, { confirmed: true }); ui.console.push(done.message || ''); if (done.backup) download('sic-profile-backup.json', JSON.stringify(done.backup), 'application/json'); markDirty(); } };
      return;
    }
    (res.actions || []).forEach(function (a) {
      if (a === 'save') persist('command');
      if (a === 'exit') { persist('exit'); ui.console.push(platformName() === 'android' && native() && native().exitApp ? 'Closing.' : 'saved, safe to close'); if (native() && native().exitApp && platformName() === 'android') native().exitApp(); }
      if (a === 'restart') { persist('restart'); location.reload(); }
      if (a === 'clear-console') ui.console = [];
      if (a === 'confirm-finish') ui.overlay = 'finish';
      if (a === 'open-bug') { ui.overlay = 'bug'; setTimeout(function () { const box = $('bug-text'); if (box) box.value = res.text || ''; }, 0); }
      if (a === 'render') render({ force: true });
    });
    markDirty();
  }
  async function openPip() {
    if (!window.documentPictureInPicture) { toast('Document Picture-in-Picture is not in this browser. The in-page mini still works.'); return; }
    ui.miniOpen = true; render({ force: true });
    const pip = await documentPictureInPicture.requestWindow({ width: 280, height: 420 });
    const link = pip.document.createElement('link');
    link.rel = 'stylesheet'; link.href = new URL('css/sic.css', location.href).href;
    pip.document.head.appendChild(link);
    pip.document.body.appendChild($('mini-root'));
    pip.addEventListener('pagehide', function () { document.body.appendChild($('mini-root')); });
  }

  function typingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable || el.dataset.console === '1';
  }
  function onKey(e) {
    const buttonCodes = { 96: 0, 97: 1, 99: 2, 100: 3, 102: 4, 103: 5, 104: 6, 105: 7, 108: 9, 109: 8, 19: 12, 20: 13, 21: 14, 22: 15 };
    if (buttonCodes[e.keyCode] != null) { ui.padOn = true; ui.padFamily = ui.padFamily || 'generic'; pressPad(buttonCodes[e.keyCode]); e.preventDefault(); return; }
    if (e.key === '`' && (e.ctrlKey || e.metaKey)) { openOverlay('console'); e.preventDefault(); return; }
    if (e.target && e.target.id === 'console-input' && e.key === 'Enter') { runCommand(e.target.value); e.target.value = ''; render({ force: true }); e.preventDefault(); return; }
    const meta = { typing: typingTarget(e.target), consoleFocused: !!(e.target && e.target.dataset && e.target.dataset.console === '1') };
    if (!SIC.shortcutsAllowed(meta)) return;
    state.settings.lastInput = 'keyboard';
    const chord = (e.ctrlKey ? 'Ctrl+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.metaKey ? 'Meta+' : '') + e.key;
    const codeChord = (e.ctrlKey ? 'Ctrl+' : '') + (e.shiftKey ? 'Shift+' : '') + e.code;
    if (codeChord === 'Ctrl+Shift+KeyF' || chord === 'Ctrl+Shift+F') { ui.overlay = 'finish'; render({ force: true }); e.preventDefault(); return; }
    const m = map();
    function hit(action, token) { return (m[action] || []).indexOf(token) >= 0; }
    if (hit('logSet', 'Space') && e.code === 'Space') { logSet(); e.preventDefault(); return; }
    if (hit('toggleMini', e.code) || e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey && hit('toggleMini', 'KeyM')) { ui.miniOpen = !ui.miniOpen; render({ force: true }); e.preventDefault(); return; }
    if (e.key === 'Escape' && hit('back', 'Escape')) { if (ui.overlay) { ui.overlay = null; render({ force: true }); } else if (ui.pop) { ui.pop = null; render({ force: true }); } e.preventDefault(); return; }
    if ((e.key === 's' || e.key === 'S') && hit('manageSets', 'KeyS')) { const cur = SIC.findCurrent(state); if (cur) { ui.pop = cur.exercise.id; render({ force: true }); } e.preventDefault(); return; }
    const cur = SIC.findCurrent(state);
    if (!cur) return;
    if (e.key === '[' || e.key === ']') { SIC.nudgeSet(state, cur.exercise.id, cur.set.id, 'weight', e.key === ']' ? 1 : -1, partner()); markDirty(); render({ force: true }); e.preventDefault(); }
    if (e.key === '-' || e.key === '=') { SIC.nudgeSet(state, cur.exercise.id, cur.set.id, 'reps', e.key === '=' ? 1 : -1, partner()); markDirty(); render({ force: true }); e.preventDefault(); }
    if (e.key === 'Enter') { const btn = document.querySelector('[data-focus="1"]:focus'); if (btn && btn.dataset.act) return; }
  }
  let padWas = [];
  let hold = null;
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && pads[0];
    if (!pad) return;
    if (!document.hasFocus()) { requestAnimationFrame(pollPad); return; }
    const buttons = pad.buttons.map(function (b) { return b.pressed; });
    const name = /xbox|045e/i.test(pad.id) ? 'xbox' : /054c|wireless controller|dual/i.test(pad.id) ? 'playstation' : (state.settings.lastInput === 'playstation' || state.settings.lastInput === 'xbox' ? state.settings.lastInput : 'xbox');
    const labels = ['GamepadA', 'GamepadB', 'GamepadX', 'GamepadY', 'GamepadLB', 'GamepadRB', 'GamepadLT', 'GamepadRT', 'GamepadView', 'GamepadMenu', 'GamepadL3', 'GamepadR3', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'];
    ui.padOn = true;
    ui.padFamily = /xbox|045e/i.test(pad.id) ? 'xbox' : /054c|dual|playstation|wireless controller/i.test(pad.id) ? 'playstation' : /057e|nintendo|switch/i.test(pad.id) ? 'switch' : 'generic';
    buttons.forEach(function (down, i) {
      const was = padWas[i];
      if (down && !was) {
        state.settings.lastInput = ui.padFamily === 'playstation' ? 'playstation' : 'xbox';
        ui.testInput = ui.padFamily + ' ' + (labels[i] || i);
        pressPad(i);
      }
    });
    if (hold && hold.kind === 'menu' && Date.now() - hold.at > 2000) { hold = null; ui.overlay = 'finish'; render({ force: true }); }
    const dirs = { weightDown: buttons[4], weightUp: buttons[5], repsDown: buttons[6], repsUp: buttons[7] };
    Object.keys(dirs).forEach(function (action) {
      if (!dirs[action] || !SIC.isHoldRepeatAction(action)) return;
      if (!hold || hold.kind !== action) hold = { kind: action, at: Date.now(), next: Date.now() + 400 };
      else if (Date.now() > hold.next) { hold.next = Date.now() + 80; nudgeAction(action); }
    });
    padWas = buttons;
  }
  function movePad(dir) {
    const nodes = Array.prototype.slice.call(document.querySelectorAll('[data-pad="1"]')).filter(function (el) { return el.getBoundingClientRect().width > 0; });
    if (!nodes.length) return;
    ui.padIndex = ((ui.padIndex || 0) + dir + nodes.length) % nodes.length;
    nodes.forEach(function (el, i) { el.classList.toggle('is-pad', i === ui.padIndex); });
    try { nodes[ui.padIndex].focus(); } catch (e) {}
  }
  function pressPad(i) {
    const fam = ui.padFamily || 'generic';
    const confirm = fam === 'switch' ? 1 : 0;
    const back = fam === 'switch' ? 0 : 1;
    const partnerBtn = fam === 'switch' ? 3 : 2;
    const skip = fam === 'switch' ? 2 : 3;
    if (i === confirm) logSet();
    else if (i === back) { if (window.SICApp) window.SICApp.onHardwareBack(); }
    else if (i === partnerBtn) { const next = partner() === 'batman' ? 'robin' : 'batman'; if (!state.duoMode) state.duoMode = true; state.activePartner = next; ui.flipped = true; playEvent('duoFlip'); markDirty(); render({ force: true }); }
    else if (i === skip) { const p = partner(); state.rest[p].endAt = 0; runtime.restAlive[p] = false; markDirty(); render({ force: true }); }
    else if (i === 9) { ui.overlay = 'settings'; render({ force: true }); }
    else if (i === 8) { ui.miniOpen = !ui.miniOpen; render({ force: true }); }
    else if (i === 4) { cycleEx(-1); }
    else if (i === 5) { cycleEx(1); }
    else if (i === 6) nudgeAction('weightDown');
    else if (i === 7) nudgeAction('weightUp');
    else if (i === 12 || i === 14) movePad(-1);
    else if (i === 13 || i === 15) movePad(1);
    document.body.classList.add('show-pad');
  }
  function nameIsPs() { return state.settings.lastInput === 'playstation'; }
  function nudgeAction(action) {
    const cur = SIC.findCurrent(state); if (!cur) return;
    const field = action.indexOf('weight') === 0 ? 'weight' : 'reps';
    const dir = /Up$/.test(action) ? 1 : -1;
    SIC.nudgeSet(state, cur.exercise.id, cur.set.id, field, dir, partner());
    markDirty(); render({ force: true });
  }

  let drag = null;
  function onPointerDown(e) {
    if (e.target.closest && e.target.closest('button, input, a, select, textarea')) return;
    const dragHandle = e.target.closest && e.target.closest('[data-drag]');
    if (!dragHandle) return;
    const mini = $('mini-root');
    const rect = mini.getBoundingClientRect();
    drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    mini.setPointerCapture && mini.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!drag) return;
    const mini = $('mini-root');
    const x = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - drag.dx));
    const y = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - drag.dy));
    mini.style.left = x + 'px'; mini.style.top = y + 'px'; ui.miniPos = { x: x, y: y };
  }
  function onPointerUp() { drag = null; }

  window.SICApp = {
    onNativeResult: function (raw) {
      let msg = raw;
      try { msg = JSON.parse(raw); } catch (e) {}
      if (!msg || !msg.type) return;
      if (msg.type === 'folder') { ui.folderStatus[msg.kind] = msg.ok ? ('System folder granted for ' + msg.kind) : 'Folder permission was not granted. Local copy kept.'; render({ force: true }); }
      if (msg.type === 'import') previewXml(msg.text || '');
      if (msg.type === 'overlay') { ui.folderStatus.overlay = msg.ok ? 'Overlay permission granted. Hardware pass-through was not certified in this build.' : 'Overlay permission is off.'; }
    },
    state: function () { return state; },
    onHardwareBack: function () {
      if (ui.overlay || ui.pop || ui.dialog) { ui.overlay = null; ui.pop = null; ui.dialog = null; render({ force: true }); return; }
      if (ui.miniOpen && ui.miniWide) { ui.miniWide = false; render({ force: true }); return; }
      if (ui.tab !== 'log') { ui.tab = 'log'; render({ force: true }); return; }
      ui.overlay = 'settings';
      render({ force: true });
    }
  };

  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', function (e) {
    userSound = true;
    const touch = e.pointerType === 'touch' || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    if (state.settings.lastInput !== 'keyboard' && state.settings.lastInput !== 'xbox' && state.settings.lastInput !== 'playstation') {
      state.settings.lastInput = touch ? 'touch' : 'mouse';
    }
  }, { capture: true });
  let holdSettings = null;
  function holdTarget(e) { return e.target.closest && e.target.closest('h1, .ss-titles, .who-btn, .mini-who'); }
  document.addEventListener('pointerdown', function (e) {
    if (!holdTarget(e)) return;
    clearTimeout(holdSettings);
    holdSettings = setTimeout(function () { ui.overlay = 'settings'; render({ force: true }); }, 550);
  }, true);
  document.addEventListener('pointerup', function () { clearTimeout(holdSettings); }, true);
  document.addEventListener('pointercancel', function () { clearTimeout(holdSettings); }, true);
  document.addEventListener('pointermove', function (e) { if (e.buttons === 0) return; clearTimeout(holdSettings); }, true);
  document.addEventListener('contextmenu', function (e) {
    if (!holdTarget(e)) return;
    e.preventDefault();
    ui.overlay = 'settings';
    render({ force: true });
  });
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  $('settings-anchor').addEventListener('click', function () { openOverlay('settings'); });
  window.addEventListener('beforeunload', function (e) { if (runtime.dirty && !state.settings.autosave) { e.preventDefault(); e.returnValue = ''; } });

  bootState();
  if (params.get('overlay') === '1') { document.body.classList.add('overlay-only'); ui.miniOpen = true; }
  runtime.rev = storage.getItem('ss_rev') || '';
  if (window.SICFx) window.SICFx.init();
  applyChrome();
  render({ force: true });
  paintSave(demo ? 'saved' : 'saved');
  setInterval(tick, 250);
  setInterval(function () {
    let rev = '';
    try { rev = storage.getItem('ss_rev') || ''; } catch (e) { return; }
    if (!rev || rev === runtime.rev) return;
    if (document.activeElement && document.activeElement.dataset && document.activeElement.dataset.lockrender === '1') return;
    runtime.rev = rev;
    if (params.get('overlay') === '1' || document.hidden) location.reload();
  }, 1200);
  window.addEventListener('gamepadconnected', function () {
    state.settings.lastInput = 'xbox';
    if (!runtime.padTimer) runtime.padTimer = setInterval(pollPad, 200);
  });
  if (params.get('pip') === '1') setTimeout(openPip, 300);
})();
