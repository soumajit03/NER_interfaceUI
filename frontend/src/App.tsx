import { useEffect, useMemo, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import NamedEntityPage from "./pages/NamedEntityPage"
import HistoryPage from "./pages/HistoryPage"
import AuthPage from "./pages/AuthPage"
import LandingPage from "./pages/LandingPage"
import { supabase } from "./lib/supabase"

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin")

  const hasOAuthCallbackParams = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return (
      params.has("code") ||
      params.has("access_token") ||
      params.has("refresh_token") ||
      params.has("error")
    )
  }, [location.search])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setLoadingSession(false)

        if (data.session && hasOAuthCallbackParams) {
          navigate("/app/dashboard", { replace: true })
        }
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setLoadingSession(false)

      if (currentSession && hasOAuthCallbackParams) {
        navigate("/app/dashboard", { replace: true })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [hasOAuthCallbackParams, navigate])

  if (loadingSession) {
    return (
      <div className="overlay" style={{ display: "grid", placeItems: "center" }}>
        <div className="section-container">Loading session...</div>
      </div>
    )
  }

  const landing = (
    <>
      <div className="overlay">
        <LandingPage
          isAuthenticated={Boolean(session)}
          userEmail={session?.user.email}
          onSignInClick={() => {
            setAuthMode("signin")
            setIsAuthModalOpen(true)
          }}
          onSignUpClick={() => {
            setAuthMode("signup")
            setIsAuthModalOpen(true)
          }}
          onOpenDashboard={() => navigate("/app/dashboard")}
          onOpenHistory={() => navigate("/app/history")}
          onSignOut={() => {
            supabase.auth.signOut()
            navigate("/", { replace: true })
          }}
        />
      </div>

      {!session && isAuthModalOpen && (
        <AuthPage
          initialMode={authMode}
          asModal
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={() => {
            setIsAuthModalOpen(false)
            navigate("/app/dashboard", { replace: true })
          }}
        />
      )}
    </>
  )

  const workspaceShell = (content: React.ReactNode) => {
    if (!session) {
      return <Navigate to="/" replace />
    }

    return (
      <div className="overlay">
        <div className="app-header">
          <div>
            <button className="brand-home-link" onClick={() => navigate("/")}>Mythology NER Studio</button>
            <h1>Welcome {session.user.email}</h1>
          </div>
          <div className="app-header-actions">
            <button className="ghost-btn" onClick={() => navigate("/app/dashboard")}>Dashboard</button>
            <button className="ghost-btn" onClick={() => navigate("/app/history")}>History</button>
            <button
              className="ghost-btn"
              onClick={() => {
                supabase.auth.signOut()
                navigate("/", { replace: true })
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        {content}
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={landing} />
      <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/app/dashboard" element={workspaceShell(<NamedEntityPage />)} />
      <Route
        path="/app/history"
        element={workspaceShell(
          <HistoryPage
            onOpenInAnnotator={(item) => {
              sessionStorage.setItem("ner.pendingHistoryItem", JSON.stringify(item))
              navigate("/app/dashboard")
            }}
          />,
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}