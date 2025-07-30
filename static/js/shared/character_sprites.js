// ================================
// SHARED CHARACTER SPRITE MAPPING
// ================================

// Character to sprite filename mapping
export const CHARACTER_SPRITE_MAP = {
  'boba': 'boba',
  'pinky': 'pinky_boba',
  'golden': 'golden_boba',
  'black': 'black_boba',
  'boba_diamond': 'boba_diamond',
  'boba_uncle': 'boba_uncle',
  'boss_boba': 'boss_boba'
};

// Function to get the correct sprite filename for a character
export function getCharacterSpritePath(characterName) {
  const spriteFileName = CHARACTER_SPRITE_MAP[characterName] || characterName;
  return `/static/sprites/character/${spriteFileName}.png`;
}

// Check if a character has a sprite
export function hasCharacterSprite(characterName) {
  return CHARACTER_SPRITE_MAP.hasOwnProperty(characterName);
}

// Get avatar sprite path for leaderboard/modal use
export function getAvatarSpritePath(character) {
  switch (character) {
    case "pinky":
      return "/static/sprites/avatar/pinky_boba_avatar.png";
    case "golden":
      return "/static/sprites/avatar/golden_boba_avatar.png";
    case "black":
      return "/static/sprites/avatar/black_boba_avatar.png";
    case "boba_diamond":
      return "/static/sprites/avatar/diamond_boba_avatar.png";
    case "boba":
    default:
      return "/static/sprites/avatar/boba_avatar.png";
  }
}

// Create avatar HTML for leaderboard/modal use
export function createAvatarHTML(character) {
  const avatarSrc = getAvatarSpritePath(character);

  return `
    <img 
      src="${avatarSrc}" 
      alt="${character} avatar" 
      style="
        width: 24px; 
        height: 24px; 
        border-radius: 4px;
        border: 1px solid #654321;
        box-shadow: 
          inset 1px 1px 2px rgba(255, 255, 255, 0.15),
          inset -1px -1px 2px rgba(0, 0, 0, 0.4),
          0 2px 4px rgba(0, 0, 0, 0.3);
        background: linear-gradient(145deg, #8b4513, #a0522d, #d2691e);
        padding: 1px;
      "
    />
  `;
}

// Get character display name with level
export function getCharacterDisplayName(character, characterLevel = null) {
  let baseName;
  switch (character) {
    case "pinky":
      baseName = "Pinky Boba";
      break;
    case "golden":
      baseName = "Golden Boba";
      break;
    case "black":
      baseName = "Black Boba";
      break;
    case "boba_diamond":
      baseName = "Boba Diamond";
      break;
    case "boba":
    default:
      baseName = "Boba";
  }
  
  // Add level information if available - for boba_diamond, always show level if provided
  if (characterLevel) {
    if (character === "boba_diamond") {
      return `${baseName} Level ${characterLevel}`;
    } else if (characterLevel > 1) {
      return `${baseName} Level ${characterLevel}`;
    }
  }
  
  return baseName;
}

// Get character text color for display
export function getCharacterTextColor(character) {
  switch (character) {
    case "pinky":
      return "#FEBDD3";
    case "golden":
      return "#FECF35";
    case "black":
      return "#170E02";
    case "boba_diamond":
      return "#6bcfc6";
    case "boba":
    default:
      return "#FFA25B";
  }
}