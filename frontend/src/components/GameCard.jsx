import { useState } from 'react';
import './GameCard.css';

function complexityLabel(w) {
  if (w == null) return null;
  if (w <= 1.5) return { label: 'Light', cls: 'cplx-light' };
  if (w <= 2.5) return { label: 'Medium-Light', cls: 'cplx-medium-light' };
  if (w <= 3.5) return { label: 'Medium', cls: 'cplx-medium' };
  if (w <= 4.5) return { label: 'Medium-Heavy', cls: 'cplx-medium-heavy' };
  return { label: 'Heavy', cls: 'cplx-heavy' };
}

function playersText(min, max) {
  if (!min && !max) return null;
  if (min === max) return `${min}`;
  return `${min ?? '?'}–${max ?? '?'}`;
}

function playtimeText(min, max) {
  if (!min && !max) return null;
  if (min === max || !max) return `${min ?? max} min`;
  return `${min}–${max} min`;
}

export default function GameCard({ game, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cplx = complexityLabel(game.complexity);
  const players = playersText(game.min_players, game.max_players);
  const playtime = playtimeText(game.min_playtime, game.max_playtime);
  const categories = Array.isArray(game.categories) ? game.categories : [];

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(game.id);
  }

  return (
    <article className="game-card">
      <div className="game-card-inner">
        {game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt={game.title}
            className="game-thumb"
            loading="lazy"
          />
        ) : (
          <div className="game-thumb game-thumb-placeholder">🎲</div>
        )}

        <div className="game-body">
          <div className="game-header">
            <div>
              <h3 className="game-title">{game.title}</h3>
              {game.year_published && (
                <span className="game-year">{game.year_published}</span>
              )}
            </div>
            <div className="game-actions">
              <button
                className={`delete-btn ${confirmDelete ? 'delete-confirm' : ''}`}
                onClick={handleDelete}
                onBlur={() => setConfirmDelete(false)}
                title={confirmDelete ? 'Click again to confirm' : 'Remove from collection'}
              >
                {confirmDelete ? 'Remove?' : '✕'}
              </button>
            </div>
          </div>

          <div className="game-meta">
            {players && (
              <span className="meta-pill">
                <span className="meta-icon">👥</span> {players}
              </span>
            )}
            {playtime && (
              <span className="meta-pill">
                <span className="meta-icon">⏱</span> {playtime}
              </span>
            )}
            {cplx && (
              <span className={`meta-pill cplx-pill ${cplx.cls}`}>
                {cplx.label}
              </span>
            )}
            {game.bgg_rating != null && (
              <span className="meta-pill rating-pill">
                ★ {game.bgg_rating.toFixed(1)}
              </span>
            )}
          </div>

          {categories.length > 0 && (
            <div className="game-categories">
              {categories.slice(0, 3).map((c) => (
                <span key={c} className="category-tag">{c}</span>
              ))}
              {categories.length > 3 && (
                <span className="category-tag category-more">+{categories.length - 3}</span>
              )}
            </div>
          )}

          {game.description && (
            <>
              <p className={`game-desc ${expanded ? 'expanded' : ''}`}>
                {game.description}
              </p>
              <button
                className="expand-btn"
                onClick={() => setExpanded((x) => !x)}
              >
                {expanded ? 'Less' : 'More'}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
