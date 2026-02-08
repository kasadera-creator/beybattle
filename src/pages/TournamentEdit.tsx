import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import {
  BATTLE_TYPE_OPTIONS,
  SIDE_RULE_OPTIONS,
  STADIUM_LABEL,
  type BattleType,
  type Event,
  type SideRule,
  type StadiumType,
} from '../types'

export default function TournamentEdit() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [eventData, setEventData] = useState<Event | null>(null)
  const [name, setName] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [stadium, setStadium] = useState<StadiumType>('EXTREME')
  const [sideRule, setSideRule] = useState<SideRule>('fixed')
  const [battleType, setBattleType] = useState<BattleType>('streak')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const id = Number(eventId)
    if (Number.isNaN(id)) {
      setLoading(false)
      return
    }

    const load = async () => {
      const data = await db.events.get(id)
      if (!data) {
        setLoading(false)
        return
      }
      setEventData(data)
      setName(data.name)
      setScheduledDate(data.scheduledDate ?? '')
      setStadium(data.stadium)
      setSideRule(data.sideRule)
      setBattleType(data.battleType)
      setLoading(false)
    }

    load()
  }, [eventId])

  const saveAndMove = async (target: 'back' | 'entries') => {
    setError('')

    if (!eventId || !eventData?.id) return
    if (!name.trim()) {
      setError('大会名を入力してください')
      return
    }

    setSaving(true)
    await db.events.update(eventData.id, {
      name: name.trim(),
      scheduledDate: scheduledDate || undefined,
      stadium,
      sideRule,
      battleType,
    })
    setSaving(false)
    if (target === 'entries') {
      navigate(`/tournament/${eventData.id}/entries`, {
        state: { from: `/tournament/${eventData.id}/edit` },
      })
    } else {
      navigate('/tournament')
    }
  }

  const handleSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault()
    await saveAndMove('back')
  }

  if (loading) {
    return (
      <div className="card">
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!eventData) {
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
      <h1 className="title">大会設定</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          大会名
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="field">
          開催予定日
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
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
          <button
            type="button"
            className="btn"
            disabled={saving}
            onClick={() => saveAndMove('entries')}
          >
            {saving ? '保存中...' : '保存して大会エントリーへ'}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={saving}
            onClick={() => saveAndMove('back')}
          >
            保存して戻る
          </button>
          <Link to="/tournament" className="btn ghost">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  )
}
