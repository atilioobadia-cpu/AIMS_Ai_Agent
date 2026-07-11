import { promises as fs } from "fs";
import path from "path";
import type { KnowledgeEntry } from "@/lib/knowledge-base";

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

type DocumentsIndex = {
  documents: StoredDocument[];
  entries: KnowledgeEntry[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const INDEX_PATH = path.join(DATA_DIR, "documents-index.json");

export async function ensureDocumentStore() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  try {
    await fs.access(INDEX_PATH);
  } catch {
    const initial: DocumentsIndex = { documents: [], entries: [] };
    await fs.writeFile(INDEX_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readIndex(): Promise<DocumentsIndex> {
  await ensureDocumentStore();
  const raw = await fs.readFile(INDEX_PATH, "utf8");
  return JSON.parse(raw) as DocumentsIndex;
}

async function writeIndex(index: DocumentsIndex) {
  await fs.writeFile(INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
}

export async function listDocuments() {
  const index = await readIndex();
  return index.documents.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function getUploadedKnowledgeEntries() {
  const index = await readIndex();
  return index.entries;
}

export async function saveUploadedDocument(input: {
  fileName: string;
  buffer: Buffer;
  title?: string;
  tags?: string[];
  extractedText: string;
  pageCount?: number;
}) {
  const index = await readIndex();
  const id = createId();
  const uploadedAt = new Date().toISOString();
  const safeName = `${id}-${sanitizeFileName(input.fileName)}`;
  const filePath = path.join(UPLOADS_DIR, safeName);

  await fs.writeFile(filePath, input.buffer);

  const title = input.title?.trim() || input.fileName.replace(/\.pdf$/i, "");
  const tags = input.tags?.length ? input.tags : ["uploaded", "legal", "pdf"];
  const chunks = chunkText(input.extractedText, 900);

  const entries: KnowledgeEntry[] = chunks.map((chunk, chunkIndex) => ({
    id: `${id}-chunk-${chunkIndex + 1}`,
    title: `${title} (part ${chunkIndex + 1}/${chunks.length})`,
    sourceOrg: "TRA" as const,
    sourceUrl: `upload://${id}/${input.fileName}`,
    category: "uploaded-document" as KnowledgeEntry["category"],
    jurisdiction: "United Republic of Tanzania" as const,
    lastReviewed: uploadedAt.slice(0, 10),
    tags: [...tags, "pdf", "uploaded-document", title.toLowerCase()],
    summary: chunk.slice(0, 220),
    bullets: chunk
      .split(/[.\n]/)
      .map((line) => line.trim())
      .filter((line) => line.length > 30)
      .slice(0, 4),
    content: chunk
  }));

  const document: StoredDocument = {
    id,
    fileName: input.fileName,
    title,
    uploadedAt,
    pageCount: input.pageCount,
    charCount: input.extractedText.length,
    tags,
    status: entries.length > 0 ? "approved" : "failed",
    error: entries.length > 0 ? undefined : "No readable text was extracted from the PDF."
  };

  index.documents.unshift(document);
  index.entries.unshift(...entries);
  await writeIndex(index);

  return { document, entriesCreated: entries.length };
}

export async function deleteDocument(id: string) {
  const index = await readIndex();
  const target = index.documents.find((doc) => doc.id === id);

  if (!target) {
    return false;
  }

  index.documents = index.documents.filter((doc) => doc.id !== id);
  index.entries = index.entries.filter((entry) => !entry.id.startsWith(`${id}-chunk-`));

  const uploadPrefix = `${id}-`;
  const uploadFiles = await fs.readdir(UPLOADS_DIR);
  await Promise.all(
    uploadFiles
      .filter((file) => file.startsWith(uploadPrefix))
      .map((file) => fs.unlink(path.join(UPLOADS_DIR, file)))
  );

  await writeIndex(index);
  return true;
}

function chunkText(text: string, maxLength: number) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < cleaned.length) {
    let end = Math.min(cursor + maxLength, cleaned.length);

    if (end < cleaned.length) {
      const splitAt = cleaned.lastIndexOf(". ", end);
      if (splitAt > cursor + maxLength * 0.55) {
        end = splitAt + 1;
      }
    }

    chunks.push(cleaned.slice(cursor, end).trim());
    cursor = end;
  }

  return chunks.filter(Boolean);
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
