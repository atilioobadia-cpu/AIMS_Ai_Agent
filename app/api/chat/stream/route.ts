import { NextRequest } from "next/server";
import { retrieveSources } from "@/lib/retrieval";
import { getGeminiModelWithSystemPrompt, AIMS_SYSTEM_PROMPT } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

function looksLikeSwahili(message: string): boolean {
  const lower = message.toLowerCase();
  return /\b(nataka|nini|je|kwa|kodi|biashara|kampuni|mshahara|tarehe|malipo|lini|inalipwa|ipi|kuhusu|usajili|mlipakodi)\b/.test(
    lower
  );
}

function isHighRiskQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  return /\b(audit|objection|appeal|penalty|fine|dispute|assessment|investigation|court|tribunal|riba|adhabu|pingamizi|rufaa|ukaguzi)\b/.test(
    lower
  );
}

function buildContextBlock(
  sources: Awaited<ReturnType<typeof retrieveSources>>
): string {
  if (sources.length === 0) {
    return "No official sources were found for this question.";
  }

  return sources
    .map((source, i) => {
      const parts = [
        `[Source ${i + 1}] ${source.title}`,
        `Organization: ${source.sourceOrg}`,
        `Category: ${source.category}`,
        `Last Reviewed: ${source.lastReviewed}`,
        source.effectiveDate ? `Effective: ${source.effectiveDate}` : null,
        `URL: ${source.sourceUrl}`,
        "",
        source.summary,
      ];
      return parts.filter(Boolean).join("\n");
    })
    .join("\n\n---\n\n");
}

export async function GET() {
  return Response.json({ status: "stream endpoint ready" });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message as string;

    if (!message?.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const swahili = looksLikeSwahili(message);
    const highRisk = isHighRiskQuestion(message);

    // Step 1: Retrieve relevant sources
    const sources = await retrieveSources(message, 4);

    // Step 2: Build context for LLM
    const contextBlock = buildContextBlock(sources);
    const systemPrompt = AIMS_SYSTEM_PROMPT + contextBlock;

    // Step 3: Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const model = getGeminiModelWithSystemPrompt(systemPrompt);

          const userPrompt = highRisk
            ? `${message}\n\n[NOTE: This question appears to involve high-risk tax matters. Flag for human review in your response.]`
            : message;

          const result = await model.generateContentStream(userPrompt);

          // Send metadata first
          const metadata = {
            type: "metadata",
            confidence:
              sources.length > 0 && sources[0].score >= 10 && !highRisk
                ? "high"
                : sources.length > 0 && sources[0].score >= 5
                  ? "medium"
                  : "low",
            citations: sources.slice(0, 3).map((s) => ({
              title: s.title,
              sourceUrl: s.sourceUrl,
              sourceOrg: s.sourceOrg,
              effectiveDate: s.effectiveDate,
              lastReviewed: s.lastReviewed,
            })),
            needsHumanReview:
              highRisk ||
              (sources.length > 0 && sources[0].score < 5) ||
              sources.length === 0,
            followUps: swahili
              ? [
                  "VAT return inalipwa lini?",
                  "TIN ya biashara inahitaji nini?",
                  "PAYE ni nini?",
                ]
              : [
                  "When is a VAT return due?",
                  "What do I need for business TIN?",
                  "What is PAYE?",
                ],
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`)
          );

          // Stream text chunks
          let fullAnswer = "";
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              fullAnswer += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`)
              );
            }
          }

          // Send completion signal
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", fullAnswer })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return Response.json(
      { error: "Chat request failed" },
      { status: 500 }
    );
  }
}
