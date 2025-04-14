import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_errors/bad-request-error";

export async function getAllCustomers(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			"/workspaces/:slug/customers",
			{
				schema: {
					tags: ["customers"],
					summary: "Get all customers",
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					response: {
						200: z.object({
							customers: z.array(
								z.object({
									id: z.string().uuid(),
									name: z.string(),
									createdAt: z.date(),
									updatedAt: z.date(),
									userId: z.string().uuid(),
									workspaceId: z.string().uuid(),
									email: z.string().email().nullable(),
									phone: z.string().nullable(),
									notes: z.string().nullable(),
									birthday: z.date().nullable(),
								}),
							),
						}),
					},
				},
			},
			async (request, reply) => {
				const userId = await request.getCurrentUserId();
				const { slug } = request.params;

				const workspace = await prisma.workspace.findUnique({
					where: {
						slug
					}
				})

				if (!workspace) {
					throw new BadRequestError('Workspace not found.')
				}

				const customers = await prisma.customer.findMany({
					where: {
						userId,
						workspaceId: workspace.id,
					},
					orderBy: { createdAt: "desc" },
				});

				return reply.send({ customers });
			},
		);
}
