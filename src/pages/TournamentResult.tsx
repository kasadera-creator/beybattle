import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db } from '../db'
import {
  battleTypeLabel,
  normalizeEventStatus,
  stadiumLabel,
  type Event,
  type FinishType,
  type MatchLoadout,
  type MatchPoint,
  type User,
} from '../types'

export default function TournamentResult() {
  const { eventId } = useParams()
  const [event, setEvent] = useState<Event | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loadouts, setLoadouts] = useState<MatchLoadout[]>([])
  const [points, setPoints] = useState<MatchPoint[]>([])
  const [matchesCount, setMatchesCount] = useState(0)
  const [pointsCount, setPointsCount] = useState(0)
  const [finishCounts, setFinishCounts] = useState<Record<FinishType, number>>({
    spin: 0,
    over: 0,
    burst: 0,
    ko: 0,
    ringout: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = Number(eventId)
    if (Number.isNaN(id)) {
      setLoading(false)
      return
    }
    const load = async () => {
      const data = await db.events.get(id)
      const matches = await db.matches.where('eventId').equals(id).toArray()
      const matchIds = matches.map((match) => match.id).filter(Boolean) as number[]
      const points = matchIds.length
        ? await db.match_points.where('matchId').anyOf(matchIds).toArray()
        : []
      const loadouts = matchIds.length
        ? await db.match_loadouts.where('matchId').anyOf(matchIds).toArray()
        : []
      const users = await db.users.toArray()
      const finish = points.reduce<Record<FinishType, number>>(
        (acc, item) => {
          acc[item.finishType] = (acc[item.finishType] ?? 0) + 1
          return acc
        },
        { spin: 0, over: 0, burst: 0, ko: 0, ringout: 0 },
      )
      setEvent(data ?? null)
      setUsers(users)
      setLoadouts(loadouts)
      setPoints(points)
      setMatchesCount(matches.length)
      setPointsCount(points.length)
      setFinishCounts(finish)
      setLoading(false)
    }
    load()
  }, [eventId])

  const finishItems = useMemo(
    () => [
      { label: 'スピン', value: finishCounts.spin },
      { label: 'オーバー', value: finishCounts.over },
      { label: 'バースト', value: finishCounts.burst },
      { label: 'エクストリーム', value: finishCounts.ko },
    ],
    [finishCounts],
  )

  const userPoints = useMemo(() => {
    const map = new Map<string, number>()
    const userMap = new Map(users.map((user) => [String(user.id), user.name]))
    points.forEach((point) => {
      const loadout = loadouts.find(
        (item) => item.matchId === point.matchId && item.side === point.winnerSide,
      )
      const ids = loadout?.userIdsJson ? JSON.parse(loadout.userIdsJson) as string[] : []
      ids.forEach((id) => {
        const name = userMap.get(String(id)) ?? '不明'
        map.set(name, (map.get(name) ?? 0) + point.points)
      })
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [points, loadouts, users])

  const pointLogs = useMemo(() => {
    const userMap = new Map(users.map((user) => [String(user.id), user.name]))
    return points
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((point) => {
        const loadout = loadouts.find(
          (item) => item.matchId === point.matchId && item.side === point.winnerSide,
        )
        const ids = loadout?.userIdsJson ? JSON.parse(loadout.userIdsJson) as string[] : []
        const names = ids.map((id) => userMap.get(String(id)) ?? '不明').join(' / ')
        return {
          id: `${point.matchId}-${point.createdAt}`,
          side: point.winnerSide,
          finish: point.finishType,
          points: point.points,
          users: names || '未設定',
          time: new Date(point.createdAt).toLocaleString(),
        }
      })
  }, [points, loadouts, users])

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

  return (
    <div className="card">
      <h1 className="title">大会結果</h1>
      <p className="subtitle">{event.name}</p>
      <div className="info">
        <div>
          <span className="label">ステータス</span>
          <span>{normalizeEventStatus(event.status)}</span>
        </div>
        <div>
          <span className="label">優勝</span>
          <span>{event.winnerName ?? '未確定'}</span>
        </div>
        <div>
          <span className="label">スタジアム</span>
          <span>{stadiumLabel(event.stadium)}</span>
        </div>
        <div>
          <span className="label">バトル方式</span>
          <span>{battleTypeLabel(event.battleType)}</span>
        </div>
        <div>
          <span className="label">試合数</span>
          <span>{matchesCount}</span>
        </div>
        <div>
          <span className="label">ポイントログ</span>
          <span>{pointsCount}</span>
        </div>
      </div>
      <div className="section">
        <h2 className="section-title">決まり手集計</h2>
        <div className="list">
          {finishItems.map((item) => (
            <div key={item.label} className="row">
              <div className="row-title">{item.label}</div>
              <div className="hint">{item.value} 回</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">選手別ポイント</h2>
        <div className="list">
          {userPoints.length === 0 ? (
            <p className="hint">まだ記録がありません。</p>
          ) : (
            userPoints.map(([name, total]) => (
              <div key={name} className="row">
                <div className="row-title">{name}</div>
                <div className="hint">{total} pt</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">勝敗ログ</h2>
        <div className="list">
          {pointLogs.length === 0 ? (
            <p className="hint">まだ記録がありません。</p>
          ) : (
            pointLogs.map((item) => (
              <div key={item.id} className="row">
                <div>
                  <div className="row-title">{item.users}</div>
                  <div className="hint">
                    {item.finish} / {item.points}pt / {item.time}
                  </div>
                </div>
                <div className="hint">Side {item.side}</div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="actions" style={{ marginTop: 16 }}>
        <Link to="/tournament" className="btn">
          大会トップへ
        </Link>
        <Link to={`/tournament/${event.id}`} className="btn ghost">
          大会画面へ
        </Link>
      </div>
    </div>
  )
}
