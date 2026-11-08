/* Extracted from the Star Strength baseline. BLS5 content is unchanged. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SICData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
const exerciseDatabase = [
      { name: "Barbell Bench Press", muscle: "CHEST" },
      { name: "Incline Barbell Bench Press", muscle: "CHEST" },
      { name: "Decline Barbell Bench Press", muscle: "CHEST" },
      { name: "Dumbbell Bench Press", muscle: "CHEST" },
      { name: "Incline Dumbbell Bench Press", muscle: "CHEST" },
      { name: "Dumbbell Flyes", muscle: "CHEST" },
      { name: "Cable Crossover", muscle: "CHEST" },
      { name: "Push-ups", muscle: "CHEST" },
      { name: "Dips (Chest)", muscle: "CHEST" },
      { name: "Close-Grip Bench Press", muscle: "CHEST" },
      { name: "Barbell Deadlift", muscle: "BACK" },
      { name: "Conventional Deadlift", muscle: "BACK" },
      { name: "Sumo Deadlift", muscle: "BACK" },
      { name: "Barbell Row", muscle: "BACK" },
      { name: "Pendlay Row", muscle: "BACK" },
      { name: "One-Arm Dumbbell Row", muscle: "BACK" },
      { name: "Wide-Grip Lat Pulldown", muscle: "BACK" },
      { name: "Close-Grip Lat Pulldown", muscle: "BACK" },
      { name: "Seated Cable Row", muscle: "BACK" },
      { name: "T-Bar Row", muscle: "BACK" },
      { name: "Pull-ups", muscle: "BACK" },
      { name: "Chin-ups", muscle: "BACK" },
      { name: "Straight-Arm Pulldown", muscle: "BACK" },
      { name: "Standing Overhead Shoulder Press", muscle: "SHOULDERS" },
      { name: "Seated Dumbbell Shoulder Press", muscle: "SHOULDERS" },
      { name: "Side Lateral Raise", muscle: "SHOULDERS" },
      { name: "Rear Delt Lateral Raise", muscle: "SHOULDERS" },
      { name: "Front Plate Raise", muscle: "SHOULDERS" },
      { name: "Upright Row", muscle: "SHOULDERS" },
      { name: "Barbell Squat", muscle: "QUADS" },
      { name: "Front Squat", muscle: "QUADS" },
      { name: "Goblet Squat", muscle: "QUADS" },
      { name: "Leg Press", muscle: "QUADS" },
      { name: "Bulgarian Split Squat", muscle: "QUADS" },
      { name: "Leg Extension", muscle: "QUADS" },
      { name: "Hack Squat", muscle: "QUADS" },
      { name: "Lying Leg Curl", muscle: "QUADS" },
      { name: "Seated Leg Curl", muscle: "QUADS" },
      { name: "Romanian Deadlift", muscle: "BACK" },
      { name: "Standing Calf Raise", muscle: "CALVES" },
      { name: "Seated Calf Raise", muscle: "CALVES" },
      { name: "Barbell Bicep Curl", muscle: "BICEPS" },
      { name: "Dumbbell Bicep Curl", muscle: "BICEPS" },
      { name: "Hammer Curls", muscle: "BICEPS" },
      { name: "Preacher Curl", muscle: "BICEPS" },
      { name: "Concentration Curl", muscle: "BICEPS" },
      { name: "Cable Curl", muscle: "BICEPS" },
      { name: "Tricep Pushdown", muscle: "TRICEPS" },
      { name: "Overhead Cable Extension", muscle: "TRICEPS" },
      { name: "Skull Crushers", muscle: "TRICEPS" },
      { name: "Dumbbell Kickbacks", muscle: "TRICEPS" },
      { name: "Cable Crunch", muscle: "CORE" },
      { name: "Captain's Chair Leg Raise", muscle: "CORE" },
      { name: "Hanging Leg Raise", muscle: "CORE" },
      { name: "Plank", muscle: "CORE" },
      { name: "Russian Twist", muscle: "CORE" },
      { name: "Ab Wheel Rollout", muscle: "CORE" }
    ];

    const musclePaths = {
      CHEST: '<path d="M25,35 Q50,45 75,35 Q70,65 50,70 Q30,65 25,35 Z" stroke-width="3"/>',
      BACK: '<path d="M20,30 L80,30 L70,75 L50,85 L30,75 Z" stroke-width="3"/>',
      SHOULDERS: '<circle cx="30" cy="40" r="15" stroke-width="3"/><circle cx="70" cy="40" r="15" stroke-width="3"/>',
      QUADS: '<path d="M30,30 L48,30 L45,80 L32,80 Z M52,30 L70,30 L68,80 L55,80 Z" stroke-width="3"/>',
      TRICEPS: '<rect x="25" y="30" width="18" height="40" rx="5" stroke-width="3"/><rect x="57" y="30" width="18" height="40" rx="5" stroke-width="3"/>',
      BICEPS: '<circle cx="32" cy="45" r="14" stroke-width="3"/><circle cx="68" cy="45" r="14" stroke-width="3"/>',
      CORE: '<rect x="35" y="25" width="30" height="50" rx="4" stroke-width="3"/>',
      CALVES: '<path d="M35,40 Q50,40 45,80 L35,80 Z M65,40 Q50,40 55,80 L65,80 Z" stroke-width="3"/>',
      OTHER: '<circle cx="50" cy="50" r="24" stroke-width="3"/><path d="M50,36 L50,64 M36,50 L64,50" stroke-width="3"/>'
    };
    function muscleIcon(muscle, size) {
      size = size || 32;
      return '<svg viewBox="0 0 100 100" class="muscle-icon" style="width:' + size + 'px;height:' + size + 'px">' + (musclePaths[muscle] || musclePaths.OTHER) + '</svg>';
    }

    const originalThemes = {
      midnight: { id: "midnight", name: "Midnight Strong", accent: "#F59E0B", bg: "#0B0F17", card: "#1E293B", border: "#334155", text: "#F8FAFC", font: "'Inter', sans-serif", builtin: true },
      barbie: { id: "barbie", name: "Bulk Barbie", accent: "#EC4899", bg: "#180914", card: "#2D1228", border: "#4A1D43", text: "#FDF2F8", font: "'Space Grotesk', sans-serif", builtin: true },
      bluesteel: { id: "bluesteel", name: "Blue Steel", accent: "#06B6D4", bg: "#08131F", card: "#0F2338", border: "#1E3A5F", text: "#ECFEFF", font: "'Chakra Petch', sans-serif", builtin: true },
      lemon: { id: "lemon", name: "Locked-In Lemon", accent: "#EAB308", bg: "#121208", card: "#242410", border: "#3E3E1A", text: "#FEFCE8", font: "'Orbitron', sans-serif", builtin: true }
    };

    const fontOptions = [
      { label: 'Inter', value: "'Inter', sans-serif" },
      { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
      { label: 'Chakra Petch', value: "'Chakra Petch', sans-serif" },
      { label: 'Orbitron', value: "'Orbitron', sans-serif" },
      { label: 'Rajdhani', value: "'Rajdhani', sans-serif" },
      { label: 'Oswald', value: "'Oswald', sans-serif" },
      { label: 'Poppins', value: "'Poppins', sans-serif" },
      { label: 'Press Start 2P (Retro)', value: "'Press Start 2P', monospace" },
      { label: 'System UI', value: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
      { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
      { label: 'Monospace', value: "ui-monospace, 'SF Mono', Menlo, monospace" }
    ];

    const themeColorFields = [
      { key: 'accent', label: 'Accent' },
      { key: 'bg', label: 'Background' },
      { key: 'card', label: 'Cards & Header' },
      { key: 'border', label: 'Borders' },
      { key: 'text', label: 'Text' }
    ];

    const defaultRoutines = {
      bls5: {
        id: "bls5",
        name: "Bigger Leaner Stronger (5-Day)",
        days: {
          "Push": [
            { name: "Barbell Bench Press", target: "4-6 Reps", muscle: "CHEST", sets: [{type:"Normal", weight:"205", reps:"5", p2Weight:"135", p2Reps:"8"}, {type:"Normal", weight:"205", reps:"5", p2Weight:"135", p2Reps:"8"}, {type:"Normal", weight:"205", reps:"5", p2Weight:"135", p2Reps:"8"}] },
            { name: "Incline Barbell Bench Press", target: "4-6 Reps", muscle: "CHEST", sets: [{type:"Normal", weight:"175", reps:"5", p2Weight:"115", p2Reps:"8"}, {type:"Normal", weight:"175", reps:"5", p2Weight:"115", p2Reps:"8"}, {type:"Normal", weight:"175", reps:"5", p2Weight:"115", p2Reps:"8"}] },
            { name: "Dumbbell Bench Press", target: "4-6 Reps", muscle: "CHEST", sets: [{type:"Normal", weight:"75", reps:"6", p2Weight:"45", p2Reps:"8"}, {type:"Normal", weight:"75", reps:"6", p2Weight:"45", p2Reps:"8"}, {type:"Normal", weight:"75", reps:"6", p2Weight:"45", p2Reps:"8"}] },
            { name: "Tricep Pushdown", target: "4-6 Reps", muscle: "TRICEPS", sets: [{type:"Normal", weight:"70", reps:"6", p2Weight:"40", p2Reps:"8"}, {type:"Normal", weight:"70", reps:"6", p2Weight:"40", p2Reps:"8"}, {type:"Normal", weight:"70", reps:"6", p2Weight:"40", p2Reps:"8"}] }
          ],
          "Pull": [
            { name: "Barbell Deadlift", target: "4-6 Reps", muscle: "BACK", sets: [{type:"Normal", weight:"315", reps:"5", p2Weight:"185", p2Reps:"5"}, {type:"Normal", weight:"315", reps:"5", p2Weight:"185", p2Reps:"5"}] },
            { name: "One-Arm Dumbbell Row", target: "4-6 Reps", muscle: "BACK", sets: [{type:"Normal", weight:"80", reps:"6", p2Weight:"45", p2Reps:"8"}, {type:"Normal", weight:"80", reps:"6", p2Weight:"45", p2Reps:"8"}, {type:"Normal", weight:"80", reps:"6", p2Weight:"45", p2Reps:"8"}] },
            { name: "Wide-Grip Lat Pulldown", target: "4-6 Reps", muscle: "BACK", sets: [{type:"Normal", weight:"160", reps:"6", p2Weight:"100", p2Reps:"8"}, {type:"Normal", weight:"160", reps:"6", p2Weight:"100", p2Reps:"8"}, {type:"Normal", weight:"160", reps:"6", p2Weight:"100", p2Reps:"8"}] },
            { name: "Hammer Curls", target: "4-6 Reps", muscle: "BICEPS", sets: [{type:"Normal", weight:"45", reps:"6", p2Weight:"25", p2Reps:"8"}, {type:"Normal", weight:"45", reps:"6", p2Weight:"25", p2Reps:"8"}, {type:"Normal", weight:"45", reps:"6", p2Weight:"25", p2Reps:"8"}] }
          ],
          "Uppers": [
            { name: "Standing Overhead Shoulder Press", target: "4-6 Reps", muscle: "SHOULDERS", sets: [{type:"Normal", weight:"135", reps:"5", p2Weight:"75", p2Reps:"8"}, {type:"Normal", weight:"135", reps:"5", p2Weight:"75", p2Reps:"8"}, {type:"Normal", weight:"135", reps:"5", p2Weight:"75", p2Reps:"8"}] },
            { name: "Side Lateral Raise", target: "4-6 Reps", muscle: "SHOULDERS", sets: [{type:"Normal", weight:"30", reps:"8", p2Weight:"15", p2Reps:"10"}, {type:"Normal", weight:"30", reps:"8", p2Weight:"15", p2Reps:"10"}, {type:"Normal", weight:"30", reps:"8", p2Weight:"15", p2Reps:"10"}] },
            { name: "Rear Delt Lateral Raise", target: "4-6 Reps", muscle: "SHOULDERS", sets: [{type:"Normal", weight:"25", reps:"8", p2Weight:"12", p2Reps:"10"}, {type:"Normal", weight:"25", reps:"8", p2Weight:"12", p2Reps:"10"}, {type:"Normal", weight:"25", reps:"8", p2Weight:"12", p2Reps:"10"}] },
            { name: "Cable Crunch", target: "10-12 Reps", muscle: "CORE", sets: [{type:"Normal", weight:"120", reps:"12", p2Weight:"70", p2Reps:"12"}, {type:"Normal", weight:"120", reps:"12", p2Weight:"70", p2Reps:"12"}, {type:"Normal", weight:"120", reps:"12", p2Weight:"70", p2Reps:"12"}] }
          ],
          "Legs": [
            { name: "Barbell Squat", target: "4-6 Reps", muscle: "QUADS", sets: [{type:"Normal", weight:"275", reps:"5", p2Weight:"155", p2Reps:"6"}, {type:"Normal", weight:"275", reps:"5", p2Weight:"155", p2Reps:"6"}, {type:"Normal", weight:"275", reps:"5", p2Weight:"155", p2Reps:"6"}] },
            { name: "Lying Leg Curl", target: "4-6 Reps", muscle: "QUADS", sets: [{type:"Normal", weight:"130", reps:"6", p2Weight:"80", p2Reps:"8"}, {type:"Normal", weight:"130", reps:"6", p2Weight:"80", p2Reps:"8"}, {type:"Normal", weight:"130", reps:"6", p2Weight:"80", p2Reps:"8"}] },
            { name: "Leg Press", target: "4-6 Reps", muscle: "QUADS", sets: [{type:"Normal", weight:"360", reps:"6", p2Weight:"200", p2Reps:"8"}, {type:"Normal", weight:"360", reps:"6", p2Weight:"200", p2Reps:"8"}, {type:"Normal", weight:"360", reps:"6", p2Weight:"200", p2Reps:"8"}] },
            { name: "Seated Calf Raise", target: "8-10 Reps", muscle: "CALVES", sets: [{type:"Normal", weight:"90", reps:"10", p2Weight:"50", p2Reps:"10"}, {type:"Normal", weight:"90", reps:"10", p2Weight:"50", p2Reps:"10"}, {type:"Normal", weight:"90", reps:"10", p2Weight:"50", p2Reps:"10"}] }
          ],
          "Upper B": [
            { name: "Close-Grip Bench Press", target: "4-6 Reps", muscle: "CHEST", sets: [{type:"Normal", weight:"185", reps:"5", p2Weight:"105", p2Reps:"8"}, {type:"Normal", weight:"185", reps:"5", p2Weight:"105", p2Reps:"8"}, {type:"Normal", weight:"185", reps:"5", p2Weight:"105", p2Reps:"8"}] },
            { name: "Preacher Curl", target: "4-6 Reps", muscle: "BICEPS", sets: [{type:"Normal", weight:"75", reps:"6", p2Weight:"40", p2Reps:"8"}, {type:"Normal", weight:"75", reps:"6", p2Weight:"40", p2Reps:"8"}, {type:"Normal", weight:"75", reps:"6", p2Weight:"40", p2Reps:"8"}] },
            { name: "Tricep Pushdown", target: "4-6 Reps", muscle: "TRICEPS", sets: [{type:"Normal", weight:"75", reps:"6", p2Weight:"45", p2Reps:"8"}, {type:"Normal", weight:"75", reps:"6", p2Weight:"45", p2Reps:"8"}, {type:"Normal", weight:"75", reps:"6", p2Weight:"45", p2Reps:"8"}] },
            { name: "Captain's Chair Leg Raise", target: "10-12 Reps", muscle: "CORE", sets: [{type:"Normal", weight:"0", reps:"12", p2Weight:"0", p2Reps:"12"}, {type:"Normal", weight:"0", reps:"12", p2Weight:"0", p2Reps:"12"}, {type:"Normal", weight:"0", reps:"12", p2Weight:"0", p2Reps:"12"}] }
          ]
        }
      }
    };

    
  return { exerciseDatabase, musclePaths, muscleIcon, originalThemes, fontOptions, themeColorFields, defaultRoutines };
});
