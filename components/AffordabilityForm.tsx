"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin, TrendingDown, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcMaxHomePrice, formatCurrency } from "@/lib/mortgage";

export interface Region {
  name: string;
  subName: string;
  id: string;
  type: string;
  url: string;
}

export interface FormState {
  locationQuery: string;
  suggestions: Region[];
  showSuggestions: boolean;
  selectedRegions: Region[];
  downPayment: number;
  monthlyPayment: number;
  interestRate: number;
  rateLoading: boolean;
  priceRangePct: number; // how far below max to show, e.g. 20 = within 20%
}

interface Props {
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
  onSearch: () => void;
  onRegionsChange?: (regions: Region[]) => void;
  onPriceRangeChange?: (pct: number) => void;
  loading: boolean;
  compact?: boolean;
}

export default function AffordabilityForm({ state, onChange, onSearch, onRegionsChange, onPriceRangeChange, loading, compact }: Props) {
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rateStr, setRateStr] = useState(state.interestRate.toString());

  useEffect(() => {
    fetch("/api/rate")
      .then((r) => r.json())
      .then((d) => {
        if (d.rate) {
          onChange({ interestRate: d.rate });
          setRateStr(d.rate.toString());
        }
      })
      .finally(() => onChange({ rateLoading: false }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (state.locationQuery.length < 2) {
      onChange({ suggestions: [], showSuggestions: false });
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(state.locationQuery)}`);
      const data = await res.json();
      onChange({ suggestions: data, showSuggestions: true });
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.locationQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        onChange({ showSuggestions: false });
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxPrice = calcMaxHomePrice({
    downPayment: state.downPayment,
    targetMonthly: state.monthlyPayment,
    annualRatePercent: state.interestRate,
    termYears: 30,
  });

  const numericInput = (val: number, key: keyof FormState) => ({
    value: val === 0 ? "" : val.toLocaleString("en-US"),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, "");
      onChange({ [key]: raw === "" ? 0 : parseFloat(raw) });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.selectedRegions.length > 0) onSearch();
  };

  const addRegion = (region: Region) => {
    const already = state.selectedRegions.some((r) => r.id === region.id && r.type === region.type);
    if (already) return;
    const updated = [...state.selectedRegions, region];
    onChange({ selectedRegions: updated, locationQuery: "", suggestions: [], showSuggestions: false });
    onRegionsChange?.(updated);
  };

  const removeRegion = (index: number) => {
    const updated = state.selectedRegions.filter((_, i) => i !== index);
    onChange({ selectedRegions: updated });
    onRegionsChange?.(updated);
  };

  // ── Compact sidebar variant ────────────────────────────────────────────────
  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Region chips + add more */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2 block">
            Neighborhoods
          </Label>

          {/* Chips */}
          {state.selectedRegions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {state.selectedRegions.map((region, i) => (
                <span
                  key={`${region.id}-${region.type}-${i}`}
                  className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-3 py-1 rounded-full"
                >
                  {region.name}
                  <button
                    type="button"
                    onClick={() => removeRegion(i)}
                    className="hover:text-red-900 transition-colors ml-0.5"
                    aria-label={`Remove ${region.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add more input */}
          <div className="relative" ref={suggestionsRef}>
            <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 text-red-500 w-4 h-4" />
            <input
              className="w-full pl-6 py-1.5 text-base font-medium text-gray-800 bg-transparent border-b-2 border-gray-200 focus:border-red-500 outline-none transition-colors placeholder:text-gray-300"
              placeholder={state.selectedRegions.length > 0 ? "Add another area…" : "City or neighborhood"}
              value={state.locationQuery}
              onChange={(e) => onChange({ locationQuery: e.target.value })}
              onFocus={() => state.suggestions.length > 0 && onChange({ showSuggestions: true })}
            />
            {state.showSuggestions && state.suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden">
                {state.suggestions.map((s, i) => (
                  <button
                    key={`${s.id}-${s.type}-${i}`}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-start gap-2.5 border-b last:border-0 border-gray-50 transition-colors"
                    onClick={() => addRegion(s)}
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-gray-800 block">{s.name}</span>
                      {s.subName && <span className="text-xs text-gray-400">{s.subName}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Down Payment */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2 block">
            Down Payment
          </Label>
          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">$</span>
            <input
              className="w-full pl-5 py-1.5 text-base font-medium text-gray-800 bg-transparent border-b-2 border-gray-200 focus:border-red-500 outline-none transition-colors placeholder:text-gray-300"
              placeholder="50,000"
              {...numericInput(state.downPayment, "downPayment")}
            />
          </div>
        </div>

        {/* Monthly Budget */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2 block">
            Monthly Budget
          </Label>
          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">$</span>
            <input
              className="w-full pl-5 py-1.5 text-base font-medium text-gray-800 bg-transparent border-b-2 border-gray-200 focus:border-red-500 outline-none transition-colors placeholder:text-gray-300"
              placeholder="2,500"
              {...numericInput(state.monthlyPayment, "monthlyPayment")}
            />
          </div>
        </div>

        {/* Interest Rate */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2 flex items-center gap-2">
            Interest Rate
            {state.rateLoading
              ? <span className="text-gray-300 normal-case tracking-normal font-normal">fetching…</span>
              : <span className="text-green-500 normal-case tracking-normal font-normal">live</span>
            }
          </Label>
          <div className="relative">
            <TrendingDown className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              className="w-full pl-5 pr-5 py-1.5 text-base font-medium text-gray-800 bg-transparent border-b-2 border-gray-200 focus:border-red-500 outline-none transition-colors placeholder:text-gray-300"
              placeholder="6.85"
              value={rateStr}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, "");
                setRateStr(raw);
                const parsed = parseFloat(raw);
                if (!isNaN(parsed)) onChange({ interestRate: parsed });
              }}
            />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
          </div>
        </div>

        {/* Price range */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3 block">
            Show within
          </Label>
          <div className="flex gap-2 flex-wrap">
            {[10, 15, 20, 25, 30].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => { onChange({ priceRangePct: pct }); onPriceRangeChange?.(pct); }}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  state.priceRangePct === pct
                    ? "bg-red-600 border-red-600 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600"
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Max price */}
        {state.downPayment > 0 && state.monthlyPayment > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Max home price</p>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(maxPrice)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Showing {formatCurrency(Math.round(maxPrice * (1 - state.priceRangePct / 100)))} – {formatCurrency(maxPrice)}
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={state.selectedRegions.length === 0 || !state.downPayment || !state.monthlyPayment || loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11 text-sm rounded-xl"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching…</>
            : <><Search className="w-4 h-4 mr-2" /> Update results</>
          }
        </Button>
      </form>
    );
  }

  // ── Landing full-size variant ──────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-10 space-y-7">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Find homes you can actually afford</h1>
          <p className="text-gray-500 mt-2 text-lg">
            Enter your budget — we do the mortgage math and pull real listings from Realtor.com.
          </p>
        </div>

        {/* Location */}
        <div className="relative" ref={suggestionsRef}>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">
            Where do you want to live?
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              className="pl-9 h-12 text-base"
              placeholder="City, neighborhood, or ZIP"
              value={
                state.selectedRegions.length > 0
                  ? state.selectedRegions.map((r) => r.name).join(", ")
                  : state.locationQuery
              }
              onChange={(e) => {
                onChange({ selectedRegions: [], locationQuery: e.target.value });
              }}
              onFocus={() => {
                if (state.selectedRegions.length > 0) {
                  onChange({ selectedRegions: [], locationQuery: "" });
                }
                if (state.suggestions.length > 0) onChange({ showSuggestions: true });
              }}
            />
          </div>
          {state.showSuggestions && state.suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {state.suggestions.map((s, i) => (
                <button
                  key={`${s.id}-${s.type}-${i}`}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm flex items-start gap-3 border-b last:border-0 border-gray-100 transition-colors"
                  onClick={() => onChange({ selectedRegions: [s], locationQuery: s.name, showSuggestions: false })}
                >
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-900 font-medium block">{s.name}</span>
                    {s.subName && <span className="text-gray-400 text-xs">{s.subName}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Financial inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Down Payment</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
              <Input className="pl-9 h-12 text-base" placeholder="50,000" {...numericInput(state.downPayment, "downPayment")} />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Monthly Budget</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
              <Input className="pl-9 h-12 text-base" placeholder="2,500" {...numericInput(state.monthlyPayment, "monthlyPayment")} />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">
              Interest Rate
              {state.rateLoading
                ? <span className="ml-2 text-xs text-gray-400 font-normal">fetching…</span>
                : <span className="ml-2 text-xs text-green-600 font-normal">live rate</span>
              }
            </Label>
            <div className="relative">
              <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                className="pl-9 pr-7 h-12 text-base"
                placeholder="6.85"
                value={rateStr}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "");
                  setRateStr(raw);
                  const parsed = parseFloat(raw);
                  if (!isNaN(parsed)) onChange({ interestRate: parsed });
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
        </div>

        {/* Max price */}
        {state.downPayment > 0 && state.monthlyPayment > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-500">Max home price</p>
            <p className="text-4xl font-bold text-red-600">{formatCurrency(maxPrice)}</p>
            <p className="text-xs text-gray-400 mt-1">30-year fixed · est. taxes &amp; insurance included</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={state.selectedRegions.length === 0 || !state.downPayment || !state.monthlyPayment || loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-12 text-base rounded-xl"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching…</>
            : <><Search className="w-4 h-4 mr-2" /> Show me homes in my budget</>
          }
        </Button>
      </div>
    </form>
  );
}
