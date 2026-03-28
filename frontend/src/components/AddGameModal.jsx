import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import './AddGameModal.css';

// Extract BGG objectid from a URL like https://boardgamegeek.com/boardgame/266192/wingspan
// or accept a plain number
function parseBggInput(raw) {
  const trimmed = raw.trim();
  const urlMatch = trimmed.match(/boardgamegeek\.com\/(?:boardgame|thing)\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return null;
}

export default function AddGameModal({ onAdd, onClose }) {
  const [mode, setMode] = useState('url'); // 'url' | 'search'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);  // for URL mode: fetched details before adding
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setError('');
    setResults([]);
    setPreview(null);
    setQuery('');
    inputRef.current?.focus();
  }, [mode]);

  // ── URL / ID mode ──────────────────────────────────────────────────────────

  async function handleUrlSubmit(e) {
    e.preventDefault();
    const id = parseBggInput(query);
    if (!id) {
      setError('Enter a BGG game ID (e.g. 266192) or a full BGG URL.');
      return;
    }
    setError('');
    setSearching(true);
    setPreview(null);
    try {
      const details = await api.bgg.details(id);
      setPreview({ ...details, resolvedId: id });
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleAddPreview() {
    if (!preview) return;
    setAdding(preview.resolvedId);
    setError('');
    try {
      const game = await api.games.add(preview.resolvedId);
      onAdd(game);
      onClose();
    } catch (err) {
      setError(err.message);
      setAdding(null);
    }
  }

  // ── Search mode ────────────────────────────────────────────────────────────

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setError('');
    setSearching(true);
    setResults([]);
    try {
      const data = await api.bgg.search(query.trim());
      setResults(data);
      if (data.length === 0) setError('No games found. Try a different title.');
    } catch (err) {
      // If search fails due to auth, nudge them to URL mode
      const isAuthError = err.message.toLowerCase().includes('authentication');
      if (isAuthError) {
        setError(
          'BGG search requires account login. Use the "BGG URL / ID" tab instead — ' +
          'paste the game\'s BGG URL or ID and it will work without login.'
        );
      } else {
        setError(err.message);
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(bggId) {
    setAdding(bggId);
    setError('');
    try {
      const game = await api.games.add(bggId);
      onAdd(game);
      onClose();
    } catch (err) {
      setError(err.message);
      setAdding(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add a Game</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${mode === 'url' ? 'active' : ''}`}
            onClick={() => setMode('url')}
          >
            BGG URL / ID
          </button>
          <button
            className={`modal-tab ${mode === 'search' ? 'active' : ''}`}
            onClick={() => setMode('search')}
          >
            Search by title
          </button>
        </div>

        {mode === 'url' ? (
          <>
            <form onSubmit={handleUrlSubmit} className="search-form">
              <input
                ref={inputRef}
                type="text"
                placeholder="https://boardgamegeek.com/boardgame/266192/… or just 266192"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPreview(null); setError(''); }}
                className="search-input"
              />
              <button type="submit" className="btn-primary" disabled={searching}>
                {searching ? 'Looking up…' : 'Look up'}
              </button>
            </form>
            <p className="modal-hint">
              Find a game on <a href="https://boardgamegeek.com" target="_blank" rel="noreferrer">boardgamegeek.com</a>, copy the URL, and paste it here.
            </p>
          </>
        ) : (
          <form onSubmit={handleSearch} className="search-form">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search BoardGameGeek…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn-primary" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>
        )}

        {error && <p className="modal-error">{error}</p>}

        {/* URL mode: preview card before adding */}
        {preview && (
          <div className="preview-card">
            {preview.thumbnail && (
              <img src={preview.thumbnail} alt={preview.title} className="preview-thumb" />
            )}
            <div className="preview-info">
              <div className="preview-title">{preview.title}</div>
              {preview.yearPublished && <div className="preview-year">{preview.yearPublished}</div>}
              <div className="preview-meta">
                {preview.minPlayers != null && (
                  <span>👥 {preview.minPlayers}–{preview.maxPlayers}</span>
                )}
                {preview.minPlaytime != null && (
                  <span>⏱ {preview.minPlaytime}–{preview.maxPlaytime} min</span>
                )}
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={handleAddPreview}
              disabled={!!adding}
            >
              {adding ? 'Adding…' : 'Add to vault'}
            </button>
          </div>
        )}

        {/* Search mode: results list */}
        {results.length > 0 && (
          <ul className="bgg-results">
            {results.map((r) => (
              <li key={r.bggId} className="bgg-result-item">
                <div className="bgg-result-info">
                  <span className="bgg-result-title">{r.title}</span>
                  {r.yearPublished && (
                    <span className="bgg-result-year">{r.yearPublished}</span>
                  )}
                </div>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => handleAdd(r.bggId)}
                  disabled={adding === r.bggId}
                >
                  {adding === r.bggId ? 'Adding…' : 'Add'}
                </button>
              </li>
            ))}
          </ul>
        )}

        {searching && (
          <div className="modal-loading">
            <div className="spinner" />
            <span>{mode === 'url' ? 'Fetching game details…' : 'Searching BoardGameGeek…'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
