import { useState } from 'react'
import { validateLogoFile } from '@/shared/lib/logoFile'
import { ErrorText } from '@/shared/ui/ErrorText'
import { CreateTeamForm } from '../components/CreateTeamForm'
import { useDeleteTeamLogo, useTeams, useUploadTeamLogo } from '../hooks'

export default function TeamsPage() {
  const [query, setQuery] = useState('')
  const [logoError, setLogoError] = useState<string | null>(null)
  const teams = useTeams(query.trim())

  const uploadLogo = useUploadTeamLogo()
  const deleteLogo = useDeleteTeamLogo()

  const uploadingTeamId = uploadLogo.isPending ? uploadLogo.variables?.id : undefined

  return (
    <>
      <h1>Команды</h1>
      <p>
        Справочник клубов: команда заводится один раз и переиспользуется во всех турнирах.
        Матчи ссылаются на её идентификатор, поэтому переименование не ломает историю.
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

      <ErrorText error={teams.error ?? uploadLogo.error ?? deleteLogo.error} />
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
            </tr>
          </thead>
          <tbody>
            {teams.data.map((team) => (
              <tr key={team.id}>
                <td>
                  <div className="logo-cell">
                    {team.logoUrl ? (
                      <img src={team.logoUrl} alt="" className="logo" />
                    ) : (
                      <span className="muted">—</span>
                    )}

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
                  </div>
                </td>
                <td>{team.name}</td>
                <td>{team.city ?? '—'}</td>
                <td className="mono">{team.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Новая команда</h2>
      <CreateTeamForm />
    </>
  )
}
