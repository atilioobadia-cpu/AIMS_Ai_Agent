export type PayeBand = {
  from: number;
  to: number | null;
  baseTax: number;
  rate: number;
};

export const PAYE_BANDS_MAINLAND: PayeBand[] = [
  { from: 0, to: 270_000, baseTax: 0, rate: 0 },
  { from: 270_001, to: 520_000, baseTax: 0, rate: 0.08 },
  { from: 520_001, to: 760_000, baseTax: 20_000, rate: 0.2 },
  { from: 760_001, to: 1_000_000, baseTax: 68_000, rate: 0.25 },
  { from: 1_000_001, to: null, baseTax: 128_000, rate: 0.3 }
];

export const PAYE_RULE_VERSION = "TRA-MAINLAND-2025-2026";
export const VAT_RULE_VERSION = "TRA-VAT-18PCT-MAINLAND";
export const SDL_RULE_VERSION = "TRA-SDL-3.5PCT-2023";
export const WHT_RULE_VERSION = "TRA-WHT-COMMON-RATES";

export type WhtCategory =
  | "dividends-resident"
  | "dividends-non-resident"
  | "interest"
  | "royalties"
  | "management-resident"
  | "management-non-resident"
  | "rent-resident";

export const WHT_RATES: Record<WhtCategory, { rate: number; label: string }> = {
  "dividends-resident": { rate: 0.05, label: "Dividends (resident)" },
  "dividends-non-resident": { rate: 0.1, label: "Dividends (non-resident)" },
  interest: { rate: 0.15, label: "Interest" },
  royalties: { rate: 0.15, label: "Royalties" },
  "management-resident": { rate: 0.05, label: "Management/consultancy (resident)" },
  "management-non-resident": { rate: 0.15, label: "Management/consultancy (non-resident)" },
  "rent-resident": { rate: 0.1, label: "Rent (resident landlord)" }
};

export function calculatePaye(monthlyTaxableIncome: number) {
  if (monthlyTaxableIncome <= 0) {
    return {
      monthlyTaxableIncome: 0,
      paye: 0,
      effectiveRate: 0,
      band: PAYE_BANDS_MAINLAND[0],
      ruleVersion: PAYE_RULE_VERSION
    };
  }

  const band =
    PAYE_BANDS_MAINLAND.find((item) => {
      if (item.to === null) return monthlyTaxableIncome >= item.from;
      return monthlyTaxableIncome >= item.from && monthlyTaxableIncome <= item.to;
    }) ?? PAYE_BANDS_MAINLAND[PAYE_BANDS_MAINLAND.length - 1];

  const excess = monthlyTaxableIncome - band.from + (band.from === 0 ? 0 : 1);
  const paye = band.baseTax + Math.max(0, excess) * band.rate;

  return {
    monthlyTaxableIncome,
    paye: roundCurrency(paye),
    effectiveRate: monthlyTaxableIncome > 0 ? roundCurrency(paye / monthlyTaxableIncome) : 0,
    band,
    ruleVersion: PAYE_RULE_VERSION
  };
}

export function calculateVat(amount: number, mode: "exclusive" | "inclusive" = "exclusive") {
  const rate = 0.18;

  if (amount <= 0) {
    return {
      amount: 0,
      vatAmount: 0,
      total: 0,
      net: 0,
      rate,
      ruleVersion: VAT_RULE_VERSION
    };
  }

  if (mode === "inclusive") {
    const net = amount / (1 + rate);
    const vatAmount = amount - net;
    return {
      amount,
      vatAmount: roundCurrency(vatAmount),
      total: roundCurrency(amount),
      net: roundCurrency(net),
      rate,
      ruleVersion: VAT_RULE_VERSION
    };
  }

  const vatAmount = amount * rate;
  return {
    amount,
    vatAmount: roundCurrency(vatAmount),
    total: roundCurrency(amount + vatAmount),
    net: roundCurrency(amount),
    rate,
    ruleVersion: VAT_RULE_VERSION
  };
}

export function calculateSdl(totalGrossEmoluments: number, employeeCount: number) {
  const rate = 0.035;
  const applicable = employeeCount >= 10;

  return {
    totalGrossEmoluments,
    employeeCount,
    applicable,
    sdl: applicable ? roundCurrency(totalGrossEmoluments * rate) : 0,
    rate,
    ruleVersion: SDL_RULE_VERSION,
    note: applicable
      ? "SDL applies because employer has 10 or more employees."
      : "SDL does not apply when employer has fewer than 10 employees."
  };
}

export function calculateWht(amount: number, category: WhtCategory) {
  const config = WHT_RATES[category];
  const wht = amount * config.rate;

  return {
    amount,
    category,
    label: config.label,
    rate: config.rate,
    wht: roundCurrency(wht),
    netPayable: roundCurrency(amount - wht),
    ruleVersion: WHT_RULE_VERSION
  };
}

function roundCurrency(value: number) {
  return Math.round(value);
}
