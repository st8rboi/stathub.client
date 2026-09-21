import { Link } from 'react-router'
import { isGuid, useOrganizer } from '@/features/organizer/organizerContext'

export function Header() {
  const { organizerId, setOrganizerId } = useOrganizer()
  const invalid = organizerId !== '' && !isGuid(organizerId)

  return (
    <header>
      <Link to="/" className="brand">
        Stathub | Администратор
      </Link>
      <label className="organizer">
        Организатор (ID)
        <input
          value={organizerId}
          onChange={(e) => setOrganizerId(e.target.value.trim())}
          placeholder="GUID организатора"
          aria-invalid={invalid}
        />
      </label>
      <button type="button" onClick={() => setOrganizerId(crypto.randomUUID())}>
        Сгенерировать
      </button>
    </header>
  )
}
