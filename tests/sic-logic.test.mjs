import { createRequire } from 'module';
import test from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const SIC = require('../js/sic-logic.js');
const DATA = require('../js/sic-data.js');

function fresh(extra) {
  const migrated = SIC.migrate({ decoded: Object.assign({}, extra || {}), raw: {} }, { now: 1_700_000_000_000, id: SIC.createIds(1) });
  return migrated.state;
}
function withSession(state) {
  const ex = state.routines.bls5.days.Push[0];
  SIC.ensureExerciseSession(state, ex, SIC.createIds(10));
  return ex;
}

test('migration keeps legacy workout data and backs up raw keys', () => {
  const routines = SIC.clone(DATA.defaultRoutines);
  routines.bls5.days.Push[0].sets[0].weight = '225';
  const history = [{ id: 'log_old', ts: 1700000000000, date: '11/14/2023', routineName: 'Bigger Leaner Stronger (5-Day)', dayName: 'Push', exercises: [{ exercise: 'Barbell Bench Press', muscle: 'CHEST', partner: 'batman', sets: [{ type: 'Normal', weight: '225', reps: '5' }] }] }];
  const raw = {
    ss_routines: JSON.stringify(routines),
    ss_history: JSON.stringify(history),
    ss_current_session: JSON.stringify({ 'bls5_Push_0': { notes: 'tight', sets: [{ type: 'Normal', weight: '185', reps: '5', done: true }] } }),
    ss_prs: JSON.stringify({ 'Barbell Bench Press': 205 }),
    ss_custom_themes: JSON.stringify(DATA.originalThemes),
    ss_duo_mode: 'true',
    ss_partner_names: JSON.stringify({ batman: 'Alex', robin: 'Sam' }),
    ss_active_theme_id: 'barbie',
    ss_sound: 'false',
    ss_fx: JSON.stringify({ type: 'snow', intensity: 3 }),
    ss_rest: JSON.stringify({ batman: { duration: 90, endAt: 1700000005000, total: 90 }, robin: { duration: 120, endAt: 0, total: 0 } })
  };
  const decoded = {};
  Object.keys(raw).forEach((k) => { decoded[k] = SIC.decodeStored(raw[k]); });
  const result = SIC.migrate({ decoded, raw }, { now: 1700000001000, id: SIC.createIds(1) });
  assert.equal(result.backup.legacy.ss_routines, raw.ss_routines);
  assert.equal(result.backup.legacy.ss_history, raw.ss_history);
  assert.equal(result.backup.legacy.ss_prs, raw.ss_prs);
  assert.equal(result.state.duoMode, true);
  assert.equal(result.state.partnerNames.batman, 'Alex');
  assert.equal(result.state.activeThemeId, 'barbie');
  assert.equal(result.state.soundEnabled, false);
  assert.equal(result.state.fx.type, 'snow');
  assert.equal(result.state.rest.batman.duration, 90);
  assert.equal(result.state.rest.batman.endAt, 1700000005000);
  assert.equal(result.state.history[0].id, 'log_old');
  assert.equal(result.state.routines.bls5.days.Push[0].sets[0].weight, '225');
  assert.equal(result.state.personalRecords.batman['Barbell Bench Press'].weight, 205);
  const key = SIC.sessionKey('bls5', 'Push', result.state.routines.bls5.days.Push[0].id);
  assert.equal(result.state.currentSession[key].notes, 'tight');
  assert.equal(result.state.currentSession[key].sets[0].weight, '185');
  assert.equal(result.state.currentSession[key].sets[0].done, true);
  assert.ok(result.state.currentSession[key].sets[0].id);
  assert.equal(result.state.currentSession['bls5_Push_0'], undefined);
});

