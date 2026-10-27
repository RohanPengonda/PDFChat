import { useState } from "react";
import { Lock, Loader2, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { api } from "../lib/api";

interface LoginScreenProps {
  onAuthenticated: () => void;
  isDark?: boolean;
}

// Simple shared-secret login: the user pastes an access token configured on the
// server (AUTH_TOKEN / AUTH_TOKENS). The token is sent to the server which sets
// it as an HttpOnly cookie, so JavaScript cannot read it (XSS protection).
export function LoginScreen({ onAuthenticated, isDark = false }: LoginScreenProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const status = await api.login(token.trim());
      if (status.authenticated) {
        onAuthenticated();
        return;
      }
      setError("That access token isn't valid. Please try again.");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const bg = isDark ? "bg-[#161b27]" : "bg-[#ede8e0]";
  const card = isDark ? "bg-[#1e2433] border-[#2d3548]" : "bg-white border-[#e0d8cc]";
  const text = isDark ? "text-[#e8eaf0]" : "text-[#2c2416]";
  const subtext = isDark ? "text-[#6b7a99]" : "text-[#8a7d6b]";
  const inputBg = isDark
    ? "bg-[#161b27] border-[#2d3548] text-[#e8eaf0]"
    : "bg-[#faf8f5] border-[#d8d0c4] text-[#2c2416]";
  const btn = isDark
    ? "bg-[#2979ff] text-white hover:bg-[#1f6fef]"
    : "bg-[#b5651d] text-white hover:bg-[#9c5616]";

  return (
    <div
      className={clsx(
        "min-h-dvh flex items-center justify-center px-6 font-sans",
        bg,
      )}
    >
      <div
        className={clsx(
          "w-full max-w-sm rounded-2xl border p-8 shadow-xl",
          card,
        )}
      >
        <div className="flex items-center gap-2 mb-6">
          <span
            className={clsx(
              "inline-flex items-center justify-center w-9 h-9 rounded-lg",
              isDark ? "bg-[#252d40] text-[#5b9cf6]" : "bg-[#f0e5d8] text-[#b5651d]",
            )}
          >
            <Lock className="w-4 h-4" />
          </span>
          <div>
            <h1 className={clsx("text-base font-semibold", text)}>PDFChat</h1>
            <p className={clsx("text-xs", subtext)}>Enter your access token</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="token"
              className={clsx(
                "block text-[11px] font-semibold uppercase tracking-wider mb-1.5",
                subtext,
              )}
            >
              Access token
            </label>
            <input
              id="token"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token"
              className={clsx(
                "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2",
                inputBg,
                isDark ? "focus:ring-[#2979ff]/40" : "focus:ring-[#b5651d]/30",
              )}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 leading-snug">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || !token.trim()}
            className={clsx(
              "w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
              btn,
            )}
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
              </>
            ) : (
              <>
                Continue <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className={clsx("mt-5 text-[11px] leading-relaxed", subtext)}>
          Tokens are configured on the server via AUTH_TOKEN or AUTH_TOKENS.
        </p>

        <p className={clsx("mt-3 text-[10px] leading-relaxed", subtext)}>
          Forgot your token? Contact your server administrator — tokens cannot
          be recovered or reset from the app.
        </p>
      </div>
    </div>
  );
}
