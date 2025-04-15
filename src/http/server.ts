import { fastify } from "fastify";

import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie"
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

import {
	type ZodTypeProvider,
	jsonSchemaTransform,
	serializerCompiler,
	validatorCompiler,
} from "fastify-type-provider-zod";

import { env } from "@/config/env";
import { authenticateWithPassword } from "./routes/auth/authenticate-with-password";
import { createAccount } from "./routes/auth/create-account";
import { getProfile } from "./routes/auth/get-profile";
import { createCustomer } from "./routes/customers/create-customer";
import { getAllCustomers } from "./routes/customers/get-all-customers";
import { getAllMetrics } from "./routes/metrics/get-all-metrics";
import { createSale } from "./routes/sales/create-sale";
import { getAllSales } from "./routes/sales/get-all-sales";
import { createTransaction } from "./routes/transactions/create-transaction";
import { getAllTransactions } from "./routes/transactions/get-all-transactions";
import { createWorkspace } from "./routes/workspaces/create-workspace";
import { getAllWorkspaces } from "./routes/workspaces/get-all-workspaces";
import { createCategory } from "./routes/categories/create-category";
import { getAllCategories } from "./routes/categories/get-all-categories";
import { createInvite } from "./routes/invites/create-invite";
import { getInvite } from "./routes/invites/get-invite";
import { getInvites } from "./routes/invites/get-invites";
import { getPendingInvites } from "./routes/invites/get-pending-invites";
import { rejectInvite } from "./routes/invites/reject-invite";
import { revokeInvite } from "./routes/invites/revoke-invite";
import { acceptInvite } from "./routes/invites/accept-invite";
import { getMembers } from "./routes/members/get-members";
import { removeMember } from "./routes/members/remove-member";
import { updateMember } from "./routes/members/update-member";

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.register(fastifyCors, {
	origin: [
		"https://www.localizzei.com",
		"https://cofrinho-alpha.vercel.app",
		"http://localhost:3000", 
	],
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type"],
	credentials: true,
});

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

app.register(fastifySwagger, {
	openapi: {
		info: {
			title: "Expense Control - API",
			version: "1.0.0",
		},
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
		},
	},
	transform: jsonSchemaTransform,
});

app.register(fastifySwaggerUi, {
	routePrefix: "/docs",
});

app.register(fastifyCookie, {
  secret: env.JWT_SECRET,
  parseOptions: {} // opções do cookie-parser
})

app.register(fastifyJwt, {
	secret: env.JWT_SECRET,
});

// AUTH
app.register(createAccount);
app.register(authenticateWithPassword);
app.register(getProfile);

// WORKSPACES
app.register(createWorkspace);
app.register(getAllWorkspaces);

// CUSTOMERS
app.register(createCustomer);
app.register(getAllCustomers);

// TRANSACTIONS
app.register(createTransaction);
app.register(getAllTransactions);

// CATEGORIES
app.register(createCategory);
app.register(getAllCategories);

// SALES
app.register(createSale);
app.register(getAllSales);

// INVITES
app.register(createInvite);
app.register(acceptInvite);
app.register(getInvite);
app.register(getInvites);
app.register(getPendingInvites);
app.register(rejectInvite);
app.register(revokeInvite);

// MEMBERS
app.register(getMembers)
app.register(updateMember)
app.register(removeMember)

// METRICS
app.register(getAllMetrics);

app
	.listen({
		host: "0.0.0.0",
		port: env.PORT,
	})
	.then(() => console.log("🔥 HTTP server running!"));
