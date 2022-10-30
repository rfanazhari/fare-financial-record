import type { Category, Prisma } from '@prisma/client'

const initalTotal = { income: 0, expense: 0, net: 0, totalNet: 0 }

export type CategoryTotalType = keyof typeof initalTotal

export type AccountTotals = Record<CategoryTotalType, number>

export type CategoryWithTotals = Category & {
  totals: AccountTotals
}

export type GroupedCategory = (Prisma.PickArray<Prisma.TransactionGroupByOutputType, ('type' | 'categoryId')[]> & {
  _sum: {
    amount: number | null
  }
})
