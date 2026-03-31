export interface MortgageParams {
  homePrice: number;
  downPayment: number;
  annualRatePercent: number; // e.g. 6.85
  termYears: number;
  monthlyHOA?: number;
  taxRate?: number;      // annual %, e.g. 1.1
  insuranceRate?: number; // annual %, e.g. 0.5
  pmiRate?: number;      // annual %, e.g. 0.8
}

export interface PaymentBreakdown {
  total: number;
  principalAndInterest: number;
  propertyTax: number;
  insurance: number;
  pmi: number;
  hoa: number;
}

export function calcMonthlyPayment(params: MortgageParams): PaymentBreakdown {
  const {
    homePrice,
    downPayment,
    annualRatePercent,
    termYears,
    monthlyHOA = 0,
    taxRate = 1.1,
    insuranceRate = 0.5,
    pmiRate = 0.8,
  } = params;

  const loanAmount = Math.max(0, homePrice - downPayment);
  const monthlyRate = annualRatePercent / 100 / 12;
  const n = termYears * 12;

  let principalAndInterest = 0;
  if (loanAmount > 0 && monthlyRate > 0) {
    principalAndInterest =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n))) /
      (Math.pow(1 + monthlyRate, n) - 1);
  } else if (loanAmount > 0) {
    principalAndInterest = loanAmount / n;
  }

  const propertyTax = (homePrice * (taxRate / 100)) / 12;
  const insurance = (homePrice * (insuranceRate / 100)) / 12;
  const ltv = downPayment / homePrice;
  const pmi = ltv < 0.2 ? (loanAmount * (pmiRate / 100)) / 12 : 0;

  const total = principalAndInterest + propertyTax + insurance + pmi + monthlyHOA;

  return {
    total,
    principalAndInterest,
    propertyTax,
    insurance,
    pmi,
    hoa: monthlyHOA,
  };
}

export function calcMaxHomePrice(params: {
  downPayment: number;
  targetMonthly: number;
  annualRatePercent: number;
  termYears: number;
  monthlyHOA?: number;
  taxRate?: number;
  insuranceRate?: number;
  pmiRate?: number;
}): number {
  const { downPayment, targetMonthly, ...rest } = params;

  // Binary search: find the home price whose total monthly = targetMonthly
  let lo = downPayment;
  let hi = 10_000_000;

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const payment = calcMonthlyPayment({ homePrice: mid, downPayment, ...rest });
    if (payment.total > targetMonthly) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return Math.floor((lo + hi) / 2);
}

export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}
