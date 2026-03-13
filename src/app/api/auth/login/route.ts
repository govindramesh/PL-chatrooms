import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSessionForUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
});

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return redirectWithError(request, "Please provide valid credentials.");
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return redirectWithError(request, "Invalid email or password.");
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return redirectWithError(request, "Invalid email or password.");
  }

  await createSessionForUser(user.id);
  return NextResponse.redirect(new URL("/home", request.url));
}
