"use client";

import Image from "next/image";
import { ExternalLink, Bed, Bath, Maximize2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calcMonthlyPayment, formatCurrency } from "@/lib/mortgage";
import type { RedfinListing } from "@/lib/redfin";

interface Props {
  listing: RedfinListing;
  downPayment: number;
  interestRate: number;
}

export default function ListingCard({ listing, downPayment, interestRate }: Props) {
  const breakdown = calcMonthlyPayment({
    homePrice: listing.price,
    downPayment,
    annualRatePercent: interestRate,
    termYears: 30,
    monthlyHOA: listing.hoa,
  });

  const handleClick = () => {
    window.open(listing.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={handleClick}
      className="group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
    >
      {/* Photo */}
      <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
        {listing.photoUrl ? (
          <Image
            src={listing.photoUrl}
            alt={listing.address}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Maximize2 className="w-10 h-10" />
          </div>
        )}
        {listing.daysOnMarket !== null && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-white/90 text-gray-700 text-xs font-medium shadow-sm">
              <Clock className="w-3 h-3 mr-1" />
              {listing.daysOnMarket === 0 ? "New" : `${listing.daysOnMarket}d`}
            </Badge>
          </div>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/90 rounded-full p-1.5 shadow-sm">
            <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(listing.price)}
          </span>
          {listing.hoa > 0 && (
            <span className="text-xs text-gray-400">+${listing.hoa}/mo HOA</span>
          )}
        </div>

        {/* Address */}
        <p className="text-sm font-medium text-gray-700 truncate">{listing.address}</p>
        <p className="text-xs text-gray-400 mb-3">
          {listing.city}, {listing.state} {listing.zip}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
          <span className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5" /> {listing.beds} bd
          </span>
          <span className="text-gray-200">|</span>
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" /> {listing.baths} ba
          </span>
          {listing.sqft && (
            <>
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5" />
                {listing.sqft.toLocaleString()} sqft
              </span>
            </>
          )}
        </div>

        {/* Monthly payment breakdown */}
        <div className="bg-red-50 rounded-lg px-3 py-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">Est. monthly payment</span>
            <span className="text-base font-bold text-red-600">
              ${Math.round(breakdown.total).toLocaleString()}/mo
            </span>
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-gray-400">
              P&amp;I ${Math.round(breakdown.principalAndInterest).toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] text-gray-400">
              Tax ${Math.round(breakdown.propertyTax).toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] text-gray-400">
              Ins ${Math.round(breakdown.insurance).toLocaleString()}
            </span>
            {breakdown.pmi > 0 && (
              <>
                <span className="text-[10px] text-gray-300">·</span>
                <span className="text-[10px] text-orange-500">
                  PMI ${Math.round(breakdown.pmi).toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
