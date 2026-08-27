import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/vapid-public-key";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "VAPID public key no configurada." }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
