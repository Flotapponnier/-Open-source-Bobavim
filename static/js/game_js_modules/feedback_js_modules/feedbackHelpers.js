export function storeOriginalHeaderContent(headerInfo) {
  if (!headerInfo.dataset.originalContent) {
    headerInfo.dataset.originalContent = headerInfo.innerHTML;
  }
}

const CHAR_MOTION_PREFIXES = {
  find_char_forward_: { label: "FIND CHAR", arrow: "→" },
  find_char_backward_: { label: "FIND CHAR", arrow: "←" },
  till_char_forward_: { label: "TILL CHAR", arrow: "→" },
  till_char_backward_: { label: "TILL CHAR", arrow: "←" },
};

export function createFallbackMessage(key) {
  for (const prefix in CHAR_MOTION_PREFIXES) {
    if (key.startsWith(prefix)) {
      const { label, arrow } = CHAR_MOTION_PREFIXES[prefix];
      const char = key.slice(prefix.length);
      return `${label} '${char}' ${arrow}`;
    }
  }

  return `You pressed ${key || '(unknown key)'}`;
}

export function updateHeaderWithMessage(headerInfo, message) {
  headerInfo.innerHTML = `<strong style="color: ${window.FEEDBACK_CONFIG.MOVEMENT_COLOR};">${message}</strong>`;
}

export function addPulseAnimation(headerInfo) {
  headerInfo.style.animation = window.FEEDBACK_CONFIG.ANIMATION_TYPE;

  setTimeout(() => {
    headerInfo.style.animation = "";
  }, window.FEEDBACK_CONFIG.ANIMATION_DURATION);
}
