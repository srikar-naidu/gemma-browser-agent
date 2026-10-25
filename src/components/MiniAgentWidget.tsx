"use client";

import { motion } from "framer-motion";
import { ORB_STATE_LABELS, OrbState } from "@/lib/types";

interface MiniAgentWidgetProps {
  active: boolean;
  state: OrbState;
  mirroring: boolean;
  connecting: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

export function MiniAgentWidget({
  active,
  state,
  mirroring,
  connecting,
  onActivate,
  onDeactivate,
}: MiniAgentWidgetProps) {
  const status = connecting
    ? "Initializing"
    : active
      ? mirroring
        ? "Linked"
        : ORB_STATE_LABELS[state]
      : "Standby";

  return (
    <div className="mini-agent-shell" aria-live="polite">
      <div className="mini-agent-widget">
        <div className="mini-agent-mark" aria-hidden="true">
          <motion.span
            className="mini-agent-core"
            animate={active ? { scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] } : { scale: 1, opacity: 0.45 }}
            transition={active ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
          />
          <span className="mini-agent-ring mini-agent-ring-one" />
          <span className="mini-agent-ring mini-agent-ring-two" />
        </div>

        <div className="mini-agent-copy">
          <div className="mini-agent-name">JARVIS</div>
          <div className="mini-agent-status">
            <span className={active ? "mini-agent-dot active" : "mini-agent-dot"} />
            {status}
          </div>
        </div>

        <button
          type="button"
          className="mini-agent-action"
          onClick={active ? onDeactivate : onActivate}
          disabled={connecting}
          aria-label={active ? "Stand down Jarvis" : "Activate Jarvis"}
        >
          <span>{connecting ? "…" : active ? "×" : "↗"}</span>
        </button>
      </div>
    </div>
  );
}
