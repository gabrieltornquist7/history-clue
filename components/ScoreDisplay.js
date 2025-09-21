export default function ScoreDisplay({ score }) {
  return (
    <div className="my-4 text-xl text-stone-600">
      <span>Potential Score: </span>
      <span className="font-bold text-stone-800">{score.toLocaleString()}</span>
    </div>
  );
}