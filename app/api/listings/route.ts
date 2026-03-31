import { NextRequest, NextResponse } from "next/server";
import { getListings } from "@/lib/redfin";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const regionId = p.get("regionId");
  const regionType = p.get("regionType");
  const maxPrice = Number(p.get("maxPrice"));

  if (!regionId || !regionType || !maxPrice) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const listings = await getListings({
    regionId,
    regionType,
    maxPrice,
    minPrice: p.get("minPrice") ? Number(p.get("minPrice")) : undefined,
    minBeds: p.get("minBeds") ? Number(p.get("minBeds")) : undefined,
    minBaths: p.get("minBaths") ? Number(p.get("minBaths")) : undefined,
    pageSize: 40,
  });

  return NextResponse.json(listings);
}
