import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { BadRequestError } from "../_errors/bad-request-error";

export async function getMetrics(app: FastifyInstance) {
    app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
        "/workspaces/:slug/metrics",
        {
            schema: {
                tags: ["metrics"],
                summary: "Get metrics",
                security: [{ bearerAuth: [] }],
                params: z.object({
                    slug: z.string(),
                }),
                querystring: z.object({
                    startDate: z.string().date().optional(),
                    endDate: z.string().date().optional(),
                }),
                response: {
                    200: z.object({
                        totalIncome: z.number(),
                        netBalance: z.number(),
                        expense: z.object({
                            total: z.number(),
                            percentage: z.number(),
                        }),
                        investment: z.object({
                            total: z.number(),
                            percentage: z.number(),
                        }),
                        saving: z.object({
                            total: z.number(),
                            percentage: z.number(),
                        }),
                        budget: z.object({
                            total: z.number().nullable(), // Valor total do orçamento mensal
                            used: z.number(), // Total gasto
                            remaining: z.number(), // Saldo restante
                            percentageUsed: z.number(), // Porcentagem do orçamento utilizado
                        }).nullable(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const { slug } = request.params;
            const { startDate, endDate } = request.query;

            const workspace = await prisma.workspace.findUnique({
                where: { slug },
            });

            if (!workspace) {
                throw new BadRequestError("Workspace not found.");
            }

            const userId = await request.getCurrentUserId();

            let dateFilter: { gte?: Date; lt?: Date } = {};

            if (startDate) {
                dateFilter.gte = new Date(startDate);
            }
            if (endDate) {
                dateFilter.lt = new Date(endDate);
            }

            const [incomeAgg, expenseAgg, investmentAgg, savingAgg] = await Promise.all([
                prisma.transaction.aggregate({
                    _sum: { amount: true },
                    where: {
                        type: "INCOME",
                        userId,
                        workspaceId: workspace.id,
                        date: dateFilter,
                    },
                }),
                prisma.transaction.aggregate({
                    _sum: { amount: true },
                    where: {
                        type: "EXPENSE",
                        userId,
                        workspaceId: workspace.id,
                        date: dateFilter,
                    },
                }),
                prisma.transaction.aggregate({
                    _sum: { amount: true },
                    where: {
                        type: "INVESTMENT",
                        userId,
                        workspaceId: workspace.id,
                        date: dateFilter,
                    },
                }),
                prisma.transaction.aggregate({
                    _sum: { amount: true },
                    where: {
                        type: "SAVING",
                        userId,
                        workspaceId: workspace.id,
                        date: dateFilter,
                    },
                }),
            ]);

            const expenseTotal = expenseAgg._sum.amount?.toNumber() ?? 0;
            const investmentTotal = investmentAgg._sum?.amount?.toNumber() ?? 0;
            const savingTotal = savingAgg._sum?.amount?.toNumber() ?? 0;
            const totalIncome = incomeAgg._sum.amount?.toNumber() ?? 0;

            const totalOutflow = expenseTotal + investmentTotal + savingTotal;

            const getPercentage = (value: number) =>
                totalOutflow > 0 ? Number(((value / totalOutflow) * 100).toFixed(2)) : 0;

            // Calcular orçamento mensal
            const monthlyBudget = workspace.monthlyBudget?.toNumber() ?? null;
            const budget = monthlyBudget
                ? {
                      total: monthlyBudget,
                      used: expenseTotal,
                      remaining: monthlyBudget - expenseTotal,
                      percentageUsed: Number(((expenseTotal / monthlyBudget) * 100).toFixed(2)),
                  }
                : null;

            return reply.send({
                totalIncome,
                netBalance: totalIncome - totalOutflow,
                expense: {
                    total: expenseTotal,
                    percentage: getPercentage(expenseTotal),
                },
                investment: {
                    total: investmentTotal,
                    percentage: getPercentage(investmentTotal),
                },
                saving: {
                    total: savingTotal,
                    percentage: getPercentage(savingTotal),
                },
                budget,
            });
        }
    );
}