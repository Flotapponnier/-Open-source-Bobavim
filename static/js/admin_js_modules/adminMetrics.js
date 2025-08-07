// Admin Metrics Management
class AdminMetrics {
    constructor() {
        this.currentPage = 1;
        this.currentSearch = '';
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Metrics buttons
        document.getElementById('viewUserMetricsBtn')?.addEventListener('click', () => this.showUserMetrics());
        document.getElementById('viewGameMetricsBtn')?.addEventListener('click', () => this.showGameMetrics());
        document.getElementById('viewSystemMetricsBtn')?.addEventListener('click', () => this.showSystemMetrics());
        document.getElementById('viewUsersListBtn')?.addEventListener('click', () => this.showUsersList());

        // Modal close buttons
        document.getElementById('closeUserMetricsModal')?.addEventListener('click', () => this.closeModal('userMetricsModal'));
        document.getElementById('closeGameMetricsModal')?.addEventListener('click', () => this.closeModal('gameMetricsModal'));
        document.getElementById('closeSystemMetricsModal')?.addEventListener('click', () => this.closeModal('systemMetricsModal'));
        document.getElementById('closeUsersListModal')?.addEventListener('click', () => this.closeModal('usersListModal'));

        // Users list controls
        document.getElementById('searchUsersBtn')?.addEventListener('click', () => this.searchUsers());
        document.getElementById('userSearchInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchUsers();
            }
        });
        document.getElementById('prevPageBtn')?.addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn')?.addEventListener('click', () => this.nextPage());

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                e.target.style.display = 'none';
            }
        });
    }

    async showUserMetrics() {
        const modal = document.getElementById('userMetricsModal');
        const content = document.getElementById('userMetricsContent');
        
        modal.style.display = 'flex';
        content.innerHTML = '<div class="loading-message">Loading user metrics...</div>';

        try {
            const response = await fetch('/api/admin/user-metrics', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                content.innerHTML = this.renderUserMetrics(result.data);
            } else {
                content.innerHTML = '<div class="error-message">Failed to load user metrics</div>';
            }
        } catch (error) {
            console.error('Error loading user metrics:', error);
            content.innerHTML = '<div class="error-message">Failed to load user metrics</div>';
        }
    }

    async showGameMetrics() {
        const modal = document.getElementById('gameMetricsModal');
        const content = document.getElementById('gameMetricsContent');
        
        modal.style.display = 'flex';
        content.innerHTML = '<div class="loading-message">Loading game metrics...</div>';

        try {
            const response = await fetch('/api/admin/game-metrics', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                content.innerHTML = this.renderGameMetrics(result.data);
            } else {
                content.innerHTML = '<div class="error-message">Failed to load game metrics</div>';
            }
        } catch (error) {
            console.error('Error loading game metrics:', error);
            content.innerHTML = '<div class="error-message">Failed to load game metrics</div>';
        }
    }

    async showSystemMetrics() {
        const modal = document.getElementById('systemMetricsModal');
        const content = document.getElementById('systemMetricsContent');
        
        modal.style.display = 'flex';
        content.innerHTML = '<div class="loading-message">Loading system metrics...</div>';

        try {
            const response = await fetch('/api/admin/system-metrics', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                content.innerHTML = this.renderSystemMetrics(result.data);
            } else {
                content.innerHTML = '<div class="error-message">Failed to load system metrics</div>';
            }
        } catch (error) {
            console.error('Error loading system metrics:', error);
            content.innerHTML = '<div class="error-message">Failed to load system metrics</div>';
        }
    }

    async showUsersList(page = 1, search = '') {
        const modal = document.getElementById('usersListModal');
        const content = document.getElementById('usersListContent');
        
        modal.style.display = 'flex';
        if (page === 1) {
            content.innerHTML = '<div class="loading-message">Loading users...</div>';
        }

        this.currentPage = page;
        this.currentSearch = search;

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });
            if (search) {
                params.append('search', search);
            }

            const response = await fetch(`/api/admin/users-list?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                content.innerHTML = this.renderUsersList(result.data.users);
                this.updatePagination(result.data);
            } else {
                content.innerHTML = '<div class="error-message">Failed to load users</div>';
            }
        } catch (error) {
            console.error('Error loading users:', error);
            content.innerHTML = '<div class="error-message">Failed to load users</div>';
        }
    }

    searchUsers() {
        const searchInput = document.getElementById('userSearchInput');
        const searchTerm = searchInput.value.trim();
        this.showUsersList(1, searchTerm);
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.showUsersList(this.currentPage - 1, this.currentSearch);
        }
    }

    nextPage() {
        this.showUsersList(this.currentPage + 1, this.currentSearch);
    }

    updatePagination(data) {
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        pageInfo.textContent = `Page ${data.current_page} of ${data.total_pages} (${data.total} users)`;
        
        prevBtn.disabled = data.current_page <= 1;
        nextBtn.disabled = data.current_page >= data.total_pages;
    }

    renderUserMetrics(data) {
        return `
            <div class="metrics-grid">
                <div class="metric-card">
                    <h4>Total Users</h4>
                    <div class="metric-value">${data.total_users}</div>
                </div>
                <div class="metric-card">
                    <h4>Confirmed Users</h4>
                    <div class="metric-value">${data.confirmed_users}</div>
                    <div class="metric-percentage">${((data.confirmed_users / data.total_users) * 100).toFixed(1)}% of total</div>
                </div>
                <div class="metric-card">
                    <h4>Active Users (7 days)</h4>
                    <div class="metric-value">${data.active_users}</div>
                    <div class="metric-percentage">${((data.active_users / data.total_users) * 100).toFixed(1)}% of total</div>
                </div>
            </div>
            <div class="chart-section">
                <h4>Daily Signups (Last 30 Days)</h4>
                <div class="signup-chart">
                    ${this.renderSignupChart(data.daily_signups)}
                </div>
            </div>
        `;
    }

    renderGameMetrics(data) {
        return `
            <div class="metrics-grid">
                <div class="metric-card">
                    <h4>Total Games</h4>
                    <div class="metric-value">${data.total_games}</div>
                </div>
                <div class="metric-card">
                    <h4>Completed Games</h4>
                    <div class="metric-value">${data.completed_games}</div>
                    <div class="metric-percentage">${data.completion_rate.toFixed(1)}% completion rate</div>
                </div>
                <div class="metric-card">
                    <h4>Total Pearls Collected</h4>
                    <div class="metric-value">${data.total_pearls.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                    <h4>Average Completion Time</h4>
                    <div class="metric-value">${(data.avg_completion_time / 1000).toFixed(1)}s</div>
                </div>
            </div>
            <div class="chart-section">
                <h4>Most Popular Maps</h4>
                <div class="popular-maps">
                    ${this.renderPopularMaps(data.popular_maps)}
                </div>
            </div>
        `;
    }

    renderSystemMetrics(data) {
        return `
            <div class="metrics-grid">
                <div class="metric-card">
                    <h4>Newsletters</h4>
                    <div class="metric-value">${data.newsletter_count}</div>
                </div>
                <div class="metric-card">
                    <h4>Surveys</h4>
                    <div class="metric-value">${data.survey_count}</div>
                </div>
                <div class="metric-card">
                    <h4>Errors (24h)</h4>
                    <div class="metric-value">${data.error_count_24h}</div>
                </div>
            </div>
            <div class="chart-section">
                <h4>Recent Errors</h4>
                <div class="recent-errors">
                    ${this.renderRecentErrors(data.recent_errors)}
                </div>
            </div>
        `;
    }

    renderUsersList(users) {
        if (!users || users.length === 0) {
            return '<div class="no-data">No users found</div>';
        }

        return `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Confirmed</th>
                        <th>Games</th>
                        <th>Best Score</th>
                        <th>Registered</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td><span class="status-badge ${user.email_confirmed ? 'confirmed' : 'pending'}">${user.email_confirmed ? 'Yes' : 'No'}</span></td>
                            <td>${user.total_games}</td>
                            <td>${user.best_score || 0}</td>
                            <td>${new Date(user.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderSignupChart(signups) {
        if (!signups || signups.length === 0) {
            return '<div class="no-data">No signup data available</div>';
        }

        const maxCount = Math.max(...signups.map(s => s.count));
        return signups.slice(0, 10).map(signup => `
            <div class="chart-bar">
                <div class="bar-label">${new Date(signup.date).toLocaleDateString()}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${(signup.count / maxCount) * 100}%"></div>
                    <div class="bar-value">${signup.count}</div>
                </div>
            </div>
        `).join('');
    }

    renderPopularMaps(maps) {
        if (!maps || maps.length === 0) {
            return '<div class="no-data">No map data available</div>';
        }

        const maxCount = Math.max(...maps.map(m => m.play_count));
        return maps.map(map => `
            <div class="chart-bar">
                <div class="bar-label">${map.map_name}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${(map.play_count / maxCount) * 100}%"></div>
                    <div class="bar-value">${map.play_count}</div>
                </div>
            </div>
        `).join('');
    }

    renderRecentErrors(errors) {
        if (!errors || errors.length === 0) {
            return '<div class="no-data">No recent errors</div>';
        }

        return errors.map(error => `
            <div class="error-item">
                <div class="error-type">${error.error_type}</div>
                <div class="error-message">${error.message}</div>
                <div class="error-meta">
                    <span class="error-count">Count: ${error.count}</span>
                    <span class="error-time">Last seen: ${new Date(error.last_seen).toLocaleString()}</span>
                </div>
            </div>
        `).join('');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminMetrics = new AdminMetrics();
});