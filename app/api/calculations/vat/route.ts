import { NextResponse } from "next/server";
import { calculateVat } from "@/lib/tax-calculators";
import type { VatRequest, VatResponse } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as VatRequest;

  if (typeof body.amount !== "number" || body.amount < 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const mode = body.mode === "inclusive" ? "inclusive" : "exclusive";
  const result = calculateVat(body.amount, mode);

  const response: VatResponse = {
    amount: result.amount,
    vatAmount: result.vatAmount,
    total: result.total,
    net: result.net,
    rate: result.rate,
    mode,
    ruleVersion: result.ruleVersion,
    note: "Standard VAT rate for mainland taxable supplies is 18%."
  };

  return NextResponse.json(response);
}