test('missing saves fall back to unchanged BLS5 and persisted routine id', () => {
  const state = fresh();
  assert.deepEqual(SIC.stripIds(state.routines.bls5), SIC.stripIds(DATA.defaultRoutines.bls5));
  assert.deepEqual(SIC.stripIds(DATA.defaultRoutines.bls5.days.Legs[1]), { name: 'Lying Leg Curl', target: '4-6 Reps', muscle: 'QUADS', sets: DATA.defaultRoutines.bls5.days.Legs[1].sets });
  const custom = SIC.clone(DATA.defaultRoutines);
  custom.mine = { id: 'mine', name: 'Mine', days: { A: [{ name: 'Plank', target: '1', muscle: 'CORE', sets: [] }] } };
  const picked = SIC.migrate({ decoded: { ss_routines: custom, ss_active_routine_id: 'mine' }, raw: {} }, { now: 1, id: SIC.createIds(1) }).state;
  assert.equal(picked.activeRoutineId, 'mine');
});

test('new session inputs are blank and resumed drafts keep typed values', () => {
  const state = fresh();
  const ex = state.routines.bls5.days.Push[0];
  const blank = SIC.blankSession(ex, SIC.createIds(3));
  assert.equal(blank.sets[0].weight, '');
  assert.equal(blank.sets[0].reps, '');
  assert.equal(blank.sets[0].hintWeight, '205');
  assert.equal(blank.sets[0].hintReps, '5');
  assert.equal(blank.sets[0].done, false);
  const resumed = fresh();
  const key = SIC.sessionKey('bls5', 'Push', resumed.routines.bls5.days.Push[0].id);
  resumed.currentSession[key] = { notes: '', sets: [{ id: 's', type: 'Normal', weight: '135', reps: '3', p2Weight: '', p2Reps: '', done: false, p2Done: false }] };
  const data = SIC.ensureExerciseSession(resumed, resumed.routines.bls5.days.Push[0]);
  assert.equal(data.sets[0].weight, '135');
  assert.equal(SIC.previousFor(resumed, 'Barbell Bench Press', 'batman', 0), null);
});

test('previous column comes from history and is not copied into the input', () => {
  const state = fresh();
  state.history.push({ id: 'h1', ts: 10, exercises: [{ exercise: 'Barbell Bench Press', muscle: 'CHEST', partner: 'batman', sets: [{ weight: '185', reps: '5' }] }] });
  const prev = SIC.previousFor(state, 'Barbell Bench Press', 'batman', 0);
  assert.deepEqual(prev, { weight: '185', reps: '5', type: 'Normal' });
  const ex = withSession(state);
  const data = SIC.ensureExerciseSession(state, ex);
  assert.equal(data.sets[0].weight, '');
});

test('LOG SET marks only the current set, locks out a double tap, and undo restores it', () => {
  const state = fresh();
  const ex = withSession(state);
  const data = SIC.ensureExerciseSession(state, ex);
  SIC.updateSetField(state, ex.id, data.sets[0].id, 'weight', '205', 'batman');
  SIC.updateSetField(state, ex.id, data.sets[0].id, 'reps', '5', 'batman');
  const runtime = {};
  const now = 5_000_000;
  const first = SIC.logCurrentSet(state, runtime, now);
  assert.equal(first.ok, true);
  assert.equal(data.sets[0].done, true);
  assert.equal(data.sets[1].done, false);
  assert.equal(state.rest.batman.endAt, now + 240000);
  assert.equal(state.focus.setId, data.sets[1].id);
  const second = SIC.logCurrentSet(state, runtime, now + 100);
  assert.equal(second.reason, 'lockout');
  assert.equal(data.sets[1].done, false);
  assert.equal(SIC.undoLast(state, runtime, now + 200).ok, true);
  assert.equal(data.sets[0].done, false);
  assert.equal(state.rest.batman.endAt, 0);
});

test('FINISH WORKOUT confirms, saves logged sets only, and silences timers', () => {
  const state = fresh();
  state.settings.tempo.running = true;
  state.rest.batman.endAt = 9_000_000;
  state.rest.robin.endAt = 9_000_000;
  const ex = withSession(state);
  const data = SIC.ensureExerciseSession(state, ex);
  data.sets[0].weight = '205';
  data.sets[0].reps = '5';
  data.sets[0].done = true;
  data.sets[1].weight = '';
  data.sets[1].done = false;
  const denied = SIC.finishWorkout(state, { confirmed: false, now: 1000 });
  assert.equal(denied.reason, 'confirm');
  assert.equal(state.history.length, 0);
  const done = SIC.finishWorkout(state, { confirmed: true, now: 2000, id: 'log_test', dateLabel: '1/2/2026' });
  assert.equal(done.ok, true);
  assert.equal(done.silence, true);
  assert.equal(done.record.exercises[0].sets.length, 1);
  assert.equal(done.record.exercises[0].sets[0].weight, '205');
  assert.equal(state.rest.batman.endAt, 0);
  assert.equal(state.rest.robin.endAt, 0);
  assert.equal(state.settings.tempo.running, false);
  assert.equal(data.sets[0].done, false);
  const empty = fresh();
  withSession(empty);
  assert.equal(SIC.finishWorkout(empty, { confirmed: true, now: 1 }).reason, 'incomplete');
});

