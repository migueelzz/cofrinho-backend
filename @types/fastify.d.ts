import "fastify";

import type { Member, Workspace } from "@prisma/client";

declare module "fastify" {
	export interface FastifyRequest {
		getCurrentUserId(): Promise<string>;
		getUserMembership(
			slug: string,
		): Promise<{ workspace: Workspace; membership: Member }>;
	}
}
