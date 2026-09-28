/* Band Arcade: THE SAFE NAME BUILDER's words (Create Your Player). There is no free typing anywhere: a player's
   name is TITLE + ADJECTIVE + NOUN, e.g. "Captain Brassy Blaze" or "DJ Funky Tempo". (There is no first initial
   any more: old saved initials are dropped.)

   NEVER USE (these words are used as slang or insults by students, so they must NEVER be added to any list below;
   the builder also filters them out if one ever sneaks in, and a saved name that has one gets a new word):
     Zesty, Pickle, Spicy, Wobbly, Director, Nova

   EVERY WORD HAS A PERMANENT NUMBER: its place in its list below (the first word is 1). The leaderboard sends a name
   as these three numbers (never as text) and the avatar share code stores them, so the lists are APPEND-ONLY:
     - ADD a word only at the END of its list (the builder shows each list in A–Z order anyway, and ignores repeats);
     - never move, rename or delete a word: to RETIRE one, put a # in front ('#Word'). Its number stays reserved
       forever, the builder stops offering it, and a leaderboard entry with it shows "Mystery" instead;
     - a word on the NEVER USE list is never shown anywhere, even if it is in a list.
   A saved name keeps a retired word (unless it is on the NEVER USE list). BEFORE
   ADDING A WORD, check it against EVERY word in the other two lists: any title + adjective + noun must still be
   wholesome. Words left out on purpose (don't add them): anything about bodies, bathrooms, gas or wind ("Toot",
   "Wind", "Breezy", "Rumbling", "Brown"), anything that sounds like a rude word ("Saxy", "Horny", "Bone", "Organ",
   "Tool", "Pipe", "Hole", "Nut"), "Hot", "Big", "Wild", "Dirty", "Sexy", "Shower", "Fox", "Balls", and words that
   insult anyone. Titles are job titles and fun ranks, never names of real people or characters. Keep words short
   enough for the badge: the longest title + adjective + noun is tested to fit everywhere a name shows. */
window.AVATAR_NAMES = {
  never: ['Zesty', 'Pickle', 'Spicy', 'Wobbly', 'Director', 'Nova'],
  // numbered lists: APPEND ONLY (see above)
  titles: [
    'Ace', 'Admiral', 'Agent', 'Ambassador', 'Astronaut', 'Baron', 'Captain', 'Champ', 'Chef', 'Chief', 'Coach',
    'Commander', 'Commodore', 'Dame', 'Detective', 'DJ', 'Doctor', 'Duchess', 'Explorer', 'Grandmaster', 'Guardian',
    'Hero', 'Inventor', 'Knight', 'Legend', 'Maestra', 'Maestro', 'Major', 'Marshal', 'Mayor', 'Navigator', 'Ninja',
    'Pilot', 'Pirate', 'Professor', 'Ranger', 'Rockstar', 'Rookie', 'Scout', 'Sensei', 'Sheriff', 'Sir', 'Superstar',
    'Viking', 'Virtuoso', 'Wizard'],
  adjectives: [
    'Atomic', 'Blazing', 'Bold', 'Brassy', 'Brilliant', 'Clever', 'Cosmic', 'Crimson', 'Dazzling', 'Dynamic', 'Electric',
    'Epic', 'Fearless', 'Fiery', 'Fortissimo', 'Frosty', 'Funky', 'Galactic', 'Glowing', 'Golden', 'Groovy', 'Harmonic',
    'Heroic', 'Jazzy', 'Jolly', 'Legato', 'Legendary', 'Lucky', 'Majestic', 'Mellow', 'Melodic', 'Mighty', 'Mystic',
    'Neon', 'Nimble', 'Pizzicato', 'Plucky', 'Quantum', 'Radiant', 'Rapid', 'Retro', 'Roaring', 'Rocking', 'Shiny',
    'Silver', 'Sizzling', 'Snappy', 'Sonic', 'Sparkly', 'Speedy', 'Staccato', 'Stealthy', 'Stellar', 'Supersonic',
    'Swift', 'Syncopated', 'Thundering', 'Tropical', 'Turbo', 'Vivid', 'Zippy'],
  nouns: [
    'Anthem', 'Asteroid', 'Banjo', 'Bassline', 'Bassoon', 'Beat', 'Blaze', 'Bongo', 'Cadence', 'Cheetah', 'Chord',
    'Comet', 'Crescendo', 'Cymbal', 'Dragon', 'Echo', 'Encore', 'Falcon', 'Fermata', 'Forte', 'Galaxy', 'Griffin',
    'Groove', 'Harmony', 'Kazoo', 'Kraken', 'Laser', 'Llama', 'Maraca', 'Melody', 'Meteor', 'Metronome', 'Narwhal',
    'Nebula', 'Noodle', 'Octave', 'Otter', 'Panther', 'Penguin', 'Phoenix', 'Piccolo', 'Pixel', 'Quasar', 'Remix',
    'Rhythm', 'Riff', 'Robot', 'Rocket', 'Satellite', 'Shark', 'Sonata', 'Spark', 'Sprocket', 'Taco', 'Tempo', 'Thunder',
    'Tiger', 'Tuba', 'Unicorn', 'Vortex', 'Waffle', 'Wolf', 'Xylophone', 'Yeti'],
};
