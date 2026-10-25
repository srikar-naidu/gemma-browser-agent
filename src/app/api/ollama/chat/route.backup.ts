import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434/api/chat";
const MODEL = process.env.OLLAMA_MODEL ?? "gemma4:e2b";
const REQUEST_TIMEOUT_MS = 30_000;

interface ChatMessage {
  role: string;
  content: string;
}

function isValidMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (m) =>
        m &&
        typeof m === "object" &&
        typeof (m as ChatMessage).role === "string" &&
        typeof (m as ChatMessage).content === "string" &&
        (m as ChatMessage).content.trim().length > 0
    )
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !isValidMessages(body.messages)) {
      return NextResponse.json(
        {
          error:
            "Invalid request: 'messages' must be a non-empty array of { role, content } objects.",
        },
        { status: 400 }
      );
    }

    // Point 2 fix: bound how long we'll wait on Ollama.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: body.messages,
          stream: true,
          options: {
            temperature: 0.4,
          },
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          { error: `Ollama did not respond within ${REQUEST_TIMEOUT_MS / 1000}s.` },
          { status: 504 }
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: "Ollama request failed",
          details: errorText,
        },
        {
          status: response.status,
        }
      );
    }

    if (!response.body) {
      return NextResponse.json(
        {
          error: "Ollama returned no response body",
        },
        {
          status: 500,
        }
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[ollama]", error);

    return NextResponse.json(
      {
        error: "Could not connect to Ollama",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * NOTE on point 4 (public deploy exposure):
 * This route has no auth or rate limiting. That's fine for local-only use,
 * but if this is deployed publicly (e.g. Vercel) and pointed at a real
 * Ollama endpoint, anyone can call it. Options if you keep the public deploy:
 *   - Add a simple shared-secret header check (compare against process.env.API_SECRET)
 *   - Add rate limiting (e.g. Vercel's built-in, or Upstash Ratelimit)
 *   - Or simplest: don't expose this route publicly — keep Jarvis on localhost only.
 */
