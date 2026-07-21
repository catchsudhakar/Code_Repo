import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    businessId: string;
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      businessId: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    businessId: string;
    role: UserRole;
  }
}
