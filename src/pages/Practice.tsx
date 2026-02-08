import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BattleType } from '../types'

const BATTLE_TYPES: { value: BattleType; label: string }[] = [
  { value: 'streak', label: '連勝バトル' },
  { value: 'one-bey', label: 'ワンベイバトル' },
  { value: 'three-on-three', label: '3on3バトル' },
  { value: 'team', label: 'チームバトル' },
]

export default function Practice() {
  const navigate = useNavigate()
  const [battleType, setBattleType] = useState<BattleType>('one-bey')
  const [left, setLeft] = useState(['ゲストA', 'ゲストA2', 'ゲストA3'])
  const [right, setRight] = useState(['ゲストB', 'ゲストB2', 'ゲストB3'])

  const count = battleType === 'three-on-three' || battleType === 'team' ? 3 : 1

  const handleStart = () => {
    navigate('/practice/start', {
      state: {
        battleType,
        leftNames: left.slice(0, count),
        rightNames: right.slice(0, count),
      },
    })
  }

  return (
    <div className="card">
      <h1 className="title">練習モード</h1>
      <p className="subtitle">フリーバトル / ゲストOK</p>

      <div className="form">
        <label className="field">
          バトル方式
          <select
            value={battleType}
            onChange={(e) => setBattleType(e.target.value as BattleType)}
          >
            {BATTLE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          レフトサイド
          {Array.from({ length: count }).map((_, index) => (
            <input
              key={index}
              value={left[index]}
              onChange={(e) => {
                const next = [...left]
                next[index] = e.target.value
                setLeft(next)
              }}
            />
          ))}
        </div>

        <div className="field">
          ライトサイド
          {Array.from({ length: count }).map((_, index) => (
            <input
              key={index}
              value={right[index]}
              onChange={(e) => {
                const next = [...right]
                next[index] = e.target.value
                setRight(next)
              }}
            />
          ))}
        </div>

        <div className="actions">
          <button type="button" className="btn" onClick={handleStart}>
            練習を開始
          </button>
        </div>
      </div>
    </div>
  )
}
