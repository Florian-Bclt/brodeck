import type { UserRole as PrismaUserRole } from "@/generated/prisma";
export type UserRole = PrismaUserRole;

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  pseudo?: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  pseudo?: string | null;
  role?: UserRole;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  pseudo?: string; 
  role: UserRole;
}

export type UserData = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  pseudo: string | null;
  role: UserRole;
}

export interface ListUsersQuery {
  q?: string;
  role?: UserRole;
  page?: number;
  pageSize?: number;
}

export type Member = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  pseudo?: string | null;
  role: UserRole;
  createdAt?: string;
};