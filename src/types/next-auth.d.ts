import NextAuth, { DefaultSession } from "next-auth";
import { UserRole } from '@/lib/prisma-client'

declare module "next-auth" {
    interface User {
      id: string;
      email: string;
      role: UserRole;
      firstName?: string | null;
      lastName?: string | null;
      pseudo?: string | null;
    }

  interface Session extends DefaultSession {
    user: User;
  }
}

declare module "next-auth/jwt" {
    interface JWT {
      id: string;
      email: string;
      role: UserRole;
      firstName?: string | null;
      lastName?: string | null;
      pseudo?: string | null;
    }
}