test('duo handoff flips the logger and the metronome pauses only when both rest', () => {
  const state = fresh();
  state.duoMode = true;
  const ex = withSession(state);
  const data = SIC.ensureExerciseSession(state, ex);
  const runtime = {};
  const now = 10_000;
  const logged = SIC.logCurrentSet(state, runtime, now);
  assert.equal(logged.partner, 'batman');
  assert.equal(logged.flipped, true);
  assert.equal(state.activePartner, 'robin');
  assert.equal(data.sets[0].p2Done, false);
  state.settings.tempo.running = true;
  state.rest.batman.endAt = now + 5000;
  state.rest.robin.endAt = 0;
  assert.equal(SIC.metronomeShouldClick(state, now), true);
  assert.equal(SIC.metronomePartner(state, now), 'robin');
  state.rest.robin.endAt = now + 5000;
  assert.equal(SIC.metronomeShouldClick(state, now), false);
  const one = SIC.finishWorkout(state, { confirmed: true, now: now + 10, partners: ['batman'], id: 'one' });
  assert.equal(one.ok, true);
  assert.equal(one.record.exercises.every((e) => e.partner === 'batman'), true);
  assert.equal(state.settings.tempo.running, false);
});

test('empty sets delete immediately and logged sets ask before undo', () => {
  const state = fresh();
  const ex = withSession(state);
  const data = SIC.ensureExerciseSession(state, ex);
  const empty = data.sets[2];
  const runtime = {};
  const gone = SIC.deleteSet(state, ex.id, empty.id, { now: 1, runtime });
  assert.equal(gone.ok, true);
  assert.equal(gone.empty, true);
  assert.equal(data.sets.length, 2);
  assert.equal(SIC.undoLast(state, runtime, 2).ok, true);
  assert.equal(data.sets.length, 3);
  data.sets[0].done = true;
  const blocked = SIC.deleteSet(state, ex.id, data.sets[0].id, { now: 3 });
  assert.equal(blocked.reason, 'confirm');
  assert.equal(SIC.deleteSet(state, ex.id, data.sets[0].id, { now: 4, confirmed: true }).ok, true);
});

test('today-only exercise changes do not rewrite the routine or history', () => {
  const state = fresh();
  const before = state.routines.bls5.days.Push.length;
  state.history.push({ id: 'keep', ts: 1, exercises: [{ exercise: 'Barbell Bench Press', muscle: 'CHEST', sets: [{ weight: '100', reps: '5' }] }] });
  const added = SIC.addExercise(state, { name: 'Cable Fly' }, 'today', SIC.createIds(8));
  assert.equal(added.mode, 'today');
  assert.equal(state.routines.bls5.days.Push.length, before);
  assert.equal(SIC.visibleExercises(state).some((v) => v.exercise.name === 'Cable Fly'), true);
  const removed = SIC.removeExercise(state, state.routines.bls5.days.Push[0].id, 'today', { confirmed: true });
  assert.equal(removed.historyPreserved, true);
  assert.equal(state.history[0].exercises[0].exercise, 'Barbell Bench Press');
  assert.equal(SIC.visibleExercises(state).some((v) => v.exercise.name === 'Barbell Bench Press'), false);
  assert.equal(state.routines.bls5.days.Push[0].name, 'Barbell Bench Press');
  const permanent = SIC.addExercise(state, { name: 'Push-ups' }, 'permanent', SIC.createIds(20));
  assert.equal(state.routines.bls5.days.Push.some((e) => e.id === permanent.exercise.id), true);
  assert.equal(state.routines.bls5.days.Push.find((e) => e.name === 'Push-ups').sets[0].weight, '');
});

