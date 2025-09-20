// components/ClueUnlockBar.js
export default function ClueUnlockBar({ unlockedClues, activeClue, handleUnlockClue }) {
  const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };

  const baseStyle = { flexGrow: 1, padding: '10px', fontSize: '0.9em', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' };
  const lockedStyle = { ...baseStyle, backgroundColor: '#ddd', color: '#888' };
  const unlockedStyle = { ...baseStyle, backgroundColor: '#eee', color: '#333' };
  const activeStyle = { ...unlockedStyle, backgroundColor: '#333', color: 'white' };

  return (
    <div style={{ display: 'flex', gap: '10px', maxWidth: '600px', margin: '20px auto' }}>
      {[1, 2, 3, 4, 5].map((num) => {
        const isUnlocked = unlockedClues.includes(num);
        const isActive = activeClue === num;
        const style = isActive ? activeStyle : (isUnlocked ? unlockedStyle : lockedStyle);

        return (
          <button key={num} style={style} onClick={() => handleUnlockClue(num)}>
            Clue {num}<br/>
            <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>
              {isUnlocked ? '(Unlocked)' : `(${CLUE_COSTS[num]} pts)`}
            </span>
          </button>
        );
      })}
    </div>
  );
}