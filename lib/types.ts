export type ChatRequest = {
  message: string;
  clientId?: string;
};

export type Citation = {
  title: string;
  sourceUrl: string;
  sourceOrg: string;
  effectiveDate?: string;
  lastReviewed: string;
};

export type RetrievedSource = Citation & {
  id: string;
  category: string;
  score: number;
  summary: string;
};

export type ChatResponse = {
  answer: string;
  confidence: "high" | "medium" | "low";
  citations: Citation[];
  retrievedSources: RetrievedSource[];
  needsHumanReview: boolean;
  followUps: string[];
};

export type PayeRequest = {
  monthlyTaxableIncome: number;
};

export type PayeResponse = {
  monthlyTaxableIncome: number;
  paye: number;
  effectiveRate: number;
  ruleVersion: string;
  note: string;
};

export type VatRequest = {
  amount: number;
  mode?: "exclusive" | "inclusive";
};

export type VatResponse = {
  amount: number;
  vatAmount: number;
  total: number;
  net: number;
  rate: number;
  mode: "exclusive" | "inclusive";
  ruleVersion: string;
  note: string;
};

export type SdlRequest = {
  totalGrossEmoluments: number;
  employeeCount: number;
};

export type SdlResponse = {
  totalGrossEmoluments: number;
  employeeCount: number;
  applicable: boolean;
  sdl: number;
  rate: number;
  ruleVersion: string;
  note: string;
};

export type WhtRequest = {
  amount: number;
  category: string;
};

export type WhtResponse = {
  amount: number;
  category: string;
  label: string;
  rate: number;
  wht: number;
  netPayable: number;
  ruleVersion: string;
  note: string;
};

export type StoredDocument = {
  id: string;
  fileName: string;
  title: string;
  uploadedAt: string;
  pageCount?: number;
  charCount: number;
  tags: string[];
  status: "approved" | "processing" | "failed";
  error?: string;
};

export type AppView = "chat" | "calculator" | "documents";
