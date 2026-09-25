/* Band Arcade — the list of games on the home page.
   To add a game: make a folder next to ghost-notes/, then add an entry here.
     id        folder name, also the key for saved progress
     maxStars  total stars available per instrument (levels × 3), or 0 if the game has no stars
     icon      'ghost' | 'tuner' (add new icons in arcade.js)
     order     games are shown in this order */
window.Arcade = window.Arcade || {};
window.Arcade.ARCADE_NAME = 'Band Arcade';
window.Arcade.ARCADE_TAGLINE = 'Practice games that listen to you play.';
window.Arcade.GAMES = [
  {
    id: 'note-checker',
    name: 'Note Checker',
    skill: 'Start here',
    blurb: 'Play your five notes and watch each one light up. Tuning needle included.',
    maxStars: 0,
    icon: 'tuner',
  },
  {
    id: 'ghost-notes',
    name: 'Ghost Notes',
    skill: 'Note reading',
    blurb: 'Read the note and play it. The note names fade away as you level up.',
    maxStars: 24,
    icon: 'ghost',
  },
];
