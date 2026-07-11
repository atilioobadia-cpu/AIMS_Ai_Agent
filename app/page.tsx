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

export default function Home() {
  const [view, setView] = useState<"chat" | "calculator" | "documents">("chat");
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    activeConversationId,
    getActiveConversation,
    createConversation,
    setActiveConversation,
    addMessage,
    updateLastAssistantMessage,
    deleteConversation,
    renameConversation,
    getSortedConversations,
  } = useConversationStore();

  const activeConversation = getActiveConversation();
  const sortedConversations = getSortedConversations();

  useEffect(() => {
    void loadDocuments();
  }, []);

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

    // Add placeholder for streaming response
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
        throw new Error(
          "error" in errorData ? errorData.error : "Chat request failed"
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullAnswer = "";
      let metadata: ChatResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "metadata") {
              metadata = {
                answer: "",
                confidence: data.confidence,
                citations: data.citations,
                retrievedSources: [],
                needsHumanReview: data.needsHumanReview,
                followUps: data.followUps,
              };
            } else if (data.type === "chunk") {
              fullAnswer += data.text;
              // Update the assistant message with streaming content
              updateStreamingMessage(convId, assistantId, fullAnswer);
            } else if (data.type === "done") {
              fullAnswer = data.fullAnswer || fullAnswer;
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Finalize the message with metadata
      if (metadata) {
        metadata.answer = fullAnswer;
        updateMessageWithResponse(convId, assistantId, fullAnswer, metadata);
      }
    } catch (error) {
      updateStreamingMessage(
        convId,
        assistantId,
        error instanceof Error
          ? `Nimeshindwa kupata jibu sasa hivi: ${error.message}`
          : "Nimeshindwa kupata jibu sasa hivi."
      );
    } finally {
      setIsSending(false);
    }
  }

  function updateStreamingMessage(
    conversationId: string,
    messageId: string,
    content: string
  ) {
    useConversationStore.setState((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, content } : m
          ),
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
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, content, response } : m
          ),
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
    return new Date(ts).toLocaleTimeString("en-TZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateGroup(ts: number) {
    const now = new Date();
    const d = new Date(ts);
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
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

  return (
    <div className="appShell">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`} aria-label="Navigation">
        <div className="sidebarTop">
          <div className="brand">
            <span className="brandMark">A</span>
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
            className={`navItem ${view === "calculator" ? "active" : ""}`}
            onClick={() => setView("calculator")}
            type="button"
          >
            <span className="navIcon"> </span> Calculators
          </button>
          <button
            className={`navItem ${view === "documents" ? "active" : ""}`}
            onClick={() => setView("documents")}
            type="button"
          >
            <span className="navIcon"> </span> Legal Docs
          </button>
        </nav>

        {/* Chat History */}
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
                    <span className="chatHistoryCount">
                      {conv.messages.length} msgs
                    </span>
                    <button
                      className="chatHistoryDelete"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this chat?")) {
                          deleteConversation(conv.id);
                        }
                      }}
                      title="Delete chat"
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
        {view === "calculator" && <CalculatorView />}
        {view === "documents" && (
          <DocumentsView
            documents={documents}
            onRefresh={loadDocuments}
          />
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

  return (
    <div className="chatView">
      {messages.length === 0 ? (
        <div className="chatEmpty">
          <div className="emptyLogo">
            <span className="emptyLogoMark">A</span>
          </div>
          <h2>Naweza kukusaidiaje leo?</h2>
          <p className="emptySubtext">
            Ask me about VAT, TIN, PAYE, SDL, corporation tax, compliance, or ERPNext.
            <br />
            I use official TRA and PDPC sources only.
          </p>
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
      ) : (
        <div className="chatTranscript" ref={transcriptRef}>
          <div className="messageStack">
            {messages.map((msg) => (
              <article
                className={`message ${msg.role === "user" ? "userMessage" : "assistantMessage"}`}
                key={msg.id}
              >
                <div className="messageAvatar">
                  {msg.role === "user" ? "  You" : "A AIMS"}
                </div>
                <div className="messageBody">{msg.content}</div>
                {msg.response ? (
                  <ResponseMeta response={msg.response} />
                ) : null}
                <div className="messageTime">{formatTime(msg.timestamp)}</div>
              </article>
            ))}
            {isSending && (
              <article className="message assistantMessage">
                <div className="messageAvatar">A AIMS</div>
                <div className="thinkingRow">
                  <div className="thinkingDots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>AIMS inafikiri na kutafuta source rasmi...</span>
                </div>
              </article>
            )}
          </div>
        </div>
      )}

      {/* Composer */}
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
            placeholder="Uliza kuhusu VAT, TIN, PAYE, corporation tax..."
            rows={1}
            value={input}
          />
          <div className="composerActions">
            <button
              aria-label="Send message"
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

function ResponseMeta({ response }: { response: ChatResponse }) {
  return (
    <div className="responseMeta">
      <div className="responseFlags">
        <span className={`confidence confidence-${response.confidence}`}>
          {response.confidence}
        </span>
        {response.needsHumanReview ? (
          <span className="reviewFlag">⚠ Review</span>
        ) : null}
      </div>

      {response.citations.length > 0 && (
        <div className="citationList">
          {response.citations.map((citation) => (
            <a
              href={
                citation.sourceUrl.startsWith("upload://")
                  ? "#"
                  : citation.sourceUrl
              }
              key={`${citation.title}-${citation.sourceUrl}`}
              rel="noreferrer"
              target={
                citation.sourceUrl.startsWith("upload://") ? undefined : "_blank"
              }
            >
              <span className="citationOrg">{citation.sourceOrg}:</span>{" "}
              {citation.title}
            </a>
          ))}
        </div>
      )}

      {response.followUps.length > 0 && (
        <div className="followUps">
          {response.followUps.slice(0, 3).map((item) => (
            <span className="followUpChip" key={item}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Calculator View ─── */

function CalculatorView() {
  return (
    <div className="panelView">
      <div className="viewHeader">
        <h1>  Tax Calculators</h1>
        <p>
          Deterministic calculators using official Tanzania tax rules. AI
          haifanyi hesabu mwenyewe.
        </p>
      </div>
      <div className="panelGrid">
        <PayeCalculator />
        <VatCalculator />
        <SdlCalculator />
        <WhtCalculator />
      </div>
    </div>
  );
}

function PayeCalculator() {
  const [income, setIncome] = useState("600000");
  const [result, setResult] = useState<PayeResponse | null>(null);
  const [error, setError] = useState("");

  async function calculate() {
    setError("");
    const res = await fetch("/api/calculations/paye", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyTaxableIncome: Number(income) }),
    });
    const data = (await res.json()) as PayeResponse | { error: string };
    if (!res.ok || "error" in data) {
      setError("error" in data ? data.error : "Calculation failed");
      return;
    }
    setResult(data);
  }

  return (
    <CalculatorCard onCalculate={calculate} title="PAYE">
      <label>
        Monthly taxable income (TZS)
        <input onChange={(e) => setIncome(e.target.value)} type="number" value={income} />
      </label>
      {error && <p className="calcError">{error}</p>}
      {result && (
        <div className="resultBox">
          <strong>TZS {fmt(result.paye)}</strong>
          Effective rate: {(result.effectiveRate * 100).toFixed(2)}%
          <br />
          Rule: {result.ruleVersion}
        </div>
      )}
    </CalculatorCard>
  );
}

function VatCalculator() {
  const [amount, setAmount] = useState("1000000");
  const [mode, setMode] = useState<"exclusive" | "inclusive">("exclusive");
  const [result, setResult] = useState<VatResponse | null>(null);

  async function calculate() {
    const res = await fetch("/api/calculations/vat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), mode }),
    });
    setResult((await res.json()) as VatResponse);
  }

  return (
    <CalculatorCard onCalculate={calculate} title="VAT (18%)">
      <label>
        Amount (TZS)
        <input onChange={(e) => setAmount(e.target.value)} type="number" value={amount} />
      </label>
      <label>
        Mode
        <select onChange={(e) => setMode(e.target.value as "exclusive" | "inclusive")} value={mode}>
          <option value="exclusive">Amount is exclusive of VAT</option>
          <option value="inclusive">Amount is inclusive of VAT</option>
        </select>
      </label>
      {result && (
        <div className="resultBox">
          <strong>VAT: TZS {fmt(result.vatAmount)}</strong>
          Net: TZS {fmt(result.net)} | Total: TZS {fmt(result.total)}
        </div>
      )}
    </CalculatorCard>
  );
}

function SdlCalculator() {
  const [payroll, setPayroll] = useState("5000000");
  const [employees, setEmployees] = useState("12");
  const [result, setResult] = useState<SdlResponse | null>(null);

  async function calculate() {
    const res = await fetch("/api/calculations/sdl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalGrossEmoluments: Number(payroll),
        employeeCount: Number(employees),
      }),
    });
    setResult((await res.json()) as SdlResponse);
  }

  return (
    <CalculatorCard onCalculate={calculate} title="SDL">
      <label>
        Total gross emoluments (TZS)
        <input onChange={(e) => setPayroll(e.target.value)} type="number" value={payroll} />
      </label>
      <label>
        Employee count
        <input onChange={(e) => setEmployees(e.target.value)} type="number" value={employees} />
      </label>
      {result && (
        <div className="resultBox">
          <strong>TZS {fmt(result.sdl)}</strong>
          Applicable: {result.applicable ? "Yes" : "No"} | Rate: {(result.rate * 100).toFixed(1)}%
          <br />
          {result.note}
        </div>
      )}
    </CalculatorCard>
  );
}

function WhtCalculator() {
  const [amount, setAmount] = useState("1000000");
  const [category, setCategory] = useState("management-resident");
  const [result, setResult] = useState<WhtResponse | null>(null);

  async function calculate() {
    const res = await fetch("/api/calculations/wht", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), category }),
    });
    setResult((await res.json()) as WhtResponse);
  }

  return (
    <CalculatorCard onCalculate={calculate} title="WHT">
      <label>
        Payment amount (TZS)
        <input onChange={(e) => setAmount(e.target.value)} type="number" value={amount} />
      </label>
      <label>
        Category
        <select onChange={(e) => setCategory(e.target.value)} value={category}>
          <option value="dividends-resident">Dividends (resident) - 5%</option>
          <option value="dividends-non-resident">Dividends (non-resident) - 10%</option>
          <option value="interest">Interest - 15%</option>
          <option value="royalties">Royalties - 15%</option>
          <option value="management-resident">Management/consultancy (resident) - 5%</option>
          <option value="management-non-resident">Management/consultancy (non-resident) - 15%</option>
          <option value="rent-resident">Rent (resident) - 10%</option>
        </select>
      </label>
      {result && (
        <div className="resultBox">
          <strong>WHT: TZS {fmt(result.wht)}</strong>
          Net payable: TZS {fmt(result.netPayable)}
          <br />
          {result.label} @ {(result.rate * 100).toFixed(0)}%
        </div>
      )}
    </CalculatorCard>
  );
}

function CalculatorCard({
  title,
  children,
  onCalculate,
}: {
  title: string;
  children: React.ReactNode;
  onCalculate: () => void;
}) {
  return (
    <article className="panelCard">
      <h2>{title}</h2>
      <div className="fieldGrid">{children}</div>
      <button className="primaryButton" onClick={() => void onCalculate()} type="button">
        Calculate
      </button>
    </article>
  );
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

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        message?: string;
        error?: string;
        entriesCreated?: number;
      };

      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setUploadStatus(
        `${data.message ?? "Uploaded"} (${data.entriesCreated ?? 0} chunks indexed).`
      );
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
    await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await onRefresh();
  }

  return (
    <div className="panelView">
      <div className="viewHeader">
        <h1>  Legal Documents</h1>
        <p>
          Pakia PDF za TRA, Finance Act, regulations, notices, na legal docs
          nyingine.
        </p>
      </div>

      <article className="panelCard uploadCard">
        <form onSubmit={handleUpload}>
          <div className="uploadZone">
            <p>Drag & drop au chagua PDF ya legal/tax document</p>
            <label className="uploadLabel" htmlFor="pdf-upload">
              + Chagua PDF
            </label>
            <input
              accept="application/pdf,.pdf"
              id="pdf-upload"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              type="file"
            />
            {uploadFile && <span className="uploadFileName">{uploadFile.name}</span>}
          </div>

          <div className="fieldGrid" style={{ marginTop: 16 }}>
            <label>
              Document title (optional)
              <input
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Finance Act 2026"
                value={uploadTitle}
              />
            </label>
            <label>
              Tags (comma separated)
              <input onChange={(e) => setUploadTags(e.target.value)} value={uploadTags} />
            </label>
          </div>

          <button
            className="primaryButton"
            disabled={!uploadFile || isUploading}
            type="submit"
          >
            {isUploading ? "Inapakia..." : "Upload & Index PDF"}
          </button>

          {uploadStatus && <div className="resultBox">{uploadStatus}</div>}
        </form>

        <div className="documentList">
          {documents.length === 0 ? (
            <div className="resultBox">
              Hakuna documents bado. Pakia PDF ya kwanza ili AI iweze kujibu
              maswali kutoka kwake.
            </div>
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
                <button
                  className="dangerButton"
                  onClick={() => void handleRemove(doc.id)}
                  type="button"
                >
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

/* ─── Helpers ─── */

function fmt(value: number) {
  return new Intl.NumberFormat("en-TZ").format(value);
}
