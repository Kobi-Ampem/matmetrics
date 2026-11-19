import type { Camera, Club, Coach, RoomProfile } from "../types"

export const club: Club = {
  id: "club-lille",
  name: "Demo Wrestling Club",
  city: "Lille",
  mats: 1,
}

export const network = {
  local: true,
  internetOff: true,
  sessionsWaiting: 3,
  edgeOnline: true,
}

export const coaches: Coach[] = [
  { id: "c1", name: "David Thompson", role: "Head coach", initials: "DT" },
  { id: "c2", name: "Sarah Nguyen", role: "Assistant coach", initials: "SN" },
  { id: "c3", name: "Karim Mansouri", role: "Strength and conditioning", initials: "KM" },
]

export const rooms: RoomProfile[] = [
  { id: "cool", name: "Cool hall", minC: 17, maxC: 20 },
  { id: "standard", name: "Standard hall", minC: 20, maxC: 23 },
  { id: "warm", name: "Warm hall", minC: 23, maxC: 27 },
]

export const cameras: Camera[] = [
  { id: "cam1", label: "CAM 1 · NORTH", position: "N", status: "online", resolution: "1920×1080", fps: 30 },
  { id: "cam2", label: "CAM 2 · EAST", position: "E", status: "online", resolution: "1920×1080", fps: 30 },
  { id: "cam3", label: "CAM 3 · SOUTH", position: "S", status: "online", resolution: "1920×1080", fps: 30 },
  { id: "cam4", label: "CAM 4 · WEST", position: "W", status: "warning", resolution: "1920×1080", fps: 30 },
]

export const BLOCKS = [
  { name: "Warm-up", startMin: 0, endMin: 15 },
  { name: "Technique", startMin: 15, endMin: 40 },
  { name: "Live sparring", startMin: 40, endMin: 80 },
  { name: "Cool-down", startMin: 80, endMin: 90 },
]
