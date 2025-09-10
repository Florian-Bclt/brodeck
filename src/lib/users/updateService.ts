import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UpdateUserInput, UserRole } from "@/types/users";

async function countOtherAdmins(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      role: "ADMIN",
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

/**
 * Règles:
 * - Seul un ADMIN peut changer le rôle
 * - On empêche de retirer le dernier ADMIN (delete ou update)
 * - Email unique
 * - Password: hashé si présent
 */
export async function updateUser(
  targetUserId: string,
  data: UpdateUserInput,
  currentUserRole?: UserRole,
  currentUserId?: string
) {
  const u = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!u) throw new Error("Utilisateur introuvable.");

  // Email normalisé si fourni
  const email = data.email?.trim().toLowerCase();

  // Gestion du rôle
  let nextRole: UserRole | undefined = undefined;
  if (typeof data.role !== "undefined") {
    if (currentUserRole !== "ADMIN") {
      // non-admin ne peut pas modifier le rôle
      throw new Error("Action non autorisée.");
    }
    nextRole = data.role;

    // Empêche de retirer le dernier ADMIN
    if (u.role === "ADMIN" && nextRole !== "ADMIN") {
      const otherAdmins = await countOtherAdmins(targetUserId);
      if (otherAdmins === 0) {
        throw new Error("Impossible de retirer le dernier administrateur.");
      }
    }
  }

  // Password hash si modifié
  let hashedPassword: string | undefined;
  if (data.password) {
    if (data.password.length < 6) {
      throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
    }
    hashedPassword = await bcrypt.hash(data.password, 10);
  }

  try {
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        email: email ?? undefined,
        password: hashedPassword ?? undefined,
        firstName: data.firstName?.trim() ?? undefined,
        lastName: data.lastName?.trim() ?? undefined,
        pseudo: typeof data.pseudo === "string" ? data.pseudo.trim() : data.pseudo, // string | null | undefined
        role: nextRole ?? undefined,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true, pseudo: true,
        role: true, createdAt: true,
      },
    });
    return updated;
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new Error("Adresse e-mail déjà utilisée.");
    }
    throw err;
  }
}
