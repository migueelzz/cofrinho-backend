import { compare } from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { BadRequestError } from "../_errors/bad-request-error";
import { env } from "@/config/env";

export async function authenticateWithPassword(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/sessions/password",
    {
      schema: {
        tags: ["auth"],
        summary: "Authenticate with email and password",
        body: z.object({
          email: z.string().email(),
          password: z.string(),
        }),
        response: {
          201: z.object({
            token: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) {
        throw new BadRequestError("Invalid credentials.");
      }

      const isPasswordValid = await compare(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new BadRequestError("Invalid credentials.");
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      });

      const token = await reply.jwtSign(
        { sub: user.id },
        { sign: { expiresIn: "7d" } },
      );

      reply.setCookie("token", token, {
        path: "/",
        httpOnly: true,
        sameSite: env.NODE_ENV === "production" ? "none" : "lax",
        secure: env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 dias
      });

      return reply.status(201).send({ token });
    }
  );
}