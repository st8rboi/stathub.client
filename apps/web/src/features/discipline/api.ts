import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/shared/api/client'

export type Disqualification = {
  id: string
  tournamentId: string
  teamId: string
  teamName: string
  playerId: string
  playerName: string
  reason: string
  matchesBanned: number | null
  matchesServed: number
  matchesLeft: number | null
  isActive: boolean
  issuedAtUtc: string
  liftedAtUtc: string | null
  comment: string | null
}

export type IssueBody = {
  teamId: string
  playerId: string
  reason: string
  matchesBanned: number | null
  comment: string | null
}

export const disciplineApi = {
  list: (tournamentId: string) =>
    request<Disqualification[]>('GET', `/discipline/tournaments/${tournamentId}`),
  issue: (tournamentId: string, body: IssueBody) =>
    request<{ id: string }>('POST', `/discipline/tournaments/${tournamentId}`, body),
  lift: (id: string, comment: string | null) =>
    request<void>('POST', `/discipline/disqualifications/${id}/lift`, { comment }),
}

const keys = {
  all: ['discipline'] as const,
  list: (tournamentId: string) => [...keys.all, 'list', tournamentId] as const,
}

export const useDisqualifications = (tournamentId: string) =>
  useQuery({
    queryKey: keys.list(tournamentId),
    queryFn: () => disciplineApi.list(tournamentId),
    enabled: Boolean(tournamentId),
  })

const useDisciplineMutation = <TVariables,>(mutationFn: (variables: TVariables) => Promise<unknown>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  })
}

export const useIssueDisqualification = (tournamentId: string) =>
  useDisciplineMutation((body: IssueBody) => disciplineApi.issue(tournamentId, body))

export const useLiftDisqualification = () =>
  useDisciplineMutation((input: { id: string; comment: string | null }) =>
    disciplineApi.lift(input.id, input.comment),
  )
