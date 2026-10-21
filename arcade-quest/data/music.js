/* ARCADE QUEST: WHICH MUSIC EACH ROOM PLAYS (Episode 1 and Episode 2). MAT: edit freely.
   room id (the rooms in data/maps/manor.js and data/maps/stage.js)  →  the music event it plays (a 'quest-room-…' slot in shared/sounds.js;
   the file to upload is shared/sounds/<event>.m4a or .mp3).
   Several rooms can share one track: point them at the same slot, e.g. hall: 'quest-room-hallways', stairs:
   'quest-room-hallways' (then add that slot to shared/sounds.js, copying a 'quest-room-…' line). Walking between rooms
   that share a track keeps it playing; a different track crossfades in about a second.
   A room whose file isn't uploaded yet plays what it played before (its map's `music`: quest-foyer or quest-manor;
   Episode 2's safe rooms and the Balcony: quest-foyer; the Pit, the Workshop and Backstage: quest-manor),
   so nothing ever goes silent. Battles and cutscenes keep their own music; after a battle the room's music carries on
   from where it stopped. */
window.QUEST_ROOM_MUSIC = {
  foyer: 'quest-room-foyer',          // The Foyer (the safe hub)
  hall: 'quest-room-hall',            // The Portrait Hall
  library: 'quest-room-library',      // The Library
  ballroom: 'quest-room-ballroom',    // The Ballroom
  kitchen: 'quest-room-kitchen',      // The Kitchen
  stairs: 'quest-room-stairs',        // The Attic Stairs
  attic: 'quest-room-attic',          // The Attic
  practice: 'quest-room-practice',    // The Practice Hall
  // EPISODE 2: THE SHOWTIME STAGE (each room gets its slot as it is built)
  lobby: 'quest-room-lobby',          // The Lobby (the safe hub)
  greenroom: 'quest-room-greenroom',  // The Green Room (the practice room)
  pit: 'quest-room-pit',              // The Orchestra Pit
  workshop: 'quest-room-workshop',    // The Prop Workshop
  backstage: 'quest-room-backstage',  // Backstage
  balcony: 'quest-room-balcony',      // The Balcony
  dressing: 'quest-room-dressing',    // The Dressing Rooms
  loft: 'quest-room-loft',            // The Fly Loft
  vent: 'quest-room-vent',            // The Vent (until uploaded: the Fly Loft's track, then quest-manor)
  stage: 'quest-room-stage',          // The Main Stage
  glitch: 'quest-room-glitch',        // The Glitch Dimension (a secret after the ending; until uploaded: the Fly Loft's track)
};

/* EPISODE 2's MUSIC, every slot in one table (MAT: the recording checklist is the same list, in shared/sounds/README.md
   "Arcade Quest — Episode 2 music"; the Sound Board's "Arcade Quest — Episode 2" section reads this table).
   n         the music event (shared/sounds.js) = the file to upload: shared/sounds/<n>.m4a or .mp3
   group     'rooms' | 'battles' | 'story' | 'effects' (the Sound Board's groups)
   fallback  what plays until it is uploaded, in order (Q.track(n) in engine/core.js builds the list)
   room      for a room's track: its room id (data/maps/stage.js)
   len       'loop 30–90 s' or a one-shot's length
   desc      what to compose: the feel, the tempo, the instruments the place suggests (never student-facing)
   THE MICROPHONE'S SPEECH ('ep2-mic') has no music on purpose: silence and quest-mic-crackle. */
