import { Brain, History, Settings, Sparkles, Target } from "lucide-react"

interface Props {
  isAuthenticated: boolean
  userEmail?: string
  onSignInClick: () => void
  onSignUpClick: () => void
  onOpenDashboard: () => void
  onOpenHistory: () => void
  onSignOut: () => void
}

export default function LandingPage({
  isAuthenticated,
  userEmail,
  onSignInClick,
  onSignUpClick,
  onOpenDashboard,
  onOpenHistory,
  onSignOut,
}: Props) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-primary/20">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tight">MythosNER</span>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm font-medium text-slate-500 hidden md:block">{userEmail}</span>
              <button onClick={onOpenHistory} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                History
              </button>
              <button onClick={onOpenDashboard} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Open Dashboard
              </button>
              <button onClick={onSignOut} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                Sign out
              </button>
            </>
          ) : (
            <>
              <button onClick={onSignInClick} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Log in
              </button>
              <button onClick={onSignUpClick} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                Sign up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8">
          <Sparkles className="size-4" />
          <span>AI-Powered Named Entity Recognition</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-tight">
          Annotate Epics with <span className="text-primary">AI Precision</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          Analyze Sanskrit epics, folklore passages, and adapted narratives with your custom model. Save every run, revisit history, and export enriched entity annotations in one seamless workflow.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isAuthenticated ? (
            <>
              <button onClick={onOpenDashboard} className="px-8 py-3.5 text-base font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 w-full sm:w-auto">
                Start Annotating
              </button>
              <button onClick={onOpenHistory} className="px-8 py-3.5 text-base font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm w-full sm:w-auto">
                Go to History
              </button>
            </>
          ) : (
            <button onClick={onSignUpClick} className="px-8 py-3.5 text-base font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 w-full sm:w-auto">
              Get Started for Free
            </button>
          )}
        </div>

        {/* Feature Grid */}
        <div className="mt-32">
          <h2 className="text-2xl font-bold text-slate-900 mb-12">Powerful Features for Text Analysis</h2>
          <div className="grid md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="size-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Target className="size-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Domain-aware tagging</h3>
              <p className="text-slate-500 leading-relaxed">Capture entities like characters, places, groups, and symbolic objects from mythological contexts.</p>
            </div>
            
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="size-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4">
                <History className="size-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Built-in annotation history</h3>
              <p className="text-slate-500 leading-relaxed">Reopen past analyses, compare outputs, and keep your research trail auditable.</p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="size-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mb-4">
                <Settings className="size-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Human-in-the-loop controls</h3>
              <p className="text-slate-500 leading-relaxed">Correct labels, assign custom tags, and export structured results for downstream usage.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}