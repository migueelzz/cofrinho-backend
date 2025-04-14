import { auth } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_errors/bad-request-error";

export async function createTransaction(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.post(
			"/workspaces/:slug/transactions",
			{
				schema: {
					tags: ["transactions"],
					summary: "Create new transaction",
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					body: z.object({
						amount: z.number().positive(),
						type: z.enum(["INCOME", "EXPENSE"]),
						categoryId: z.string().uuid(),
						date: z.coerce.date(),
						description: z.string().optional(),
						isRecurring: z.boolean().default(false),
						recurrence: z
							.object({
								frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
								interval: z.number().int().min(1).default(1),
								nextOccurrence: z.coerce.date(),
							})
							.optional(),
						notifyUser: z.boolean().default(false),
					}),
					response: {
						201: z.object({
							id: z.string().uuid(),
							amount: z.instanceof(Prisma.Decimal),
							type: z.enum(["INCOME", "EXPENSE"]),
							categoryId: z.string().uuid(),
							date: z.date(),
							description: z.string().nullable(),
							isRecurring: z.boolean(),
							recurrenceId: z.string().uuid().nullable(),
							workspaceId: z.string().uuid(),
							userId: z.string().uuid(),
							notifyUser: z.boolean(),
						}),
					},
				},
			},
			async (request, reply) => {
				const {
					amount,
					type,
					categoryId,
					date,
					description,
					isRecurring,
					recurrence,
					notifyUser,
				} = request.body;

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

				let recurrenceId: string | undefined;

				if (isRecurring && recurrence) {
					const newRule = await prisma.recurrenceRule.create({
						data: {
							frequency: recurrence.frequency,
							interval: recurrence.interval,
							nextOccurrence: recurrence.nextOccurrence,
						},
					});
					recurrenceId = newRule.id;
				}

				const transaction = await prisma.transaction.create({
					data: {
						amount,
						type,
						categoryId,
						date,
						description,
						isRecurring,
						recurrenceId,
						workspaceId: workspace.id,
						userId,
						notifyUser,
					},
				});

				return reply.status(201).send(transaction);
			},
		);
}
