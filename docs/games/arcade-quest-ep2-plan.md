# Arcade Quest, Episode 2: THE SHOWTIME STAGE (design plan, for Mr. Graham's review)

> Status: APPROVED by Mr. Graham (2026-10-13). Build steps 1–5 are built: Episode 2 plays start to finish (step 6 = polish). This file lives at `docs/games/arcade-quest-ep2-plan.md`; the build prompts implement it piece by piece. When a prompt builds a part, `docs/games/arcade-quest.md` gets the real details, and this plan stays as the story bible.

## The pitch
Episode 1 ended with every speaker in Ghost Notes Manor crackling and the Microphone whispering "...still... so much... noise...". Episode 2 follows that crackle to where it came from: **the old stage speaker under the dusty sheet in the attic**. Pulling the sheet off pulls you into a new cabinet world: **the Showtime Stage**, the little stage where the arcade's animatronic house band, THE SHOWTIME BAND, used to play, remembered as a whole theater.

The static has soured the band's voice boxes and scattered glitching stage machines all over the theater. Help 20 machines, un-glitch the band one member at a time, learn the **E♭ ENCORE**, and get the band back on stage for one last big number. Then the Microphone finally SPEAKS, and we learn why it hates noise. It escapes down its cable into the arcade's speakers: **TO BE CONTINUED IN EPISODE 3** (the finale).

- **Size:** the same as Episode 1: 8 rooms, 20 helpable machines, a mini-boss, a final boss, about 30–45 minutes.
- **Music focus:** the concert **E♭ major scale** (the next GMEA scale after B♭) and **RHYTHM READING**. Rhythm battles also suit snare players, who sat out more of Episode 1.

## The rules this episode keeps
- **Arcade Quest's rules:** nobody gets hurt (machines are helped or powered down, never destroyed), warm and funny, two ways to win every battle, alternate routes so nothing can soft-lock, no random encounters, never copy Undertale, every line ≤ 2 text-box lines.
- **Showtime Malfunction's rules apply to the Showtime Band and its world:**
  - they are malfunctioning MACHINES, never scary
  - NO bears, rabbits, chickens or foxes
  - no pizzeria
  - no clock hours 12–6 AM
  - no security cameras
  - no closing-doors or power-meter mechanics
  - nobody trapped inside a costume or machine
  
  The tone is Arcade Quest's friendly one, not Showtime's scares.
- **Saved ids never change:** new rooms, enemies, items and flags are ADDED. Episode 1 saves and codes keep loading.

## How students get to Episode 2
- **After Episode 1:** the title screen shows EPISODE SELECT: "1: Ghost Notes Manor ✓", "2: The Showtime Stage".
- **Episode 2 continues the same save:** level, HP, tokens, charms and the BAND (befriended Episode 1 ghosts can still join you as companions: Madame Mezzo singing next to Tubby Tusk is the kind of joke this game is for).
- **Its opening:** the Attic after the ending. The dusty sheet now says "Pull the sheet?" Under it is an old stage speaker, as big as a wardrobe, with a cable running into the wall. KSSSHHH: the grille glows, and it pulls you in (the Episode 1 intro's pull effect).

## The story (beats)
1. **INTRO CUTSCENE:** the attic, the speaker, the pull. You land on the Showtime Stage's front steps. The marquee lights flicker; half the letters are out ("SH WT ME").
2. **THE LOBBY** (the hub, safe): the Box Office, a Save Jukebox, Token Booth Terry's cousin **Ticket Booth Tina** (the same shared wallet, the same shelves + the STAGE COLLECTION), and **Maestro Moose**, the conductor, frozen mid-downbeat in the middle of the lobby. Every few seconds he glitches: "And a one, and a t— and a one, and a t—". He can't start the show without his band.
3. **UN-GLITCH THE BAND:** each band member is stuck in a loop in their own part of the theater. Helping the machines in their room clears the static around them. They wake up, join the cast as NPCs and open the way on:
   - **TUBBY TUSK** (walrus, tuba): the ORCHESTRA PIT. Stuck playing one low note forever ("Bwaaaa—"). Wakes when the Pit's machines are helped. Opens the trap door under the stage to BACKSTAGE.
   - **PROFESSOR HOOT** (owl, flute): the GREEN ROOM (the practice room). Stuck reading the same page of a music book. Once you've helped 6 machines anywhere, he wakes and **teaches the E♭ ENCORE** (like Episode 1's Butler and the B♭ Blast).
   - **SNAPJAW SAL** (gator, snare): the PROP WORKSHOP. Stuck in a drum roll that never ends. Wakes when the Workshop's machines are helped. **Teaches RHYTHM READING** (the first rhythm battle has her tutorial) and opens the FLY LOFT ladder.
   - **RICO BANDIT** (raccoon, sax): THE MINI-BOSS (DRESSING ROOMS). The static has him "borrowing" every note in the theater and stuffing them in his sax case. Befriended = he returns the notes and opens the Dressing Rooms' stage door. Defeated = his case pops open, the notes scatter, and a vent behind the mirrors opens (the alternate route). Either way you reach the stage.
