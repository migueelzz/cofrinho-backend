import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { auth } from '@/http/middleware/auth'
import { prisma } from '@/lib/prisma'
import { UnauthorizedError } from '../_errors/unauthorized-error'
import { roleSchema } from '@/utils/role-schema'

export async function updateMember(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .patch(
      '/workspaces/:slug/members/:memberId',
      {
        schema: {
          tags: ['members'],
          summary: 'Update member role in workspace',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
            memberId: z.string().uuid(),
          }),
          body: z.object({
            role: roleSchema,
          }),
          response: {
            204: z.null(),
          },
        },
      },
      async (request, reply) => {
        const { slug, memberId } = request.params
        const { role } = request.body

        const userId = await request.getCurrentUserId()
        const { workspace, membership } = await request.getUserMembership(slug)

        if (membership.role !== 'ADMIN') {
          throw new UnauthorizedError(
            'Only workspace admins can update member roles.',
          )
        }

        const member = await prisma.member.findUnique({
          where: { id: memberId },
        })

        if (!member || member.workspaceId !== workspace.id) {
          throw new UnauthorizedError('Member not found in this workspace.')
        }

        await prisma.member.update({
          where: {
            id: memberId,
          },
          data: {
            role,
          },
        })

        return reply.status(204).send()
      },
    )
}
