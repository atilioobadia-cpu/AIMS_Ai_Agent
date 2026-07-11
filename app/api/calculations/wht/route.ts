import { NextResponse } from "next/server";
import { calculateWht, WHT_RATES, type WhtCategory } from "@/lib/tax-calculators";
import type { WhtRequest, WhtResponse } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as WhtRequest;

  if (typeof body.amount !== "number" || body.amount < 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  if (!body.category || !(body.category in WHT_RATES)) {
    return NextResponse.json({ error: "Invalid WHT category" }, { status: 400 });
  }

  const result = calculateWht(body.amount, body.category as WhtCategory);

  const response: WhtResponse = {
    amount: result.amount,
    category: result.category,
    label: result.label,
    rate: result.rate,
    wht: result.wht,
    netPayable: result.netPayable,
    ruleVersion: result.ruleVersion,
    note: "Common TRA WHT categories for quick estimates. Confirm the exact category before filing."
  };

  return NextResponse.json(response);
}

export async function GET() {
  return NextResponse.json({
    categories: Object.entries(WHT_RATES).map(([id, value]) => ({
      id,
      label: value.label,
      rate: value.rate
    }))
  });
}
