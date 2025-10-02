// lib/battleScoring.js
// Pure scoring calculations for battle mode

// Clue costs (how many points it costs to unlock each clue)
export const CLUE_COSTS = {
  1: 0,    // First clue is free
  2: 1000,
  3: 1500,
  4: 2000,
  5: 3000
};

// Base scores based on number of clues used
export const BASE_SCORES = [
  5000,  // 1 clue used
  3500,  // 2 clues used
  2500,  // 3 clues used
  1500,  // 4 clues used
  800    // 5 clues used
];

/**
 * Get base score for number of clues used
 */
export function getBaseScore(cluesUsed) {
  const numClues = Array.isArray(cluesUsed) ? cluesUsed.length : cluesUsed;
  const index = Math.max(0, Math.min(numClues - 1, BASE_SCORES.length - 1));
  return BASE_SCORES[index];
}

/**
 * Calculate distance penalty (max 50% of base score)
 */
export function getDistancePenalty(distanceKm, baseScore) {
  const maxDistance = 20000; // Earth's circumference / 2
  const penaltyPercent = Math.min(distanceKm / maxDistance, 1.0) * 0.5;
  return Math.round(baseScore * penaltyPercent);
}

/**
 * Calculate year penalty (max 30% of base score)
 */
export function getYearPenalty(yearDiff, baseScore) {
  const maxYearDiff = 4000; // -3000 BCE to 2025 CE range
  const penaltyPercent = Math.min(Math.abs(yearDiff) / maxYearDiff, 1.0) * 0.3;
  return Math.round(baseScore * penaltyPercent);
}

/**
 * Calculate time bonus (up to 20% if completed in <30s)
 */
export function getTimeBonus(timeRemaining, baseScore) {
  if (timeRemaining > 30) {
    return Math.round((timeRemaining - 30) / 150 * baseScore * 0.2); // 180s total - 30s threshold
  }
  return 0;
}

/**
 * Calculate proximity bonus (+1000 if <50km, +500 if <200km)
 */
export function getProximityBonus(distanceKm) {
  if (distanceKm < 50) return 1000;
  if (distanceKm < 200) return 500;
  return 0;
}

/**
 * Main scoring function - calculates final score
 */
export function calculateBattleScore({
  puzzle,
  guessLat,
  guessLng,
  guessYear,
  cluesUsed,
  timeRemaining = 0
}) {
  // Calculate distance
  const distance = getDistance(
    guessLat, 
    guessLng, 
    parseFloat(puzzle.latitude), 
    parseFloat(puzzle.longitude)
  );
  
  // Get base score
  const baseScore = getBaseScore(cluesUsed);
  
  // Calculate penalties
  const distancePenalty = getDistancePenalty(distance, baseScore);
  const yearDiff = Math.abs(guessYear - puzzle.year);
  const yearPenalty = getYearPenalty(yearDiff, baseScore);
  
  // Calculate bonuses
  const timeBonus = getTimeBonus(timeRemaining, baseScore);
  const proximityBonus = getProximityBonus(distance);
  
  // Final score
  let finalScore = baseScore - distancePenalty - yearPenalty + timeBonus + proximityBonus;
  finalScore = Math.max(0, Math.round(finalScore));
  
  return {
    finalScore,
    distance: Math.round(distance),
    yearDiff,
    breakdown: {
      baseScore,
      distancePenalty,
      yearPenalty,
      timeBonus,
      proximityBonus
    }
  };
}

/**
 * Haversine formula for distance calculation
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determine round winner
 */
export function determineRoundWinner(player1Score, player2Score) {
  if (player1Score > player2Score) return 'player1';
  if (player2Score > player1Score) return 'player2';
  return 'tie';
}

/**
 * Determine battle winner after all rounds
 */
export function determineBattleWinner(rounds) {
  let player1Wins = 0;
  let player2Wins = 0;
  
  rounds.forEach(round => {
    if (round.round_winner_id === round.battle.player1_id) {
      player1Wins++;
    } else if (round.round_winner_id === round.battle.player2_id) {
      player2Wins++;
    }
  });
  
  return {
    player1Wins,
    player2Wins,
    winner: player1Wins > player2Wins ? 'player1' : 
            player2Wins > player1Wins ? 'player2' : 'tie'
  };
}

/**
 * Calculate timer cap after first submission (45 second cap)
 */
export function getTimerCap(firstSubmitTime, currentTime) {
  const elapsed = (currentTime - firstSubmitTime) / 1000;
  return Math.max(0, 45 - elapsed);
}
