import { request } from '@/shared/api/client'
import type { AccountUser, AssignBody, Assignment, CreateAccountBody } from './types'

export const accountsApi = {
  listUsers: () => request<AccountUser[]>('GET', '/accounts/users'),
  createUser: (body: CreateAccountBody) => request<AccountUser>('POST', '/accounts/users', body),
  listAssignments: () => request<Assignment[]>('GET', '/accounts/assignments'),
  assign: (body: AssignBody) => request<Assignment>('POST', '/accounts/assignments', body),
  revoke: (id: string) => request<void>('DELETE', `/accounts/assignments/${id}`),
}
