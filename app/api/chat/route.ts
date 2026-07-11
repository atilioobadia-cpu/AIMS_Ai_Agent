import { NextResponse } from "next/server";
import { buildChatResponse } from "@/lib/retrieval";
import type { ChatRequest } from "@/lib/types";

const THINKING_DELAY_MS = 1200;

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  await delay(THINKING_DELAY_MS);
  const response = await buildChatResponse(body.message);

  return NextResponse.json(response);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
