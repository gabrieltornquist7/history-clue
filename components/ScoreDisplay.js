// components/ScoreDisplay.js
export default function ScoreDisplay({ score }) {
  return (
    <div style={{ margin: '20px', fontSize: '1.5em', fontWeight: 'bold' }}>
      Potential Score: {score.toLocaleString()}
    </div>
  );
}