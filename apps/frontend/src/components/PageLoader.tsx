
export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-text-light fixed inset-0 z-50">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full blur-xl bg-accent/30 animate-pulse" />
          <div className="size-16 rounded-2xl bg-gradient-to-tr from-accent to-accent/50 shadow-2xl shadow-accent/20 flex items-center justify-center animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-md">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-base font-semibold text-text-light tracking-wide font-headings">Loading Workspace</span>
          <div className="flex items-center gap-1.5 opacity-60">
            <div className="size-1.5 rounded-full bg-accent animate-ping" style={{ animationDelay: '0ms' }} />
            <div className="size-1.5 rounded-full bg-accent animate-ping" style={{ animationDelay: '150ms' }} />
            <div className="size-1.5 rounded-full bg-accent animate-ping" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
