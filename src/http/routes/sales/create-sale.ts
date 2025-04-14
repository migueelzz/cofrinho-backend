import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_errors/bad-request-error";

export async function createSale(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.post(
			"/workspaces/:slug/sales",
			{
				schema: {
					tags: ["sales"],
					summary: "Create new sale",
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					body: z.object({
						description: z.string().optional(),
						amount: z.coerce.number(),
						paid: z.boolean().default(false),
						dueDate: z.coerce.date().optional(),
						customerId: z.string().uuid(),
					}),
					response: {
						200: z.object({
							sale: z.object({
								id: z.string().uuid(),
								description: z.string().nullable(),
								amount: z.instanceof(Prisma.Decimal),
								paid: z.boolean(),
								createdAt: z.date(),
								updatedAt: z.date(),
								dueDate: z.date().nullable(),
								userId: z.string().uuid(),
								customerId: z.string().uuid(),
								workspaceId: z.string().uuid(),
							}),
						}),
					},
				},
			},
			async (request, reply) => {
				const { description, amount, paid, dueDate, customerId } = request.body;
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

				const sale = await prisma.sale.create({
					data: {
						description,
						amount,
						paid,
						dueDate,
						customerId,
						userId,
						workspaceId: workspace.id
					},
				});

				return reply.status(201).send({ sale });
			},
		);
}
