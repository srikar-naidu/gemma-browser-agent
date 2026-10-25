import { NextResponse } from "next/server";
import {
  buildFridayMessages,
  parseFridayDecision,
} from "@/lib/fridayBrain";
import type { ChatMessage } from "@/lib/types";
import { executeTool } from "@/lib/tools";

const OLLAMA_URL =
  process.env.OLLAMA_URL ?? "http://127.0.0.1:11434/api/chat";

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const MODEL = process.env.OLLAMA_MODEL ?? "gemma4:e2b";

const REQUEST_TIMEOUT_MS = 180_000;

/*
 * ------------------------------------------------------------
 * Request validation
 * ------------------------------------------------------------
 */

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

/*
 * ------------------------------------------------------------
 * Get latest user message
 * ------------------------------------------------------------
 */

function getLatestUserMessage(
  messages: ChatMessage[]
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      return messages[i].content.trim();
    }
  }

  return "";
}

/*
 * ------------------------------------------------------------
 * Deterministic YouTube playback detection
 *
 * This runs BEFORE trusting the LLM tool decision.
 *
 * Examples:
 *
 * "open YouTube and play Aaya Sher"
 * "play Aaya Sher on YouTube"
 * "play the Aaya Sher song on YouTube"
 * "search YouTube for Iris and play it"
 *
 * -> youtube_play
 * ------------------------------------------------------------
 */

function detectYouTubePlayRequest(
  text: string
): string | null {
  const original = text.trim();

  if (!original) {
    return null;
  }

  const lower = original.toLowerCase();

  const mentionsYouTube =
    /\byou\s*tube\b/i.test(original) ||
    /\byoutube\b/i.test(original);

  const mentionsPlay =
    /\bplay\b/i.test(original) ||
    /\bplaying\b/i.test(original) ||
    /\bplay\s+the\b/i.test(original);

  const mentionsSong =
    /\bsong\b/i.test(original) ||
    /\bmusic\b/i.test(original) ||
    /\btrack\b/i.test(original);

  /*
   * Must clearly be a YouTube playback request.
   *
   * We also allow:
   * "play Iris"
   *
   * because the user may already be talking to Jarvis
   * and expect YouTube playback.
   */
  if (!mentionsPlay) {
    return null;
  }

  if (!mentionsYouTube && !mentionsSong) {
    return null;
  }

  let query = original;

  /*
   * Remove common command prefixes.
   */
  query = query
    .replace(
      /^\s*(hi|hello|hey)\s+jarvis[\s,:-]*/i,
      ""
    )
    .trim();

  /*
   * Remove "open YouTube".
   */
  query = query.replace(
    /\bopen\s+(?:the\s+)?you\s*tube\b/gi,
    ""
  );

  /*
   * Remove "search YouTube for".
   */
  query = query.replace(
    /\bsearch\s+(?:on\s+)?(?:the\s+)?you\s*tube\s+(?:for\s+)?/gi,
    ""
  );

  /*
   * Remove "search for".
   */
  query = query.replace(
    /\bsearch\s+for\b/gi,
    ""
  );

  /*
   * Remove playback command.
   */
  query = query.replace(
    /\bplay(?:ing)?\b/gi,
    ""
  );

  /*
   * Remove common YouTube phrases.
   */
  query = query.replace(
    /\bon\s+(?:the\s+)?you\s*tube\b/gi,
    ""
  );

  query = query.replace(
    /\b(?:on\s+)?you\s*tube\b/gi,
    ""
  );

  /*
   * Remove "the song", "song", "music", "track".
   */
  query = query.replace(
    /\bthe\s+(?:song|music|track)\b/gi,
    ""
  );

  query = query.replace(
    /\b(?:song|music|track)\b/gi,
    ""
  );

  /*
   * Remove common filler words.
   */
  query = query.replace(
    /^\s*(?:for|called|named)\s+/i,
    ""
  );

  query = query.replace(
    /\s+(?:and\s+)?play(?:\s+the)?\s*$/i,
    ""
  );

  query = query
    .replace(/\s+/g, " ")
    .replace(/^[\s,:-]+|[\s,:-]+$/g, "")
    .trim();

  /*
   * Safety fallback:
   *
   * If extraction accidentally becomes empty,
   * don't override the LLM.
   */
  if (!query) {
    return null;
  }

  console.log(
    `[jarvis] Deterministic YouTube intent detected: "${query}"`
  );

  return query;
}

