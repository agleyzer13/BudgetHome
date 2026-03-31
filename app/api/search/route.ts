import { NextRequest, NextResponse } from "next/server";
import { searchRegion } from "@/lib/redfin";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) return NextResponse.json([]);
  const results = await searchRegion(q);
  return NextResponse.json(results);
}
