// Map progression manager - handles map locking/unlocking based on completion
let completedMaps = new Set();
let isAuthenticated = false;
let isEmailConfirmed = false;
let currentUser = null;
let isInitialized = false;

// Initialize the progression manager
export async function initializeProgression() {
    if (isInitialized) {
        return; // Already initialized, don't reload
    }
    
    await loadCompletedMapsFromStorage();
    await checkAuthenticationStatus();
    isInitialized = true;
}

// Load completed maps from localStorage (for guests) or fetch from server (for users)
async function loadCompletedMapsFromStorage() {
    try {
        // First check if user is authenticated
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        const userData = await response.json();
        
        if (userData.success && userData.user) {
            // User is authenticated, fetch from server
            isAuthenticated = true;
            isEmailConfirmed = userData.user.email_confirmed || false;
            currentUser = userData.user;
            await loadCompletedMapsFromServer();
        } else {
            // Guest user, load from localStorage
            isAuthenticated = false;
            isEmailConfirmed = false;
            currentUser = null;
            loadCompletedMapsFromLocalStorage();
        }
    } catch (error) {
        logger.error('Error checking authentication:', error);
        // Fallback to localStorage
        isAuthenticated = false;
        isEmailConfirmed = false;
        currentUser = null;
        loadCompletedMapsFromLocalStorage();
    }
}

// Load completed maps from localStorage (guest users)
function loadCompletedMapsFromLocalStorage() {
    try {
        const stored = localStorage.getItem('boba_vim_completed_maps');
        if (stored) {
            const completed = JSON.parse(stored);
            completedMaps = new Set(completed);
        }
    } catch (error) {
        logger.error('Error loading completed maps from localStorage:', error);
        completedMaps = new Set();
    }
}

// Load completed maps from server (authenticated users)
async function loadCompletedMapsFromServer() {
    try {
        const response = await fetch('/api/completed-maps', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            completedMaps = new Set(data.completed_maps || []);
        } else {
            completedMaps = new Set();
        }
    } catch (error) {
        logger.error('Error loading completed maps from server:', error);
        completedMaps = new Set();
    }
}

// Check if a map is completed
export function isMapCompleted(mapId) {
    return completedMaps.has(mapId);
}

// Check if a map is unlocked - simplified logic: all tutorial maps (1-6) unlocked, maps 7+ need confirmed account
export function isMapUnlocked(mapId) {
    // Tutorial maps (1-6) are always accessible to everyone (guests and users)
    if (mapId <= 6) {
        return true;
    }
    
    // All non-tutorial maps (7+) require confirmed account
    if (mapId >= 7) {
        return isAuthenticated && isEmailConfirmed;
    }
    
    return false;
}

// Mark a map as completed
export async function markMapCompleted(mapId) {
    // Ensure progression is initialized before marking completion
    if (!isInitialized) {
        await initializeProgression();
    }
    
    logger.debug('Marking map as completed:', mapId);
    logger.debug('Current completed maps before:', Array.from(completedMaps));
    
    if (!completedMaps.has(mapId)) {
        completedMaps.add(mapId);
        
        logger.debug('Current completed maps after:', Array.from(completedMaps));
        
        if (isAuthenticated) {
            // For authenticated users, the server will handle this automatically
            // when they complete a game, so we just update our local cache
            logger.debug('User is authenticated, not saving to localStorage');
        } else {
            // For guests, save to localStorage
            logger.debug('User is guest, saving to localStorage');
            saveCompletedMapsToLocalStorage();
        }
    } else {
        logger.debug('Map', mapId, 'was already completed');
    }
}

// Save completed maps to localStorage (guest users)
function saveCompletedMapsToLocalStorage() {
    try {
        const completed = Array.from(completedMaps);
        logger.debug('Saving completed maps to localStorage:', completed);
        localStorage.setItem('boba_vim_completed_maps', JSON.stringify(completed));
        logger.debug('Successfully saved to localStorage');
    } catch (error) {
        logger.error('Error saving completed maps to localStorage:', error);
    }
}

// Get all completed maps
export function getCompletedMaps() {
    return Array.from(completedMaps);
}

// Check authentication status
async function checkAuthenticationStatus() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        const userData = await response.json();
        isAuthenticated = userData.success && userData.user;
        if (isAuthenticated) {
            isEmailConfirmed = userData.user.email_confirmed || false;
            currentUser = userData.user;
        } else {
            isEmailConfirmed = false;
            currentUser = null;
        }
    } catch (error) {
        isAuthenticated = false;
        isEmailConfirmed = false;
        currentUser = null;
    }
}

// Migrate guest progress when user creates account
export async function migrateGuestProgressToAccount() {
    if (!isAuthenticated) {
        return { success: false, error: 'User not authenticated' };
    }
    
    const guestCompletedMaps = Array.from(completedMaps);
    
    if (guestCompletedMaps.length === 0) {
        return { success: true, message: 'No progress to migrate' };
    }
    
    try {
        const response = await fetch('/api/migrate-guest-progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                guest_completed_maps: guestCompletedMaps
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear localStorage since progress is now on server
            localStorage.removeItem('boba_vim_completed_maps');
            // Reload from server to get the merged progress
            await loadCompletedMapsFromServer();
        }
        
        return data;
    } catch (error) {
        logger.error('Error migrating guest progress:', error);
        return { success: false, error: 'Migration failed' };
    }
}

// Refresh progression data (call after login/logout)
export async function refreshProgression() {
    isInitialized = false; // Reset to allow reinitialization
    await loadCompletedMapsFromStorage();
    await checkAuthenticationStatus();
    isInitialized = true;
}

// Get next unlocked map ID
export function getNextUnlockedMap() {
    for (let mapId = 1; mapId <= 19; mapId++) {
        if (!isMapCompleted(mapId) && isMapUnlocked(mapId)) {
            return mapId;
        }
    }
    return 1; // Default to first map if all completed
}

// Get progression statistics
export function getProgressionStats() {
    const totalMaps = 19;
    const completedCount = completedMaps.size;
    const unlockedCount = Array.from({length: 19}, (_, i) => i + 1)
        .filter(mapId => isMapUnlocked(mapId)).length;
    
    return {
        totalMaps,
        completedCount,
        unlockedCount,
        progressPercentage: Math.round((completedCount / totalMaps) * 100)
    };
}

// Get the reason why a map is locked
export function getMapLockReason(mapId) {
    // Tutorial maps (1-6) are never locked
    if (mapId <= 6) {
        return null;
    }
    
    // Non-tutorial maps (7+) are only locked for non-confirmed users
    if (mapId >= 7) {
        if (!isAuthenticated || !isEmailConfirmed) {
            return "Create and confirm your account to access all maps";
        }
        return null; // Confirmed users can access all maps
    }
    
    return null;
}

// Simplified check if user needs account confirmation for this map
export function requiresAccountConfirmation(mapId) {
    return mapId >= 7 && (!isAuthenticated || !isEmailConfirmed);
}

// Get current user information
export function getCurrentUser() {
    return currentUser;
}

// Check if user is authenticated
export function isUserAuthenticated() {
    return isAuthenticated;
}

// Check if user's email is confirmed
export function isUserEmailConfirmed() {
    return isEmailConfirmed;
}