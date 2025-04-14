import type { FastifyInstance } from "fastify";
import { fastifyPlugin } from "fastify-plugin";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "../routes/_errors/unauthorized-error";

export const auth = fastifyPlugin(async (app: FastifyInstance) => {
  app.addHook("preHandler", async (request) => {
    request.getCurrentUserId = async () => {
      try {
        // 1. Obter o token do cookie
        const token = request.cookies.token;
        
        if (!token) {
          throw new UnauthorizedError("No auth token provided");
        }

        // 2. Verificar o JWT
        const { sub } = await app.jwt.verify<{ sub: string }>(token);

        return sub;
      } catch (error) {
        throw new UnauthorizedError("Invalid auth token");
      }
    };

    request.getUserMembership = async (slug: string) => {
      const userId = await request.getCurrentUserId();
      
      const member = await prisma.member.findFirst({
        where: {
          userId,
          workspace: {
            slug,
          },
        },
        include: {
          workspace: true,
        },
      });

      if (!member) {
        throw new UnauthorizedError(
          `You're not a member of this workspace.`
        );
      }

      const { workspace, ...membership } = member;

      return {
        workspace,
        membership,
      };
    };
  });
});