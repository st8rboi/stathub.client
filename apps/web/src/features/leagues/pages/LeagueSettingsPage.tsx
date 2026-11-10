import { useState } from 'react'
import { useNavigate } from 'react-router'
import { formatDate } from '@/shared/lib/format'
import { validateLogoFile } from '@/shared/lib/logoFile'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Card, LogoBadge } from '@/shared/ui/layout'
import { EditLeagueForm } from '../components/EditLeagueForm'
import { useArchiveLeague, useDeleteLeague, useDeleteLeagueLogo, useUploadLeagueLogo } from '../hooks'
import { dataSourceLabels } from '../labels'
import { useLeagueOutlet } from '../leagueOutlet'

/** Вкладка «Настройки» лиги: данные, логотип и необратимые действия. */
export default function LeagueSettingsPage() {
  const { league } = useLeagueOutlet()
  const confirm = useConfirm()
  const navigate = useNavigate()

  const archive = useArchiveLeague()
  const deleteLeague = useDeleteLeague()
  const uploadLogo = useUploadLeagueLogo()
  const deleteLogo = useDeleteLeagueLogo()

  const [editing, setEditing] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)

  const dangerBusy = archive.isPending || deleteLeague.isPending

  return (
    <div className="settings">
      <Card
        title="Основные данные"
        actions={
          !editing && (
            <button type="button" className="secondary" onClick={() => setEditing(true)}>
              Изменить
            </button>
          )
        }
      >
        {editing ? (
          <EditLeagueForm league={league} onDone={() => setEditing(false)} />
        ) : (
          <dl>
            <dt>Название</dt>
            <dd>{league.name}</dd>
            <dt>Адрес на витрине</dt>
            <dd className="mono">{league.slug}</dd>
            <dt>Город</dt>
            <dd>{league.city ?? '—'}</dd>
            <dt>Регион</dt>
            <dd>{league.region ?? '—'}</dd>
            <dt>Источник данных</dt>
            <dd>{dataSourceLabels[league.dataSource]}</dd>
            <dt>Создана</dt>
            <dd>{formatDate(league.createdAtUtc)}</dd>
          </dl>
        )}
      </Card>

      <Card title="Логотип">
        <div className="logo-editor">
          <LogoBadge src={league.logoUrl} name={league.name} size="lg" />
          <div className="logo-editor-controls">
            <div className="actions">
              <label className="file-button" aria-disabled={uploadLogo.isPending}>
                {uploadLogo.isPending ? 'Загружаем…' : league.logoUrl ? 'Заменить' : 'Загрузить'}
                <input
                  type="file"
                  className="visually-hidden"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploadLogo.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      const error = validateLogoFile(file)
                      setLogoError(error)
                      if (!error) uploadLogo.mutate({ id: league.id, file })
                    }
                    event.target.value = ''
                  }}
                />
              </label>
              {league.logoUrl && (
                <button
                  type="button"
                  className="ghost"
                  disabled={deleteLogo.isPending}
                  onClick={() => deleteLogo.mutate(league.id)}
                >
                  Убрать
                </button>
              )}
            </div>
            <p className="hint">PNG, JPEG или WebP до 2 МБ. Лучше квадратный.</p>
          </div>
        </div>
        {logoError && <p className="error">{logoError}</p>}
        <ErrorText error={uploadLogo.error ?? deleteLogo.error} />
      </Card>

      <Card title="Опасная зона" tone="danger">
        {league.status !== 'Archived' && (
          <div className="danger-row">
            <div className="danger-row-text">
              <p className="danger-row-title">Архивировать лигу</p>
              <p className="hint">Новые турниры в лиге создавать будет нельзя.</p>
            </div>
            <button
              type="button"
              className="danger"
              disabled={dangerBusy}
              onClick={() => {
                void confirm({
                  title: 'Архивировать лигу?',
                  message: 'Новые турниры в ней создавать будет нельзя.',
                  confirmLabel: 'В архив',
                  danger: true,
                }).then((ok) => {
                  if (ok) archive.mutate(league.id)
                })
              }}
            >
              В архив
            </button>
          </div>
        )}
        <div className="danger-row">
          <div className="danger-row-text">
            <p className="danger-row-title">Удалить лигу</p>
            <p className="hint">Только для лиги без турниров. Действие нельзя отменить.</p>
          </div>
          <button
            type="button"
            className="danger"
            disabled={dangerBusy}
            onClick={() => {
              // Сервер откажет (409), если в лиге есть турниры.
              void confirm({
                title: `Удалить лигу «${league.name}»?`,
                message: 'Это действие нельзя отменить. Лигу с турнирами удалить не получится — её можно архивировать.',
                confirmLabel: 'Удалить лигу',
                danger: true,
              }).then((ok) => {
                if (ok) deleteLeague.mutate(league.id, { onSuccess: () => void navigate('/') })
              })
            }}
          >
            Удалить
          </button>
        </div>
        <ErrorText error={archive.error ?? deleteLeague.error} />
      </Card>
    </div>
  )
}
