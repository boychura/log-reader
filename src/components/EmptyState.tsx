export function EmptyState() {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <svg
        className="empty-state__icon"
        width="64"
        height="64"
        viewBox="0 0 64 64"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="8"
          y="6"
          width="48"
          height="52"
          rx="6"
          ry="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="16"
          y1="20"
          x2="48"
          y2="20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="16"
          y1="30"
          x2="48"
          y2="30"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="16"
          y1="40"
          x2="40"
          y2="40"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="16"
          y1="50"
          x2="44"
          y2="50"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <h2 className="empty-state__title">No logs loaded</h2>
      <p className="empty-state__message">
        Paste logs or upload a file to begin.
      </p>
      <p className="empty-state__hint">
        Open the <strong>Input</strong> panel above to paste text or
        drop a <code style={{ display: 'inline-block' }}>.log</code> / <code style={{ display: 'inline-block' }}>.txt</code> file.
      </p>
    </div>
  );
}
