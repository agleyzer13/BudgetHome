export interface RedfinListing {
  id: string;
  url: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number | null;
  photoUrl: string | null;
  lat: number;
  lng: number;
  daysOnMarket: number | null;
  propertyType: string;
  hoa: number;
}

export interface RedfinRegion {
  name: string;
  subName: string;
  id: string;   // city name for RapidAPI
  type: string; // state code for RapidAPI
  url: string;
}

// ---------------------------------------------------------------------------
// Location autocomplete — uses Redfin (browser-side via our proxy)
// Falls back to a simple city/state parse if blocked
// ---------------------------------------------------------------------------

const RF_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.redfin.com/",
};

function stripPrefix(text: string): string {
  return text.replace(/^\{\}&&/, "");
}

export async function searchRegion(query: string): Promise<RedfinRegion[]> {
  // Use RapidAPI location autocomplete
  try {
    const key = process.env.RAPIDAPI_KEY;
    if (key && key !== "your_key_here") {
      const url = `https://${RAPIDAPI_HOST}/locations/v2/auto-complete?input=${encodeURIComponent(query)}&limit=10`;
      const res = await fetch(url, {
        headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": RAPIDAPI_HOST },
        next: { revalidate: 0 },
      });
      if (res.ok) {
        const data = await res.json();
        const items: any[] = data?.autocomplete ?? [];
        const seen = new Set<string>();
        const results: RedfinRegion[] = items
          .filter((r) => r?.state_code && (r?.city || r?.neighborhood))
          .reduce<RedfinRegion[]>((acc, r) => {
            const uid = r._id ?? r.slug_id ?? `${r.city}-${r.state_code}-${r.area_type}`;
            if (seen.has(uid)) return acc;
            seen.add(uid);

            const isNeighborhood = r.area_type === "neighborhood" && r.neighborhood;
            const displayName = isNeighborhood
              ? `${r.neighborhood}, ${r.city}, ${r.state_code}`
              : `${r.city}, ${r.state_code}`;
            const subName = isNeighborhood
              ? `Neighborhood in ${r.city}, ${r.state_code}`
              : r.counties?.[0]?.name
              ? `${r.counties[0].name} County, ${r.state_code}`
              : r.state_code;

            acc.push({
              name: displayName,
              subName,
              id: r.city,          // always the city for the listings API
              type: r.state_code,
              url: "",
            });
            return acc;
          }, []);
        if (results.length > 0) return results;
      }
    }
  } catch {
    // fall through
  }

  // Fallback: parse "City, ST" typed directly
  return guessRegions(query);
}

// Parse city/state from free-text and return suggestions for RapidAPI
function guessRegions(query: string): RedfinRegion[] {
  const q = query.trim();
  const match = q.match(/^(.+?),?\s*([A-Z]{2})$/i);
  if (match) {
    const city = match[1].trim();
    const state = match[2].toUpperCase();
    return [{
      name: `${city}, ${state}`,
      subName: `${state}`,
      id: city,
      type: state,
      url: "",
    }];
  }
  // Return the query as a city guess with common states
  const states = ["CA", "TX", "FL", "NY", "WA", "CO", "AZ", "GA"];
  return states.slice(0, 3).map((st) => ({
    name: `${q}, ${st}`,
    subName: st,
    id: q,
    type: st,
    url: "",
  }));
}

// ---------------------------------------------------------------------------
// Listings — RapidAPI "Realty in US"
// ---------------------------------------------------------------------------

const RAPIDAPI_HOST = "realty-in-us.p.rapidapi.com";

function rapidHeaders() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key || key === "your_key_here") throw new Error("RAPIDAPI_KEY not set");
  return {
    "X-RapidAPI-Key": key,
    "X-RapidAPI-Host": RAPIDAPI_HOST,
    "Content-Type": "application/json",
  };
}

