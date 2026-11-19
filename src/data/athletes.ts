import type { Athlete } from "../types"
import { between, rng } from "./rng"

interface Seed {
  id: string
  name: string
  initials: string
  sex: "M" | "F"
  age: number
  weightKg: number
  style: Athlete["style"]
  level: Athlete["level"]
  memberSince?: string
  restingHr: number
  maxHr: number
  zone: Athlete["riskProfile"]["preferredZone"]
  baseFlagRate: number
  improvementPerWeek: number
}

const SEEDS: Seed[] = [
  { id: "a01", name: "Jack Miller", initials: "JM", sex: "M", age: 21, weightKg: 74, style: "Freestyle", level: "Competitive", memberSince: "2024-09-02", restingHr: 52, maxHr: 196, zone: "shoulder_r", baseFlagRate: 4.5, improvementPerWeek: -0.06 },
  { id: "a02", name: "Emily Carter", initials: "EC", sex: "F", age: 19, weightKg: 57, style: "Freestyle", level: "Beginner", memberSince: "2026-09-14", restingHr: 64, maxHr: 201, zone: "upper_back", baseFlagRate: 3.0, improvementPerWeek: -0.04 },
  { id: "a03", name: "Lucas Martin", initials: "LM", sex: "M", age: 23, weightKg: 86, style: "Greco-Roman", level: "Competitive", restingHr: 55, maxHr: 192, zone: "head_neck", baseFlagRate: 3.6, improvementPerWeek: -0.01 },
  { id: "a04", name: "Inès Benali", initials: "IB", sex: "F", age: 20, weightKg: 62, style: "Freestyle", level: "Competitive", restingHr: 54, maxHr: 199, zone: "knee_l", baseFlagRate: 1.4, improvementPerWeek: -0.02 },
  { id: "a05", name: "Samuel Okoro", initials: "SO", sex: "M", age: 24, weightKg: 97, style: "Freestyle", level: "Intermediate", restingHr: 60, maxHr: 190, zone: "upper_back", baseFlagRate: 2.2, improvementPerWeek: -0.02 },
  { id: "a06", name: "Hugo Lefèvre", initials: "HL", sex: "M", age: 17, weightKg: 65, style: "Greco-Roman", level: "Beginner", restingHr: 66, maxHr: 203, zone: "shoulder_l", baseFlagRate: 2.8, improvementPerWeek: -0.05 },
  { id: "a07", name: "Chloé Dubois", initials: "CD", sex: "F", age: 22, weightKg: 53, style: "Freestyle", level: "Competitive", restingHr: 50, maxHr: 198, zone: "knee_r", baseFlagRate: 1.8, improvementPerWeek: 0 },
  { id: "a08", name: "Yanis Haddad", initials: "YH", sex: "M", age: 20, weightKg: 70, style: "Greco-Roman", level: "Intermediate", restingHr: 58, maxHr: 197, zone: "shoulder_r", baseFlagRate: 2.0, improvementPerWeek: -0.03 },
  { id: "a09", name: "Noah Petit", initials: "NP", sex: "M", age: 18, weightKg: 79, style: "Freestyle", level: "Intermediate", restingHr: 61, maxHr: 200, zone: "knee_l", baseFlagRate: 2.4, improvementPerWeek: -0.03 },
  { id: "a10", name: "Amara Diallo", initials: "AD", sex: "F", age: 21, weightKg: 68, style: "Freestyle", level: "Competitive", restingHr: 53, maxHr: 197, zone: "hip_r", baseFlagRate: 1.2, improvementPerWeek: -0.01 },
  { id: "a11", name: "Léo Garnier", initials: "LG", sex: "M", age: 16, weightKg: 60, style: "Freestyle", level: "Beginner", restingHr: 68, maxHr: 204, zone: "head_neck", baseFlagRate: 3.4, improvementPerWeek: -0.07 },
  { id: "a12", name: "Manon Roux", initials: "MR", sex: "F", age: 18, weightKg: 50, style: "Freestyle", level: "Intermediate", restingHr: 62, maxHr: 202, zone: "shoulder_l", baseFlagRate: 1.9, improvementPerWeek: -0.03 },
  { id: "a13", name: "Rayan Belkacem", initials: "RB", sex: "M", age: 22, weightKg: 92, style: "Greco-Roman", level: "Competitive", restingHr: 54, maxHr: 193, zone: "lower_back", baseFlagRate: 2.1, improvementPerWeek: -0.02 },
  { id: "a14", name: "Thomas Fontaine", initials: "TF", sex: "M", age: 25, weightKg: 125, style: "Freestyle", level: "Intermediate", restingHr: 62, maxHr: 186, zone: "knee_r", baseFlagRate: 2.6, improvementPerWeek: -0.01 },
  { id: "a15", name: "Sofia Moreau", initials: "SM", sex: "F", age: 17, weightKg: 55, style: "Freestyle", level: "Beginner", restingHr: 67, maxHr: 204, zone: "upper_back", baseFlagRate: 2.9, improvementPerWeek: -0.06 },
  { id: "a16", name: "Maxime Laurent", initials: "ML", sex: "M", age: 19, weightKg: 61, style: "Greco-Roman", level: "Intermediate", restingHr: 59, maxHr: 200, zone: "ankle_l", baseFlagRate: 1.7, improvementPerWeek: -0.02 },
  { id: "a17", name: "Aïcha Traoré", initials: "AT", sex: "F", age: 23, weightKg: 76, style: "Freestyle", level: "Competitive", restingHr: 52, maxHr: 195, zone: "shoulder_r", baseFlagRate: 1.5, improvementPerWeek: -0.02 },
  { id: "a18", name: "Victor Blanc", initials: "VB", sex: "M", age: 20, weightKg: 82, style: "Greco-Roman", level: "Beginner", restingHr: 65, maxHr: 199, zone: "head_neck", baseFlagRate: 3.1, improvementPerWeek: -0.05 },
]

function memberSince(seed: Seed): string {
  if (seed.memberSince) return seed.memberSince
  const year = 2022 + Math.floor(rng() * 5)
  const month = 1 + Math.floor(rng() * 12)
  const day = 1 + Math.floor(rng() * 27)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export const athletes: Athlete[] = SEEDS.map((seed, index) => ({
  id: seed.id,
  name: seed.name,
  initials: seed.initials,
  sex: seed.sex,
  age: seed.age,
  weightKg: seed.weightKg,
  style: seed.style,
  level: seed.level,
  memberSince: memberSince(seed),
  restingHr: seed.restingHr,
  maxHr: seed.maxHr,
  baselineSkinTemp: Math.round(between(33.6, 34.4) * 10) / 10,
  riskProfile: {
    preferredZone: seed.zone,
    baseFlagRate: seed.baseFlagRate,
    improvementPerWeek: seed.improvementPerWeek,
  },
  bandId: `B-${String(index + 1).padStart(2, "0")}`,
}))
