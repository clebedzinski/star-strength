/* SIC pure logic. No DOM. Workout data behavior, migration, XML, skins, console. */
(function (root, factory) {
  let data = root && root.SICData;
  if (!data && typeof require === 'function') data = require('./sic-data.js');
  const api = factory(data);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SIC = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (DATA) {
  const LEGACY_KEYS = [
    'ss_routines', 'ss_history', 'ss_current_session', 'ss_prs', 'ss_custom_themes',
    'ss_duo_mode', 'ss_partner_names', 'ss_active_theme_id', 'ss_sound', 'ss_fx', 'ss_rest'
  ];
  const APP_KEYS = LEGACY_KEYS.concat([
    'ss_active_routine_id', 'ss_settings', 'ss_skin', 'ss_skin_overrides', 'ss_community_skins',
    'ss_profiles', 'ss_profile_vault', 'ss_snapshots', 'ss_bug_queue', 'ss_schema_version',
    'ss_migration_v1', 'ss_seen_version', 'ss_input_map', 'ss_bug_last'
  ]);
  const SKIN_SLUGS = ['starclassic', 'pixelforecast', 'irondial', 'chalkboard', 'scoreboard', 'transitline', 'vinyldeck', 'hexhive'];
  const LAYOUTS = SKIN_SLUGS.slice();
  const MINI_SHAPES = { starclassic: 'card', pixelforecast: 'stepped-l', irondial: 'puck', chalkboard: 'rail', scoreboard: 'ticket', transitline: 'capsule', vinyldeck: 'cassette', hexhive: 'flower' };
  const POPOUTS = { starclassic: 'sheet', pixelforecast: 'window', irondial: 'arc', chalkboard: 'sticky', scoreboard: 'ticket', transitline: 'board', vinyldeck: 'drawer', hexhive: 'cell' };
  const MUSCLE_FILTERS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core', 'other'];
  const MUSCLE_FROM_TAG = { CHEST: 'chest', BACK: 'back', SHOULDERS: 'shoulders', BICEPS: 'biceps', TRICEPS: 'triceps', QUADS: 'quads', HAMSTRINGS: 'hamstrings', GLUTES: 'glutes', CALVES: 'calves', CORE: 'core', OTHER: 'other' };
  const SET_TYPES = ['Normal', 'Warmup', 'Drop', 'Failure'];
  const BUG_MAX = 4096;
  const SCHEMA = 1;
  const ORIGINAL_LINES = [
    { id: 'original-big-dawg', text: "Rest is complete! Time for your next set, big dawg!" },
    { id: 'original-next', text: 'Rest is over. Next set.' },
    { id: 'original-bar', text: "Clock's done. Back under the bar." },
    { id: 'original-ready', text: "That's the rest. Log the next one when you're ready." }
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function createIds(start) {
    let n = start || 1;
    return function id(prefix) { n += 1; return String(prefix || 'id') + '_' + n.toString(36); };
  }
  function pad(n, l) { return String(Math.abs(n)).padStart(l || 2, '0'); }
  function formatIsoOffset(date) {
    const d = date instanceof Date ? date : new Date(date);
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + sign + pad(Math.floor(Math.abs(off) / 60)) + ':' + pad(Math.abs(off) % 60);
  }
  function decodeStored(raw) {
    if (raw == null) return undefined;
    try { return JSON.parse(raw); } catch (e) { return raw; }
  }
  function isSicKey(key) { return typeof key === 'string' && key.indexOf('ss_') === 0; }
  function keysToClear(allKeys) { return (allKeys || []).filter(isSicKey); }

  function defaultSettings() {
    const sound = function (pattern) {
      return { on: true, pattern: pattern || 'classic', repeats: 1, tune: 'classic', instrument: 'sine', volume: 0.7 };
    };
    return {
      density: 'regular',
      motion: 'system',
      weightStep: 2.5,
      units: 'lb',
      confirmFinish: true,
      confirmDeleteLogged: true,
      duoHandoff: 'set',
      partnerParticipating: { batman: true, robin: true },
      autosave: true,
      haptics: true,
      masterMute: false,
      soundVolume: 0.7,
      soundCats: { sets: true, rest: true, pr: true, finish: true, taps: true, duo: true, errors: true },
      sounds: {
        setLog: sound('classic-blip'),
        restTick: sound('classic-click'),
        countdown: sound('classic-rest'),
        restDone: sound('classic-rest'),
        pr: sound('classic-fanfare'),
        workoutSaved: sound('classic-fanfare'),
        tap: sound('classic-click'),
        duoFlip: sound('classic-blip'),
        undo: sound('classic-undo'),
        error: sound('classic-error'),
        metronome: sound('classic-click')
      },
      timer: { scale: 1, opacity: 1, style: 'auto' },
      metronome: { scale: 1, opacity: 1, style: 'auto' },
      panelOpacity: 1,
      opacityFloor: 0.6,
      quietHours: { enabled: false, start: '22:00', end: '07:00' },
      notifications: { enabled: false, learning: true, manualTime: '', manualDays: [], countdown: true, sneakPeek: true },
      showPrompts: true,
      psConfirmSwap: false,
      lastInput: 'touch',
      quoteMode: 'cycle',
      basicMode: true,
      tempo: { batman: { e: 1, p1: 0, c: 1, p2: 1 }, robin: { e: 1, p1: 0, c: 1, p2: 1 }, running: false }
    };
  }

  function builtinSkins() {
    const pack = function (slug, name, palette, font, extra) {
      return Object.assign({
        schemaVersion: 1, slug: slug, name: name, layout: slug, mini: MINI_SHAPES[slug], popout: POPOUTS[slug],
        builtin: true, font: font, palette: palette, radius: 12, density: 'regular',
        timer: { scale: 1, opacity: 1, style: 'auto' }, metronome: { scale: 1, opacity: 1, style: 'auto' },
        effects: { weather: 'off' }
      }, extra || {});
    };
    return [
      pack('starclassic', 'Star Strength Classic', { bg: '#0B0F17', card: '#1E293B', border: '#334155', text: '#F8FAFC', accent: '#F59E0B', accent2: '#38BDF8', onAccent: '#000000', muted: '#94A3B8', surface: '#111827' }, "'Inter', system-ui, sans-serif"),
      pack('pixelforecast', 'Pixel Forecast', { bg: '#07101f', card: '#efe7c6', border: '#24160f', text: '#1a120c', accent: '#ff4fa3', accent2: '#3ee0ff', onAccent: '#1a120c', muted: '#5c4a38', surface: '#d7f3ff' }, "ui-monospace, 'Courier New', monospace", { radius: 0 }),
      pack('irondial', 'Iron Dial', { bg: '#121418', card: '#2a3038', border: '#5c656f', text: '#f4f1ea', accent: '#ff7a18', accent2: '#d6d3d1', onAccent: '#1a1008', muted: '#a8a29e', surface: '#1c2128' }, "Impact, 'Arial Narrow', system-ui, sans-serif", { radius: 999, timer: { scale: 1.15, opacity: 0.95, style: 'rim' } }),
      pack('chalkboard', 'Chalk Board', { bg: '#f6f3ea', card: '#fffdf8', border: '#c9c2b2', text: '#1e293b', accent: '#1d4ed8', accent2: '#e11d48', onAccent: '#ffffff', muted: '#64748b', surface: '#fff4b8' }, "Georgia, 'Palatino Linotype', serif", { radius: 2 }),
      pack('scoreboard', 'Scoreboard', { bg: '#14080c', card: '#220d12', border: '#5c1a1a', text: '#fff4e8', accent: '#ff8a1e', accent2: '#ff2a2a', onAccent: '#1a0a00', muted: '#e7c2a4', surface: '#0c0506' }, "ui-monospace, 'SFMono-Regular', Menlo, monospace", { timer: { scale: 1.2, opacity: 1, style: 'led' } }),
      pack('transitline', 'Transit Line', { bg: '#f4efe6', card: '#fffaf3', border: '#e7d7c6', text: '#2a2118', accent: '#e4572e', accent2: '#1e293b', onAccent: '#fffaf3', muted: '#7c6a5a', surface: '#fff' }, "'Trebuchet MS', 'Segoe UI', sans-serif", { radius: 18 }),
      pack('vinyldeck', 'Vinyl Deck', { bg: '#1a120e', card: '#3a291f', border: '#6b4b34', text: '#f6efe6', accent: '#e7a05a', accent2: '#e7a0b4', onAccent: '#1a100c', muted: '#d6c4b4', surface: '#120e0c' }, "Georgia, 'Times New Roman', serif", { radius: 10 }),
      pack('hexhive', 'Hex Hive', { bg: '#1a140c', card: '#3a2a16', border: '#8a6430', text: '#fff6e4', accent: '#f0b429', accent2: '#1f8a70', onAccent: '#1a1408', muted: '#e6d3b0', surface: '#2a2116' }, "system-ui, 'Segoe UI', sans-serif", { radius: 0 })
    ];
  }

  function clampOpacity(n, floor) {
    const f = typeof floor === 'number' ? floor : 0.6;
    const x = Number(n);
    if (!Number.isFinite(x)) return 1;
    return Math.max(f, Math.min(1, x));
  }
  function hexToRgb(hex) {
    let h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function otherPartner(p) { return p === 'robin' ? 'batman' : 'robin'; }
  function activePartner(state) { return state.duoMode ? (state.activePartner || 'batman') : 'batman'; }
  function muscleKey(tag) {
    const k = MUSCLE_FROM_TAG[String(tag || '').toUpperCase()];
    return k || 'other';
  }
  function historyTs(h) {
    if (!h) return null;
    if (typeof h.ts === 'number' && !isNaN(h.ts)) return h.ts;
    if (h.iso) { const d = new Date(h.iso); if (!isNaN(d.getTime())) return d.getTime(); }
    if (h.date) { const d = parseUserDate(h.date); if (d) return d.getTime(); }
    return null;
  }
  function parseUserDate(txt) {
    const s = String(txt || '').trim();
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  function sessionKey(routineId, day, exerciseId) { return routineId + '::' + day + '::' + exerciseId; }
  function legacySessionKey(routineId, day, index) { return routineId + '_' + day + '_' + index; }
  function ensureMeta(session) {
    if (!session._meta || typeof session._meta !== 'object') session._meta = { v: 1, skipped: [], extras: [], keyedBy: '' };
    if (!Array.isArray(session._meta.skipped)) session._meta.skipped = [];
    if (!Array.isArray(session._meta.extras)) session._meta.extras = [];
    return session._meta;
  }
  function stripIds(value) {
    if (Array.isArray(value)) return value.map(stripIds);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    Object.keys(value).forEach(function (k) {
      if (k === 'id' || k === 'exerciseId') return;
      out[k] = stripIds(value[k]);
    });
    return out;
  }

  function ensureRoutineIds(routines, idFn) {
    Object.keys(routines || {}).forEach(function (rid) {
      const r = routines[rid];
      if (!r || typeof r !== 'object') return;
      if (!r.id) r.id = rid;
      Object.keys(r.days || {}).forEach(function (day) {
        (r.days[day] || []).forEach(function (ex) {
          if (!ex || typeof ex !== 'object') return;
          if (!ex.id) ex.id = idFn('ex');
          (ex.sets || []).forEach(function (s) { if (s && !s.id) s.id = idFn('set'); });
        });
      });
    });
  }

  function blankSetFromTemplate(s, idFn) {
    s = s || {};
    return {
      id: idFn('set'),
      type: SET_TYPES.indexOf(s.type) >= 0 ? s.type : 'Normal',
      weight: '', reps: '', p2Weight: '', p2Reps: '',
      hintWeight: s.weight != null ? String(s.weight) : '',
      hintReps: s.reps != null ? String(s.reps) : '',
      hintP2Weight: s.p2Weight != null ? String(s.p2Weight) : (s.weight != null ? String(s.weight) : ''),
      hintP2Reps: s.p2Reps != null ? String(s.p2Reps) : (s.reps != null ? String(s.reps) : ''),
      done: false, p2Done: false
    };
  }
  function blankSession(ex, idFn) {
    const sets = (ex.sets && ex.sets.length ? ex.sets : [{ type: 'Normal' }]).map(function (s) { return blankSetFromTemplate(s, idFn); });
    return { notes: '', sets: sets };
  }

  function muscleForExercise(name, routines, history) {
    const found = (DATA.exerciseDatabase || []).find(function (e) { return e.name === name; });
    if (found) return found.muscle;
    for (let i = 0; i < (history || []).length; i++) {
      const exs = history[i].exercises || [];
      for (let j = 0; j < exs.length; j++) if (exs[j].exercise === name && exs[j].muscle) return exs[j].muscle;
    }
    const rs = routines || {};
    const rids = Object.keys(rs);
    for (let i = 0; i < rids.length; i++) {
      const days = rs[rids[i]].days || {};
      const dks = Object.keys(days);
      for (let d = 0; d < dks.length; d++) {
        const arr = days[dks[d]] || [];
        for (let k = 0; k < arr.length; k++) if (arr[k].name === name && arr[k].muscle) return arr[k].muscle;
      }
    }
    return 'OTHER';
  }

  function backfillPR(history, partner, name, w) {
    let found = null;
    for (let i = (history || []).length - 1; i >= 0 && !found; i--) {
      const h = history[i];
      const exs = h.exercises || [];
      for (let j = 0; j < exs.length; j++) {
        const e = exs[j];
        if (e.exercise !== name || (e.partner || 'batman') !== partner) continue;
        const set = (e.sets || []).find(function (s) { return parseFloat(s.weight) === w; });
        if (set) { found = { reps: parseInt(set.reps, 10) || null, ts: historyTs(h), muscle: e.muscle }; break; }
      }
    }
    return { weight: w, reps: found ? found.reps : null, ts: found ? found.ts : null, muscle: (found && found.muscle) || 'OTHER' };
  }

  function migrate(bundle, opts) {
    opts = opts || {};
    const idFn = opts.id || createIds(1);
    const decoded = bundle && bundle.decoded ? bundle.decoded : {};
    const raw = bundle && bundle.raw ? bundle.raw : {};
    const backup = { at: opts.now || Date.now(), legacy: {} };
    LEGACY_KEYS.forEach(function (k) { if (raw[k] != null) backup.legacy[k] = raw[k]; });

    let routines = decoded.ss_routines && typeof decoded.ss_routines === 'object' ? clone(decoded.ss_routines) : clone(DATA.defaultRoutines);
    if (!routines || typeof routines !== 'object' || Array.isArray(routines) || !Object.keys(routines).length) routines = clone(DATA.defaultRoutines);
    ensureRoutineIds(routines, idFn);

    let history = Array.isArray(decoded.ss_history) ? clone(decoded.ss_history) : [];
    history.forEach(function (h) { if (h && !h.id) h.id = idFn('log'); });

    let currentSession = decoded.ss_current_session && typeof decoded.ss_current_session === 'object' && !Array.isArray(decoded.ss_current_session) ? clone(decoded.ss_current_session) : {};
    const meta = ensureMeta(currentSession);
    if (meta.keyedBy !== 'id') {
      Object.keys(routines).forEach(function (rid) {
        const days = routines[rid].days || {};
        Object.keys(days).forEach(function (day) {
          (days[day] || []).forEach(function (ex, index) {
            const oldKey = legacySessionKey(rid, day, index);
            const neu = sessionKey(rid, day, ex.id);
            if (currentSession[oldKey] && !currentSession[neu]) currentSession[neu] = currentSession[oldKey];
            if (currentSession[oldKey]) delete currentSession[oldKey];
          });
        });
      });
      meta.keyedBy = 'id';
    }
    Object.keys(currentSession).forEach(function (key) {
      if (key.charAt(0) === '_') return;
      const block = currentSession[key];
      if (!block || !Array.isArray(block.sets)) return;
      block.sets.forEach(function (s) { if (s && !s.id) s.id = idFn('set'); });
    });

    let pr = decoded.ss_prs;
    const isNew = pr && typeof pr === 'object' && (typeof pr.batman === 'object' || typeof pr.robin === 'object');
    if (!isNew) pr = { batman: (pr && typeof pr === 'object' && !Array.isArray(pr)) ? clone(pr) : {}, robin: {} };
    else pr = clone(pr);
    if (!pr.batman || typeof pr.batman !== 'object') pr.batman = {};
    if (!pr.robin || typeof pr.robin !== 'object') pr.robin = {};
    ['batman', 'robin'].forEach(function (p) {
      Object.keys(pr[p]).forEach(function (name) {
        const v = pr[p][name];
        if (typeof v === 'number' || typeof v === 'string') {
          const w = parseFloat(v) || 0;
          if (w > 0) pr[p][name] = backfillPR(history, p, name, w);
          else delete pr[p][name];
        } else if (!v || typeof v !== 'object') delete pr[p][name];
      });
    });

    let themes = decoded.ss_custom_themes && typeof decoded.ss_custom_themes === 'object' ? clone(decoded.ss_custom_themes) : clone(DATA.originalThemes);
    if (!themes || !Object.keys(themes).length) themes = clone(DATA.originalThemes);
    Object.keys(DATA.originalThemes).forEach(function (id) { if (!themes[id]) themes[id] = clone(DATA.originalThemes[id]); });

    const requestedRoutine = typeof decoded.ss_active_routine_id === 'string' ? decoded.ss_active_routine_id : '';
    let activeRoutineId = routines[requestedRoutine] ? requestedRoutine : (routines.bls5 ? 'bls5' : Object.keys(routines)[0]);
    const routine = routines[activeRoutineId];
    const dayKeys = Object.keys((routine && routine.days) || {});
    let activeDay = dayKeys[0] || '';

    const themeIdRaw = typeof decoded.ss_active_theme_id === 'string' ? decoded.ss_active_theme_id : 'midnight';
    const activeThemeId = themes[themeIdRaw] ? themeIdRaw : (themes.midnight ? 'midnight' : Object.keys(themes)[0]);

    const settings = defaultSettings();
    const storedSettings = decoded.ss_settings && typeof decoded.ss_settings === 'object' ? decoded.ss_settings : {};
    Object.keys(storedSettings).forEach(function (k) { if (k === 'sounds' || k === 'timer' || k === 'metronome' || k === 'quietHours' || k === 'notifications' || k === 'tempo' || k === 'partnerParticipating') return; settings[k] = storedSettings[k]; });
    ['sounds', 'timer', 'metronome', 'quietHours', 'notifications', 'tempo', 'partnerParticipating'].forEach(function (k) {
      if (storedSettings[k] && typeof storedSettings[k] === 'object') settings[k] = Object.assign({}, settings[k], storedSettings[k]);
    });
    if (storedSettings.sounds) settings.sounds = Object.assign({}, defaultSettings().sounds, storedSettings.sounds);
    settings.weightStep = Number(settings.weightStep) > 0 ? Number(settings.weightStep) : 2.5;
    settings.panelOpacity = clampOpacity(settings.panelOpacity, settings.opacityFloor || 0.6);
    settings.units = settings.units === 'kg' ? 'kg' : 'lb';
    if (decoded.ss_sound === false) { settings.masterMute = true; }
    if (decoded.ss_sound === true) { settings.masterMute = false; }

    let fx = Object.assign({ type: 'off', intensity: 2 }, decoded.ss_fx || {});
    if (['off', 'snow', 'rain', 'ripples', 'fire', 'smoke'].indexOf(fx.type) < 0) fx.type = 'off';
    fx.intensity = Math.max(1, Math.min(3, parseInt(fx.intensity, 10) || 2));

    const rest = { batman: { duration: 240, total: 0, endAt: 0 }, robin: { duration: 240, total: 0, endAt: 0 } };
    const savedRest = decoded.ss_rest || {};
    ['batman', 'robin'].forEach(function (p) {
      const s = savedRest[p] || {};
      const d = parseInt(s.duration, 10);
      if (d > 0) rest[p].duration = d;
      if (s.endAt && opts.now && s.endAt > opts.now) { rest[p].endAt = s.endAt; rest[p].total = s.total || rest[p].duration; }
      else if (s.endAt && !opts.now && s.endAt > Date.now()) { rest[p].endAt = s.endAt; rest[p].total = s.total || rest[p].duration; }
    });

    const skinSlug = SKIN_SLUGS.indexOf(decoded.ss_skin) >= 0 ? decoded.ss_skin : 'starclassic';
    const names = Object.assign({ batman: 'Batman', robin: 'Robin' }, decoded.ss_partner_names || {});
    const profiles = decoded.ss_profiles && decoded.ss_profiles.users ? clone(decoded.ss_profiles) : { activeId: 'default', users: { default: { id: 'default', name: 'Default', created: opts.now || 0 } } };
    if (!profiles.users[profiles.activeId]) profiles.activeId = Object.keys(profiles.users)[0];

    const state = {
      schemaVersion: SCHEMA,
      activeThemeId: activeThemeId,
      themes: themes,
      duoMode: !!decoded.ss_duo_mode,
      activePartner: 'batman',
      partnerNames: { batman: String(names.batman || 'Batman').slice(0, 16), robin: String(names.robin || 'Robin').slice(0, 16) },
      activeRoutineId: activeRoutineId,
      activeDay: activeDay,
      routines: routines,
      history: history,
      currentSession: currentSession,
      personalRecords: pr,
      soundEnabled: decoded.ss_sound === undefined ? true : !!decoded.ss_sound,
      fx: fx,
      rest: rest,
      skinId: skinSlug,
      skinOverrides: decoded.ss_skin_overrides && typeof decoded.ss_skin_overrides === 'object' ? clone(decoded.ss_skin_overrides) : {},
      communitySkins: Array.isArray(decoded.ss_community_skins) ? decoded.ss_community_skins : [],
      settings: settings,
      profiles: profiles,
      profileVault: decoded.ss_profile_vault && typeof decoded.ss_profile_vault === 'object' ? clone(decoded.ss_profile_vault) : {},
      snapshots: Array.isArray(decoded.ss_snapshots) ? decoded.ss_snapshots : [],
      focus: null
    };
    return { state: state, backup: backup, legacyKeys: LEGACY_KEYS.slice() };
  }

  function freshWorkoutSlice(idFn) {
    const routines = clone(DATA.defaultRoutines);
    ensureRoutineIds(routines, idFn || createIds(100));
    return {
      routines: routines,
      history: [],
      currentSession: { _meta: { v: 1, skipped: [], extras: [], keyedBy: 'id' } },
      personalRecords: { batman: {}, robin: {} },
      activeRoutineId: 'bls5',
      activeDay: 'Push',
      duoMode: false,
      activePartner: 'batman',
      partnerNames: { batman: 'Batman', robin: 'Robin' },
      rest: { batman: { duration: 240, total: 0, endAt: 0 }, robin: { duration: 240, total: 0, endAt: 0 } },
      focus: null
    };
  }
  function snapshotWorkout(state) {
    return {
      routines: clone(state.routines), history: clone(state.history), currentSession: clone(state.currentSession),
      personalRecords: clone(state.personalRecords), activeRoutineId: state.activeRoutineId, activeDay: state.activeDay,
      duoMode: state.duoMode, activePartner: state.activePartner, partnerNames: clone(state.partnerNames), rest: clone(state.rest)
    };
  }
  function applyWorkoutSlice(state, slice) {
    ['routines', 'history', 'currentSession', 'personalRecords', 'activeRoutineId', 'activeDay', 'duoMode', 'activePartner', 'partnerNames', 'rest'].forEach(function (k) { state[k] = clone(slice[k]); });
    state.focus = null;
  }

  function routineById(state, id) { return state.routines[id || state.activeRoutineId]; }
  function dayExercises(state, routineId, day) {
    const r = state.routines[routineId || state.activeRoutineId];
    if (!r || !r.days) return [];
    return r.days[day != null ? day : state.activeDay] || [];
  }
  function visibleExercises(state) {
    const meta = ensureMeta(state.currentSession);
    const skipped = {};
    meta.skipped.forEach(function (id) { skipped[id] = true; });
    const list = [];
    dayExercises(state).forEach(function (ex) { if (ex && !skipped[ex.id]) list.push({ source: 'routine', exercise: ex }); });
    (meta.extras || []).forEach(function (ex) {
      if (ex && ex.day === state.activeDay && ex.routineId === state.activeRoutineId && !skipped[ex.id]) list.push({ source: 'extra', exercise: ex });
    });
    return list;
  }
  function findExercise(state, exerciseId) {
    const vis = visibleExercises(state);
    for (let i = 0; i < vis.length; i++) if (vis[i].exercise.id === exerciseId) return vis[i];
    return null;
  }
  function ensureExerciseSession(state, exercise, idFn) {
    const key = sessionKey(state.activeRoutineId, state.activeDay, exercise.id);
    if (!state.currentSession[key]) state.currentSession[key] = blankSession(exercise, idFn || createIds(Date.now() % 100000));
    const data = state.currentSession[key];
    if (!Array.isArray(data.sets) || !data.sets.length) data.sets = blankSession(exercise, idFn || createIds(Date.now() % 100000)).sets;
    return data;
  }
  function fieldPair(partner, field) {
    if (field === 'type') return 'type';
    if (partner === 'robin') return field === 'reps' ? 'p2Reps' : 'p2Weight';
    return field === 'reps' ? 'reps' : 'weight';
  }
  function hintField(partner, field) {
    if (partner === 'robin') return field === 'reps' ? 'hintP2Reps' : 'hintP2Weight';
    return field === 'reps' ? 'hintReps' : 'hintWeight';
  }
  function setDone(set, partner) { return partner === 'robin' ? !!set.p2Done : !!set.done; }
  function setDoneFlag(set, partner, v) { if (partner === 'robin') set.p2Done = !!v; else set.done = !!v; }
  function setIsEmpty(set) {
    if (!set) return true;
    const filled = [set.weight, set.reps, set.p2Weight, set.p2Reps].some(function (v) { return String(v == null ? '' : v).trim() !== ''; });
    return !filled && !set.done && !set.p2Done;
  }
  function restRemaining(state, partner, now) {
    const t = state.rest && state.rest[partner];
    if (!t || !t.endAt) return 0;
    return Math.max(0, Math.ceil((t.endAt - now) / 1000));
  }
  function anyRestRunning(state, now) {
    return restRemaining(state, 'batman', now) > 0 || (state.duoMode && restRemaining(state, 'robin', now) > 0);
  }
  function previousFor(state, exerciseName, partner, setIndex) {
    const hist = state.history.slice().sort(function (a, b) { return (historyTs(b) || 0) - (historyTs(a) || 0); });
    for (let i = 0; i < hist.length; i++) {
      const exs = hist[i].exercises || [];
      for (let j = 0; j < exs.length; j++) {
        const e = exs[j];
        if (e.exercise !== exerciseName) continue;
        if ((e.partner || 'batman') !== partner) continue;
        const s = (e.sets || [])[setIndex];
        if (!s) return null;
        return { weight: String(s.weight), reps: String(s.reps), type: s.type || 'Normal' };
      }
    }
    return null;
  }
  function findCurrent(state) {
    if (state.focus && state.focus.exerciseId && state.focus.setId) {
      const hit = findExercise(state, state.focus.exerciseId);
      const data = hit && state.currentSession[sessionKey(state.activeRoutineId, state.activeDay, hit.exercise.id)];
      if (hit && data) {
        const set = (data.sets || []).find(function (s) { return s.id === state.focus.setId; });
        if (set) return { exercise: hit.exercise, source: hit.source, set: set, data: data };
      }
    }
    const vis = visibleExercises(state);
    const partner = activePartner(state);
    for (let i = 0; i < vis.length; i++) {
      const key = sessionKey(state.activeRoutineId, state.activeDay, vis[i].exercise.id);
      const data = state.currentSession[key];
      const sets = (data && data.sets) || [];
      for (let s = 0; s < sets.length; s++) {
        if (!setDone(sets[s], partner)) return { exercise: vis[i].exercise, source: vis[i].source, set: sets[s], data: data };
      }
    }
    return null;
  }

  function updateSetField(state, exerciseId, setId, field, value, partner) {
    const hit = findExercise(state, exerciseId);
    if (!hit) return { ok: false, reason: 'missing' };
    const data = ensureExerciseSession(state, hit.exercise);
    const set = (data.sets || []).find(function (s) { return s.id === setId; });
    if (!set) return { ok: false, reason: 'missing-set' };
    if (field === 'type') {
      if (SET_TYPES.indexOf(value) < 0) return { ok: false, reason: 'type' };
      set.type = value;
    } else if (field === 'weight' || field === 'reps') {
      set[fieldPair(partner || activePartner(state), field)] = String(value == null ? '' : value);
    } else if (field === 'notes') {
      data.notes = String(value || '').slice(0, 400);
    } else return { ok: false, reason: 'field' };
    return { ok: true };
  }
  function nudgeSet(state, exerciseId, setId, field, dir, partner) {
    const hit = findExercise(state, exerciseId);
    if (!hit) return { ok: false };
    const data = ensureExerciseSession(state, hit.exercise);
    const set = (data.sets || []).find(function (s) { return s.id === setId; });
    if (!set) return { ok: false };
    const p = partner || activePartner(state);
    const key = fieldPair(p, field);
    const cur = parseFloat(set[key]);
    const base = Number.isFinite(cur) ? cur : 0;
    const step = field === 'weight' ? (Number(state.settings.weightStep) || 2.5) : 1;
    const next = Math.max(0, Math.round((base + (dir < 0 ? -1 : 1) * step) * 1000) / 1000);
    set[key] = String(next);
    return { ok: true, value: set[key] };
  }

  function logCurrentSet(state, runtime, now) {
    runtime = runtime || {};
    now = now || Date.now();
    if (runtime.logLockUntil && now < runtime.logLockUntil) return { ok: false, reason: 'lockout' };
    const cur = findCurrent(state);
    if (!cur) return { ok: false, reason: 'no-set' };
    const partner = activePartner(state);
    if (setDone(cur.set, partner)) return { ok: false, reason: 'already' };
    const undo = {
      type: 'log', until: now + 8000, exerciseId: cur.exercise.id, setId: cur.set.id, partner: partner,
      rest: clone(state.rest), activePartner: state.activePartner, focus: state.focus ? clone(state.focus) : null
    };
    setDoneFlag(cur.set, partner, true);
    const dur = (state.rest[partner] && state.rest[partner].duration) || 240;
    state.rest[partner].total = dur;
    state.rest[partner].endAt = now + dur * 1000;
    state.focus = { exerciseId: cur.exercise.id, setId: cur.set.id };
    let flipped = false;
    if (state.duoMode && state.settings.duoHandoff === 'set' && state.settings.partnerParticipating && state.settings.partnerParticipating[otherPartner(partner)] !== false) {
      state.activePartner = otherPartner(partner);
      flipped = true;
    }
    runtime.logLockUntil = now + 450;
    runtime.undo = undo;
    return { ok: true, undo: undo, partner: partner, flipped: flipped, exercise: cur.exercise.name, setId: cur.set.id };
  }
  function undoLast(state, runtime, now) {
    const undo = runtime && runtime.undo;
    if (!undo || (undo.until && now > undo.until)) return { ok: false, reason: 'expired' };
    if (undo.type === 'log') {
      const data = state.currentSession[sessionKey(state.activeRoutineId, state.activeDay, undo.exerciseId)];
      const set = data && (data.sets || []).find(function (s) { return s.id === undo.setId; });
      if (set) setDoneFlag(set, undo.partner, false);
      state.rest = clone(undo.rest);
      state.activePartner = undo.activePartner;
      state.focus = undo.focus;
    } else if (undo.type === 'delete-set') {
      const data = state.currentSession[sessionKey(state.activeRoutineId, state.activeDay, undo.exerciseId)];
      if (data && Array.isArray(data.sets)) data.sets.splice(undo.index, 0, clone(undo.set));
    } else return { ok: false, reason: 'type' };
    runtime.undo = null;
    return { ok: true };
  }

  function metronomeShouldClick(state, now) {
    if (!state.settings.tempo || !state.settings.tempo.running) return false;
    const partners = state.duoMode ? ['batman', 'robin'] : ['batman'];
    const resting = partners.filter(function (p) { return restRemaining(state, p, now) > 0; });
    if (partners.length >= 2) return resting.length < partners.length;
    return resting.length === 0;
  }
  function metronomePartner(state, now) {
    const active = activePartner(state);
    if (restRemaining(state, active, now) <= 0) return active;
    if (state.duoMode && restRemaining(state, otherPartner(active), now) <= 0) return otherPartner(active);
    return active;
  }

  function statsForEntries(entries) {
    let sets = 0, volume = 0, prs = 0;
    const names = {};
    (entries || []).forEach(function (e) {
      names[e.exercise] = true;
      if (e.pr) prs++;
      (e.sets || []).forEach(function (s) {
        sets++;
        if (s.type !== 'Warmup') volume += (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
      });
    });
    return { exercises: Object.keys(names).length, sets: sets, volume: Math.round(volume), prs: prs };
  }

  function collectPartnerEntries(state, partners, now) {
    const logged = [];
    const newPRs = [];
    const routine = routineById(state);
    partners.forEach(function (pKey) {
      visibleExercises(state).forEach(function (item) {
        const ex = item.exercise;
        const data = state.currentSession[sessionKey(state.activeRoutineId, state.activeDay, ex.id)];
        if (!data || !data.sets) return;
        const doneSets = data.sets.filter(function (s) { return setDone(s, pKey); });
        if (!doneSets.length) return;
        const formatted = doneSets.map(function (s) {
          return { type: s.type || 'Normal', weight: String(s[fieldPair(pKey, 'weight')] == null ? '' : s[fieldPair(pKey, 'weight')]), reps: String(s[fieldPair(pKey, 'reps')] == null ? '' : s[fieldPair(pKey, 'reps')]) };
        });
        let best = null;
        formatted.forEach(function (fs) {
          if (fs.type === 'Warmup') return;
          const w = parseFloat(fs.weight) || 0;
          const r = parseInt(fs.reps, 10) || 0;
          if (w <= 0) return;
          if (!best || w > best.weight || (w === best.weight && r > best.reps)) best = { weight: w, reps: r };
        });
        let prInfo = null;
        if (best) {
          const cur = state.personalRecords[pKey] && state.personalRecords[pKey][ex.name];
          const prevW = cur && cur.weight ? cur.weight : 0;
          if (best.weight > prevW) {
            prInfo = { weight: best.weight, reps: best.reps, prev: prevW };
            if (!state.personalRecords[pKey]) state.personalRecords[pKey] = {};
            state.personalRecords[pKey][ex.name] = { weight: best.weight, reps: best.reps, ts: now, muscle: ex.muscle };
            newPRs.push({ exercise: ex.name, muscle: ex.muscle, partner: pKey, weight: best.weight, reps: best.reps, prev: prevW });
          } else if (cur && best.weight === prevW && best.reps > (cur.reps || 0)) cur.reps = best.reps;
        }
        const entry = { exercise: ex.name, exerciseId: ex.id, muscle: ex.muscle, partner: pKey, sets: formatted };
        if (prInfo) entry.pr = prInfo;
        logged.push(entry);
      });
    });
    return { logged: logged, newPRs: newPRs, routine: routine };
  }

  function finishWorkout(state, opts) {
    opts = opts || {};
    if (!opts.confirmed) return { ok: false, reason: 'confirm' };
    const partners = (opts.partners && opts.partners.length) ? opts.partners.slice() : (state.duoMode ? ['batman', 'robin'] : ['batman']);
    const now = opts.now || Date.now();
    const collected = collectPartnerEntries(state, partners, now);
    if (!collected.logged.length) return { ok: false, reason: 'incomplete' };
    partners.forEach(function (p) {
      visibleExercises(state).forEach(function (item) {
        const data = state.currentSession[sessionKey(state.activeRoutineId, state.activeDay, item.exercise.id)];
        if (data && data.sets) data.sets.forEach(function (s) { setDoneFlag(s, p, false); });
      });
    });
    ['batman', 'robin'].forEach(function (p) { if (state.rest[p]) state.rest[p].endAt = 0; });
    if (state.settings.tempo) state.settings.tempo.running = false;
    const recordId = typeof opts.id === 'function' ? opts.id('log') : (opts.id || createIds(1)('log'));
    const record = {
      id: recordId,
      ts: now,
      iso: formatIsoOffset(now),
      date: opts.dateLabel || new Date(now).toLocaleDateString(),
      routineId: state.activeRoutineId,
      routineName: collected.routine ? collected.routine.name : '',
      dayName: String(state.activeDay || '').replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):\s*/i, ''),
      duo: partners.length > 1,
      exercises: collected.logged
    };
    state.history.unshift(record);
    return { ok: true, record: record, newPRs: collected.newPRs, silence: true, partners: partners };
  }

  function addSet(state, exerciseId, idFn) {
    const hit = findExercise(state, exerciseId) || (visibleExercises(state)[0] && { exercise: visibleExercises(state)[0].exercise });
    if (!hit) return { ok: false, reason: 'missing' };
    const ex = hit.exercise || hit;
    const data = ensureExerciseSession(state, ex, idFn);
    const last = data.sets[data.sets.length - 1];
    const blank = blankSetFromTemplate(last ? { type: last.type, weight: '', reps: '' } : { type: 'Normal' }, idFn || createIds(9));
    if (last) {
      blank.weight = last.weight;
      blank.reps = last.reps;
      blank.p2Weight = last.p2Weight;
      blank.p2Reps = last.p2Reps;
      blank.hintWeight = last.hintWeight;
      blank.hintReps = last.hintReps;
      blank.hintP2Weight = last.hintP2Weight;
      blank.hintP2Reps = last.hintP2Reps;
    }
    data.sets.push(blank);
    return { ok: true, set: blank };
  }
  function deleteSet(state, exerciseId, setId, opts) {
    opts = opts || {};
    const hit = findExercise(state, exerciseId);
    if (!hit) return { ok: false };
    const data = ensureExerciseSession(state, hit.exercise);
    const index = (data.sets || []).findIndex(function (s) { return s.id === setId; });
    if (index < 0) return { ok: false };
    const set = data.sets[index];
    const empty = setIsEmpty(set);
    if (!empty && !opts.confirmed) return { ok: false, reason: 'confirm', empty: false };
    const undo = { type: 'delete-set', until: (opts.now || Date.now()) + 8000, exerciseId: exerciseId, index: index, set: clone(set) };
    data.sets.splice(index, 1);
    if (opts.runtime) opts.runtime.undo = undo;
    return { ok: true, undo: undo, empty: empty };
  }

  function addExercise(state, spec, mode, idFn) {
    idFn = idFn || createIds(50);
    const name = String(spec.name || '').trim();
    if (!name) return { ok: false, reason: 'name' };
    const known = (DATA.exerciseDatabase || []).find(function (e) { return e.name.toLowerCase() === name.toLowerCase(); });
    const muscle = spec.muscle || (known ? known.muscle : 'OTHER');
    const ex = { id: idFn('ex'), name: known ? known.name : name, target: spec.target || '4-6 Reps', muscle: muscle, sets: [{ id: idFn('set'), type: 'Normal', weight: '', reps: '', p2Weight: '', p2Reps: '' }] };
    if (mode === 'permanent') {
      const r = routineById(state);
      if (!r.days[state.activeDay]) r.days[state.activeDay] = [];
      r.days[state.activeDay].push(ex);
    } else {
      const meta = ensureMeta(state.currentSession);
      ex.routineId = state.activeRoutineId;
      ex.day = state.activeDay;
      ex.todayOnly = true;
      meta.extras.push(ex);
    }
    ensureExerciseSession(state, ex, idFn);
    return { ok: true, exercise: ex, mode: mode === 'permanent' ? 'permanent' : 'today' };
  }
  function removeExercise(state, exerciseId, mode, opts) {
    opts = opts || {};
    const hit = findExercise(state, exerciseId);
    if (!hit) return { ok: false, reason: 'missing' };
    const data = state.currentSession[sessionKey(state.activeRoutineId, state.activeDay, exerciseId)];
    const hasData = !!(data && data.sets && data.sets.some(function (s) { return !setIsEmpty(s); }));
    if (hasData && !opts.confirmed) return { ok: false, reason: 'confirm', hasData: true };
    if (mode === 'permanent' && hit.source === 'routine') {
      const days = routineById(state).days[state.activeDay];
      const idx = days.findIndex(function (e) { return e.id === exerciseId; });
      if (idx >= 0) days.splice(idx, 1);
    }
    const meta = ensureMeta(state.currentSession);
    if (hit.source === 'extra' || mode !== 'permanent') {
      if (meta.skipped.indexOf(exerciseId) < 0) meta.skipped.push(exerciseId);
      meta.extras = meta.extras.filter(function (e) { return e.id !== exerciseId; });
    }
    return { ok: true, mode: mode, historyPreserved: true };
  }

  function queryHistory(history, query) {
    query = query || {};
    let rows = (history || []).slice().sort(function (a, b) { return (historyTs(a) || 0) - (historyTs(b) || 0); });
    if (query.reverse) rows.reverse();
    if (query.muscle && query.muscle !== 'all') {
      rows = rows.map(function (h) {
        const copy = Object.assign({}, h, { exercises: (h.exercises || []).filter(function (e) { return muscleKey(e.muscle) === query.muscle; }) });
        return copy;
      }).filter(function (h) { return h.exercises.length; });
    }
    if (query.partner && query.partner !== 'all') {
      rows = rows.map(function (h) {
        return Object.assign({}, h, { exercises: (h.exercises || []).filter(function (e) { return (e.partner || 'batman') === query.partner; }) });
      }).filter(function (h) { return h.exercises.length; });
    }
    return rows;
  }
  function recalcPRs(history) {
    const out = { batman: {}, robin: {} };
    const ordered = (history || []).slice().sort(function (a, b) { return (historyTs(a) || 0) - (historyTs(b) || 0); });
    ordered.forEach(function (h) {
      (h.exercises || []).forEach(function (e) {
        const p = e.partner === 'robin' ? 'robin' : 'batman';
        let best = null;
        (e.sets || []).forEach(function (s) {
          if (s.type === 'Warmup') return;
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps, 10) || 0;
          if (w <= 0) return;
          if (!best || w > best.weight || (w === best.weight && r > best.reps)) best = { weight: w, reps: r };
        });
        if (!best) return;
        const cur = out[p][e.exercise];
        if (!cur || best.weight > cur.weight) out[p][e.exercise] = { weight: best.weight, reps: best.reps, ts: historyTs(h), muscle: e.muscle || 'OTHER' };
        else if (best.weight === cur.weight && best.reps > (cur.reps || 0)) { cur.reps = best.reps; cur.ts = historyTs(h); }
      });
    });
    return out;
  }
  function editHistory(state, sessionId, mutate) {
    const rec = (state.history || []).find(function (h) { return h.id === sessionId; });
    if (!rec) return { ok: false, reason: 'missing' };
    mutate(rec);
    state.personalRecords = recalcPRs(state.history);
    return { ok: true, record: rec };
  }

  function validateRoutineObject(obj) {
    const errors = [];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, errors: ['not-object'] };
    if (typeof obj.name !== 'string' || !obj.name.trim() || obj.name.length > 80) errors.push('name');
    if (!obj.days || typeof obj.days !== 'object' || Array.isArray(obj.days)) errors.push('days');
    const text = JSON.stringify(obj);
    if (text.length > 500000) errors.push('too-large');
    if (/function\s*\(|<script/i.test(text)) errors.push('executable');
    if (errors.length) return { ok: false, errors: errors };
    const days = Object.keys(obj.days);
    if (!days.length || days.length > 14) return { ok: false, errors: ['day-count'] };
    for (let i = 0; i < days.length; i++) {
      const arr = obj.days[days[i]];
      if (!Array.isArray(arr)) return { ok: false, errors: ['day-not-array'] };
      if (arr.length > 40) return { ok: false, errors: ['too-many-exercises'] };
      for (let j = 0; j < arr.length; j++) {
        const ex = arr[j];
        if (!ex || typeof ex.name !== 'string' || !ex.name.trim() || ex.name.length > 80) return { ok: false, errors: ['exercise-name'] };
        if (ex.sets && !Array.isArray(ex.sets)) return { ok: false, errors: ['sets'] };
        if (ex.sets && ex.sets.length > 30) return { ok: false, errors: ['too-many-sets'] };
      }
    }
    return { ok: true, routine: { name: obj.name.trim(), days: obj.days } };
  }

  function xmlEscape(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function xmlDecode(s) {
    return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  }
  function toLb(value, units) {
    if (value === '' || value == null) return '';
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (units === 'kg') return Math.round(n * 2.2046226218 * 1000) / 1000;
    return n;
  }
  function fromLb(value, units) {
    if (value === '' || value == null) return '';
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    if (units === 'kg') return String(Math.round((n / 2.2046226218) * 1000) / 1000);
    return String(n);
  }

  function parseXml(src) {
    const xml = String(src || '').replace(/^\uFEFF/, '');
    if (!xml.trim()) return { ok: false, errors: ['empty'] };
    if (/<!|<\?/.test(xml)) return { ok: false, errors: ['dtd-or-declaration-rejected'] };
    if (/&(?!(lt|gt|amp|quot|apos);)/.test(xml)) return { ok: false, errors: ['entity-rejected'] };
    let i = 0;
    function parseStart(body) {
      const m = body.match(/^([A-Za-z_][\w:.-]*)/);
      if (!m) throw new Error('bad-name');
      const name = m[1];
      let rest = body.slice(name.length);
      const attrs = {};
      const re = /\s+([A-Za-z_][\w:.-]*)\s*=\s*"([^"]*)"/g;
      let mm;
      while ((mm = re.exec(rest))) attrs[mm[1]] = xmlDecode(mm[2]);
      return { name: name, attrs: attrs };
    }
    function parseNodes() {
      const nodes = [];
      while (i < xml.length) {
        if (xml.startsWith('</', i)) break;
        if (xml[i] !== '<') {
          let j = xml.indexOf('<', i);
          if (j < 0) j = xml.length;
          const text = xmlDecode(xml.slice(i, j)).trim();
          i = j;
          if (text) nodes.push({ type: 'text', text: text });
          continue;
        }
        const close = xml.indexOf('>', i);
        if (close < 0) throw new Error('bad-tag');
        let raw = xml.slice(i + 1, close).trim();
        i = close + 1;
        const self = /\/$/.test(raw);
        if (self) raw = raw.replace(/\/$/, '').trim();
        const parsed = parseStart(raw);
        const node = { type: 'el', name: parsed.name, attrs: parsed.attrs, children: [] };
        if (!self) {
          node.children = parseNodes();
          const end = '</' + parsed.name + '>';
          if (!xml.startsWith(end, i)) throw new Error('unclosed');
          i += end.length;
        }
        nodes.push(node);
      }
      return nodes;
    }
    try {
      const nodes = parseNodes().filter(function (n) { return n.type === 'el'; });
      if (i < xml.length && xml.slice(i).trim()) return { ok: false, errors: ['trailing'] };
      if (nodes.length !== 1 || nodes[0].name !== 'sic') return { ok: false, errors: ['root'] };
      return { ok: true, root: nodes[0] };
    } catch (e) {
      return { ok: false, errors: ['parse'] };
    }
  }
  function childEls(node, name) { return (node.children || []).filter(function (n) { return n.type === 'el' && (!name || n.name === name); }); }
  function numAttr(v) { if (v == null || v === '') return ''; const n = Number(v); return Number.isFinite(n) ? n : null; }

  function xmlToModel(root) {
    const errors = [];
    const warnings = [];
    const version = String(root.attrs.version || '');
    if (version !== '1') errors.push('version');
    const kind = root.attrs.kind || 'bundle';
    if (['bundle', 'routines', 'history'].indexOf(kind) < 0) errors.push('kind');
    const units = root.attrs.units === 'kg' ? 'kg' : 'lb';
    const routines = {};
    const history = [];
    const seen = {};
    function takeId(id, prefix) {
      if (!id) { errors.push('id'); return prefix + '_missing'; }
      if (seen[id]) errors.push('duplicate-id');
      seen[id] = true;
      return id;
    }
    childEls(root).forEach(function (section) {
      if (section.name === 'routines') {
        childEls(section, 'routine').forEach(function (rn) {
          const id = takeId(rn.attrs.id, 'routine');
          const routine = { id: id, name: rn.attrs.name || 'Routine', days: {} };
          if (!rn.attrs.name) errors.push('routine-name');
          childEls(rn, 'day').forEach(function (day) {
            const dayName = day.attrs.name || 'Day';
            routine.days[dayName] = [];
            childEls(day, 'exercise').forEach(function (ex) {
              const muscle = String(ex.attrs.muscle || 'OTHER').toUpperCase();
              if (!MUSCLE_FROM_TAG[muscle]) warnings.push('muscle-coerced');
              const exercise = { id: takeId(ex.attrs.id, 'ex'), name: ex.attrs.name || '', target: ex.attrs.target || '', muscle: MUSCLE_FROM_TAG[muscle] ? muscle : 'OTHER', sets: [] };
              if (!exercise.name) errors.push('exercise-name');
              childEls(ex, 'set').forEach(function (st) {
                const type = SET_TYPES.indexOf(st.attrs.type) >= 0 ? st.attrs.type : 'Normal';
                if (st.attrs.type && SET_TYPES.indexOf(st.attrs.type) < 0) warnings.push('set-type');
                ['weight', 'reps', 'p2Weight', 'p2Reps'].forEach(function (f) { if (numAttr(st.attrs[f]) === null) errors.push('number'); });
                exercise.sets.push({
                  id: takeId(st.attrs.id, 'set'), type: type,
                  weight: st.attrs.weight != null ? String(st.attrs.weight) : '',
                  reps: st.attrs.reps != null ? String(st.attrs.reps) : '',
                  p2Weight: st.attrs.p2Weight != null ? String(st.attrs.p2Weight) : '',
                  p2Reps: st.attrs.p2Reps != null ? String(st.attrs.p2Reps) : ''
                });
              });
              routine.days[dayName].push(exercise);
            });
          });
          routines[id] = routine;
        });
      } else if (section.name === 'history') {
        childEls(section, 'session').forEach(function (sn) {
          const ts = Number(sn.attrs.ts);
          if (!Number.isFinite(ts)) errors.push('ts');
          const session = {
            id: takeId(sn.attrs.id, 'log'), ts: ts, iso: sn.attrs.iso || '', date: sn.attrs.date || '',
            routineId: sn.attrs.routineId || '', routineName: sn.attrs.routineName || '', dayName: sn.attrs.dayName || '',
            duo: sn.attrs.duo === 'true', exercises: []
          };
          childEls(sn, 'entry').forEach(function (en) {
            const partner = en.attrs.partner === 'robin' ? 'robin' : 'batman';
            const muscle = String(en.attrs.muscle || 'OTHER').toUpperCase();
            const entry = { exercise: en.attrs.name || '', exerciseId: en.attrs.exerciseId || '', muscle: MUSCLE_FROM_TAG[muscle] ? muscle : 'OTHER', partner: partner, sets: [] };
            if (!entry.exercise) errors.push('entry-name');
            childEls(en, 'set').forEach(function (st) {
              if (numAttr(st.attrs.weight) === null || numAttr(st.attrs.reps) === null) errors.push('number');
              entry.sets.push({ type: SET_TYPES.indexOf(st.attrs.type) >= 0 ? st.attrs.type : 'Normal', weight: String(st.attrs.weight || ''), reps: String(st.attrs.reps || '') });
            });
            session.exercises.push(entry);
          });
          history.push(session);
        });
      } else errors.push('section');
    });
    if (errors.length) return { ok: false, errors: errors, warnings: warnings };
    return { ok: true, doc: { version: 1, kind: kind, units: units, exportedAt: root.attrs.exportedAt || '', routines: routines, history: history }, warnings: warnings };
  }

  function convertDocUnits(doc, direction) {
    const units = doc.units;
    const touch = function (value) {
      if (value === '' || value == null) return '';
      if (units !== 'kg') return String(value);
      if (direction === 'to-lb') { const n = toLb(value, 'kg'); return n == null ? '' : String(n); }
      return fromLb(value, 'kg');
    };
    const copy = clone(doc);
    Object.keys(copy.routines || {}).forEach(function (id) {
      const days = copy.routines[id].days || {};
      Object.keys(days).forEach(function (day) {
        (days[day] || []).forEach(function (ex) {
            (ex.sets || []).forEach(function (s) {
              ['weight', 'p2Weight'].forEach(function (f) { s[f] = touch(s[f]); });
            });
        });
      });
    });
    (copy.history || []).forEach(function (h) {
      (h.exercises || []).forEach(function (e) { (e.sets || []).forEach(function (s) { s.weight = touch(s.weight); }); });
    });
    return copy;
  }

  function exportXml(state, kind, opts) {
    opts = opts || {};
    const units = opts.units || (state.settings && state.settings.units) || 'lb';
    const now = opts.now || Date.now();
    const parts = ['<sic version="1" kind="' + kind + '" units="' + units + '" exportedAt="' + xmlEscape(formatIsoOffset(now)) + '">'];
    if (kind === 'bundle' || kind === 'routines') {
      parts.push('<routines>');
      Object.keys(state.routines).forEach(function (id) {
        const r = state.routines[id];
        parts.push('<routine id="' + xmlEscape(r.id || id) + '" name="' + xmlEscape(r.name) + '">');
        Object.keys(r.days || {}).forEach(function (day) {
          parts.push('<day id="' + xmlEscape(id + '_' + day) + '" name="' + xmlEscape(day) + '">');
          (r.days[day] || []).forEach(function (ex) {
            parts.push('<exercise id="' + xmlEscape(ex.id) + '" name="' + xmlEscape(ex.name) + '" muscle="' + xmlEscape(ex.muscle || 'OTHER') + '" target="' + xmlEscape(ex.target || '') + '">');
            (ex.sets || []).forEach(function (s) {
              const w = units === 'kg' ? fromLb(s.weight, 'kg') : (s.weight == null ? '' : String(s.weight));
              const p2 = units === 'kg' ? fromLb(s.p2Weight, 'kg') : (s.p2Weight == null ? '' : String(s.p2Weight));
              parts.push('<set id="' + xmlEscape(s.id || '') + '" type="' + xmlEscape(s.type || 'Normal') + '" weight="' + xmlEscape(w) + '" reps="' + xmlEscape(s.reps == null ? '' : s.reps) + '" p2Weight="' + xmlEscape(p2) + '" p2Reps="' + xmlEscape(s.p2Reps == null ? '' : s.p2Reps) + '"/>');
            });
            parts.push('</exercise>');
          });
          parts.push('</day>');
        });
        parts.push('</routine>');
      });
      parts.push('</routines>');
    }
    if (kind === 'bundle' || kind === 'history') {
      parts.push('<history>');
      (state.history || []).forEach(function (h) {
        parts.push('<session id="' + xmlEscape(h.id) + '" ts="' + xmlEscape(h.ts || '') + '" iso="' + xmlEscape(h.iso || (h.ts ? formatIsoOffset(h.ts) : '')) + '" date="' + xmlEscape(h.date || '') + '" routineId="' + xmlEscape(h.routineId || '') + '" routineName="' + xmlEscape(h.routineName || '') + '" dayName="' + xmlEscape(h.dayName || '') + '" duo="' + (h.duo ? 'true' : 'false') + '">');
        (h.exercises || []).forEach(function (e) {
          parts.push('<entry exerciseId="' + xmlEscape(e.exerciseId || '') + '" name="' + xmlEscape(e.exercise) + '" muscle="' + xmlEscape(e.muscle || 'OTHER') + '" partner="' + xmlEscape(e.partner || 'batman') + '">');
          (e.sets || []).forEach(function (s) {
            const w = units === 'kg' ? fromLb(s.weight, 'kg') : String(s.weight == null ? '' : s.weight);
            parts.push('<set type="' + xmlEscape(s.type || 'Normal') + '" weight="' + xmlEscape(w) + '" reps="' + xmlEscape(s.reps == null ? '' : s.reps) + '"/>');
          });
          parts.push('</entry>');
        });
        parts.push('</session>');
      });
      parts.push('</history>');
    }
    parts.push('</sic>');
    return parts.join('');
  }
  function importXml(xml) {
    const parsed = parseXml(xml);
    if (!parsed.ok) return parsed;
    const model = xmlToModel(parsed.root);
    if (!model.ok) return model;
    model.doc = convertDocUnits(model.doc, 'to-lb');
    model.doc.units = 'lb';
    return model;
  }
  function previewImport(state, doc) {
    const routineConflicts = [];
    const historyConflicts = [];
    Object.keys(doc.routines || {}).forEach(function (id) {
      if (state.routines[id]) routineConflicts.push({ id: id, name: doc.routines[id].name, existingName: state.routines[id].name });
    });
    const ids = {};
    (state.history || []).forEach(function (h) { ids[h.id] = true; });
    (doc.history || []).forEach(function (h) { if (ids[h.id]) historyConflicts.push({ id: h.id }); });
    return { routineConflicts: routineConflicts, historyConflicts: historyConflicts, routineCount: Object.keys(doc.routines || {}).length, historyCount: (doc.history || []).length };
  }
  function applyImport(state, doc, mode) {
    const backup = snapshotWorkout(state);
    if (mode === 'replace') {
      if (doc.kind !== 'history' && Object.keys(doc.routines || {}).length) {
        state.routines = clone(doc.routines);
        if (!state.routines[state.activeRoutineId]) state.activeRoutineId = Object.keys(state.routines)[0];
      }
      if (doc.kind !== 'routines') state.history = clone(doc.history || []);
    } else {
      Object.keys(doc.routines || {}).forEach(function (id) { if (!state.routines[id]) state.routines[id] = clone(doc.routines[id]); });
      const have = {};
      state.history.forEach(function (h) { have[h.id] = true; });
      (doc.history || []).forEach(function (h) { if (!have[h.id]) state.history.push(clone(h)); });
    }
    state.personalRecords = recalcPRs(state.history);
    return { ok: true, backup: backup };
  }

  function validateCommunityPack(pack) {
    const errors = [];
    const warnings = [];
    if (!pack || typeof pack !== 'object' || Array.isArray(pack)) return { ok: false, errors: ['not-object'] };
    const walk = function (node, path) {
      if (!node || typeof node !== 'object') return;
      Object.keys(node).forEach(function (k) {
        if (typeof node[k] === 'function') errors.push('function');
        if (/^(script|eval|code|onclick|onload|handler)$/i.test(k)) errors.push('executable-key');
        if (typeof node[k] === 'string' && /<script|javascript:|on[a-z]+\s*=/i.test(node[k])) errors.push('executable-string');
        if (node[k] && typeof node[k] === 'object') walk(node[k], path + '.' + k);
      });
    };
    walk(pack, 'pack');
    if (pack.schemaVersion !== 1) errors.push('schema');
    if (typeof pack.slug !== 'string' || !/^[a-z0-9-]{2,32}$/.test(pack.slug)) errors.push('slug');
    if (SKIN_SLUGS.indexOf(pack.slug) >= 0) errors.push('builtin-slug');
    if (typeof pack.name !== 'string' || !pack.name.trim() || pack.name.length > 40) errors.push('name');
    let layout = pack.layout || 'starclassic';
    if (LAYOUTS.indexOf(layout) < 0) { warnings.push('layout-fallback'); layout = 'starclassic'; }
    const palette = pack.palette || {};
    ['bg', 'card', 'border', 'text', 'accent'].forEach(function (k) { if (palette[k] && !hexToRgb(palette[k])) errors.push('palette-' + k); });
    const assets = Array.isArray(pack.assets) ? pack.assets : [];
    let total = 0;
    const allow = { 'font/woff2': true, 'image/png': true, 'image/webp': true, 'image/svg+xml': true, 'audio/ogg': true, 'audio/mpeg': true };
    assets.forEach(function (a) {
      if (!a || !allow[a.mime]) { errors.push('asset-type'); return; }
      const data = String(a.data || '');
      if (/^https?:|filesystem:|file:/i.test(data)) errors.push('asset-remote');
      const bytes = Math.floor(data.length * 0.75);
      if (bytes > 400000) errors.push('asset-size');
      total += bytes;
      if (a.mime === 'image/svg+xml') {
        let text = data;
        const comma = data.indexOf(',');
        if (data.indexOf('base64,') >= 0) {
          try { text = typeof atob === 'function' ? atob(data.slice(comma + 1)) : Buffer.from(data.slice(comma + 1), 'base64').toString('utf8'); } catch (e) { errors.push('asset-svg'); }
        }
        if (/<script|on[a-z]+\s*=|javascript:|<foreignObject|<!ENTITY/i.test(text)) errors.push('asset-svg');
      }
    });
    if (total > 1500000) errors.push('asset-total');
    if (errors.length) return { ok: false, errors: errors, warnings: warnings };
    return { ok: true, warnings: warnings, pack: { schemaVersion: 1, slug: pack.slug, name: pack.name.trim(), layout: layout, mini: pack.mini || MINI_SHAPES[layout] || 'card', popout: pack.popout || 'sheet', palette: palette, font: typeof pack.font === 'string' ? pack.font.slice(0, 80) : '', builtin: false, assets: assets } };
  }

  function pointInHex(nx, ny, cx, cy, r) {
    const dx = Math.abs(nx - cx);
    const dy = Math.abs(ny - cy);
    return dy <= r * 0.86 && dx * 0.577 + dy <= r;
  }
  function miniHitTest(shape, x, y, w, h) {
    if (!(w > 0) || !(h > 0)) return false;
    const nx = x / w, ny = y / h;
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return false;
    if (shape === 'card') {
      const rx = 0.08, ry = 0.1;
      const left = 0.06, top = 0.08, right = 0.94, bottom = 0.92;
      if (nx < left || nx > right || ny < top || ny > bottom) return false;
      const cx = nx < left + rx ? left + rx : (nx > right - rx ? right - rx : nx);
      const cy = ny < top + ry ? top + ry : (ny > bottom - ry ? bottom - ry : ny);
      const dx = (nx - cx) / rx, dy = (ny - cy) / ry;
      return dx * dx + dy * dy <= 1.0001;
    }
    if (shape === 'stepped-l') return (nx >= 0.08 && nx <= 0.46 && ny >= 0.1 && ny <= 0.9) || (nx >= 0.08 && nx <= 0.92 && ny >= 0.58 && ny <= 0.9);
    if (shape === 'puck') {
      const c = Math.hypot(nx - 0.5, ny - 0.5) <= 0.3;
      const orbits = [[0.5, 0.08], [0.5, 0.92], [0.08, 0.5], [0.92, 0.5]];
      return c || orbits.some(function (p) { return Math.hypot(nx - p[0], ny - p[1]) <= 0.09; });
    }
    if (shape === 'rail') {
      if (nx >= 0.68 && nx <= 0.96 && ny >= 0.06 && ny <= 0.94) return true;
      const tabs = [0.18, 0.38, 0.58, 0.78];
      return tabs.some(function (t) { return nx >= 0.5 && nx <= 0.7 && ny >= t - 0.06 && ny <= t + 0.06; });
    }
    if (shape === 'ticket') {
      if (nx < 0.06 || nx > 0.94 || ny < 0.18 || ny > 0.82) return false;
      if (Math.hypot(nx - 0.06, ny - 0.5) < 0.1) return false;
      if (Math.hypot(nx - 0.94, ny - 0.5) < 0.1) return false;
      return true;
    }
    if (shape === 'capsule') {
      const left = 0.34, right = 0.66, top = 0.06, bottom = 0.94, r = 0.16;
      if (nx < left || nx > right || ny < top || ny > bottom) return false;
      if (ny < top + r && Math.hypot(nx - 0.5, ny - (top + r)) > r) return false;
      if (ny > bottom - r && Math.hypot(nx - 0.5, ny - (bottom - r)) > r) return false;
      return true;
    }
    if (shape === 'cassette') return nx >= 0.08 && nx <= 0.92 && ny >= 0.22 && ny <= 0.78;
    if (shape === 'flower') {
      const centers = [[0.5, 0.5], [0.5, 0.24], [0.72, 0.37], [0.72, 0.63], [0.5, 0.76], [0.28, 0.63], [0.28, 0.37]];
      return centers.some(function (c) { return pointInHex(nx, ny, c[0], c[1], 0.16); });
    }
    return false;
  }

  function parseCommand(line) {
    const s = String(line || '').trim();
    if (s === '/exit') return { cmd: 'exit' };
    if (s === '/restart') return { cmd: 'restart' };
    if (s === '/clearmessages') return { cmd: 'clearmessages' };
    if (s === '/soundsoff') return { cmd: 'soundsoff' };
    if (s === '/soundson') return { cmd: 'soundson' };
    if (s === '/endworkout') return { cmd: 'endworkout' };
    if (s === '/mcphersonstrut') return { cmd: 'mcphersonstrut' };
    let m = s.match(/^\/skin=([a-z0-9-]+)$/);
    if (m) return { cmd: 'skin', slug: m[1] };
    m = s.match(/^\/newuser=(.+)$/);
    if (m) return { cmd: 'newuser', name: m[1].trim() };
    m = s.match(/^\/deleteuser=(.+)$/);
    if (m) return { cmd: 'deleteuser', name: m[1].trim() };
    m = s.match(/^\/bugreport=([\s\S]+)$/);
    if (m) return { cmd: 'bugreport', text: m[1] };
    if (s.indexOf('/msg.user=') === 0) return { cmd: 'msg.user' };
    return { cmd: 'unknown', raw: s };
  }
  function applyCommand(state, parsed, opts) {
    opts = opts || {};
    if (!parsed || !parsed.cmd) return { ok: false, message: 'Empty command.' };
    if (parsed.cmd === 'exit') return { ok: true, message: 'saved, safe to close', actions: ['save', 'exit'] };
    if (parsed.cmd === 'restart') return { ok: true, message: 'Saving and reopening SIC.', actions: ['save', 'restart'] };
    if (parsed.cmd === 'clearmessages') return { ok: true, message: '', actions: ['clear-console'] };
    if (parsed.cmd === 'soundsoff') { state.soundEnabled = false; state.settings.masterMute = true; return { ok: true, message: 'Sounds off.', actions: ['save'] }; }
    if (parsed.cmd === 'soundson') { state.soundEnabled = true; state.settings.masterMute = false; return { ok: true, message: 'Sounds on.', actions: ['save'] }; }
    if (parsed.cmd === 'endworkout') return { ok: true, message: 'Finish workout needs confirmation.', actions: ['confirm-finish'] };
    if (parsed.cmd === 'mcphersonstrut') return { ok: true, message: 'Reserved. No effect.', actions: [] };
    if (parsed.cmd === 'msg.user') return { ok: false, message: 'not available yet', actions: [] };
    if (parsed.cmd === 'skin') {
      const known = getSkin(state, parsed.slug);
      if (!known || (known.slug !== parsed.slug && SKIN_SLUGS.indexOf(parsed.slug) < 0 && !(state.communitySkins || []).some(function (s) { return s.slug === parsed.slug; }))) {
        return { ok: false, message: 'Unknown skin. ' + SKIN_SLUGS.join(', '), actions: [] };
      }
      state.skinId = parsed.slug;
      return { ok: true, message: 'Skin: ' + known.name, actions: ['save', 'render'] };
    }
    if (parsed.cmd === 'newuser') {
      const res = createProfile(state, parsed.name, opts);
      return Object.assign({ actions: res.ok ? ['save', 'render'] : [] }, res);
    }
    if (parsed.cmd === 'deleteuser') {
      const res = deleteProfile(state, parsed.name, opts);
      return Object.assign({ actions: res.ok ? ['save', 'render'] : [] }, res);
    }
    if (parsed.cmd === 'bugreport') return { ok: true, message: 'Bug report preview opened. Nothing is sent until you submit.', actions: ['open-bug'], text: parsed.text };
    return { ok: false, message: 'Unknown command.', actions: [] };
  }

  function createProfile(state, name, opts) {
    const clean = String(name || '').trim().slice(0, 24);
    if (!clean) return { ok: false, message: 'Name required.' };
    const users = state.profiles.users;
    const dup = Object.keys(users).some(function (id) { return users[id].name.toLowerCase() === clean.toLowerCase(); });
    if (dup) return { ok: false, message: 'That profile already exists.' };
    const id = (opts && opts.id ? opts.id : createIds(70))('user');
    state.profileVault[state.profiles.activeId] = snapshotWorkout(state);
    users[id] = { id: id, name: clean, created: (opts && opts.now) || Date.now() };
    state.profiles.activeId = id;
    applyWorkoutSlice(state, freshWorkoutSlice(opts && opts.id));
    return { ok: true, message: 'Profile ' + clean + ' is ready. Previous data stayed on its own profile.', id: id };
  }
  function deleteProfile(state, name, opts) {
    opts = opts || {};
    const users = state.profiles.users;
    const id = Object.keys(users).find(function (k) { return users[k].name.toLowerCase() === String(name || '').trim().toLowerCase(); });
    if (!id) return { ok: false, message: 'No profile with that name.' };
    if (Object.keys(users).length <= 1) return { ok: false, message: 'Keep at least one profile.' };
    if (!opts.confirmed) return { ok: false, reason: 'confirm', message: 'Confirm delete for ' + users[id].name + '.' };
    const backup = { user: clone(users[id]), vault: clone(state.profileVault[id] || (id === state.profiles.activeId ? snapshotWorkout(state) : null)) };
    if (state.profiles.activeId === id) {
      const next = Object.keys(users).find(function (k) { return k !== id; });
      delete users[id];
      state.profiles.activeId = next;
      if (state.profileVault[next]) applyWorkoutSlice(state, state.profileVault[next]);
    } else delete users[id];
    delete state.profileVault[id];
    return { ok: true, message: 'Deleted profile ' + name + '.', backup: backup };
  }

  function newReportId(rand) {
    const n = rand ? Math.floor(rand() * 1e9).toString(36) : Math.random().toString(36).slice(2, 10);
    return 'rpt_' + n + Date.now().toString(36);
  }
  function buildBugPayload(input) {
    input = input || {};
    if (input.company) return { ok: false, error: 'rejected' };
    const message = String(input.message || '').trim();
    if (!message) return { ok: false, error: 'message' };
    if (message.length > BUG_MAX) return { ok: false, error: 'too-large' };
    const contact = input.contact ? String(input.contact).trim().slice(0, 120) : '';
    let diagnostics = null;
    if (input.includeDiagnostics) {
      const d = input.diagnostics || {};
      diagnostics = {
        version: String(d.version || '').slice(0, 40),
        platform: String(d.platform || '').slice(0, 40),
        skin: String(d.skin || '').slice(0, 40),
        viewport: String(d.viewport || '').slice(0, 40),
        saveState: String(d.saveState || '').slice(0, 40),
        lastError: String(d.lastError || '').slice(0, 300)
      };
    }
    const id = input.id && /^rpt_[a-zA-Z0-9_-]{6,80}$/.test(input.id) ? input.id : newReportId(input.rand);
    return { ok: true, payload: { id: id, message: message, contact: contact, version: String(input.version || '').slice(0, 40), platform: String(input.platform || '').slice(0, 40), skin: String(input.skin || '').slice(0, 40), diagnostics: diagnostics, company: '' } };
  }
  function interpretBugResponse(bodyText, sentId) {
    if (bodyText == null || bodyText === '') return { confirmed: false, reason: 'empty' };
    let json;
    try { json = JSON.parse(bodyText); } catch (e) { return { confirmed: false, reason: 'unparseable' }; }
    if (!json || json.ok !== true || !json.id) return { confirmed: false, reason: 'not-ack' };
    if (sentId && String(json.id) !== String(sentId)) return { confirmed: false, reason: 'id-mismatch' };
    return { confirmed: true, id: String(json.id), duplicate: !!json.duplicate };
  }
  function bugFeatureStatus(config) {
    config = config || {};
    if (!config.endpoint) return 'unconfigured';
    if (!config.verified) return 'pending';
    return 'ready';
  }

  function parseHHMM(s) {
    const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = +m[1], min = +m[2];
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }
  function inQuietHours(minute, quiet) {
    if (!quiet || !quiet.enabled) return false;
    const s = parseHHMM(quiet.start), e = parseHHMM(quiet.end);
    if (s == null || e == null || s === e) return false;
    if (s < e) return minute >= s && minute < e;
    return minute >= s || minute < e;
  }
  function localParts(ts, offsetMinutes) {
    const d = new Date(ts + offsetMinutes * 60000);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate(), wd: d.getUTCDay(), minute: d.getUTCHours() * 60 + d.getUTCMinutes(), stamp: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) };
  }
  function median(nums) {
    const a = nums.slice().sort(function (x, y) { return x - y; });
    const mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
  }
  function inferSchedule(history, opts) {
    opts = opts || {};
    const settings = opts.settings || defaultSettings();
    const note = settings.notifications || {};
    if (!note.enabled) return { active: false, reason: 'disabled' };
    const offset = Number.isFinite(opts.offsetMinutes) ? opts.offsetMinutes : 0;
    const now = opts.now || Date.now();
    const nowP = localParts(now, offset);
    if (note.manualTime) {
      const minute = parseHHMM(note.manualTime);
      if (minute == null) return { active: false, reason: 'manual-time' };
      const days = note.manualDays && note.manualDays.length ? note.manualDays : [nowP.wd];
      if (days.indexOf(nowP.wd) < 0) return { active: false, reason: 'manual-day' };
      return scheduleFromMinute(minute, nowP, settings, 'manual');
    }
    if (!note.learning) return { active: false, reason: 'learning-off' };
    const rows = (history || []).filter(function (h) { return historyTs(h); }).slice().sort(function (a, b) { return historyTs(a) - historyTs(b); });
    if (rows.length < 4) return { active: false, reason: 'few-samples' };
    const first = historyTs(rows[0]), last = historyTs(rows[rows.length - 1]);
    if (last - first < 10 * 86400000) return { active: false, reason: 'short-span' };
    for (let i = 1; i < rows.length; i++) if (historyTs(rows[i]) - historyTs(rows[i - 1]) > 10 * 86400000) return { active: false, reason: 'missed-gap' };
    const offsets = rows.map(function (h) { return h.timezoneOffsetMinutes; }).filter(function (n) { return typeof n === 'number'; });
    if (offsets.length && Math.max.apply(null, offsets) - Math.min.apply(null, offsets) > 120) return { active: false, reason: 'timezone-shift' };
    const byDay = {};
    rows.forEach(function (h) {
      const p = localParts(historyTs(h), offset);
      if (!byDay[p.wd]) byDay[p.wd] = [];
      byDay[p.wd].push(p);
    });
    let best = null;
    Object.keys(byDay).forEach(function (wd) {
      const list = byDay[wd];
      if (list.length < 3) return;
      const weeks = {};
      list.forEach(function (p) { weeks[Math.floor(p.stamp / (7 * 86400000))] = true; });
      if (Object.keys(weeks).length < 2) return;
      const med = median(list.map(function (p) { return p.minute; }));
      const dev = Math.max.apply(null, list.map(function (p) { return Math.abs(p.minute - med); }));
      if (dev > 75) return;
      const cand = { wd: +wd, minute: med, samples: list.length };
      if (!best || cand.samples > best.samples || (cand.wd === nowP.wd && best.wd !== nowP.wd)) best = cand;
    });
    if (!best) return { active: false, reason: 'not-consistent' };
    if (best.wd !== nowP.wd) return { active: false, reason: 'not-today', candidate: best };
    return scheduleFromMinute(best.minute, nowP, settings, 'learned', best.samples);
  }
  function scheduleFromMinute(minute, nowP, settings, source, samples) {
    const quiet = settings.quietHours || {};
    const countdownMinute = (minute - 60 + 1440) % 1440;
    const sneak = !!settings.notifications.sneakPeek && !inQuietHours(minute, quiet);
    const countdown = !!settings.notifications.countdown && !inQuietHours(countdownMinute, quiet);
    return { active: sneak || countdown, reason: source, minute: minute, countdownMinute: countdownMinute, sneak: sneak, countdown: countdown, samples: samples || 0, label: 'Countdown to pump:', sneakLabel: "Here's a sneak peek of today's workout!" };
  }

  function recoverStored(primaryText, tmpText) {
    function parse(t) { if (t == null) return null; try { return { ok: true, value: JSON.parse(t) }; } catch (e) { return { ok: false }; } }
    const p = parse(primaryText);
    if (p && p.ok) return { ok: true, value: p.value, source: 'primary' };
    const t = parse(tmpText);
    if (t && t.ok) return { ok: true, value: t.value, source: 'tmp', recovered: true };
    if (primaryText == null && tmpText == null) return { ok: true, value: undefined, source: 'empty' };
    return { ok: false, source: 'none', error: true };
  }
  function planAtomicWrite(key, value) {
    const json = JSON.stringify(value);
    const tmp = key + '__tmp';
    return [{ op: 'set', key: tmp, value: json }, { op: 'set', key: key, value: json }, { op: 'remove', key: tmp }];
  }
  function pushSnapshot(ring, snap, limit) {
    const next = (ring || []).concat([snap]);
    const cap = limit || 5;
    while (next.length > cap) next.shift();
    return next;
  }
  function storageCapability(env) {
    env = env || {};
    if (env.nativeSaf) return 'saf';
    if (env.directoryPicker && !env.mobileWeb) return 'directory-picker';
    return 'download-fallback';
  }
  function shortcutsAllowed(meta) {
    meta = meta || {};
    if (meta.typing || meta.consoleFocused) return false;
    return true;
  }
  const HOLD_REPEAT = { weightUp: true, weightDown: true, repsUp: true, repsDown: true };
  function isHoldRepeatAction(action) { return !!HOLD_REPEAT[action]; }
  const DEFAULT_INPUT_MAP = {
    focusPrev: ['ArrowUp', 'ArrowLeft', 'DpadUp', 'DpadLeft'],
    focusNext: ['ArrowDown', 'ArrowRight', 'DpadDown', 'DpadRight'],
    select: ['Enter', 'GamepadA', 'GamepadCross'],
    logSet: ['Space', 'GamepadY', 'GamepadTriangle'],
    weightDown: ['[', 'GamepadLB', 'GamepadL1'],
    weightUp: [']', 'GamepadRB', 'GamepadR1'],
    repsDown: ['-', 'GamepadLT', 'GamepadL2'],
    repsUp: ['=', 'GamepadRT', 'GamepadR2'],
    manageSets: ['KeyS', 'GamepadX', 'GamepadSquare'],
    back: ['Escape', 'GamepadB', 'GamepadCircle'],
    toggleMini: ['KeyM', 'GamepadView', 'GamepadCreate'],
    finishChord: ['Ctrl+Shift+KeyF', 'GamepadMenuHold', 'GamepadOptionsHold']
  };
  function inputMap(custom, psSwap) {
    const map = clone(DEFAULT_INPUT_MAP);
    if (custom && typeof custom === 'object') {
      Object.keys(custom).forEach(function (k) { if (Array.isArray(custom[k]) && map[k]) map[k] = custom[k].slice(); });
    }
    if (psSwap) {
      map.select = map.select.map(function (k) { return k === 'GamepadCross' ? 'GamepadCircle' : k; });
      map.back = map.back.map(function (k) { return k === 'GamepadCircle' ? 'GamepadCross' : k; });
    }
    return map;
  }
  function promptFor(action, lastInput, map) {
    const keys = (map && map[action]) || DEFAULT_INPUT_MAP[action] || [];
    const want = lastInput === 'xbox' ? 'Gamepad' : lastInput === 'playstation' ? 'Gamepad' : lastInput === 'mouse' ? '' : '';
    if (lastInput === 'mouse') return 'click';
    if (lastInput === 'xbox' || lastInput === 'playstation') {
      const table = lastInput === 'xbox'
        ? { GamepadA: 'A', GamepadB: 'B', GamepadX: 'X', GamepadY: 'Y', GamepadLB: 'LB', GamepadRB: 'RB', GamepadLT: 'LT', GamepadRT: 'RT', GamepadView: 'View', GamepadMenuHold: 'Menu' }
        : { GamepadCross: 'Cross', GamepadCircle: 'Circle', GamepadSquare: 'Square', GamepadTriangle: 'Triangle', GamepadL1: 'L1', GamepadR1: 'R1', GamepadL2: 'L2', GamepadR2: 'R2', GamepadCreate: 'Create', GamepadOptionsHold: 'Options' };
      for (let i = 0; i < keys.length; i++) if (table[keys[i]]) return table[keys[i]];
    }
    for (let i = 0; i < keys.length; i++) if (keys[i].indexOf('Gamepad') !== 0 && keys[i].indexOf('Dpad') !== 0) return keys[i].replace('Key', '').replace('Arrow', '');
    return keys[0] || '';
  }

  function getSkin(state, slug) {
    const id = slug || (state && state.skinId) || 'starclassic';
    const builtin = builtinSkins().find(function (s) { return s.slug === id; });
    if (builtin) return mergeSkin(builtin, state && state.skinOverrides && state.skinOverrides[id]);
    const community = ((state && state.communitySkins) || []).find(function (s) { return s.slug === id; });
    if (community) return mergeSkin(community, state.skinOverrides && state.skinOverrides[id]);
    return mergeSkin(builtinSkins()[0], null);
  }
  function mergeSkin(pack, overrides) {
    const skin = clone(pack);
    if (overrides && typeof overrides === 'object') {
      if (overrides.palette) skin.palette = Object.assign({}, skin.palette, overrides.palette);
      if (overrides.timer) skin.timer = Object.assign({}, skin.timer, overrides.timer);
      if (overrides.metronome) skin.metronome = Object.assign({}, skin.metronome, overrides.metronome);
      if (overrides.font) skin.font = overrides.font;
      if (overrides.density) skin.density = overrides.density;
    }
    if (skin.timer) skin.timer.opacity = clampOpacity(skin.timer.opacity, 0.6);
    if (skin.metronome) skin.metronome.opacity = clampOpacity(skin.metronome.opacity, 0.6);
    return skin;
  }
  function effectivePalette(state) {
    const skin = getSkin(state);
    if (skin.slug === 'starclassic') {
      const t = (state.themes && state.themes[state.activeThemeId]) || DATA.originalThemes.midnight;
      const overrides = (state.skinOverrides && state.skinOverrides.starclassic && state.skinOverrides.starclassic.palette) || {};
      return Object.assign({ bg: t.bg, card: t.card, border: t.border, text: t.text, accent: t.accent, accent2: '#38BDF8', onAccent: '#000000', muted: '#94A3B8', surface: t.bg, font: t.font }, overrides);
    }
    return Object.assign({ font: skin.font }, skin.palette);
  }
  function nextLine(index, mode, rand) {
    const lines = ORIGINAL_LINES;
    if (!lines.length) return { text: 'Next set.', attributed: false };
    if (mode === 'random') {
      const i = Math.floor((rand ? rand() : Math.random()) * lines.length);
      return { text: lines[i].text, id: lines[i].id, attributed: false };
    }
    const line = lines[((index % lines.length) + lines.length) % lines.length];
    return { text: line.text, id: line.id, attributed: false };
  }
  function autoDay(routine, now) {
    const keys = Object.keys((routine && routine.days) || {});
    if (!keys.length) return '';
    const today = (now ? new Date(now) : new Date()).getDay();
    const idx = (today >= 1 && today <= 5) ? today - 1 : 0;
    return keys[idx] || keys[0];
  }

  return {
    DATA: DATA, SCHEMA: SCHEMA, LEGACY_KEYS: LEGACY_KEYS, APP_KEYS: APP_KEYS, SKIN_SLUGS: SKIN_SLUGS,
    MUSCLE_FILTERS: MUSCLE_FILTERS, SET_TYPES: SET_TYPES, ORIGINAL_LINES: ORIGINAL_LINES, BUG_MAX: BUG_MAX,
    DEFAULT_INPUT_MAP: DEFAULT_INPUT_MAP, clone: clone, createIds: createIds, decodeStored: decodeStored,
    isSicKey: isSicKey, keysToClear: keysToClear, formatIsoOffset: formatIsoOffset, defaultSettings: defaultSettings,
    builtinSkins: builtinSkins, migrate: migrate, stripIds: stripIds, freshWorkoutSlice: freshWorkoutSlice,
    snapshotWorkout: snapshotWorkout, visibleExercises: visibleExercises, ensureExerciseSession: ensureExerciseSession,
    sessionKey: sessionKey, blankSession: blankSession, previousFor: previousFor, findCurrent: findCurrent,
    updateSetField: updateSetField, nudgeSet: nudgeSet, logCurrentSet: logCurrentSet, undoLast: undoLast,
    restRemaining: restRemaining, metronomeShouldClick: metronomeShouldClick, metronomePartner: metronomePartner,
    finishWorkout: finishWorkout, addSet: addSet, deleteSet: deleteSet, addExercise: addExercise, removeExercise: removeExercise,
    setIsEmpty: setIsEmpty, queryHistory: queryHistory, recalcPRs: recalcPRs, editHistory: editHistory,
    validateRoutineObject: validateRoutineObject, exportXml: exportXml, importXml: importXml, previewImport: previewImport,
    applyImport: applyImport, validateCommunityPack: validateCommunityPack, miniHitTest: miniHitTest,
    parseCommand: parseCommand, applyCommand: applyCommand, createProfile: createProfile, deleteProfile: deleteProfile,
    buildBugPayload: buildBugPayload, interpretBugResponse: interpretBugResponse, bugFeatureStatus: bugFeatureStatus,
    newReportId: newReportId, inferSchedule: inferSchedule, inQuietHours: inQuietHours, recoverStored: recoverStored,
    planAtomicWrite: planAtomicWrite, pushSnapshot: pushSnapshot, storageCapability: storageCapability,
    shortcutsAllowed: shortcutsAllowed, isHoldRepeatAction: isHoldRepeatAction, inputMap: inputMap, promptFor: promptFor,
    getSkin: getSkin, effectivePalette: effectivePalette, nextLine: nextLine, statsForEntries: statsForEntries,
    muscleKey: muscleKey, historyTs: historyTs, activePartner: activePartner, clampOpacity: clampOpacity,
    hexToRgb: hexToRgb, autoDay: autoDay, muscleForExercise: muscleForExercise, fieldPair: fieldPair, hintField: hintField,
    setDone: setDone
  };
});
