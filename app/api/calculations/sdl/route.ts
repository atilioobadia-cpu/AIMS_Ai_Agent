import { NextResponse } from "next/server";
import { calculateSdl } from "@/lib/tax-calculators";
import type { SdlRequest, SdlResponse } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as SdlRequest;

  if (typeof body.totalGrossEmoluments !== "number" || body.totalGrossEmoluments < 0) {
    return NextResponse.json({ error: "totalGrossEmoluments must be a positive number" }, { status: 400 });
  }

  if (typeof body.employeeCount !== "number" || body.employeeCount < 0) {
    return NextResponse.json({ error: "employeeCount must be zero or more" }, { status: 400 });
  }

  const result = calculateSdl(body.totalGrossEmoluments, body.employeeCount);

  const response: SdlResponse = {
    totalGrossEmoluments: result.totalGrossEmoluments,
    employeeCount: result.employeeCount,
    applicable: result.applicable,
    sdl: result.sdl,
    rate: result.rate,
    ruleVersion: result.ruleVersion,
    note: result.note
  };

  return NextResponse.json(response);
}
