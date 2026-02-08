import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import {
  blades,
  bits,
  ratchets,
  cxAssistBlades,
  cxLockChips,
  cxMainBlades,
} from '../data/parts'
import type { MatchLoadout, MatchPoint, Team, User } from '../types'

export default function Analytics() {
  const [matchCount, setMatchCount] = useState(0)
  const [pointCount, setPointCount] = useState(0)
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [points, setPoints] = useState<MatchPoint[]>([])
  const [loadouts, setLoadouts] = useState<MatchLoadout[]>([])
  const [loading, setLoading] = useState(true)
  const [cutoffDate, setCutoffDate] = useState('')
  const [actionInfo, setActionInfo] = useState('')
  const [actionError, setActionError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      const [matches, points, users, loadouts, teams] = await Promise.all([
        db.matches.count(),
        db.match_points.toArray(),
        db.users.toArray(),
        db.match_loadouts.toArray(),
        db.teams.toArray(),
      ])
      if (active) {
        setMatchCount(matches)
        setPointCount(points.length)
        setPoints(points)
        setUsers(users)
        setLoadouts(loadouts)
        setTeams(teams)
        setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const reload = async () => {
    const [matches, points, users, loadouts, teams] = await Promise.all([
      db.matches.count(),
      db.match_points.toArray(),
      db.users.toArray(),
      db.match_loadouts.toArray(),
      db.teams.toArray(),
    ])
    setMatchCount(matches)
    setPointCount(points.length)
    setPoints(points)
    setUsers(users)
    setLoadouts(loadouts)
    setTeams(teams)
  }

  const partNameMap = useMemo(() => {
    const map = new Map<string, string>()
    blades.forEach((part) => map.set(part.code, part.name))
    cxLockChips.forEach((part) => map.set(part.code, part.name))
    cxMainBlades.forEach((part) => map.set(part.code, part.name))
    cxAssistBlades.forEach((part) => map.set(part.code, part.name || part.code))
    ratchets.forEach((part) => map.set(part.code, part.name || part.code))
    bits.forEach((part) => map.set(part.code, part.name || part.code))
    return map
  }, [])

  const labelForPart = (code: string) => partNameMap.get(code) ?? code

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

  const teamPoints = useMemo(() => {
    const teamMap = new Map(teams.map((team) => [team.id, team.name]))
    const userTeam = new Map(users.map((user) => [user.id, user.teamId]))
    const map = new Map<string, number>()
    points.forEach((point) => {
      const loadout = loadouts.find(
        (item) => item.matchId === point.matchId && item.side === point.winnerSide,
      )
      const ids = loadout?.userIdsJson ? JSON.parse(loadout.userIdsJson) as string[] : []
      ids.forEach((id) => {
        const teamId = userTeam.get(Number(id))
        if (!teamId) return
        const name = teamMap.get(teamId) ?? '不明'
        map.set(name, (map.get(name) ?? 0) + point.points)
      })
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [points, loadouts, users, teams])

  const partPoints = useMemo(() => {
    const map = new Map<string, number>()
    points.forEach((point) => {
      const loadout = loadouts.find(
        (item) => item.matchId === point.matchId && item.side === point.winnerSide,
      )
      if (!loadout?.partsJson) return
      const parts = JSON.parse(loadout.partsJson) as {
        blade?: string
        lockChip?: string
        mainBlade?: string
        assistBlade?: string
        ratchet?: string
        bit?: string
      }[]
      parts.forEach((bey) => {
        const keys = [
          bey.blade,
          bey.lockChip,
          bey.mainBlade,
          bey.assistBlade,
          bey.ratchet,
          bey.bit,
        ].filter(Boolean) as string[]
        keys.forEach((key) => {
          const label = labelForPart(key)
          map.set(label, (map.get(label) ?? 0) + point.points)
        })
      })
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [points, loadouts, partNameMap])

  const beyCombos = useMemo(() => {
    const map = new Map<string, number>()
    points.forEach((point) => {
      const loadout = loadouts.find(
        (item) => item.matchId === point.matchId && item.side === point.winnerSide,
      )
      if (!loadout?.partsJson) return
      const parts = JSON.parse(loadout.partsJson) as {
        blade?: string
        lockChip?: string
        mainBlade?: string
        assistBlade?: string
        ratchet?: string
        bit?: string
      }[]
      parts.forEach((bey) => {
        const label = [
          bey.blade ? labelForPart(bey.blade) : 'CX',
          bey.lockChip ? labelForPart(bey.lockChip) : undefined,
          bey.mainBlade ? labelForPart(bey.mainBlade) : undefined,
          bey.assistBlade ? labelForPart(bey.assistBlade) : undefined,
          bey.ratchet ? labelForPart(bey.ratchet) : undefined,
          bey.bit ? labelForPart(bey.bit) : undefined,
        ]
          .filter(Boolean)
          .join(' / ')
        map.set(label, (map.get(label) ?? 0) + point.points)
      })
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [points, loadouts, partNameMap])

  const handleResetAll = async () => {
    if (!window.confirm('勝敗データをすべて削除します。よろしいですか？')) return
    setDeleting(true)
    setActionError('')
    setActionInfo('')
    await db.transaction('rw', db.match_points, db.match_loadouts, db.matches, async () => {
      await db.match_points.clear()
      await db.match_loadouts.clear()
      await db.matches.clear()
    })
    setActionInfo('勝敗データをすべて削除しました。')
    await reload()
    setDeleting(false)
  }

  const handleDeleteBefore = async () => {
    setActionError('')
    setActionInfo('')
    if (!cutoffDate) {
      setActionError('削除する日付を選択してください。')
      return
    }
    const cutoff = new Date(cutoffDate)
    if (Number.isNaN(cutoff.getTime())) {
      setActionError('日付の形式が正しくありません。')
      return
    }
    cutoff.setHours(23, 59, 59, 999)
    if (
      !window.confirm(
        `${cutoffDate}以前の勝敗データを削除します。よろしいですか？`,
      )
    ) {
      return
    }
    setDeleting(true)
    const matches = await db.matches
      .filter((match) => new Date(match.createdAt).getTime() <= cutoff.getTime())
      .toArray()
    const ids = matches.map((match) => match.id).filter(Boolean) as number[]
    if (ids.length === 0) {
      setActionInfo('該当するデータはありません。')
      setDeleting(false)
      return
    }
    await db.transaction('rw', db.match_points, db.match_loadouts, db.matches, async () => {
      await db.match_points.where('matchId').anyOf(ids).delete()
      await db.match_loadouts.where('matchId').anyOf(ids).delete()
      await db.matches.where('id').anyOf(ids).delete()
    })
    setActionInfo(`${ids.length}件の試合データを削除しました。`)
    await reload()
    setDeleting(false)
  }

  return (
    <div className="card">
      <h1 className="title">データ解析</h1>
      {loading ? (
        <p>集計中...</p>
      ) : (
        <div className="info">
          <div>
            <span className="label">試合数</span>
            <span>{matchCount}</span>
          </div>
          <div>
            <span className="label">ポイントログ数</span>
            <span>{pointCount}</span>
          </div>
        </div>
      )}

      {!loading ? (
        <>
          <div className="section">
            <h2 className="section-title">グループ別ポイント Top 5</h2>
            {teamPoints.length === 0 ? (
              <p className="hint">まだ記録がありません。</p>
            ) : (
              <ol className="simple-list">
                {teamPoints.slice(0, 5).map(([name, total]) => (
                  <li key={name}>
                    <span className="item-name">{name}</span>
                    <span className="item-value">{total} pt</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="section">
            <h2 className="section-title">ユーザ別ポイント Top 5</h2>
            {userPoints.length === 0 ? (
              <p className="hint">まだ記録がありません。</p>
            ) : (
              <ol className="simple-list">
                {userPoints.slice(0, 5).map(([name, total]) => (
                  <li key={name}>
                    <span className="item-name">{name}</span>
                    <span className="item-value">{total} pt</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="section">
            <h2 className="section-title">ベイ構成別ポイント Top 5</h2>
            {beyCombos.length === 0 ? (
              <p className="hint">まだ記録がありません。</p>
            ) : (
              <ol className="simple-list">
                {beyCombos.slice(0, 5).map(([combo, total]) => (
                  <li key={combo}>
                    <span className="item-name">{combo}</span>
                    <span className="item-value">{total} pt</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="section">
            <h2 className="section-title">パーツ別ポイント Top 5</h2>
            {partPoints.length === 0 ? (
              <p className="hint">まだ記録がありません。</p>
            ) : (
              <ol className="simple-list">
                {partPoints.slice(0, 5).map(([part, total]) => (
                  <li key={part}>
                    <span className="item-name">{part}</span>
                    <span className="item-value">{total} pt</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="section">
            <h2 className="section-title">勝敗データ管理</h2>
            <p className="hint">
              試合・ポイント・ベイ構成のログを削除します。大会設定やユーザ/グループ情報は保持されます。
            </p>
            <div className="form">
              <label className="field">
                指定日以前のデータを削除
                <input
                  type="date"
                  value={cutoffDate}
                  onChange={(event) => setCutoffDate(event.target.value)}
                />
              </label>
              <div className="actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={handleDeleteBefore}
                  disabled={deleting}
                >
                  指定日以前を削除
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleResetAll}
                  disabled={deleting}
                >
                  勝敗データを全リセット
                </button>
              </div>
              {actionError ? <p className="error">{actionError}</p> : null}
              {actionInfo ? <p className="hint">{actionInfo}</p> : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
