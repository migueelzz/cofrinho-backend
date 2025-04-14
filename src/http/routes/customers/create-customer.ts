import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_errors/bad-request-error";

export async function createCustomer(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.post(
			"/workspaces/:slug/customers",
			{
				schema: {
					tags: ["customers"],
					summary: "Create new customer",
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					body: z.object({
						name: z.string(),
						email: z.string().email().optional(),
						phone: z.string().optional(),
						notes: z.string().optional(),
						birthday: z.coerce.date().optional(),
					}),
					response: {
						201: z.object({
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
					},
				},
			},
			async (request, reply) => {
				const { name, email, phone, notes, birthday } = request.body;
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

				const customer = await prisma.customer.create({
					data: {
						name,
						email,
						phone,
						notes,
						birthday,
						userId,
						workspaceId: workspace.id,
					},
				});

				return reply.status(201).send(customer);
			},
		);
}
