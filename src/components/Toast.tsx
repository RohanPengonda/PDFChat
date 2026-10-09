import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { clsx } from "clsx";

type ToastType = "info" | "success" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

type PushToast = (message: string, type?: ToastType) => void;

const ToastContext = createContext<PushToast>(() => {});

export const useToast = () => useContext(ToastContext);

const styles: Record<ToastType, string> = {
  info: "bg-[#1e2433] border-[#2d3548] text-[#e8eaf0]",
  success: "bg-emerald-600 border-emerald-500 text-white",
  error: "bg-red-600 border-red-500 text-white",
};

const icons: Record<ToastType, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<PushToast>(
    (message, type = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={clsx(
                "flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm",
                styles[t.type],
              )}
              role="status"
            >
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1 break-words">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
