// components/ResultsScreen.js
export default function ResultsScreen({ results, handlePlayAgain }) {
  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000
  };
  const contentStyle = {
    backgroundColor: 'white', padding: '30px', borderRadius: '8px',
    textAlign: 'center', width: '90%', maxWidth: '500px'
  };
  const comparisonBox = {
    display: 'flex', justifyContent: 'space-around',
    backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', margin: '20px 0'
  };
  const correct = { color: 'green', fontWeight: 'bold' };
  const incorrect = { color: 'red', fontWeight: 'bold' };

  return (
    <div style={overlayStyle}>
      <div style={contentStyle}>
        <h2>Round Over</h2>
        <div style={comparisonBox}>
          <div>
            <h4>Your Guess</h4>
            <p><strong>{results.guess.city}, {results.guess.country}</strong></p>
            <p><strong>{results.guess.year}</strong></p>
          </div>
          <div>
            <h4>Correct Answer</h4>
            <p style={correct}>{results.answer.city}, {results.answer.country}</p>
            <p style={correct}>{results.answer.year}</p>
          </div>
        </div>
        <h3>Final Score: {results.finalScore.toLocaleString()}</h3>
        <button
          onClick={handlePlayAgain}
          style={{ padding: '12px 25px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}