import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { listUsers } from "@/lib/users/getService";
import { createUser } from "@/lib/users/createService";
import type { CreateUserInput, UserRole } from "@/types/users";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as UserRole | undefined;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const roleFilter = (searchParams.get("role") as UserRole | null) ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  const list = await listUsers({ q, role: roleFilter, page, pageSize });
  return NextResponse.json(list);
}

// POST /api/users
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentRole = (session?.user as any)?.role as UserRole | undefined;
  if (currentRole !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as CreateUserInput | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const user = await createUser(body, currentRole);
    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Create failed" }, { status: 400 });
  }
}
