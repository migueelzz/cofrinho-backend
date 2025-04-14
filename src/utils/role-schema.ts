import z from "zod";

export const roleSchema = z.enum([
  'MEMBER',
  'ADMIN'
])