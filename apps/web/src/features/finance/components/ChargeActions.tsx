import { formatMoney } from '@/shared/lib/format'
import { useConfirm } from '@/shared/ui/confirmContext'
import { ErrorText } from '@/shared/ui/ErrorText'
import { Icon } from '@/shared/ui/Icon'
import { Menu, MenuButton, MenuTitle } from '@/shared/ui/Menu'
import type { Charge, PaymentMethod } from '../api'
import { useCancelCharge, usePayCharge } from '../hooks'
import { paymentMethodLabels } from '../labels'

/**
 * Действия с неоплаченным начислением: отметить оплату (способ) или отменить.
 * Ошибка сервера (например, начисление уже оплачено) показывается под меню.
 */
export function ChargeActions({ charge, teamName }: { charge: Charge; teamName: string }) {
  const pay = usePayCharge()
  const cancel = useCancelCharge()
  const confirm = useConfirm()

  if (charge.status !== 'Pending') return null

  return (
    <>
      <Menu
        triggerClassName="secondary"
        align="end"
        trigger={
          <>
            Отметить оплату
            <Icon name="chevron-down" size={16} />
          </>
        }
      >
        <MenuTitle>Оплачено</MenuTitle>
        {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((method) => (
          <MenuButton
            key={method}
            disabled={pay.isPending}
            onClick={() => pay.mutate({ chargeId: charge.id, method, comment: null })}
          >
            {paymentMethodLabels[method]}
          </MenuButton>
        ))}
        <MenuButton
          danger
          disabled={cancel.isPending}
          onClick={() =>
            void confirm({
              title: 'Отменить начисление?',
              message: `${teamName}, ${formatMoney(charge.amount)}. Команде больше не нужно будет его оплачивать.`,
              confirmLabel: 'Отменить начисление',
              cancelLabel: 'Не отменять',
              danger: true,
            }).then((ok) => {
              if (ok) cancel.mutate({ chargeId: charge.id, comment: null })
            })
          }
        >
          Отменить начисление
        </MenuButton>
      </Menu>
      <ErrorText error={pay.error ?? cancel.error} />
    </>
  )
}
