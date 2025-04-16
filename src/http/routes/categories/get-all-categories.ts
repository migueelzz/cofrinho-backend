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
			"/categories",
			{
				schema: {
					tags: ["categories"],
					summary: "Get all categories",
					security: [{ bearerAuth: [] }],
					response: {
						200: z.object({
							categories: z.array(
								z.object({
									id: z.string().uuid(),
									emoji: z.string().nullable(),
									name: z.string(),
								}),
							),
						}),
					},
				},
			},
			async (request, reply) => {
				const categories = await prisma.category.findMany({
					orderBy: { name: "asc" },
				});

				return reply.send({ categories });
			},
		);
}
