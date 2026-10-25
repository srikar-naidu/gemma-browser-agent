"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { OrbState } from "@/lib/types";

interface OllamaSession {
  orbState: OrbState;
  active: boolean;
  connecting: boolean;
  error: string | null;
  activate: () => Promise<void>;
  deactivate: () => void;
  getLevel: () => number;
  notifySystem: (text: string) => void;
}

/*
 * ------------------------------------------------------------
 * Speech Recognition Types
 * ------------------------------------------------------------
 */

interface SpeechRecognitionResultLike {
  [index: number]: {
    transcript: string;
  };
}

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;

  start: () => void;
  stop: () => void;

  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionLike;

/*
 * ------------------------------------------------------------
 * Ollama Response Types
 * ------------------------------------------------------------
 */

interface OllamaToolResult {
  success?: boolean;
  message?: string;
  data?: {
    action?: string;
    url?: string;
    query?: string;
    [key: string]: unknown;
  };
}

interface OllamaTool {
  name?: string;
  args?: Record<string, unknown>;
  result?: OllamaToolResult;
}

interface OllamaResponse {
  model?: string;
  message?: {
    role?: string;
    content?: string;
  };
  tool?: OllamaTool | null;
  error?: string;
  details?: string;
}

/*
 * ------------------------------------------------------------
 * Browser globals
 * ------------------------------------------------------------
 */

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

/*
 * ------------------------------------------------------------
 * Hook
 * ------------------------------------------------------------
 */

