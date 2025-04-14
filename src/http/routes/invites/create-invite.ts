import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { auth } from '@/http/middleware/auth'
import { prisma } from '@/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'
import { roleSchema } from '@/utils/role-schema'

export async function createInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).post(
    '/workspaces/:slug/invites',
    {
      schema: {
        tags: ['invites'],
        summary: 'Create a new workspace invite',
        security: [{ bearerAuth: [] }],
        body: z.object({
          email: z.string().email(),
          role: roleSchema,
        }),
        params: z.object({
          slug: z.string(),
        }),
        response: {
          201: z.object({ inviteId: z.string().uuid() }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params
      const userId = await request.getCurrentUserId()
      
      const { workspace, membership } = await request.getUserMembership(slug)

      if (membership.role !== 'ADMIN') {
        throw new UnauthorizedError(`You're not allowed to create new invites.`)
      }

      const { email, role } = request.body

      const inviteWithSameEmail = await prisma.invite.findUnique({
        where: {
          email_workspaceId: {
            email,
            workspaceId: workspace.id,
          },
        },
      })

      if (inviteWithSameEmail) {
        throw new BadRequestError('Another invite with same email already exists.')
      }

      const memberWithSameEmail = await prisma.member.findFirst({
        where: {
          workspaceId: workspace.id,
          user: { email },
        },
      })

      if (memberWithSameEmail) {
        throw new BadRequestError('A member with this email already belongs to your workspace.')
      }

      const invite = await prisma.invite.create({
        data: {
          workspaceId: workspace.id,
          email,
          role,
          authorId: userId,
        },
      })

      return reply.status(201).send({ inviteId: invite.id })
    }
  )
}