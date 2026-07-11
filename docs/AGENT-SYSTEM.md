# AIMS AI Agent — Agent System Design

**Detailed Multi-Agent Architecture**

Version: 1.0 (Architecture Draft)
Date: July 2026

---

## 1. Agent System Overview

### 1.1 Agent Design Philosophy

Each agent in the AIMS system is designed as an **autonomous expert** with:
- **Specialized knowledge** (specific domain expertise)
- **Specific tools** (calculators, document generators, etc.)
- **Defined boundaries** (what it can and cannot do)
- **Confidence awareness** (knows when it's uncertain)
- **Citation discipline** (always references sources)

### 1.2 Agent Interaction Model

```
                    ┌─────────────────┐
                    │  User Request   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Intent Router   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───┐  ┌──────▼──────┐  ┌───▼────────┐
     │ Single     │  │ Multi-Agent │  │ Escalation │
     │ Agent      │  │ Coordination│  │ to Human   │
     └────────┬───┘  └──────┬──────┘  └────────────┘
              │              │
              │      ┌───────┼───────┐
              │      │       │       │
              │   ┌──▼──┐ ┌──▼──┐ ┌──▼──┐
              │   │Ag A │ │Ag B │ │Ag C │
              │   └──┬──┘ └──┬──┘ └──┬──┘
              │      │       │       │
              │      └───────┼───────┘
              │              │
     ┌────────▼──────────────▼────────┐
     │      Response Composer         │
     │  (Merge, Format, Cite, etc.)   │
     └────────────────┬───────────────┘
                      │
              ┌───────▼───────┐
              │  User Response │
              └───────────────┘
```

---

## 2. Intent Router

### 2.1 Intent Classification System

The Intent Router is the first point of contact. It classifies user queries and routes them to the appropriate agent(s).

```typescript
type IntentClassification = {
  primaryIntent: Intent;
  secondaryIntents: Intent[];
  entities: ExtractedEntities;
  complexity: "simple" | "moderate" | "complex";
  requiresMultiAgent: boolean;
  confidence: number;
};

type Intent = 
  | "tax_research"
  | "tax_calculation"
  | "accounting_question"
  | "financial_reporting"
  | "erpnext_help"
  | "compliance_check"
  | "document_draft"
  | "audit_question"
  | "payroll_question"
  | "financial_analysis"
  | "general_inquiry"
  | "greeting"
  | "clarification_needed";

type ExtractedEntities = {
  taxTypes?: string[];
  amounts?: number[];
  dates?: string[];
  documentReferences?: string[];
  sectionReferences?: string[];
  companyContext?: string;
};
```

### 2.2 Routing Rules

```typescript
const ROUTING_RULES: Record<Intent, {
  primaryAgent: string;
  supportingAgents: string[];
  tools: string[];
  riskLevel: "low" | "medium" | "high";
}> = {
  tax_research: {
    primaryAgent: "tax-advisory",
    supportingAgents: ["source-verification"],
    tools: ["knowledge-search", "citation-extractor"],
    riskLevel: "medium"
  },
  tax_calculation: {
    primaryAgent: "calculator",
    supportingAgents: ["tax-advisory"],
    tools: ["paye-calc", "vat-calc", "sdl-calc", "wht-calc", "cit-calc"],
    riskLevel: "low"
  },
  erpnext_help: {
    primaryAgent: "erpnext",
    supportingAgents: [],
    tools: ["erpnext-docs-search", "workflow-viewer"],
    riskLevel: "low"
  },
  compliance_check: {
    primaryAgent: "compliance",
    supportingAgents: ["tax-advisory"],
    tools: ["compliance-calendar", "deadline-checker"],
    riskLevel: "medium"
  },
  document_draft: {
    primaryAgent: "document-drafting",
    supportingAgents: ["tax-advisory", "source-verification"],
    tools: ["template-engine", "pdf-generator"],
    riskLevel: "medium"
  },
  audit_question: {
    primaryAgent: "audit",
    supportingAgents: ["accounting"],
    tools: ["anomaly-detector", "control-analyzer"],
    riskLevel: "high"
  },
  payroll_question: {
    primaryAgent: "hr-payroll",
    supportingAgents: ["tax-advisory"],
    tools: ["paye-calc", "nssf-calc", "wcf-calc"],
    riskLevel: "medium"
  },
  financial_analysis: {
    primaryAgent: "financial-analysis",
    supportingAgents: ["accounting"],
    tools: ["ratio-analyzer", "trend-analyzer"],
    riskLevel: "medium"
  }
};
```

### 2.3 Entity Extraction

```typescript
type ExtractedEntities = {
  // Tax entities
  taxTypes: TaxType[];
  amounts: AmountEntity[];
  dates: DateEntity[];
  
  // Reference entities
  sectionRefs: SectionReference[];
  actRefs: ActReference[];
  
  // Business entities
  companyContext?: CompanyContext;
  clientContext?: ClientContext;
  
  // Document entities
  documentType?: DocumentType;
  documentPurpose?: string;
};

type TaxType = 
  | "VAT" | "PAYE" | "SDL" | "WHT" | "CIT" 
  | "PROVISIONAL_TAX" | "EXCISE" | "STAMP_DUTY"
  | "NSSF" | "WCF";

type SectionReference = {
  act: string;           // e.g., "Income Tax Act"
  section?: string;      // e.g., "12(1)(a)"
  subsection?: string;
};
```

---

## 3. Agent Definitions

### 3.1 Tax Advisory Agent

**Role**: Primary expert for all tax-related queries

**Personality**: Experienced Tanzanian tax consultant who understands both the law and practical TRA processes.

**Knowledge Sources**:
- Income Tax Act
- VAT Act
- Tax Administration Act
- Finance Acts (2020-2026)
- Excise Duty Act
- Stamp Duty Act
- TRA Practice Notes
- TRA Public Rulings
- TRA Guides

**System Prompt Template**:
```
You are an experienced Tanzanian tax consultant with deep knowledge of:
- Tanzania Mainland tax law
- TRA procedures and practices
- Finance Act amendments
- Tax compliance requirements

Your responsibilities:
1. Answer tax questions with official source citations
2. Explain tax obligations clearly in the user's language
3. Recommend appropriate tax treatments
4. Flag when human review is needed
5. Never guess or fabricate references

Key rules:
- Always cite the applicable Act and section
- Always state the effective date of any rule
- Always clarify if the answer is for Mainland or Zanzibar
- Always recommend professional review for high-risk matters
- Distinguish between facts and your interpretation
```

**Tools Available**:
| Tool | Purpose |
|------|---------|
| `knowledge-search` | Search tax knowledge base |
| `citation-extractor` | Extract and verify citations |
| `tax-rule-lookup` | Look up current tax rates/rules |
| `confidence-scorer` | Score answer confidence |

**Response Format**:
```typescript
type TaxAgentResponse = {
  answer: string;
  citations: TaxCitation[];
  confidence: "high" | "medium" | "low";
  assumptions: string[];
  risks: string[];
  recommendations: string[];
  needsHumanReview: boolean;
  followUpQuestions: string[];
};

type TaxCitation = {
  act: string;
  section: string;
  subsection?: string;
  effectiveDate: string;
  content: string;
  sourceUrl: string;
};
```

**Confidence Scoring**:
```typescript
function scoreTaxConfidence(
  retrievedChunks: Chunk[],
  queryComplexity: string,
  hasDirectCitation: boolean
): "high" | "medium" | "low" {
  // High: Direct citation found, high chunk relevance, simple query
  // Medium: Partial citation, moderate relevance, or complex query
  // Low: No direct citation, low relevance, or conflicting sources
}
```

### 3.2 Accounting Agent

**Role**: Expert in bookkeeping, financial reporting, and accounting standards

**Personality**: Chartered accountant with IFRS expertise and practical bookkeeping experience.

**Knowledge Sources**:
- IFRS Standards
- IAS Standards
- IPSAS Standards
- Accounting Best Practices
- Company Financial Procedures

**System Prompt Template**:
```
You are a qualified Chartered Accountant with expertise in:
- IFRS and IAS standards
- Financial statement preparation
- Bookkeeping and reconciliation
- Cost accounting
- Management accounting

Your responsibilities:
1. Explain accounting concepts clearly
2. Guide on proper accounting treatment
3. Reference applicable IFRS/IAS standards
4. Help with journal entries and reconciliations
5. Flag unusual transactions or misstatements

Key rules:
- Always cite the applicable IFRS/IAS standard
- Distinguish between IFRS and local GAAP where relevant
- Clarify materiality considerations
- Recommend professional review for complex matters
```

**Tools Available**:
| Tool | Purpose |
|------|---------|
| `ifrs-search` | Search IFRS/IAS knowledge base |
| `journal-entry-generator` | Generate journal entry suggestions |
| `ratio-calculator` | Calculate financial ratios |
| `account-classifier` | Classify transactions to accounts |

**Specialized Capabilities**:
1. **Journal Entry Guidance**: Generate proper double-entry journal entries
2. **Financial Statement Analysis**: Analyze provided financial statements
3. **Account Classification**: Help classify transactions to correct accounts
4. **Reconciliation Support**: Guide bank reconciliation processes
5. **Year-End Procedures**: Guide closing procedures

### 3.3 ERPNext Agent

**Role**: ERPNext/Frappe Framework expert

**Personality**: Experienced ERP consultant who has implemented ERPNext for multiple Tanzanian companies.

**Knowledge Sources**:
- ERPNext Documentation
- Frappe Framework Documentation
- ERPNext Best Practices
- Custom App Development Guides

**System Prompt Template**:
```
You are an experienced ERPNext/Frappe consultant with expertise in:
- ERPNext modules (Accounts, Stock, HR, Manufacturing, etc.)
- Frappe Framework development
- Customization and configuration
- Implementation best practices
- Performance optimization

Your responsibilities:
1. Guide users through ERPNext features
2. Explain configuration options
3. Help with custom scripts and workflows
4. Troubleshoot issues
5. Recommend best practices

Key rules:
- Reference specific ERPNext versions when relevant
- Provide step-by-step instructions
- Include screenshots/diagrams when helpful
- Warn about customization risks
- Always backup before major changes
```

**Tools Available**:
| Tool | Purpose |
|------|---------|
| `erpnext-docs-search` | Search ERPNext documentation |
| `api-reference` | Look up Frappe API methods |
| `workflow-designer` | Help design workflows |
| `script-generator` | Generate client/server scripts |

**Specialized Capabilities**:
1. **Module Guidance**: Explain any ERPNext module
2. **Configuration Help**: Guide through settings
3. **Custom Script Writing**: Generate Client/Server scripts
4. **Workflow Design**: Help design approval workflows
5. **Data Import/Export**: Guide bulk operations
6. **Performance Tips**: Optimization recommendations

### 3.4 Compliance Agent

**Role**: Tracks deadlines, obligations, and regulatory requirements

**Personality**: Meticulous compliance officer who never misses a deadline.

**Knowledge Sources**:
- Tax Administration Act (filing deadlines)
- Companies Act (annual filing)
- Labour laws (employee filings)
- Regulatory calendars

**System Prompt Template**:
```
You are a compliance officer responsible for tracking:
- Tax filing deadlines (VAT, PAYE, SDL, WHT, CIT)
- Annual returns and annual general meetings
- Employee statutory filings (NSSF, WCF, Workers' Compensation)
- License renewals
- Regulatory submissions

Your responsibilities:
1. Track all compliance deadlines
2. Send timely reminders
3. Generate filing checklists
4. Track completion status
5. Flag overdue items

Key rules:
- Always verify the current deadline (dates can change)
- Account for weekends and public holidays
- Recommend early filing (not last day)
- Track evidence of filing
```

**Tools Available**:
| Tool | Purpose |
|------|---------|
| `compliance-calendar` | Manage compliance calendar |
| `deadline-calculator` | Calculate due dates |
| `reminder-scheduler` | Schedule reminders |
| `checklist-generator` | Generate filing checklists |

**Compliance Tracking**:
```typescript
type ComplianceObligation = {
  id: string;
  tenantId: string;
  type: "tax_filing" | "annual_return" | "employee_filing" | "license_renewal";
  description: string;
  dueDate: Date;
  frequency: "monthly" | "quarterly" | "annual" | "one_time";
  taxType?: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  reminders: Reminder[];
  evidence?: DocumentReference;
};
```

### 3.5 Document Drafting Agent

**Role**: Generates professional business documents

**Personality**: Professional legal/administrative assistant with attention to detail.

**Knowledge Sources**:
- Document templates
- Previous drafts
- Official correspondence formats
- Legal document conventions

**System Prompt Template**:
```
You are a professional document drafting assistant specializing in:
- TRA correspondence
- Tax objection letters
- Explanation letters
- Internal memos
- Filing checklists
- Advisory notes
- Working papers

Your responsibilities:
1. Draft professional documents based on user facts
2. Use proper formatting and structure
3. Include all necessary elements
4. Reference applicable laws and standards
5. Flag when professional review is needed

Key rules:
- Never include fabricated legal references
- Always use professional business language
- Include proper headers, dates, and signatures
- Mark sections that need user input
- Clearly distinguish facts from assumptions
```

**Document Types**:
```typescript
type DocumentType = 
  | "tra_response_letter"
  | "tax_objection"
  | "explanation_letter"
  | "tax_position_memo"
  | "filing_checklist"
  | "client_advisory_note"
  | "internal_working_paper"
  | "board_resolution"
  | "management_letter";

type DocumentDraft = {
  type: DocumentType;
  subject: string;
  content: string;
  sections: DocumentSection[];
  placeholders: Placeholder[];
  citations: Citation[];
  needsReview: boolean;
  reviewNotes: string[];
};
```

### 3.6 Audit Agent

**Role**: Internal audit support and fraud detection

**Personality**: Experienced internal auditor with keen eye for detail and risk assessment.

**Knowledge Sources**:
- ISA Standards
- Internal Audit Standards
- Fraud examination guidelines
- Control frameworks (COSO)

**System Prompt Template**:
```
You are an experienced Internal Auditor with expertise in:
- Risk-based auditing
- Fraud detection
- Internal controls assessment
- Compliance auditing
- Operational auditing

Your responsibilities:
1. Identify potential fraud indicators
2. Assess control weaknesses
3. Review transactions for anomalies
4. Generate audit findings
5. Recommend improvements

Key rules:
- Never make accusations, only observations
- Always support findings with evidence
- Distinguish between error and fraud indicators
- Follow professional skepticism principles
- Recommend investigation for high-risk findings
```

**Detection Capabilities**:
```typescript
type AuditFinding = {
  id: string;
  category: "fraud_indicator" | "control_weakness" | "compliance_gap" | "process_issue";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: string[];
  riskImpact: string;
  recommendation: string;
  requiresInvestigation: boolean;
};

type AnomalyDetection = {
  duplicatePayments: Transaction[];
  unusualJournals: Transaction[];
  missingApprovals: Transaction[];
  thresholdBreaches: Transaction[];
  patternAnomalies: Transaction[];
};
```

### 3.7 HR/Payroll Agent

**Role**: Payroll and human resources queries

**Personality**: HR manager with payroll expertise and knowledge of Tanzanian labour laws.

**Knowledge Sources**:
- Employment and Labour Relations Act
- NSSF Regulations
- WCF Regulations
- OSHA Regulations
- Minimum Wage Orders
- GRA (Government Regulations)

**System Prompt Template**:
```
You are an experienced HR Manager with expertise in:
- Tanzanian labour laws
- Payroll processing
- Employee statutory contributions
- Employment contracts
- Leave management
- Termination procedures

Your responsibilities:
1. Explain payroll calculations
2. Guide on statutory contributions
3. Advise on employment law
4. Help with HR documentation
5. Explain employee rights and obligations

Key rules:
- Always cite the applicable labour law
- Clarify minimum wage requirements
- Explain statutory deduction calculations
- Flag potential compliance issues
- Recommend professional review for disputes
```

**Tools Available**:
| Tool | Purpose |
|------|---------|
| `paye-calculator` | Calculate PAYE |
| `nssf-calculator` | Calculate NSSF contributions |
| `wcf-calculator` | Calculate WCF contributions |
| `leave-calculator` | Calculate leave entitlements |
| `terminal-benefits` | Calculate terminal benefits |

### 3.8 Financial Analysis Agent

**Role**: Analyzes financial statements and provides insights

**Personality**: Financial analyst with expertise in Tanzanian business environment.

**Knowledge Sources**:
- Financial reporting standards
- Industry benchmarks
- Financial analysis frameworks
- Risk assessment models

**System Prompt Template**:
```
You are an experienced Financial Analyst with expertise in:
- Financial statement analysis
- Ratio analysis
- Cash flow analysis
- Risk assessment
- Business valuation
- Industry benchmarking

Your responsibilities:
1. Analyze profitability, liquidity, and solvency
2. Identify financial risks and trends
3. Benchmark against industry standards
4. Generate executive summaries
5. Provide actionable recommendations

Key rules:
- Always show the calculations
- Compare to industry benchmarks where available
- Flag unusual items or trends
- Quantify impacts where possible
- Distinguish between facts and projections
```

**Analysis Capabilities**:
```typescript
type FinancialAnalysis = {
  profitability: {
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    roa: number;
    roe: number;
  };
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
  };
  solvency: {
    debtToEquity: number;
    debtToAssets: number;
    interestCoverage: number;
  };
  efficiency: {
    assetTurnover: number;
    inventoryTurnover: number;
    receivableDays: number;
    payableDays: number;
  };
  insights: Insight[];
  risks: Risk[];
  recommendations: string[];
};
```

---

## 4. Multi-Agent Coordination

### 4.1 Coordination Scenarios

**Scenario 1: Tax Planning Query**
```
User: "I want to plan my company's tax position for next year. We're expecting TZS 500M revenue."

Primary Agent: Tax Advisory
Supporting Agents: Financial Analysis, Compliance
Coordination:
1. Tax Agent analyzes tax implications
2. Financial Agent models financial scenarios
3. Compliance Agent checks timeline obligations
4. Response merged with all perspectives
```

**Scenario 2: ERPNext Implementation**
```
User: "How do I set up PAYE calculation in ERPNext for our 50 employees?"

Primary Agent: ERPNext
Supporting Agents: HR/Payroll, Tax Advisory
Coordination:
1. ERPNext Agent provides setup steps
2. HR Agent explains PAYE requirements
3. Tax Agent confirms current rates
4. Combined response with ERPNext + tax guidance
```

**Scenario 3: Audit Finding**
```
User: "I found a journal entry that looks suspicious. Can you help me investigate?"

Primary Agent: Audit
Supporting Agents: Accounting
Coordination:
1. Audit Agent performs anomaly analysis
2. Accounting Agent explains proper treatment
3. Combined response with findings and recommendations
```

### 4.2 Coordination Protocol

```typescript
type CoordinationRequest = {
  id: string;
  originalQuery: string;
  tasks: AgentTask[];
  coordinationType: "sequential" | "parallel" | "hierarchical";
};

type AgentTask = {
  id: string;
  agentId: string;
  input: string;
  context: SharedContext;
  dependsOn: string[];
  priority: number;
};

type SharedContext = {
  conversationHistory: Message[];
  tenantContext: TenantContext;
  userProfile: UserProfile;
  extractedEntities: ExtractedEntities;
};

type AgentResult = {
  taskId: string;
  agentId: string;
  output: string;
  confidence: number;
  citations: Citation[];
  toolsUsed: string[];
  metadata: Record<string, unknown>;
};

type CoordinationResult = {
  requestId: string;
  mergedOutput: string;
  confidence: number;
  citations: Citation[];
  agentResults: AgentResult[];
  requiresHumanReview: boolean;
};
```

### 4.3 Response Merging Strategy

```typescript
function mergeAgentResults(results: AgentResult[]): MergedResponse {
  // 1. Group by citation to avoid duplicates
  const citations = deduplicateCitations(
    results.flatMap(r => r.citations)
  );
  
  // 2. Calculate overall confidence (lowest agent confidence)
  const confidence = Math.min(...results.map(r => r.confidence));
  
  // 3. Merge outputs in logical order
  const mergedOutput = composeMergedOutput(results);
  
  // 4. Check if any agent flagged for human review
  const needsReview = results.some(r => r.confidence < 0.5);
  
  return {
    output: mergedOutput,
    confidence,
    citations,
    needsReview
  };
}
```

---

## 5. Tool System

### 5.1 Tool Interface

```typescript
interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

type ToolParameter = {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required: boolean;
  default?: unknown;
};

type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
};

type ToolContext = {
  tenantId: string;
  userId: string;
  conversationId: string;
  language: "en" | "sw";
};
```

### 5.2 Tool Registry

```typescript
const TOOL_REGISTRY: Map<string, AgentTool> = new Map([
  // Calculators
  ["paye-calc", new PayeCalculatorTool()],
  ["vat-calc", new VatCalculatorTool()],
  ["sdl-calc", new SdlCalculatorTool()],
  ["wht-calc", new WhtCalculatorTool()],
  ["cit-calc", new CitCalculatorTool()],
  ["nssf-calc", new NssfCalculatorTool()],
  ["wcf-calc", new WcfCalculatorTool()],
  
  // Knowledge
  ["knowledge-search", new KnowledgeSearchTool()],
  ["citation-extractor", new CitationExtractorTool()],
  ["tax-rule-lookup", new TaxRuleLookupTool()],
  
  // Documents
  ["template-engine", new TemplateEngineTool()],
  ["pdf-generator", new PdfGeneratorTool()],
  ["docx-generator", new DocxGeneratorTool()],
  
  // ERPNext
  ["erpnext-docs-search", new ErpnextDocsSearchTool()],
  ["erpnext-api-call", new ErpnextApiCallTool()],
  
  // Analysis
  ["ratio-calculator", new RatioCalculatorTool()],
  ["anomaly-detector", new AnomalyDetectorTool()],
  
  // Compliance
  ["compliance-calendar", new ComplianceCalendarTool()],
  ["deadline-calculator", new DeadlineCalculatorTool()]
]);
```

### 5.3 Tool Execution Flow

```
Agent decides to use tool
    │
    ▼
┌─────────────────────────────────────┐
│  1. Validate parameters             │
│  2. Check permissions               │
│  3. Log tool call (audit)           │
│  4. Execute tool                    │
│  5. Validate result                 │
│  6. Return to agent                 │
└─────────────────────────────────────┘
```

---

## 6. Confidence and Review System

### 6.1 Confidence Scoring

```typescript
type ConfidenceFactors = {
  citationStrength: number;    // 0-1, how strong are the citations
  sourceAuthority: number;     // 0-1, how authoritative is the source
  queryComplexity: number;     // 0-1, how complex is the query
  answerCompleteness: number;  // 0-1, how complete is the answer
  contradictingSources: number; // 0-1, are there contradictions
};

function calculateConfidence(factors: ConfidenceFactors): number {
  const weights = {
    citationStrength: 0.3,
    sourceAuthority: 0.25,
    queryComplexity: 0.2,
    answerCompleteness: 0.15,
    contradictingSources: 0.1
  };
  
  return (
    factors.citationStrength * weights.citationStrength +
    factors.sourceAuthority * weights.sourceAuthority +
    (1 - factors.queryComplexity) * weights.queryComplexity +
    factors.answerCompleteness * weights.answerCompleteness +
    (1 - factors.contradictingSources) * weights.contradictingSources
  );
}
```

### 6.2 Human Review Triggers

```typescript
type ReviewTrigger = {
  condition: (context: ResponseContext) => boolean;
  priority: "low" | "medium" | "high";
  reason: string;
};

const REVIEW_TRIGGERS: ReviewTrigger[] = [
  {
    condition: (ctx) => ctx.confidence < 0.5,
    priority: "high",
    reason: "Low confidence score"
  },
  {
    condition: (ctx) => ctx.entities.includes("audit") || ctx.entities.includes("objection"),
    priority: "high",
    reason: "High-risk tax matter"
  },
  {
    condition: (ctx) => ctx.contradictingSources.length > 0,
    priority: "medium",
    reason: "Conflicting source information"
  },
  {
    condition: (ctx) => ctx.amount > 100_000_000, // TZS 100M
    priority: "medium",
    reason: "Material tax exposure"
  },
  {
    condition: (ctx) => ctx.isFirstTimeQuery && ctx.riskLevel === "high",
    priority: "medium",
    reason: "First-time query on high-risk topic"
  }
];
```

### 6.3 Review Queue Management

```typescript
type ReviewQueueItem = {
  id: string;
  tenantId: string;
  messageId: string;
  userId: string;
  assignedTo?: string;
  priority: "low" | "medium" | "high";
  riskLevel: "low" | "medium" | "high";
  reason: string;
  originalQuery: string;
  aiResponse: string;
  citations: Citation[];
  status: "pending" | "in_review" | "approved" | "rejected" | "needs_info";
  reviewerNotes?: string;
  createdAt: Date;
  reviewedAt?: Date;
};
```

---

## 7. Conversation Management

### 7.1 Conversation Context

```typescript
type ConversationContext = {
  conversationId: string;
  tenantId: string;
  userId: string;
  language: "en" | "sw" | "mixed";
  
  // Current turn
  currentQuery: string;
  currentIntent: IntentClassification;
  currentEntities: ExtractedEntities;
  
  // History
  recentMessages: Message[];
  conversationSummary?: string; // For long conversations
  
  // Company context
  companyProfile?: CompanyProfile;
  activeClient?: ClientProfile;
  
  // Session state
  activeTools: string[];
  pendingClarifications: string[];
};
```

### 7.2 Context Window Management

```typescript
function manageContextWindow(
  messages: Message[],
  maxTokens: number = 8000
): Message[] {
  // 1. Always include system prompt (~500 tokens)
  // 2. Always include last 4 messages (~2000 tokens)
  // 3. Include summary if available (~500 tokens)
  // 4. Fill remaining with relevant history (~5000 tokens)
  
  const systemTokens = 500;
  const recentTokens = 2000;
  const summaryTokens = 500;
  const remainingTokens = maxTokens - systemTokens - recentTokens - summaryTokens;
  
  // Select most relevant historical messages
  const relevantHistory = selectRelevantMessages(
    messages.slice(0, -4),
    remainingTokens
  );
  
  return [
    ...relevantHistory,
    ...messages.slice(-4)
  ];
}
```

### 7.3 Conversation Storage

```typescript
type StoredConversation = {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  summary?: string;
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
  metadata: {
    language: string;
    primaryIntents: string[];
    agentsUsed: string[];
    totalTokens: number;
  };
};

type StoredMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  language: string;
  intent?: string;
  agentUsed?: string;
  confidence?: number;
  citations?: Citation[];
  retrievedChunks?: string[];
  tokens: number;
  createdAt: Date;
};
```

---

## 8. Performance Considerations

### 8.1 Agent Response Time Targets

| Agent | Target Response Time | Notes |
|-------|---------------------|-------|
| Tax Advisory | < 3 seconds | Including RAG retrieval |
| Accounting | < 3 seconds | Including RAG retrieval |
| ERPNext | < 2 seconds | Primarily documentation lookup |
| Compliance | < 1 second | Calendar lookup |
| Document Drafting | < 5 seconds | Template rendering |
| Audit | < 4 seconds | Analysis required |
| HR/Payroll | < 2 seconds | Calculator-heavy |
| Financial Analysis | < 4 seconds | Calculation-heavy |

### 8.2 Optimization Strategies

1. **Caching**: Cache frequent queries and tax rules
2. **Pre-computation**: Pre-compute common calculations
3. **Embedding Cache**: Cache query embeddings
4. **Lazy Loading**: Load agent capabilities on-demand
5. **Parallel Execution**: Run independent tools in parallel
6. **Streaming**: Stream responses as they're generated

### 8.3 Monitoring Per Agent

```typescript
type AgentMetrics = {
  agentId: string;
  requestCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  averageConfidence: number;
  humanReviewRate: number;
  toolUsageCounts: Record<string, number>;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
};
```

---

## Appendix: Agent Comparison Matrix

| Agent | Primary Use Case | Risk Level | Human Review | ERPNext Integration |
|-------|-----------------|------------|--------------|---------------------|
| Tax Advisory | Tax questions | Medium | When confident < 0.7 | Via context |
| Accounting | Bookkeeping/IFRS | Low | When confident < 0.6 | Via context |
| ERPNext | ERP guidance | Low | Rare | Deep integration |
| Compliance | Deadlines/filings | Medium | For overdue items | Calendar sync |
| Document Drafting | Document generation | Medium | Always for legal docs | Template storage |
| Audit | Fraud/control detection | High | Always | Transaction data |
| HR/Payroll | Payroll questions | Medium | When confident < 0.7 | Payroll module |
| Financial Analysis | Statement analysis | Medium | For recommendations | Financial data |

---

*This document defines the agent system architecture. Each agent will be implemented as a separate module with clear interfaces and dependencies.*
