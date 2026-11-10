import { useState, type SubmitEvent } from 'react'
import { useAuth } from '@/features/auth/authContext'
import { validateLogoFile } from '@/shared/lib/logoFile'
import { CopyField } from '@/shared/ui/CopyField'
import { ErrorText } from '@/shared/ui/ErrorText'
import { LogoBadge } from '@/shared/ui/layout'
import { useDeleteTeamLogo, useUpdateTeam, useUploadTeamLogo } from '../hooks'
import type { Team } from '../types'

/**
 * Карточка команды в модальном окне: логотип (сохраняется сразу), название и город, ID.
 * Логотип закрепляется за организацией, загрузившей его первой (см. Team.SetLogo).
 */
export function TeamEditor({ team, onDone }: { team: Team; onDone: () => void }) {
  const { user } = useAuth()
  const updateTeam = useUpdateTeam()
  const uploadLogo = useUploadTeamLogo()
  const deleteLogo = useDeleteTeamLogo()
  const [logoError, setLogoError] = useState<string | null>(null)

  const canChangeLogo = !team.logoUrl || team.logoOwnerTenantId === user?.tenantId

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    updateTeam.mutate(
      {
        id: team.id,
        body: { name: String(form.get('name')).trim(), city: String(form.get('city')).trim() || null },
      },
      { onSuccess: onDone },
    )
  }

  return (
    <>
      <section className="modal-section">
        <h3 className="modal-section-title">Логотип</h3>
        <div className="logo-editor">
          <LogoBadge src={team.logoUrl} name={team.name} size="lg" />
          {canChangeLogo ? (
            <div className="logo-editor-controls">
              <div className="actions">
                <label className="file-button" aria-disabled={uploadLogo.isPending}>
                  {uploadLogo.isPending ? 'Загружаем…' : team.logoUrl ? 'Заменить' : 'Загрузить'}
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
                        if (!error) uploadLogo.mutate({ id: team.id, file })
                      }
                      event.target.value = ''
                    }}
                  />
                </label>
                {team.logoUrl && (
                  <button
                    type="button"
                    className="ghost"
                    disabled={deleteLogo.isPending}
                    onClick={() => deleteLogo.mutate(team.id)}
                  >
                    Убрать
                  </button>
                )}
              </div>
              <p className="hint">PNG, JPEG или WebP до 2 МБ.</p>
            </div>
          ) : (
            <p className="hint">Логотип загружен другой организацией — заменить можно через техподдержку.</p>
          )}
        </div>
        {logoError && <p className="error">{logoError}</p>}
        <ErrorText error={uploadLogo.error ?? deleteLogo.error} />
      </section>

      <section className="modal-section">
        <form onSubmit={onSubmit}>
          <label>
            Название команды
            <input name="name" required maxLength={150} defaultValue={team.name} />
          </label>
          <label>
            Город
            <input name="city" maxLength={100} defaultValue={team.city ?? ''} placeholder="необязательно" />
          </label>
          <p className="hint">
            Матчи ссылаются на команду по идентификатору — переименование не ломает историю. Изменить команду можно,
            только если она не используется в чужих лигах.
          </p>
          <ErrorText error={updateTeam.error} />
          <div className="actions">
            <button type="submit" disabled={updateTeam.isPending}>
              Сохранить
            </button>
            <button type="button" className="secondary" onClick={onDone}>
              Закрыть
            </button>
          </div>
          <CopyField label="ID" value={team.id} />
        </form>
      </section>
    </>
  )
}
