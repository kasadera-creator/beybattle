import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db'
import {
  battleTypeLabel,
  normalizeEventStatus,
  stadiumLabel,
  type Event,
} from '../types'

export default function TournamentMode() {
  const [events, setEvents] = useState<Event[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = async () => {
    const list = await db.events.orderBy('createdAt').reverse().toArray()
    setEvents(list)
  }

  useEffect(() => {
    load()
  }, [])

  const activeEvents = useMemo(
    () => events.filter((event) => normalizeEventStatus(event.status) === 'active'),
    [events],
  )

  const completedEvents = useMemo(
    () =>
      events.filter((event) => {
        const status = normalizeEventStatus(event.status)
        return status === 'completed' || status === 'archived'
      }),
    [events],
  )

  const formatScheduledDate = (value?: string) => {
    if (!value) return '未設定'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString()
  }

  const handleDelete = async (eventId: number) => {
    if (!window.confirm('大会を削除します。よろしいですか？')) return
    setBusyId(eventId)
    await db.events.delete(eventId)
    await load()
    setBusyId(null)
  }

  return (
    <div className="card">
      <h1 className="title">大会トップ</h1>
      <p className="subtitle">大会の作成・開始・終了を管理します</p>

      <div className="actions">
        <Link to="/tournament/new" className="btn">
          大会作成
        </Link>
      </div>

      <div className="section">
        <h2 className="section-title">実施する大会</h2>
        <div className="list">
          {activeEvents.length === 0 ? (
            <p className="hint">実施中の大会はありません。</p>
          ) : (
            activeEvents.map((event) => (
              <div key={event.id} className="row">
                <div>
                  <div className="row-title">{event.name}</div>
                  <div className="hint">
                    {stadiumLabel(event.stadium)} / {battleTypeLabel(event.battleType)}
                  </div>
                  <div className="hint">
                    開催予定日: {formatScheduledDate(event.scheduledDate)}
                  </div>
                </div>
                <div className="row-actions">
                  <Link to={`/tournament/${event.id}/edit`} className="btn ghost small">
                    大会設定
                  </Link>
                  <Link
                    to={`/tournament/${event.id}/entries`}
                    state={{ from: '/tournament' }}
                    className="btn ghost small"
                  >
                    大会エントリー
                  </Link>
                  <Link to={`/tournament/${event.id}/start`} className="btn small">
                    大会スタート
                  </Link>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => handleDelete(event.id!)}
                    disabled={busyId === event.id}
                  >
                    大会削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">終了済み大会</h2>
        <div className="list">
          {completedEvents.length === 0 ? (
            <p className="hint">終了済みの大会はまだありません。</p>
          ) : (
            completedEvents.map((event) => (
              <div key={event.id} className="row">
                <div>
                  <div className="row-title">{event.name}</div>
                  <div className="hint">
                    {stadiumLabel(event.stadium)} / {battleTypeLabel(event.battleType)}
                  </div>
                  <div className="hint">
                    開催予定日: {formatScheduledDate(event.scheduledDate)}
                  </div>
                  <div className="hint">状態: 終了</div>
                </div>
                <div className="row-actions">
                  <Link to={`/tournament/${event.id}/result`} className="btn small">
                    大会結果
                  </Link>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => handleDelete(event.id!)}
                    disabled={busyId === event.id}
                  >
                    大会削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
