import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import prisma from "@/lib/prisma";

const providers: any[] = [];

// Only add GitHub provider if credentials are available
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    })
  );
}

// Only add Google provider if credentials are available
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

// NextAuth requires at least one provider - use a dummy one if none configured
if (providers.length === 0) {
  console.warn('[AUTH] No OAuth providers configured. Authentication will not work.');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: providers.length > 0 ? PrismaAdapter(prisma) : undefined,
  providers: providers.length > 0 ? providers : [
    // Dummy provider to prevent NextAuth from crashing
    {
      id: "credentials",
      name: "Credentials",
      type: "credentials",
      credentials: {},
      authorize: async () => null,
    } as any
  ],
  callbacks: {
    async session({ session, user }) {
      if (session?.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { tier: true },
        });
        session.user.tier = dbUser?.tier ?? "FREE";
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
