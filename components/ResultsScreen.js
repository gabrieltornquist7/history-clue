// components/ResultsScreen.js
export default function ResultsScreen({ results, handlePlayAgain }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#fcf8f0] p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border border-stone-300 font-sans">
        <h2 className="text-3xl font-serif font-bold text-stone-800 mb-4">Round Over</h2>
        <div className="flex justify-around bg-[#f8f5f0] p-4 rounded-lg border border-stone-200 my-6">
          <div className="text-left">
            <h4 className="text-lg font-serif font-bold text-stone-700">Your Guess</h4>
            <p>{results.guess.city}, {results.guess.country}</p>
            <p>{results.guess.year}</p>
          </div>
          <div className="text-left">
            <h4 className="text-lg font-serif font-bold text-stone-700">Correct Answer</h4>
            <p className="text-green-700 font-semibold">{results.answer.city}, {results.answer.country}</p>
            <p className="text-green-700 font-semibold">{results.answer.year}</p>
          </div>
        </div>
        <h3 className="text-2xl font-serif font-bold text-stone-800 mb-6">Final Score: {results.finalScore.toLocaleString()}</h3>
        <button
          onClick={handlePlayAgain}
          className="p-4 bg-[#785e48] text-white font-bold text-lg rounded-lg hover:bg-[#5a4b41] transition-colors duration-200 w-full"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}