import { NextResponse } from "next/server";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const MODEL_ID = "eleven_flash_v2_5";
const MAX_TEXT_LENGTH = 5000;

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    return NextResponse.json(
      { error: "ElevenLabs TTS is not enabled." },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => null);
  const text = body && typeof body === "object" && "text" in body
    ? (body as { text?: unknown }).text
    : null;

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "A non-empty text value is required." }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.` },
      { status: 413 }
    );
  }

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({ text: text.trim(), model_id: MODEL_ID }),
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `ElevenLabs request failed (${response.status})`, detail: detail.slice(0, 500) },
        { status: response.status >= 500 ? 502 : 400 }
      );
    }

    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ElevenLabs request failed." },
      { status: 502 }
    );
  }
}
