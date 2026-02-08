import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db } from '../db'
import {
  blades,
  bits,
  cxAssistBlades,
  cxLockChips,
  cxMainBlades,
  ratchets,
} from '../data/parts'
import type { Team, TeamPart, User } from '../types'

export default function TeamDetail() {
  const { teamId } = useParams()
  const [team, setTeam] = useState<Team | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newActive, setNewActive] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [teamParts, setTeamParts] = useState<TeamPart[]>([])

  const load = async (id: number) => {
    const [teamData, userList, teamList, parts] = await Promise.all([
      db.teams.get(id),
      db.users.where('teamId').equals(id).toArray(),
      db.teams.orderBy('createdAt').toArray(),
      db.team_parts.where('teamId').equals(id).toArray(),
    ])
    setTeam(teamData ?? null)
    setUsers(userList)
    setTeams(teamList)
    setTeamParts(parts)
    setLoading(false)
  }

  useEffect(() => {
    const id = Number(teamId)
    if (Number.isNaN(id)) {
      setLoading(false)
      return
    }
    load(id)
  }, [teamId])

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!team?.id) return
    if (!newName.trim()) {
      setError('ユーザ名を入力してください')
      return
    }

    await db.users.add({
      name: newName.trim(),
      teamId: team.id,
      active: newActive,
      createdAt: new Date().toISOString(),
    })

    setNewName('')
    setNewActive(true)
    setInfo('追加しました')
    await load(team.id)
  }

  const handleMove = async (userId: number, nextTeamId: string) => {
    const parsed = nextTeamId ? Number(nextTeamId) : undefined
    await db.users.update(userId, { teamId: parsed })
    if (team?.id) {
      await load(team.id)
    }
  }

  const handleToggleActive = async (user: User) => {
    if (!user.id) return
    const nextActive = !(user.active ?? true)
    await db.users.update(user.id, { active: nextActive })
    if (team?.id) {
      await load(team.id)
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!user.id) return
    await db.users.delete(user.id)
    if (team?.id) {
      await load(team.id)
    }
  }

  const hasPart = (kind: TeamPart['partKind'], code: string) =>
    teamParts.some(
      (part) => part.partKind === kind && part.partCode === code,
    )

  const handleTogglePart = async (
    kind: TeamPart['partKind'],
    code: string,
  ) => {
    if (!team?.id) return
    const existing = teamParts.find(
      (part) => part.partKind === kind && part.partCode === code,
    )
    if (existing?.id) {
      await db.team_parts.delete(existing.id)
    } else {
      await db.team_parts.add({
        teamId: team.id,
        partKind: kind,
        partCode: code,
        createdAt: new Date().toISOString(),
      })
    }
    await load(team.id)
  }

  if (loading) {
    return (
      <div className="card">
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="card">
        <h1 className="title">グループが見つかりません</h1>
        <Link to="/teams" className="btn ghost">
          グループ一覧に戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="card">
      <h1 className="title">{team.name}</h1>
      <p className="subtitle">
        所属ユーザ: {users.length} 人 / 作成:{' '}
        {new Date(team.createdAt).toLocaleString()}
      </p>
      <p className="hint">グループはパーツを共有する集まりです。</p>

      <form className="form" onSubmit={handleAdd}>
        <label className="field">
          ユーザ名
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="例: Player A"
          />
        </label>
        <label className="field inline">
          <input
            type="checkbox"
            checked={newActive}
            onChange={(event) => setNewActive(event.target.checked)}
          />
          アクティブ
        </label>
        <div className="actions">
          <button type="submit" className="btn">
            追加
          </button>
        </div>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {info ? <p className="hint">{info}</p> : null}

      <div className="list">
        {users.length === 0 ? (
          <p className="hint">所属ユーザがいません。</p>
        ) : (
          users.map((user) => (
            <div key={user.id} className="row">
              <div>
                <div className="row-title">{user.name}</div>
                <div className="hint">状態: {user.active ?? true ? '有効' : '無効'}</div>
              </div>
              <div className="row-actions">
                <select
                  value={user.teamId ? String(user.teamId) : ''}
                  onChange={(event) =>
                    handleMove(user.id!, event.target.value)
                  }
                >
                  <option value="">未所属</option>
                  {teams.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => handleToggleActive(user)}
                >
                  {user.active ?? true ? '無効化' : '有効化'}
                </button>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => handleDeleteUser(user)}
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="actions" style={{ marginTop: 16 }}>
        <Link to="/teams" className="btn ghost">
          グループ一覧に戻る
        </Link>
        <Link to="/users" className="btn ghost">
          ユーザ管理へ
        </Link>
      </div>

      <div className="section">
        <h2 className="section-title">所有パーツ登録</h2>
        <p className="hint">
          グループはパーツを共有する集まりです。登録したパーツのみ、所属ユーザのエントリーで選択できます。
        </p>

        <div className="parts-section">
          <h3 className="section-subtitle">CX ロックチップ</h3>
          <div className="parts-grid">
            {cxLockChips.map((part) => (
              <label key={part.code} className="checkbox">
                <input
                  type="checkbox"
                  checked={hasPart('cx_lock_chip', part.code)}
                  onChange={() => handleTogglePart('cx_lock_chip', part.code)}
                />
                {part.code} / {part.name}
              </label>
            ))}
          </div>
        </div>

        <div className="parts-section">
          <h3 className="section-subtitle">CX メインブレード</h3>
          <div className="parts-grid">
            {cxMainBlades.map((part) => (
              <label key={part.code} className="checkbox">
                <input
                  type="checkbox"
                  checked={hasPart('cx_main_blade', part.code)}
                  onChange={() => handleTogglePart('cx_main_blade', part.code)}
                />
                {part.code} / {part.name}
              </label>
            ))}
          </div>
        </div>

        <div className="parts-section">
          <h3 className="section-subtitle">CX アシストブレード</h3>
          <div className="parts-grid">
            {cxAssistBlades.map((part) => (
              <label key={part.code} className="checkbox">
                <input
                  type="checkbox"
                  checked={hasPart('cx_assist_blade', part.code)}
                  onChange={() => handleTogglePart('cx_assist_blade', part.code)}
                />
                {part.code} / {part.name}
              </label>
            ))}
          </div>
        </div>

        <div className="parts-section">
          <h3 className="section-subtitle">UX/BX ブレード</h3>
          <div className="parts-grid">
            {blades.map((part) => (
              <label key={part.code} className="checkbox">
                <input
                  type="checkbox"
                  checked={hasPart('blade', part.code)}
                  onChange={() => handleTogglePart('blade', part.code)}
                />
                {part.code} / {part.name}
              </label>
            ))}
          </div>
        </div>

        <div className="parts-section">
          <h3 className="section-subtitle">ラチェット</h3>
          <div className="parts-grid">
            {ratchets.map((part) => (
              <label key={part.code} className="checkbox">
                <input
                  type="checkbox"
                  checked={hasPart('ratchet', part.code)}
                  onChange={() => handleTogglePart('ratchet', part.code)}
                />
                {part.code} / {part.name}
              </label>
            ))}
          </div>
        </div>

        <div className="parts-section">
          <h3 className="section-subtitle">ビット</h3>
          <div className="parts-grid">
            {bits.map((part) => (
              <label key={part.code} className="checkbox">
                <input
                  type="checkbox"
                  checked={hasPart('bit', part.code)}
                  onChange={() => handleTogglePart('bit', part.code)}
                />
                {part.code} / {part.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
