import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const prisma =
    (globalForPrisma.prisma && 'leaderboardPost' in (globalForPrisma.prisma as any))
        ? globalForPrisma.prisma
        : new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

