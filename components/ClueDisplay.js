// components/ClueDisplay.js
export default function ClueDisplay({ puzzle, activeClue }) {
  // Find the correct clue text based on the activeClue number
  const clueText = puzzle?.puzzle_translations?.[0]?.[`clue_${activeClue}_text`];

  return (
    <div style={{
      border: '1px solid #ccc', borderRadius: '8px', padding: '20px',
      margin: '20px', backgroundColor: '#f9f9f9', maxWidth: '600px',
      marginLeft: 'auto', marginRight: 'auto', minHeight: '120px'
    }}>
      <h2>Clue {activeClue}</h2>
      <p style={{ fontSize: '1.2em' }}>
        {clueText || 'Loading clue...'}
      </p>
    </div>
  );
}