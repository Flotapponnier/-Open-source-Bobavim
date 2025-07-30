package constant

// VimMotionScores defines the scoring system for different vim motions
type VimMotionScores struct {
	// Basic directional movement (h, j, k, l)
	BasicMovement map[string]int

	// Word movement (w, W, e, E, b, B, ge, gE)
	WordMovement map[string]int

	// Line movement (0, $, ^, g_)
	LineMovement map[string]int

	// Find character movement (f, F, t, T)
	FindChar map[string]int

	// Repeat find movement (; and ,)
	RepeatFind map[string]int

	// File/line jumping (gg, G, line numbers)
	FileJump map[string]int

	// Screen movement (H, M, L)
	ScreenMovement map[string]int

	// Paragraph/section movement ({, }, (, ))
	ParagraphMovement map[string]int

	// Match movement (%)
	MatchMovement map[string]int

	// Arrow key penalty
	ArrowPenalty map[string]int
}

// GetVimMotionScores returns the configured scoring system
func GetVimMotionScores() *VimMotionScores {
	return &VimMotionScores{
		BasicMovement: map[string]int{
			"h": 100,
			"j": 100,
			"k": 100,
			"l": 100,
		},
		WordMovement: map[string]int{
			"w":  120,
			"W":  120,
			"e":  120,
			"E":  120,
			"b":  120,
			"B":  120,
			"ge": 120,
			"gE": 120,
		},
		LineMovement: map[string]int{
			"0":  120,
			"$":  120,
			"^":  130,
			"g_": 130,
		},
		FindChar: map[string]int{
			"f": 125,
			"F": 125,
			"t": 125,
			"T": 125,
		},
		RepeatFind: map[string]int{
			";": 130,
			",": 130,
		},
		FileJump: map[string]int{
			"gg": 130,
			"G":  130,
		},
		ScreenMovement: map[string]int{
			"H": 150,
			"M": 150,
			"L": 150,
		},
		ParagraphMovement: map[string]int{
			"{": 160,
			"}": 160,
			"(": 160,
			")": 160,
		},
		MatchMovement: map[string]int{
			"%": 200,
		},
		ArrowPenalty: map[string]int{
			"ArrowUp":    -50,
			"ArrowDown":  -50,
			"ArrowLeft":  -50,
			"ArrowRight": -50,
		},
	}
}

// GetMotionScore returns the score for a given motion
func (vms *VimMotionScores) GetMotionScore(motion string) int {
	// Check each category for the motion
	if score, exists := vms.BasicMovement[motion]; exists {
		return score
	}
	if score, exists := vms.WordMovement[motion]; exists {
		return score
	}
	if score, exists := vms.LineMovement[motion]; exists {
		return score
	}
	if score, exists := vms.FindChar[motion]; exists {
		return score
	}
	if score, exists := vms.RepeatFind[motion]; exists {
		return score
	}
	if score, exists := vms.FileJump[motion]; exists {
		return score
	}
	if score, exists := vms.ScreenMovement[motion]; exists {
		return score
	}
	if score, exists := vms.ParagraphMovement[motion]; exists {
		return score
	}
	if score, exists := vms.MatchMovement[motion]; exists {
		return score
	}
	if score, exists := vms.ArrowPenalty[motion]; exists {
		return score
	}

	// Handle numbered G commands (e.g., "5G")
	if len(motion) > 1 && motion[len(motion)-1] == 'G' {
		// Check if it's a numbered G command
		for i := 0; i < len(motion)-1; i++ {
			if motion[i] < '0' || motion[i] > '9' {
				break
			}
			if i == len(motion)-2 {
				// It's a valid numbered G command
				return vms.FileJump["G"]
			}
		}
	}

	// Handle find character motions (e.g., "find_char_forward_a")
	if len(motion) > 18 && motion[:18] == "find_char_forward_" {
		return vms.FindChar["f"]
	}
	if len(motion) > 19 && motion[:19] == "find_char_backward_" {
		return vms.FindChar["F"]
	}
	if len(motion) > 18 && motion[:18] == "till_char_forward_" {
		return vms.FindChar["t"]
	}
	if len(motion) > 19 && motion[:19] == "till_char_backward_" {
		return vms.FindChar["T"]
	}

	// Default to basic movement score for unknown motions
	return vms.BasicMovement["h"]
}

// GetMotionCategory returns the category name for a given motion
func (vms *VimMotionScores) GetMotionCategory(motion string) string {
	if _, exists := vms.BasicMovement[motion]; exists {
		return "Basic Movement"
	}
	if _, exists := vms.WordMovement[motion]; exists {
		return "Word Movement"
	}
	if _, exists := vms.LineMovement[motion]; exists {
		return "Line Movement"
	}
	if _, exists := vms.FindChar[motion]; exists {
		return "Find Character"
	}
	if _, exists := vms.RepeatFind[motion]; exists {
		return "Repeat Find"
	}
	if _, exists := vms.FileJump[motion]; exists {
		return "File Jump"
	}
	if _, exists := vms.ScreenMovement[motion]; exists {
		return "Screen Movement"
	}
	if _, exists := vms.ParagraphMovement[motion]; exists {
		return "Paragraph Movement"
	}
	if _, exists := vms.MatchMovement[motion]; exists {
		return "Match Movement"
	}
	if _, exists := vms.ArrowPenalty[motion]; exists {
		return "Arrow Penalty"
	}

	// Handle numbered G commands
	if len(motion) > 1 && motion[len(motion)-1] == 'G' {
		for i := 0; i < len(motion)-1; i++ {
			if motion[i] < '0' || motion[i] > '9' {
				break
			}
			if i == len(motion)-2 {
				return "File Jump"
			}
		}
	}

	// Handle find character motions
	if len(motion) > 18 && (motion[:18] == "find_char_forward_" || motion[:18] == "till_char_forward_") {
		return "Find Character"
	}
	if len(motion) > 19 && (motion[:19] == "find_char_backward_" || motion[:19] == "till_char_backward_") {
		return "Find Character"
	}

	return "Basic Movement"
}