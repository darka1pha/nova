import { NextResponse } from "next/server";
import { storage } from "@/lib/storage/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await storage.upload(
      {
        name: file.name,
        buffer,
        type: file.type,
      },
      { folder },
    );

    return NextResponse.json({ success: true, file: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "File upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
