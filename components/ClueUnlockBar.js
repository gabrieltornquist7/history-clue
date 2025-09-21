// components/ClueUnlockBar.js
export default function ClueUnlockBar({ unlockedClues, activeClue, handleUnlockClue }) {
  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };

  return (
    <div className="max-w-2xl mx-auto grid grid-cols-5 gap-2 px-4">
      {[1, 2, 3, 4, 5].map((num) => {
        const isUnlocked = unlockedClues.includes(num);
        const isActive = activeClue === num;

        // We build the list of Tailwind classes based on the button's state
        const baseClasses = "p-2 rounded-lg text-sm transition-all duration-200";
        const lockedClasses = "bg-stone-200 text-stone-400 cursor-not-allowed";
        const unlockedClasses = "bg-white hover:bg-stone-100 border border-stone-300";
        const activeClasses = "bg-stone-800 text-white border-stone-800";

        const finalClasses = `${baseClasses} ${isActive ? activeClasses : (isUnlocked ? unlockedClasses : lockedClasses)}`;

        return (
          <button key={num} className={finalClasses} onClick={() => handleUnlockClue(num)}>
            <span className="font-bold">Clue {num}</span><br/>
            <span className="text-xs">
              {isUnlocked ? '(Unlocked)' : `(${CLUE_COSTS[num]} pts)`}
            </span>
          </button>
        );
      })}
    </div>
  );
}