/*
 * ------------------------------------------------------------
 * Ollama
 * ------------------------------------------------------------
 */

async function askOllama(
  messages: ChatMessage[]
): Promise<string> {
  const controller = new AbortController();

  const timeoutId = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (OLLAMA_API_KEY) {
      headers.Authorization = `Bearer ${OLLAMA_API_KEY}`;
    }

    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.4,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Ollama request failed (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();

    return data?.message?.content ?? "";
  } finally {
    clearTimeout(timeoutId);
  }
}

/*
 * ------------------------------------------------------------
 * Execute tool and return response
 * ------------------------------------------------------------
 */

async function runTool(
  name: string,
  args: Record<string, unknown>
) {
  console.log(
    `[jarvis] Executing tool: ${name}`,
    args
  );

  const toolResult = await executeTool(name, args);

  if (!toolResult.success) {
    return NextResponse.json({
      model: MODEL,
      message: {
        role: "assistant",
        content:
          `I couldn't complete that request. ` +
          toolResult.message,
      },
      tool: {
        name,
        args,
        result: toolResult,
      },
    });
  }

  return NextResponse.json({
    model: MODEL,
    message: {
      role: "assistant",
      content: toolResult.message,
    },
    tool: {
      name,
      args,
      result: toolResult,
    },
  });
}

/*
 * ------------------------------------------------------------
 * POST
 * ------------------------------------------------------------
 */

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

    const messages = body.messages;

    /*
     * --------------------------------------------------------
     * STEP 1
     * Deterministic YouTube playback detection.
     *
     * This happens BEFORE Ollama.
     * --------------------------------------------------------
     */

    const latestUserMessage =
      getLatestUserMessage(messages);

    const youtubeQuery =
      detectYouTubePlayRequest(latestUserMessage);

    if (youtubeQuery) {
      console.log(
        `[jarvis] Direct youtube_play: ${youtubeQuery}`
      );

      return runTool("youtube_play", {
        query: youtubeQuery,
      });
    }

    /*
     * --------------------------------------------------------
     * STEP 2
     * Friday reasoning/tool selection.
     * --------------------------------------------------------
     */

    const fridayMessages =
      buildFridayMessages(messages);

    const rawFridayResponse =
      await askOllama(fridayMessages);

    if (!rawFridayResponse.trim()) {
      throw new Error(
        "Friday returned an empty response."
      );
    }

    console.log(
      "[jarvis] Friday decision:",
      rawFridayResponse
    );

    const decision =
      parseFridayDecision(rawFridayResponse);

    /*
     * --------------------------------------------------------
     * NORMAL ANSWER
     * --------------------------------------------------------
     */

    if (decision.type === "answer") {
      return NextResponse.json({
        model: MODEL,
        message: {
          role: "assistant",
          content: decision.text,
        },
        tool: null,
      });
    }

    /*
     * --------------------------------------------------------
     * TOOL REQUEST
     * --------------------------------------------------------
     */

    return runTool(
      decision.name,
      decision.args
    );
  } catch (error) {
    console.error(
      "[jarvis] Friday/Ollama error:",
      error
    );

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return NextResponse.json(
        {
          error:
            `Friday/Ollama did not respond within ` +
            `${REQUEST_TIMEOUT_MS / 1000} seconds.`,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Could not connect to Friday/Ollama.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
