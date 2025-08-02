// Data fetching logic for leaderboard
export class DataFetcher {
  constructor(multiplayerMode = false) {
    this.multiplayerMode = multiplayerMode;
  }

  async fetchLeaderboardData(mapId) {
    try {
      let url;
      if (this.multiplayerMode) {
        // Multiplayer leaderboard - ignore mapId, get overall stats
        url = `/api/multiplayer/leaderboard?limit=20`;
      } else {
        // Ensure mapId is valid, default to 1 if not provided
        const validMapId = mapId && mapId > 0 ? mapId : 1;
        url = `/api/leaderboard-by-map?map_id=${validMapId}`;
      }

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const leaderboardData = await response.json();
      

      // Check authentication status and get player position
      const authResponse = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (authResponse.ok) {
        const authData = await authResponse.json();
        if (authData.success && authData.authenticated) {
          // Fetch player position
          let playerUrl;
          if (this.multiplayerMode) {
            // Multiplayer player position - ignore mapId
            playerUrl = `/api/multiplayer/player-position`;
          } else {
            // Ensure mapId is valid, default to 1 if not provided
            const validMapId = mapId && mapId > 0 ? mapId : 1;
            playerUrl = `/api/leaderboard-by-map?map_id=${validMapId}&player_position=true`;
          }

          const playerResponse = await fetch(playerUrl, {
            credentials: "include",
          });

          if (playerResponse.ok) {
            const playerData = await playerResponse.json();
            
            if (playerData.success && playerData.player_position) {
              leaderboardData.player_position = playerData.player_position;
            } else {
              // Handle various error cases
              if (playerData.error === "Confirm your account to get in the leaderboard") {
                leaderboardData.unconfirmed_user = true;
              }
              // For other errors like "Player has not completed this map yet", 
              // don't set player_position - this will hide "Your Position" section
            }
          }
        } else {
          leaderboardData.is_guest = true;
        }
      }

      return leaderboardData;
    } catch (error) {
      logger.error("Error fetching leaderboard:", error);
      throw error;
    }
  }

  async fetchMaps() {
    try {
      const response = await fetch("/api/maps");
      const data = await response.json();
      if (data.success && data.maps) {
        return data.maps;
      }
      return [];
    } catch (error) {
      logger.error("Error fetching maps:", error);
      return [];
    }
  }

  async resendConfirmationEmail() {
    const button = document.querySelector('button[onclick="resendConfirmationFromLeaderboard()"]');
    if (!button) return;

    const originalText = button.textContent;
    
    try {
      button.disabled = true;
      button.textContent = "Sending...";
      
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.updateButtonState(button, "Email sent!", "#27ae60", originalText);
      } else {
        this.updateButtonState(button, "Failed to send", "#e74c3c", originalText);
      }
    } catch (error) {
      logger.error("Error resending confirmation:", error);
      this.updateButtonState(button, "Network error", "#e74c3c", originalText);
    }
  }

  // Helper method to reduce duplicate setTimeout logic
  updateButtonState(button, text, backgroundColor, originalText) {
    button.textContent = text;
    button.style.background = backgroundColor;
    setTimeout(() => {
      button.disabled = false;
      button.textContent = originalText;
      button.style.background = "#f39c12";
    }, 3000);
  }
}