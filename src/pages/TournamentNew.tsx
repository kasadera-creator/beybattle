import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { loadSettings } from '../storage'
import {
  BATTLE_TYPE_OPTIONS,
  SIDE_RULE_OPTIONS,
  STADIUM_LABEL,
  type BattleType,
  type Event,
  type SideRule,
  type StadiumType,
} from '../types'

const nowIso = () => new Date().toISOString()

export default function TournamentNew() {
  const settings = loadSettings()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [stadium, setStadium] = useState<StadiumType>(settings.stadium)
  const [sideRule, setSideRule] = useState<SideRule>(settings.sideRule)
  const [battleType, setBattleType] = useState<BattleType>('streak')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('大会名を入力してください')
      return
    }

    setSaving(true)
    try {
      const payload: Event = {
        name: name.trim(),
        stadium,
        sideRule,
        battleType,
        status: 'active',
        scheduledDate: scheduledDate || undefined,
        createdAt: nowIso(),
      }
      const id = await db.events.add(payload)
      navigate(`/tournament/${id}`)
    } catch (e) {
      console.error(e)
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <h1 className="title">大会設定</h1>
      <p className="subtitle">大会を新規作成します。</p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          大会名
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例: Beybattle Cup"
          />
        </label>

        <label className="field">
          開催予定日
          <input
            type="date"
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
          />
        </label>

        <label className="field">
          スタジアム
          <select
            value={stadium}
            onChange={(event) => setStadium(event.target.value as StadiumType)}
          >
            {Object.entries(STADIUM_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          サイドルール
          <select
            value={sideRule}
            onChange={(event) => setSideRule(event.target.value as SideRule)}
          >
            {SIDE_RULE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          バトル方式
          <select
            value={battleType}
            onChange={(event) =>
              setBattleType(event.target.value as BattleType)
            }
          >
            {BATTLE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="error">{error}</p> : null}

        <div className="actions">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? '作成中...' : '作成する'}
          </button>
          <Link to="/tournament" className="btn ghost">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  )
}
