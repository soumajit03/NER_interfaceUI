import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

interface Props {
  onAuthSuccess: () => void
  initialMode?: "signin" | "signup"
  asModal?: boolean
  onClose?: () => void
}

export default function AuthPage({ onAuthSuccess, initialMode = "signin", asModal = false, onClose }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup")
  const [loading, setLoading] = useState(false)
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<"google" | "github" | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const oauthRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim() || window.location.origin

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get("error")
    const errorDescription = params.get("error_description")

    if (error) {
      setMessage(errorDescription ?? error)
      params.delete("error")
      params.delete("error_description")
      const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
      window.history.replaceState({}, "", cleanUrl)
    }
  }, [])

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage("Email and password are required")
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage("Account created. Check your email for confirmation if enabled.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuthSuccess()
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: "google" | "github") => {
    setLoading(true)
    setOauthLoadingProvider(provider)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: oauthRedirectUrl,
        },
      })
      if (error) throw error
    } catch (error) {
      const base = error instanceof Error ? error.message : "OAuth sign in failed"
      setMessage(
        `${base}. Confirm ${provider} provider is enabled in Supabase and callback URL is configured.`,
      )
      setLoading(false)
      setOauthLoadingProvider(null)
    }
  }

  const content = (
    <div
      className="section-container"
      style={{ width: "100%", maxWidth: 460, background: "rgba(4, 8, 18, 0.86)" }}
    >
      {asModal && onClose && (
        <div className="auth-modal-head">
          <h1 style={{ marginTop: 0 }}>{isSignUp ? "Create account" : "Sign in"}</h1>
          <button className="ghost-btn" onClick={onClose}>✕</button>
        </div>
      )}
      {!asModal && <h1 style={{ marginTop: 0 }}>{isSignUp ? "Create account" : "Sign in"}</h1>}
        <p style={{ opacity: 0.85, marginTop: 0 }}>
          Access mythological NER with saved history and uploads.
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="app-textarea"
            style={{ minHeight: "auto", padding: 10 }}
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="app-textarea"
            style={{ minHeight: "auto", padding: 10 }}
          />
          <button className="primary-btn" onClick={handleEmailAuth} disabled={loading}>
            {loading ? "Please wait..." : isSignUp ? "Sign up" : "Sign in"}
          </button>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <button className="ghost-btn" onClick={() => handleOAuth("google")} disabled={loading}>
            {oauthLoadingProvider === "google" ? "Redirecting to Google..." : "Continue with Google"}
          </button>
          <button className="ghost-btn" onClick={() => handleOAuth("github")} disabled={loading}>
            {oauthLoadingProvider === "github" ? "Redirecting to GitHub..." : "Continue with GitHub"}
          </button>
        </div>

        <p style={{ marginTop: 16 }}>
          {isSignUp ? "Already have an account?" : "New here?"}{" "}
          <button onClick={() => setIsSignUp((value) => !value)} disabled={loading}>
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>

      {message && <p style={{ color: "#f6d365" }}>{message}</p>}
    </div>
  )

  if (asModal) {
    return (
      <div className="auth-modal-backdrop" onClick={onClose}>
        <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="overlay auth-page-shell">
      {content}
    </div>
  )
}
