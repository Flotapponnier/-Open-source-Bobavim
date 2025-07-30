// Game Sound Effects functionality for action feedback sounds
class GameSoundEffectsManager {
    constructor() {
        this.sounds = {};
        this.isEnabled = true;
        this.storageKey = 'boba-vim-sound-effects-enabled';
        this.soundBasePath = '/static/music/game/game_effect/';
        this.init();
    }

    init() {
        // Initialize sound effects
        this.initializeSounds();
        
        // Load user preference
        this.loadSoundPreference();
        
        logger.debug('Game sound effects initialized');
    }

    initializeSounds() {
        // Define all sound effects with their file paths
        const soundFiles = {
            timeout: 'time_out.mp3',
            pearlCollected: 'pearl_collected.mp3',
            moldCollision: 'mold_over.mp3',
            gameComplete: 'game_complete.mp3',
            blockedMovement: 'blocked_,movement.mp3'
        };

        // Create Audio objects for each sound
        for (const [key, filename] of Object.entries(soundFiles)) {
            this.sounds[key] = new Audio(this.soundBasePath + filename);
            this.sounds[key].volume = 0.6; // Set moderate volume
            this.sounds[key].preload = 'auto';
            
            // Add error handling
            this.sounds[key].addEventListener('error', (e) => {
                logger.error(`Error loading sound effect ${key}:`, e);
            });
        }
    }

    // Load user's sound preference from localStorage
    loadSoundPreference() {
        const preference = localStorage.getItem(this.storageKey);
        // Default to true (sounds enabled) if no preference is stored
        this.isEnabled = preference === null ? true : preference === 'true';
        logger.debug('Sound effects preference loaded:', this.isEnabled);
    }

    // Save user's sound preference to localStorage
    saveSoundPreference(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem(this.storageKey, enabled.toString());
        logger.debug('Sound effects preference saved:', enabled);
    }

    // Play a sound effect
    playSound(soundKey) {
        if (!this.isEnabled) {
            logger.debug(`Sound effects disabled - not playing ${soundKey}`);
            return;
        }

        const sound = this.sounds[soundKey];
        if (!sound) {
            logger.warn(`Sound effect not found: ${soundKey}`);
            return;
        }

        try {
            // Reset the sound to beginning if it's already playing
            sound.currentTime = 0;
            
            // Play the sound
            const playPromise = sound.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    logger.debug(`Sound effect played: ${soundKey}`);
                }).catch(error => {
                    logger.error(`Error playing sound effect ${soundKey}:`, error);
                });
            }
        } catch (error) {
            logger.error(`Error playing sound effect ${soundKey}:`, error);
        }
    }

    // Specific sound effect methods
    playTimeoutSound() {
        this.playSound('timeout');
    }

    playPearlCollectedSound() {
        this.playSound('pearlCollected');
    }

    playMoldCollisionSound() {
        this.playSound('moldCollision');
    }

    playGameCompleteSound() {
        this.playSound('gameComplete');
    }

    playBlockedMovementSound() {
        this.playSound('blockedMovement');
    }

    // Toggle sound effects on/off
    toggleSoundEffects() {
        this.saveSoundPreference(!this.isEnabled);
        return this.isEnabled;
    }

    // Public method to enable sound effects
    enableSoundEffects() {
        this.saveSoundPreference(true);
    }

    // Public method to disable sound effects
    disableSoundEffects() {
        this.saveSoundPreference(false);
    }

    // Check if sound effects are enabled
    isSoundEnabled() {
        return this.isEnabled;
    }
}

// Create global instance
const gameSoundEffectsManager = new GameSoundEffectsManager();

// Export for use in other modules
export function initializeGameSoundEffects() {
    return gameSoundEffectsManager;
}

export { gameSoundEffectsManager };

// Make it available globally for easy access
window.gameSoundEffectsManager = gameSoundEffectsManager;