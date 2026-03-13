"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function toggleFollowFixture(formData: FormData) {
  const user = await requireUser();
  const fixtureId = String(formData.get("fixtureId") ?? "");

  if (!fixtureId) {
    return;
  }

  const existing = await prisma.userFixtureFollow.findUnique({
    where: {
      userId_fixtureId: {
        userId: user.id,
        fixtureId,
      },
    },
  });

  if (existing) {
    await prisma.userFixtureFollow.delete({
      where: {
        userId_fixtureId: {
          userId: user.id,
          fixtureId,
        },
      },
    });
  } else {
    await prisma.userFixtureFollow.create({
      data: {
        userId: user.id,
        fixtureId,
      },
    });
  }

  revalidatePath("/home");
  revalidatePath("/explore");
}
