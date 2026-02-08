import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import { battleTypeLabel, type Event, type EventEntry, type TeamPart, type User } from '../types'

const nowIso = () => new Date().toISOString()

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

export default function TournamentEntries() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [entries, setEntries] = useState<EventEntry[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [teamParts, setTeamParts] = useState<TeamPart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const location = useLocation()

  const [userId, setUserId] = useState('')
  const [userIds, setUserIds] = useState<string[]>(['', '', ''])
  const [useTeamParts, setUseTeamParts] = useState(true)
  const [teamName, setTeamName] = useState('')

  const load = async (id: number) => {
    const [eventData, entryList, userList, parts] = await Promise.all([
      db.events.get(id),
      db.event_entries.where('eventId').equals(id).toArray(),
      db.users.orderBy('createdAt').toArray(),
      db.team_parts.toArray(),
    ])
    setEvent(eventData ?? null)
    setEntries(entryList)
    setUsers(userList)
    setTeamParts(parts)
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
    if ((location.state as { updated?: boolean } | null)?.updated) {
      setInfo('大会設定を更新しました。エントリー形式を確認してください。')
    }
  }, [location.state])

  const backTo = (location.state as { from?: string } | null)?.from ?? '/tournament'

  const selectedUsers = useMemo(() => {
    if (!event) return []
    if (event.battleType === 'team') return userIds.filter(Boolean)
    return userId ? [userId] : []
  }, [event, userId, userIds])

  const canDeclareTeamParts = useMemo(() => {
    if (selectedUsers.length === 0) return false
    const selectedUserRecords = users.filter((user) =>
      selectedUsers.includes(String(user.id)),
    )
    if (selectedUserRecords.some((user) => !user.teamId)) return false
    const teamIds = selectedUserRecords
      .map((user) => user.teamId)
      .filter((id): id is number => typeof id === 'number')
    if (teamIds.length === 0) return false
    return teamIds.every((id) =>
      teamParts.some((part) => part.teamId === id),
    )
  }, [selectedUsers, teamParts, users])

  const handleSubmit = async (eventForm: React.FormEvent) => {
    eventForm.preventDefault()
    setError('')
    setInfo('')

    if (!event?.id) return

    if (event.battleType === 'team') {
      const uniqueUsers = new Set(userIds.filter(Boolean))
      if (uniqueUsers.size !== 3) {
        setError('ユーザを3名選択してください')
        return
      }
      if (!teamName.trim()) {
        setError('チーム名を入力してください')
        return
      }
    } else {
      if (!userId) {
        setError('ユーザを選択してください')
        return
      }
    }

    await db.event_entries.add({
      eventId: event.id,
      userIdsJson: JSON.stringify(selectedUsers),
      beyNamesJson: JSON.stringify([]),
      beyPartsJson: JSON.stringify([]),
      useTeamParts: useTeamParts && canDeclareTeamParts,
      teamName: event.battleType === 'team' ? teamName.trim() : undefined,
      createdAt: nowIso(),
    })

    setInfo('エントリーを追加しました')
    setUserId('')
    setUserIds(['', '', ''])
    setUseTeamParts(true)
    setTeamName('')
    await load(event.id)
  }

  const handleDelete = async (entryId: number) => {
    if (!event?.id) return
    await db.event_entries.delete(entryId)
    await load(event.id)
  }

  const partsLabel = (entry: EventEntry) =>
    entry.useTeamParts ? '所有パーツで絞り込み' : '全パーツ表示'

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

  const userName = (id: string) => {
    const found = users.find((user) => user.id === Number(id))
    return found?.name ?? '不明'
  }

  return (
    <div className="card">
      <h1 className="title">大会エントリー</h1>
      <p className="subtitle">
        {event.name} / {battleTypeLabel(event.battleType)}
      </p>
      <p className="hint">
        グループはパーツを共有する集まりです。ベイ構成はバトルごとに登録します。
      </p>

      <div className="entry-layout">
        <form className="form" onSubmit={handleSubmit}>
          {event.battleType === 'team' ? (
            <>
              <label className="field">
                チーム名
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="例: X-TEAM"
                />
              </label>
              <div className="field">
                ユーザ(3名)
                {userIds.map((value, index) => (
                  <select
                    key={index}
                    value={value}
                    onChange={(e) => {
                      const next = [...userIds]
                      next[index] = e.target.value
                      setUserIds(next)
                    }}
                  >
                    <option value="">選択してください</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </>
          ) : (
            <label className="field">
              ユーザ
              <select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">選択してください</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field inline">
            <input
              type="checkbox"
              checked={useTeamParts && canDeclareTeamParts}
              onChange={(e) => setUseTeamParts(e.target.checked)}
              disabled={!canDeclareTeamParts}
            />
            所属グループの所有パーツを申告して絞り込む
          </label>
          {!canDeclareTeamParts ? (
            <p className="hint">
              所属グループがない、または所有パーツが未登録のため申告をスキップします。
            </p>
          ) : (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => setUseTeamParts(false)}
            >
              申告をスキップ
            </button>
          )}

          {error ? <p className="error">{error}</p> : null}
          {info ? <p className="hint">{info}</p> : null}

          <div className="actions">
            <button type="submit" className="btn">
              エントリー追加
            </button>
          </div>
        </form>

        <div className="section entry-list">
          <h2 className="section-title">エントリー一覧</h2>
          <div className="list">
            {entries.length === 0 ? (
              <p className="hint">まだエントリーがありません。</p>
            ) : (
              entries.map((entry) => {
                const entryUsers = parseJsonArray<string>(entry.userIdsJson, [])
                const entryName =
                  event.battleType === 'team'
                    ? entry.teamName || entryUsers.map(userName).join(' / ')
                    : entryUsers.length === 0
                      ? '未設定'
                      : entryUsers.map(userName).join(' / ')
                return (
                  <div key={entry.id} className="row">
                    <div>
                      <div className="row-title">{entryName}</div>
                      <div className="hint">
                        ユーザエントリー / {partsLabel(entry)}
                      </div>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => handleDelete(entry.id!)}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="actions" style={{ marginTop: 16 }}>
        <Link to={`/tournament/${event.id}/start`} className="btn">
          大会スタート
        </Link>
        <button type="button" className="btn ghost" onClick={() => navigate(backTo)}>
          保存して戻る
        </button>
        <button type="button" className="btn ghost" onClick={() => navigate(backTo)}>
          キャンセル
        </button>
      </div>
    </div>
  )
}
