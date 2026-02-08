import { Link } from 'react-router-dom'

export default function SettingsPage() {
  return (
    <div className="card">
      <h1 className="title">管理ハブ</h1>
      <p className="subtitle">
        大会・グループ・ユーザの管理を行います。グループはパーツを共有する集まりです。
      </p>
      <div className="grid">
        <Link to="/tournament" className="tile">
          大会トップへ
        </Link>
        <Link to="/teams" className="tile">
          グループ管理へ
        </Link>
        <Link to="/users" className="tile">
          ユーザ管理へ
        </Link>
      </div>
    </div>
  )
}