test('XML rejects DTD and entities, round-trips, and previews conflicts', () => {
  const state = fresh();
  state.history.push({ id: 'log_a', ts: 50, iso: '2026-01-01T12:00:00-05:00', date: '1/1/2026', routineId: 'bls5', routineName: 'Bigger Leaner Stronger (5-Day)', dayName: 'Push', duo: false, exercises: [{ exercise: 'Barbell Bench Press', exerciseId: 'e', muscle: 'CHEST', partner: 'batman', sets: [{ type: 'Normal', weight: '205', reps: '5' }] }] });
  const xml = SIC.exportXml(state, 'bundle', { now: 50, units: 'lb' });
  const back = SIC.importXml(xml);
  assert.equal(back.ok, true);
  assert.equal(back.doc.routines.bls5.days.Push[0].sets[0].weight, '205');
  assert.equal(back.doc.history[0].exercises[0].sets[0].reps, '5');
  const again = SIC.exportXml({ routines: back.doc.routines, history: back.doc.history, settings: { units: 'lb' } }, 'bundle', { now: 50, units: 'lb' });
  assert.equal(SIC.importXml(again).ok, true);
  assert.equal(SIC.importXml('<!DOCTYPE sic [<!ENTITY xxe SYSTEM "http://evil.example/x">]><sic version="1">&xxe;</sic>').ok, false);
  assert.equal(SIC.importXml('<sic version="1" kind="bundle">&secret;</sic>').errors[0], 'entity-rejected');
  assert.equal(SIC.importXml('<?xml version="1.0"?><sic version="1" kind="history"></sic>').ok, false);
  const preview = SIC.previewImport(state, back.doc);
  assert.equal(preview.routineConflicts[0].id, 'bls5');
  assert.equal(preview.historyConflicts[0].id, 'log_a');
  const applied = SIC.applyImport(fresh(), back.doc, 'merge');
  assert.equal(applied.ok, true);
  assert.equal(applied.backup.routines.bls5.name, DATA.defaultRoutines.bls5.name);
});

test('history is oldest first, reverses, filters muscle, and recalc drops deleted PRs', () => {
  const state = fresh();
  state.history = [
    { id: 'new', ts: 300, exercises: [{ exercise: 'Squat', muscle: 'QUADS', partner: 'batman', sets: [{ type: 'Normal', weight: '300', reps: '3' }] }] },
    { id: 'old', ts: 100, exercises: [{ exercise: 'Bench', muscle: 'CHEST', partner: 'batman', sets: [{ type: 'Normal', weight: '185', reps: '5' }] }] }
  ];
  assert.deepEqual(SIC.queryHistory(state.history).map((h) => h.id), ['old', 'new']);
  assert.deepEqual(SIC.queryHistory(state.history, { reverse: true }).map((h) => h.id), ['new', 'old']);
  assert.equal(SIC.queryHistory(state.history, { muscle: 'chest' })[0].id, 'old');
  assert.equal(SIC.queryHistory(state.history, { muscle: 'hamstrings' }).length, 0);
  state.personalRecords = SIC.recalcPRs(state.history);
  assert.equal(state.personalRecords.batman.Squat.weight, 300);
  SIC.editHistory(state, 'new', (rec) => { rec.exercises = []; });
  assert.equal(state.personalRecords.batman.Squat, undefined);
  assert.equal(state.personalRecords.batman.Bench.weight, 185);
});

test('share-code validation rejects junk and accepts a routine object', () => {
  assert.equal(SIC.validateRoutineObject({ name: 'X', days: { Push: [{ name: 'Bench', sets: [{ type: 'Normal', weight: '1', reps: '1' }] }] } }).ok, true);
  assert.equal(SIC.validateRoutineObject({ name: '', days: {} }).ok, false);
  assert.equal(SIC.validateRoutineObject({ name: 'X', days: { A: 'nope' } }).ok, false);
  assert.equal(SIC.validateRoutineObject({ name: 'X', days: { A: [{ name: '<script>' }] }, evil: '<script>' }).ok, false);
});

