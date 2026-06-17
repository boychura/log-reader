import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';

export interface LogInputPanelProps {
  /** Current textarea value (controlled component). */
  text: string;
  /** Called when the user types in the textarea. */
  onTextChange: (next: string) => void;
  /**
   * Bumped by the parent to imperatively reset the panel's transient state
   * (filename, error). Useful when the parent's "Clear logs" button needs
   * to wipe the input panel without touching the controlled `text` prop.
   */
  resetSignal?: number;
  /** Called with the text to display when the user loads or uploads logs. */
  onLoad: (text: string) => void;
  /**
   * Maximum upload size in bytes. Files larger than this are rejected with
   * an inline error; the parent state is not touched. Defaults to 25 MB
   * (per plan assumptions).
   */
  maxFileSize?: number;
}

const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = '.log,.txt';

/**
 * Input panel body. Combines:
 *   - a labeled textarea + Load button (AC-3, paste-and-load)
 *   - a file input + Upload button + drag-and-drop region (AC-4)
 *
 * Both flows funnel through the same `onLoad(text)` callback so the
 * downstream parseLogLines pipeline is identical regardless of source.
 *
 * The textarea is a fully-controlled component: the parent owns the
 * `text` value and observes changes via `onTextChange`. This lets the
 * AC-11 Clear button reset the textarea to empty by calling
 * `setInputText('')`. The parent's `resetSignal` (when bumped) clears
 * the panel's transient `filename` and `error` UI state without
 * touching the controlled `text` value — so an in-progress edit is
 * preserved while the previous load's status message is dismissed.
 *
 * Empty / whitespace-only text input is ignored; files exceeding
 * `maxFileSize` are rejected with an inline error. The parent state is
 * never touched by either failure mode.
 */
export function LogInputPanel({
  text,
  onTextChange,
  resetSignal = 0,
  onLoad,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
}: LogInputPanelProps) {
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastResetSignal = useRef<number>(resetSignal);

  // When the parent bumps `resetSignal`, clear transient UI feedback
  // (filename banner, error message, drag-over highlight). The
  // controlled `text` is owned by the parent and is cleared separately
  // via `onTextChange('')`.
  useEffect(() => {
    if (resetSignal === lastResetSignal.current) return;
    lastResetSignal.current = resetSignal;
    setFilename(null);
    setError(null);
    setIsDragOver(false);
  }, [resetSignal]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(e.target.value);
  };

  const handleLoad = () => {
    if (text.trim() === '') return;
    setError(null);
    setFilename(null);
    onLoad(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter triggers Load so power users don't have to mouse over.
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleLoad();
    }
  };

  const isAcceptedName = (name: string): boolean => {
    const lower = name.toLowerCase();
    return lower.endsWith('.log') || lower.endsWith('.txt');
  };

  const readFile = (file: File) => {
    if (!isAcceptedName(file.name)) {
      setError(`Unsupported file type: ${file.name}. Use .log or .txt.`);
      return;
    }
    if (file.size > maxFileSize) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`File too large (${mb} MB). Max is ${maxFileSize / (1024 * 1024)} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        setError(`Could not read ${file.name} as text.`);
        return;
      }
      setError(null);
      setFilename(file.name);
      onLoad(result);
    };
    reader.onerror = () => {
      setError(`Could not read ${file.name}.`);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    // Reset so selecting the same file twice still triggers `change`.
    e.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  return (
    <div className="log-input-panel">
      <label className="log-input-panel__label" htmlFor="log-input-textarea">
        Paste log text
      </label>
      <textarea
        id="log-input-textarea"
        className="log-input-panel__textarea"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Paste logs here. Each line becomes one row."
        spellCheck={false}
        rows={8}
        aria-describedby="log-input-panel-hint"
      />
      <div className="log-input-panel__actions">
        <button
          type="button"
          className="log-input-panel__load"
          onClick={handleLoad}
          disabled={text.trim() === ''}
        >
          Load
        </button>
        <span id="log-input-panel-hint" className="log-input-panel__hint">
          Ctrl/⌘ + Enter
        </span>
      </div>

      <div
        className={
          'log-input-panel__drop' +
          (isDragOver ? ' log-input-panel__drop--over' : '')
        }
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="log-input-drop"
        aria-label="Drop a .log or .txt file here, or use the Upload button"
      >
        <span className="log-input-panel__drop-text">
          Drop a <code>.log</code> / <code>.txt</code> file here
        </span>
        <button
          type="button"
          className="log-input-panel__upload"
          onClick={handleUploadClick}
        >
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileChange}
          className="log-input-panel__file"
          aria-label="Choose a .log or .txt file to load"
        />
      </div>

      {filename && !error && (
        <p className="log-input-panel__status" role="status">
          Loaded <code>{filename}</code>.
        </p>
      )}
      {error && (
        <p className="log-input-panel__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

