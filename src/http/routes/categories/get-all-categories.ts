import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_errors/bad-request-error";

export async function getAllCategories(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			"/workspaces/:slug/transactions/categories",
			{
				schema: {
					tags: ["transactions"],
					summary: "Get all transaction categories",
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					response: {
						200: z.object({
							categories: z.array(
								z.object({
									id: z.string().uuid(),
									name: z.string(),
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

				const categories = await prisma.category.findMany({
					where: {
						workspaceId: workspace.id,
					},
					orderBy: { name: "asc" },
				});

				return reply.send({ categories });
			},
		);
}