test('console commands match the brief, including reserved and future', () => {
  const state = fresh();
  assert.equal(SIC.applyCommand(state, SIC.parseCommand('/soundsoff')).message, 'Sounds off.');
  assert.equal(state.soundEnabled, false);
  assert.equal(SIC.applyCommand(state, SIC.parseCommand('/soundson')).ok, true);
  assert.equal(SIC.applyCommand(state, SIC.parseCommand('/skin=irondial')).ok, true);
  assert.equal(state.skinId, 'irondial');
  assert.match(SIC.applyCommand(state, SIC.parseCommand('/skin=nope')).message, /Unknown skin/);
  assert.equal(SIC.applyCommand(state, SIC.parseCommand('/mcphersonstrut')).message, 'Reserved. No effect.');
  assert.equal(state.skinId, 'irondial');
  assert.equal(SIC.applyCommand(state, SIC.parseCommand('/msg.user=hello')).message, 'not available yet');
  assert.equal(SIC.applyCommand(state, SIC.parseCommand('/exit')).message, 'saved, safe to close');
  assert.deepEqual(SIC.applyCommand(state, SIC.parseCommand('/endworkout')).actions, ['confirm-finish']);
  assert.equal(SIC.applyCommand(state, SIC.parseCommand('/bugreport=button stuck')).text, 'button stuck');
  assert.equal(SIC.applyCommand(state, SIC.parseCommand('/clearmessages')).actions[0], 'clear-console');
  assert.equal(SIC.applyCommand(state, SIC.parseCommand('/restart')).actions[1], 'restart');
  const made = SIC.applyCommand(state, SIC.parseCommand('/newuser=Casey'), { id: SIC.createIds(4), now: 9 });
  assert.equal(made.ok, true);
  assert.equal(state.profiles.users[state.profiles.activeId].name, 'Casey');
  assert.equal(state.history.length, 0);
  const needs = SIC.applyCommand(state, SIC.parseCommand('/deleteuser=Casey'));
  assert.equal(needs.reason, 'confirm');
  const removed = SIC.applyCommand(state, SIC.parseCommand('/deleteuser=Casey'), { confirmed: true });
  assert.equal(removed.ok, true);
  assert.ok(removed.backup.vault);
});

test('bug report stamps use the phone local wall clock', () => {
  const ts = Date.UTC(2026, 10, 12, 18, 43, 0);
  const d = new Date(ts);
  const label = SIC.formatLocalStamp(ts);
  assert.match(label, /^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} (AM|PM)$/);
  const hour12 = d.getHours() % 12 || 12;
  const ap = d.getHours() >= 12 ? 'PM' : 'AM';
  assert.equal(label, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getDate() + ', ' + hour12 + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap);
  assert.equal(SIC.formatLocalStamp('nope'), '');
  assert.equal(label.includes('T'), false);
});

test('bug reports are local records with context and no server ack', () => {
  const built = SIC.buildBugPayload({
    happened: 'Rest timer keeps going', steps: 'Log a set', severity: 'High',
    version: '1.2.0', platform: 'web', skin: 'starclassic', screen: '390x844',
    console: ['Saved'], actions: ['log-set'], rand: () => 0.1
  });
  assert.equal(built.ok, true);
  assert.match(built.payload.id, /^rpt_/);
  assert.equal(built.payload.happened, 'Rest timer keeps going');
  assert.equal(built.payload.severity, 'high');
  assert.equal(built.payload.screen, '390x844');
  assert.deepEqual(built.payload.actions, ['log-set']);
  assert.equal(JSON.stringify(built.payload).includes('routines'), false);
  assert.equal(SIC.buildBugPayload({ happened: '' }).error, 'message');
  assert.equal(SIC.buildBugPayload({ happened: 'x'.repeat(4097) }).error, 'too-large');
  assert.equal(SIC.applyCommand({ settings: {} }, SIC.parseCommand('/bugreport=button stuck')).actions[0], 'save-bug');
});

