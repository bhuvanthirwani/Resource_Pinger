export default function Loader({ rows = 5, columns = 4 }) {
  const sizes = ['lg', 'md', 'sm', 'md'];

  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className={`skeleton skeleton-cell ${sizes[j % sizes.length]}`}
            />
          ))}
        </div>
      ))}
    </>
  );
}
