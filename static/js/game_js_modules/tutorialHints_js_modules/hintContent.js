// Configuration for Boba Uncle speech texts for each tutorial map
// Format: [funny intro, actual tip, funny outro]

export const TUTORIAL_HINTS = {
  1: [
    "Well, well, well... Hello, son. I'm Uncle Boba — but call me Uncle. Before teaching noobs like you Vim, I had a peaceful life as a senior developer. Sadly, those damn LLMs replaced me, and now I'm stuck here helping noobs like you. I wrote a very useful manual you can read about Vim, by the way.",
    "Listen, son — use the h, j, k, l keys to move around. h = left, j = down, k = up, l = right. And for the love of Dijkstra, avoid those arrow keys! For the next map, comeback to me, i have more tips for you. ",
    "Ok, listen, noob— I mean, son, pardon me. The more tapioca pearls you collect, the more boba we can produce in our factory. So, when your score increases with each boba, and you reach a certain amount, we’ll let you off and you can rest. Back in my day, we didn’t have fancy IDEs. We had Vim, and we LIKED it! Repeat after me: we LIKED IT!",
  ],
  2: [
    "Oh, I'm surprised you're still here. You want me to teach you how to quit Vim, or are you actually serious about learning?!",
    "Use `w` to jump to the next word, `b` to go back, `e` to go to the end of a word. Try capital `W`, `B`, and `E` for bigger jumps! There's a difference between `w` and `W`, just like there's a difference between... oops, I forgot, son.",
    "I used to train senior developers at Google. Now I'm stuck teaching noobs. What kind of Boba deserves that?!",
  ],
  3: [
    "Time for search motions, grasshopper! 🥋",
    "Let's learn search motion — target your character and reload with `;` and `,`! Search motion works only on the same line. Forward sometimes, backward others. f...f...f...",
    "I bet those fancy AI assistants can't... ah no, they can. You know, son, maybe you should quit Vim and enjoy life.",
  ],
  4: [
    "Woah, you're the first player I've seen reach this level. I have to admire you — you're a crazy guy like me who never gives up. I like it, son!",
    "A sentence ends with `.`, `?`, or `!` (find the odd one out — hint: one of these doesn't belong in proper sentences).",
    "These days, kids just ask ChatGPT to write their comments. In my time, we wrote self-documenting code AND proper sentences — and that was marvelous. MARVELOUS!",
  ],
  5: [
    "Plot twist time! This one's gonna blow your mind!",
    "Here's something totally worth knowing if you haven't figured it out: a number before your keymap will make it go on steroids! Try `3j` or `5w`!",
    "That's right! Multipliers, son. You're exceptional!",
  ],
  6: [
    "Alright kiddo, Uncle Boba's gotta bounce... for some boba cheeks 🧋",
    "Maybe read the manual now? I can't be here for you all the time, you know? Be an adult! Oh, and press Ctrl+T for random practice tutorials. Now I gotta see if I’ve got something more interesting to do.",
    "It's been real — you made it! Ok son, hope to see you in Boba.vim 2!",
  ],
  10: [
    "Woh, as i see some people are on strike now. Ok listen son, boba_stop is not so bad, they just block you the access but they will not kill you.",
    "Just continue working and don't listening to them to much, ok son ?",
    "Remember son, strikes come and go, but your vim skills are forever! Keep moving around those boba_stop protesters and collect those pearls!",
  ],
  14: [
    "woah NOW be careful, boba mold is really killing people.",
    "Listen son, if you meet one you just die. So please don't play around with boba mold, we don't want them.",
    "These pearl molds are deadly, son! Stay away from them at all costs. One touch and it's game over - no second chances, no mercy. Now go out there and show those containers who's boss!",
  ],
};

// Special low score intervention message
export const LOW_SCORE_MESSAGE = [
  "Hey noob. Son perdon you know your score decreasing ? No panic uncle boba is here to get you better at this game.",
  "Listen carefully, son! You're using those arrow keys too much - they're costing you 50 points each! Use h, j, k, l instead. Remember: h = left, j = down, k = up, l = right. Trust me, I've been coding since before you were born!",
  "Now stop being a noob and start playing like a real vim user! Remember: every arrow key press makes Uncle Boba cry a single tear... and that's 50 points down the drain!",
];

export function getHintForMap(mapId) {
  const hints = TUTORIAL_HINTS[mapId];
  if (Array.isArray(hints)) {
    return hints;
  }
  // Fallback for backward compatibility
  return ["💡 No hint available for this map."];
}
