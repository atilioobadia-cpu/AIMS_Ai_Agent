import { NextRequest } from "next/server";
import { retrieveSources } from "@/lib/retrieval";
import { getGeminiModelWithSystemPrompt, AIMS_SYSTEM_PROMPT } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 30;

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

function extractCitations(
  sources: Awaited<ReturnType<typeof retrieveSources>>
) {
  return sources.slice(0, 3).map((s) => ({
    title: s.title,
    sourceUrl: s.sourceUrl,
    sourceOrg: s.sourceOrg,
    effectiveDate: s.effectiveDate,
    lastReviewed: s.lastReviewed,
  }));
}

function detectFollowUps(
  answer: string,
  swahili: boolean
): string[] {
  if (swahili) {
    return [
      "VAT return inalipwa lini?",
      "TIN ya biashara inahitaji nini?",
      "PAYE ni nini?",
    ];
  }
  return [
    "When is a VAT return due?",
    "What do I need for business TIN?",
    "What is PAYE?",
  ];
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

    // Step 3: Call Gemini with streaming
    const model = getGeminiModelWithSystemPrompt(systemPrompt);

    const userPrompt = highRisk
      ? `${message}\n\n[NOTE: This question appears to involve high-risk tax matters. Flag for human review in your response.]`
      : message;

    const result = await model.generateContentStream(userPrompt);

    // Step 4: Collect the full response
    let fullAnswer = "";
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullAnswer += text;
      }
    }

    // Step 5: Determine confidence
    const confidence =
      sources.length > 0 && sources[0].score >= 10 && !highRisk
        ? "high"
        : sources.length > 0 && sources[0].score >= 5
          ? "medium"
          : "low";

    const needsHumanReview =
      highRisk || confidence === "low" || sources.length === 0;

    // Step 6: Build response
    const response = {
      answer: fullAnswer,
      confidence,
      citations: extractCitations(sources),
      retrievedSources: sources,
      needsHumanReview,
      followUps: detectFollowUps(fullAnswer, swahili),
    };

    return Response.json(response);
  } catch (error) {
    console.error("Chat error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check if it's an API key issue
    if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("api key")) {
      return Response.json(
        {
          error:
            "Gemini API key is invalid. Please set your free API key in .env.local. Get one at: https://aistudio.google.com/apikey",
        },
        { status: 401 }
      );
    }

    return Response.json(
      { error: `Chat request failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
