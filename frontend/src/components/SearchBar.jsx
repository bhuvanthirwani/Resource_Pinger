export default function SearchBar({ value, onChange, placeholder = 'Search by name...' }) {
  return (
    <div className="search-bar-wrapper">
      <span className="search-icon">🔍</span>
      <input
        id="search-input"
        type="text"
        className="search-bar"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
