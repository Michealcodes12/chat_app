export default function DashboardIndex() {
  return (
    <div className="flex-1 flex items-center justify-center bg-surface/30">
      <div className="text-center p-8 max-w-sm rounded-2xl border border-border/50 bg-surface shadow-sm">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-3">Your Messages</h2>
        <p className="text-sm text-foreground/70 leading-relaxed">
          Select a conversation from the sidebar or search for a user to start an end-to-end encrypted chat.
        </p>
      </div>
    </div>
  );
}
