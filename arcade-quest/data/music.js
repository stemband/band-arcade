/* ARCADE QUEST, EPISODE 1: WHICH MUSIC EACH ROOM PLAYS. MAT: edit freely.
   room id (the rooms in data/maps/manor.js)  →  the music event it plays (a 'quest-room-…' slot in shared/sounds.js;
   the file to upload is shared/sounds/<event>.m4a or .mp3).
   Several rooms can share one track: point them at the same slot, e.g. hall: 'quest-room-hallways', stairs:
   'quest-room-hallways' (then add that slot to shared/sounds.js, copying a 'quest-room-…' line). Walking between rooms
   that share a track keeps it playing; a different track crossfades in about a second.
   A room whose file isn't uploaded yet plays what it played before (its map's `music`: quest-foyer or quest-manor),
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
};
