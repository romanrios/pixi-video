import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth.js";

export async function GET(request) {
  const user = await getUserFromRequest(request);
  return NextResponse.json({ user });
}
