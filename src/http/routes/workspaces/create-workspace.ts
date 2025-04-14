import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { createSlug } from "@/utils/create-slug";

export async function createWorkspace(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.post(
			"/workspaces",
			{
				schema: {
					tags: ["workspaces"],
					summary: "Create a new workspace",
					security: [{ bearerAuth: [] }],
					body: z.object({
						name: z.string(),
					}),
					response: {
						201: z.object({
							workspace: z.object({
								id: z.string(),
								name: z.string(),
								slug: z.string(),
								avatarUrl: z.string().nullable(),
								createdAt: z.date(),
								updatedAt: z.date(),
								ownerId: z.string(),
							}),
						}),
					},
				},
			},
			async (request, reply) => {
				const userId = await request.getCurrentUserId();
				const { name } = request.body;

				const workspace = await prisma.workspace.create({
					data: {
						name,
						slug: createSlug(name),
						ownerId: userId,
						members: {
							create: {
								userId,
								role: "ADMIN",
							},
						},
					},
				});

				return reply.status(201).send({ workspace });
			},
		);
}


