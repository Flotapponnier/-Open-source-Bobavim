// Music functionality for background music control
class MusicManager {
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
        logger.debug('Setting up music...');
        this.audio = document.getElementById('backgroundMusic');
        this.musicButton = document.getElementById('musicButton');
        this.stopOverlay = document.getElementById('stopOverlay');

        logger.debug('Music elements found:', {
            audio: !!this.audio,
            musicButton: !!this.musicButton,
            stopOverlay: !!this.stopOverlay
        });

        if (!this.audio || !this.musicButton) {
            logger.debug('Music elements not found - music functionality disabled');
            return;
        }

        // Set up event listeners
        this.musicButton.addEventListener('click', () => this.toggleMusic());
        
        // Add audio event listeners for better debugging
        this.audio.addEventListener('loadstart', () => logger.debug('Audio loading started'));
        this.audio.addEventListener('canplay', () => logger.debug('Audio can play'));
        this.audio.addEventListener('play', () => logger.debug('Audio started playing'));
        this.audio.addEventListener('pause', () => logger.debug('Audio paused'));
        this.audio.addEventListener('error', (e) => logger.error('Audio error:', e));
        
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
        logger.debug('Music preference from localStorage:', musicEnabled);
        
        // Always start with the button in the correct visual state
        this.isPlaying = false; // Start as stopped since autoplay likely won't work
        this.updateButtonState();
        
        if (musicEnabled) {
            await this.startMusic();
        } else {
            logger.debug('Music disabled by user preference');
        }
    }

    async startMusic() {
        if (!this.audio) {
            logger.error('No audio element available');
            return;
        }

        try {
            logger.debug('Attempting to start music...');
            // Set volume to ensure it's audible
            this.audio.volume = 0.3;
            
            // Try to play
            const playPromise = this.audio.play();
            
            if (playPromise !== undefined) {
                await playPromise;
                this.isPlaying = true;
                logger.debug('Music started successfully');
            }
            this.updateButtonState();
        } catch (error) {
            logger.info('Autoplay prevented by browser policy. User interaction required.', error);
            // If autoplay fails, we'll wait for user interaction
            this.isPlaying = false;
            this.updateButtonState();
            
            // Add a one-time click listener to the document to start music on any user interaction
            this.addAutoplayFallback();
        }
    }

    addAutoplayFallback() {
        logger.debug('Adding autoplay fallback - music will start on next user interaction');
        
        const startMusicOnInteraction = async () => {
            if (!this.isPlaying && this.getMusicPreference()) {
                try {
                    logger.debug('Attempting to start music after user interaction...');
                    await this.audio.play();
                    this.isPlaying = true;
                    this.updateButtonState();
                    logger.debug('Music started successfully after user interaction');
                } catch (error) {
                    logger.error('Failed to start music even after user interaction:', error);
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
            logger.error('No audio element for toggle');
            return;
        }

        logger.debug('Toggling music. Current state:', this.isPlaying);

        try {
            if (this.isPlaying) {
                // Music is playing, pause it
                this.audio.pause();
                this.isPlaying = false;
                logger.debug('Music paused');
            } else {
                // Music is not playing, try to start it
                logger.debug('Attempting to start music from button click...');
                
                // Reset audio to beginning
                this.audio.currentTime = 0;
                
                // Ensure volume is set
                this.audio.volume = 0.3;
                
                // Try to play
                await this.audio.play();
                this.isPlaying = true;
                logger.debug('Music started from button click');
            }
            
            // Save user preference
            this.saveMusicPreference(this.isPlaying);
            this.updateButtonState();
        } catch (error) {
            logger.error('Error toggling music:', error);
            // Even if there's an error, update the button state
            this.updateButtonState();
        }
    }

    updateButtonState() {
        if (!this.musicButton) {
            logger.error('No music button element for state update');
            return;
        }

        logger.debug('Updating button state. Playing:', this.isPlaying);

        // Get the parent container for the stopped class
        const musicButtonContainer = this.musicButton.closest('.music-button');
        
        if (this.isPlaying) {
            // Music is playing - show normal state
            if (musicButtonContainer) {
                musicButtonContainer.classList.remove('stopped');
            }
            this.musicButton.classList.remove('stopped');
            this.musicButton.title = 'Stop Music';
            logger.debug('Button set to playing state (normal color)');
        } else {
            // Music is stopped - show grey state with pause icon
            if (musicButtonContainer) {
                musicButtonContainer.classList.add('stopped');
            }
            this.musicButton.classList.add('stopped');
            this.musicButton.title = 'Play Music';
            logger.debug('Button set to stopped state (should be grey with pause icon)');
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
                logger.error('Error starting music:', error);
            }
        }
    }
}

// Create global instance
const musicManager = new MusicManager();

// Export for potential use in other modules
export { musicManager };