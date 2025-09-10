import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import { UserRole } from "./prisma-client";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Vérifier si l'utilisateur existe
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.warn("Utilisateur non trouvé :", credentials.email);
          return null;
        }

        // Vérifier le mot de passe
        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!passwordMatch) {
          console.warn("Mot de passe incorrect pour :", credentials.email);
          return null;
        }

        // Retourner les infos de l'utilisateur
        return {
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
          firstName: user.firstName,
          lastName: user.lastName
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.firstName = (user as any).firstName ?? null;
        token.lastName = (user as any).lastName ?? null;
      }

      // Permettre session.update côté client si besoin
      if (trigger === "update" && session?.user) {
        token.firstName = session.user.firstName ?? token.firstName ?? null;
        token.lastName = session.user.lastName ?? token.lastName ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as UserRole;
        session.user.firstName = (token as any).firstName ?? null;
        session.user.lastName  = (token as any).lastName ?? null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : `${baseUrl}/dashboard/`;
    },
  },
  pages: {
    signIn: "/login", // Rediriger vers notre page de connexion personnalisée
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
