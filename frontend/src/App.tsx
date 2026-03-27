import { useEffect, useMemo, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import NamedEntityPage from "./pages/NamedEntityPage"
import HistoryPage from "./pages/HistoryPage"
import ModelPerformancePage from "./pages/ModelPerformancePage"
import AuthPage from "./pages/AuthPage"
import LandingPage from "./pages/LandingPage"
import { supabase } from "./lib/supabase"
import { Brain } from "lucide-react"

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 font-medium animate-pulse">Loading session...</div>
      </div>
    )
  }

  const landing = (
    <>
      <div className="min-h-screen bg-slate-50">
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
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Sleek Light Theme Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Brain className="size-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">MythosNER</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden md:block">
              {session.user.email}
            </span>
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${location.pathname.includes('dashboard') ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => navigate("/app/dashboard")}
              >
                Workspace
              </button>
              <button 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${location.pathname.includes('history') ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => navigate("/app/history")}
              >
                History
              </button>
              <button 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${location.pathname.includes('performance') ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => navigate("/app/performance")}
              >
                Performance
              </button>
            </nav>
            <button
              className="ml-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              onClick={() => {
                supabase.auth.signOut()
                navigate("/", { replace: true })
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Workspace Content */}
        <main className="flex-1">
          {content}
        </main>
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
      <Route path="/app/performance" element={workspaceShell(<ModelPerformancePage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}