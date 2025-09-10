import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/users/createService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserRole = session?.user?.role;

    const body = await req.json();
    const newUser = await createUser(body, currentUserRole);

    return NextResponse.json({ user: newUser, message: "Utilisateur créé avec succès" }, { status: 201 });
  } catch (error: unknown) {
    let errorMessage = 'Une ereure est survenue'

    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}