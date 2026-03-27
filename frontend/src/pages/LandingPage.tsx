interface Props {
  isAuthenticated?: boolean
  userEmail?: string
  onSignInClick: () => void
  onSignUpClick: () => void
  onOpenDashboard?: () => void
  onOpenHistory?: () => void
  onSignOut?: () => void
}

export default function LandingPage({
  isAuthenticated = false,
  userEmail,
  onSignInClick,
  onSignUpClick,
  onOpenDashboard,
  onOpenHistory,
  onSignOut,
}: Props) {
  return (
    <div className="landing-root">
      <header className="landing-nav">
        <div className="brand-block">
          <p className="brand-kicker">Mythology NER Studio</p>
          <h1>Annotate Epics with AI Precision</h1>
          {isAuthenticated && userEmail && (
            <p className="landing-user-line">Signed in as {userEmail}</p>
          )}
        </div>
        <div className="landing-nav-actions">
          {!isAuthenticated && (
            <>
              <button className="ghost-btn" onClick={onSignInClick}>Sign in</button>
              <button className="primary-btn" onClick={onSignUpClick}>Get Started</button>
            </>
          )}
          {isAuthenticated && (
            <>
              <button className="ghost-btn" onClick={onOpenHistory}>History</button>
              <button className="primary-btn" onClick={onOpenDashboard}>Open Dashboard</button>
              <button className="ghost-btn" onClick={onSignOut}>Sign out</button>
            </>
          )}
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero section-container">
          <div>
            <h2>Custom NER for mythological texts, built for researchers and storytellers.</h2>
            <p>
              Analyze Sanskrit epics, folklore passages, and adapted narratives with your custom model.
              Save every run, revisit history, and export enriched entity annotations in one workflow.
            </p>
            <div className="landing-cta-row">
              {!isAuthenticated && (
                <>
                  <button className="primary-btn" onClick={onSignUpClick}>Create Free Account</button>
                  <button className="ghost-btn" onClick={onSignInClick}>I already have an account</button>
                </>
              )}
              {isAuthenticated && (
                <>
                  <button className="primary-btn" onClick={onOpenDashboard}>Start Annotating</button>
                  <button className="ghost-btn" onClick={onOpenHistory}>Go to History</button>
                </>
              )}
            </div>
          </div>
          <aside className="hero-side-panel">
            <p className="metric-label">Model domain</p>
            <p className="metric-value">Mythology-focused NER</p>
            <p className="metric-label">Workflow</p>
            <p className="metric-value">Analyze • Assign • Export • Revisit</p>
            <p className="metric-label">Storage</p>
            <p className="metric-value">Secure per-user history via Supabase</p>
          </aside>
        </section>

        <section className="feature-grid">
          <article className="feature-card section-container">
            <h3>Domain-aware tagging</h3>
            <p>Capture entities like characters, places, groups, and symbolic objects from mythological contexts.</p>
          </article>
          <article className="feature-card section-container">
            <h3>Built-in annotation history</h3>
            <p>Reopen past analyses, compare outputs, and keep your research trail auditable.</p>
          </article>
          <article className="feature-card section-container">
            <h3>Human-in-the-loop controls</h3>
            <p>Correct labels, assign custom tags, and export structured results for downstream usage.</p>
          </article>
        </section>
      </main>
    </div>
  )
}
