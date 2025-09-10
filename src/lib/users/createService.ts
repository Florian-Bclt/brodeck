import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { CreateUserInput, UserRole } from "@/types/users";

export const createUser = async (
  userData: CreateUserInput,
  currentUserRole?: UserRole
) => {
  const email = userData.email.trim().toLowerCase();
  const firstName = userData.firstName.trim();
  const lastName = userData.lastName.trim();
  const pseudo = userData.pseudo?.trim() || undefined;
  const requestedRole: UserRole | undefined = userData.role;

  // Défaut
  let finalRole: UserRole = "CLIENT";

  // Bootstrap: si 0 utilisateurs, autorise ADMIN au premier
  const usersCount = await prisma.user.count();
  const isBootstrap = usersCount === 0;

  if (requestedRole === "ADMIN") {
    if (isBootstrap) {
      finalRole = "ADMIN";
    } else if (currentUserRole === "ADMIN") {
      finalRole = "ADMIN";
    } else {
      // on log mais on ne jette pas: on dégrade en CLIENT
      console.warn(
        "[createUser] Tentative de création d'admin non autorisée: downgrade en CLIENT."
      );
      finalRole = "CLIENT";
    }
  }

  // validations minimales
  if (!email || !userData.password || !firstName || !lastName) {
    throw new Error("Champs requis manquants.");
  }
  if (userData.password.length < 6) {
    throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);

  try {
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        pseudo,
        role: finalRole, // <- plus de "STUDENT" ici
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        pseudo: true,
        role: true,
        createdAt: true,
      },
    });

    return newUser;
  } catch (err: unknown) {
    // Erreur d'unicité (email déjà pris)
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as any).code === "P2002"
    ) {
      throw new Error("Adresse e-mail déjà utilisée.");
    }

    // fallback
    const msg =
      err instanceof Error ? err.message : "Impossible de créer l'utilisateur.";
    throw new Error(msg);
  }
};
