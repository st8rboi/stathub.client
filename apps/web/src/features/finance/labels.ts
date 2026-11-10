import type { BadgeTone } from '@/shared/ui/layout'
import type { ChargeKind, ChargeStatus, ManualChargeKind, PaymentMethod } from './api'

export const chargeStatusLabels: Record<ChargeStatus, string> = {
  Pending: 'Ожидается',
  Paid: 'Оплачено',
  Cancelled: 'Отменено',
}

export const chargeStatusTones: Record<ChargeStatus, BadgeTone> = {
  Pending: 'warning',
  Paid: 'success',
  Cancelled: 'neutral',
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  Cash: 'Наличные',
  Transfer: 'Перевод',
  Bank: 'Безнал',
}

export const chargeKindLabels: Record<ChargeKind, string> = {
  MatchFee: 'Взносы за матчи',
  EntryFee: 'Вступительный взнос',
  Fine: 'Штраф',
  Other: 'Прочее',
}

/** Виды, которые организатор выставляет вручную (в порядке показа в форме). */
export const MANUAL_CHARGE_KINDS: ManualChargeKind[] = ['EntryFee', 'Fine', 'Other']