4. **THE FLY LOFT** (catwalks above the stage): the static is thickest here. The Microphone's small listening "Mic-lets" crackle around, and the whispers get louder. The giant Microphone shows in the gaps between the curtains.
5. **THE BIG NUMBER (the final boss, the MAIN STAGE):** Maestro Moose finally raises his baton, but the static grabs the whole band at once. They play the "big number" glitched together, five stages, one per member (below). At the end the student plays the E♭ ENCORE to HARMONIZE and bring the band back in tune. (Or play on, and they power down to rest: the shorter ending.)
6. **THE ENDING:** the curtain rises, the stage lights come back, and the band plays the Encore WITH you. Then the stage microphone, the one in the stand at the front of the stage, starts to glow red.
7. **THE MICROPHONE SPEAKS** (the first real conversation; the Episode 3 setup):
   - "...I remember this song."
   - "I was THEIR microphone. I heard every show. Every audience. Every encore."
   - "Then they switched the band off. They wired me into the games instead."
   - "Since then... squeaks. Wrong notes. Kids playing to WIN. Nobody... plays for me."
   - "So I'm taking the sound back. All of it. Until it's quiet. Until it's MUSIC again."
   - The red light dives down its cable into the floor. Every speaker in the theater crackles.
   - Madame Mezzo's voice through the speaker: "Darling... where is that cable GOING?"
   - **TO BE CONTINUED IN EPISODE 3.**
