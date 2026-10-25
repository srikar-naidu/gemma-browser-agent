
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { OrbState } from "@/lib/types";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  transcript: string;
}

interface SpeechRecognitionEventLike extends Event {
  results: {
    length: number;
    [index: number]: {
      [index: number]: SpeechRecognitionResultLike;
    };
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

type LocalSpeechRecognitionConstructor =
  new () => SpeechRecognitionLike;

interface LocalSpeechWindow {
  SpeechRecognition?: LocalSpeechRecognitionConstructor;
  webkitSpeechRecognition?: LocalSpeechRecognitionConstructor;
}

interface RealtimeSession {
  orbState: OrbState;
  active: boolean;
  connecting: boolean;
  error: string | null;
  activate: () => Promise<void>;
  deactivate: () => void;
  getLevel: () => number;
  notifySystem: (text: string) => void;
}

export function useRealtimeSession(): RealtimeSession {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const speakingRef = useRef(false);
  const orbStateRef = useRef<OrbState>("idle");

  const upsertStreaming = useMutation(api.messages.upsertStreaming);
  const finalizeMessage = useMutation(api.messages.finalize);
  const logTimeline = useMutation(api.timeline.log);
  const setVoiceState = useMutation(api.voiceState.set);

  const setState = useCallback(
    (state: OrbState) => {
      orbStateRef.current = state;
      setOrbState(state);

      void setVoiceState({
        orbState: state,
        sessionActive: activeRef.current,
      }).catch(() => { });
    },
    [setVoiceState]
  );

  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      if (
        typeof window === "undefined" ||
        !window.speechSynthesis
      ) {
        setState("idle");
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      utterance.lang = "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 0.9;
      utterance.volume = 1;

      utterance.onstart = () => {
        speakingRef.current = true;
        setState("speaking");
      };

      utterance.onend = () => {
        speakingRef.current = false;
        setState("idle");
      };

      utterance.onerror = () => {
        speakingRef.current = false;
        setState("idle");
      };

      window.speechSynthesis.speak(utterance);
    },
    [setState]
  );

  const askOllama = useCallback(
    async (userText: string) => {
      if (!userText.trim()) return;

      const itemId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `user - ${Date.now()} `;

      try {
        await upsertStreaming({
          itemId,
          role: "user",
          text: userText,
        });

        await finalizeMessage({
          itemId,
          role: "user",
          text: userText,
          interrupted: false,
        });

        setState("thinking");

        void logTimeline({
          kind: "user_spoke",
          label: "User spoke",
          detail: userText.slice(0, 80),
        }).catch(() => { });

        const response = await fetch("/api/ollama/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content:
                  "You are JARVIS, a helpful personal AI assistant. " +
                  "Answer naturally and concisely. " +
                  "You are running locally through Ollama using Gemma 4 E2B. " +
                  "Do not claim to have performed an action unless you actually did it.",
              },
              {
                role: "user",
                content: userText,
              },
            ],
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));

          throw new Error(
            data.details ||
            data.error ||
            `Ollama request failed(${response.status})`
          );
        }

        const reader = response.body?.getReader();

        if (!reader) {
          throw new Error(
            "Ollama response body is not readable"
          );
        }

        const decoder = new TextDecoder();

        let buffer = "";
        let answer = "";

