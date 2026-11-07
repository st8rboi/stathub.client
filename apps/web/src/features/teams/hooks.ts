import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { teamsApi } from './api'
import type { CreateTeamBody, UpdateTeamBody } from './types'

export const teamKeys = {
  all: ['teams'] as const,
  list: (query: string) => [...teamKeys.all, 'list', query] as const,
}

export const useTeams = (query = '') =>
  useQuery({ queryKey: teamKeys.list(query), queryFn: () => teamsApi.list(query) })

export const useCreateTeam = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTeamBody) => teamsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  })
}

export const useUploadTeamLogo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; file: File }) => teamsApi.uploadLogo(input.id, input.file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  })
}

export const useDeleteTeamLogo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => teamsApi.deleteLogo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  })
}

export const useUpdateTeam = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; body: UpdateTeamBody }) => teamsApi.update(input.id, input.body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  })
}

export const useDeleteTeam = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => teamsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  })
}