test('community skin packs reject scripts and executable keys', () => {
  const ok = SIC.validateCommunityPack({ schemaVersion: 1, slug: 'camp-night', name: 'Camp Night', layout: 'chalkboard', palette: { bg: '#112233', card: '#223344', border: '#334455', text: '#F8FAFC', accent: '#F59E0B' } });
  assert.equal(ok.ok, true);
  assert.equal(ok.pack.layout, 'chalkboard');
  assert.equal(SIC.validateCommunityPack({ schemaVersion: 1, slug: 'starclassic', name: 'Hijack', layout: 'starclassic' }).ok, false);
  assert.equal(SIC.validateCommunityPack({ schemaVersion: 1, slug: 'bad-pack', name: 'Bad', layout: 'not-real', script: 'alert(1)' }).ok, false);
  const svg = SIC.validateCommunityPack({ schemaVersion: 1, slug: 'svg-bad', name: 'SVG', assets: [{ mime: 'image/svg+xml', data: '<svg><script>alert(1)</script></svg>' }] });
  assert.equal(svg.ok, false);
  assert.equal(SIC.validateCommunityPack({ schemaVersion: 1, slug: 'remote', name: 'Remote', assets: [{ mime: 'image/png', data: 'https://example.com/a.png' }] }).ok, false);
});

test('mini hit testing follows each silhouette', () => {
  assert.equal(SIC.miniHitTest('card', 50, 50, 100, 100), true);
  assert.equal(SIC.miniHitTest('card', 1, 1, 100, 100), false);
  assert.equal(SIC.miniHitTest('stepped-l', 20, 20, 100, 100), true);
  assert.equal(SIC.miniHitTest('stepped-l', 80, 20, 100, 100), false);
  assert.equal(SIC.miniHitTest('stepped-l', 80, 75, 100, 100), true);
  assert.equal(SIC.miniHitTest('puck', 50, 50, 100, 100), true);
  assert.equal(SIC.miniHitTest('puck', 50, 8, 100, 100), true);
  assert.equal(SIC.miniHitTest('puck', 20, 20, 100, 100), false);
  assert.equal(SIC.miniHitTest('capsule', 50, 10, 100, 100), true);
  assert.equal(SIC.miniHitTest('capsule', 10, 50, 100, 100), false);
  assert.equal(SIC.miniHitTest('ticket', 50, 50, 100, 100), true);
  assert.equal(SIC.miniHitTest('ticket', 6, 50, 100, 100), false);
  assert.equal(SIC.miniHitTest('flower', 50, 50, 100, 100), true);
  assert.equal(SIC.miniHitTest('flower', 2, 2, 100, 100), false);
  assert.equal(SIC.miniHitTest('cassette', 50, 50, 100, 100), true);
  assert.equal(SIC.miniHitTest('rail', 80, 50, 100, 100), true);
});

test('storage recovery, scoped clear, atomic plan, and capability', () => {
  assert.equal(SIC.recoverStored('{"a":1}', '{"a":2}').source, 'primary');
  const recovered = SIC.recoverStored('{', '{"a":2}');
  assert.equal(recovered.recovered, true);
  assert.deepEqual(recovered.value, { a: 2 });
  assert.equal(SIC.recoverStored('{', '{').ok, false);
  assert.deepEqual(SIC.keysToClear(['ss_history', 'other_app', 'ss_skin']), ['ss_history', 'ss_skin']);
  const ops = SIC.planAtomicWrite('ss_history', [{ id: 1 }]);
  assert.deepEqual(ops.map((o) => o.op), ['set', 'set', 'remove']);
  assert.equal(ops[0].key, 'ss_history__tmp');
  assert.equal(SIC.storageCapability({ nativeSaf: true, directoryPicker: true }), 'saf');
  assert.equal(SIC.storageCapability({ directoryPicker: true, mobileWeb: false }), 'directory-picker');
  assert.equal(SIC.storageCapability({ directoryPicker: true, mobileWeb: true }), 'download-fallback');
  assert.equal(SIC.shortcutsAllowed({ typing: true }), false);
  assert.equal(SIC.shortcutsAllowed({ consoleFocused: true }), false);
  assert.equal(SIC.shortcutsAllowed({}), true);
  assert.equal(SIC.isHoldRepeatAction('weightUp'), true);
  assert.equal(SIC.isHoldRepeatAction('logSet'), false);
});

