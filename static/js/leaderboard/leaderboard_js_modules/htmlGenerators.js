// HTML generation for different leaderboard states
import { createAvatarHTML, getCharacterDisplayName, getCharacterTextColor } from '../../shared/character_sprites.js';

export class HtmlGenerators {
  constructor(multiplayerMode = false) {
    this.multiplayerMode = multiplayerMode;
  }

  createLeaderboardTableHTML(leaderboard) {
    if (!leaderboard || leaderboard.length === 0) {
      return '<div class="empty-state">No players found</div>';
    }

    // Deduplicate entries by username (keep the best entry per user)
    const deduplicatedLeaderboard = this.deduplicateLeaderboard(leaderboard);

    if (this.multiplayerMode) {
      return this.createMultiplayerTableHTML(deduplicatedLeaderboard);
    } else {
      return this.createSoloTableHTML(deduplicatedLeaderboard);
    }
  }

  deduplicateLeaderboard(leaderboard) {
    const userMap = new Map();
    
    leaderboard.forEach(entry => {
      const username = entry.username;
      if (!username) return;
      
      if (!userMap.has(username)) {
        userMap.set(username, entry);
      } else {
        const existing = userMap.get(username);
        
        // Keep the better entry based on game mode
        if (this.multiplayerMode) {
          // For multiplayer: comprehensive scoring system
          const existingScore = this.calculateMultiplayerScore(existing);
          const currentScore = this.calculateMultiplayerScore(entry);
          
          if (currentScore > existingScore) {
            userMap.set(username, entry);
          }
        } else {
          // For solo: prefer better time
          const existingTime = existing.completion_time || Infinity;
          const currentTime = entry.completion_time || Infinity;
          
          if (currentTime < existingTime) {
            userMap.set(username, entry);
          }
        }
      }
    });
    
    return Array.from(userMap.values());
  }

  calculateMultiplayerScore(entry) {
    const winRate = entry.win_rate || 0;
    const gamesPlayed = entry.total_games_played || 0;
    
    // Base score from win rate (0-100)
    let score = winRate;
    
    // Add bonus points for number of games played
    // More games = more reliable win rate
    const gameBonus = Math.min(gamesPlayed * 0.5, 25); // Max 25 points bonus for 50+ games
    
    // Add small bonus for having any games at all
    const participationBonus = gamesPlayed > 0 ? 5 : 0;
    
    return score + gameBonus + participationBonus;
  }

  createMultiplayerTableHTML(leaderboard) {
    return `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th class="rank-col">#</th>
            <th class="player-col">Player</th>
            <th class="winrate-col">Win Rate</th>
            <th class="wins-col">Wins</th>
            <th class="defeats-col">Defeats</th>
            <th class="games-col">Games</th>
          </tr>
        </thead>
        <tbody>
          ${leaderboard.map((entry, index) => this.createTableRow(entry, index + 1)).join('')}
        </tbody>
      </table>
    `;
  }

  createSoloTableHTML(leaderboard) {
    return `
      <table class="leaderboard-table solo-table">
        <thead>
          <tr>
            <th class="rank-col">#</th>
            <th class="player-col solo">Player</th>
            <th class="time-col">Time</th>
            <th class="moves-col">Moves</th>
          </tr>
        </thead>
        <tbody>
          ${leaderboard.map((entry, index) => this.createTableRow(entry, index + 1)).join('')}
        </tbody>
      </table>
    `;
  }

  createTableRow(entry, rank) {
    if (this.multiplayerMode) {
      const winRate = entry.win_rate ? entry.win_rate.toFixed(1) : "0.0";
      const defeats = entry.total_games_played - entry.total_wins;
      return `
        <tr>
          <td class="rank-cell">${rank}</td>
          <td class="player-cell">
            <div class="player-info">
              ${createAvatarHTML(entry.selected_character)}
              <div class="player-name-container">
                <div class="player-name" style="color: ${getCharacterTextColor(entry.selected_character)}">
                  ${entry.username || 'Unknown Player'}
                </div>
                <div class="player-character">
                  ${getCharacterDisplayName(entry.selected_character, entry.character_level)}
                </div>
              </div>
            </div>
          </td>
          <td class="winrate-cell">${winRate}%</td>
          <td class="wins-cell">${entry.total_wins || 0}</td>
          <td class="defeats-cell">${defeats || 0}</td>
          <td class="games-cell">${entry.total_games_played || 0}</td>
        </tr>
      `;
    } else {
      return `
        <tr>
          <td class="rank-cell">${rank}</td>
          <td class="player-cell solo">
            <div class="player-info">
              ${createAvatarHTML(entry.selected_character)}
              <div class="player-name-container">
                <div class="player-name" style="color: ${getCharacterTextColor(entry.selected_character)}">
                  ${entry.username || 'Unknown Player'}
                </div>
                <div class="player-character">
                  ${getCharacterDisplayName(entry.selected_character, entry.character_level)}
                </div>
              </div>
            </div>
          </td>
          <td class="time-cell">${entry.completion_time_formatted || this.formatTime(entry.completion_time)}</td>
          <td class="moves-cell">${entry.total_moves || entry.move_count || entry.moves || '--'}</td>
        </tr>
      `;
    }
  }

