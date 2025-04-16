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
			"/categories",
			{
				schema: {
					tags: ["categories"],
					summary: "Create category",
					security: [{ bearerAuth: [] }],
					body: z.object({
						emoji: z.string().optional(),
						name: z.string().min(1),
					}),
					response: {
						201: z.object({
							id: z.string().uuid(),
							emoji: z.string().nullable(),
							name: z.string(),
						}),
					},
				},
			},
			async (request, reply) => {
				const { emoji, name } = request.body;

				const category = await prisma.category.create({
					data: { emoji, name },
				});

				return reply.status(201).send(category);
			},
		);
}