8. **Credits** ("Created by Mr. Graham", the theater's cast), then **EPISODE 2 COMPLETE** (stats, save code, rewards, KEEP EXPLORING).

**Why this reveal works:** it keeps the Microphone "misunderstood, not evil", it ties the whole arcade together (the house band the arcade switched off, the mic every game uses), and it hands Episode 3 its obvious finale: play JUST for the Microphone.

## The 8 rooms (each gets its own `quest-room-<id>` music track to upload)

| # | Room (id) | What's there | Way in |
|---|---|---|---|
| 1 | The Lobby (`lobby`) | hub, safe: Maestro Moose (frozen), Ticket Booth Tina, Save Jukebox, the snack counter (shop) | start |
| 2 | The Green Room (`greenroom`) | PRACTICE room, safe: Professor Hoot, mirrors, a practice stand; machines here never stay "done" (like Episode 1's Practice Hall) | from the Lobby |
| 3 | The Orchestra Pit (`pit`) | Tubby Tusk; music stands in rows; 3 machines | from the Lobby (down the aisle) |
| 4 | The Prop Workshop (`workshop`) | Snapjaw Sal; saws, paint, giant cardboard moons; 4 machines | from the Lobby (side door) |
| 5 | Backstage (`backstage`) | rope lines, road cases, a stage manager's desk; 4 machines | the Pit's trap door (Tubby awake) |
| 6 | The Dressing Rooms (`dressing`) | a row of mirrors with light bulbs; Rico Bandit (the mini-boss); 3 machines | from Backstage |
| 7 | The Fly Loft (`loft`) | catwalks, sandbags, the curtain's top; the Mic-lets; a second Save Jukebox; 4 machines | Sal's ladder from the Workshop, or the Vent's hatch |
| 6b | The Vent (`vent`, added in build step 4) | the defeat route's passage: air ducts, slow fans, Rico's Lucky Pick; no machines | the Dressing Rooms' vent grate (Rico powered down) |
| 8 | The Main Stage (`stage`) | the final boss; the stage mic in its stand | from the Loft (stairs down) or Rico's door |

Machines total: 3 + 4 + 4 + 3 + 4 = 18 in rooms 3–7, plus 2 in the Lobby's balcony (reached after Tubby wakes) = **20**. (Built as its own small room, id `balcony`, behind the Lobby's roped-off stairs: its machines are `balcony:m1`, `balcony:m2`.)

## The machines (8 kinds, all original, silly, never scary)
Each kind has its own challenge, CALM rule (what SERENADE wants), dodge pattern and line style. Two ways to win as always: PLAY (power down) or fill CALM + HARMONIZE (befriend, and some join the band).

| Kind | What it is | Challenge | Dodge pattern |
|---|---|---|---|
| **TAPSY** | a pair of tap shoes that won't stop dancing | **RHYTHM** (new): read a 1-measure rhythm (quarters, eighths, rests) and play it on any note (snare: hits) | falling taps on the beat |
| **SPOTLIGHT SPRITE** | a little spotlight that keeps losing its focus | LONG TONE: hold steady while the beam centers | a beam that sweeps (warning line first) |
| **FEEDBACK FUZZ** | a squealing ball of feedback from a bad cable | PLAY in tune: E♭-scale notes (snare: a count) | squiggly squeal waves |
| **CONFETTI CANNON** | it fires on every sound it hears | ARTICULATE: fast clean tonguing | confetti bursts |
| **METRO-GNOME** | a tiny gnome-shaped metronome running at the wrong speed | **TEMPO** (new): 8 steady quarter notes at its tempo, played on any note (snare: hits) | pendulum swings |
| **TICKET STUBS** | a fluttering swarm of torn tickets | VOCAB: music terms (tempo and rhythm words: *allegro, fermata, staccato*…) | fluttering stubs |
| **ROPE KNOT** | a tangled curtain rope | FINGERING (the Button Masher chart) | a swinging rope |
| **MIC-LET** | a tiny walking microphone: the big Microphone's helper, more lonely than mean | **ECHO RHYTHM** (new): it claps a rhythm, you play it back; no staff, by ear | static rings |

**Mix (20):** Tapsy 3, Spotlight 3, Feedback 3, Confetti 2, Metro-Gnome 3, Stubs 2, Rope Knot 2, Mic-let 2 (in the Loft only). Most machines in each room use that room's member's skill (rhythm near Sal, long tones near Tubby).

## The new music: E♭ ENCORE and RHYTHM
- **THE E♭ ENCORE** (Professor Hoot teaches it after 6 helped):
  - A PLAY submenu move like the B♭ Blast: 4 random notes of the concert E♭ scale, written for the student's instrument from `shared/scales.js`, ×1.3 power. Snare: 6 strokes.
  - Its own flag `songEb`.
  - Also the final boss's HARMONIZE: the whole E♭ scale in order.
- **THE RHYTHM FAMILY** (new challenge kinds in `battle/challenges.js`, built ONLY from the shared rhythm code: `counting.js`, `rhythm-staff.js` with Mr. Graham's counting under the staff, `rhythm-judge.js`, `onsets.js` for hits, `calibration.js` for the device's delay; never a second judge):
  - **RHYTHM:** read and play. Pools grow by area: quarters/half notes and quarter rests → eighth pairs → dotted quarter + eighth.
  - **TEMPO:** steady beats against a count-off.
  - **ECHO RHYTHM:** hear it, play it back. The pattern plays through the existing rules for sound while listening: the mic pauses while it plays, like Lost Signal's turn-taking.
  - Winds play the rhythm on ANY one note (onsets, not pitch); snare plays hits. TOUCH-style tapping only where Episode 1 allowed it (the Assist setting). The count-off follows Rhythm Dojo's click rules (it never mutes the mic).

## The final boss: THE BIG NUMBER (the whole Showtime Band, glitched together)
One battle, 5 stages, one per member (like the Ghost Conductor's stages), `quest-ep2-boss` music. Each stage's dodge is that member's instrument:
1. **TUBBY TUSK, LONG TONE:** "Hold it as long as I do!" (a secret length, like the Conductor's cutoff). Dodge: big slow tuba bubbles.
2. **PROFESSOR HOOT, PLAY:** E♭ Encore notes, read from the staff. Dodge: flute-note flurries.
3. **SNAPJAW SAL, RHYTHM:** two measures. Dodge: drumsticks on the beat.
4. **RICO BANDIT, ECHO RHYTHM:** he plays a lick, you echo the rhythm. Dodge: notes he "borrows" and throws back.
5. **MAESTRO MOOSE, TEMPO:** "Follow my baton!", 8 beats that speed up a little. Dodge: baton sweeps (Episode 1's baton pattern, faster).

**The finale:** at 1 HP CALM fills, then the choice:
- **HARMONIZE** with the whole E♭ scale: the band comes back in tune (the best ending: the full band plays the Encore with you).
- **Play on:** the band powers down to rest, and the shorter ending: Maestro alone, then the Microphone.

Both set `ep2Done`.

## Rewards and achievements (no stars: `maxStars` stays 0)
- **`ep2`** (Episode 2 finished): an avatar background **Showtime Stage** (the curtain and marquee), a name plate **"Encore!"**, and a skin accessory **Stage Mic** (a little retro microphone).
- **`stage-friends`** (every KIND of machine befriended): the **Spotlight** effect (a soft spotlight behind the avatar).
- **`stage-all`, SHOWSTOPPER** (all 20 machines helped, either way; the Episode 2 Ghost Whisperer): the **Showstopper Sash** + a name plate.
- **New charms:**
  - **Metronome Ticker:** steadier tempo windows in RHYTHM/TEMPO
  - **Rosin Pouch:** +CALM from long tones
  - **Rico's Lucky Pick:** a found item, the defeat route's treasure
- **The Stage Collection** at Ticket Booth Tina: 3 Showtime-themed player items.
- **The floor's summary:** "Episode 2: 40% · 12 friends" (episode-aware).

## Sprites, sounds and music (the asset list)
- **Pixel art** (`sprites-stage.js`, theme tokens `--q-stage-*`):
  - a theater tile set (seats, curtains, stage boards, catwalks, mirrors with bulbs, road cases, the marquee)
  - the 5 band members at NPC size (24 × 28), plus their boss-stage poses (48 × 48), based on Showtime Malfunction's characters
  - Ticket Booth Tina
  - the 8 machine kinds
  - the stage speaker (the attic) and the stage mic (red light)
- **Music for Mr. Graham to upload** (each falls back to existing tracks until uploaded):
  - `quest-room-lobby`, `-greenroom`, `-pit`, `-workshop`, `-backstage`, `-dressing`, `-loft`, `-stage`
  - `quest-ep2-intro`, `quest-ep2-miniboss`, `quest-ep2-boss`
  - `quest-encore`: the band's song in the ending, ideally an E♭ major tune
  - `quest-ep2-cliffhanger`
- **Sounds:** the Mic's voice crackle (reuse `quest-mic-crackle`), tap-shoe taps, a confetti pop, a spotlight hum. All short and unpitched during play.

## Engine changes Episode 2 needs (for the build prompts)
- **EPISODE SELECT** on the title screen. The save gets an episode field, and each episode's rooms are their own map file (`data/maps/stage.js`).
- **`SAVE_VERSION` 6** with an `upgrade()` step (Episode 1 saves load unchanged). Save-code version **6** (`shared/backup.js`; versions 1–5 already existed) holds Episode 2 progress; versions 1–5 still load.
- **Map ids unique across episodes** (`done` keys are `room:key`, so the room ids above must not clash with the manor's).
- **The rhythm challenge family** (above) and 4 new dodge kinds: beam, confetti, pendulum, static rings.
- **Episode-aware** summary line, whispers (Episode 2 has its own `QUEST_WHISPERS_EP2`), credits and COMPLETE screen.

## The build plan (prompts, run in order; each merged before the next)
1. ✅ **FRAMEWORK (built):** episode select, save v6 + code v6, the attic speaker + the intro cutscene, the Lobby and the Green Room with their NPCs (Maestro frozen, Hoot, Tina, and the snack keeper **Popcorn Pete**), the map file, the summary line. A walkable shell. CHANGES MADE: the save code is version 6, not 3 (1–5 already existed); the balcony is its own room id `balcony`; Episode 2's words live in `data/dialogue-stage.js` (beside `data/maps/stage.js`); the code reserves every Episode 2 id NOW, so the later steps must use these: flags `ep2Start`, `tuskAwake`, `songEb`, `salAwake`, `ricoDone`, `ricoDoor` (befriended: the stage door), `ricoVent` (defeated: the vent), `ep2Done`, `met-moose`, `met-hoot`, `met-tina`, `met-pete`, `met-tusk`, `met-sal`, `met-rico`, `hootAwake`; machine keys `pit:m1–m3`, `workshop:m1–m4`, `backstage:m1–m4`, `dressing:m1–m3`, `loft:m1–m4`, `balcony:m1–m2`, `dressing:boss` (Rico), `stage:boss` (THE BIG NUMBER), each saved with its route; enemy ids `tapsy`, `spotlight`, `feedback`, `confetti`, `metrognome`, `stubs`, `ropeknot`, `miclet`, `rico`, `bignumber`; charm ids `metronome-ticker`, `rosin-pouch`, `ricos-pick`; the Fly Loft's Save Jukebox (its spot is read from its map). The floor's line weights for Episode 2: every machine 50 %, `songEb` 10, `tuskAwake` 5, `salAwake` 5, `ricoDone` 10, `ep2Done` 20. Details: [arcade-quest.md](arcade-quest.md), EPISODE 2.
2. ✅ **RHYTHM (built):** the RHYTHM / TEMPO / ECHO RHYTHM challenges, the E♭ Encore move and Hoot's lesson, the new dodge kinds. All playable in the TEST ARENA first. CHANGES MADE: the 8 machines are built now too (data, sprites, dodges, lines; step 3 only places them in rooms); the rhythm patterns live in `data/rhythms.js` (`QUEST_RHYTHMS` tiers 1–3 + `echo2`); each tier has its own tempo (76 / 80 / 84 bpm); Ticket Stubs asks EXISTING Ancient Ninja Scrolls terms by id (no new vocab items, so the Band Ninja exams are untouched); `QUEST_AREAS.stage` = HP × 1.6, attack × 1.3; Hoot's wake count is `helped2>=6` (Episode 2's machines wherever you are), so it can only happen once step 3 places machines; a map npc's `awake: {flag, sprite}` swaps in the un-glitched sprite (`npc-hoot-ok`; `npc-moose-ok` is drawn for step 5); the Test Arena's second set (`?set=2`) adds RHYTHM PRACTICE. Details: [arcade-quest.md](arcade-quest.md), EPISODE 2.
3. ✅ **ROOMS 3–5 (built):** the Pit, the Workshop, Backstage, their machines, Tubby and Sal waking, the Lobby balcony pair. CHANGES MADE: 13 of the 20 machines placed (the Pit m1 Spotlight, m2 Feedback, m3 Metro-Gnome; the Workshop m1–m2 Tapsy, m3 Rope Knot, m4 Confetti; Backstage m1 Metro-Gnome, m2 Stubs, m3 Feedback, m4 Spotlight; the Balcony m1 Tapsy, m2 Spotlight; rhythm tier 1 in the Pit and the Workshop, 2 Backstage and on the Balcony); **THE SPLIT FOR STEP 4: the 7 left are Feedback 1, Confetti 1, Metro-Gnome 1, Stubs 1, Rope Knot 1 and the 2 Mic-lets** (the Dressing Rooms m1–m3, the Fly Loft m1–m4; the Mix above holds: Tapsy 3, Spotlight 3, Feedback 3, Confetti 2, Metro-Gnome 3, Stubs 2, Rope Knot 2, Mic-let 2); a room can define its own tile letters (`legend`: QUEST_TILES was nearly full); a band member wakes through a room's `wakes: {npc, flag}` (every machine there helped, either way; the save repair does the same from `done`, for codes); the trap door sits under Tubby (`need: 'tuskAwake'`) and he moves aside; the Lobby's balcony door now leads to the built Balcony; the Fly Loft ladder shows "The ladder goes up into the dark. Not today." until step 4; Backstage's Dressing Rooms door and the wings show `soon` signs; Sal's tip is the kit's intro card (flag `rhythmTip`, not in save codes) before the first rhythm battle anywhere and her lesson; the Metronome Ticker = ×1.15 rhythm windows, the Rosin Pouch = ×1.3 CALM from long tones; the balcony's glimpse uses the whisper's drawing (flag `balconyGlimpse`); talk conditions `'a&b'` and `'charm:<id>'`; Moose, Tina and Pete get one line per milestone (flags not in codes). Details: [arcade-quest.md](arcade-quest.md), EPISODE 2.
4. ✅ **ROOMS 6–7 + RICO (built):** the Dressing Rooms, the Fly Loft, the Mic-lets, Rico Bandit's mini-boss with both routes. CHANGES MADE: the 7 machines placed (the Dressing Rooms m1 Feedback, m2 Confetti, m3 Rope Knot; the Fly Loft m1 Mic-let, m2 Metro-Gnome, m3 Stubs, m4 Mic-let; rhythm tier 3), so all 20 are in, with the plan's mix; a new small room, THE VENT (`vent`), is the defeat route's passage (Rico powered down: the grate opens; RICO'S LUCKY PICK = battles give 50 % more tokens, found only there; its hatch climbs into the Loft, and the Loft's side is latched from below so only that route reaches it); the Loft is reached by Sal's ladder or the Vent (not "Backstage after Rico"); Rico's map entry is `boss: true`, so he is not one of the 20 machines (his 10 % is `ricoDone`), and `helped(ep)` counts the machines only; the enemy gets `doneFlag` (ricoDone either way) and `afterLines`; npcs get `if: flag` (Rico by the star door or resting in his chair); the three ways to the stage (the star door: ricoDoor; the Loft's stairs and Backstage's wings: ricoDone) are built as `soon` doors for step 5 to open; Rico's music `quest-ep2-miniboss` falls back to quest-miniboss; the Mic-let's befriend line hints at the reveal; Madame Mezzo's optional line is not built (companions have no per-battle lines). Details: [arcade-quest.md](arcade-quest.md), EPISODE 2.
5. ✅ **THE BIG NUMBER + ENDING (built):** the final boss, both endings, the Microphone's speech, the cliffhanger, credits, EPISODE 2 COMPLETE, achievements and rewards, SHOWSTOPPER. CHANGES MADE: THE MAIN STAGE (`stage`, 22 × 11) opens from all three doors (their `need`s kept, the `soon` signs gone): Backstage's wings arrive at its left, the star door at its right, the Loft's stairs at its back; Maestro Moose leaves the Lobby at `ricoDone` (a note on the carpet: "GONE TO THE STAGE!", and Tina says so) and stands at his podium as THE BIG NUMBER itself (the map enemy, drawn as Moose: A or walking into him plays his speech, flag `met-bignumber`, appended to QUEST_V6.flags so a code keeps it); the other four stand frozen on glitching spots, Rico too on either route; the stage mic (a new sprite, its light dim and steady) stands at the front center and, after the ending, a hole with its cable in its place. THE BIG NUMBER: 215 HP (× the stage area's 1.6 = 344 solo), five `stages` (`until` .8/.6/.4/.2/0) with each member's name and portrait (`who`, `portrait`) and the plan's challenges and dodges (Tubby's `longtone` cutoff with his own words, the new `bubbles` dodge; Hoot's E♭ notes, a quick `rain` of small notes; Sal's two tier-3 measures, `taps` with drumsticks; Rico's fixed lick 'q. e e e q', `borrow`; Moose's 8-beat `tempo` + 16 bpm `accel`, Episode 1's `baton` at 1.45); in battle the five stand in two rows (sprite `bignumber`, `members`), the stage's member lit, the others dimmed with a slow, gentle flicker; the finale's HARMONIZE = the whole concert E♭ scale (snare: 8 strokes), `harmonizeKeep`; `doneFlag: 'ep2Done'` (either way, also repaired from `done['stage:boss']`), the ending route = that key's 2 bits in the code (already reserved: 1 befriended, 2 powered down); rewards fade 40 XP / 20 tokens, befriend 80 / 50 + THE GOLDEN MIC STAND (`mic-stand`, `keep`: once per battle, your next PLAY × 1.25; not in the code's frozen item list, so the save repair gives a befriended boss's key item back). THE ENDINGS (`ep2-ending`, `ep2-ending-fade`, then `ep2-mic`, `ep2-cliffhanger`, Episode 2's credits, EPISODE 2 COMPLETE): DECISION 3's speech is word for word, but its last sentence ("So I'm taking the sound back. All of it. Until it's quiet. Until it's MUSIC again.", 82 characters) is split over two text boxes so each fits. EPISODE 2 COMPLETE's "time" is new: the time played per episode (save `play`, counted from this step on; not in codes). REWARDS: the plan's **Stage Mic** is replaced by the **Showtime Top Hat** (Episode 1 already gives the hand Microphone); the Spotlight is an EFFECT (id `spotlight`; the background `spotlight` = Showtime Malfunction's Spotlight Stage, a different slot); the Showtime Stage background is a new coded scene (`showtime-curtain`); the Showstopper Sash is a top; THE STAGE COLLECTION = Sequined bow tie (top `bowtie`, 250), Marquee-bulb headband (head `bulbband`, 300), Usher's cap (head `usher`, 200), `unlock.booth: 'stage'`: only at Ticket Booth Tina (Terry doesn't show them; the Prize Counter has a "Stage Collection" glass shelf), at the end of QUEST_V6.cosmetics. The pause menu's log is THE SHOWTIME LOG in Episode 2 ("✓ Showstopper", "Still glitching: …"). Music slots: `quest-ep2-boss` (→ quest-boss), `quest-encore` (→ quest-victory), `quest-ep2-cliffhanger` (→ quest-cliffhanger), `quest-room-stage` (→ quest-manor). Details: [arcade-quest.md](arcade-quest.md), EPISODE 2.
6. **POLISH:** music hookups, the Sound Board's "Episode 2 Rooms" section, the sprite gallery sheet for review, the full-route tests (befriend / defeat / mixed, every machine).

## DECISIONS (answered)
1. **Access:** Episode 2 opens ONLY after Episode 1 is finished (`ep1Done`). No recap, no teacher override.
2. **Names:** keep them all as written.
3. **The Microphone's speech:** approved as written (it was the Showtime Band's own stage mic, rewired into the games).
4. **Teachers:** Hoot teaches the E♭ Encore; Sal teaches rhythm.
5. **Credits:** "Created by Mr. Graham", like Episode 1, with no student credit line.
