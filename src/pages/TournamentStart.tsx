import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import {
  bladesByName,
  bitsByCode,
  cxAssistBlades,
  cxLockChips,
  cxMainBlades,
  ratchetsByCode,
} from '../data/parts'
import {
  BATTLE_TYPE_OPTIONS,
  STADIUM_LABEL,
} from '../types'
import type {
  Event,
  EventEntry,
  FinishType,
  Match,
  MatchLoadout,
  TeamPart,
  User,
} from '../types'

const FINISHES: { type: FinishType; label: string; points: number }[] = [
  { type: 'spin', label: 'スピン', points: 1 },
  { type: 'over', label: 'オーバー', points: 2 },
  { type: 'burst', label: 'バースト', points: 2 },
  { type: 'ko', label: 'エクストリーム', points: 3 },
]

const emptyBey = () => ({
  line: 'UXBX' as const as 'UXBX' | 'CX',
  blade: '',
  lockChip: '',
  mainBlade: '',
  assistBlade: '',
  ratchet: '',
  bit: '',
})

function parseJsonArray<T>(value: string | undefined, fallback: T[]): T[] {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed as T[]
    return fallback
  } catch {
    return fallback
  }
}

function seededRng(seed: number) {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

export default function TournamentStart() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [entries, setEntries] = useState<EventEntry[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [teamParts, setTeamParts] = useState<TeamPart[]>([])
  const [matchLoadouts, setMatchLoadouts] = useState<MatchLoadout[]>([])
  const [loading, setLoading] = useState(true)
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [matchId, setMatchId] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [log, setLog] = useState<
    { side: 'A' | 'B'; label: string; points: number; battleIndex: number }[]
  >([])
  const [showBracket, setShowBracket] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [modalError, setModalError] = useState('')
  const [matchWinners, setMatchWinners] = useState<
    { key: string; winner: 'A' | 'B' }[]
  >([])

  const [leftBeys, setLeftBeys] = useState([emptyBey(), emptyBey(), emptyBey()])
  const [rightBeys, setRightBeys] = useState([emptyBey(), emptyBey(), emptyBey()])
  const [leftQuick, setLeftQuick] = useState(['', '', ''])
  const [rightQuick, setRightQuick] = useState(['', '', ''])
  const [loadoutLocked, setLoadoutLocked] = useState(false)
  const [showBeyEditor, setShowBeyEditor] = useState(false)
  const [editorSide, setEditorSide] = useState<'A' | 'B'>('A')
  const [editorIndex, setEditorIndex] = useState(0)

  const [streakChampionIndex, setStreakChampionIndex] = useState(0)
  const [streakChallengerIndex, setStreakChallengerIndex] = useState(1)
  const [streakCount, setStreakCount] = useState(0)
  const [roundIndex, setRoundIndex] = useState(0)
  const [roundLocked, setRoundLocked] = useState(false)
  const [teamLeftIndex, setTeamLeftIndex] = useState(0)
  const [teamRightIndex, setTeamRightIndex] = useState(0)
  const [teamLeftLosses, setTeamLeftLosses] = useState(0)
  const [teamRightLosses, setTeamRightLosses] = useState(0)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [teamWinNotice, setTeamWinNotice] = useState<{
    winner: string
    loserTeam: string
  } | null>(null)
  const [battleStarted, setBattleStarted] = useState(false)
  const [pendingNextBattle, setPendingNextBattle] = useState(false)

  const load = async (id: number) => {
    const [eventData, entryList, userList, parts, matches] = await Promise.all([
      db.events.get(id),
      db.event_entries.where('eventId').equals(id).toArray(),
      db.users.orderBy('createdAt').toArray(),
      db.team_parts.toArray(),
      db.matches.where('eventId').equals(id).toArray(),
    ])
    const matchIds = matches.map((match) => match.id).filter(Boolean) as number[]
    const loadouts = matchIds.length
      ? await db.match_loadouts.where('matchId').anyOf(matchIds).toArray()
      : []
    setEvent(eventData ?? null)
    setEntries(entryList)
    setUsers(userList)
    setTeamParts(parts)
    setMatchLoadouts(loadouts)
    setLoading(false)
  }

  useEffect(() => {
    const id = Number(eventId)
    if (Number.isNaN(id)) {
      setLoading(false)
      return
    }
    load(id)
  }, [eventId])

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      const timer = window.setTimeout(() => setCountdown(null), 1200)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => {
      setCountdown((prev) => (prev === null ? null : prev - 1))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    setModalError('')
  }, [showBracket, showSetup])

  useEffect(() => {
    if (!showSetup) setShowBeyEditor(false)
  }, [showSetup])

  const entryUserNames = (entry?: EventEntry) => {
    if (!entry) return []
    const ids = parseJsonArray<string>(entry.userIdsJson, [])
    return ids
      .map((id) => users.find((user) => user.id === Number(id))?.name ?? '不明')
  }

  const entryLabel = (entry?: EventEntry) => {
    if (!entry) return '未決'
    if (event?.battleType === 'team' && entry.teamName) {
      return entry.teamName
    }
    const names = entryUserNames(entry)
    return names.length ? names.join(' / ') : '未設定'
  }

  const seeded = useMemo(() => seededRng(Number(eventId) || 1), [eventId])

  const initialRound = useMemo(() => {
    if (!event || event.battleType === 'streak') return []
    const list = [...entries]
    list.sort(() => seeded() - 0.5)
    let size = 1
    while (size < list.length) size *= 2
    while (list.length < size) list.push(undefined as unknown as EventEntry)
    const round: { key: string; a?: EventEntry; b?: EventEntry }[] = []
    for (let i = 0; i < list.length; i += 2) {
      let a = list[i]
      let b = list[i + 1]
      if (b && a && seeded() > 0.5) {
        ;[a, b] = [b, a]
      }
      round.push({ key: `r1-m${i / 2}`, a, b })
    }
    return round
  }, [entries, event, seeded])

  const winnerMap = useMemo(() => {
    const map = new Map<string, 'A' | 'B'>()
    matchWinners.forEach((item) => map.set(item.key, item.winner))
    return map
  }, [matchWinners])

  const rounds = useMemo(() => {
    if (!event || event.battleType === 'streak') return []
    const result: { key: string; a?: EventEntry; b?: EventEntry }[][] = []
    let current = initialRound
    let roundIndex = 1
    while (current.length > 0) {
      result.push(current)
      const winners: (EventEntry | undefined)[] = current.map((match) => {
        const winner = winnerMap.get(match.key)
        if (winner === 'A') return match.a
        if (winner === 'B') return match.b
        if (match.a && !match.b) return match.a
        if (match.b && !match.a) return match.b
        return undefined
      })
      if (winners.length <= 1) break
      const next: { key: string; a?: EventEntry; b?: EventEntry }[] = []
      for (let i = 0; i < winners.length; i += 2) {
        next.push({
          key: `r${roundIndex + 1}-m${i / 2}`,
          a: winners[i],
          b: winners[i + 1],
        })
      }
      current = next
      roundIndex += 1
    }
    if (result.length >= 2) {
      const semifinalRound = result[result.length - 2]
      if (semifinalRound.length >= 2) {
        const loserOf = (match: { key: string; a?: EventEntry; b?: EventEntry }) => {
          const winner = winnerMap.get(match.key)
          if (winner === 'A') return match.b
          if (winner === 'B') return match.a
          return undefined
        }
        const thirdPlace = [
          {
            key: 'third-place',
            a: loserOf(semifinalRound[0]),
            b: loserOf(semifinalRound[1]),
          },
        ]
        result.splice(result.length - 1, 0, thirdPlace)
      }
    }
    return result
  }, [event, initialRound, winnerMap])

  const currentMatchInfo = useMemo(() => {
    if (event?.battleType === 'streak') return null
    for (const round of rounds) {
      for (const match of round) {
        if (match.a && match.b && !winnerMap.get(match.key)) {
          return match
        }
      }
    }
    return null
  }, [event, rounds, winnerMap])

  const currentMatchKey = currentMatchInfo?.key

  useEffect(() => {
    setScoreA(0)
    setScoreB(0)
    setMatchId(null)
    setCountdown(null)
    setLog([])
    setRoundIndex(0)
    setRoundLocked(false)
    setTeamLeftIndex(0)
    setTeamRightIndex(0)
    setTeamLeftLosses(0)
    setTeamRightLosses(0)
    setPendingNextBattle(false)
    setLoadoutLocked(false)
    setShowBracket(true)
    setShowSetup(false)
  }, [currentMatchKey])

  const roundTitle = (roundIndex: number) => {
    if (rounds[roundIndex]?.[0]?.key === 'third-place') return '3位決定戦'
    const matches = rounds[roundIndex]?.length ?? 0
    const slots = matches * 2
    if (slots <= 2) return '決勝'
    if (slots <= 4) return '準決勝'
    if (slots <= 8) return '準々決勝'
    return '勝ち上がり'
  }

  const roundTitleForKey = (key?: string) => {
    if (!key) return ''
    const index = rounds.findIndex((round) => round.some((pair) => pair.key === key))
    if (index < 0) return ''
    return roundTitle(index)
  }

  const finalWinnerName = useMemo(() => {
    if (!event) return null
    if (event.battleType === 'streak') {
      if (streakCount >= 3 && entries[streakChampionIndex]) {
        return entryLabel(entries[streakChampionIndex])
      }
      return null
    }
    if (rounds.length === 0) return null
    const finalRound = rounds[rounds.length - 1]
    const final = finalRound?.[0]
    if (!final) return null
    const winner = winnerMap.get(final.key)
    if (winner === 'A') return entryLabel(final.a)
    if (winner === 'B') return entryLabel(final.b)
    if (final.a && !final.b) return entryLabel(final.a)
    if (final.b && !final.a) return entryLabel(final.b)
    return null
  }, [event, rounds, winnerMap, streakCount, streakChampionIndex, entries])

  const tournamentCompleted = Boolean(finalWinnerName)
  const winPoints = useMemo(() => {
    if (!event) return 4
    switch (event.battleType) {
      case 'streak':
        return 3
      case 'one-bey':
        return 4
      case 'three-on-three':
        return 4
      case 'team':
        return 2
      default:
        return 4
    }
  }, [event])

  const finishTournament = async () => {
    if (!finalWinnerName || !event?.id) return
    try {
      await db.events.update(event.id, { status: 'archived', winnerName: finalWinnerName })
    } catch {
      // noop
    }
    navigate(`/tournament/${event.id}/result`)
  }

  const startCountdown = () => {
    if (tournamentCompleted) return
    setCountdown(3)
    setBattleStarted(true)
  }

  const ensureMatch = async (left?: EventEntry, right?: EventEntry) => {
    if (matchId || !event?.id) return matchId
    const match: Match = { eventId: event.id, createdAt: new Date().toISOString() }
    const id = await db.matches.add(match)
    setMatchId(id)
    if (left?.id) {
      const loadout: MatchLoadout = {
        matchId: id,
        entryId: left.id,
        side: 'A',
        userIdsJson: left.userIdsJson,
        partsJson: JSON.stringify(leftBeys),
      }
      const loadoutId = await db.match_loadouts.add(loadout)
      setMatchLoadouts((prev) => [...prev, { ...loadout, id: loadoutId }])
    }
    if (right?.id) {
      const loadout: MatchLoadout = {
        matchId: id,
        entryId: right.id,
        side: 'B',
        userIdsJson: right.userIdsJson,
        partsJson: JSON.stringify(rightBeys),
      }
      const loadoutId = await db.match_loadouts.add(loadout)
      setMatchLoadouts((prev) => [...prev, { ...loadout, id: loadoutId }])
    }
    return id
  }

  const addPoint = async (side: 'A' | 'B', finish: FinishType, points: number) => {
    if (tournamentCompleted) return
    const winsA = log.filter((item) => item.side === 'A').length
    const winsB = log.filter((item) => item.side === 'B').length
    if (event?.battleType === 'streak') {
      if (streakCount >= 3) return
      if (winsA > 0 || winsB > 0) return
    }
    if (event?.battleType === 'three-on-three' && roundLocked) return
    if (!battleStarted) return
    if (
      (event?.battleType === 'one-bey' || event?.battleType === 'three-on-three') &&
      (scoreA >= winPoints || scoreB >= winPoints)
    ) {
      return
    }
    if (event?.battleType === 'team' && (teamLeftLosses >= 3 || teamRightLosses >= 3)) {
      return
    }
    const left = currentMatchInfo?.a ?? entries[streakChampionIndex]
    const right = currentMatchInfo?.b ?? entries[streakChallengerIndex]
    if (!left || !right) return
    const id = await ensureMatch(left, right)
    if (!id) return
    const appliedPoints = points
    await db.match_points.add({
      matchId: id,
      points: appliedPoints,
      winnerSide: side,
      finishType: finish,
      createdAt: new Date().toISOString(),
    })
    const nextScoreA = side === 'A' ? scoreA + appliedPoints : scoreA
    const nextScoreB = side === 'B' ? scoreB + appliedPoints : scoreB
    if (event?.battleType === 'streak') {
      setScoreA(side === 'A' ? appliedPoints : 0)
      setScoreB(side === 'B' ? appliedPoints : 0)
    } else {
      setScoreA(nextScoreA)
      setScoreB(nextScoreB)
    }
    const finishLabel =
      FINISHES.find((item) => item.type === finish)?.label ?? finish
    const battleIndex = log.length + 1
    setLog((prev) => [
      { side, label: finishLabel, points: appliedPoints, battleIndex },
      ...prev,
    ])
    setBattleStarted(false)
    if (event?.battleType === 'three-on-three') {
      setRoundLocked(true)
      setPendingNextBattle(true)
    }
    if (event?.battleType === 'streak') {
      setPendingNextBattle(true)
    }
    if (event?.battleType === 'team') {
      if (nextScoreA >= winPoints || nextScoreB >= winPoints) {
        if (nextScoreA >= winPoints) {
          setTeamRightLosses((prev) => prev + 1)
          setTeamRightIndex((prev) => Math.min(prev + 1, 2))
          setTeamWinNotice({
            winner: leftName,
            loserTeam: rightTeamLabel ?? 'ライト',
          })
        } else {
          setTeamLeftLosses((prev) => prev + 1)
          setTeamLeftIndex((prev) => Math.min(prev + 1, 2))
          setTeamWinNotice({
            winner: rightName,
            loserTeam: leftTeamLabel ?? 'レフト',
          })
        }
        setBattleStarted(false)
        setScoreA(0)
        setScoreB(0)
        setCountdown(null)
        setMatchId(null)
        setPendingNextBattle(true)
      }
    }
  }

  const resetBattle = () => {
    setScoreA(0)
    setScoreB(0)
    setMatchId(null)
    setCountdown(null)
    setLog([])
    setBattleStarted(false)
    setPendingNextBattle(false)
    setLeftBeys([emptyBey(), emptyBey(), emptyBey()])
    setRightBeys([emptyBey(), emptyBey(), emptyBey()])
    setLeftQuick(['', '', ''])
    setRightQuick(['', '', ''])
    setLoadoutLocked(false)
  }

  const nextBattle = () => {
    if (tournamentCompleted) return
    if (event?.battleType === 'streak') {
      setPendingNextBattle(false)
      const winsA = log.filter((item) => item.side === 'A').length
      const winsB = log.filter((item) => item.side === 'B').length
      const winnerSide = winsA > winsB ? 'A' : winsB > winsA ? 'B' : null
      if (!winnerSide) return
      if (winnerSide === 'A') {
        const nextStreak = Math.min(streakCount + 1, 3)
        setStreakCount(nextStreak)
        if (nextStreak < 3) {
          setStreakChallengerIndex((prev) => prev + 1)
          setRightBeys([emptyBey(), emptyBey(), emptyBey()])
          setRightQuick(['', '', ''])
          setShowBracket(true)
          setShowSetup(false)
        } else {
          setShowBracket(false)
          setShowSetup(false)
        }
      } else {
        const promotedBeys = rightBeys
        const promotedQuick = rightQuick
        setStreakChampionIndex(streakChallengerIndex)
        setStreakChallengerIndex((prev) => prev + 1)
        setStreakCount(1)
        setLeftBeys(promotedBeys)
        setLeftQuick(promotedQuick)
        setRightBeys([emptyBey(), emptyBey(), emptyBey()])
        setRightQuick(['', '', ''])
        setShowBracket(true)
        setShowSetup(false)
      }
      setScoreA(0)
      setScoreB(0)
      setMatchId(null)
      setCountdown(null)
      setLog([])
      setLoadoutLocked(false)
      return
    }

    if (event?.battleType === 'three-on-three') {
      if (scoreA >= winPoints || scoreB >= winPoints) {
        if (currentMatchInfo) {
          const winnerSide = scoreA >= winPoints ? 'A' : 'B'
          setMatchWinners((prev) => {
            const next = prev.filter((item) => item.key !== currentMatchInfo.key)
            next.push({ key: currentMatchInfo.key, winner: winnerSide })
            return next
          })
        }
        setLeftBeys([emptyBey(), emptyBey(), emptyBey()])
        setRightBeys([emptyBey(), emptyBey(), emptyBey()])
        setLeftQuick(['', '', ''])
        setRightQuick(['', '', ''])
        setShowBracket(true)
        setLoadoutLocked(false)
        setShowSetup(false)
        setScoreA(0)
        setScoreB(0)
        setLog([])
        setBattleStarted(false)
        setPendingNextBattle(false)
      } else if (roundLocked) {
        if (roundIndex >= 2) {
          setRoundIndex(0)
          setRoundLocked(false)
          setShowBracket(true)
          setLoadoutLocked(false)
          setShowSetup(false)
          setModalError('3回のバトルで決まらなかったため順番を組み直してください。')
        } else {
          setRoundIndex((prev) => Math.min(prev + 1, 2))
          setRoundLocked(false)
          setBattleStarted(false)
        }
        setPendingNextBattle(false)
      } else {
        return
      }
      setMatchId(null)
      setCountdown(null)
      return
    }

    if (event?.battleType === 'team') {
      const winnerSide =
        teamRightLosses >= 3 ? 'A' : teamLeftLosses >= 3 ? 'B' : null
      if (!winnerSide) {
        if (pendingNextBattle) {
          setPendingNextBattle(false)
          return
        }
        return
      }
      if (!currentMatchInfo) return
      setMatchWinners((prev) => {
        const next = prev.filter((item) => item.key !== currentMatchInfo.key)
        next.push({ key: currentMatchInfo.key, winner: winnerSide })
        return next
      })
      setLeftBeys([emptyBey(), emptyBey(), emptyBey()])
      setRightBeys([emptyBey(), emptyBey(), emptyBey()])
      setLeftQuick(['', '', ''])
      setRightQuick(['', '', ''])
      setShowBracket(true)
      setLoadoutLocked(false)
      setShowSetup(false)
      setScoreA(0)
      setScoreB(0)
      setMatchId(null)
      setCountdown(null)
      setLog([])
      setPendingNextBattle(false)
      return
    }

    if (currentMatchInfo) {
      const winnerSide = scoreA >= winPoints ? 'A' : scoreB >= winPoints ? 'B' : null
      if (!winnerSide) return
      setMatchWinners((prev) => {
        const next = prev.filter((item) => item.key !== currentMatchInfo.key)
        next.push({ key: currentMatchInfo.key, winner: winnerSide })
        return next
      })
      setLeftBeys([emptyBey(), emptyBey(), emptyBey()])
      setRightBeys([emptyBey(), emptyBey(), emptyBey()])
      setLeftQuick(['', '', ''])
      setRightQuick(['', '', ''])
      setScoreA(0)
      setScoreB(0)
      setMatchId(null)
      setCountdown(null)
      setLog([])
      setShowBracket(true)
      setShowSetup(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="card">
        <h1 className="title">大会が見つかりません</h1>
        <Link to="/tournament" className="btn ghost">
          大会トップへ
        </Link>
      </div>
    )
  }

  const leftEntry =
    event.battleType === 'streak'
      ? entries[streakChampionIndex]
      : currentMatchInfo?.a
  const rightEntry =
    event.battleType === 'streak'
      ? entries[streakChallengerIndex]
      : currentMatchInfo?.b

  if (!leftEntry || !rightEntry) {
    return (
      <div className="card">
        <h1 className="title">大会を開始できません</h1>
        <p className="subtitle">必要な情報が不足しています。</p>
        <ul className="list">
          <li className="hint">エントリー人数が不足しています。</li>
          <li className="hint">大会エントリーを2名以上登録してください。</li>
        </ul>
        <div className="actions">
          <Link
            to={`/tournament/${event.id}/entries`}
            state={{ from: `/tournament/${event.id}/start` }}
            className="btn"
          >
            大会エントリーへ
          </Link>
          <Link to={`/tournament/${event.id}/edit`} className="btn ghost">
            大会設定へ
          </Link>
          <Link to="/tournament" className="btn ghost">
            大会トップへ
          </Link>
        </div>
      </div>
    )
  }

  const leftTeamNames = entryUserNames(leftEntry)
  const rightTeamNames = entryUserNames(rightEntry)
  const leftTeamLabel = event.battleType === 'team' ? entryLabel(leftEntry) : null
  const rightTeamLabel = event.battleType === 'team' ? entryLabel(rightEntry) : null
  const leftName =
    event.battleType === 'team'
      ? leftTeamNames[teamLeftIndex] ?? '未設定'
      : entryLabel(leftEntry)
  const rightName =
    event.battleType === 'team'
      ? rightTeamNames[teamRightIndex] ?? '未設定'
      : entryLabel(rightEntry)
  const winCountA = log.filter((item) => item.side === 'A').length
  const winCountB = log.filter((item) => item.side === 'B').length

  const battleMeta = () => {
    switch (event.battleType) {
      case 'streak':
        return `試合: 連勝数 ${streakCount} / 3`
      case 'three-on-three':
        return `試合: 第${Math.min(roundIndex + 1, 3)}ベイ / 3`
      case 'team':
        return `試合: A ${teamRightLosses}勝${teamLeftLosses}敗 / B ${teamLeftLosses}勝${teamRightLosses}敗`
      default:
        return ''
    }
  }

  const battleTypeLabel =
    BATTLE_TYPE_OPTIONS.find((option) => option.value === event.battleType)?.label ??
    event.battleType

  const winConditionLabel = () => {
    switch (event.battleType) {
      case 'streak':
        return '3連勝で勝利'
      case 'one-bey':
        return '4点先取で勝利'
      case 'three-on-three':
        return '合計4点先取で勝利'
      case 'team':
        return '3人撃破で勝利'
      default:
        return ''
    }
  }

  const markerFor = (points: number) => {
    if (points <= 0) return ''
    if (points >= 3) return '☆'
    if (points === 2) return '◎'
    return '◯'
  }

  const winnerSide = () => {
    switch (event.battleType) {
      case 'streak':
        return winCountA > winCountB ? 'A' : winCountB > winCountA ? 'B' : null
      case 'team':
        return teamRightLosses >= 3 ? 'A' : teamLeftLosses >= 3 ? 'B' : null
      default:
        return scoreA >= winPoints ? 'A' : scoreB >= winPoints ? 'B' : null
    }
  }

  const leftIsWinner = winnerSide() === 'A'
  const rightIsWinner = winnerSide() === 'B'

  const allowedPartsForEntry = (entry: EventEntry) => {
    if (!entry.useTeamParts) return null
    const ids = parseJsonArray<string>(entry.userIdsJson, [])
    const teamIds = ids
      .map((id) => users.find((user) => user.id === Number(id))?.teamId)
      .filter((id): id is number => typeof id === 'number')
    if (teamIds.length === 0) return null
    const parts = teamParts.filter((part) => teamIds.includes(part.teamId))
    if (parts.length === 0) return null
    const map = new Map<TeamPart['partKind'], Set<string>>()
    parts.forEach((part) => {
      const set = map.get(part.partKind) ?? new Set<string>()
      set.add(part.partCode)
      map.set(part.partKind, set)
    })
    return map
  }

  const applyQuick = (
    list: typeof leftBeys,
    setList: (next: typeof leftBeys) => void,
    input: string,
    index: number,
    allowed: Map<TeamPart['partKind'], Set<string>> | null,
  ) => {
    const text = input.trim()
    if (!text) return

    const ratchetCodes = [...ratchetsByCode.map((r) => r.code)]
      .filter((code) => !allowed || (allowed.get('ratchet')?.has(code) ?? true))
      .sort((a, b) => b.length - a.length)
    const ratchetMatch = ratchetCodes.find((code) => text.includes(code))

    let bladeText = text
    let ratchetCode = ''
    let bitCode = ''

    if (ratchetMatch) {
      ratchetCode = ratchetMatch
      const parts = text.split(ratchetMatch)
      bladeText = parts[0]
      bitCode = parts[1]?.trim() ?? ''
    }

    if (bitCode) {
      const normalized = bitCode.replace(/[^A-Za-z0-9]/g, '').toLowerCase()
      const match = bitsByCode.find((bit) => {
        if (bit.code.toLowerCase() !== normalized) return false
        if (!allowed) return true
        return allowed.get('bit')?.has(bit.code) ?? true
      })
      if (match) bitCode = match.code
    }

    const isCx = /[A-Za-z]/.test(bladeText)
    const next = [...list]
    if (isCx) {
      const lock = cxLockChips.find(
        (part) =>
          (bladeText.includes(part.code) || bladeText.includes(part.name)) &&
          (!allowed || (allowed.get('cx_lock_chip')?.has(part.code) ?? true)),
      )
      const main = cxMainBlades.find(
        (part) =>
          (bladeText.includes(part.code) || bladeText.includes(part.name)) &&
          (!allowed || (allowed.get('cx_main_blade')?.has(part.code) ?? true)),
      )
      const assist = cxAssistBlades.find(
        (part) =>
          (bladeText.includes(part.code) || bladeText.includes(part.name)) &&
          (!allowed || (allowed.get('cx_assist_blade')?.has(part.code) ?? true)),
      )
      next[index] = {
        ...next[index],
        line: 'CX' as 'UXBX' | 'CX',
        lockChip: lock?.code ?? '',
        mainBlade: main?.code ?? '',
        assistBlade: assist?.code ?? '',
        ratchet: ratchetCode || next[index].ratchet,
        bit: bitCode || next[index].bit,
        blade: '',
      }
    } else {
      const bladeMatch = bladesByName.find((blade) => {
        if (!bladeText.includes(blade.name)) return false
        if (!allowed) return true
        return allowed.get('blade')?.has(blade.code) ?? true
      })
      next[index] = {
        ...next[index],
        line: 'UXBX',
        blade: bladeMatch?.code ?? '',
        ratchet: ratchetCode || next[index].ratchet,
        bit: bitCode || next[index].bit,
        lockChip: '',
        mainBlade: '',
        assistBlade: '',
      }
    }
    setList(next)
  }

  const validateSideBeys = (
    sideLabel: string,
    beys: typeof leftBeys,
    count: number,
    labels?: string[],
    allowDuplicate?: boolean,
  ) => {
    const active = beys.slice(0, count)
    for (let i = 0; i < active.length; i += 1) {
      const bey = active[i]
      const label = labels?.[i] ?? `第${i + 1}ベイ`
      if (bey.line === 'CX') {
        if (!bey.lockChip || !bey.mainBlade || !bey.assistBlade || !bey.ratchet || !bey.bit) {
          return `${sideLabel} ${label}のパーツが未選択です`
        }
      } else {
        if (!bey.blade || !bey.ratchet || !bey.bit) {
          return `${sideLabel} ${label}のパーツが未選択です`
        }
      }
    }

    if (
      !allowDuplicate &&
      (event?.battleType === 'three-on-three' || event?.battleType === 'team')
    ) {
      const bladeParts = new Set<string>()
      const ratchets = new Set<string>()
      const bits = new Set<string>()
      const restrictedLockChips = new Set<string>(['valkyrie', 'emperor'])
      const lockChipCounts = new Map<string, number>()
      for (const bey of active) {
        if (bey.line === 'CX') {
          const lockChip = bey.lockChip
          if (lockChip) {
            const current = lockChipCounts.get(lockChip) ?? 0
            lockChipCounts.set(lockChip, current + 1)
            if (restrictedLockChips.has(lockChip) && current >= 1) {
              return `${sideLabel}のロックチップ(${lockChip})が重複しています`
            }
          }
          const main = bey.mainBlade
          const assist = bey.assistBlade
          if (main) {
            if (bladeParts.has(main)) {
              return `${sideLabel}のメインブレードが重複しています`
            }
            bladeParts.add(main)
          }
          if (assist) {
            if (bladeParts.has(assist)) {
              return `${sideLabel}のアシストブレードが重複しています`
            }
            bladeParts.add(assist)
          }
        } else if (bey.blade) {
          if (bladeParts.has(bey.blade)) {
            return `${sideLabel}のブレードが重複しています`
          }
          bladeParts.add(bey.blade)
        }
        if (bey.ratchet) {
          if (ratchets.has(bey.ratchet)) {
            return `${sideLabel}のラチェットが重複しています`
          }
          ratchets.add(bey.ratchet)
        }
        if (bey.bit) {
          if (bits.has(bey.bit)) {
            return `${sideLabel}のビットが重複しています`
          }
          bits.add(bey.bit)
        }
      }
    }

    return ''
  }

  const leftAllowed = allowedPartsForEntry(leftEntry)
  const rightAllowed = allowedPartsForEntry(rightEntry)
  const modalLeftEntry = event.battleType === 'streak' ? leftEntry : currentMatchInfo?.a
  const modalRightEntry = event.battleType === 'streak' ? rightEntry : currentMatchInfo?.b
  const modalRoundLabel =
    event.battleType === 'streak' ? '連勝バトル' : roundTitleForKey(currentMatchKey)
  const needsTriple = event.battleType === 'three-on-three' || event.battleType === 'team'
  const rowLabels = (_entry?: EventEntry) => {
    if (event.battleType === 'team') {
      return ['1人目', '2人目', '3人目']
    }
    if (event.battleType === 'three-on-three') {
      return ['1stベイ', '2ndベイ', '3rdベイ']
    }
    return ['ベイ']
  }

  const lastLoadoutFor = (entryId?: number) => {
    if (!entryId) return null
    const candidates = matchLoadouts
      .filter((item) => item.entryId === entryId)
      .sort((a, b) => (b.matchId ?? 0) - (a.matchId ?? 0))
    return candidates[0] ?? null
  }

  const copyPreviousLoadout = (
    entryId: number | undefined,
    setList: (next: typeof leftBeys) => void,
    setQuick: (next: string[]) => void,
  ) => {
    const loadout = lastLoadoutFor(entryId)
    if (!loadout?.partsJson) return
    const parsed = parseJsonArray<typeof leftBeys[number]>(loadout.partsJson, [])
    const next = parsed.length ? parsed : [emptyBey(), emptyBey(), emptyBey()]
    setList([next[0] ?? emptyBey(), next[1] ?? emptyBey(), next[2] ?? emptyBey()])
    setQuick(['', '', ''])
  }

  const openBeyEditor = (side: 'A' | 'B', index: number) => {
    setEditorSide(side)
    setEditorIndex(index)
    setShowBeyEditor(true)
  }

  const closeBeyEditor = () => {
    setShowBeyEditor(false)
  }

  const formatBey = (bey: typeof leftBeys[number]) => {
    if (!bey) return ''
    if (bey.line === 'CX') {
      const lock =
        cxLockChips.find((part) => part.code === bey.lockChip)?.name ?? bey.lockChip
      const main =
        cxMainBlades.find((part) => part.code === bey.mainBlade)?.name ?? bey.mainBlade
      const assist =
        cxAssistBlades.find((part) => part.code === bey.assistBlade)?.code ??
        bey.assistBlade
      const ratchet = bey.ratchet ?? ''
      const bit = bey.bit ?? ''
      const base = [lock, main, assist].filter(Boolean).join('')
      if (!base || !ratchet || !bit) return ''
      return `${base}${ratchet}${bit}`
    }
    const blade =
      bladesByName.find((part) => part.code === bey.blade)?.name ?? bey.blade
    if (!blade || !bey.ratchet || !bey.bit) return ''
    return `${blade}${bey.ratchet}${bey.bit}`
  }

  const currentBeyIndex = (side: 'A' | 'B') => {
    if (event.battleType === 'team') {
      return side === 'A' ? teamLeftIndex : teamRightIndex
    }
    if (event.battleType === 'three-on-three') {
      return roundIndex
    }
    return 0
  }

  const currentBeyLabel = (side: 'A' | 'B') => {
    const list = side === 'A' ? leftBeys : rightBeys
    const text = formatBey(list[currentBeyIndex(side)])
    return text || '未設定'
  }

  const renderBeySummary = (
    side: 'A' | 'B',
    list: typeof leftBeys,
    labels: string[],
    quick: string[],
    setQuick: (next: string[]) => void,
    setList: (next: typeof leftBeys) => void,
    allowed: Map<TeamPart['partKind'], Set<string>> | null,
  ) => (
    <div className="bey-summary">
      {labels.map((label, index) => {
        const text = formatBey(list[index])
        return (
          <div key={`${side}-${index}`} className="bey-summary-item">
            <div className="bey-summary-label">{label}</div>
            <div className="bey-summary-body">
              <div className={`bey-summary-value ${text ? 'filled' : 'empty'}`}>
                {text || '未設定'}
              </div>
              <div className="bey-summary-input-row">
                <input
                  className="bey-summary-input"
                  value={quick[index] ?? ''}
                  onChange={(e) => {
                    const next = [...quick]
                    next[index] = e.target.value
                    setQuick(next)
                  }}
                  placeholder="例: シャークスケイル4-50UF"
                />
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => {
                    const current = quick[index]?.trim()
                    if (current) {
                      applyQuick(list, setList, current, index, allowed)
                    }
                    openBeyEditor(side, index)
                  }}
                  disabled={loadoutLocked}
                >
                  ベイ登録
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderBeyEditor = (
    list: typeof leftBeys,
    setList: (next: typeof leftBeys) => void,
    quick: string[],
    setQuick: (next: string[]) => void,
    allowed: Map<TeamPart['partKind'], Set<string>> | null,
    entry: EventEntry | undefined,
    sideLabel: string,
  ) => {
    const labels = rowLabels(entry)
    const currentLabel = labels[editorIndex] ?? `第${editorIndex + 1}ベイ`
    const bey = list[editorIndex]
    return (
      <div className="modal-backdrop bey-editor-backdrop">
        <div className="modal bey-editor-modal">
          <div className="modal-header">
            <h2 className="title">ベイ登録</h2>
            <div className="hint">
              {sideLabel}: {entry ? entryLabel(entry) : '未設定'} / {currentLabel}
            </div>
          </div>
          <div className="quick-input bey-editor-quick">
            <input
              value={quick[editorIndex] ?? ''}
              onChange={(e) => {
                const next = [...quick]
                next[editorIndex] = e.target.value
                setQuick(next)
              }}
              placeholder="例: シャークスケイル4-55LR"
            />
            <button
              type="button"
              className="btn small"
              onClick={() =>
                applyQuick(list, setList, quick[editorIndex] ?? '', editorIndex, allowed)
              }
            >
              反映
            </button>
          </div>
          <div className="bey-editor-grid">
            <select
              value={bey?.line}
              onChange={(e) => {
                const next = [...list]
                next[editorIndex] = { ...next[editorIndex], line: e.target.value as 'UXBX' | 'CX' }
                setList(next)
              }}
            >
              <option value="UXBX">BX/UX</option>
              <option value="CX">CX</option>
            </select>
            {bey?.line === 'CX' ? (
              <>
                <select
                  value={bey.lockChip}
                  onChange={(e) => {
                    const next = [...list]
                    next[editorIndex] = { ...next[editorIndex], lockChip: e.target.value }
                    setList(next)
                  }}
                >
                  <option value="">ロックチップ</option>
                  {(allowed
                    ? cxLockChips.filter((part) => allowed.get('cx_lock_chip')?.has(part.code))
                    : cxLockChips
                  ).map((part) => (
                    <option key={part.code} value={part.code}>
                      {part.name}
                    </option>
                  ))}
                </select>
                <select
                  value={bey.mainBlade}
                  onChange={(e) => {
                    const next = [...list]
                    next[editorIndex] = { ...next[editorIndex], mainBlade: e.target.value }
                    setList(next)
                  }}
                >
                  <option value="">メインブレード</option>
                  {(allowed
                    ? cxMainBlades.filter((part) => allowed.get('cx_main_blade')?.has(part.code))
                    : cxMainBlades
                  ).map((part) => (
                    <option key={part.code} value={part.code}>
                      {part.name}
                    </option>
                  ))}
                </select>
                <select
                  value={bey.assistBlade}
                  onChange={(e) => {
                    const next = [...list]
                    next[editorIndex] = { ...next[editorIndex], assistBlade: e.target.value }
                    setList(next)
                  }}
                >
                  <option value="">アシストブレード</option>
                  {(allowed
                    ? cxAssistBlades.filter((part) => allowed.get('cx_assist_blade')?.has(part.code))
                    : cxAssistBlades
                  ).map((part) => (
                    <option key={part.code} value={part.code}>
                      {part.code}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <select
                value={bey.blade}
                onChange={(e) => {
                  const next = [...list]
                  next[editorIndex] = { ...next[editorIndex], blade: e.target.value }
                  setList(next)
                }}
              >
                <option value="">ブレード</option>
                {(allowed
                  ? bladesByName.filter((part) => allowed.get('blade')?.has(part.code))
                  : bladesByName
                ).map((part) => (
                  <option key={part.code} value={part.code}>
                    {part.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={bey.ratchet}
              onChange={(e) => {
                const next = [...list]
                next[editorIndex] = { ...next[editorIndex], ratchet: e.target.value }
                setList(next)
              }}
            >
              <option value="">ラチェット</option>
              {(allowed
                ? ratchetsByCode.filter((part) => allowed.get('ratchet')?.has(part.code))
                : ratchetsByCode
              ).map((part) => (
                <option key={part.code} value={part.code}>
                  {part.code}
                </option>
              ))}
            </select>
            <select
              value={bey.bit}
              onChange={(e) => {
                const next = [...list]
                next[editorIndex] = { ...next[editorIndex], bit: e.target.value }
                setList(next)
              }}
            >
              <option value="">ビット</option>
              {(allowed
                ? bitsByCode.filter((part) => allowed.get('bit')?.has(part.code))
                : bitsByCode
              ).map((part) => (
                <option key={part.code} value={part.code}>
                  {part.code}
                </option>
              ))}
            </select>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={closeBeyEditor}>
              決定
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleStartMatch = () => {
    const count = event.battleType === 'three-on-three' || event.battleType === 'team' ? 3 : 1
    const leftError = validateSideBeys(
      'レフト',
      leftBeys,
      count,
      rowLabels(leftEntry),
      false,
    )
    if (leftError) {
      setModalError(leftError)
      return
    }
    const rightError = validateSideBeys(
      'ライト',
      rightBeys,
      count,
      rowLabels(rightEntry),
      false,
    )
    if (rightError) {
      setModalError(rightError)
      return
    }
    setModalError('')
    setShowBracket(false)
    setCountdown(null)
    if (event.battleType === 'three-on-three' || event.battleType === 'team') {
      setLoadoutLocked(true)
    }
    if (event.battleType === 'three-on-three') {
      setRoundLocked(false)
      setRoundIndex(0)
    }
    setShowSetup(false)
  }

  const openSetup = () => {
    setShowBracket(false)
    setShowSetup(true)
  }

  const openBracket = () => {
    setShowSetup(false)
    setShowBracket(true)
  }

  const closeBracket = () => {
    navigate('/tournament')
  }

  return (
    <div className="card battle">
      <div className="battle-header battle-header-grid">
        <div className="battle-header-meta">
          <h1 className="title">{event.name}</h1>
          <div className="meta-stack">
            <div className="meta-row">
              <span className="label">使用スタジアム</span>
              <span>{STADIUM_LABEL[event.stadium]}</span>
            </div>
            <div className="meta-row">
              <span className="label">バトル形式</span>
              <span>{battleTypeLabel}</span>
            </div>
            <div className="meta-row">
              <span className="label">勝利条件</span>
              <span>{winConditionLabel()}</span>
            </div>
          </div>
          <p className="hint">{battleMeta()}</p>
          {tournamentCompleted ? (
            <p className="hint">大会は完了しました。</p>
          ) : null}
        </div>
        <div className="battle-hero">
          <div className="battle-round">
            {leftName} vs {rightName}
          </div>
          <div className="battle-scoreline">
            <span className="battle-score small">
              <span className="score-number">{winCountA}</span>
              <span className="score-unit">勝</span>
              <span className="score-number">{scoreA}</span>
              <span className="score-unit">Pt</span>
            </span>
            <span className="battle-vs">VS</span>
            <span className="battle-score small">
              <span className="score-number">{winCountB}</span>
              <span className="score-unit">勝</span>
              <span className="score-number">{scoreB}</span>
              <span className="score-unit">Pt</span>
            </span>
          </div>
          {event.battleType === 'streak' && pendingNextBattle ? (
            <div className="callout">
              <button type="button" className="btn prominent" onClick={nextBattle}>
                次のバトルへ
              </button>
              <div className="callout-note">
                勝った人はそのまま、負けた人は次の人に交代してください
              </div>
            </div>
          ) : winnerSide() ? null : event.battleType === 'three-on-three' && roundLocked ? (
            <div className="callout">
              <button type="button" className="btn prominent" onClick={nextBattle}>
                次のバトルへ
              </button>
              <div className="callout-note">次のベイでバトルを開始します</div>
            </div>
          ) : event.battleType === 'team' && pendingNextBattle ? (
            <div className="callout">
              <button type="button" className="btn prominent" onClick={nextBattle}>
                次のバトルへ
              </button>
              <div className="callout-note">次のプレイヤーでバトルを開始します</div>
            </div>
          ) : (
            <div className="callout">
              <button type="button" className="btn prominent" onClick={startCountdown}>
                バトル開始
              </button>
              <div className="callout-note">3-2-1-Go Shoot!を表示します</div>
            </div>
          )}
          {winnerSide() ? (
            <div className="battle-winner">
              勝者: {winnerSide() === 'A' ? leftName : rightName}
            </div>
          ) : (
            <p className="hint">勝った側の決まり手をタップしてください</p>
          )}
          {winnerSide() && event.battleType !== 'streak' ? (
            <div className="battle-next">
              <div className="callout">
                <button type="button" className="btn prominent" onClick={nextBattle}>
                  次の試合へ
                </button>
                <div className="callout-note">次の対戦へ進みます</div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="row-actions">
          <button type="button" className="btn ghost" onClick={openSetup}>
            ベイ登録設定
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setShowResetConfirm(true)}
          >
            勝敗リセット
          </button>
        </div>
      </div>

      <div className="battle-grid">
        <div className={`battle-card side-left ${leftIsWinner ? 'winner' : ''}`}>
          <div className="battle-label">
            レフトサイド
            {event.battleType === 'team' ? (
              <span className="battle-meta-inline">
                現在 {teamLeftIndex + 1}番手 / 残り {Math.max(3 - teamLeftLosses, 0)}人
              </span>
            ) : null}
          </div>
          <div className="battle-name-row">
            <div className="battle-name">{leftName}</div>
            <div className="battle-bey">{currentBeyLabel('A')}</div>
          </div>
          {leftTeamLabel ? <div className="battle-subname">{leftTeamLabel}</div> : null}
          <div className="battle-score-row">
            <div className="battle-score">
              <span className="score-number">{winCountA}</span>
              <span className="score-unit">勝</span>
              <span className="score-number">{scoreA}</span>
              <span className="score-unit">Pt</span>
            </div>
            <div className="finish-stack">
              {log
                .filter((item) => item.side === 'A')
                .slice()
                .sort((a, b) => a.battleIndex - b.battleIndex)
                .map((item) => (
                  <div key={`${item.battleIndex}-${item.label}`} className="finish-item">
                    {`${item.battleIndex}. ${markerFor(item.points)}${item.label}`}
                  </div>
                ))}
            </div>
          </div>
          <div className="battle-actions">
            {FINISHES.map((finish) => (
              <button
                key={finish.type}
                type="button"
                className="btn small"
                onClick={() => addPoint('A', finish.type, finish.points)}
                disabled={tournamentCompleted}
              >
                {finish.label}
              </button>
            ))}
          </div>
        </div>
        <div className={`battle-card side-right ${rightIsWinner ? 'winner' : ''}`}>
          <div className="battle-label">
            ライトサイド
            {event.battleType === 'team' ? (
              <span className="battle-meta-inline">
                現在 {teamRightIndex + 1}番手 / 残り {Math.max(3 - teamRightLosses, 0)}人
              </span>
            ) : null}
          </div>
          <div className="battle-name-row">
            <div className="battle-name">{rightName}</div>
            <div className="battle-bey">{currentBeyLabel('B')}</div>
          </div>
          {rightTeamLabel ? <div className="battle-subname">{rightTeamLabel}</div> : null}
          <div className="battle-score-row">
            <div className="battle-score">
              <span className="score-number">{winCountB}</span>
              <span className="score-unit">勝</span>
              <span className="score-number">{scoreB}</span>
              <span className="score-unit">Pt</span>
            </div>
            <div className="finish-stack">
              {log
                .filter((item) => item.side === 'B')
                .slice()
                .sort((a, b) => a.battleIndex - b.battleIndex)
                .map((item) => (
                  <div key={`${item.battleIndex}-${item.label}`} className="finish-item">
                    {`${item.battleIndex}. ${markerFor(item.points)}${item.label}`}
                  </div>
                ))}
            </div>
          </div>
          <div className="battle-actions">
            {FINISHES.map((finish) => (
              <button
                key={finish.type}
                type="button"
                className="btn small"
                onClick={() => addPoint('B', finish.type, finish.points)}
                disabled={tournamentCompleted}
              >
                {finish.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {countdown !== null ? (
        <div className="countdown-overlay">
          <div className="countdown-text">
            {countdown > 0 ? countdown : 'Go Shoot!'}
          </div>
        </div>
      ) : null}

      {showBracket ? (
        <div className="countdown-overlay">
          <div className="bracket-modal">
            <div className="bracket-header">
              <div>
                <div className="hint">トーナメント表</div>
              </div>
            </div>
            {event.battleType !== 'streak' ? (
              <div className="bracket-grid">
                {rounds.map((round, roundIndex) => (
                  <div key={roundIndex} className="bracket-col">
                    <div className="bracket-col-title">
                      {roundTitle(roundIndex)}
                    </div>
                    {round.map((pair) => (
                      <div
                        key={pair.key}
                        className={`bracket-match ${pair.key === currentMatchKey ? 'active-row' : ''}`}
                      >
                        <div className="row-title">
                          {entryLabel(pair.a)} vs {entryLabel(pair.b)}
                        </div>
                        <div className="hint">
                          {winnerMap.get(pair.key)
                            ? `勝者: ${winnerMap.get(pair.key) === 'A' ? entryLabel(pair.a) : entryLabel(pair.b)}`
                            : '未決'}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="match-hero">
                <div className="match-round">連勝バトル</div>
                <div className="match-players">
                  <div className="match-player-box left">
                    <div className="match-player">{entryLabel(modalLeftEntry)}</div>
                  </div>
                  <div className="match-vs">VS</div>
                  <div className="match-player-box right">
                    <div className="match-player">{entryLabel(modalRightEntry)}</div>
                  </div>
                </div>
              </div>
            )}
            <div className="bracket-actions">
              <div className="callout">
                <button type="button" className="btn prominent" onClick={openSetup}>
                  試合開始
                </button>
                <div className="callout-note">次の対戦のベイ登録へ進みます</div>
              </div>
              <div className="callout">
                <button type="button" className="btn ghost" onClick={closeBracket}>
                  戻る
                </button>
                <div className="callout-note">&nbsp;</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tournamentCompleted ? (
        <div className="countdown-overlay">
          <div className="winner-modal">
            <div className="winner-label">優勝</div>
            <div className="winner-name">{finalWinnerName}</div>
            <div className="callout">
              <button type="button" className="btn prominent" onClick={finishTournament}>
                大会結果詳細へ
              </button>
              <div className="callout-note">大会結果ページへ移動します</div>
            </div>
          </div>
        </div>
      ) : null}

      {showSetup ? (
        <div className="countdown-overlay">
          <div className="bracket-modal">
            <div className="bracket-header">
              <div>
                <div className="hint">バトル設定</div>
              </div>
            </div>
            {modalLeftEntry && modalRightEntry ? (
              <div className="match-hero">
                <div className="match-round">{modalRoundLabel}</div>
                <div className="match-players">
                  <div className="match-player-box left">
                    <div className="match-player">{entryLabel(modalLeftEntry)}</div>
                    {needsTriple && lastLoadoutFor(modalLeftEntry?.id) ? (
                      <div className="bey-options">
                        <button
                          type="button"
                          className="btn ghost small"
                          onClick={() =>
                            copyPreviousLoadout(
                              modalLeftEntry?.id,
                              setLeftBeys,
                              setLeftQuick,
                            )
                          }
                          disabled={loadoutLocked}
                        >
                          前の試合をコピー
                        </button>
                      </div>
                    ) : null}
                    {renderBeySummary(
                      'A',
                      leftBeys,
                      rowLabels(modalLeftEntry),
                      leftQuick,
                      setLeftQuick,
                      setLeftBeys,
                      leftAllowed,
                    )}
                  </div>
                  <div className="match-vs">VS</div>
                  <div className="match-player-box right">
                    <div className="match-player">{entryLabel(modalRightEntry)}</div>
                    {needsTriple && lastLoadoutFor(modalRightEntry?.id) ? (
                      <div className="bey-options">
                        <button
                          type="button"
                          className="btn ghost small"
                          onClick={() =>
                            copyPreviousLoadout(
                              modalRightEntry?.id,
                              setRightBeys,
                              setRightQuick,
                            )
                          }
                          disabled={loadoutLocked}
                        >
                          前の試合をコピー
                        </button>
                      </div>
                    ) : null}
                    {renderBeySummary(
                      'B',
                      rightBeys,
                      rowLabels(modalRightEntry),
                      rightQuick,
                      setRightQuick,
                      setRightBeys,
                      rightAllowed,
                    )}
                  </div>
                </div>
              </div>
            ) : null}
            {modalError ? <p className="error">{modalError}</p> : null}
            <div className="bracket-actions">
              <button type="button" className="btn" onClick={handleStartMatch}>
                バトル開始
              </button>
              <button type="button" className="btn ghost" onClick={openBracket}>
                戻る
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showBeyEditor
        ? renderBeyEditor(
            editorSide === 'A' ? leftBeys : rightBeys,
            editorSide === 'A' ? setLeftBeys : setRightBeys,
            editorSide === 'A' ? leftQuick : rightQuick,
            editorSide === 'A' ? setLeftQuick : setRightQuick,
            editorSide === 'A' ? leftAllowed : rightAllowed,
            editorSide === 'A' ? modalLeftEntry : modalRightEntry,
            editorSide === 'A' ? 'レフト' : 'ライト',
          )
        : null}

      {showResetConfirm ? (
        <div className="countdown-overlay">
          <div className="modal">
            <h2 className="title">確認</h2>
            <p className="subtitle">この試合の結果をリセットしていいですか？</p>
            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  resetBattle()
                  setShowResetConfirm(false)
                }}
              >
                はい
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setShowResetConfirm(false)}
              >
                いいえ
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {teamWinNotice ? (
        <div className="countdown-overlay">
          <div className="modal">
            <h2 className="title">勝利</h2>
            <p className="subtitle">
              {teamWinNotice.winner} の勝利です。{teamWinNotice.loserTeam}
              チームは次のプレイヤーと交代してください。
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() => setTeamWinNotice(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
