import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { expo } from '@better-auth/expo';
import { db } from '../common/db/index';
import * as authSchema from '../common/db/schema/auth.schema';

const isDev = process.env.NODE_ENV !== 'production';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema
  }),
  // Disable Better Auth's own JS-side ID generator so every table (user,
  // session, account, verification) relies on Postgres's uuid.defaultRandom()
  // instead — keeps every primary key in the schema uuid, consistent with
  // the other 21 domain tables. See auth.schema.ts for the matching column
  // definitions.
  advanced: {
    database: {
      generateId: false
    }
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google']
    }
  },
  user: {
    additionalFields: {
      societyId: {
        type: 'string',
        required: false
      },
      flatId: {
        type: 'string',
        required: false
      },
      role: {
        type: ['resident', 'security_guard', 'society_admin'],
        required: false
      },
      phone: {
        type: 'string',
        required: false
      },
      isActive: {
        type: 'boolean',
        required: false,
        defaultValue: true,
        input: false
      }
    }
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
    }
  },
  trustedOrigins: [
    'portl://',
    'portl://*',
    'portl://**',
    'exp://',
    'exp://*',
    'exp://**',
    'exp+portl-client://',
    'exp+portl-client://*',
    'exp+portl-client://**',
    ...(isDev ? ['exp://192.168.*.*:*/**', 'exp+*://*', 'exp+*://**'] : [])
  ],
  plugins: [expo()]
});
