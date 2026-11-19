import type { PoseFrame } from "../types"

type Pt = [number, number]

function fig(parts: {
  nose: Pt
  sl: Pt
  sr: Pt
  el: Pt
  er: Pt
  wl: Pt
  wr: Pt
  hl: Pt
  hr: Pt
  kl: Pt
  kr: Pt
  al: Pt
  ar: Pt
}): Pt[] {
  const [nx, ny] = parts.nose
  return [
    parts.nose,
    [nx - 4, ny - 3],
    [nx + 4, ny - 3],
    [nx - 8, ny],
    [nx + 8, ny],
    parts.sl,
    parts.sr,
    parts.el,
    parts.er,
    parts.wl,
    parts.wr,
    parts.hl,
    parts.hr,
    parts.kl,
    parts.kr,
    parts.al,
    parts.ar,
  ]
}

const stance: PoseFrame = {
  a: fig({
    nose: [78, 48],
    sl: [70, 64],
    sr: [90, 66],
    el: [62, 84],
    er: [104, 86],
    wl: [58, 102],
    wr: [112, 96],
    hl: [74, 108],
    hr: [92, 110],
    kl: [66, 136],
    kr: [100, 132],
    al: [60, 164],
    ar: [108, 162],
  }),
  b: fig({
    nose: [242, 48],
    sl: [250, 66],
    sr: [230, 64],
    el: [258, 86],
    er: [216, 84],
    wl: [262, 96],
    wr: [208, 102],
    hl: [246, 110],
    hr: [228, 108],
    kl: [254, 132],
    kr: [220, 136],
    al: [260, 162],
    ar: [212, 164],
  }),
}

const tieUp: PoseFrame = {
  a: fig({
    nose: [132, 52],
    sl: [122, 68],
    sr: [146, 70],
    el: [138, 86],
    er: [162, 84],
    wl: [150, 78],
    wr: [168, 72],
    hl: [126, 112],
    hr: [148, 114],
    kl: [118, 140],
    kr: [156, 138],
    al: [112, 166],
    ar: [164, 164],
  }),
  b: fig({
    nose: [186, 50],
    sl: [176, 68],
    sr: [198, 66],
    el: [160, 82],
    er: [184, 88],
    wl: [154, 74],
    wr: [148, 80],
    hl: [174, 114],
    hr: [196, 112],
    kl: [168, 140],
    kr: [206, 136],
    al: [162, 166],
    ar: [214, 162],
  }),
}

const shot: PoseFrame = {
  a: fig({
    nose: [150, 96],
    sl: [132, 100],
    sr: [158, 92],
    el: [146, 118],
    er: [176, 108],
    wl: [158, 132],
    wr: [188, 124],
    hl: [118, 118],
    hr: [140, 108],
    kl: [108, 146],
    kr: [150, 140],
    al: [96, 168],
    ar: [168, 158],
  }),
  b: fig({
    nose: [196, 58],
    sl: [184, 74],
    sr: [210, 72],
    el: [176, 96],
    er: [222, 90],
    wl: [168, 112],
    wr: [214, 108],
    hl: [188, 112],
    hr: [208, 110],
    kl: [180, 140],
    kr: [216, 136],
    al: [174, 166],
    ar: [224, 162],
  }),
}

const sprawl: PoseFrame = {
  a: fig({
    nose: [128, 108],
    sl: [118, 100],
    sr: [146, 96],
    el: [108, 118],
    er: [160, 112],
    wl: [100, 134],
    wr: [172, 126],
    hl: [150, 112],
    hr: [168, 104],
    kl: [176, 132],
    kr: [188, 118],
    al: [196, 154],
    ar: [206, 136],
  }),
  b: fig({
    nose: [168, 78],
    sl: [156, 90],
    sr: [182, 86],
    el: [148, 108],
    er: [194, 100],
    wl: [140, 124],
    wr: [186, 118],
    hl: [160, 118],
    hr: [180, 116],
    kl: [154, 144],
    kr: [190, 140],
    al: [148, 168],
    ar: [200, 164],
  }),
}

const hipThrow: PoseFrame = {
  a: fig({
    nose: [150, 70],
    sl: [138, 84],
    sr: [164, 80],
    el: [128, 100],
    er: [176, 96],
    wl: [140, 88],
    wr: [186, 78],
    hl: [156, 108],
    hr: [176, 100],
    kl: [148, 136],
    kr: [186, 128],
    al: [142, 164],
    ar: [198, 152],
  }),
  b: fig({
    nose: [196, 46],
    sl: [180, 58],
    sr: [208, 52],
    el: [168, 72],
    er: [214, 64],
    wl: [160, 86],
    wr: [206, 74],
    hl: [188, 78],
    hr: [210, 70],
    kl: [176, 96],
    kr: [220, 84],
    al: [164, 112],
    ar: [232, 96],
  }),
}

const landing: PoseFrame = {
  a: fig({
    nose: [168, 78],
    sl: [150, 86],
    sr: [184, 80],
    el: [140, 100],
    er: [198, 92],
    wl: [132, 114],
    wr: [208, 104],
    hl: [156, 108],
    hr: [184, 104],
    kl: [148, 132],
    kr: [196, 124],
    al: [140, 156],
    ar: [210, 146],
  }),
  b: fig({
    nose: [214, 64],
    sl: [200, 78],
    sr: [228, 74],
    el: [190, 96],
    er: [236, 90],
    wl: [184, 110],
    wr: [228, 104],
    hl: [204, 108],
    hr: [226, 104],
    kl: [198, 136],
    kr: [234, 130],
    al: [192, 162],
    ar: [242, 154],
  }),
}

export const POSE_KEYS = ["stance", "tie", "shot", "sprawl", "throw", "landing"] as const
export type PoseKey = (typeof POSE_KEYS)[number]

export const POSES: Record<PoseKey, PoseFrame> = {
  stance,
  tie: tieUp,
  shot,
  sprawl,
  throw: hipThrow,
  landing,
}

export const POSE_LOOP: PoseKey[] = ["stance", "tie", "shot", "sprawl", "throw", "landing", "stance"]
