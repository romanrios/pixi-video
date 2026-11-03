import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Sesión cerrada correctamente.",
  });
  response.cookies.delete("pixi_session");
  return response;
}