test('schedule inference stays quiet until history is consistent', () => {
  const settings = SIC.defaultSettings();
  settings.notifications.enabled = true;
  assert.equal(SIC.inferSchedule([], { settings, now: 1_700_000_000_000 }).reason, 'few-samples');
  const day = 86400000;
  const base = Date.parse('2026-01-05T15:00:00Z');
  const history = [];
  for (let i = 0; i < 4; i++) history.push({ id: 'w' + i, ts: base + i * 7 * day, exercises: [] });
  const learned = SIC.inferSchedule(history, { settings, now: base + 21 * day, offsetMinutes: 0 });
  assert.equal(learned.active, true);
  assert.equal(learned.countdown, true);
  assert.equal(learned.label, 'Countdown to pump:');
  settings.quietHours = { enabled: true, start: '14:00', end: '16:00' };
  const quiet = SIC.inferSchedule(history, { settings, now: base + 21 * day, offsetMinutes: 0 });
  assert.equal(quiet.sneak, false);
  settings.notifications.learning = false;
  settings.notifications.manualTime = '18:30';
  settings.notifications.manualDays = [1];
  settings.quietHours.enabled = false;
  const manual = SIC.inferSchedule(history, { settings, now: base + 21 * day, offsetMinutes: 0 });
  assert.equal(manual.reason, 'manual');
  assert.equal(manual.minute, 18 * 60 + 30);
  settings.notifications.enabled = false;
  assert.equal(SIC.inferSchedule(history, { settings, now: base }).reason, 'disabled');
});

test('original rest lines are unattributed and quotes are not invented', () => {
  SIC.ORIGINAL_LINES.forEach((line) => {
    assert.equal(line.attribution, undefined);
    assert.equal(line.author, undefined);
  });
  const line = SIC.nextLine(0, 'cycle');
  assert.equal(line.attributed, false);
  assert.match(line.text, /big dawg/i);
});

test('classic palette stays source-exact and other skins are distinct layouts', () => {
  const classic = SIC.getSkin({ skinId: 'starclassic', themes: DATA.originalThemes, activeThemeId: 'midnight' });
  assert.equal(classic.palette.bg, '#0B0F17');
  assert.equal(classic.palette.card, '#1E293B');
  assert.equal(classic.palette.border, '#334155');
  assert.equal(classic.palette.text, '#F8FAFC');
  assert.equal(classic.palette.accent, '#F59E0B');
  const layouts = new Set(SIC.builtinSkins().map((s) => s.layout + ':' + s.mini + ':' + s.popout));
  assert.equal(layouts.size, 8);
  const themed = fresh();
  themed.activeThemeId = 'barbie';
  assert.equal(SIC.effectivePalette(themed).accent, DATA.originalThemes.barbie.accent);
  themed.skinId = 'vinyldeck';
  assert.notEqual(SIC.effectivePalette(themed).bg, DATA.originalThemes.barbie.bg);
});

test('input prompts follow the last device and PS confirm can swap', () => {
  const map = SIC.inputMap(null, false);
  assert.equal(SIC.promptFor('logSet', 'keyboard', map), 'Space');
  assert.equal(SIC.promptFor('logSet', 'xbox', map), 'Y');
  assert.equal(SIC.promptFor('logSet', 'playstation', map), 'Triangle');
  assert.equal(SIC.promptFor('logSet', 'mouse', map), 'click');
  const swapped = SIC.inputMap(null, true);
  assert.ok(swapped.select.includes('GamepadCircle'));
  assert.ok(swapped.back.includes('GamepadCross'));
  assert.ok(map.finishChord.includes('Ctrl+Shift+KeyF'));
});

test('steppers change only the active partner and blank starts from zero', () => {
  const state = fresh();
  const ex = withSession(state);
  const data = SIC.ensureExerciseSession(state, ex);
  const set = data.sets[0];
  SIC.nudgeSet(state, ex.id, set.id, 'weight', 1, 'batman');
  assert.equal(set.weight, '2.5');
  assert.equal(set.p2Weight, '');
  state.duoMode = true;
  state.activePartner = 'robin';
  SIC.nudgeSet(state, ex.id, set.id, 'reps', 1, 'robin');
  assert.equal(set.p2Reps, '1');
  assert.equal(set.reps, '');
});
