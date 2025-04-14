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
							totalExpense: z.number(),
							netBalance: z.number(),
							totalSales: z.number(),
							paidSales: z.number(),
							unpaidSales: z.number(),
							totalCustomers: z.number(),
							customersInDebt: z.number(),
						}),
					},
				},
			},
			async (request, reply) => {
				const { slug } = request.params;

				const workspace = await prisma.workspace.findUnique({
					where: {
						slug
					}
				})

				if (!workspace) {
					throw new BadRequestError('Workspace not found.')
				}

				const userId = await request.getCurrentUserId();

				const [
					income,
					expense,
					totalSales,
					paidSales,
					unpaidSales,
					totalCustomers,
					customersInDebt,
				] = await Promise.all([
					prisma.transaction.aggregate({
						_sum: { amount: true },
						where: { type: "INCOME", userId, workspaceId: workspace.id },
					}),
					prisma.transaction.aggregate({
						_sum: { amount: true },
						where: { type: "EXPENSE", userId, workspaceId: workspace.id },
					}),
					prisma.sale.count({ where: { userId, workspaceId: workspace.id } }),
					prisma.sale.count({ where: { userId, workspaceId: workspace.id, paid: true } }),
					prisma.sale.count({ where: { userId, workspaceId: workspace.id, paid: false } }),
					prisma.customer.count({ where: { userId, workspaceId: workspace.id } }),
					prisma.customer.count({
						where: {
							userId, 
							workspaceId: workspace.id,
							sales: {
								some: { paid: false },
							},
						},
					}),
				]);

				const totalIncome = income._sum.amount?.toNumber() ?? 0;
				const totalExpense = expense._sum.amount?.toNumber() ?? 0;

				return reply.send({
					totalIncome,
					totalExpense,
					netBalance: totalIncome - totalExpense,
					totalSales,
					paidSales,
					unpaidSales,
					totalCustomers,
					customersInDebt,
				});
			},
		);
}
