import { NextResponse } from "next/server";
import { getRedfinRate } from "@/lib/redfin";

export async function GET() {
  const rate = await getRedfinRate();
  return NextResponse.json({ rate: rate ?? 6.85 });
}
