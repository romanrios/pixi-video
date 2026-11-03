import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth.js";

export async function GET(request) {
  const user = getUserFromRequest(request);
  return NextResponse.json({ user });
}
