// components/ClueDisplay.js
export default function ClueDisplay({ puzzle, activeClue }) {
  const clueText = puzzle?.puzzle_translations?.[0]?.[`clue_${activeClue}_text`];

  return (
    // We've replaced the style={{...}} with Tailwind's className
    <div className="max-w-2xl mx-auto p-6 bg-white bg-opacity-75 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-stone-800 mb-2">
        Clue {activeClue}
      </h2>
      <p className="text-stone-700 text-lg leading-relaxed">
        {clueText || 'Loading clue...'}
      </p>
    </div>
  );
}