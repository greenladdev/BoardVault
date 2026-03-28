import './FilterBar.css';

const PLAYTIME_OPTIONS = [
  { label: 'Any', value: '' },
  { label: '≤ 30 min', value: '30' },
  { label: '≤ 60 min', value: '60' },
  { label: '≤ 90 min', value: '90' },
  { label: '≤ 120 min', value: '120' },
  { label: '≤ 180 min', value: '180' },
];

const COMPLEXITY_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'Light (≤ 2)', value: '2' },
  { label: 'Medium (≤ 3)', value: '3' },
  { label: 'Medium-Heavy (≤ 4)', value: '4' },
  { label: 'Heavy (≤ 5)', value: '5' },
];

export default function FilterBar({ filters, onChange, allCategories }) {
  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  function toggleCategory(cat) {
    const cats = filters.categories ?? [];
    const next = cats.includes(cat) ? cats.filter((c) => c !== cat) : [...cats, cat];
    set('categories', next);
  }

  function clear() {
    onChange({ search: '', players: '', maxPlaytime: '', maxComplexity: '', categories: [] });
  }

  const hasFilters =
    filters.search ||
    filters.players ||
    filters.maxPlaytime ||
    filters.maxComplexity ||
    (filters.categories?.length ?? 0) > 0;

  return (
    <aside className="filter-bar">
      <div className="filter-section">
        <label className="filter-label">Search</label>
        <input
          type="text"
          className="filter-input"
          placeholder="Title…"
          value={filters.search ?? ''}
          onChange={(e) => set('search', e.target.value)}
        />
      </div>

      <div className="filter-section">
        <label className="filter-label">Players</label>
        <input
          type="number"
          className="filter-input"
          placeholder="e.g. 4"
          min="1"
          max="20"
          value={filters.players ?? ''}
          onChange={(e) => set('players', e.target.value)}
        />
      </div>

      <div className="filter-section">
        <label className="filter-label">Play Time</label>
        <select
          className="filter-input"
          value={filters.maxPlaytime ?? ''}
          onChange={(e) => set('maxPlaytime', e.target.value)}
        >
          {PLAYTIME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">Complexity</label>
        <select
          className="filter-input"
          value={filters.maxComplexity ?? ''}
          onChange={(e) => set('maxComplexity', e.target.value)}
        >
          {COMPLEXITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {allCategories.length > 0 && (
        <div className="filter-section">
          <label className="filter-label">Category</label>
          <div className="category-chips">
            {allCategories.map((cat) => (
              <button
                key={cat}
                className={`chip ${(filters.categories ?? []).includes(cat) ? 'chip-active' : ''}`}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasFilters && (
        <button className="clear-btn" onClick={clear}>
          Clear filters
        </button>
      )}
    </aside>
  );
}
