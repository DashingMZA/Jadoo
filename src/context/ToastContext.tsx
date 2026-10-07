"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export interface ToastAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface ToastOptions {
  /** Agar diya to is id wala purana toast replace ho jata hai (duplicate nahi banta). */
  id?: string;
  actions?: ToastAction[];
  /** false ho to khud-ba-khud gayab nahi hota (jaise update-available banner). */
  autoDismiss?: boolean;
  durationMs?: number;
}

interface Toast extends ToastOptions {
  id: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = options?.id ?? `toast-${++counter}`;
      const autoDismiss = options?.autoDismiss ?? !options?.actions;
      const durationMs = options?.durationMs ?? 4000;

      setToasts((prev) => [...prev.filter((t) => t.id !== id), { ...options, id, message }]);

      const existingTimer = timers.current.get(id);
      if (existingTimer) clearTimeout(existingTimer);

      if (autoDismiss) {
        const timer = setTimeout(() => dismissToast(id), durationMs);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            <div className="toast-row">
              <span className="toast-message">{toast.message}</span>
              <button className="toast-close" onClick={() => dismissToast(toast.id)}>
                ×
              </button>
            </div>
            {toast.actions && toast.actions.length > 0 && (
              <div className="toast-actions">
                {toast.actions.map((action, i) => (
                  <button
                    key={i}
                    className={action.primary ? "primary" : ""}
                    onClick={() => {
                      action.onClick();
                      dismissToast(toast.id);
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
