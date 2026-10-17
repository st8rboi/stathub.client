import { useState } from 'react'
import { Link } from 'react-router'
import { useLeagues } from '@/hooks'

/** Каталог опубликованных лиг с фильтрами «по названию» и «в моём городе» (doc §2.1). */
export default function LeaguesPage() {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const leagues = useLeagues(name, city)

  return (
    <>
      <div className="section-head">
        <h1>Лиги</h1>
      </div>

      <div className="filters">
        <label>
          Название
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="например, Любительская"
          />
        </label>
        <label>
          Город
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="например, Пермь"
          />
        </label>
      </div>

      {leagues.error && <p className="notice">Не удалось загрузить лиги: {leagues.error.message}</p>}
      {leagues.data?.length === 0 && (
        <p className="notice">Лиг не найдено — попробуйте другой город или название.</p>
      )}

      <div className="league-grid">
        {(leagues.data ?? []).map((league) => (
          <Link key={league.id} to={`/leagues/${league.slug}`} className="league-card">
            {league.logoUrl ? (
              <img src={league.logoUrl} alt="" className="league-card-logo" />
            ) : (
              <span className="league-card-logo league-card-logo--empty" />
            )}

            <span className="league-card-body">
              <span className="league-card-name">{league.name}</span>
              <span className="league-card-meta">
                {[league.city, league.region].filter(Boolean).join(', ') || 'География не указана'}
              </span>
            </span>

            <span className="league-card-arrow">→</span>
          </Link>
        ))}
      </div>
    </>
  )
}
