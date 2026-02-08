import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db } from '../db'
import {
  battleTypeLabel,
  normalizeEventStatus,
  stadiumLabel,
  type Event,
} from '../types'

export default function TournamentEvent() {
  const { eventId } = useParams()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!eventId) {
        setLoading(false)
        return
      }

      const id = Number(eventId)
      if (Number.isNaN(id)) {
        setLoading(false)
        return
      }
      const data = await db.events.get(id)
      if (active) {
        setEvent(data ?? null)
        setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [eventId])

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
        <Link to="/tournament/new" className="btn ghost">
          大会を作成する
        </Link>
      </div>
    )
  }

  return (
    <div className="card">
      <h1 className="title">大会画面</h1>
      <p className="subtitle">{event.name}</p>
      <div className="info">
        <div>
          <span className="label">バトル方式</span>
          <span>{battleTypeLabel(event.battleType)}</span>
        </div>
        <div>
          <span className="label">スタジアム</span>
          <span>{stadiumLabel(event.stadium)}</span>
        </div>
        <div>
          <span className="label">サイドルール</span>
          <span>{event.sideRule}</span>
        </div>
        <div>
          <span className="label">開催予定日</span>
          <span>
            {event.scheduledDate
              ? new Date(event.scheduledDate).toLocaleDateString()
              : '未設定'}
          </span>
        </div>
      </div>
      <div className="actions" style={{ marginTop: 16 }}>
        <Link to={`/tournament/${event.id}/edit`} className="btn ghost">
          大会設定
        </Link>
        <Link
          to={`/tournament/${event.id}/entries`}
          state={{ from: `/tournament/${event.id}` }}
          className="btn ghost"
        >
          大会エントリー
        </Link>
        {normalizeEventStatus(event.status) !== 'active' ? (
          <button type="button" className="btn ghost" disabled>
            大会スタート
          </button>
        ) : (
          <Link to={`/tournament/${event.id}/start`} className="btn">
            大会スタート
          </Link>
        )}
        <Link to="/tournament" className="btn ghost">
          大会トップへ
        </Link>
      </div>
    </div>
  )
}
