export type LeagueStatus = 'Draft' | 'Published' | 'Archived'
export type LeagueDataSource = 'Native' | 'Mirrored'

export interface League {
  id: string
  organizerId: string
  name: string
  slug: string
  sport: 'Football'
  city: string | null
  region: string | null
  dataSource: LeagueDataSource
  status: LeagueStatus
  createdAtUtc: string
}

export interface CreateLeagueBody {
  organizerId: string
  name: string
  slug: string
  sport: 'Football'
  city: string | null
  region: string | null
  dataSource: LeagueDataSource
}
