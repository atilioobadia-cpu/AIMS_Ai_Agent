import { NextResponse } from "next/server";
import { deleteDocument, listDocuments, saveUploadedDocument } from "@/lib/document-store";
import { extractPdfText } from "@/lib/pdf-extract";

export async function GET() {
  const documents = await listDocuments();
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported for now" }, { status: 400 });
  }

  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF must be 12MB or smaller" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const extracted = await extractPdfText(buffer);

    if (!extracted.text.trim()) {
      return NextResponse.json(
        { error: "Could not extract readable text from this PDF. Try a text-based PDF, not a scanned image." },
        { status: 422 }
      );
    }

    const saved = await saveUploadedDocument({
      fileName: file.name,
      buffer,
      title: title || undefined,
      tags,
      extractedText: extracted.text,
      pageCount: extracted.pageCount
    });

    return NextResponse.json({
      document: saved.document,
      entriesCreated: saved.entriesCreated,
      message: "Document uploaded and indexed for tax chat retrieval."
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process PDF"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Document id is required" }, { status: 400 });
  }

  const deleted = await deleteDocument(id);

  if (!deleted) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
