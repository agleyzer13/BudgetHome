"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import ListingCard from "./ListingCard";
import { formatCurrency } from "@/lib/mortgage";
import type { RedfinListing } from "@/lib/redfin";

interface Props {
  listings: RedfinListing[];
  regionName: string;
  maxPrice: number;
  downPayment: number;
  monthlyPayment: number;
  interestRate: number;
  onBack: () => void;
}

export default function ListingsGrid({
  listings,
  regionName,
  maxPrice,
  downPayment,
  monthlyPayment,
  interestRate,
  onBack,
}: Props) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pt-2">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Adjust budget
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {listings.length} home{listings.length !== 1 ? "s" : ""} in {regionName}
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Up to {formatCurrency(maxPrice)} · ${monthlyPayment.toLocaleString()}/mo budget ·{" "}
            {interestRate}% rate · ${downPayment.toLocaleString()} down
          </p>
        </div>
        <a
          href={`https://www.redfin.com`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-600 transition-colors mt-1"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Powered by Redfin
        </a>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium mb-2">No listings found</p>
          <p className="text-sm">
            Try increasing your monthly budget, down payment, or choosing a different area.
          </p>
          <Button variant="outline" onClick={onBack} className="mt-4">
            Adjust budget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              downPayment={downPayment}
              interestRate={interestRate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
