"use client";

import { useState, useCallback } from "react";
import AffordabilityForm, { type FormState, type Region } from "@/components/AffordabilityForm";
import ListingCard from "@/components/ListingCard";
import { calcMaxHomePrice, formatCurrency } from "@/lib/mortgage";
import { ExternalLink, Loader2 } from "lucide-react";
import type { RedfinListing } from "@/lib/redfin";

const DEFAULT_FORM: FormState = {
  locationQuery: "",
  suggestions: [],
  showSuggestions: false,
  selectedRegions: [],
  downPayment: 50000,
  monthlyPayment: 2500,
  interestRate: 6.85,
  rateLoading: true,
  priceRangePct: 20,
};

type AppState = "landing" | "results";

export default function Page() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [appState, setAppState] = useState<AppState>("landing");
  const [listings, setListings] = useState<RedfinListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchForm = useCallback((patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const maxPrice = calcMaxHomePrice({
    downPayment: form.downPayment,
    targetMonthly: form.monthlyPayment,
    annualRatePercent: form.interestRate,
    termYears: 30,
  });

  const fetchListings = useCallback(async (regions: Region[], price: number, pct: number) => {
    if (regions.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const minPrice = Math.round(price * (1 - pct / 100));
      // Fetch all regions in parallel
      const results = await Promise.all(
        regions.map((region) => {
          const params = new URLSearchParams({
            regionId: region.id,
            regionType: region.type,
            maxPrice: price.toString(),
            minPrice: minPrice.toString(),
          });
          return fetch(`/api/listings?${params}`).then((r) => r.ok ? r.json() as Promise<RedfinListing[]> : []);
        })
      );

      // Merge, deduplicate by id, sort by price
      const seen = new Set<string>();
      const merged = results
        .flat()
        .filter((l) => {
          if (seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        })
        .sort((a, b) => a.price - b.price);

      setListings(merged);
      setAppState("results");
    } catch {
      setError("Couldn't load listings — please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    fetchListings(form.selectedRegions, maxPrice, form.priceRangePct);
  }, [form.selectedRegions, maxPrice, form.priceRangePct, fetchListings]);

  const regionLabel = form.selectedRegions.map((r) => r.name).join(", ");

  // ── Landing ────────────────────────────────────────────────────────────────
  if (appState === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        <Nav onHome={() => { setListings([]); setAppState("landing"); }} sidebarOffset />
        <div className="flex-1 flex items-center justify-center py-16 px-4">
          <AffordabilityForm state={form} onChange={patchForm} onSearch={handleSearch} loading={loading} />
        </div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Nav onHome={() => { setListings([]); setForm(DEFAULT_FORM); setAppState("landing"); }} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 bg-white border-r border-gray-200 p-5 overflow-y-auto">
          <AffordabilityForm
            state={form}
            onChange={patchForm}
            onSearch={handleSearch}
            onRegionsChange={(regions) => fetchListings(regions, maxPrice, form.priceRangePct)}
            onPriceRangeChange={(pct) => fetchListings(form.selectedRegions, maxPrice, pct)}
            loading={loading}
            compact
          />
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              {loading ? (
                <p className="text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                </p>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900">
                    {listings.length} home{listings.length !== 1 ? "s" : ""} found
                    {regionLabel && <span className="font-normal text-gray-500"> in {regionLabel}</span>}
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Up to {formatCurrency(maxPrice)} · ${form.monthlyPayment.toLocaleString()}/mo · {form.interestRate}% · ${form.downPayment.toLocaleString()} down
                  </p>
                </>
              )}
            </div>
            <a
              href="https://www.realtor.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-1"
            >
              <ExternalLink className="w-3 h-3" /> Powered by Realtor.com
            </a>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {!loading && listings.length === 0 && (
            <div className="text-center py-24 text-gray-400">
              <p className="text-lg font-medium mb-1">No listings found</p>
              <p className="text-sm">Try increasing your budget or adding more areas.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing, i) => (
              <ListingCard
                key={`${listing.id}-${i}`}
                listing={listing}
                downPayment={form.downPayment}
                interestRate={form.interestRate}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function Nav({ onHome, sidebarOffset }: { onHome?: () => void; sidebarOffset?: boolean }) {
  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 shrink-0 sticky top-0 z-30">
      <div className="flex items-center">
        {sidebarOffset && <div className="w-80 shrink-0" />}
        <button onClick={onHome} className="flex items-center gap-3 group">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 group-hover:scale-110 transition-transform" />
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400 group-hover:scale-110 transition-transform delay-[25ms]" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 group-hover:scale-110 transition-transform delay-[50ms]" />
          </div>
          <span className="font-bold text-gray-900 text-base tracking-tight">BudgetHome</span>
        </button>
      </div>
    </nav>
  );
}
