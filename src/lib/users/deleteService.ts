import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types/users";

async function countOtherAdmins(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      role: "ADMIN",
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

/**
 * Seul un ADMIN peut supprimer, et on empêche
 * la suppression du dernier ADMIN (ou de soi-même si dernier admin).
 */
export async function deleteUser(
  targetUserId: string,
  currentUserRole?: UserRole,
  currentUserId?: string
) {
  if (currentUserRole !== "ADMIN") {
    throw new Error("Action non autorisée.");
  }

  const u = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!u) throw new Error("Utilisateur introuvable.");

  if (u.role === "ADMIN") {
    const otherAdmins = await countOtherAdmins(targetUserId);
    if (otherAdmins === 0) {
      throw new Error("Impossible de supprimer le dernier administrateur.");
    }
  }

  // (facultatif) empêcher un admin de se supprimer lui-même
  if (currentUserId && currentUserId === targetUserId) {
    throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
  }

  await prisma.user.delete({ where: { id: targetUserId } });
  return { ok: true };
}
