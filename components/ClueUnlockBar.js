export default function ClueUnlockBar({ unlockedClues, activeClue, handleUnlockClue }) {
  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };
  return (
    <div className="w-full grid grid-cols-5 gap-3 my-6">
      {[1, 2, 3, 4, 5].map((num) => {
        const isUnlocked = unlockedClues.includes(num);
        const isActive = activeClue === num;

        const baseClasses = "p-3 rounded-md text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#785e48]";
        const lockedClasses = "bg-stone-200 text-stone-500 hover:bg-stone-300";
        const unlockedClasses = "bg-[#fcf8f0] text-stone-700 hover:bg-stone-200 border border-stone-300";
        const activeClasses = "bg-[#785e48] text-white border-[#785e48] shadow-inner";

        const finalClasses = `${baseClasses} ${isActive ? activeClasses : (isUnlocked ? unlockedClasses : lockedClasses)}`;

        return (
          <button key={num} className={finalClasses} onClick={() => handleUnlockClue(num)}>
            <div>Clue {num}</div>
            <div className="text-xs font-normal opacity-80">({CLUE_COSTS[num] === 0 ? 'Free' : `${CLUE_COSTS[num]}`})</div>
          </button>
        );
      })}
    </div>
  );
}