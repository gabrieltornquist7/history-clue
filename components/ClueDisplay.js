export default function ClueDisplay({ puzzle, activeClue }) {
  const clueText = puzzle?.puzzle_translations?.[0]?.[`clue_${activeClue}_text`];
  return (
    <div className="bg-[#f8f5f0] border border-stone-300 rounded-lg p-6 my-6 min-h-[120px] flex flex-col justify-center">
      <h2 className="text-xl font-bold text-stone-800 mb-2">Clue {activeClue}</h2>
      <p className="text-stone-700 text-lg leading-relaxed">{clueText || 'Loading clue...'}</p>
    </div>
  );
}