  createPlayerPositionHTML(playerPosition, mapId) {
    if (!playerPosition) return '';

    const isMultiplayer = this.multiplayerMode;
    const statValue = isMultiplayer 
      ? `${((playerPosition.wins / playerPosition.total_games) * 100).toFixed(1)}%`
      : (playerPosition.completion_time_formatted || this.formatTime(playerPosition.completion_time));
    const statLabel = isMultiplayer ? "Win Rate" : "Best Time";

    return `
      <div class="player-position-card">
        <h3 class="player-position-header">Your Position</h3>
        <div class="player-position-info">
          <div class="player-position-left">
            <span class="player-rank">#${playerPosition.rank}</span>
            ${createAvatarHTML(playerPosition.selected_character)}
            <span class="player-position-name" style="color: ${getCharacterTextColor(playerPosition.selected_character)}">
              ${playerPosition.username || 'You'}
            </span>
            <span class="player-position-character">
              ${getCharacterDisplayName(playerPosition.selected_character, playerPosition.character_level)}
            </span>
          </div>
          <div class="player-position-right">
            <div class="player-stat-value">${statValue}</div>
            <div class="player-stat-label">${statLabel}</div>
          </div>
        </div>
      </div>
    `;
  }

  createUnconfirmedUserHTML(mapId) {
    return `
      <div style="
        background: linear-gradient(45deg, #e67e22, #d35400);
        padding: 0.8rem;
        border-radius: 8px;
        margin: 0.6rem auto 0 auto;
        border: 1px solid #f39c12;
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        text-align: center;
        max-width: 450px;
        position: relative;
      ">
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.6rem;">
          <img 
            src="/static/sprites/avatar/boba_avatar.png" 
            alt="Boba Avatar" 
            style="
              width: 22px; 
              height: 22px; 
              border-radius: 50%;
              border: 2px solid #f39c12;
            "
          />
          <h4 style="color: #fff; margin: 0; font-size: 1rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
            📧 Email Confirmation Required
          </h4>
        </div>
        <p style="color: #ecf0f1; margin: 0 0 0.8rem 0; font-size: 0.85rem; line-height: 1.4;">
          Confirm your account to get in the leaderboard
        </p>
        <div style="display: flex; justify-content: center;">
          <button 
            onclick="resendConfirmationFromLeaderboard()" 
            style="
              background: #f39c12;
              color: white;
              border: none;
              padding: 0.5rem 1.2rem;
              border-radius: 6px;
              cursor: pointer;
              font-size: 0.8rem;
              transition: all 0.3s ease;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            "
            onmouseover="this.style.background='#e67e22'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.4)'"
            onmouseout="this.style.background='#f39c12'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.3)'"
          >
            Resend Confirmation Email
          </button>
        </div>
      </div>
    `;
  }

  createGuestSuggestionHTML(mapId) {
    const isGameCompletion = mapId !== 0;

    if (isGameCompletion) {
      return this.createCompactGuestHTML();
    } else {
      return this.createFullGuestHTML();
    }
  }

  createCompactGuestHTML() {
    return `
      <div class="guest-actions compact">
        <h4 class="auth-title">🔒 Join the Leaderboard!</h4>
        <p class="auth-description">Create an account to get in leaderboard</p>
        <div class="auth-buttons">
          <button id="guest-login-btn" class="auth-button">Login</button>
          <button id="guest-register-btn" class="auth-button">Register</button>
        </div>
      </div>
    `;
  }

  createFullGuestHTML() {
    return `
      <div class="guest-actions">
        <h4 class="auth-title">🔒 Authentication Required</h4>
        <p class="auth-description">Create an account to get in leaderboard</p>
        <div class="auth-prompt">
          <button id="guest-login-btn" class="auth-button">Login</button>
          <button id="guest-register-btn" class="auth-button">Register</button>
        </div>
      </div>
    `;
  }

  createEmptyLeaderboardHTML(mapId) {
    let message;
    if (this.multiplayerMode) {
      message = "No multiplayer games yet! Challenge other players to see rankings!";
    } else if (mapId === 0) {
      message = "No scores yet! Be the first to complete any map!";
    } else {
      message = "No scores yet for this map! Be the first to complete it!";
    }

    return `
      <div class="empty-state">
        <div class="empty-icon-container">
          <div class="empty-icon">🏆</div>
        </div>
        <h3 class="empty-title">No Scores Yet</h3>
        <p class="empty-message">${message}</p>
        <p class="empty-subtitle">Start playing to see your name here!</p>
      </div>
    `;
  }

  createErrorHTML(message) {
    return `
      <div class="error-state">
        <div class="error-icon-container">
          <div class="error-icon">⚠️</div>
        </div>
        <h3 class="error-title">Unable to Load Leaderboard</h3>
        <p class="error-message">${message}</p>
        <p class="error-subtitle">Please try again later or contact support if the problem persists.</p>
      </div>
    `;
  }

  formatTime(timeValue) {
    if (timeValue === null || timeValue === undefined) return "N/A";
    
    // Convert to number if it's a string
    const numValue = Number(timeValue);
    
    // The backend now always sends milliseconds (int64)
    // So we can directly use the value as milliseconds 
    const totalMilliseconds = numValue;
    
    // Convert to seconds with 2 decimal places
    const totalSecondsFloat = totalMilliseconds / 1000.0;
    
    // If less than 60 seconds, show as "6.55"
    if (totalSecondsFloat < 60.0) {
      return totalSecondsFloat.toFixed(2);
    }
    
    // If 60 seconds or more, show as "2:06.55"
    const minutes = Math.floor(totalSecondsFloat / 60);
    const remainingSeconds = totalSecondsFloat - (minutes * 60);
    
    return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, '0')}`;
  }
}