package models

import (
	"boba-vim/internal/models/model_modules"
)

// Re-export all models from modules for backwards compatibility
type Player = model_modules.Player
type GameSession = model_modules.GameSession
type UserFavorite = model_modules.UserFavorite
type PlayerBestScore = model_modules.PlayerBestScore
type MapCompletion = model_modules.MapCompletion
type CharacterPayment = model_modules.CharacterPayment
type PlayerCharacterOwnership = model_modules.PlayerCharacterOwnership
type MatchmakingQueue = model_modules.MatchmakingQueue
type OnlineMatch = model_modules.OnlineMatch
type MultiplayerGameResult = model_modules.MultiplayerGameResult
type MultiplayerPlayerStats = model_modules.MultiplayerPlayerStats
type Survey = model_modules.Survey
type SurveyQuestion = model_modules.SurveyQuestion
type SurveyVote = model_modules.SurveyVote
type GameError = model_modules.GameError
type Newsletter = model_modules.Newsletter
type NewsletterRead = model_modules.NewsletterRead
type Admin = model_modules.Admin

// Re-export error variables
var (
	ErrMoveTooFast   = model_modules.ErrMoveTooFast
	ErrGameCompleted = model_modules.ErrGameCompleted
	ErrInvalidMove   = model_modules.ErrInvalidMove
)
