import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db'
import type { Team } from '../types'

const nowIso = () => new Date().toISOString()

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)
  const [deleteUserCount, setDeleteUserCount] = useState(0)
  const [deleteMode, setDeleteMode] = useState<
    'delete-users' | 'unassign' | 'move'
  >('unassign')
  const [moveTargetId, setMoveTargetId] = useState<string>('')

  const load = async () => {
    const list = await db.teams.orderBy('createdAt').reverse().toArray()
    setTeams(list)
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setName('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!name.trim()) {
      setError('グループ名を入力してください')
      return
    }

    await db.teams.add({ name: name.trim(), createdAt: nowIso() })
    setInfo('追加しました')

    resetForm()
    await load()
  }

  const handleEdit = (team: Team) => {
    if (!team.id) return
    setEditingId(team.id)
    setEditingName(team.name)
    setInfo('')
    setError('')
  }

  const handleUpdate = async (team: Team) => {
    if (!team.id) return
    if (!editingName.trim()) {
      setError('グループ名を入力してください')
      return
    }
    await db.teams.update(team.id, { name: editingName.trim() })
    setEditingId(null)
    setEditingName('')
    setInfo('更新しました')
    await load()
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleDelete = async (team: Team) => {
    if (!team.id) return
    setError('')
    setInfo('')

    const userCount = await db.users.where('teamId').equals(team.id).count()
    if (userCount > 0) {
      setDeleteTarget(team)
      setDeleteUserCount(userCount)
      setDeleteMode('unassign')
      setMoveTargetId('')
      return
    }

    await db.teams.delete(team.id)
    setInfo('削除しました')
    await load()
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return
    setError('')
    setInfo('')

    if (deleteUserCount > 0) {
      if (deleteMode === 'delete-users') {
        await db.users.where('teamId').equals(deleteTarget.id).delete()
      } else if (deleteMode === 'unassign') {
        await db.users
          .where('teamId')
          .equals(deleteTarget.id)
          .modify({ teamId: undefined })
      } else {
        const targetId = Number(moveTargetId)
        if (Number.isNaN(targetId)) {
          setError('移動先グループを選択してください')
          return
        }
        await db.users
          .where('teamId')
          .equals(deleteTarget.id)
          .modify({ teamId: targetId })
      }
    }

    await db.teams.delete(deleteTarget.id)
    setDeleteTarget(null)
    setDeleteUserCount(0)
    setMoveTargetId('')
    setInfo('削除しました')
    await load()
  }

  const moveTargets = useMemo(
    () => teams.filter((team) => team.id && team.id !== deleteTarget?.id),
    [teams, deleteTarget],
  )

  return (
    <div className="card">
      <h1 className="title">グループ管理</h1>
      <p className="subtitle">
        グループはパーツを共有する集まりです。
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          グループ名
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例: Group Phoenix"
          />
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
        {teams.length === 0 ? (
          <p className="hint">まだグループが登録されていません。</p>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="row">
              <div>
                {editingId === team.id ? (
                  <>
                    <div className="row-title">グループ名</div>
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                    <div className="hint">
                      作成: {new Date(team.createdAt).toLocaleString()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="row-title">{team.name}</div>
                    <div className="hint">
                      作成: {new Date(team.createdAt).toLocaleString()}
                    </div>
                  </>
                )}
              </div>
              <div className="row-actions">
                <Link className="btn ghost small" to={`/teams/${team.id}`}>
                  詳細
                </Link>
                {editingId === team.id ? (
                  <>
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => handleUpdate(team)}
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
                    onClick={() => handleEdit(team)}
                  >
                    編集
                  </button>
                )}
                <button
                  type="button"
                  className="btn small"
                  onClick={() => handleDelete(team)}
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {deleteTarget ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h2 className="title">グループ削除</h2>
            <p className="subtitle">
              「{deleteTarget.name}」には {deleteUserCount} 人の所属ユーザがいます。
              どの処理で削除しますか？
            </p>
            <div className="radio-group">
              <label className="radio">
                <input
                  type="radio"
                  name="delete-mode"
                  checked={deleteMode === 'delete-users'}
                  onChange={() => setDeleteMode('delete-users')}
                />
                ユーザごと削除
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="delete-mode"
                  checked={deleteMode === 'unassign'}
                  onChange={() => setDeleteMode('unassign')}
                />
                所属ユーザを未所属にして削除
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="delete-mode"
                  checked={deleteMode === 'move'}
                  onChange={() => setDeleteMode('move')}
                />
                所属ユーザを別グループへ一括移動
              </label>
              {deleteMode === 'move' ? (
                <select
                  value={moveTargetId}
                  onChange={(event) => setMoveTargetId(event.target.value)}
                >
                  <option value="">移動先グループを選択</option>
                  {moveTargets.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={handleConfirmDelete}>
                削除を実行
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteUserCount(0)
                  setMoveTargetId('')
                }}
                className="btn ghost"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
