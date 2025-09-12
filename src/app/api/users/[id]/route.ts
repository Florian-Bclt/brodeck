import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import type { UpdateUserInput, UserRole } from "@/types/users";
import { getUserById } from "@/lib/users/getService";
import { updateUser } from "@/lib/users/updateService";
import { deleteUser } from "@/lib/users/deleteService";

export const runtime = "nodejs";

// GET /api/users/:id  (admin-only pour l’interface admin)
export async function GET(_req: NextRequest, context: any) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as UserRole | undefined;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const user = await getUserById(context.params.id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

// PATCH /api/users/:id
export async function PATCH(req: NextRequest, context: any) {
  const session = await getServerSession(authOptions);
  const currentRole = (session?.user as any)?.role as UserRole | undefined;
  const currentUserId = (session?.user as any)?.id as string | undefined;

  if (currentRole !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as UpdateUserInput | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const updated = await updateUser(context.params.id, body, currentRole, currentUserId);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 400 });
  }
}

// DELETE /api/users/:id
export async function DELETE(_req: NextRequest, context: any) {
  const session = await getServerSession(authOptions);
  const currentRole = (session?.user as any)?.role as UserRole | undefined;
  const currentUserId = (session?.user as any)?.id as string | undefined;

  if (currentRole !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const res = await deleteUser(context.params.id, currentRole, currentUserId);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Delete failed" }, { status: 400 });
  }
}
