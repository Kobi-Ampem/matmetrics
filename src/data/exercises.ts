import type { Exercise, WarmupStep } from "../types"

export const exercises: Exercise[] = [
  { id: "jog", name: "Easy jog and skips", category: "general", defaultMin: 3 },
  { id: "jacks", name: "Jumping jacks", category: "general", defaultMin: 2 },
  { id: "hip-openers", name: "Dynamic hip openers", category: "hips", defaultMin: 2 },
  { id: "leg-swings", name: "Leg swings", category: "mobility", defaultMin: 2 },
  { id: "lunges", name: "Walking lunges with twist", category: "mobility", defaultMin: 2 },
  { id: "arm-circles", name: "Arm circles", category: "shoulder", defaultMin: 2 },
  { id: "ext-rot", name: "Band shoulder external rotations", category: "shoulder", defaultMin: 2 },
  { id: "pull-aparts", name: "Band pull-aparts", category: "shoulder", defaultMin: 2 },
  { id: "scap-push", name: "Scapular push-ups", category: "shoulder", defaultMin: 2 },
  { id: "rolls-fwd", name: "Forward shoulder rolls", category: "shoulder", defaultMin: 2 },
  { id: "rolls-back", name: "Backward shoulder rolls", category: "shoulder", defaultMin: 2 },
  { id: "breakfalls", name: "Break-fall practice (side)", category: "falls", defaultMin: 2 },
  { id: "neck-bridges", name: "Neck bridges (light)", category: "neck", defaultMin: 2 },
  { id: "neck-iso", name: "Neck isometrics with partner", category: "neck", defaultMin: 2 },
  { id: "hip-heists", name: "Hip heists", category: "hips", defaultMin: 2 },
  { id: "sit-outs", name: "Sit-outs", category: "technique", defaultMin: 2 },
  { id: "knee-circles", name: "Knee circles and ankle mobility", category: "knees", defaultMin: 2 },
  { id: "balance", name: "Single-leg balance reach", category: "knees", defaultMin: 2 },
  { id: "penetration", name: "Penetration step drill", category: "technique", defaultMin: 2 },
  { id: "sprawl", name: "Sprawl drill", category: "technique", defaultMin: 2 },
  { id: "stance", name: "Stance and motion", category: "technique", defaultMin: 3 },
  { id: "level-change", name: "Level-change drill", category: "technique", defaultMin: 3 },
  { id: "hand-fighting", name: "Partner hand-fighting (50%)", category: "partner", defaultMin: 3 },
  { id: "light-drill", name: "Light drilling of go-to attack", category: "technique", defaultMin: 3 },
]

export const STANDARD_STEPS: WarmupStep[] = [
  { exerciseId: "jog", minutes: 3, reason: "Standard plan", change: "standard" },
  { exerciseId: "hip-openers", minutes: 2, reason: "Standard plan", change: "standard" },
  { exerciseId: "arm-circles", minutes: 2, reason: "Standard plan", change: "standard" },
  { exerciseId: "neck-bridges", minutes: 2, reason: "Standard plan", change: "standard" },
  { exerciseId: "stance", minutes: 3, reason: "Standard plan", change: "standard" },
  { exerciseId: "hand-fighting", minutes: 3, reason: "Standard plan", change: "standard" },
]
