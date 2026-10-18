export interface Player {
  id: string
  fullName: string
  birthDate: string | null
  createdAtUtc: string
}

export interface CreatePlayerBody {
  fullName: string
  birthDate: string | null
}
