package multiplayer

// SetPlayerPosition sets player 1's position
func (gs *GameState) SetPlayerPosition(row, col int) {
	gs.mutex.Lock()
	defer gs.mutex.Unlock()
	
	// Clear old position
	if gs.Player1Row < len(gs.GameMap) && gs.Player1Row >= 0 && len(gs.GameMap[gs.Player1Row]) > 0 && gs.Player1Col < len(gs.GameMap[gs.Player1Row]) && gs.Player1Col >= 0 {
		gs.GameMap[gs.Player1Row][gs.Player1Col] = EMPTY
	}
	
	// Set new position
	gs.Player1Row = row
	gs.Player1Col = col
	if row < len(gs.GameMap) && row >= 0 && len(gs.GameMap[row]) > 0 && col < len(gs.GameMap[row]) && col >= 0 {
		gs.GameMap[row][col] = PLAYER
	}
}

// SetPlayer2Position sets player 2's position
func (gs *GameState) SetPlayer2Position(row, col int) {
	gs.mutex.Lock()
	defer gs.mutex.Unlock()
	
	// Clear old position
	if gs.Player2Row < len(gs.GameMap) && gs.Player2Row >= 0 && len(gs.GameMap[gs.Player2Row]) > 0 && gs.Player2Col < len(gs.GameMap[gs.Player2Row]) && gs.Player2Col >= 0 {
		gs.GameMap[gs.Player2Row][gs.Player2Col] = EMPTY
	}
	
	// Set new position
	gs.Player2Row = row
	gs.Player2Col = col
	if row < len(gs.GameMap) && row >= 0 && len(gs.GameMap[row]) > 0 && col < len(gs.GameMap[row]) && col >= 0 {
		gs.GameMap[row][col] = PLAYER // Both players use the same value for now
	}
}

// GetPlayerPosition returns player 1's position
func (gs *GameState) GetPlayerPosition() Position {
	gs.mutex.RLock()
	defer gs.mutex.RUnlock()
	
	return Position{Row: gs.Player1Row, Col: gs.Player1Col}
}

// GetPlayer2Position returns player 2's position
func (gs *GameState) GetPlayer2Position() Position {
	gs.mutex.RLock()
	defer gs.mutex.RUnlock()
	
	return Position{Row: gs.Player2Row, Col: gs.Player2Col}
}