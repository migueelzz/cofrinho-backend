import { auth } from "@/http/middleware/auth"
import { prisma } from "@/lib/prisma"
import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import z from "zod"
import { BadRequestError } from "../_errors/bad-request-error"
import { UnauthorizedError } from "../_errors/unauthorized-error"

export async function revokeInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).delete(
    '/workspaces/:slug/invites/:inviteId',
    {
      schema: {
        tags: ['invites'],
        summary: 'Revoke a workspace invite',
        security: [{ bearerAuth: [] }],
        params: z.object({
          slug: z.string(),
          inviteId: z.string().uuid(),
        }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      const { slug, inviteId } = request.params
      const userId = await request.getCurrentUserId()
      const { workspace, membership } = await request.getUserMembership(slug)

      if (membership.role !== 'ADMIN') {
        throw new UnauthorizedError(`You're not allowed to delete an invite.`)
      }

      const invite = await prisma.invite.findUnique({
        where: {
          id: inviteId,
          workspaceId: workspace.id,
        },
      })

      if (!invite) throw new BadRequestError('Invite not found.')

      await prisma.invite.delete({ where: { id: inviteId } })

      return reply.code(204).send()
    }
  )
}