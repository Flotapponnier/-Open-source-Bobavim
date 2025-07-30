package model_modules

// Custom errors
var (
	ErrMoveTooFast   = &GameError{Code: "MOVE_TOO_FAST", Message: "Move requests too frequent"}
	ErrGameCompleted = &GameError{Code: "GAME_COMPLETED", Message: "Game already completed"}
	ErrInvalidMove   = &GameError{Code: "INVALID_MOVE", Message: "Invalid move"}
)

type GameError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *GameError) Error() string {
	return e.Message
}