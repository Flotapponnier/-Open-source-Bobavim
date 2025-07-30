const vimTips = [
  "d g_ → delete from the cursor to the last non-blank character.",
  "Press space + f to see the game in full-screen",
  "% → find an opening bracket { } or ( ) or [] and use % to jump beetwen the two",
  "increase your speed with putting a number before your command",
  "V G_ → Visually select until the last non-blank character.",
  "%s/word/newword/g→ replace in your file all the word by newword",
  "5dd → You will cut 5 lines that you could paste in your file with p.",
  "When you programming with vim, you should forget about your mouse or the arrow",
  "You can change in your ~/.vimrc lot of things (syntax, color, set number), including changing a keymap to one that fit you better.",
  "G$ → You will arrive at the last character of the file",
  "d$ → delete everything after your cursor",
  "di' -> stand for delete inside, delete everything inside quotes, parentheses",
  "Have you try the tutorial mode with space + t?",
  "You can open the map with space + m ",
  "If you use a search motion (f, F, t, T you can use , ; that will repeat forward or backward your search motion.",
  "In vim, is recommended to not use your mouse or the arrow to have your hand configure in the best position for typing",
  "If you meet a bracket { [ ( )]}, you could use % to jump to the closing one.",
  "Vim was created by Bram Moolenaar, a Dutch software engineer. He released the first version of Vim in 1991. Bram Moolenaar passed away in 2023.",
  "Vim enhances Vi by offering multi-level undo, syntax highlighting, extensive configuration options, plugin support, and cross-platform compatibility.",
];

export function initializeDisplayTips() {
  logger.debug("Initializing display tips...");
  displayRandomTip();
}

export function displayRandomTip() {
  const randomIndex = Math.floor(Math.random() * vimTips.length);
  const tipElement = document.getElementById("randomTip");
  if (tipElement) {
    tipElement.textContent = vimTips[randomIndex];
  } else {
    logger.debug("randomTip element not found");
  }
}
