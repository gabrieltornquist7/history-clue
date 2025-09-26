// components/ResultsScreen.js
export default function ResultsScreen({ results, handlePlayAgain }) {
  const displayYear = (year) => {
    const yearNum = Number(year);
    if (yearNum < 0) return `${Math.abs(yearNum)} BCE`;
    if (yearNum === 0) return `Year 0`;
    return `${yearNum} CE`;
  };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-parchment p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border border-sepia-dark/50 font-sans">
        <h2 className="text-3xl font-serif font-bold text-ink mb-4">Round Over</h2>
        <div className="flex justify-around bg-papyrus p-4 rounded-lg border border-sepia/20 my-6">
          <div className="text-left">
            <h4 className="text-lg font-serif font-bold text-sepia">Your Guess</h4>
            <p>{results.guess.city}, {results.guess.country}</p>
            <p>{displayYear(results.guess.year)}</p>
          </div>
          <div className="text-left">
            <h4 className="text-lg font-serif font-bold text-sepia">Correct Answer</h4>
            <p className="text-green-700 font-semibold">{results.answer.city}, {results.answer.country}</p>
            <p className="text-green-700 font-semibold">{displayYear(results.answer.year)}</p>
          </div>
        </div>
        <h3 className="text-2xl font-serif font-bold text-ink mb-6">Final Score: {results.finalScore.toLocaleString()}</h3>
        <button
          onClick={handlePlayAgain}
          className="p-4 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors duration-200 w-full"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}