import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

export async function getAllSales(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			"/workspaces/:slug/sales",
			{
				schema: {
					tags: ["sales"],
					summary: "Get all sales from a workspace",
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					response: {
						200: z.object({
							sales: z.array(
								z.object({
									id: z.string().uuid(),
									description: z.string().nullable(),
									amount: z.instanceof(Prisma.Decimal),
									paid: z.boolean(),
									createdAt: z.date(),
									updatedAt: z.date(),
									dueDate: z.date().nullable(),
									userId: z.string().uuid(),
									customerId: z.string().uuid(),
								}),
							),
						}),
					},
				},
			},
			async (request, reply) => {
				const { slug } = request.params;
				const { workspace } = await request.getUserMembership(slug);

				const sales = await prisma.sale.findMany({
					where: {
						workspaceId: workspace.id,
					},
					include: {
						customer: true,
					},
					orderBy: {
						createdAt: "desc",
					},
				});

				return reply.send({ sales });
			},
		);
}
