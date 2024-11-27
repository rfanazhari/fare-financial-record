import type { MaybeRef } from '@vueuse/core'

export const sum = (...args: number[]): number => args.reduce((a, b) => a + b, 0)

export const formatPercentage = (value: number, options?: MaybeRef<Intl.NumberFormatOptions>) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(value)
}

export const formatCurrency = (value: number, options?: MaybeRef<Intl.NumberFormatOptions>) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  })?.format(value)
}
