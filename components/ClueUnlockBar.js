// components/ClueUnlockBar.js
export default function ClueUnlockBar({ unlockedClues, activeClue, handleUnlockClue }) {
  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };
  return (
    <div className="w-full grid grid-cols-5 gap-3 my-6">
      {[1, 2, 3, 4, 5].map((num) => {
        const isUnlocked = unlockedClues.includes(num);
        const isActive = activeClue === num;

        const baseClasses = "p-3 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sepia";
        const lockedClasses = "bg-sepia/20 text-sepia/70 hover:bg-sepia/30";
        const unlockedClasses = "bg-parchment text-sepia-dark hover:bg-sepia/10 border border-sepia/30";
        const activeClasses = "bg-sepia-dark text-white border-sepia-dark shadow-inner";

        const finalClasses = `${baseClasses} ${isActive ? activeClasses : (isUnlocked ? unlockedClasses : lockedClasses)}`;

        return (
          <button key={num} className={finalClasses} onClick={() => handleUnlockClue(num)}>
            <div>Clue {num}</div>
            <div className="text-xs font-normal opacity-80">
              {isUnlocked && num !== 1 ? '(Unlocked)' : `(${CLUE_COSTS[num] === 0 ? 'Free' : `${CLUE_COSTS[num]} pts`})`}
            </div>
          </button>
        );
      })}
    </div>
  );
}