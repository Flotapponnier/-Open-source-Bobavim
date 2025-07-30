package services

import (
	"boba-vim/internal/models"
	"errors"
	"os"

	"github.com/stripe/stripe-go/v74"
	"gorm.io/gorm"
)

type PaymentService struct {
	db *gorm.DB
}

func NewPaymentService(db *gorm.DB) *PaymentService {
	// Initialize Stripe with secret key from environment
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	
	return &PaymentService{
		db: db,
	}
}

// SeedDefaultCharacters creates default character ownerships for a player
func (s *PaymentService) SeedDefaultCharacters(playerID uint) error {
	// Default characters available to all players
	defaultCharacters := []string{"boba", "pinky"}
	
	for _, charName := range defaultCharacters {
		// Check if character already exists
		var existing models.PlayerCharacterOwnership
		err := s.db.Where("player_id = ? AND character_name = ?", playerID, charName).First(&existing).Error
		if err == nil {
			// Character already exists, skip
			continue
		}
		
		// Create default character ownership
		ownership := models.PlayerCharacterOwnership{
			PlayerID:      playerID,
			CharacterName: charName,
			Level:         1,
			UnlockMethod:  "default",
		}
		
		if err := s.db.Create(&ownership).Error; err != nil {
			return err
		}
	}
	
	return nil
}

// SeedRegistrationCharacters creates registration-unlocked characters for a player
func (s *PaymentService) SeedRegistrationCharacters(playerID uint) error {
	// Characters unlocked upon registration
	registrationCharacters := []string{"golden", "black"}
	
	for _, charName := range registrationCharacters {
		// Check if character already exists
		var existing models.PlayerCharacterOwnership
		err := s.db.Where("player_id = ? AND character_name = ?", playerID, charName).First(&existing).Error
		if err == nil {
			// Character already exists, skip
			continue
		}
		
		// Create registration character ownership
		ownership := models.PlayerCharacterOwnership{
			PlayerID:      playerID,
			CharacterName: charName,
			Level:         1,
			UnlockMethod:  "registration",
		}
		
		if err := s.db.Create(&ownership).Error; err != nil {
			return err
		}
	}
	
	return nil
}

// GetPlayerCharacterOwnership returns all characters owned by a player
func (s *PaymentService) GetPlayerCharacterOwnership(playerID uint) ([]models.PlayerCharacterOwnership, error) {
	var ownerships []models.PlayerCharacterOwnership
	err := s.db.Where("player_id = ?", playerID).Preload("Payment").Find(&ownerships).Error
	return ownerships, err
}

// HasCharacter checks if a player owns a specific character
func (s *PaymentService) HasCharacter(playerID uint, characterName string) (bool, *models.PlayerCharacterOwnership, error) {
	var ownership models.PlayerCharacterOwnership
	err := s.db.Where("player_id = ? AND character_name = ?", playerID, characterName).First(&ownership).Error
	
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil, nil
		}
		return false, nil, err
	}
	
	return true, &ownership, nil
}

// GetCharacterLevel returns the level of a character owned by a player
func (s *PaymentService) GetCharacterLevel(playerID uint, characterName string) (int, error) {
	var ownership models.PlayerCharacterOwnership
	err := s.db.Where("player_id = ? AND character_name = ?", playerID, characterName).First(&ownership).Error
	
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, errors.New("character not owned")
		}
		return 0, err
	}
	
	return ownership.Level, nil
}

// GetCharacterDisplayName returns the display name with level for a character
func (s *PaymentService) GetCharacterDisplayName(playerID uint, characterName string) (string, error) {
	var ownership models.PlayerCharacterOwnership
	err := s.db.Where("player_id = ? AND character_name = ?", playerID, characterName).First(&ownership).Error
	
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return characterName, nil // Return base name if not owned
		}
		return "", err
	}
	
	return ownership.GetDisplayName(), nil
}

// IsCharacterAvailableForPurchase checks if a character can be purchased
func (s *PaymentService) IsCharacterAvailableForPurchase(characterName string) bool {
	// Currently only boba_diamond is available for purchase
	return characterName == "boba_diamond"
}

// GetMinimumPurchaseAmount returns the minimum amount required to purchase a character
func (s *PaymentService) GetMinimumPurchaseAmount(characterName string) int {
	// Minimum 1 euro (100 cents) for all purchasable characters
	return 100
}