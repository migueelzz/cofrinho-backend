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
							querystring: z.object({
									startDate: z.string().date().optional(),
									endDate: z.string().date().optional(),
									page: z.coerce.number().min(1).default(1),
									size: z.coerce.number().min(1).max(100).default(10),
									order: z.enum(["asc", "desc"]).default("desc"),
							}),
							response: {
									200: z.object({
											items: z.array(
													z.object({
															id: z.string(),
															amount: z.number(),
															type: z.enum(["INCOME", "EXPENSE", "INVESTMENT", "SAVING"]),
															date: z.string().datetime(),
															description: z.string(),
															category: z.object({
																	id: z.string().uuid(),
																	name: z.string(),
																	emoji: z.string().nullable(),
															}),
															isRecurring: z.boolean(),
															notifyUser: z.boolean(),
													}),
											),
											meta: z.object({
												total: z.number(),
												pages: z.number(),
												page: z.number(),
												size: z.number(),
												order: z.enum(["asc", "desc"]).default("desc"),
											}),
									}),
							},
					},
			},
			async (request, reply) => {
					const { slug } = request.params;
					const { page, size, order, startDate, endDate } = request.query;

					const workspace = await prisma.workspace.findUnique({
							where: {
									slug,
							},
					});

					if (!workspace) {
							throw new BadRequestError("Workspace not found.");
					}

					const userId = await request.getCurrentUserId();

					const skip = (page - 1) * size; // Calcula o deslocamento
					const take = size; // Define o número de itens por página

					const [transactions, totalItems] = await Promise.all([
							prisma.transaction.findMany({
									where: { 
										userId, 
										workspaceId: workspace.id, 
										date: {
											gte: startDate ? new Date(startDate) : undefined,
											lte: endDate ? new Date(endDate) : undefined,
										}, 
									},
									orderBy: { date: order },
									include: {
											category: true,
									},
									skip,
									take,
							}),
							prisma.transaction.count({
									where: { 
										userId, 
										workspaceId: workspace.id, 
										date: {
											gte: startDate ? new Date(startDate) : undefined,
											lte: endDate ? new Date(endDate) : undefined,
                    }, 
									},
							}),
					]);

					const totalPages = Math.ceil(totalItems / size);

					const items = transactions.map((t) => ({
						id: t.id,
						amount: t.amount.toNumber(),
						type: t.type,
						date: t.date.toISOString(),
						description: t.description,
						category: {
								id: t.category.id,
								name: t.category.name,
								emoji: t.category.emoji,
						},
						isRecurring: t.isRecurring,
						notifyUser: t.notifyUser,
					}))

					return reply.send({
						items,
						meta: {
							page,
							size,
							total: totalItems,
							pages: totalPages,
							order,
						},
					});
			},
	);
}
