import { request } from '@/shared/api/client'

export type FeeSettings = {
  tournamentAmount: number
  stageAmount: number | null
  effectiveAmount: number
}

export type ChargeStatus = 'Pending' | 'Paid' | 'Cancelled'
export type PaymentMethod = 'Cash' | 'Transfer' | 'Bank'
/** MatchFee создаётся вместе с матчем; остальные виды организатор выставляет вручную. */
export type ChargeKind = 'MatchFee' | 'EntryFee' | 'Fine' | 'Other'
export type ManualChargeKind = Exclude<ChargeKind, 'MatchFee'>

export type Charge = {
  id: string
  /** Только у взноса за матч. */
  matchId: string | null
  /** У взноса за матч всегда; у ручного начисления — если выставлено на этап. */
  stageId: string | null
  teamId: string
  teamName: string
  side: 'Home' | 'Away' | null
  kind: ChargeKind
  description: string | null
  amount: number
  status: ChargeStatus
  createdAtUtc: string
  paidAtUtc: string | null
  paymentMethod: PaymentMethod | null
  comment: string | null
}

export type ChargeKindSummary = {
  kind: ChargeKind
  charged: number
  paid: number
  debt: number
}

export type FeeSummary = {
  charged: number
  paid: number
  debt: number
  pendingCount: number
  paidCount: number
  byKind: ChargeKindSummary[]
}

export type TeamDebt = {
  teamId: string
  teamName: string
  charged: number
  paid: number
  debt: number
}

export type AddManualChargeBody = {
  teamId: string
  stageId: string | null
  kind: ManualChargeKind
  amount: number
  description: string | null
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
  tournamentCharges: (tournamentId: string, onlyDebt = false) =>
    request<Charge[]>('GET', `/finance/tournaments/${tournamentId}/charges?onlyDebt=${onlyDebt}`),
  addManualCharge: (tournamentId: string, body: AddManualChargeBody) =>
    request<{ id: string }>('POST', `/finance/tournaments/${tournamentId}/charges`, body),
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
