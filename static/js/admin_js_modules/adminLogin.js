// Admin Login Handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('adminLoginForm');
    const backToIndexBtn = document.getElementById('backToIndexBtn');
    const loginError = document.getElementById('loginError');

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const loginData = {
                username: formData.get('username'),
                password: formData.get('password')
            };

            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // Login successful - reload page to show admin panel
                    window.location.reload();
                } else {
                    // Check if server wants us to redirect
                    if (result.redirect) {
                        window.location.href = result.redirect;
                        return;
                    }
                    
                    // Show error message
                    loginError.textContent = result.error || 'Login failed. Please try again.';
                    loginError.style.display = 'block';
                }
            } catch (error) {
                logger.error('Login error:', error);
                loginError.textContent = 'An error occurred during login. Please try again.';
                loginError.style.display = 'block';
            }
        });
    }

    // Handle back to index button
    if (backToIndexBtn) {
        backToIndexBtn.addEventListener('click', function() {
            window.location.href = '/';
        });
    }

    // Hide error message when user starts typing
    const inputs = loginForm.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (loginError.style.display === 'block') {
                loginError.style.display = 'none';
            }
        });
    });
});