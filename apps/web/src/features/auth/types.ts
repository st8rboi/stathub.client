export interface Membership {
  tenantId: string
  tenantName: string
  tenantSlug: string
  role: 'Organizer' | 'Admin' | 'Referee' | 'Coach'
}

export interface UserProfile {
  id: string
  login: string
  displayName: string
  email: string | null
  tenantId: string
  tenantName: string
  tenantSlug: string
  role: Membership['role']
  memberships: Membership[]
}

export interface AuthResult {
  accessToken: string
  accessTokenExpiresAtUtc: string
  refreshToken: string
  refreshTokenExpiresAtUtc: string
  user: UserProfile
}
