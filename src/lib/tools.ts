import { youtubePlay } from "@/lib/browser";

export type ToolResult = {
    success: boolean;
    message: string;
    data?: unknown;
};

export type ToolDefinition = {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
    {
        name: "open_website",
        description:
            "Open a website in the user's browser. Use this only when the user asks to open a website.",
        parameters: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "The full website URL to open.",
                },
            },
            required: ["url"],
        },
    },

    {
        name: "youtube_play",
        description:
            "Open YouTube, search for the requested song or video, and play the first matching video. Use this whenever the user asks to play a song or video on YouTube.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description:
                        "Only the song or video name. Remove words such as Jarvis, okay, please, play, open YouTube, search YouTube, etc.",
                },
            },
            required: ["query"],
        },
    },

    {
        name: "web_search",
        description:
            "Search the web for information when the user asks to search or find current information.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query.",
                },
            },
            required: ["query"],
        },
    },

    {
        name: "get_time",
        description: "Get the current local time.",
        parameters: {
            type: "object",
            properties: {},
        },
    },

    {
        name: "get_date",
        description: "Get the current date.",
        parameters: {
            type: "object",
            properties: {},
        },
    },
];

function cleanYouTubeQuery(input: string): string {
    let query = input.trim();

    if (!query) {
        return "";
    }

    /*
     * Remove common Jarvis voice-assistant prefixes.
     */
    query = query
        .replace(
            /^(okay|ok|hey|hi|hello|yo)\s+jarvis[\s,:-]*/i,
            ""
        )
        .replace(
            /^jarvis[\s,:-]*/i,
            ""
        )
        .replace(
            /^(please|can you|could you|would you)\s+/i,
            ""
        );

    /*
     * Remove command words.
     */
    query = query
        .replace(
            /^(open\s+youtube\s+and\s+)?/i,
            ""
        )
        .replace(
            /^(go\s+to\s+youtube\s+and\s+)?/i,
            ""
        )
        .replace(
            /^(search\s+(youtube|on\s+youtube)\s+for\s+)/i,
            ""
        )
        .replace(
            /^(search\s+for\s+)/i,
            ""
        )
        .replace(
            /^(find\s+)/i,
            ""
        )
        .replace(
            /^(play\s+)/i,
            ""
        );

    /*
     * Remove common conversational endings.
     */
    query = query
        .replace(
            /\s+(on\s+youtube|in\s+youtube)$/i,
            ""
        )
        .replace(
            /\s+(song|video)\s*$/i,
            ""
        )
        .trim();

    /*
     * Normalize some speech-recognition variations.
     */
    query = query
        .replace(/\baya\s+sher\b/gi, "Aaya Sher")
        .replace(/\bthe\s+aaya\s+sher\b/gi, "Aaya Sher")
        .replace(/\baaya\s+sher\b/gi, "Aaya Sher")
        .trim();

    return query;
}

export async function executeTool(
    name: string,
    args: Record<string, unknown>
): Promise<ToolResult> {
    switch (name) {
        /*
         * ------------------------------------------------------------
         * OPEN WEBSITE
         * ------------------------------------------------------------
         */
        case "open_website": {
            const url = String(args.url ?? "").trim();

            if (!url) {
                return {
                    success: false,
                    message: "No website URL was provided.",
                };
            }

            if (!/^https?:\/\/[^\s]+$/i.test(url)) {
                return {
                    success: false,
                    message:
                        "Only valid HTTP or HTTPS websites can be opened.",
                };
            }

            return {
                success: true,
                message: `Opening ${url}`,
                data: {
                    action: "open_website",
                    url,
                },
            };
        }

        /*
         * ------------------------------------------------------------
         * YOUTUBE PLAY
         * ------------------------------------------------------------
         */
        case "youtube_play": {
            const originalQuery = String(args.query ?? "").trim();

            if (!originalQuery) {
                return {
                    success: false,
                    message: "No YouTube search query was provided.",
                };
            }

            const query = cleanYouTubeQuery(originalQuery);

            if (!query) {
                return {
                    success: false,
                    message:
                        "I could not determine which YouTube song or video to play.",
                };
            }

            console.log(
                "[jarvis] YouTube play requested:",
                query
            );

            try {
                const result = await youtubePlay(query);

                return {
                    success: true,
                    message: result,
                    data: {
                        action: "youtube_play",
                        query,
                    },
                };
            } catch (error) {
                console.error(
                    "[jarvis] youtube_play failed:",
                    error
                );

                return {
                    success: false,
                    message:
                        error instanceof Error
                            ? error.message
                            : "Could not start YouTube playback.",
                };
            }
        }

        /*
         * ------------------------------------------------------------
         * WEB SEARCH
         * ------------------------------------------------------------
         */
        case "web_search": {
            const query = String(args.query ?? "").trim();

            if (!query) {
                return {
                    success: false,
                    message: "No search query was provided.",
                };
            }

            return {
                success: true,
                message: `Searching the web for "${query}"`,
                data: {
                    action: "web_search",
                    query,
                },
            };
        }

        /*
         * ------------------------------------------------------------
         * GET TIME
         * ------------------------------------------------------------
         */
        case "get_time": {
            const now = new Date();

            return {
                success: true,
                message: `The current time is ${now.toLocaleTimeString()}.`,
                data: {
                    time: now.toISOString(),
                },
            };
        }

        /*
         * ------------------------------------------------------------
         * GET DATE
         * ------------------------------------------------------------
         */
        case "get_date": {
            const now = new Date();

            return {
                success: true,
                message: `Today is ${now.toLocaleDateString()}.`,
                data: {
                    date: now.toISOString(),
                },
            };
        }

        /*
         * ------------------------------------------------------------
         * UNKNOWN TOOL
         * ------------------------------------------------------------
         */
        default: {
            return {
                success: false,
                message: `Unknown tool: ${name}`,
            };
        }
    }
}