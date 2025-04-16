import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { BadRequestError } from "../_errors/bad-request-error";

export async function getAllMetrics(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			"/workspaces/:slug/metrics",
			{
				schema: {
					tags: ["metrics"],
					summary: "Get all metrics",
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					response: {
						200: z.object({
							totalIncome: z.number(),
							netBalance: z.number(),
							expense: z.object({
								total: z.number(),
								percentage: z.number()
							}),
							investment: z.object({
								total: z.number(),
								percentage: z.number()
							}),
							saving: z.object({
								total: z.number(),
								percentage: z.number()
							}),
						}),
					},
				},
			},
			async (request, reply) => {
				const { slug } = request.params;

				const workspace = await prisma.workspace.findUnique({
					where: { slug }
				});

				if (!workspace) {
					throw new BadRequestError("Workspace not found.");
				}

				const userId = await request.getCurrentUserId();

				const [incomeAgg, expenseAgg, investmentAgg, savingAgg] = await Promise.all([
					prisma.transaction.aggregate({
						_sum: { amount: true },
						where: { type: "INCOME", userId, workspaceId: workspace.id },
					}),
					prisma.transaction.aggregate({
						_sum: { amount: true },
						where: { type: "EXPENSE", userId, workspaceId: workspace.id },
					}),
					prisma.transaction.aggregate({
						_sum: { amount: true },
						where: { type: "INVESTMENT", userId, workspaceId: workspace.id },
					}),
					prisma.transaction.aggregate({
						_sum: { amount: true },
						where: { type: "SAVING", userId, workspaceId: workspace.id },
					}),
				]);

				const expenseTotal = expenseAgg._sum.amount?.toNumber() ?? 0;
				const investmentTotal = investmentAgg._sum?.amount?.toNumber() ?? 0;
				const savingTotal = savingAgg._sum?.amount?.toNumber() ?? 0;
				const totalIncome = incomeAgg._sum.amount?.toNumber() ?? 0;

				const totalOutflow = expenseTotal + investmentTotal + savingTotal;

				const getPercentage = (value: number) =>
					totalOutflow > 0 ? Number(((value / totalOutflow) * 100).toFixed(2)) : 0;

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
				});
			}
		);
}
