import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import pkg from '@prisma/client'

const { PrismaClient } = pkg
import { prisma } from '~~/server/utils/prisma'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret:  process.env.BETTER_AUTH_SECRET ?? 'change-this-secret-in-production',

  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge:  60 * 5
    }
  },

  user: {
    additionalFields: {
      roleId: {
        type:     'number',
        required: false,
        input:    false,
      }
    }
  },

  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          // ✅ Correction : "code" et non "role"
          const role = await prisma.role.findUnique({ where: { code : 'user' } })
          return {
            data: {
              ...userData,
              roleId: role?.id ?? null
            }
          }
        }
      }
    }
  },

  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
  ],
})