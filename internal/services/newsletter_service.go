package services

import (
	"boba-vim/internal/models"
	"time"
	"gorm.io/gorm"
)

type NewsletterService struct {
	db *gorm.DB
}

func NewNewsletterService(db *gorm.DB) *NewsletterService {
	return &NewsletterService{db: db}
}

// GetActiveNewsletters returns all active newsletters ordered by creation date (newest first)
func (ns *NewsletterService) GetActiveNewsletters() ([]models.Newsletter, error) {
	var newsletters []models.Newsletter
	err := ns.db.Where("is_active = ?", true).Order("created_at DESC").Find(&newsletters).Error
	return newsletters, err
}

// GetNewsletterByID returns a specific newsletter by ID
func (ns *NewsletterService) GetNewsletterByID(id uint) (*models.Newsletter, error) {
	var newsletter models.Newsletter
	err := ns.db.Where("id = ? AND is_active = ?", id, true).First(&newsletter).Error
	if err != nil {
		return nil, err
	}
	return &newsletter, nil
}

// CreateNewsletter creates a new newsletter post
func (ns *NewsletterService) CreateNewsletter(title, content, summary string) (*models.Newsletter, error) {
	newsletter := models.Newsletter{
		Title:    title,
		Content:  content,
		Summary:  summary,
		IsActive: true,
	}

	err := ns.db.Create(&newsletter).Error
	if err != nil {
		return nil, err
	}

	return &newsletter, nil
}

// UpdateNewsletter updates an existing newsletter
func (ns *NewsletterService) UpdateNewsletter(id uint, title, content, summary string) (*models.Newsletter, error) {
	var newsletter models.Newsletter
	if err := ns.db.First(&newsletter, id).Error; err != nil {
		return nil, err
	}

	newsletter.Title = title
	newsletter.Content = content
	newsletter.Summary = summary

	err := ns.db.Save(&newsletter).Error
	if err != nil {
		return nil, err
	}

	return &newsletter, nil
}

// DeleteNewsletter soft deletes a newsletter
func (ns *NewsletterService) DeleteNewsletter(id uint) error {
	return ns.db.Delete(&models.Newsletter{}, id).Error
}

// DeactivateNewsletter sets a newsletter as inactive instead of deleting
func (ns *NewsletterService) DeactivateNewsletter(id uint) error {
	return ns.db.Model(&models.Newsletter{}).Where("id = ?", id).Update("is_active", false).Error
}

// GetNewslettersWithReadStatus returns newsletters with read status for a specific player
func (ns *NewsletterService) GetNewslettersWithReadStatus(playerID uint) ([]map[string]interface{}, error) {
	var newsletters []models.Newsletter
	err := ns.db.Where("is_active = ?", true).Order("created_at DESC").Find(&newsletters).Error
	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, len(newsletters))
	for i, newsletter := range newsletters {
		// Check if user has read this newsletter
		var readRecord models.NewsletterRead
		isRead := ns.db.Where("player_id = ? AND newsletter_id = ?", playerID, newsletter.ID).First(&readRecord).Error == nil

		result[i] = map[string]interface{}{
			"id":         newsletter.ID,
			"title":      newsletter.Title,
			"content":    newsletter.Content,
			"summary":    newsletter.Summary,
			"is_active":  newsletter.IsActive,
			"created_at": newsletter.CreatedAt,
			"updated_at": newsletter.UpdatedAt,
			"is_read":    isRead,
		}
	}

	return result, nil
}

// MarkNewsletterAsRead marks a newsletter as read for a specific player
func (ns *NewsletterService) MarkNewsletterAsRead(playerID, newsletterID uint) error {
	// Check if already marked as read
	var existing models.NewsletterRead
	if err := ns.db.Where("player_id = ? AND newsletter_id = ?", playerID, newsletterID).First(&existing).Error; err == nil {
		// Already read, just update the read time
		existing.ReadAt = time.Now()
		return ns.db.Save(&existing).Error
	}

	// Create new read record
	readRecord := models.NewsletterRead{
		PlayerID:     playerID,
		NewsletterID: newsletterID,
		ReadAt:       time.Now(),
	}

	return ns.db.Create(&readRecord).Error
}