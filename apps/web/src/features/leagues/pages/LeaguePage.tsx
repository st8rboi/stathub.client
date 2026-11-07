import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { TournamentsSection } from '@/features/tournaments/components/TournamentsSection'
import { validateLogoFile } from '@/shared/lib/logoFile'
import { ErrorText } from '@/shared/ui/ErrorText'
import { EditLeagueForm } from '../components/EditLeagueForm'
import {
  useArchiveLeague,
  useDeleteLeague,
  useDeleteLeagueLogo,
  useLeague,
  usePublishLeague,
  useUploadLeagueLogo,
} from '../hooks'
import { dataSourceLabels, leagueStatusLabels } from '../labels'

export default function LeaguePage() {
  const { leagueId = '' } = useParams()

  const league = useLeague(leagueId)
  const publish = usePublishLeague()
  const archive = useArchiveLeague()
  const uploadLogo = useUploadLeagueLogo()
  const deleteLogo = useDeleteLeagueLogo()
  const deleteLeague = useDeleteLeague()
  const navigate = useNavigate()

  const [logoError, setLogoError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const busy = publish.isPending || archive.isPending || deleteLeague.isPending

  if (league.error) return <ErrorText error={league.error} />
  if (!league.data) return <p>Загрузка…</p>

  const { data } = league

  return (
    <>
      <p>
        <Link to="/">← Все лиги</Link>
      </p>
      <h1>{data.name}</h1>

      {editing ? (
        <EditLeagueForm league={data} onDone={() => setEditing(false)} />
      ) : (
        <dl>
          <dt>Статус</dt>
          <dd>{leagueStatusLabels[data.status]}</dd>
          <dt>Slug</dt>
          <dd>{data.slug}</dd>
          <dt>Город / регион</dt>
          <dd>{[data.city, data.region].filter(Boolean).join(', ') || '—'}</dd>
          <dt>Источник данных</dt>
          <dd>{dataSourceLabels[data.dataSource]}</dd>
        </dl>
      )}

      <div className="actions">
        {!editing && (
          <button className="secondary" disabled={busy} onClick={() => setEditing(true)}>
            Изменить
          </button>
        )}
        {data.status === 'Draft' && (
          <button disabled={busy} onClick={() => publish.mutate(leagueId)}>
            Опубликовать
          </button>
        )}
        {data.status !== 'Archived' && (
          <button
            className="danger"
            disabled={busy}
            onClick={() => {
              if (confirm('Архивировать лигу? Новые турниры в ней создавать будет нельзя.')) archive.mutate(leagueId)
            }}
          >
            В архив
          </button>
        )}
        <button
          className="danger"
          disabled={busy}
          onClick={() => {
            // Сервер откажет (409), если в лиге есть турниры.
            if (confirm(`Удалить лигу «${data.name}»? Это действие нельзя отменить.`))
              deleteLeague.mutate(leagueId, { onSuccess: () => void navigate('/') })
          }}
        >
          Удалить лигу
        </button>
      </div>
      <ErrorText
        error={publish.error ?? archive.error ?? deleteLeague.error ?? uploadLogo.error ?? deleteLogo.error}
      />

      <h2>Логотип лиги</h2>
      <div className="logo-row">
        {data.logoUrl ? (
          <img src={data.logoUrl} alt="" className="logo logo--lg" />
        ) : (
          <span className="muted">Логотип не загружен</span>
        )}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={uploadLogo.isPending}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              const error = validateLogoFile(file)
              setLogoError(error)
              if (!error) uploadLogo.mutate({ id: leagueId, file })
            }
            event.target.value = ''
          }}
        />

        {data.logoUrl && (
          <button type="button" className="danger" disabled={deleteLogo.isPending} onClick={() => deleteLogo.mutate(leagueId)}>
            Убрать логотип
          </button>
        )}
      </div>
      {logoError && <p className="error">{logoError}</p>}

      <TournamentsSection leagueId={leagueId} canCreate={data.status !== 'Archived'} />
    </>
  )
}
