import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Team, User } from '../types'

const nowIso = () => new Date().toISOString()

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [name, setName] = useState('')
  const [teamId, setTeamId] = useState<string>('')
  const [active, setActive] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingTeamId, setEditingTeamId] = useState<string>('')
  const [editingActive, setEditingActive] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const teamMap = useMemo(() => {
    const map = new Map<number, string>()
    teams.forEach((team) => {
      if (team.id) map.set(team.id, team.name)
    })
    return map
  }, [teams])

  const load = async () => {
    const [userList, teamList] = await Promise.all([
      db.users.orderBy('createdAt').reverse().toArray(),
      db.teams.orderBy('createdAt').toArray(),
    ])
    setUsers(userList)
    setTeams(teamList)
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setName('')
    setTeamId('')
    setActive(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!name.trim()) {
      setError('ユーザ名を入力してください')
      return
    }

    const resolvedTeamId = teamId ? Number(teamId) : undefined

    await db.users.add({
      name: name.trim(),
      teamId: resolvedTeamId,
      active,
      createdAt: nowIso(),
    })
    setInfo('追加しました')

    resetForm()
    await load()
  }

  const handleEdit = (user: User) => {
    if (!user.id) return
    setEditingId(user.id)
    setEditingName(user.name)
    setEditingTeamId(user.teamId ? String(user.teamId) : '')
    setEditingActive(user.active ?? true)
    setInfo('')
    setError('')
  }

  const handleUpdate = async (user: User) => {
    if (!user.id) return
    if (!editingName.trim()) {
      setError('ユーザ名を入力してください')
      return
    }
    await db.users.update(user.id, {
      name: editingName.trim(),
      teamId: editingTeamId ? Number(editingTeamId) : undefined,
      active: editingActive,
    })
    setEditingId(null)
    setEditingName('')
    setEditingTeamId('')
    setEditingActive(true)
    setInfo('更新しました')
    await load()
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setEditingTeamId('')
    setEditingActive(true)
  }

  const handleDelete = async (user: User) => {
    if (!user.id) return
    await db.users.delete(user.id)
    setInfo('削除しました')
    await load()
  }

  return (
    <div className="card">
      <h1 className="title">ユーザ管理</h1>
      <p className="subtitle">
        グループはパーツを共有する集まりです。所属グループのパーツが利用対象になります。
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          ユーザ名
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例: Player A"
          />
        </label>
        <label className="field">
          グループ
          <select
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
          >
            <option value="">未所属</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field inline">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          アクティブ
        </label>
        <div className="actions">
          <button type="submit" className="btn">
            追加
          </button>
          <button type="button" onClick={resetForm} className="btn ghost">
            クリア
          </button>
        </div>
      </form>

      {error ? <p className="error">{error}</p> : null}
      {info ? <p className="hint">{info}</p> : null}

      <div className="list">
        {users.length === 0 ? (
          <p className="hint">まだユーザが登録されていません。</p>
        ) : (
          users.map((user) => (
            <div key={user.id} className="row">
              <div>
                {editingId === user.id ? (
                  <>
                    <div className="row-title">ユーザ名</div>
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                    <div className="hint">グループ</div>
                    <select
                      value={editingTeamId}
                      onChange={(event) => setEditingTeamId(event.target.value)}
                    >
                      <option value="">未所属</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={editingActive}
                        onChange={(event) => setEditingActive(event.target.checked)}
                      />
                      アクティブ
                    </label>
                  </>
                ) : (
                  <>
                    <div className="row-title">{user.name}</div>
                    <div className="hint">
                      グループ: {user.teamId ? teamMap.get(user.teamId) ?? '不明' : '未所属'}
                    </div>
                    <div className="hint">
                      状態: {user.active ?? true ? '有効' : '無効'}
                    </div>
                  </>
                )}
              </div>
              <div className="row-actions">
                {editingId === user.id ? (
                  <>
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => handleUpdate(user)}
                    >
                      確定
                    </button>
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={handleCancelEdit}
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => handleEdit(user)}
                  >
                    編集
                  </button>
                )}
                <button
                  type="button"
                  className="btn small"
                  onClick={() => handleDelete(user)}
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