export function useOllamaSession(): OllamaSession {
  const [orbState, setOrbState] =
    useState<OrbState>("idle");

  const [active, setActive] = useState(false);

  const [connecting, setConnecting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * ----------------------------------------------------------
   * Refs
   * ----------------------------------------------------------
   */

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(null);

  const activeRef =
    useRef(false);

  const speakingRef =
    useRef(false);

  const processingRef =
    useRef(false);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const restartTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * ----------------------------------------------------------
   * Convex mutations
   * ----------------------------------------------------------
   */

  const upsertStreaming =
    useMutation(api.messages.upsertStreaming);

  const finalizeMessage =
    useMutation(api.messages.finalize);

  const logTimeline =
    useMutation(api.timeline.log);

  const setVoiceState =
    useMutation(api.voiceState.set);

  /*
   * ------------------------------------------------------------
   * Resume listening after speech
   * ------------------------------------------------------------
   */

  const resumeListeningAfterSpeech =
    useCallback(() => {
      speakingRef.current = false;

      if (!activeRef.current) {
        setOrbState("idle");
        return;
      }

      setOrbState("listening");

      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }

      restartTimerRef.current = setTimeout(() => {
        if (!activeRef.current) return;

        if (speakingRef.current) {
          return;
        }

        if (processingRef.current) {
          return;
        }

        try {
          recognitionRef.current?.start();
        } catch {
          /*
           * Chrome may throw if recognition is already running.
           * Ignore that race.
           */
        }
      }, 300);
    }, []);

  /*
   * ------------------------------------------------------------
   * Text To Speech
   * ------------------------------------------------------------
   */

  const speak = useCallback(
    (text: string) => {
      const cleanText = String(text ?? "").trim();

      if (!cleanText) {
        return;
      }

      /*
       * Stop previous speech.
       */

      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore.
      }

      /*
       * Stop listening while Jarvis speaks.
       */

      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore recognition stop race.
      }

      speakingRef.current = true;

      setOrbState("speaking");

      const utterance =
        new SpeechSynthesisUtterance(cleanText);

      utterance.lang = "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 0.9;
      utterance.volume = 1;

      utterance.onend =
        resumeListeningAfterSpeech;

      utterance.onerror =
        resumeListeningAfterSpeech;

      window.speechSynthesis.speak(utterance);
    },
    [resumeListeningAfterSpeech]
  );

  /*
   * ------------------------------------------------------------
   * Browser Tool Actions
   * ------------------------------------------------------------
   */

  const executeBrowserTool = useCallback(
    (response: OllamaResponse): string | null => {
      const tool = response.tool;

      if (!tool) {
        return null;
      }

      const result = tool.result;

      if (!result?.success) {
        return (
          result?.message ??
          "I could not complete that action."
        );
      }

      const data = result.data;

      if (!data) {
        return (
          result.message ??
          "Action completed."
        );
      }

      /*
       * --------------------------------------------------------
       * OPEN WEBSITE
       * --------------------------------------------------------
       */

      if (data.action === "open_website") {
        const url = data.url?.trim();

        if (!url) {
          return "No website URL was provided.";
        }

        try {
          const opened = window.open(
            url,
            "_blank",
            "noopener,noreferrer"
          );

          if (!opened) {
            window.location.href = url;
          }

          return (
            result.message ??
            `Opening ${url}`
          );
        } catch (browserError) {
          console.error(
            "[jarvis] Failed to open website:",
            browserError
          );

          return `I could not open ${url}.`;
        }
      }

      /*
       * --------------------------------------------------------
       * WEB SEARCH
       * --------------------------------------------------------
       */

      if (data.action === "web_search") {
        const query = data.query?.trim();

        if (!query) {
          return "No search query was provided.";
        }

        const searchUrl =
          `https://www.google.com/search?q=${encodeURIComponent(
            query
          )}`;

        try {
          const opened = window.open(
            searchUrl,
            "_blank",
            "noopener,noreferrer"
          );

          if (!opened) {
            window.location.href = searchUrl;
          }

          return (
            result.message ??
            `Searching for ${query}`
          );
        } catch (browserError) {
          console.error(
            "[jarvis] Failed to open search:",
            browserError
          );

          return `I could not search for ${query}.`;
        }
      }

      /*
       * --------------------------------------------------------
       * YOUTUBE PLAY
       * --------------------------------------------------------
       *
       * youtube_play is executed server-side through Playwright.
       * We only display the returned confirmation here.
       */

      if (data.action === "youtube_play") {
        return (
          result.message ??
          "YouTube playback started."
        );
      }

      /*
       * --------------------------------------------------------
       * Other tools
       * --------------------------------------------------------
       */

      return (
        result.message ??
        "Action completed."
      );
    },
    []
  );

  /*
   * ------------------------------------------------------------
   * Ask Ollama
   * ------------------------------------------------------------
   */

  const askOllama = useCallback(
    async (text: string) => {
      const cleanText = String(text ?? "").trim();

      if (!cleanText) {
        return;
      }

      /*
       * Don't send multiple requests simultaneously.
       */

      if (processingRef.current) {
        return;
      }

      processingRef.current = true;

      setError(null);
      setOrbState("thinking");

      const userItemId =
        `ollama-user-${crypto.randomUUID()}`;

      const assistantItemId =
        `ollama-assistant-${crypto.randomUUID()}`;

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      try {
        /*
         * ------------------------------------------------------
         * Save user message
         * ------------------------------------------------------
         */

        await upsertStreaming({
          itemId: userItemId,
          role: "user",
          text: cleanText,
        });

        await finalizeMessage({
          itemId: userItemId,
          role: "user",
          text: cleanText,
          interrupted: false,
        });

        void logTimeline({
          kind: "user_spoke",
          label: "User spoke",
          detail: cleanText.slice(0, 80),
        }).catch(() => { });

        /*
         * ------------------------------------------------------
         * Ask Friday/Ollama
         * ------------------------------------------------------
         */

        const response = await fetch(
          "/api/ollama/chat",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              messages: [
                {
                  role: "user",
                  content: cleanText,
                },
              ],
            }),

            signal: controller.signal,
          }
        );

        /*
         * ------------------------------------------------------
         * Read response
         * ------------------------------------------------------
         */

        const contentType =
          response.headers.get("content-type") ??
          "";

        /*
         * Current API returns JSON.
         */

        if (
          contentType.includes(
            "application/json"
          )
        ) {
          const data =
            (await response.json()) as OllamaResponse;

          if (!response.ok) {
            throw new Error(
              data.details ??
              data.error ??
              `Jarvis API failed (${response.status})`
            );
          }

          /*
           * Tool result.
           */

          const browserMessage =
            executeBrowserTool(data);

          const answer =
            browserMessage ??
            data.message?.content ??
            "";

          if (!answer.trim()) {
            throw new Error(
              "Jarvis returned an empty response."
            );
          }

          /*
           * Show assistant response.
           */

          await upsertStreaming({
            itemId: assistantItemId,
            role: "assistant",
            text: answer,
          });

          await finalizeMessage({
            itemId: assistantItemId,
            role: "assistant",
            text: answer,
            interrupted: false,
          });

          void logTimeline({
            kind: "response_generated",
            label: "Response generated",
            detail: answer.slice(0, 100),
          }).catch(() => { });

          /*
           * Speak response.
           */

          speak(answer);

          return;
        }

        /*
         * ------------------------------------------------------
         * Streaming fallback
         * ------------------------------------------------------
         */

        if (!response.ok) {
          const errorText =
            await response.text().catch(
              () => ""
            );

          throw new Error(
            `Jarvis API failed (${response.status})${errorText
              ? `: ${errorText.slice(0, 500)}`
              : ""
            }`
          );
        }

        if (!response.body) {
          throw new Error(
            "Jarvis response body is not readable."
          );
        }

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder();

        let buffer = "";
        let answer = "";

        while (true) {
          const {
            done,
            value,
          } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(
            value,
            {
              stream: true,
            }
          );

          const lines =
            buffer.split("\n");

          buffer =
            lines.pop() ?? "";

          for (const line of lines) {
            const trimmed =
              line.trim();

            if (!trimmed) {
              continue;
            }

            try {
              const chunk =
                JSON.parse(trimmed);

              const token =
                chunk?.message?.content ??
                "";

              if (!token) {
                continue;
              }

              answer += token;

              await upsertStreaming({
                itemId: assistantItemId,
                role: "assistant",
                text: answer,
              });
            } catch (parseError) {
              console.warn(
                "[jarvis] Stream parse warning:",
                parseError
              );
            }
          }
        }

        /*
         * Decode remaining bytes.
         */

        buffer += decoder.decode();

        if (buffer.trim()) {
          const lines =
            buffer.split("\n");

          for (const line of lines) {
            const trimmed =
              line.trim();

            if (!trimmed) {
              continue;
            }

            try {
              const chunk =
                JSON.parse(trimmed);

              const token =
                chunk?.message?.content ??
                "";

              if (token) {
                answer += token;

                await upsertStreaming({
                  itemId: assistantItemId,
                  role: "assistant",
                  text: answer,
                });
              }
            } catch {
              // Ignore incomplete final chunk.
            }
          }
        }

        if (!answer.trim()) {
          throw new Error(
            "Jarvis returned an empty response."
          );
        }

        await finalizeMessage({
          itemId: assistantItemId,
          role: "assistant",
          text: answer,
          interrupted: false,
        });

        void logTimeline({
          kind: "response_generated",
          label: "Response generated",
          detail: answer.slice(0, 100),
        }).catch(() => { });

        speak(answer);
      } catch (err) {
        /*
         * ------------------------------------------------------
         * Abort
         * ------------------------------------------------------
         */

        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : String(err);

        console.error(
          "[jarvis] Ollama error:",
          err
        );

        setError(message);
        setOrbState("error");

        window.setTimeout(() => {
          if (activeRef.current) {
            setOrbState("listening");
          }
        }, 1500);
      } finally {
        processingRef.current = false;

        abortControllerRef.current = null;
      }
    },
    [
      executeBrowserTool,
      finalizeMessage,
      logTimeline,
      speak,
      upsertStreaming,
    ]
  );

  /*
   * ------------------------------------------------------------
   * Activate Jarvis
   * ------------------------------------------------------------
   */

  const activate = useCallback(
    async () => {
      if (
        activeRef.current ||
        connecting
      ) {
        return;
      }

      setConnecting(true);
      setError(null);

      try {
        const SpeechRecognition =
          window.SpeechRecognition ??
          window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
          throw new Error(
            "Speech recognition is not supported. Please use Google Chrome or Microsoft Edge."
          );
        }

        const recognition =
          new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        /*
         * ------------------------------------------------------
         * Recognition started
         * ------------------------------------------------------
         */

        recognition.onstart = () => {
          if (!speakingRef.current) {
            setOrbState("listening");
          }
        };

        /*
         * ------------------------------------------------------
         * Speech detected
         * ------------------------------------------------------
         */

        recognition.onresult = (
          event
        ) => {
          if (speakingRef.current) {
            return;
          }

          if (processingRef.current) {
            return;
          }

          const indexes =
            Object.keys(
              event.results
            );

          if (indexes.length === 0) {
            return;
          }

          const lastIndex =
            Number(
              indexes[
              indexes.length - 1
              ]
            );

          const result =
            event.results[lastIndex];

          if (!result) {
            return;
          }

          const text =
            result[0]?.transcript?.trim();

          if (!text) {
            return;
          }

          console.log(
            "[jarvis] Speech recognized:",
            text
          );

          void askOllama(text);
        };

        /*
         * ------------------------------------------------------
         * IMPORTANT:
         * Speech Recognition Error Handler
         * ------------------------------------------------------
         */

        recognition.onerror = (
          event
        ) => {
          const errorType =
            event?.error;

          /*
           * ----------------------------------------------------
           * NORMAL CONDITIONS
           * ----------------------------------------------------
           *
           * no-speech:
           * User didn't speak.
           *
           * aborted:
           * Recognition was stopped manually or by Chrome.
           *
           * Neither should appear as errors.
           */

          if (
            errorType === "no-speech" ||
            errorType === "aborted"
          ) {
            return;
          }

          /*
           * ----------------------------------------------------
           * REAL ERROR LOG
           * ----------------------------------------------------
           */

          console.warn(
            "[jarvis] Speech recognition error:",
            {
              error: errorType,
              message: event?.message,
            }
          );

          /*
           * ----------------------------------------------------
           * MICROPHONE PERMISSION
           * ----------------------------------------------------
           */

          if (
            errorType === "not-allowed" ||
            errorType ===
            "service-not-allowed"
          ) {
            activeRef.current = false;

            setActive(false);
            setOrbState("error");

            setError(
              "Microphone or speech recognition permission denied. Allow microphone access in Chrome."
            );

            try {
              recognition.stop();
            } catch {
              // Ignore.
            }

            return;
          }

          /*
           * ----------------------------------------------------
           * MICROPHONE NOT AVAILABLE
           * ----------------------------------------------------
           */

          if (
            errorType ===
            "audio-capture"
          ) {
            setOrbState("error");

            setError(
              "Microphone could not be accessed. Check whether another application is using your microphone."
            );

            return;
          }

          /*
           * ----------------------------------------------------
           * NETWORK ERROR
           * ----------------------------------------------------
           */

          if (
            errorType === "network"
          ) {
            setError(
              "Speech recognition network error. Check your internet connection."
            );

            /*
             * Keep Jarvis active.
             * onend will attempt restart.
             */

            return;
          }

          /*
           * ----------------------------------------------------
           * UNKNOWN ERROR
           * ----------------------------------------------------
           */

          setError(
            `Speech recognition error: ${errorType ?? "unknown"
            }`
          );
        };

        /*
         * ------------------------------------------------------
         * Recognition ended
         * ------------------------------------------------------
         *
         * Automatically restart recognition when Jarvis
         * is still active.
         */

        recognition.onend = () => {
          if (!activeRef.current) {
            return;
          }

          if (speakingRef.current) {
            return;
          }

          if (processingRef.current) {
            return;
          }

          if (restartTimerRef.current) {
            clearTimeout(
              restartTimerRef.current
            );
          }

          restartTimerRef.current =
            setTimeout(() => {
              if (
                !activeRef.current ||
                speakingRef.current ||
                processingRef.current
              ) {
                return;
              }

              try {
                recognition.start();
              } catch {
                /*
                 * Already running.
                 * Ignore Chrome race.
                 */
              }
            }, 500);
        };

        /*
         * Store recognition.
         */

        recognitionRef.current =
          recognition;

        /*
         * Mark Jarvis active.
         */

        activeRef.current = true;

        setActive(true);
        setOrbState("listening");

        /*
         * Convex shared voice state.
         */

        void setVoiceState({
          orbState: "listening",
          sessionActive: true,
        }).catch(() => { });

        /*
         * Timeline.
         */

        void logTimeline({
          kind: "completed",
          label: "Jarvis online",
          detail:
            "Ollama/Gemma 4 E2B voice session active",
        }).catch(() => { });

        /*
         * Start microphone.
         */

        recognition.start();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : String(err);

        console.error(
          "[jarvis] Ollama activation failed:",
          err
        );

        setError(message);
        setOrbState("error");

        activeRef.current = false;

        setActive(false);
      } finally {
        setConnecting(false);
      }
    },
    [
      askOllama,
      connecting,
      logTimeline,
      setVoiceState,
    ]
  );

  /*
   * ------------------------------------------------------------
   * Deactivate Jarvis
   * ------------------------------------------------------------
   */

  const deactivate =
    useCallback(() => {
      activeRef.current = false;

      processingRef.current = false;

      /*
       * Cancel pending restart timer.
       */

      if (restartTimerRef.current) {
        clearTimeout(
          restartTimerRef.current
        );

        restartTimerRef.current = null;
      }

      /*
       * Cancel Ollama request.
       */

      abortControllerRef.current?.abort();

      abortControllerRef.current = null;

      /*
       * Stop recognition.
       */

      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore.
      }

      recognitionRef.current = null;

      /*
       * Stop speech.
       */

      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore.
      }

      speakingRef.current = false;

      /*
       * UI state.
       */

      setActive(false);
      setOrbState("idle");
      setError(null);

      /*
       * Convex shared voice state.
       */

      void setVoiceState({
        orbState: "idle",
        sessionActive: false,
      }).catch(() => { });
    }, [setVoiceState]);

  /*
   * ------------------------------------------------------------
   * System Notification
   * ------------------------------------------------------------
   */

  const notifySystem =
    useCallback(
      (text: string) => {
        if (!activeRef.current) {
          return;
        }

        void askOllama(text);
      },
      [askOllama]
    );

  /*
   * ------------------------------------------------------------
   * Orb Animation Level
   * ------------------------------------------------------------
   */

  const getLevel =
    useCallback(() => {
      /*
       * Speaking.
       */

      if (speakingRef.current) {
        return (
          0.55 +
          Math.random() * 0.25
        );
      }

      /*
       * Listening.
       */

      if (activeRef.current) {
        return (
          0.15 +
          Math.random() * 0.15
        );
      }

      /*
       * Idle.
       */

      return 0;
    }, []);

  /*
   * ------------------------------------------------------------
   * Return
   * ------------------------------------------------------------
   */

  return {
    orbState,
    active,
    connecting,
    error,
    activate,
    deactivate,
    getLevel,
    notifySystem,
  };
}
