export type StadiumType =
  | 'EXTREME'
  | 'DOUBLE_EXTREME'
  | 'WIDE_EXTREME'
  | 'INFINITY'
export type SideRule = 'fixed' | 'random'
export type BattleType = 'streak' | 'one-bey' | 'three-on-three' | 'team'
export type FinishType = 'ko' | 'ringout' | 'spin' | 'burst' | 'over'

export type Settings = {
  stadium: StadiumType
  sideRule: SideRule
}

export type Team = {
  id?: number
  name: string
  createdAt: string
}

export type User = {
  id?: number
  name: string
  teamId?: number
  active: boolean
  createdAt: string
}

export type TeamPart = {
  id?: number
  teamId: number
  partKind:
    | 'blade'
    | 'ratchet'
    | 'bit'
    | 'cx_lock_chip'
    | 'cx_main_blade'
    | 'cx_assist_blade'
  partCode: string
  createdAt: string
}

export type Event = {
  id?: number
  name: string
  stadium: StadiumType
  sideRule: SideRule
  battleType: BattleType
  status: EventStatus
  scheduledDate?: string
  winnerName?: string
  createdAt: string
}

export type EventEntry = {
  id?: number
  eventId: number
  userIdsJson: string
  beyNamesJson: string
  beyPartsJson?: string
  useTeamParts?: boolean
  teamName?: string
  createdAt: string
}

export type Match = {
  id?: number
  eventId?: number
  createdAt: string
}

export type MatchLoadout = {
  id?: number
  matchId: number
  entryId?: number
  userId?: number
  teamId?: number
  partsJson?: string
  userIdsJson?: string
  side?: 'A' | 'B'
}

export type MatchPoint = {
  id?: number
  matchId: number
  points: number
  winnerSide: 'A' | 'B'
  finishType: FinishType
  createdAt: string
}

export type Part = {
  id?: number
  name: string
  type?: string
  metaJson?: string
}

export const STADIUM_LABEL: Record<StadiumType, string> = {
  EXTREME: 'エクストリームスタジアム',
  DOUBLE_EXTREME: 'ダブルエクストリームスタジアム',
  WIDE_EXTREME: 'ワイドエクストリームスタジアム',
  INFINITY: 'インフィニティスタジアム',
}

const STADIUM_KEYS = Object.keys(STADIUM_LABEL) as StadiumType[]

const LEGACY_STADIUM_MAP: Record<string, StadiumType> = {
  エクストリームスタジアム: 'EXTREME',
  ダブルエクストリームスタジアム: 'DOUBLE_EXTREME',
  ワイドエクストリームスタジアム: 'WIDE_EXTREME',
  インフィニティスタジアム: 'INFINITY',
  エクストリーム: 'EXTREME',
  ワイド: 'WIDE_EXTREME',
  スタンダード: 'EXTREME',
  extreme: 'EXTREME',
  wide: 'WIDE_EXTREME',
  standard: 'EXTREME',
}

export function normalizeStadium(value: unknown): StadiumType {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (STADIUM_KEYS.includes(trimmed as StadiumType)) {
      return trimmed as StadiumType
    }
    if (LEGACY_STADIUM_MAP[trimmed]) {
      return LEGACY_STADIUM_MAP[trimmed]
    }
  }
  return 'EXTREME'
}

export function stadiumLabel(value: unknown): string {
  const stadium = normalizeStadium(value)
  return STADIUM_LABEL[stadium]
}

export const SIDE_RULE_OPTIONS: { value: SideRule; label: string }[] = [
  { value: 'fixed', label: '固定' },
  { value: 'random', label: 'ランダム' },
]

export const BATTLE_TYPE_OPTIONS: { value: BattleType; label: string }[] = [
  { value: 'streak', label: '連勝バトル' },
  { value: 'one-bey', label: 'ワンベイバトル' },
  { value: 'three-on-three', label: '3on3バトル' },
  { value: 'team', label: 'チームバトル' },
]

export const battleTypeLabel = (value: BattleType | string): string =>
  BATTLE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value

export const DEFAULT_SETTINGS: Settings = {
  stadium: 'EXTREME',
  sideRule: 'fixed',
}

export type EventStatus = 'active' | 'completed' | 'archived'

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  active: '実施中',
  completed: '終了',
  archived: 'アーカイブ',
}

export function normalizeEventStatus(value: unknown): EventStatus {
  if (value === 'archived') return 'archived'
  if (value === 'completed') return 'completed'
  return 'active'
}
