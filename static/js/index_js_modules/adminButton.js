/**
 * Admin Button Module
 * Handles admin button visibility and functionality
 */

export function initializeAdminButton() {
    const adminButton = document.getElementById('adminButton');
    
    if (adminButton) {
        adminButton.addEventListener('click', () => {
            window.location.href = '/admin/dashboard/secure';
        });
    }
    
    // Check admin status and show/hide button
    checkAdminStatus();
}

async function checkAdminStatus() {
    try {
        const response = await fetch('/api/admin/status', {
            credentials: 'include'
        });
        const data = await response.json();
        
        const adminButton = document.getElementById('adminButton');
        if (adminButton) {
            if (data.is_admin) {
                adminButton.classList.remove('hidden');
                logger.debug('Admin button shown for user:', data.username);
            } else {
                adminButton.classList.add('hidden');
            }
        }
    } catch (error) {
        logger.error('Error checking admin status:', error);
        // Hide button on error to be safe
        const adminButton = document.getElementById('adminButton');
        if (adminButton) {
            adminButton.classList.add('hidden');
        }
    }
}