        const assistantItemId =
          typeof crypto !== "undefined" &&
            crypto.randomUUID
            ? crypto.randomUUID()
            : `assistant - ${Date.now()} `;

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, {
            stream: true,
          });

          const lines = buffer.split("\n");

          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const chunk = JSON.parse(line);

              const token =
                chunk?.message?.content ??
                chunk?.response ??
                "";

              if (!token) continue;

              answer += token;

              await upsertStreaming({
                itemId: assistantItemId,
                role: "assistant",
                text: answer,
              });
            } catch {
              // Ignore incomplete JSON chunks.
            }
          }
        }

        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer);

            answer +=
              chunk?.message?.content ??
              chunk?.response ??
              "";
          } catch {
            // Ignore incomplete final JSON.
          }
        }

        if (!answer.trim()) {
          throw new Error(
            "Ollama returned an empty response"
          );
        }

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
          detail: answer.slice(0, 80),
        }).catch(() => { });

        speak(answer);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);

        console.error(
          "[jarvis] Ollama error:",
          err
        );

        setError(message);
        setState("error");

        window.setTimeout(() => {
          if (activeRef.current) {
            setState("idle");
          }
        }, 1500);
      }
    },
    [
      finalizeMessage,
      logTimeline,
      setState,
      speak,
      upsertStreaming,
    ]
  );

  const setupRecognition = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const speechWindow =
      window as unknown as LocalSpeechWindow;

    const SpeechRecognition =
      speechWindow.SpeechRecognition ??
      speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setState("listening");
    };

    recognition.onresult = (event) => {
      const result = event.results[0]?.[0];

      if (!result) return;

      const text = result.transcript.trim();

      if (!text) return;

      void askOllama(text);
    };

    recognition.onerror = (event) => {
      console.error(
        "[jarvis] speech recognition error:",
        event
      );

      if (activeRef.current) {
        setState("idle");
      }
    };

    recognition.onend = () => {
      if (
        activeRef.current &&
        !speakingRef.current &&
        orbStateRef.current !== "error"
      ) {
        setState("idle");
      }
    };

    return recognition;
  }, [askOllama, setState]);

  const activate = useCallback(async () => {
    if (activeRef.current || connecting) {
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      if (typeof window === "undefined") {
        throw new Error(
          "Browser environment required"
        );
      }

      const speechWindow =
        window as unknown as LocalSpeechWindow;

      const SpeechRecognition =
        speechWindow.SpeechRecognition ??
        speechWindow.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        throw new Error(
          "Speech recognition is not supported. Please use Google Chrome or Microsoft Edge."
        );
      }

      const recognition = setupRecognition();

      if (!recognition) {
        throw new Error(
          "Could not initialize speech recognition."
        );
      }

      recognitionRef.current = recognition;
      activeRef.current = true;

      setActive(true);
      setState("idle");

      void setVoiceState({
        orbState: "idle",
        sessionActive: true,
      }).catch(() => { });

      void logTimeline({
        kind: "completed",
        label: "Jarvis online",
        detail:
          "Ollama/Gemma 4 E2B local voice session",
      }).catch(() => { });

      recognition.start();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);

      console.error(
        "[jarvis] activation failed:",
        err
      );

      setError(message);
      activeRef.current = false;
      setActive(false);
      setState("error");
    } finally {
      setConnecting(false);
    }
  }, [
    connecting,
    logTimeline,
    setState,
    setVoiceState,
    setupRecognition,
  ]);

  const deactivate = useCallback(() => {
    activeRef.current = false;

    recognitionRef.current?.stop();
    recognitionRef.current = null;

    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }

    speakingRef.current = false;

    setActive(false);
    setState("idle");

    void setVoiceState({
      orbState: "idle",
      sessionActive: false,
    }).catch(() => { });
  }, [setState, setVoiceState]);

  const notifySystem = useCallback(
    (text: string) => {
      if (!activeRef.current) return;

      void askOllama(
        `System notification: ${text}. Acknowledge this briefly.`
      ).catch((err) => {
        console.error(
          "[jarvis] system notification error:",
          err
        );
      });
    },
    [askOllama]
  );

  const getLevel = useCallback(() => {
    if (orbState === "listening") {
      return (
        0.45 +
        Math.sin(Date.now() / 100) * 0.15
      );
    }

    if (orbState === "speaking") {
      return (
        0.35 +
        Math.sin(Date.now() / 80) * 0.2
      );
    }

    if (orbState === "thinking") {
      return (
        0.18 +
        Math.sin(Date.now() / 300) * 0.08
      );
    }

    return 0;
  }, [orbState]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();

      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!activeRef.current) return;

      void setVoiceState({
        orbState: orbStateRef.current,
        sessionActive: true,
      }).catch(() => { });
    }, 10000);

    return () => window.clearInterval(id);
  }, [setVoiceState]);

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

