import { ChatMessageType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRoom, isFixtureExpired } from "@/lib/chat";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  body: z.string().trim().min(1).max(500),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { fixture: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (!canUserAccessRoom(room, user.favoriteTeamId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isFixtureExpired(room.fixture)) {
    return NextResponse.json({ expired: true, messages: [] }, { status: 410 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 250,
  });

  return NextResponse.json({ expired: false, messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { fixture: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (!canUserAccessRoom(room, user.favoriteTeamId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isFixtureExpired(room.fixture)) {
    return NextResponse.json({ error: "Chat expired" }, { status: 410 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Message is empty or too long." }, { status: 400 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      roomId,
      userId: user.id,
      messageType: ChatMessageType.USER,
      body: parsed.data.body,
    },
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  return NextResponse.json({ message });
}
