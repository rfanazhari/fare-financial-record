import { sendInternalError } from '~~/composables/api'
import { prisma } from '~~/prisma'

export default defineEventHandler((event) => {
  const { start, end } = useQuery(event) as { start: string; end: string }

  const startDate = new Date(start)
  const endDate = new Date(end)

  try {
    return prisma.ledger.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
        fromAccount: {
          include: {
            account: {
              select: {
                name: true,
                color: true,
                icon: true,
              },
            },
          },
        },
        toAccount: {
          include: {
            account: {
              select: {
                name: true,
                color: true,
                icon: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })
  } catch (err) {
    console.error(err)
    sendInternalError(event, err)
  }
})