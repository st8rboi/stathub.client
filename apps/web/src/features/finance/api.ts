import { request } from '@/shared/api/client'

export type FeeSettings = {
  tournamentAmount: number
  stageAmount: number | null
  effectiveAmount: number
}

export type ChargeStatus = 'Pending' | 'Paid' | 'Cancelled'
export type PaymentMethod = 'Cash' | 'Transfer' | 'Bank'

export type Charge = {
  id: string
  matchId: string
  stageId: string
  teamId: string
  teamName: string
  side: 'Home' | 'Away'
  amount: number
  status: ChargeStatus
  createdAtUtc: string
  paidAtUtc: string | null
  paymentMethod: PaymentMethod | null
  comment: string | null
}

export type FeeSummary = {
  charged: number
  paid: number
  debt: number
  pendingCount: number
  paidCount: number
}

export type TeamDebt = {
  teamId: string
  teamName: string
  charged: number
  paid: number
  debt: number
}

export const financeApi = {
  settings: (tournamentId: string, stageId?: string) =>
    request<FeeSettings>(
      'GET',
      `/finance/tournaments/${tournamentId}/settings${stageId ? `?stageId=${stageId}` : ''}`,
    ),
  setTournamentFee: (tournamentId: string, amount: number) =>
    request<void>('PUT', `/finance/tournaments/${tournamentId}/fee`, { amount }),
  setStageFee: (stageId: string, amount: number | null) =>
    request<void>('PUT', `/finance/stages/${stageId}/fee`, { amount }),
  charges: (stageId: string, onlyDebt = false) =>
    request<Charge[]>('GET', `/finance/stages/${stageId}/charges?onlyDebt=${onlyDebt}`),
  pay: (chargeId: string, method: PaymentMethod, comment: string | null) =>
    request<void>('POST', `/finance/charges/${chargeId}/pay`, { method, comment }),
  cancel: (chargeId: string, comment: string | null) =>
    request<void>('POST', `/finance/charges/${chargeId}/cancel`, { comment }),
  summary: (tournamentId: string, stageId?: string) =>
    request<FeeSummary>(
      'GET',
      `/finance/tournaments/${tournamentId}/summary${stageId ? `?stageId=${stageId}` : ''}`,
    ),
  teamDebts: (tournamentId: string) =>
    request<TeamDebt[]>('GET', `/finance/tournaments/${tournamentId}/team-debts`),
}
