import { PDFParse } from "pdf-parse";

export async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const textResult = await parser.getText();

    return {
      text: textResult.text ?? "",
      pageCount: textResult.total ?? textResult.pages.length
    };
  } finally {
    await parser.destroy();
  }
}
