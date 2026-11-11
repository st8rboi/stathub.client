export interface Player {
  id: string
  fullName: string
  birthDate: string | null
  photoUrl: string | null
  photoOwnerTenantId: string | null
  createdAtUtc: string
}

export interface CreatePlayerBody {
  fullName: string
  birthDate: string | null
}

export type UpdatePlayerBody = CreatePlayerBody
