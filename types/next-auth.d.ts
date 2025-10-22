import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tier: "FREE" | "PRO" | "ENTERPRISE";
    } & DefaultSession["user"];
  }
}
