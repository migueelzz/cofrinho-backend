import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { auth } from '@/http/middleware/auth'
import { prisma } from '@/lib/prisma'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function removeMember(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .delete(
      '/workspaces/:slug/members/:memberId',
      {
        schema: {
          tags: ['members'],
          summary: 'Remove member from workspace',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
            memberId: z.string().uuid(),
          }),
          response: {
            204: z.null(),
          },
        },
      },
      async (request, reply) => {
        const { slug, memberId } = request.params
        const userId = await request.getCurrentUserId()
        const { workspace, membership } = await request.getUserMembership(slug)

        const member = await prisma.member.findUnique({
          where: { id: memberId },
          select: {
            userId: true,
            workspaceId: true,
          },
        })

        if (!member || member.workspaceId !== workspace.id) {
          throw new UnauthorizedError('Member not found in this workspace.')
        }

        const isSelf = member.userId === userId
        const isAdmin = membership.role === 'ADMIN'

        if (!isSelf && !isAdmin) {
          throw new UnauthorizedError(
            'Only admins or the member themselves can remove a member.',
          )
        }

        await prisma.member.delete({
          where: {
            id: memberId,
          },
        })

        return reply.status(204).send()
      },
    )
}
