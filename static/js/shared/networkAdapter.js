/**
 * NetworkAdapter - Handles network-aware movement timing for both single and multiplayer modes
 */

export class NetworkAdapter {
  constructor() {
    this.latencyHistory = [];
    this.maxHistory = 5;
    this.averageLatency = 50; // Start optimistic
    this.lastPingTime = 0;
    this.isHighLatency = false;
    
    // Track repeated movements (hjkl spam detection)
    this.recentMoves = [];
    this.maxMoveHistory = 5;
    this.rapidThreshold = 100; // Consider rapid if moves within 100ms
  }

  // Measure latency from any server request
  measureLatency(startTime) {
    const latency = performance.now() - startTime;
    this.latencyHistory.push(latency);
    
    if (this.latencyHistory.length > this.maxHistory) {
      this.latencyHistory.shift();
    }
    
    this.averageLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
    
    // Multi-tier latency classification
    this.isHighLatency = this.averageLatency > 150;
    this.isVeryHighLatency = this.averageLatency > 250;
    
    logger.debug('Network latency:', latency + 'ms', 'Average:', Math.round(this.averageLatency) + 'ms');
  }

  // Track movement for spam detection
  trackMovement(direction) {
    const now = Date.now();
    this.recentMoves.push({ direction, time: now });
    
    if (this.recentMoves.length > this.maxMoveHistory) {
      this.recentMoves.shift();
    }
  }

  // Detect if user is rapidly repeating hjkl movements
  isRapidRepeating(direction) {
    if (!['h', 'j', 'k', 'l'].includes(direction)) {
      return false; // Only check basic movements
    }
    
    const now = Date.now();
    const recentSameDirection = this.recentMoves.filter(move => 
      move.direction === direction && 
      (now - move.time) < this.rapidThreshold
    );
    
    return recentSameDirection.length >= 2; // 2+ same moves in 100ms = rapid
  }

  // Get adaptive cooldown based on network conditions AND movement pattern
  getMoveCooldown(isMultiplayer = false, direction = null) {
    // Base cooldowns - very fast for vim responsiveness
    let baseCooldown = isMultiplayer ? 25 : 20;
    
    // Adaptive latency scaling
    if (this.isVeryHighLatency) {
      baseCooldown += 60; // Aggressive for 250ms+ latency (Asia/Australia)
    } else if (this.isHighLatency) {
      baseCooldown += 30; // Moderate for 150ms+ latency (US West Coast)
    }
    
    // Extra penalty for rapid hjkl spam
    if (direction && this.isRapidRepeating(direction)) {
      const spamPenalty = this.isVeryHighLatency ? 80 : 40;
      baseCooldown += spamPenalty;
      logger.debug('🔥 Rapid', direction, 'detected - cooldown:', baseCooldown + 'ms', 
        '(latency:', Math.round(this.averageLatency) + 'ms)');
    }
    
    return baseCooldown;
  }

  // Get prediction confidence (0-1)
  getPredictionConfidence() {
    return this.isHighLatency ? 0.7 : 0.95;
  }

  // Should we be more optimistic with predictions?
  shouldUseOptimisticPrediction() {
    return this.isHighLatency;
  }

  // Get connection quality description for user feedback
  getConnectionQuality() {
    if (this.isVeryHighLatency) {
      return { level: 'poor', message: 'High latency detected - movement optimized for stability' };
    } else if (this.isHighLatency) {
      return { level: 'fair', message: 'Moderate latency - slight movement delays for stability' };
    } else {
      return { level: 'good', message: 'Low latency - optimal vim responsiveness' };
    }
  }
}

// Global instance
export const networkAdapter = new NetworkAdapter();