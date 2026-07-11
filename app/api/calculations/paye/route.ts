import { NextResponse } from "next/server";
import { calculatePaye } from "@/lib/tax-calculators";
import type { PayeRequest, PayeResponse } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as PayeRequest;

  if (typeof body.monthlyTaxableIncome !== "number" || body.monthlyTaxableIncome < 0) {
    return NextResponse.json({ error: "monthlyTaxableIncome must be a positive number" }, { status: 400 });
  }

  const result = calculatePaye(body.monthlyTaxableIncome);

  const response: PayeResponse = {
    monthlyTaxableIncome: result.monthlyTaxableIncome,
    paye: result.paye,
    effectiveRate: result.effectiveRate,
    ruleVersion: result.ruleVersion,
    note:
      "Based on TRA mainland monthly PAYE bands. Annual threshold TZS 3,240,000 is not taxable. This is guidance, not a final payroll opinion."
  };

  return NextResponse.json(response);
}
