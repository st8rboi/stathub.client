import { useState } from 'react'
import { useAuth } from '@/features/auth/authContext'
import { validateLogoFile } from '@/shared/lib/logoFile'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { CreateTeamForm } from '../components/CreateTeamForm'
import { useDeleteTeam, useDeleteTeamLogo, useTeams, useUpdateTeam, useUploadTeamLogo } from '../hooks'

interface TeamDraft {
  id: string
  name: string
  city: string
}

export default function TeamsPage() {
  const confirm = useConfirm()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [logoError, setLogoError] = useState<string | null>(null)
  const teams = useTeams(query.trim())

  const uploadLogo = useUploadTeamLogo()
  const deleteLogo = useDeleteTeamLogo()
  const updateTeam = useUpdateTeam()
  const deleteTeam = useDeleteTeam()

  // Редактируемая строка: правка идёт прямо в таблице, одна строка за раз.
  const [draft, setDraft] = useState<TeamDraft | null>(null)

  const saveDraft = () => {
    if (!draft) return
    updateTeam.mutate(
      { id: draft.id, body: { name: draft.name, city: draft.city.trim() || null } },
      { onSuccess: () => setDraft(null) },
    )
  }

  const uploadingTeamId = uploadLogo.isPending ? uploadLogo.variables?.id : undefined

  return (
    <>
      <h1>Команды</h1>
      <p>
        Справочник клубов: команда заводится один раз и переиспользуется во всех турнирах.
        Матчи ссылаются на её идентификатор, поэтому переименование не ломает историю.
        Команда общая для всех организаторов: изменить её можно, только если она не используется
        в чужих лигах, а удалить — только если её ещё нет ни в заявках, ни в матчах.
      </p>

      <label>
        Поиск по названию
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="например, Звезда"
          maxLength={150}
        />
      </label>

      <ErrorText
        error={teams.error ?? uploadLogo.error ?? deleteLogo.error ?? updateTeam.error ?? deleteTeam.error}
      />
      {logoError && <p className="error">{logoError}</p>}
      {teams.isPending && <p>Загрузка…</p>}
      {teams.data?.length === 0 && (
        <p className="notice">
          {query.trim() ? 'По этому запросу команд нет.' : 'Команд пока нет — добавьте первую ниже.'}
        </p>
      )}
      {teams.data && teams.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Логотип</th>
              <th>Название</th>
              <th>Город</th>
              <th>ID</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {teams.data.map((team) => {
              // Логотип закрепляется за организацией, загрузившей его первой (см. Team.SetLogo).
              const canChangeLogo = !team.logoUrl || team.logoOwnerTenantId === user?.tenantId
              const isEditing = draft?.id === team.id

              return (
                <tr key={team.id}>
                  <td>
                    <div className="logo-cell">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt="" className="logo" />
                      ) : (
                        <span className="muted">—</span>
                      )}

                      {canChangeLogo ? (
                        <>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={uploadingTeamId === team.id}
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

                          {team.logoUrl && (
                            <button
                              type="button"
                              className="danger"
                              disabled={deleteLogo.isPending}
                              onClick={() => deleteLogo.mutate(team.id)}
                            >
                              Убрать
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="muted">Заменить — через техподдержку</span>
                      )}
                    </div>
                  </td>
                  {isEditing ? (
                    <>
                      <td>
                        <input
                          value={draft.name}
                          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && saveDraft()}
                          required
                          maxLength={150}
                          aria-label="Название команды"
                          autoFocus
                        />
                      </td>
                      <td>
                        <input
                          value={draft.city}
                          onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && saveDraft()}
                          maxLength={100}
                          aria-label="Город"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{team.name}</td>
                      <td>{team.city ?? '—'}</td>
                    </>
                  )}
                  <td className="mono">{team.id}</td>
                  <td className="actions-cell">
                    {isEditing ? (
                      <div className="actions">
                        <button
                          type="button"
                          disabled={updateTeam.isPending || !draft.name.trim()}
                          onClick={saveDraft}
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            setDraft(null)
                            updateTeam.reset()
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <div className="actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            updateTeam.reset()
                            setDraft({ id: team.id, name: team.name, city: team.city ?? '' })
                          }}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={deleteTeam.isPending}
                          onClick={() => {
                            // Сервер откажет (409), если команда уже есть в заявках или матчах.
                            void confirm({
                              title: `Удалить команду «${team.name}»?`,
                              confirmLabel: 'Удалить',
                              danger: true,
                            }).then((ok) => {
                              if (ok) deleteTeam.mutate(team.id)
                            })
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <h2>Новая команда</h2>
      <CreateTeamForm />
    </>
  )
}
