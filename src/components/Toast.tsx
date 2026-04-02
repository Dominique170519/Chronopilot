"use client";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, type, onDismiss, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade-out
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const isSuccess = type === "success";

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium
        shadow-xl backdrop-blur-xl transition-all duration-300
        ${isSuccess
          ? "border-green-500/30 bg-green-500/15 text-green-200"
          : "border-red-500/30 bg-red-500/15 text-red-200"
        }
        ${visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}
      `}
    >
      <span className="text-base leading-none">
        {isSuccess ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </span>
      {message}
    </div>
  );
}
