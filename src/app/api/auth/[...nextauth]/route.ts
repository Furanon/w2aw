import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import EmailProvider from "next-auth/providers/email";
import type { Adapter } from "next-auth/adapters";
import pool, { query, transaction } from "@/lib/db";
import crypto from "crypto";
// Custom PostgreSQL adapter for NextAuth
function PostgresAdapter(): Adapter {
  return {
    // Create a user
    async createUser(user) {
      const id = crypto.randomUUID();
      const { name, email, emailVerified, image } = user;
      
      const result = await query(
        `INSERT INTO users (id, name, email, email_verified, image) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, name, email, email_verified as "emailVerified", image`,
        [id, name, email, emailVerified, image]
      );
      
      return result.rows[0];
    },

    // Get a user by their email
    async getUserByEmail(email) {
      const result = await query(
        `SELECT id, name, email, email_verified as "emailVerified", image 
         FROM users 
         WHERE email = $1`,
        [email]
      );
      
      return result.rows[0] || null;
    },

    // Get a user by their ID
    async getUserByAccount({ providerAccountId, provider }) {
      const result = await query(
        `SELECT u.id, u.name, u.email, u.email_verified as "emailVerified", u.image 
         FROM users u
         JOIN accounts a ON u.id = a.user_id
         WHERE a.provider_id = $1 AND a.provider_account_id = $2`,
        [provider, providerAccountId]
      );
      
      return result.rows[0] || null;
    },

    // Update a user
    async updateUser(user) {
      const { id, name, email, emailVerified, image } = user;
      
      const result = await query(
        `UPDATE users 
         SET name = $2, email = $3, email_verified = $4, image = $5 
         WHERE id = $1 
         RETURNING id, name, email, email_verified as "emailVerified", image`,
        [id, name, email, emailVerified, image]
      );
      
      return result.rows[0];
    },

    // Get a user by their ID
    async getUser(id) {
      const result = await query(
        `SELECT id, name, email, email_verified as "emailVerified", image 
         FROM users 
         WHERE id = $1`,
        [id]
      );
      
      return result.rows[0] || null;
    },

    // Delete a user
    async deleteUser(userId) {
      await transaction(async (client) => {
        // Delete sessions first due to foreign key constraints
        await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
        // Delete accounts
        await client.query('DELETE FROM accounts WHERE user_id = $1', [userId]);
        // Delete verification requests
        await client.query('DELETE FROM verification_tokens WHERE identifier = (SELECT email FROM users WHERE id = $1)', [userId]);
        // Finally delete the user
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
      });
    },

    // Link an account to a user
    async linkAccount(account) {
      const { userId, provider, type, providerAccountId, refresh_token, access_token, expires_at, token_type, scope, id_token } = account;
      
      const result = await query(
        `INSERT INTO accounts (
          user_id, provider_id, provider_type, provider_account_id, 
          refresh_token, access_token, expires_at, token_type, scope, id_token
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING id`,
        [
          userId, provider, type, providerAccountId,
          refresh_token, access_token, expires_at, token_type, scope, id_token
        ]
      );
      
      return result.rows[0];
    },

    // Unlink an account from a user
    async unlinkAccount({ providerAccountId, provider }) {
      await query(
        `DELETE FROM accounts 
         WHERE provider_id = $1 AND provider_account_id = $2`,
        [provider, providerAccountId]
      );
    },

    // Create a session
    async createSession(session) {
      const { userId, expires, sessionToken } = session;
      
      const result = await query(
        `INSERT INTO sessions (user_id, expires, session_token) 
         VALUES ($1, $2, $3) 
         RETURNING id, session_token as "sessionToken", user_id as "userId", expires`,
        [userId, expires, sessionToken]
      );
      
      return result.rows[0];
    },

    // Get a session by its token
    async getSessionAndUser(sessionToken) {
      const result = await query(
        `SELECT 
           s.id as session_id, s.expires, s.session_token as "sessionToken", s.user_id as "userId",
           u.id, u.name, u.email, u.email_verified as "emailVerified", u.image
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_token = $1`,
        [sessionToken]
      );
      
      if (result.rows.length === 0) return null;
      
      const { session_id, expires, sessionToken: token, userId, ...user } = result.rows[0];
      
      return {
        session: { sessionToken: token, userId, expires },
        user
      };
    },

    // Update a session
    async updateSession(session) {
      const { sessionToken, userId, expires } = session;
      
      const result = await query(
        `UPDATE sessions 
         SET expires = $2, user_id = $3 
         WHERE session_token = $1 
         RETURNING id, session_token as "sessionToken", user_id as "userId", expires`,
        [sessionToken, expires, userId]
      );
      
      return result.rows[0] || null;
    },

    // Delete a session
    async deleteSession(sessionToken) {
      await query(
        `DELETE FROM sessions WHERE session_token = $1`,
        [sessionToken]
      );
    },

    // Create a verification token
    async createVerificationToken(token) {
      const { identifier, expires, token: tokenValue } = token;
      
      await query(
        `INSERT INTO verification_tokens (identifier, token, expires) 
         VALUES ($1, $2, $3)`,
        [identifier, tokenValue, expires]
      );
      
      return token;
    },

    // Use a verification token
    async useVerificationToken({ identifier, token }) {
      const result = await query(
        `DELETE FROM verification_tokens 
         WHERE identifier = $1 AND token = $2 
         RETURNING identifier, token, expires`,
        [identifier, token]
      );
      
      return result.rows[0] || null;
    }
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID as string,
      clientSecret: process.env.FACEBOOK_SECRET as string,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  adapter: PostgresAdapter(),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