window.QUEST_EP2_MUSIC = [
  // ---- ROOMS (data/maps/stage.js; which room plays which: QUEST_ROOM_MUSIC above) ----
  {n: 'quest-room-lobby', group: 'rooms', room: 'lobby', fallback: ['quest-foyer'], len: 'loop 30–90 s',
    desc: 'The Lobby (the safe hub): a warm, slightly faded theater-lobby tune, medium swing, piano and soft brass; a little dusty, a little hopeful.'},
  {n: 'quest-room-greenroom', group: 'rooms', room: 'greenroom', fallback: ['quest-foyer'], len: 'loop 30–90 s',
    desc: 'The Green Room (practice): calm and studious, slow, flute and soft strings, like a warm-up before a show.'},
  {n: 'quest-room-pit', group: 'rooms', room: 'pit', fallback: ['quest-manor'], len: 'loop 30–90 s',
    desc: 'The Orchestra Pit: low, warm, a little sleepy; tuba-ish, slow two-feel, timpani taps, music stands rattling.'},
  {n: 'quest-room-workshop', group: 'rooms', room: 'workshop', fallback: ['quest-manor'], len: 'loop 30–90 s',
    desc: 'The Prop Workshop: busy and playful, medium-fast, snare and woodblock, hammer-and-saw rhythms, a bit of cartoon bounce.'},
  {n: 'quest-room-backstage', group: 'rooms', room: 'backstage', fallback: ['quest-manor'], len: 'loop 30–90 s',
    desc: 'Backstage: hushed and tense (QUIET PLEASE), slow pulse, muted strings and brushes; the static creeping closer.'},
  {n: 'quest-room-balcony', group: 'rooms', room: 'balcony', fallback: ['quest-foyer'], len: 'loop 30–90 s',
    desc: 'The Balcony: high and airy, slow waltz, celesta and soft pads; the whole stage far below.'},
  {n: 'quest-room-dressing', group: 'rooms', room: 'dressing', fallback: ['quest-manor'], len: 'loop 30–90 s',
    desc: 'The Dressing Rooms: sly and jazzy, medium swing, saxophone and walking bass (Rico\'s room: a sneaky lick).'},
  {n: 'quest-room-vent', group: 'rooms', room: 'vent', fallback: ['quest-room-loft', 'quest-manor'], len: 'loop 30–90 s',
    desc: 'The Vent: echoey and cramped, slow, metallic taps and a breathy fan hum; a few notes Rico dropped, drifting by.'},
  {n: 'quest-room-loft', group: 'rooms', room: 'loft', fallback: ['quest-manor'], len: 'loop 30–90 s',
    desc: 'The Fly Loft: high, dark and a little dizzy, slow, low drones and a ticking pulse; the Microphone is close.'},
  {n: 'quest-room-stage', group: 'rooms', room: 'stage', fallback: ['quest-manor'], len: 'loop 30–90 s',
    desc: 'The Main Stage: big and expectant, slow build, the whole band\'s instruments hinted at once; after the finale, warm.'},
  // ---- BATTLES (battle/battle.js: an enemy's `music`, else Episode 2's machines' own) ----
  {n: 'quest-room-glitch', group: 'rooms', room: 'glitch', fallback: ['quest-room-loft', 'quest-manor'], len: 'loop 30–90 s',
    desc: 'The Glitch Dimension: wobbly and broken, slow, detuned synths and bitcrushed echoes of the arcade\'s songs; strange, never scary.'},
  {n: 'quest-ep2-battle', group: 'battles', fallback: ['quest-battle'], len: 'loop 30–90 s',
    desc: 'Machine battles: bouncy, show-tune energy, medium-fast, brass stabs and snare; silly, never scary.'},
  {n: 'quest-ep2-miniboss', group: 'battles', fallback: ['quest-miniboss'], len: 'loop 30–90 s',
    desc: 'Rico Bandit (mini-boss): a sneaky heist groove, fast swing, saxophone lead and bass; playful mischief.'},
  {n: 'quest-ep2-boss', group: 'battles', fallback: ['quest-boss'], len: 'loop 30–90 s',
    desc: 'THE BIG NUMBER (final boss): the whole band glitching together, fast big-band, tuba, flute, snare, sax and conductor-style hits.'},
  // ---- STORY (engine/story.js, scenes.js) ----
  {n: 'quest-ep2-title', group: 'story', fallback: ['quest-title'], len: 'loop 30–90 s',
    desc: 'The title screen once Episode 2 is open: the main theme with a show-tune lift, medium tempo, brass and bells.'},
  {n: 'quest-ep2-intro', group: 'story', fallback: ['quest-intro'], len: 'loop 20–60 s',
    desc: 'The intro (the attic speaker, the pull, the marquee): mysterious static turning into an old theater overture.'},
  {n: 'quest-encore', group: 'story', fallback: ['quest-victory'], len: 'loop 20–60 s',
    desc: 'The endings, the E♭ ENCORE: a joyful curtain-call tune in E♭ major, medium tempo, the full band (tuba, flute, snare, sax).'},
  {n: 'quest-ep2-cliffhanger', group: 'story', fallback: ['quest-cliffhanger'], len: 'loop 15–40 s',
    desc: 'The cliffhanger: low and eerie, very slow, a lone speaker crackling, a question left hanging.'},
  {n: 'quest-ep2-credits', group: 'story', fallback: ['quest-credits'], len: 'loop 30–90 s',
    desc: 'Episode 2\'s credits: the Encore\'s tune again, relaxed and warm, E♭ major, a little slower.'},
  {n: 'quest-ep2-complete', group: 'story', fallback: ['quest-victory'], len: 'loop 20–60 s',
    desc: 'EPISODE 2 COMPLETE: a short proud fanfare that settles into a loop, brass and drums.'},
  // ---- EFFECTS (unpitched, short; never while the mic listens) ----
  {n: 'quest-tap', group: 'effects', len: 'one-shot, under 0.3 s', desc: 'A tap shoe hitting the floor (the taps dodge).'},
  {n: 'quest-confetti', group: 'effects', len: 'one-shot, under 0.5 s', desc: 'A confetti pop (the confetti dodge).'},
  {n: 'quest-spot-hum', group: 'effects', len: 'one-shot, under 0.5 s', desc: 'A spotlight switching on with a hum (the beam dodge).'},
  {n: 'quest-tick', group: 'effects', len: 'one-shot, under 0.2 s', desc: 'A pendulum tick (the pendulum dodge).'},
  {n: 'quest-encore-learned', group: 'effects', len: 'one-shot, 0.4–1 s', desc: 'A cymbal-y sparkle: a song learned, a band member waking.'},
  {n: 'quest-mic-crackle', group: 'effects', len: 'one-shot, 0.5–1.5 s', desc: 'The Microphone\'s crackle (whispers, the glimpse, its speech: no music there on purpose).'},
  {n: 'quest-boss-phase', group: 'effects', len: 'one-shot, 0.5–1 s', desc: 'A final boss changing stage (the Big Number: the next band member).'},
];
