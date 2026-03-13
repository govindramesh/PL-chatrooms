import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSessionForUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  username: z.string().trim().min(3).max(24),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  favoriteTeamId: z.coerce.number().int().nonnegative(),
});

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL("/signup", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const parsed = signupSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    favoriteTeamId: formData.get("favoriteTeamId"),
  });

  if (!parsed.success) {
    return redirectWithError(request, "Please fill all fields correctly.");
  }

  const { username, email, password, favoriteTeamId } = parsed.data;

  if (favoriteTeamId === 0) {
    await prisma.team.upsert({
      where: { id: 0 },
      update: { name: "Neutral", shortName: "NEU" },
      create: { id: 0, name: "Neutral", shortName: "NEU" },
    });
  }

  const team = await prisma.team.findUnique({ where: { id: favoriteTeamId } });
  if (!team) {
    return redirectWithError(request, "Selected team does not exist.");
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existing) {
    return redirectWithError(request, "Email or username already in use.");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      favoriteTeamId,
    },
  });

  await createSessionForUser(user.id);

  return NextResponse.redirect(new URL("/home", request.url));
}
