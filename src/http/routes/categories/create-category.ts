import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_errors/bad-request-error";

export async function createCategory(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.post(
			"/workspaces/:slug/transactions/categories",
			{
				schema: {
					tags: ["transactions"],
					summary: "Create transaction category",
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					body: z.object({
						name: z.string().min(1),
					}),
					response: {
						201: z.object({
							id: z.string().uuid(),
							name: z.string(),
						}),
					},
				},
			},
			async (request, reply) => {
				const { name } = request.body;
				const { slug } = request.params;

				const workspace = await prisma.workspace.findUnique({
					where: {
						slug
					}
				})

				if (!workspace) {
					throw new BadRequestError('Workspace not found.')
				}

				const category = await prisma.category.create({
					data: { name, workspaceId: workspace.id },
				});

				return reply.status(201).send(category);
			},
		);
}
