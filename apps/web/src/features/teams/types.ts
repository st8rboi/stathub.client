export interface Team {
  id: string
  name: string
  city: string | null
  logoUrl: string | null
  createdAtUtc: string
}

export interface CreateTeamBody {
  name: string
  city: string | null
}
