import { isSpaceHighlightActive } from './spaceHighlightState.js';
import { showSpaceHighlight, hideSpaceHighlight } from './spaceHighlightVisibility.js';

export function toggleSpaceHighlight() {
  if (isSpaceHighlightActive()) {
    hideSpaceHighlight();
    return "Space highlighting HIDDEN";
  } else {
    showSpaceHighlight();
    return "Space highlighting SHOWN";
  }
}