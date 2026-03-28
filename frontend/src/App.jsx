import { useState, useEffect, useMemo } from 'react';
import { api } from './api/client';
import FilterBar from './components/FilterBar';
import GameCard from './components/GameCard';
import AddGameModal from './components/AddGameModal';
import GameNightPicker from './components/GameNightPicker';
import BGGAuthBanner from './components/BGGAuthBanner';
import './App.css';

const EMPTY_FILTERS = {
  search: '',
  players: '',
  maxPlaytime: '',
  maxComplexity: '',
  categories: [],
};

export default function App() {
  const [view, setView] = useState('collection'); // 'collection' | 'picker'
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [bggAuthed, setBggAuthed] = useState(null); // null=checking, true/false

  useEffect(() => {
    api.bgg.status().then((s) => setBggAuthed(s.authenticated)).catch(() => setBggAuthed(false));
    api.games
      .list()
      .then(setGames)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const allCategories = useMemo(() => {
    const set = new Set();
    games.forEach((g) => (g.categories ?? []).forEach((c) => set.add(c)));
    return [...set].sort();
  }, [games]);

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!g.title.toLowerCase().includes(q)) return false;
      }
      if (filters.players) {
        const p = parseInt(filters.players, 10);
        if (!isNaN(p)) {
          if (g.min_players != null && g.min_players > p) return false;
          if (g.max_players != null && g.max_players < p) return false;
        }
      }
      if (filters.maxPlaytime) {
        const t = parseInt(filters.maxPlaytime, 10);
        if (!isNaN(t) && g.min_playtime != null && g.min_playtime > t) return false;
      }
      if (filters.maxComplexity) {
        const c = parseFloat(filters.maxComplexity);
        if (!isNaN(c) && g.complexity != null && g.complexity > c) return false;
      }
      if (filters.categories?.length) {
        const gameCats = g.categories ?? [];
        if (!filters.categories.some((c) => gameCats.includes(c))) return false;
      }
      return true;
    });
  }, [games, filters]);

  function handleAdd(game) {
    setGames((prev) => [...prev, game].sort((a, b) => a.title.localeCompare(b.title)));
  }

  async function handleDelete(id) {
    try {
      await api.games.delete(id);
      setGames((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🎲</span>
            <span className="logo-text">BoardVault</span>
          </div>
          <nav className="app-nav">
            <button
              className={`nav-btn ${view === 'collection' ? 'active' : ''}`}
              onClick={() => setView('collection')}
            >
              Collection
              {games.length > 0 && (
                <span className="nav-badge">{games.length}</span>
              )}
            </button>
            <button
              className={`nav-btn ${view === 'picker' ? 'active' : ''}`}
              onClick={() => setView('picker')}
            >
              Game Night Picker
            </button>
          </nav>
          {view === 'collection' && (
            <button className="add-btn" onClick={() => setShowAdd(true)}>
              + Add Game
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {view === 'collection' ? (
          <div className="collection-layout">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              allCategories={allCategories}
            />
            <div className="collection-content">
              {loading && (
                <div className="state-msg">
                  <div className="spinner-lg" />
                  <span>Loading your collection…</span>
                </div>
              )}
              {error && <div className="state-msg error">{error}</div>}
              {bggAuthed === false && (
                <BGGAuthBanner onAuthenticated={() => setBggAuthed(true)} />
              )}
              {!loading && !error && games.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📦</div>
                  <h2>Your vault is empty</h2>
                  <p>Add your first game to get started.</p>
                  <button className="add-btn" onClick={() => setShowAdd(true)}>
                    + Add Game
                  </button>
                </div>
              )}
              {!loading && !error && games.length > 0 && filtered.length === 0 && (
                <div className="state-msg muted">
                  No games match your filters.
                </div>
              )}
              {filtered.length > 0 && (
                <>
                  <div className="collection-count">
                    {filtered.length} of {games.length} game{games.length !== 1 ? 's' : ''}
                  </div>
                  <div className="game-grid">
                    {filtered.map((game) => (
                      <GameCard key={game.id} game={game} onDelete={handleDelete} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <GameNightPicker />
        )}
      </main>

      {showAdd && (
        <AddGameModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}
