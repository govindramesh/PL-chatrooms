import { NextRequest, NextResponse } from "next/server";

import { clearCurrentSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await clearCurrentSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
