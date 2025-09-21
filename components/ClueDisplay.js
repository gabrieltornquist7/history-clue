export default function ClueDisplay({ puzzle, activeClue }) {
  const clueText = puzzle?.puzzle_translations?.[0]?.[`clue_${activeClue}_text`];
  return (
    <div className="bg-parchment border border-sepia/30 rounded-lg p-6 my-6 min-h-[120px] flex flex-col justify-center shadow-inner">
      <h2 className="text-xl font-bold text-ink mb-2">
        Clue {activeClue}
      </h2>
      <p className="text-sepia-dark text-lg leading-relaxed">{clueText || 'Loading clue...'}</p>
    </div>
  );
}