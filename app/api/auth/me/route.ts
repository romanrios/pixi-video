import { NextResponse, type NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  return NextResponse.json({ user });
}
