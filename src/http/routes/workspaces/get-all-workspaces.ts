import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";

export async function getAllWorkspaces(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			"/workspaces",
			{
				schema: {
					tags: ["workspaces"],
					summary: "List all workspaces for current user",
					security: [{ bearerAuth: [] }],
					response: {
						200: z.object({
							workspaces: z.array(
								z.object({
									id: z.string(),
									name: z.string(),
									slug: z.string(),
									avatarUrl: z.string().nullable(),
									createdAt: z.date(),
									ownerId: z.string().uuid()
								}),
							),
						}),
					},
				},
			},
			async (request, reply) => {
				const userId = await request.getCurrentUserId();

				const workspaces = await prisma.workspace.findMany({
					where: {
						members: {
							some: {
								userId,
							},
						},
					},
					select: {
						id: true,
						name: true,
						createdAt: true,
						avatarUrl: true,
						slug: true,
						ownerId: true
					},
				});

				return reply.send({ workspaces });
			},
		);
}
