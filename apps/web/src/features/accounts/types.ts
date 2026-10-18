export type AccountRole = 'Organizer' | 'Admin' | 'Referee' | 'Coach'

export type AccountUser = {
  id: string
  login: string
  displayName: string
  email: string | null
  isActive: boolean
  role: AccountRole
  createdAtUtc: string
}

export type RoleScopeType = 'Tenant' | 'League' | 'Tournament' | 'Team' | 'Match'

export type Assignment = {
  id: string
  userId: string
  userLogin: string
  userDisplayName: string
  role: AccountRole
  scopeType: RoleScopeType
  scopeId: string | null
  grantedAtUtc: string
}

export type CreateAccountBody = {
  login: string
  displayName: string
  password: string
  role: AccountRole
  email: string | null
}

export type AssignBody = {
  userId: string
  role: AccountRole
  scopeType: RoleScopeType
  scopeId: string | null
}
