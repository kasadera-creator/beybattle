import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 3000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="home-hero">
      <div className="home-glow" />
      {showSplash ? (
        <div className="home-splash">
          <img src="/brand/title.jpg" alt="GEAR SPORTS BEYBLADE X" />
        </div>
      ) : null}

      <div className="home-layout">
        <div className="home-brand">
          <div className="home-gear">GEAR SPORTS</div>
          <div className="home-logo">
            <img src="/brand/logo.jpg" alt="BEYBLADE X" />
          </div>
        </div>

        <div className="home-actions">
          <div className="home-grid">
            <Link to="/tournament" className="home-card primary">
              <div className="home-card-tag">TOURNAMENT</div>
              <div className="home-card-title">大会モード</div>
              <p className="home-card-desc">
                エントリーからバトル開始、勝敗記録までまとめて進行。
              </p>
              <div className="home-card-cta">開始する</div>
            </Link>

            <Link to="/practice" className="home-card primary alt">
              <div className="home-card-tag">PRACTICE</div>
              <div className="home-card-title">練習モード</div>
              <p className="home-card-desc">
                登録なしでもすぐ開始。形式変更もワンタップ。
              </p>
              <div className="home-card-cta">開始する</div>
            </Link>
          </div>

          <div className="home-secondary">
            <Link to="/analytics" className="home-mini">
              データ解析
            </Link>
            <Link to="/settings" className="home-mini">
              管理
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
