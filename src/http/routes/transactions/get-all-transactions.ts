import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { BadRequestError } from "../_errors/bad-request-error";

export async function getAllTransactions(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			"/workspaces/:slug/transactions",
			{
				schema: {
					tags: ["transactions"],
					summary: "List all transactions of authenticated user",
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					response: {
						200: z.object({
							transactions: z.array(
								z.object({
									id: z.string(),
									amount: z.number(),
									type: z.enum(["INCOME", "EXPENSE"]),
									date: z.string().datetime(),
									description: z.string().nullable(),
									categoryId: z.string(),
									categoryName: z.string(),
									isRecurring: z.boolean(),
									notifyUser: z.boolean(),
								}),
							),
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

				const transactions = await prisma.transaction.findMany({
					where: { userId, workspaceId: workspace.id },
					orderBy: { date: "desc" },
					include: {
						category: true,
					},
				});

				return reply.send({
					transactions: transactions.map((t) => ({
						id: t.id,
						amount: t.amount.toNumber(),
						type: t.type,
						date: t.date.toISOString(),
						description: t.description,
						categoryId: t.categoryId,
						categoryName: t.category.name,
						isRecurring: t.isRecurring,
						notifyUser: t.notifyUser,
					})),
				});
			},
		);
}
