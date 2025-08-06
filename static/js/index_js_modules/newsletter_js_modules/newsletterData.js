/**
 * Newsletter Data Module
 * Handles loading and displaying newsletter data from the API
 */

import { showNewsGameArea } from './newsletterModal.js';

const API_ENDPOINTS = {
  NEWSLETTERS: '/api/newsletters',
  NEWSLETTER_BY_ID: '/api/newsletters'
};

export async function loadNewsletters() {
  try {
    const response = await fetch(API_ENDPOINTS.NEWSLETTERS);
    const data = await response.json();
    
    if (data.success) {
      return data.newsletters;
    } else {
      logger.error('Failed to load newsletters:', data.error);
      return [];
    }
  } catch (error) {
    logger.error('Error loading newsletters:', error);
    return [];
  }
}

export async function loadNewsletterById(id) {
  try {
    const response = await fetch(`${API_ENDPOINTS.NEWSLETTER_BY_ID}/${id}`);
    const data = await response.json();
    
    if (data.success) {
      return data.newsletter;
    } else {
      logger.error('Failed to load newsletter:', data.error);
      return null;
    }
  } catch (error) {
    logger.error('Error loading newsletter:', error);
    return null;
  }
}

export function renderNewsletterList(newsletters) {
  const newsList = document.querySelector('.news-list');
  if (!newsList) return;
  
  if (!newsletters || newsletters.length === 0) {
    newsList.innerHTML = `
      <div class="news-item">
        <h4>No news available</h4>
        <p>Check back later for updates from Boba Boss!</p>
      </div>
    `;
    return;
  }
  
  newsList.innerHTML = newsletters.map(newsletter => `
    <div class="news-item" data-news-id="${newsletter.id}">
      <h4>
        ${escapeHtml(newsletter.title)}
        ${!newsletter.is_read ? '<span class="unread-indicator">!</span>' : ''}
      </h4>
      <p>${escapeHtml(newsletter.summary || newsletter.content.substring(0, 100) + '...')}</p>
      <button class="read-more-btn" data-newsletter-id="${newsletter.id}">Click to read more</button>
    </div>
  `).join('');
  
  // Bind click events to read more buttons
  newsList.querySelectorAll('.read-more-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const newsletterId = btn.getAttribute('data-newsletter-id');
      showFullNewsletter(parseInt(newsletterId));
    });
  });
}

export async function showFullNewsletter(newsletterId) {
  const newsletter = await loadNewsletterById(newsletterId);
  if (!newsletter) {
    logger.error('Newsletter not found:', newsletterId);
    return;
  }
  
  // Update the news game area with the newsletter content
  const newsTitle = document.getElementById('newsTitle');
  const newsContent = document.getElementById('newsContent');
  
  if (newsTitle) {
    newsTitle.textContent = newsletter.title;
  }
  
  if (newsContent) {
    newsContent.innerHTML = newsletter.content;
  }
  
  // Remove unread indicator immediately for better UX
  removeUnreadIndicator(newsletterId);
  
  // Mark newsletter as read in the background
  markNewsletterAsRead(newsletterId);
  
  // Show the news game area
  showNewsGameArea();
}

export async function markNewsletterAsRead(newsletterId) {
  try {
    const response = await fetch(`${API_ENDPOINTS.NEWSLETTER_BY_ID}/${newsletterId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      logger.debug('Newsletter marked as read');
      // Update the newsletter list to remove the unread indicator
      removeUnreadIndicator(newsletterId);
    } else {
      logger.error('Failed to mark newsletter as read');
    }
  } catch (error) {
    logger.error('Error marking newsletter as read:', error);
  }
}

function removeUnreadIndicator(newsletterId) {
  const newsItem = document.querySelector(`[data-news-id="${newsletterId}"]`);
  if (newsItem) {
    const unreadIndicator = newsItem.querySelector('.unread-indicator');
    if (unreadIndicator) {
      // Add a fade-out animation before removing
      unreadIndicator.style.transition = 'opacity 0.3s ease';
      unreadIndicator.style.opacity = '0';
      setTimeout(() => {
        unreadIndicator.remove();
      }, 300);
      logger.debug('Unread indicator removed for newsletter:', newsletterId);
    }
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}