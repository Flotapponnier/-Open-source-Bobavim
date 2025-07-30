package game_handler_modules

// Request types for game handlers
type SetUsernameRequest struct {
	Username string `json:"username" binding:"required,min=2,max=50"`
}

type MovePlayerRequest struct {
	Direction        string `json:"direction" binding:"required"`
	Count            int    `json:"count,omitempty"`
	HasExplicitCount bool   `json:"has_explicit_count,omitempty"`
}

type PlayOnlineRequest struct {
	SelectedCharacter string `json:"selected_character"`
}

type StartGameRequest struct {
	MapID             int    `json:"map_id" binding:"required,min=1,max=19"`
	SelectedCharacter string `json:"selected_character,omitempty"`
}

type MigrateGuestProgressRequest struct {
	GuestCompletedMaps []int `json:"guest_completed_maps"`
}