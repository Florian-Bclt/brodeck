import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { ListUsersQuery, UserData, UserRole } from "@/types/users";

export async function getUserById(id: string): Promise<UserData | null> {
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, pseudo: true,
      role: true, createdAt: true,
    },
  });
  return u ?? null;
}

export async function listUsers(params: ListUsersQuery) {
  const page = Math.max(1, Number(params.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize || 20)));
  const skip = (page - 1) * pageSize;

  const filters: Prisma.UserWhereInput = {};
  if (params.q?.trim()) {
    const q = params.q.trim();
    filters.OR = [
      { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
      { firstName: { contains: q, mode: Prisma.QueryMode.insensitive } },
      { lastName: { contains: q, mode: Prisma.QueryMode.insensitive } },
      { pseudo: { contains: q, mode: Prisma.QueryMode.insensitive } },
    ];
  }
  if (params.role) {
    filters.role = params.role as UserRole;
  }

  const [total, data] = await Promise.all([
    prisma.user.count({ where: filters }),
    prisma.user.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      skip, take: pageSize,
      select: {
        id: true, email: true, firstName: true, lastName: true, pseudo: true,
        role: true, createdAt: true,
      },
    }),
  ]);

  return { total, page, pageSize, data };
}
