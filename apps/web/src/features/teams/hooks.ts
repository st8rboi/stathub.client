import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { teamsApi } from './api'
import type { CreateTeamBody, UpdateTeamBody } from './types'

export const teamKeys = {
  all: ['teams'] as const,
  list: (query: string) => [...teamKeys.all, 'list', query] as const,
  byIds: (ids: string[]) => [...teamKeys.all, 'ids', ids.join(',')] as const,
}

/**
 * Справочник команд (страница «Команды», выбор команды для заявки). Список ограничен сервером,
 * поэтому названия для уже известных Id берите через useTeamsByIds, а не поиском в этом списке.
 */
export const useTeams = (query = '') =>
  useQuery({
    queryKey: teamKeys.list(query),
    queryFn: () => teamsApi.list(query),
    // При поиске прежний список остаётся на экране, пока грузится новый, — таблица не мигает.
    placeholderData: keepPreviousData,
  })

/** Команды по Id — названия и логотипы для матчей, заявок, начислений. */
export const useTeamsByIds = (ids: string[]) => {
  const unique = [...new Set(ids)].sort()
  return useQuery({
    queryKey: teamKeys.byIds(unique),
    queryFn: () => teamsApi.byIds(unique),
    enabled: unique.length > 0,
    // Набор Id меняется (добавили команду) — уже известные названия не превращаются в «…».
    placeholderData: keepPreviousData,
  })
}

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
