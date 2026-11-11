import { useState } from 'react'
import { useAuth } from '@/features/auth/authContext'
import { validateLogoFile } from '@/shared/lib/logoFile'
import { ErrorText } from '@/shared/ui/ErrorText'
import { PersonAvatar } from '@/shared/ui/layout'
import { useDeletePlayerPhoto, useUploadPlayerPhoto } from '../hooks'
import type { Player } from '../types'

/**
 * Фото игрока (сохраняется сразу). Как и логотип команды, закрепляется за организацией,
 * загрузившей его первой (см. Player.SetPhoto).
 */
export function PlayerPhotoEditor({ player }: { player: Player }) {
  const { user } = useAuth()
  const uploadPhoto = useUploadPlayerPhoto()
  const deletePhoto = useDeletePlayerPhoto()
  const [photoError, setPhotoError] = useState<string | null>(null)

  const canChangePhoto = !player.photoUrl || player.photoOwnerTenantId === user?.tenantId

  return (
    <section className="modal-section">
      <h3 className="modal-section-title">Фото</h3>
      <div className="logo-editor">
        <PersonAvatar src={player.photoUrl} name={player.fullName} size="lg" />
        {canChangePhoto ? (
          <div className="logo-editor-controls">
            <div className="actions">
              <label className="file-button" aria-disabled={uploadPhoto.isPending}>
                {uploadPhoto.isPending ? 'Загружаем…' : player.photoUrl ? 'Заменить' : 'Загрузить'}
                <input
                  type="file"
                  className="visually-hidden"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploadPhoto.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      const error = validateLogoFile(file)
                      setPhotoError(error)
                      if (!error) uploadPhoto.mutate({ id: player.id, file })
                    }
                    event.target.value = ''
                  }}
                />
              </label>
              {player.photoUrl && (
                <button
                  type="button"
                  className="ghost"
                  disabled={deletePhoto.isPending}
                  onClick={() => deletePhoto.mutate(player.id)}
                >
                  Убрать
                </button>
              )}
            </div>
            <p className="hint">PNG, JPEG или WebP до 2 МБ.</p>
          </div>
        ) : (
          <p className="hint">Фото загружено другой организацией — заменить можно через техподдержку.</p>
        )}
      </div>
      {photoError && <p className="error">{photoError}</p>}
      <ErrorText error={uploadPhoto.error ?? deletePhoto.error} />
    </section>
  )
}
