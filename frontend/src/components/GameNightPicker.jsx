import { useState } from 'react';
import { api } from '../api/client';
import './GameNightPicker.css';

function complexityLabel(w) {
  if (w == null) return null;
  if (w <= 1.5) return 'Light';
  if (w <= 2.5) return 'Medium-Light';
  if (w <= 3.5) return 'Medium';
  if (w <= 4.5) return 'Medium-Heavy';
  return 'Heavy';
}

export default function GameNightPicker() {
  const [players, setPlayers] = useState('');
  const [maxPlaytime, setMaxPlaytime] = useState('');
  const [maxComplexity, setMaxComplexity] = useState('');
  const [result, setResult] = useState(undefined); // undefined = not picked, null = no match
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rolling, setRolling] = useState(false);

  async function handlePick() {
    setError('');
    setLoading(true);
    setRolling(true);
    setResult(undefined);

    // brief dice roll animation
    await new Promise((r) => setTimeout(r, 700));

    try {
      const game = await api.games.pick({ players, maxPlaytime, maxComplexity });
      setResult(game);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRolling(false);
    }
  }

  const categories = Array.isArray(result?.categories) ? result.categories : [];

  return (
    <div className="picker-page">
      <div className="picker-card">
        <div className="picker-header">
          <div className="dice-icon">🎲</div>
          <h2>Game Night Picker</h2>
          <p className="picker-subtitle">
            Set your constraints and let BoardVault choose the perfect game.
          </p>
        </div>

        <div className="picker-controls">
          <div className="picker-field">
            <label>Number of Players</label>
            <input
              type="number"
              min="1"
              max="20"
              placeholder="e.g. 4"
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
              className="picker-input"
            />
          </div>

          <div className="picker-field">
            <label>Max Play Time</label>
            <select
              value={maxPlaytime}
              onChange={(e) => setMaxPlaytime(e.target.value)}
              className="picker-input"
            >
              <option value="">Any</option>
              <option value="30">≤ 30 min</option>
              <option value="60">≤ 60 min</option>
              <option value="90">≤ 90 min</option>
              <option value="120">≤ 2 hours</option>
              <option value="180">≤ 3 hours</option>
            </select>
          </div>

          <div className="picker-field">
            <label>Max Complexity</label>
            <select
              value={maxComplexity}
              onChange={(e) => setMaxComplexity(e.target.value)}
              className="picker-input"
            >
              <option value="">Any</option>
              <option value="2">Light (≤ 2)</option>
              <option value="3">Medium (≤ 3)</option>
              <option value="4">Medium-Heavy (≤ 4)</option>
              <option value="5">Heavy (≤ 5)</option>
            </select>
          </div>
        </div>

        <button
          className={`pick-btn ${rolling ? 'rolling' : ''}`}
          onClick={handlePick}
          disabled={loading}
        >
          {loading ? '🎲 Rolling…' : '🎲 Pick a Game'}
        </button>

        {error && <p className="picker-error">{error}</p>}
      </div>

      {result === null && (
        <div className="picker-empty">
          <span>😔</span>
          <p>No games in your collection match those criteria.</p>
          <p className="picker-empty-hint">Try loosening the filters or add more games.</p>
        </div>
      )}

      {result && (
        <div className="picked-result">
          <div className="picked-label">Tonight you're playing…</div>
          <div className="picked-game">
            {result.thumbnail && (
              <img src={result.thumbnail} alt={result.title} className="picked-thumb" />
            )}
            <div className="picked-info">
              <h2 className="picked-title">{result.title}</h2>
              {result.year_published && (
                <span className="picked-year">{result.year_published}</span>
              )}

              <div className="picked-meta">
                {result.min_players != null && (
                  <span className="meta-badge">
                    👥 {result.min_players === result.max_players
                      ? result.min_players
                      : `${result.min_players}–${result.max_players}`} players
                  </span>
                )}
                {result.min_playtime != null && (
                  <span className="meta-badge">
                    ⏱ {result.min_playtime === result.max_playtime
                      ? result.min_playtime
                      : `${result.min_playtime}–${result.max_playtime}`} min
                  </span>
                )}
                {result.complexity != null && (
                  <span className="meta-badge">
                    🧠 {complexityLabel(result.complexity)} ({result.complexity.toFixed(1)})
                  </span>
                )}
                {result.bgg_rating != null && (
                  <span className="meta-badge rating">
                    ★ {result.bgg_rating.toFixed(1)}
                  </span>
                )}
              </div>

              {categories.length > 0 && (
                <div className="picked-categories">
                  {categories.map((c) => (
                    <span key={c} className="picked-cat">{c}</span>
                  ))}
                </div>
              )}

              {result.description && (
                <p className="picked-desc">{result.description.slice(0, 300)}{result.description.length > 300 ? '…' : ''}</p>
              )}
            </div>
          </div>

          <button className="reroll-btn" onClick={handlePick} disabled={loading}>
            Reroll
          </button>
        </div>
      )}
    </div>
  );
}
