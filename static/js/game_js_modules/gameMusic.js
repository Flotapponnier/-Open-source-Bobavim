// Game Music functionality for background music control
class GameMusicManager {
    constructor() {
        this.audio = null;
        this.musicButton = null;
        this.stopOverlay = null;
        this.isPlaying = false;
        this.storageKey = 'boba-vim-music-enabled';
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupMusic());
        } else {
            this.setupMusic();
        }
    }

    setupMusic() {
        logger.debug('Setting up game music...');
        this.audio = document.getElementById('gameBackgroundMusic');
        this.musicButton = document.getElementById('gameMusicButton');
        this.stopOverlay = document.getElementById('gameStopOverlay');

        logger.debug('Game music elements found:', {
            audio: !!this.audio,
            musicButton: !!this.musicButton,
            stopOverlay: !!this.stopOverlay
        });

        if (!this.audio || !this.musicButton) {
            logger.warn('Game music elements not found - music functionality disabled');
            return;
        }

        // Set up event listeners
        this.musicButton.addEventListener('click', () => this.toggleMusic());
        
        // Add audio event listeners for better debugging
        this.audio.addEventListener('loadstart', () => logger.debug('Game audio loading started'));
        this.audio.addEventListener('canplay', () => logger.debug('Game audio can play'));
        this.audio.addEventListener('play', () => logger.debug('Game audio started playing'));
        this.audio.addEventListener('pause', () => logger.debug('Game audio paused'));
        this.audio.addEventListener('error', (e) => logger.error('Game audio error:', e));
        
        // Check user preference and start music accordingly
        this.initializeMusic();
    }

    // Get user's music preference from localStorage
    getMusicPreference() {
        const preference = localStorage.getItem(this.storageKey);
        // Default to true (music enabled) if no preference is stored
        return preference === null ? true : preference === 'true';
    }

    // Save user's music preference to localStorage
    saveMusicPreference(enabled) {
        localStorage.setItem(this.storageKey, enabled.toString());
    }

    // Initialize music based on user preference
    async initializeMusic() {
        const musicEnabled = this.getMusicPreference();
        logger.debug('Game music preference from localStorage:', musicEnabled);
        
        // Always start with the button in the correct visual state
        this.isPlaying = false; // Start as stopped since autoplay likely won't work
        this.updateButtonState();
        
        if (musicEnabled) {
            await this.startMusic();
        } else {
            logger.debug('Game music disabled by user preference');
        }
    }

    async startMusic() {
        if (!this.audio) {
            logger.error('No game audio element available');
            return;
        }

        try {
            logger.debug('Attempting to start game music...');
            // Set volume to ensure it's audible
            this.audio.volume = 0.8; // Higher volume for game music
            
            // Try to play
            const playPromise = this.audio.play();
            
            if (playPromise !== undefined) {
                await playPromise;
                this.isPlaying = true;
                logger.debug('Game music started successfully');
            }
            this.updateButtonState();
        } catch (error) {
            logger.debug('Game music autoplay prevented by browser policy. User interaction required.', error);
            // If autoplay fails, we'll wait for user interaction
            this.isPlaying = false;
            this.updateButtonState();
            
            // Add a one-time click listener to the document to start music on any user interaction
            this.addAutoplayFallback();
        }
    }

    addAutoplayFallback() {
        logger.debug('Adding game music autoplay fallback - music will start on next user interaction');
        
        const startMusicOnInteraction = async () => {
            if (!this.isPlaying && this.getMusicPreference()) {
                try {
                    logger.debug('Attempting to start game music after user interaction...');
                    await this.audio.play();
                    this.isPlaying = true;
                    this.updateButtonState();
                    logger.debug('Game music started successfully after user interaction');
                } catch (error) {
                    logger.error('Failed to start game music even after user interaction:', error);
                }
            }
            // Remove this listener after first use
            document.removeEventListener('click', startMusicOnInteraction);
            document.removeEventListener('keydown', startMusicOnInteraction);
            document.removeEventListener('touchstart', startMusicOnInteraction);
        };
        
        // Add multiple event listeners for better mobile support
        document.addEventListener('click', startMusicOnInteraction, { once: true });
        document.addEventListener('keydown', startMusicOnInteraction, { once: true });
        document.addEventListener('touchstart', startMusicOnInteraction, { once: true });
    }

    async toggleMusic() {
        if (!this.audio) {
            logger.error('No game audio element for toggle');
            return;
        }

        logger.debug('Toggling game music. Current state:', this.isPlaying);

        try {
            if (this.isPlaying) {
                // Music is playing, pause it
                this.audio.pause();
                this.isPlaying = false;
                logger.debug('Game music paused');
            } else {
                // Music is not playing, try to start it
                logger.debug('Attempting to start game music from button click...');
                
                // Reset audio to beginning
                this.audio.currentTime = 0;
                
                // Ensure volume is set
                this.audio.volume = 0.8;
                
                // Try to play
                await this.audio.play();
                this.isPlaying = true;
                logger.debug('Game music started from button click');
            }
            
            // Save user preference
            this.saveMusicPreference(this.isPlaying);
            this.updateButtonState();
        } catch (error) {
            logger.error('Error toggling game music:', error);
            // Even if there's an error, update the button state
            this.updateButtonState();
        }
    }

    updateButtonState() {
        if (!this.musicButton) {
            logger.error('No game music button element for state update');
            return;
        }

        logger.debug('Updating game music button state. Playing:', this.isPlaying);

        // Get the parent container for the stopped class
        const musicButtonContainer = this.musicButton.closest('.game-music-button');
        
        if (this.isPlaying) {
            // Music is playing - show normal state
            if (musicButtonContainer) {
                musicButtonContainer.classList.remove('stopped');
            }
            this.musicButton.classList.remove('stopped');
            this.musicButton.title = 'Stop Music';
            logger.debug('Game music button set to playing state (normal color)');
        } else {
            // Music is stopped - show grey state with pause icon
            if (musicButtonContainer) {
                musicButtonContainer.classList.add('stopped');
            }
            this.musicButton.classList.add('stopped');
            this.musicButton.title = 'Play Music';
            logger.debug('Game music button set to stopped state (should be grey with pause icon)');
        }
        
        // Force a repaint to ensure CSS changes are applied
        if (musicButtonContainer) {
            musicButtonContainer.offsetHeight; // Trigger reflow
        }
    }

    // Public method to stop music (can be called from other modules)
    stopMusic() {
        if (this.audio && this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            this.saveMusicPreference(false);
            this.updateButtonState();
        }
    }

    // Public method to start music (can be called from other modules)
    async playMusic() {
        if (this.audio && !this.isPlaying) {
            try {
                await this.audio.play();
                this.isPlaying = true;
                this.saveMusicPreference(true);
                this.updateButtonState();
            } catch (error) {
                logger.error('Error starting game music:', error);
            }
        }
    }
}

// Create global instance
const gameMusicManager = new GameMusicManager();

// Export for potential use in other modules
export function initializeGameMusic() {
  return gameMusicManager;
}

export { gameMusicManager };