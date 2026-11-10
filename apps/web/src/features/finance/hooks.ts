import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financeApi, type AddManualChargeBody, type PaymentMethod } from './api'

export const financeKeys = {
  all: ['finance'] as const,
  settings: (tournamentId: string, stageId?: string) =>
    [...financeKeys.all, 'settings', tournamentId, stageId ?? ''] as const,
  charges: (stageId: string, onlyDebt: boolean) =>
    [...financeKeys.all, 'charges', stageId, onlyDebt] as const,
  summary: (tournamentId: string, stageId?: string) =>
    [...financeKeys.all, 'summary', tournamentId, stageId ?? ''] as const,
  debts: (tournamentId: string) => [...financeKeys.all, 'debts', tournamentId] as const,
  tournamentCharges: (tournamentId: string, onlyDebt: boolean) =>
    [...financeKeys.all, 'tournament-charges', tournamentId, onlyDebt] as const,
}

export const useFeeSettings = (tournamentId: string, stageId?: string) =>
  useQuery({
    queryKey: financeKeys.settings(tournamentId, stageId),
    queryFn: () => financeApi.settings(tournamentId, stageId),
    enabled: Boolean(tournamentId),
  })

export const useStageCharges = (stageId: string, onlyDebt: boolean) =>
  useQuery({
    queryKey: financeKeys.charges(stageId, onlyDebt),
    queryFn: () => financeApi.charges(stageId, onlyDebt),
    enabled: Boolean(stageId),
  })

export const useFeeSummary = (tournamentId: string, stageId?: string) =>
  useQuery({
    queryKey: financeKeys.summary(tournamentId, stageId),
    queryFn: () => financeApi.summary(tournamentId, stageId),
    enabled: Boolean(tournamentId),
  })

export const useTeamDebts = (tournamentId: string) =>
  useQuery({
    queryKey: financeKeys.debts(tournamentId),
    queryFn: () => financeApi.teamDebts(tournamentId),
    enabled: Boolean(tournamentId),
  })

/** Все начисления турнира, включая ручные без этапа. */
export const useTournamentCharges = (tournamentId: string, onlyDebt = false) =>
  useQuery({
    queryKey: financeKeys.tournamentCharges(tournamentId, onlyDebt),
    queryFn: () => financeApi.tournamentCharges(tournamentId, onlyDebt),
    enabled: Boolean(tournamentId),
  })

const useFinanceMutation = <TVariables,>(mutationFn: (variables: TVariables) => Promise<unknown>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  })
}

export const useSetTournamentFee = () =>
  useFinanceMutation((input: { tournamentId: string; amount: number }) =>
    financeApi.setTournamentFee(input.tournamentId, input.amount),
  )

export const useSetStageFee = () =>
  useFinanceMutation((input: { stageId: string; amount: number | null }) =>
    financeApi.setStageFee(input.stageId, input.amount),
  )

export const usePayCharge = () =>
  useFinanceMutation((input: { chargeId: string; method: PaymentMethod; comment: string | null }) =>
    financeApi.pay(input.chargeId, input.method, input.comment),
  )

export const useCancelCharge = () =>
  useFinanceMutation((input: { chargeId: string; comment: string | null }) =>
    financeApi.cancel(input.chargeId, input.comment),
  )

/** Ручное начисление команде: вступительный взнос, штраф, прочее. */
export const useAddManualCharge = () =>
  useFinanceMutation((input: { tournamentId: string; body: AddManualChargeBody }) =>
    financeApi.addManualCharge(input.tournamentId, input.body),
  )