export async function getListings(params: {
  regionId: string;   // city name
  regionType: string; // state code e.g. "CA"
  maxPrice: number;
  minPrice?: number;
  minBeds?: number;
  minBaths?: number;
  pageSize?: number;
}): Promise<RedfinListing[]> {
  const { regionId: city, regionType: stateCode, maxPrice, minPrice, minBeds, minBaths, pageSize = 42 } = params;

  const body: Record<string, any> = {
    limit: pageSize,
    offset: 0,
    city,
    state_code: stateCode,
    sort: { direction: "desc", field: "list_date" },
    list_price: { min: minPrice ?? Math.round(maxPrice * 0.8), max: maxPrice },
    status: ["for_sale"],
  };
  if (minBeds) body.beds = { min: minBeds };
  if (minBaths) body.baths = { min: minBaths };

  const res = await fetch(`https://${RAPIDAPI_HOST}/properties/v3/list`, {
    method: "POST",
    headers: rapidHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("RapidAPI listings error:", res.status, text);
    return [];
  }

  const data = await res.json();
  const results: any[] = data?.data?.home_search?.results ?? [];

  const seenIds = new Set<string>();

  return results
    .filter((r) => r?.list_price)
    .reduce<RedfinListing[]>((acc, r) => {
      const id = r.property_id ?? r.listing_id;
      if (id && seenIds.has(id)) return acc;
      if (id) seenIds.add(id);
      acc.push(mapListing(r, city, stateCode));
      return acc;
    }, []);
}

function mapListing(r: any, city: string, stateCode: string): RedfinListing {
  const loc = r.location?.address ?? {};
  const desc = r.description ?? {};
  const photoUrl = upgradePhotoUrl(r.primary_photo?.href ?? null);
  const url = buildRealtorUrl(r.property_id, loc);

  return {
    id: r.property_id ?? r.listing_id ?? String(Math.random()),
    url,
    price: r.list_price ?? 0,
    address: loc.line ?? "",
    city: loc.city ?? city,
    state: loc.state_code ?? stateCode,
    zip: loc.postal_code ?? "",
    beds: desc.beds ?? 0,
    baths: desc.baths ?? 0,
    sqft: desc.sqft ?? null,
    photoUrl,
    lat: loc.coordinate?.lat ?? 0,
    lng: loc.coordinate?.lon ?? 0,
    daysOnMarket: r.list_date ? daysSince(r.list_date) : null,
    propertyType: desc.type ?? "",
    hoa: r.hoa?.fee ?? 0,
  };
}

// Swap thumbnail suffix (s/m/l) for original quality (od)
function upgradePhotoUrl(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/([a-z0-9]+)(s|m|l)(\.jpe?g)$/i, "$1od$3");
}

// Realtor.com URL format: /realestateandhomes-detail/123-Main-St_City_ST_12345_M12345678-90
function buildRealtorUrl(propertyId: string | null, loc: any): string {
  if (!propertyId) return "https://www.realtor.com/homes-for-sale";
  const slug = [loc.line, loc.city, loc.state_code, loc.postal_code]
    .filter(Boolean)
    .join("_")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  const id = propertyId.replace(/[^0-9]/g, "");
  const mPart = id.length >= 10 ? `M${id.slice(0, -2)}-${id.slice(-2)}` : `M${id}`;
  return `https://www.realtor.com/realestateandhomes-detail/${slug}_${mPart}`;
}

function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

// ---------------------------------------------------------------------------
// Mortgage rate — FRED API (free, no key needed)
// ---------------------------------------------------------------------------

export async function getRedfinRate(): Promise<number | null> {
  try {
    // FRED series: 30-year fixed mortgage rate (weekly)
    const url =
      "https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&sort_order=desc&limit=1&file_type=json&api_key=b5791eff5c1bcb89f8ff9fd91b8f7f97";
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    const val = data?.observations?.[0]?.value;
    return val ? parseFloat(val) : null;
  } catch {
    return null;
  }
}
