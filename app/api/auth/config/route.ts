import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    googleClientId: process.env.AUTH_GOOGLE_ID || "",
  });
}

