"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useConversationStore } from "@/lib/store";
import type {
  ChatResponse,
  PayeResponse,
  SdlResponse,
  StoredDocument,
  VatResponse,
  WhtResponse,
} from "@/lib/types";

const starterPrompts = [
  { icon: " ", text: "VAT return inalipwa lini?" },
  { icon: " ", text: "TIN ya biashara inahitaji documents gani?" },
  { icon: " ", text: "PAYE ni nini kwa employer?" },
  { icon: " ", text: "Final return ya kampuni ni lini?" },
  { icon: " ", text: "How does withholding tax work?" },
  { icon: " ", text: "SDL applies to companies with how many employees?" },
];

const calculatorPrompts = [
  { icon: " ", text: "Calculate PAYE for TZS 600,000 monthly income", type: "paye" as const },
  { icon: " ", text: "What is 18% VAT on TZS 1,000,000?", type: "vat" as const },
  { icon: " ", text: "Calculate SDL for TZS 5,000,000 payroll with 12 employees", type: "sdl" as const },
  { icon: " ", text: "Calculate WHT on TZS 2,000,000 management fee", type: "wht" as const },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"chat" | "documents">("chat");
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  const {
    activeConversationId,
    getActiveConversation,
    createConversation,
    setActiveConversation,
    addMessage,
    deleteConversation,
    getSortedConversations,
  } = useConversationStore();

  const activeConversation = getActiveConversation();
  const sortedConversations = getSortedConversations();

  // Fix hydration: only render after client mount
  useEffect(() => {
    setMounted(true);
    // Start collapsed on mobile
    if (window.innerWidth <= 900) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      void loadDocuments();
    }
  }, [mounted]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [activeConversation?.messages, isSending]);

  async function loadDocuments() {
    try {
      const response = await fetch("/api/documents");
      const data = (await response.json()) as { documents: StoredDocument[] };
      setDocuments(data.documents ?? []);
    } catch {
      /* silent */
    }
  }

  function handleNewChat() {
    createConversation();
    setView("chat");
  }

  function detectCalculatorRequest(text: string): { type: string; params: Record<string, number | string> } | null {
    const lower = text.toLowerCase();

    // PAYE detection
    if (/\b(paye|income\s*tax|pay\s*as\s*you\s*earn)\b/i.test(text)) {
      const numMatch = text.match(/[\d,]+/);
      const amount = numMatch ? parseInt(numMatch[0].replace(/,/g, ""), 10) : 600000;
      return { type: "paye", params: { monthlyTaxableIncome: amount } };
    }

    // VAT detection
    if (/\b(vat|value\s*added\s*tax|ongezeko)\b/i.test(text)) {
      const numMatch = text.match(/[\d,]+/);
      const amount = numMatch ? parseInt(numMatch[0].replace(/,/g, ""), 10) : 1000000;
      return { type: "vat", params: { amount, mode: "exclusive" } };
    }

    // SDL detection
    if (/\b(sdl|skills\s*development)\b/i.test(text)) {
      const numbers = text.match(/[\d,]+/g) || [];
      const payroll = numbers[0] ? parseInt(numbers[0].replace(/,/g, ""), 10) : 5000000;
      const employees = numbers[1] ? parseInt(numbers[1], 10) : 12;
      return { type: "sdl", params: { totalGrossEmoluments: payroll, employeeCount: employees } };
    }

    // WHT detection
    if (/\b(wht|withholding)\b/i.test(text)) {
      const numMatch = text.match(/[\d,]+/);
      const amount = numMatch ? parseInt(numMatch[0].replace(/,/g, ""), 10) : 1000000;
      return { type: "wht", params: { amount, category: "management-resident" } };
    }

    return null;
  }

  async function runCalculator(type: string, params: Record<string, number | string>) {
    const endpoints: Record<string, string> = {
      paye: "/api/calculations/paye",
      vat: "/api/calculations/vat",
      sdl: "/api/calculations/sdl",
      wht: "/api/calculations/wht",
    };

    const res = await fetch(endpoints[type], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    return await res.json();
  }

  async function handleSend(text?: string) {
    const messageText = (text ?? input).trim();
    if (!messageText || isSending) return;

    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation();
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: messageText,
      timestamp: Date.now(),
    };

    addMessage(convId, userMessage);
    setInput("");
    setIsSending(true);

    // Check if this is a calculator request
    const calcRequest = detectCalculatorRequest(messageText);

    if (calcRequest) {
      try {
        const calcResult = await runCalculator(calcRequest.type, calcRequest.params);
        const calcResponse = formatCalculatorResult(calcRequest.type, calcResult);

        const assistantMessage = {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          content: calcResponse,
          response: {
            answer: calcResponse,
            confidence: "high" as const,
            citations: [],
            retrievedSources: [],
            needsHumanReview: false,
            followUps: [
              "Calculate PAYE for another amount",
              "What is the SDL threshold?",
              "Explain WHT categories",
            ],
          },
          timestamp: Date.now(),
        };
        addMessage(convId, assistantMessage);
      } catch (error) {
        const errorMessage = {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          content: error instanceof Error ? `Calculation error: ${error.message}` : "Calculation failed",
          timestamp: Date.now(),
        };
        addMessage(convId, errorMessage);
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Regular AI chat with streaming
    const assistantId = crypto.randomUUID();
    const assistantMessage = {
      id: assistantId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
    };
    addMessage(convId, assistantMessage);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error("error" in errorData ? errorData.error : "Chat request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullAnswer = "";
      let metadata: ChatResponse | null = null;
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          let parsed: Record<string, unknown> | null = null;
          try {
            parsed = JSON.parse(line.slice(6)) as Record<string, unknown>;
          } catch {
            /* skip malformed JSON lines */
          }
          if (!parsed) continue;

          if (parsed.type === "error") {
            streamError = String(parsed.error ?? "Unknown stream error");
            break;
          }

          if (parsed.type === "metadata") {
            metadata = {
              answer: "",
              confidence: parsed.confidence as ChatResponse["confidence"],
              citations: parsed.citations as ChatResponse["citations"],
              retrievedSources: [],
              needsHumanReview: Boolean(parsed.needsHumanReview),
              followUps: parsed.followUps as string[],
            };
          } else if (parsed.type === "chunk") {
            fullAnswer += parsed.text;
            updateStreamingMessage(convId, assistantId, fullAnswer);
          } else if (parsed.type === "done") {
            fullAnswer = (String(parsed.fullAnswer)) || fullAnswer;
          }
        }

        if (streamError) break;
      }

      if (streamError) {
        throw new Error(streamError);
      }

      if (metadata) {
        metadata.answer = fullAnswer;
        updateMessageWithResponse(convId, assistantId, fullAnswer, metadata);
      }
    } catch (error) {
      updateStreamingMessage(
        convId,
        assistantId,
        error instanceof Error ? `Nimeshindwa kupata jibu: ${error.message}` : "Nimeshindwa kupata jibu."
      );
    } finally {
      setIsSending(false);
    }
  }

  function updateStreamingMessage(conversationId: string, messageId: string, content: string) {
    useConversationStore.setState((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => (m.id === messageId ? { ...m, content } : m)),
          updatedAt: Date.now(),
        };
      }),
    }));
  }

  function updateMessageWithResponse(
    conversationId: string,
    messageId: string,
    content: string,
    response: ChatResponse
  ) {
    useConversationStore.setState((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => (m.id === messageId ? { ...m, content, response } : m)),
          updatedAt: Date.now(),
        };
      }),
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSend();
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString("en-TZ", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDateGroup(ts: number) {
    const now = new Date();
    const d = new Date(ts);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString("en-TZ", { weekday: "long" });
    return d.toLocaleDateString("en-TZ", { month: "short", day: "numeric" });
  }

  function groupConversations() {
    const groups: { label: string; items: typeof sortedConversations }[] = [];
    let currentLabel = "";
    for (const conv of sortedConversations) {
      const label = formatDateGroup(conv.updatedAt);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [] });
      }
      groups[groups.length - 1].items.push(conv);
    }
    return groups;
  }

  // Don't render until client-mounted (fixes hydration)
  if (!mounted) {
    return (
      <div className="appShell">
        <div className="mainArea">
          <div className="chatView">
            <div className="chatEmpty">
              <div className="emptyLogo">
                <img src="/aims-logo.png" alt="AIMS" className="emptyLogoImg" />
              </div>
              <h2>Loading AIMS...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="appShell">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`} aria-label="Navigation">
        <div className="sidebarTop">
          <div className="brand">
            <img src="/aims-logo.png" alt="AIMS" className="brandMarkImg" />
            <div className="brandText">
              <strong>AIMS</strong>
              <span>AI Tax Agent</span>
            </div>
          </div>
          <button
            className="iconBtn collapseBtn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            type="button"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <button className="newChatBtn" onClick={handleNewChat} type="button">
          <span>+</span> New chat
        </button>

        <nav className="sidebarNav">
          <button
            className={`navItem ${view === "chat" ? "active" : ""}`}
            onClick={() => setView("chat")}
            type="button"
          >
            <span className="navIcon"> </span> Chats
          </button>
          <button
            className={`navItem ${view === "documents" ? "active" : ""}`}
            onClick={() => setView("documents")}
            type="button"
          >
            <span className="navIcon"> </span> Legal Docs
          </button>
        </nav>

        {view === "chat" && (
          <div className="chatHistory">
            {groupConversations().map((group) => (
              <div className="chatGroup" key={group.label}>
                <div className="chatGroupLabel">{group.label}</div>
                {group.items.map((conv) => (
                  <div
                    className={`chatHistoryItem ${conv.id === activeConversationId ? "active" : ""}`}
                    key={conv.id}
                    onClick={() => {
                      setActiveConversation(conv.id);
                      setView("chat");
                    }}
                  >
                    <span className="chatHistoryTitle">{conv.title}</span>
                    <span className="chatHistoryCount">{conv.messages.length}</span>
                    <button
                      className="chatHistoryDelete"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this chat?")) deleteConversation(conv.id);
                      }}
                      title="Delete"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ))}
            {sortedConversations.length === 0 && (
              <div className="chatHistoryEmpty">
                No conversations yet.
                <br />
                Start a new chat above.
              </div>
            )}
          </div>
        )}

        <div className="sidebarFooter">
          <div className="sidebarDisclaimer">
            Official TRA/PDPC sources + uploaded PDFs. Answers are source-grounded and marked for human review when confidence is low.
          </div>
        </div>
      </aside>

      {/* Mobile sidebar toggle */}
      {!sidebarOpen && (
        <button
          className="mobileSidebarBtn"
          onClick={() => setSidebarOpen(true)}
          type="button"
        >
          ☰
        </button>
      )}

      {/* Main Content */}
      <section className="mainArea">
        {view === "chat" && (
          <ChatView
            conversation={activeConversation}
            isSending={isSending}
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            onSend={handleSend}
            onNewChat={handleNewChat}
            transcriptRef={transcriptRef}
            formatTime={formatTime}
          />
        )}
        {view === "documents" && (
          <DocumentsView documents={documents} onRefresh={loadDocuments} />
        )}
      </section>
    </div>
  );
}

/* ─── Chat View ─── */

function ChatView({
  conversation,
  isSending,
  input,
  setInput,
  onSubmit,
  onSend,
  onNewChat,
  transcriptRef,
  formatTime,
}: {
  conversation: ReturnType<typeof useConversationStore.getState>["getActiveConversation"] extends () => infer R ? R : never;
  isSending: boolean;
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onSend: (text?: string) => void;
  onNewChat: () => void;
  transcriptRef: React.RefObject<HTMLDivElement | null>;
  formatTime: (ts: number) => string;
}) {
  const messages = conversation?.messages ?? [];
  const hasMessages = messages.length > 0;

  return (
    <div className="chatView">
      {/* Persistent header */}
      <div className="chatHeader">
        <div className="chatHeaderBrand">
          <img src="/aims-logo.png" alt="AIMS" className="chatHeaderLogo" />
          <span className="chatHeaderName">AIMS</span>
          <span className="chatHeaderSub">Tanzania Tax &amp; Accounting AI</span>
        </div>
        {hasMessages && (
          <button className="chatHeaderNew" onClick={onNewChat} type="button">
            + New chat
          </button>
        )}
      </div>

      {hasMessages ? (
        /* ─── Active conversation ─── */
        <div className="chatTranscript" ref={transcriptRef}>
          <div className="messageStack">
            {messages.map((msg) => (
              <article
                className={`message ${msg.role === "user" ? "userMessage" : "assistantMessage"}`}
                key={msg.id}
              >
                <div className="messageAvatar">
                  {msg.role === "user" ? (
                    <span className="avatarIcon avatarUser">U</span>
                  ) : (
                    <span className="avatarIcon avatarAI">A</span>
                  )}
                  <span className="avatarLabel">{msg.role === "user" ? "You" : "AIMS"}</span>
                </div>
                <div className="messageBody">{msg.content}</div>
                {msg.response && <ResponseMeta response={msg.response} onSend={onSend} />}
                <div className="messageTime">{formatTime(msg.timestamp)}</div>
              </article>
            ))}
            {isSending && (
              <article className="message assistantMessage">
                <div className="messageAvatar">
                  <span className="avatarIcon avatarAI">A</span>
                  <span className="avatarLabel">AIMS</span>
                </div>
                <div className="thinkingRow">
                  <div className="thinkingDots" aria-hidden="true">
                    <span /><span /><span />
                  </div>
                  <span>AIMS inafikiri na kutafuta source rasmi...</span>
                </div>
              </article>
            )}
          </div>
        </div>
      ) : (
        /* ─── Empty state / welcome ─── */
        <div className="chatEmpty">
          <div className="emptyLogo">
            <img src="/aims-logo.png" alt="AIMS" className="emptyLogoImg" />
          </div>
          <h2>Naweza kukusaidiaje leo?</h2>
          <p className="emptySubtext">
            Ask about VAT, TIN, PAYE, SDL, corporation tax, compliance, or ERPNext.
            <br />
            I use official TRA and PDPC sources only.
          </p>

          <div className="promptSection">
            <div className="promptSectionLabel">Tax &amp; Compliance</div>
            <div className="promptGrid">
              {starterPrompts.map((prompt) => (
                <button
                  className="promptChip"
                  disabled={isSending}
                  key={prompt.text}
                  onClick={() => void onSend(prompt.text)}
                  type="button"
                >
                  <span className="promptIcon">{prompt.icon}</span>
                  {prompt.text}
                </button>
              ))}
            </div>
          </div>

          <div className="promptSection">
            <div className="promptSectionLabel">Quick Calculations</div>
            <div className="promptGrid">
              {calculatorPrompts.map((prompt) => (
                <button
                  className="promptChip calcChip"
                  disabled={isSending}
                  key={prompt.text}
                  onClick={() => void onSend(prompt.text)}
                  type="button"
                >
                  <span className="promptIcon">{prompt.icon}</span>
                  {prompt.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Composer - always at bottom */}
      <div className="composerWrap">
        <form className="composer" onSubmit={onSubmit}>
          <textarea
            aria-label="Ask AIMS"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Uliza kuhusu VAT, TIN, PAYE, SDL... au omba hesabu"
            rows={1}
            value={input}
          />
          <div className="composerActions">
            <button
              aria-label="Send"
              className="sendButton"
              disabled={isSending || !input.trim()}
              type="submit"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </form>
        <div className="composerDisclaimer">
          AIMS can make mistakes. Verify important information with official TRA sources.
        </div>
      </div>
    </div>
  );
}

/* ─── Response Meta ─── */

function ResponseMeta({ response, onSend }: { response: ChatResponse; onSend: (text?: string) => void }) {
  return (
    <div className="responseMeta">
      <div className="responseFlags">
        <span className={`confidence confidence-${response.confidence}`}>
          {response.confidence}
        </span>
        {response.needsHumanReview && <span className="reviewFlag">⚠ Review</span>}
      </div>

      {response.citations.length > 0 && (
        <div className="citationList">
          {response.citations.map((citation) => (
            <a
              href={citation.sourceUrl.startsWith("upload://") ? "#" : citation.sourceUrl}
              key={`${citation.title}-${citation.sourceUrl}`}
              rel="noreferrer"
              target={citation.sourceUrl.startsWith("upload://") ? undefined : "_blank"}
            >
              <span className="citationOrg">{citation.sourceOrg}:</span> {citation.title}
            </a>
          ))}
        </div>
      )}

      {response.followUps.length > 0 && (
        <div className="followUps">
          {response.followUps.slice(0, 3).map((item) => (
            <button className="followUpChip" key={item} onClick={() => void onSend(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Calculator Result Formatter ─── */

function formatCalculatorResult(type: string, result: Record<string, unknown>): string {
  const fmt = (v: unknown) => new Intl.NumberFormat("en-TZ").format(Number(v));

  switch (type) {
    case "paye":
      return `  **PAYE Calculation Result**

**Monthly Taxable Income:** TZS ${fmt(result.monthlyTaxableIncome)}
**PAYE:** TZS ${fmt(result.paye)}
**Effective Rate:** ${(Number(result.effectiveRate) * 100).toFixed(2)}%

  Rule: ${result.ruleVersion}
  Note: Based on TRA mainland monthly PAYE bands. Annual threshold TZS 3,240,000 is not taxable.

  Want me to explain how PAYE bands work, or calculate for a different amount?`;

    case "vat":
      return `  **VAT Calculation Result**

**Amount:** TZS ${fmt(result.amount)}
**VAT (18%):** TZS ${fmt(result.vatAmount)}
**Net:** TZS ${fmt(result.net)}
**Total:** TZS ${fmt(result.total)}

  Rule: ${result.ruleVersion}

  Do you need to calculate VAT for a different amount, or want to know about VAT returns?`;

    case "sdl": {
      const applicable = result.applicable ? "Yes" : "No";
      return `  **SDL Calculation Result**

**Total Gross Emoluments:** TZS ${fmt(result.totalGrossEmoluments)}
**Employee Count:** ${result.employeeCount}
**SDL Applicable:** ${applicable}
**SDL Amount:** TZS ${fmt(result.sdl)}
**Rate:** ${(Number(result.rate) * 100).toFixed(1)}%

  ${result.note}

  Need help with other payroll calculations?`;
    }

    case "wht":
      return `  **WHT Calculation Result**

**Payment Amount:** TZS ${fmt(result.amount)}
**Category:** ${result.label}
**Rate:** ${(Number(result.rate) * 100).toFixed(0)}%
**WHT:** TZS ${fmt(result.wht)}
**Net Payable:** TZS ${fmt(result.netPayable)}

  Do you need to calculate WHT for a different category or amount?`;

    default:
      return JSON.stringify(result, null, 2);
  }
}

/* ─── Documents View ─── */

function DocumentsView({
  documents,
  onRefresh,
}: {
  documents: StoredDocument[];
  onRefresh: () => void;
}) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadTags, setUploadTags] = useState("legal, tra, tax");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!uploadFile || isUploading) return;

    setIsUploading(true);
    setUploadStatus("Inachambua PDF na kuongeza kwenye knowledge base...");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);
      formData.append("tags", uploadTags);

      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = (await res.json()) as { message?: string; error?: string; entriesCreated?: number };

      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setUploadStatus(`${data.message ?? "Uploaded"} (${data.entriesCreated ?? 0} chunks indexed).`);
      setUploadFile(null);
      setUploadTitle("");
      await onRefresh();
    } catch (err) {
      setUploadStatus(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove(id: string) {
    await fetch(`/api/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await onRefresh();
  }

  return (
    <div className="panelView">
      <div className="viewHeader">
        <h1>  Legal Documents</h1>
        <p>Pakia PDF za TRA, Finance Act, regulations, na legal docs nyingine.</p>
      </div>

      <article className="panelCard uploadCard">
        <form onSubmit={handleUpload}>
          <div className="uploadZone">
            <p>Drag & drop au chagua PDF</p>
            <label className="uploadLabel" htmlFor="pdf-upload">+ Chagua PDF</label>
            <input accept="application/pdf,.pdf" id="pdf-upload" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} type="file" />
            {uploadFile && <span className="uploadFileName">{uploadFile.name}</span>}
          </div>

          <div className="fieldGrid" style={{ marginTop: 16 }}>
            <label>
              Document title (optional)
              <input onChange={(e) => setUploadTitle(e.target.value)} placeholder="Finance Act 2026" value={uploadTitle} />
            </label>
            <label>
              Tags (comma separated)
              <input onChange={(e) => setUploadTags(e.target.value)} value={uploadTags} />
            </label>
          </div>

          <button className="primaryButton" disabled={!uploadFile || isUploading} type="submit">
            {isUploading ? "Inapakia..." : "Upload & Index PDF"}
          </button>

          {uploadStatus && <div className="resultBox">{uploadStatus}</div>}
        </form>

        <div className="documentList">
          {documents.length === 0 ? (
            <div className="resultBox">Hakuna documents bado.</div>
          ) : (
            documents.map((doc) => (
              <div className="documentRow" key={doc.id}>
                <div>
                  <strong>{doc.title}</strong>
                  <span>{doc.fileName}</span>
                  <small>
                    {doc.pageCount ? `${doc.pageCount} pages · ` : ""}
                    {fmt(doc.charCount)} chars ·{" "}
                    <span className={doc.status === "approved" ? "statusApproved" : "statusFailed"}>
                      {doc.status}
                    </span>
                  </small>
                </div>
                <button className="dangerButton" onClick={() => void handleRemove(doc.id)} type="button">
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </article>
    </div>
  );
}

function fmt(value: number) {
  return new Intl.NumberFormat("en-TZ").format(value);
}
