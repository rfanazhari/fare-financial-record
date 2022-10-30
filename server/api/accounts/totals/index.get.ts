import type { TransactionType } from '@prisma/client'
import { sendInternalError, useContextUserId, useTransactionDateRange } from '~~/composables/server'
import type { AccountTotalType, GroupedAccount } from '~~/models/resources/account'
import { prisma } from '~~/prisma'

const initalTotal = () => ({ income: 0, expense: 0, net: 0, transferIn: 0, transferOut: 0, transferNet: 0, balance: 0 })

const calculateAccountTotals = (groupedAccounts: GroupedAccount[]) => {
  return groupedAccounts.reduce((totalsByAccount: Record<string, Record<AccountTotalType, number>>, curr: GroupedAccount) => {
    const isType = (type: TransactionType) => curr.type === type

    const setupInitialAccountValues = (key: string) => {
      if (!totalsByAccount[key]) {
        totalsByAccount[key] = initalTotal()
      }
    }

    const addTransaction = (key: string, type: AccountTotalType) => {
      setupInitialAccountValues(key)
      totalsByAccount[key][type] += curr._sum.amount ?? 0
    }

    if (isType('Transfer') && curr.fromAccountId && curr.toAccountId && curr.fromAccountId !== curr.toAccountId) {
      addTransaction(curr.fromAccountId, 'transferOut')
      addTransaction(curr.toAccountId, 'transferIn')
    } else if (isType('Expense') && curr.fromAccountId && !curr.toAccountId) {
      addTransaction(curr.fromAccountId, 'expense')
    } else if (isType('Income') && curr.toAccountId && !curr.fromAccountId) {
      addTransaction(curr.toAccountId, 'income')
    }

    return totalsByAccount
  }, {})
}

export default defineEventHandler(async (event) => {
  const userId = useContextUserId(event)
  const { dateQuery: date, hasDefinedRange } = useTransactionDateRange(event)

  try {
    // Group by accounts and entry types
    const groupByAccountsAllTime = await prisma.transaction.groupBy({
      by: ['fromAccountId', 'toAccountId', 'type'],
      _sum: { amount: true },
      orderBy: { fromAccountId: 'asc' },
      where: { userId },
    })

    const groupByAccountsRange = hasDefinedRange
      ? await prisma.transaction.groupBy({
        by: ['fromAccountId', 'toAccountId', 'type'],
        _sum: { amount: true },
        orderBy: { fromAccountId: 'asc' },
        where: { date, userId },
      })
      : null

    // Fetch all cash accounts - could this better be done from client and pinia store/vue query?
    const cashAccounts = await prisma.cashAccount.findMany({})

    const totalsAllTime = calculateAccountTotals(groupByAccountsAllTime)
    const totalsInRange = groupByAccountsRange ? calculateAccountTotals(groupByAccountsRange) : null

    const isForRange = hasDefinedRange && totalsInRange

    // Totals for all time - net, expenses, income, transfer net, balance
    return cashAccounts.map((account) => {
      const hadTransactionsAllTime = account.id in totalsAllTime
      const hasTransactionInRange = isForRange && account.id in totalsInRange

      if ((isForRange && !hasTransactionInRange) || !hadTransactionsAllTime) {
        return {
          ...account,
          totals: initalTotal(),
        }
      }

      const allTimeAccountTotals = totalsAllTime[account.id]

      const totalNet = allTimeAccountTotals.income - allTimeAccountTotals.expense
      const totalTransferNet = allTimeAccountTotals.transferIn - allTimeAccountTotals.transferOut
      // All time balance could be wrong
      const totalBalance = totalNet + totalTransferNet

      const totals = isForRange
        ? {
            ...totalsInRange[account.id],
            net: totalsInRange[account.id].income - totalsInRange[account.id].expense,
            transferNet: totalsInRange[account.id].transferIn - totalsInRange[account.id].transferOut,
            balance: totalBalance,
          }
        : {
            ...allTimeAccountTotals,
            net: totalNet,
            transferNet: totalTransferNet,
            balance: totalBalance,
          }

      return {
        ...account,
        totals,
      }
    })
  } catch (err) {
    console.error(err)
    sendInternalError(event, err)
  }
})

