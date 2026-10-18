import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from './api'
import type { AssignBody, CreateAccountBody } from './types'

export const accountKeys = {
  all: ['accounts'] as const,
  users: () => [...accountKeys.all, 'users'] as const,
  assignments: () => [...accountKeys.all, 'assignments'] as const,
}

export const useAccounts = () =>
  useQuery({ queryKey: accountKeys.users(), queryFn: accountsApi.listUsers })

export const useAssignments = () =>
  useQuery({ queryKey: accountKeys.assignments(), queryFn: accountsApi.listAssignments })

const useAccountMutation = <TVariables,>(mutationFn: (variables: TVariables) => Promise<unknown>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  })
}

export const useCreateAccount = () =>
  useAccountMutation((body: CreateAccountBody) => accountsApi.createUser(body))

export const useAssignReferee = () =>
  useAccountMutation((body: AssignBody) => accountsApi.assign(body))

export const useRevokeAssignment = () =>
  useAccountMutation((id: string) => accountsApi.revoke(id))
