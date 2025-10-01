export default function ScoreDisplay({ score }) {
  return (
    <div className="my-4 text-xl text-sepia">
      <span>Potential Score: </span>
      <span className="font-bold text-ink">{(score ?? 0).toLocaleString()}</span>
    </div>
  );
}
