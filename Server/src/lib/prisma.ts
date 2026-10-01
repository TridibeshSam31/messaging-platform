import { PrismaClient } from "@prisma/client"
import { metrics } from "./metrics.js"

const createPrisma = () =>
    new PrismaClient({
        log: ["query"]
    }).$extends({
        query: {
            $allOperations: async ({ args, query }) => {
                const startTime = Date.now()

                metrics.database.queriesTotal.increment()

                try {
                    const result = await query(args)

                    metrics.database.queryDurationMs.observe(
                        Date.now() - startTime
                    )

                    return result
                } catch (error) {
                    metrics.database.queryErrorsTotal.increment()

                    metrics.database.queryDurationMs.observe(
                        Date.now() - startTime
                    )

                    throw error
                }
            }
        }
    })

const globalForPrisma = global as unknown as {
    prisma: ReturnType<typeof createPrisma> | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma
}