export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const rng = mulberry32(20261117)

export const pick = <T,>(arr: readonly T[], random: () => number = rng): T =>
  arr[Math.floor(random() * arr.length)] as T

export const between = (min: number, max: number, random: () => number = rng) =>
  min + random() * (max - min)

export const gauss = (mean: number, sd: number, random: () => number = rng) => {
  const u = 1 - random()
  const v = random()
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function poisson(lambda: number, random: () => number = rng): number {
  if (lambda <= 0.0001) return 0
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k += 1
    p *= random()
  } while (p > L && k < 30)
  return k - 1
}

export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
