import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  bladesByName,
  bitsByCode,
  cxAssistBlades,
  cxLockChips,
  cxMainBlades,
  ratchetsByCode,
} from '../data/parts'
import { battleTypeLabel, type BattleType, type FinishType } from '../types'

const FINISHES: { type: FinishType; label: string; points: number }[] = [
  { type: 'spin', label: 'スピン', points: 1 },
  { type: 'over', label: 'オーバー', points: 2 },
  { type: 'burst', label: 'バースト', points: 2 },
  { type: 'ko', label: 'エクストリーム', points: 3 },
]

const emptyBey = () => ({
  line: 'UXBX' as const as 'UXBX' | 'CX',
  blade: '',
  lockChip: '',
  mainBlade: '',
  assistBlade: '',
  ratchet: '',
  bit: '',
})

type PracticeState = {
  battleType: BattleType
  leftNames: string[]
  rightNames: string[]
}

export default function PracticeStart() {
  const location = useLocation()
  const state = location.state as PracticeState | null

  const battleType = state?.battleType ?? 'one-bey'
  const leftName = state?.leftNames?.join(' / ') ?? 'ゲストA'
  const rightName = state?.rightNames?.join(' / ') ?? 'ゲストB'
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [log, setLog] = useState<
    { side: 'A' | 'B'; label: string; points: number; battleIndex: number }[]
  >([])
  const [battleStarted, setBattleStarted] = useState(false)
  const [pendingNextBattle, setPendingNextBattle] = useState(false)
  const [roundIndex, setRoundIndex] = useState(0)
  const [roundLocked, setRoundLocked] = useState(false)
  const [teamLeftIndex, setTeamLeftIndex] = useState(0)
  const [teamRightIndex, setTeamRightIndex] = useState(0)
  const [teamLeftLosses, setTeamLeftLosses] = useState(0)
  const [teamRightLosses, setTeamRightLosses] = useState(0)
  const [showSetup, setShowSetup] = useState(true)
  const [showBeyEditor, setShowBeyEditor] = useState(false)
  const [editorSide, setEditorSide] = useState<'A' | 'B'>('A')
  const [editorIndex, setEditorIndex] = useState(0)
  const [streakSide, setStreakSide] = useState<'A' | 'B' | null>(null)
  const [streakCount, setStreakCount] = useState(0)

  const [leftBeys, setLeftBeys] = useState([emptyBey(), emptyBey(), emptyBey()])
  const [rightBeys, setRightBeys] = useState([emptyBey(), emptyBey(), emptyBey()])
  const [leftQuick, setLeftQuick] = useState(['', '', ''])
  const [rightQuick, setRightQuick] = useState(['', '', ''])

  const baseWinCountA = log.filter((item) => item.side === 'A').length
  const baseWinCountB = log.filter((item) => item.side === 'B').length
  const winCountA =
    battleType === 'streak' ? (streakSide === 'A' ? streakCount : 0) : baseWinCountA
  const winCountB =
    battleType === 'streak' ? (streakSide === 'B' ? streakCount : 0) : baseWinCountB
  const winPoints = battleType === 'team' ? 2 : battleType === 'streak' ? 3 : 4
  const winner =
    battleType === 'team'
      ? teamRightLosses >= 3
        ? 'A'
        : teamLeftLosses >= 3
          ? 'B'
          : null
      : battleType === 'streak'
        ? streakCount >= 3
          ? streakSide
          : null
        : scoreA >= winPoints
          ? 'A'
          : scoreB >= winPoints
            ? 'B'
            : null

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      const timer = window.setTimeout(() => setCountdown(null), 1200)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => {
      setCountdown((prev) => (prev === null ? null : prev - 1))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [countdown])
  const startCountdown = () => {
    setCountdown(3)
    setBattleStarted(true)
  }

  const addPoint = (side: 'A' | 'B', finish: FinishType, points: number) => {
    if (winner) return
    if (battleType === 'three-on-three' && roundLocked) return
    if (!battleStarted) return
    if (battleType === 'streak') {
      const nextCount = streakSide === side ? streakCount + 1 : 1
      setStreakSide(side)
      setStreakCount(nextCount)
      setScoreA(side === 'A' ? points : 0)
      setScoreB(side === 'B' ? points : 0)
      setPendingNextBattle(nextCount < 3)
    } else {
      const nextScoreA = side === 'A' ? scoreA + points : scoreA
      const nextScoreB = side === 'B' ? scoreB + points : scoreB
      setScoreA(nextScoreA)
      setScoreB(nextScoreB)
      if (battleType === 'team') {
        if (nextScoreA >= winPoints || nextScoreB >= winPoints) {
          if (nextScoreA >= winPoints) {
            setTeamRightLosses((prev) => prev + 1)
            setTeamRightIndex((prev) => Math.min(prev + 1, 2))
          } else {
            setTeamLeftLosses((prev) => prev + 1)
            setTeamLeftIndex((prev) => Math.min(prev + 1, 2))
          }
          setScoreA(0)
          setScoreB(0)
          setPendingNextBattle(true)
        }
      }
    }
    const finishLabel = FINISHES.find((item) => item.type === finish)?.label ?? finish
    const battleIndex = log.length + 1
    setLog((prev) => [{ side, label: finishLabel, points, battleIndex }, ...prev])
    setBattleStarted(false)
    if (battleType === 'three-on-three') {
      setRoundLocked(true)
      setPendingNextBattle(true)
    }
  }

  const resetBattle = () => {
    setScoreA(0)
    setScoreB(0)
    setLog([])
    setBattleStarted(false)
    setPendingNextBattle(false)
    setRoundIndex(0)
    setRoundLocked(false)
    setTeamLeftIndex(0)
    setTeamRightIndex(0)
    setTeamLeftLosses(0)
    setTeamRightLosses(0)
    setStreakSide(null)
    setStreakCount(0)
  }

  const nextBattle = () => {
    if (winner) return
    if (battleType === 'streak') {
      if (pendingNextBattle) {
        setPendingNextBattle(false)
      }
      setScoreA(0)
      setScoreB(0)
      setCountdown(null)
      setBattleStarted(false)
      return
    }
    if (battleType === 'three-on-three') {
      if (roundIndex >= 2) {
        setRoundIndex(0)
        setRoundLocked(false)
      } else {
        setRoundIndex((prev) => Math.min(prev + 1, 2))
        setRoundLocked(false)
      }
      setPendingNextBattle(false)
      return
    }
    if (battleType === 'team') {
      if (pendingNextBattle) {
        setPendingNextBattle(false)
      }
    }
  }

  const openSetup = () => {
    setShowSetup(true)
  }

  const closeSetup = () => {
    setShowSetup(false)
  }

  const openBeyEditor = (side: 'A' | 'B', index: number) => {
    setEditorSide(side)
    setEditorIndex(index)
    setShowBeyEditor(true)
  }

  const closeBeyEditor = () => {
    setShowBeyEditor(false)
  }

  const markerFor = (points: number) => {
    if (points <= 0) return ''
    if (points >= 3) return '☆'
    if (points === 2) return '◎'
    return '◯'
  }

  const formatBey = (bey: typeof leftBeys[number]) => {
    if (!bey) return ''
    if (bey.line === 'CX') {
      const lock = cxLockChips.find((part) => part.code === bey.lockChip)?.name ?? bey.lockChip
      const main = cxMainBlades.find((part) => part.code === bey.mainBlade)?.name ?? bey.mainBlade
      const assist =
        cxAssistBlades.find((part) => part.code === bey.assistBlade)?.code ?? bey.assistBlade
      const ratchet = bey.ratchet ?? ''
      const bit = bey.bit ?? ''
      const base = [lock, main, assist].filter(Boolean).join('')
      if (!base || !ratchet || !bit) return ''
      return `${base}${ratchet}${bit}`
    }
    const blade = bladesByName.find((part) => part.code === bey.blade)?.name ?? bey.blade
    if (!blade || !bey.ratchet || !bey.bit) return ''
    return `${blade}${bey.ratchet}${bey.bit}`
  }

  const currentBeyIndex = (side: 'A' | 'B') => {
    if (battleType === 'team') {
      return side === 'A' ? teamLeftIndex : teamRightIndex
    }
    if (battleType === 'three-on-three') {
      return roundIndex
    }
    return 0
  }

  const currentBeyLabel = (side: 'A' | 'B') => {
    const list = side === 'A' ? leftBeys : rightBeys
    const text = formatBey(list[currentBeyIndex(side)])
    return text || '未設定'
  }


  const applyQuick = (
    list: typeof leftBeys,
    setList: (next: typeof leftBeys) => void,
    input: string,
    index: number,
  ) => {
    const text = input.trim()
    if (!text) return

    const ratchetCodes = [...ratchetsByCode.map((r) => r.code)].sort(
      (a, b) => b.length - a.length,
    )
    const ratchetMatch = ratchetCodes.find((code) => text.includes(code))

    let bladeText = text
    let ratchetCode = ''
    let bitCode = ''

    if (ratchetMatch) {
      ratchetCode = ratchetMatch
      const parts = text.split(ratchetMatch)
      bladeText = parts[0]
      bitCode = parts[1]?.trim() ?? ''
    }

    if (bitCode) {
      const normalized = bitCode.replace(/[^A-Za-z0-9]/g, '').toLowerCase()
      const match = bitsByCode.find((bit) => bit.code.toLowerCase() === normalized)
      if (match) bitCode = match.code
    }

    const isCx = /[A-Za-z]/.test(bladeText)
    const next = [...list]
    if (isCx) {
      const lock = cxLockChips.find(
        (part) => bladeText.includes(part.code) || bladeText.includes(part.name),
      )
      const main = cxMainBlades.find(
        (part) => bladeText.includes(part.code) || bladeText.includes(part.name),
      )
      const assist = cxAssistBlades.find(
        (part) => bladeText.includes(part.code) || bladeText.includes(part.name),
      )
      next[index] = {
        ...next[index],
        line: 'CX',
        lockChip: lock?.code ?? '',
        mainBlade: main?.code ?? '',
        assistBlade: assist?.code ?? '',
        ratchet: ratchetCode || next[index].ratchet,
        bit: bitCode || next[index].bit,
        blade: '',
      }
    } else {
      const bladeMatch = bladesByName.find((blade) => bladeText.includes(blade.name))
      next[index] = {
        ...next[index],
        line: 'UXBX',
        blade: bladeMatch?.code ?? '',
        ratchet: ratchetCode || next[index].ratchet,
        bit: bitCode || next[index].bit,
        lockChip: '',
        mainBlade: '',
        assistBlade: '',
      }
    }
    setList(next)
  }

  const rowLabels = () => {
    if (battleType === 'team') return ['1人目', '2人目', '3人目']
    if (battleType === 'three-on-three') return ['1stベイ', '2ndベイ', '3rdベイ']
    return ['ベイ']
  }

  const renderBeySummary = (
    side: 'A' | 'B',
    list: typeof leftBeys,
    labels: string[],
    quick: string[],
    setQuick: (next: string[]) => void,
    setList: (next: typeof leftBeys) => void,
  ) => (
    <div className="bey-summary">
      {labels.map((label, index) => {
        const text = formatBey(list[index])
        return (
          <div key={`${side}-${index}`} className="bey-summary-item">
            <div className="bey-summary-label">{label}</div>
            <div className="bey-summary-body">
              <div className={`bey-summary-value ${text ? 'filled' : 'empty'}`}>
                {text || '未設定'}
              </div>
              <div className="bey-summary-input-row">
                <input
                  className="bey-summary-input"
                  value={quick[index] ?? ''}
                  onChange={(e) => {
                    const next = [...quick]
                    next[index] = e.target.value
                    setQuick(next)
                  }}
                  placeholder="例: シャークスケイル4-50UF"
                />
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => {
                    const current = quick[index]?.trim()
                    if (current) {
                      applyQuick(list, setList, current, index)
                    }
                    openBeyEditor(side, index)
                  }}
                >
                  ベイ登録
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderBeyEditor = (
    list: typeof leftBeys,
    setList: (next: typeof leftBeys) => void,
    quick: string[],
    setQuick: (next: string[]) => void,
    sideLabel: string,
  ) => {
    const labels = rowLabels()
    const currentLabel = labels[editorIndex] ?? `第${editorIndex + 1}ベイ`
    const bey = list[editorIndex]
    return (
      <div className="modal-backdrop bey-editor-backdrop">
        <div className="modal bey-editor-modal">
          <div className="modal-header">
            <h2 className="title">ベイ登録</h2>
            <div className="hint">
              {sideLabel} / {currentLabel}
            </div>
          </div>
          <div className="quick-input bey-editor-quick">
            <input
              value={quick[editorIndex] ?? ''}
              onChange={(e) => {
                const next = [...quick]
                next[editorIndex] = e.target.value
                setQuick(next)
              }}
              placeholder="例: シャークスケイル4-50UF"
            />
            <button
              type="button"
              className="btn small"
              onClick={() => applyQuick(list, setList, quick[editorIndex] ?? '', editorIndex)}
            >
              反映
            </button>
          </div>
          <div className="bey-editor-grid">
            <select
              value={bey?.line}
              onChange={(e) => {
                const next = [...list]
                next[editorIndex] = { ...next[editorIndex], line: e.target.value as 'UXBX' | 'CX' }
                setList(next)
              }}
            >
              <option value="UXBX">BX/UX</option>
              <option value="CX">CX</option>
            </select>
            {bey?.line === 'CX' ? (
              <>
                <select
                  value={bey.lockChip}
                  onChange={(e) => {
                    const next = [...list]
                    next[editorIndex] = { ...next[editorIndex], lockChip: e.target.value }
                    setList(next)
                  }}
                >
                  <option value="">ロックチップ</option>
                  {cxLockChips.map((part) => (
                    <option key={part.code} value={part.code}>
                      {part.name}
                    </option>
                  ))}
                </select>
                <select
                  value={bey.mainBlade}
                  onChange={(e) => {
                    const next = [...list]
                    next[editorIndex] = { ...next[editorIndex], mainBlade: e.target.value }
                    setList(next)
                  }}
                >
                  <option value="">メインブレード</option>
                  {cxMainBlades.map((part) => (
                    <option key={part.code} value={part.code}>
                      {part.name}
                    </option>
                  ))}
                </select>
                <select
                  value={bey.assistBlade}
                  onChange={(e) => {
                    const next = [...list]
                    next[editorIndex] = { ...next[editorIndex], assistBlade: e.target.value }
                    setList(next)
                  }}
                >
                  <option value="">アシストブレード</option>
                  {cxAssistBlades.map((part) => (
                    <option key={part.code} value={part.code}>
                      {part.code}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <select
                value={bey.blade}
                onChange={(e) => {
                  const next = [...list]
                  next[editorIndex] = { ...next[editorIndex], blade: e.target.value }
                  setList(next)
                }}
              >
                <option value="">ブレード</option>
                {bladesByName.map((blade) => (
                  <option key={blade.code} value={blade.code}>
                    {blade.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={bey.ratchet}
              onChange={(e) => {
                const next = [...list]
                next[editorIndex] = { ...next[editorIndex], ratchet: e.target.value }
                setList(next)
              }}
            >
              <option value="">ラチェット</option>
              {ratchetsByCode.map((ratchet) => (
                <option key={ratchet.code} value={ratchet.code}>
                  {ratchet.code}
                </option>
              ))}
            </select>
            <select
              value={bey.bit}
              onChange={(e) => {
                const next = [...list]
                next[editorIndex] = { ...next[editorIndex], bit: e.target.value }
                setList(next)
              }}
            >
              <option value="">ビット</option>
              {bitsByCode.map((bit) => (
                <option key={bit.code} value={bit.code}>
                  {bit.code}
                </option>
              ))}
            </select>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={closeBeyEditor}>
              決定
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card battle">
      <div className="battle-header practice-header">
        <div>
          <h1 className="title">練習モード</h1>
          <p className="subtitle">{battleTypeLabel(battleType)}</p>
        </div>
        <div className="battle-hero practice-hero">
          <div className="battle-round">
            {leftName} vs {rightName}
          </div>
          <div className="battle-scoreline">
            <span className="battle-score small">
              <span className="score-number">{winCountA}</span>
              <span className="score-unit">勝</span>
              <span className="score-number">{scoreA}</span>
              <span className="score-unit">Pt</span>
            </span>
            <span className="battle-vs">VS</span>
            <span className="battle-score small">
              <span className="score-number">{winCountB}</span>
              <span className="score-unit">勝</span>
              <span className="score-number">{scoreB}</span>
              <span className="score-unit">Pt</span>
            </span>
          </div>
          {battleType === 'streak' && pendingNextBattle ? (
            <div className="callout">
              <button type="button" className="btn prominent" onClick={nextBattle}>
                次のバトルへ
              </button>
              <div className="callout-note">
                勝った人はそのまま、負けた人は次の人に交代してください
              </div>
            </div>
          ) : winner ? null : battleType === 'three-on-three' && roundLocked ? (
            <div className="callout">
              <button type="button" className="btn prominent" onClick={nextBattle}>
                次のバトルへ
              </button>
              <div className="callout-note">次のベイでバトルを開始します</div>
            </div>
          ) : battleType === 'team' && pendingNextBattle ? (
            <div className="callout">
              <button type="button" className="btn prominent" onClick={nextBattle}>
                次のバトルへ
              </button>
              <div className="callout-note">次のプレイヤーでバトルを開始します</div>
            </div>
          ) : (
            <div className="callout">
              <button type="button" className="btn prominent" onClick={startCountdown}>
                バトル開始
              </button>
              <div className="callout-note">3-2-1-Go Shoot!を表示します</div>
            </div>
          )}
          {winner ? (
            <div className="battle-winner">
              勝者: {winner === 'A' ? leftName : rightName}
            </div>
          ) : (
            <p className="hint">勝った側の決まり手をタップしてください</p>
          )}
          {winner && battleType !== 'streak' ? (
            <div className="battle-next">
              <div className="callout">
                <button type="button" className="btn prominent" onClick={resetBattle}>
                  次の試合へ
                </button>
                <div className="callout-note">次の試合の準備をします</div>
              </div>
            </div>
          ) : null}
        </div>
      <div className="row-actions">
        <button type="button" className="btn ghost" onClick={openSetup}>
          ベイ登録設定
        </button>
        <button type="button" className="btn ghost" onClick={resetBattle}>
          バトル結果リセット
        </button>
        <Link to="/practice" className="btn ghost">
          バトル方式を変更する
        </Link>
        <Link to="/" className="btn ghost">
          練習モードを終了する
        </Link>
      </div>
      </div>

      <div className="battle-grid">
        <div className={`battle-card side-left ${winner === 'A' ? 'winner' : ''}`}>
          <div className="battle-label">
            レフトサイド
            {battleType === 'team' ? (
              <span className="battle-meta-inline">
                現在 {teamLeftIndex + 1}番手 / 残り {Math.max(3 - teamLeftLosses, 0)}人
              </span>
            ) : null}
          </div>
          <div className="battle-name-row">
            <div className="battle-name">{leftName}</div>
            <div className="battle-bey">{currentBeyLabel('A')}</div>
          </div>
          <div className="battle-score-row">
            <div className="battle-score">
              <span className="score-number">{winCountA}</span>
              <span className="score-unit">勝</span>
              <span className="score-number">{scoreA}</span>
              <span className="score-unit">Pt</span>
            </div>
          <div className="finish-stack">
              {log
                .filter((item) => item.side === 'A')
                .slice()
                .sort((a, b) => a.battleIndex - b.battleIndex)
                .map((item) => (
                  <div key={`${item.battleIndex}-${item.label}`} className="finish-item">
                    {`${item.battleIndex}. ${markerFor(item.points)}${item.label}`}
                  </div>
                ))}
            </div>
          </div>
          <div className="battle-actions">
            {FINISHES.map((finish) => (
              <button
                key={finish.type}
                type="button"
                className="btn small"
                onClick={() => addPoint('A', finish.type, finish.points)}
                disabled={!!winner || !battleStarted}
              >
                {finish.label}
              </button>
            ))}
          </div>
        </div>
        <div className={`battle-card side-right ${winner === 'B' ? 'winner' : ''}`}>
          <div className="battle-label">
            ライトサイド
            {battleType === 'team' ? (
              <span className="battle-meta-inline">
                現在 {teamRightIndex + 1}番手 / 残り {Math.max(3 - teamRightLosses, 0)}人
              </span>
            ) : null}
          </div>
          <div className="battle-name-row">
            <div className="battle-name">{rightName}</div>
            <div className="battle-bey">{currentBeyLabel('B')}</div>
          </div>
          <div className="battle-score-row">
            <div className="battle-score">
              <span className="score-number">{winCountB}</span>
              <span className="score-unit">勝</span>
              <span className="score-number">{scoreB}</span>
              <span className="score-unit">Pt</span>
            </div>
          <div className="finish-stack">
            {log
              .filter((item) => item.side === 'B')
              .slice()
              .sort((a, b) => a.battleIndex - b.battleIndex)
              .map((item) => (
                <div key={`${item.battleIndex}-${item.label}`} className="finish-item">
                  {`${item.battleIndex}. ${markerFor(item.points)}${item.label}`}
                </div>
              ))}
          </div>
          </div>
          <div className="battle-actions">
            {FINISHES.map((finish) => (
              <button
                key={finish.type}
                type="button"
                className="btn small"
                onClick={() => addPoint('B', finish.type, finish.points)}
                disabled={!!winner || !battleStarted}
              >
                {finish.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {countdown !== null ? (
        <div className="countdown-overlay">
          <div className="countdown-text">
            {countdown > 0 ? countdown : 'Go Shoot!'}
          </div>
        </div>
      ) : null}

      {showSetup ? (
        <div className="countdown-overlay">
          <div className="bracket-modal">
            <div className="bracket-header">
              <div>
                <div className="hint">ベイ登録</div>
              </div>
            </div>
            <div className="match-hero">
              <div className="match-round">{battleTypeLabel(battleType)}</div>
              <div className="match-players">
                <div className="match-player-box left">
                  <div className="match-player">{leftName}</div>
                  {renderBeySummary(
                    'A',
                    leftBeys,
                    rowLabels(),
                    leftQuick,
                    setLeftQuick,
                    setLeftBeys,
                  )}
                </div>
                <div className="match-vs">VS</div>
                <div className="match-player-box right">
                  <div className="match-player">{rightName}</div>
                  {renderBeySummary(
                    'B',
                    rightBeys,
                    rowLabels(),
                    rightQuick,
                    setRightQuick,
                    setRightBeys,
                  )}
                </div>
              </div>
            </div>
            <div className="bracket-actions">
              <button type="button" className="btn" onClick={closeSetup}>
                開始する
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showBeyEditor
        ? renderBeyEditor(
            editorSide === 'A' ? leftBeys : rightBeys,
            editorSide === 'A' ? setLeftBeys : setRightBeys,
            editorSide === 'A' ? leftQuick : rightQuick,
            editorSide === 'A' ? setLeftQuick : setRightQuick,
            editorSide === 'A' ? 'レフト' : 'ライト',
          )
        : null}
    </div>
  )
}
