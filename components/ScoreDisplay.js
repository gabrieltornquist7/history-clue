// components/ScoreDisplay.js
export default function ScoreDisplay({ score }) {
  return (
    <div className="my-6 text-2xl font-bold text-stone-700">
      <span>Potential Score: </span>
      <span className="text-black">{score.toLocaleString()}</span>
    </div>
  );
}