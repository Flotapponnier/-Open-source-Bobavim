package constant

// Movement directions
var MOVEMENT_KEYS = map[string]map[string]interface{}{
	"h":          {"direction": "left", "description": "Move left (vim style)"},
	"j":          {"direction": "down", "description": "Move down (vim style)"},
	"k":          {"direction": "up", "description": "Move up (vim style)"},
	"l":          {"direction": "right", "description": "Move right (vim style)"},
	"ArrowLeft":  {"direction": "left", "description": "NOOB: Move left (arrow key)"},
	"ArrowDown":  {"direction": "down", "description": "NOOB: Move down (arrow key)"},
	"ArrowUp":    {"direction": "up", "description": "NOOB: Move up (arrow key)"},
	"ArrowRight": {"direction": "right", "description": "NOOB: Move right (arrow key)"},
	"w":          {"direction": "word_forward", "description": "Move forward to beginning of next word"},
	"W":          {"direction": "word_forward_space", "description": "Move forward to beginning of next WORD (space-separated)"},
	"b":          {"direction": "word_backward", "description": "Move backward to beginning of current/previous word"},
	"B":          {"direction": "word_backward_space", "description": "Move backward to beginning of current/previous WORD"},
	"e":          {"direction": "word_end", "description": "Move to end of current/next word"},
	"E":          {"direction": "word_end_space", "description": "Move to end of current/next WORD (space-separated)"},
	"ge":         {"direction": "word_end_prev", "description": "Move to end of previous word"},
	"gE":         {"direction": "word_end_prev_space", "description": "Move to end of previous WORD (space-separated)"},
	"$":          {"direction": "line_end", "description": "Move to end of current line"},
	"0":          {"direction": "line_start", "description": "Move to beginning of current line"},
	"^":          {"direction": "line_first_non_blank", "description": "Move to first non-blank character of line"},
	"g_":         {"direction": "line_last_non_blank", "description": "Move to last non-blank character of line"},
	"gg":         {"direction": "file_start", "description": "Go to top of file"},
	"G":          {"direction": "file_end", "description": "Go to bottom of file"},
	"H":          {"direction": "screen_top", "description": "Go to top of screen"},
	"M":          {"direction": "screen_middle", "description": "Go to middle of screen"},
	"L":          {"direction": "screen_bottom", "description": "Go to bottom of screen"},
	"{":          {"direction": "paragraph_prev", "description": "Go to previous paragraph"},
	"}":          {"direction": "paragraph_next", "description": "Go to next paragraph"},
	"(":          {"direction": "sentence_prev", "description": "Go to previous sentence"},
	")":          {"direction": "sentence_next", "description": "Go to next sentence"},
	"f":          {"direction": "find_char_forward", "description": "Find character forward"},
	"F":          {"direction": "find_char_backward", "description": "Find character backward"},
	"t":          {"direction": "till_char_forward", "description": "Till character forward"},
	"T":          {"direction": "till_char_backward", "description": "Till character backward"},
	";":          {"direction": "repeat_char_search_same", "description": "Repeat last character search in same direction"},
	",":          {"direction": "repeat_char_search_opposite", "description": "Repeat last character search in opposite direction"},
	"%":          {"direction": "match_bracket", "description": "Jump to matching bracket (){}[]"},
}

// Valid movement keys list
var VALID_MOVEMENT_KEYS = []string{"h", "j", "k", "l", "ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight", "w", "W", "b", "B", "e", "E", "ge", "gE", "$", "0", "^", "g_", "gg", "G", "H", "M", "L", "{", "}", "(", ")", "f", "F", "t", "T", ";", ",", "%"}

// Valid directions map
var VALID_DIRECTIONS = map[string]bool{
	"left":                        true,
	"right":                       true,
	"up":                          true,
	"down":                        true,
	"word_forward":                true,
	"word_forward_space":          true,
	"word_backward":               true,
	"word_backward_space":         true,
	"word_end":                    true,
	"word_end_space":              true,
	"word_end_prev":               true,
	"word_end_prev_space":         true,
	"line_end":                    true,
	"line_start":                  true,
	"line_first_non_blank":        true,
	"line_last_non_blank":         true,
	"file_start":                  true,
	"file_end":                    true,
	"screen_top":                  true,
	"screen_middle":               true,
	"screen_bottom":               true,
	"paragraph_prev":              true,
	"paragraph_next":              true,
	"sentence_prev":               true,
	"sentence_next":               true,
	"find_char_forward":           true,
	"find_char_backward":          true,
	"till_char_forward":           true,
	"till_char_backward":          true,
	"repeat_char_search_same":     true,
	"repeat_char_search_opposite": true,
	"match_bracket":               true,
}

// Game map values
const (
	EMPTY      = 0
	PLAYER     = 1
	ENEMY      = 2
	PEARL      = 3
	PEARL_MOLD = 4
)

// Game constants
const (
	INITIAL_PEARLS = 1
)
