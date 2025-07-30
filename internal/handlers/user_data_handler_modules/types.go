package user_data_handler_modules

// Request types for user data handlers
type AddFavoriteRequest struct {
	MapID int `json:"map_id" binding:"required"`
}

type RemoveFavoriteRequest struct {
	MapID int `json:"map_id" binding:"required"`
}

type UpdateBestTimeRequest struct {
	MapID          int   `json:"map_id" binding:"required"`
	CompletionTime int64 `json:"completion_time" binding:"required"`
	FinalScore     int   `json:"final_score" binding:"required"`
}