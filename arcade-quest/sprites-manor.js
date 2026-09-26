/* ARCADE QUEST: GHOST NOTES MANOR's pictures (Episode 1). Same rules as sprites.js: every sprite is a pixel map, one
   character per pixel ('.' = see-through), and each palette maps characters to THEME TOKENS (theme.css, no --).
   Helpers below build the repeated parts (a tile on top of the floor, a ghost body with a hat) so each picture is
   short. YOUR OWN ART: arcade-quest/art/<sprite id>.png replaces any of these (frames side by side).
     tile-…   16 × 16 map tiles (tile-candle, tile-fog, tile-jukebox and tile-stove have 2 frames: they flicker)
     npc-…    the manor's ghosts (24 × 28, 2 frames: they bob)
     wisp, squeaker, hush, wobble, chatterbox   the Episode 1 enemies (32 × 32: idle, idle, happy)
     fermata  THE PHANTOM FERMATA, the mini-boss (56 × 40: idle, idle, happy) */
(function (Q) {
  "use strict";
  const S = Q.SPRITES;
  /** left halves -> symmetric rows */
  const mirror = half => half.map(r => r + [...r].reverse().join(''));
  /** rows moved down by n pixels (an idle bob) */
  const down = (rows, n = 1) => Array(n).fill('').concat(rows.slice(0, rows.length - n));
  /** a copy of rows with some rows replaced: {rowIndex: 'new row'} */
  const swap = (rows, map) => rows.map((r, i) => (map[i] != null ? map[i] : r));
  /** draw overlay rows on top of base rows ('.' in the overlay keeps the base pixel) */
  const over = (base, top, dx = 0, dy = 0) => base.map((row, y) => {
    const t = top[y - dy]; if (!t) return row;
    const out = [...row.padEnd(16, '.')];
    [...t].forEach((ch, x) => { if (ch !== '.' && ch !== ' ' && out[x + dx] !== undefined) out[x + dx] = ch; });
    return out.join('');
  });
  const repeat = (motif, times) => motif.map(r => r.repeat(times));
  const pad16 = rows => Array.from({length: 16}, (_, i) => (rows[i] || '').padEnd(16, '.'));
  const tile = (palette, frames, extra) => Object.assign({w: 16, h: 16, fps: 3, palette, frames}, extra || {});

  /* ---------- floors ---------- */
  const WOOD = {p: 'q-plank', d: 'q-plank-d', l: 'q-plank-l'};
  const PLANKS = ['pppppppppppppppp', 'ppplpppppppppppp', 'pppppppppppppppp', 'dddddddddddddddd',
    'pppppppppdpppppp', 'pppppppppdpppplp', 'pppppppppdpppppp', 'dddddddddddddddd',
    'ppppdppppppppppp', 'plppdppppppppppp', 'ppppdppppppppppp', 'dddddddddddddddd',
    'pppppppppppdpppp', 'pppppppppppdpppp', 'ppppplpppppdpppp', 'dddddddddddddddd'];
  S['tile-floor'] = tile(WOOD, [PLANKS]);
  const carpet = ['cccccccc', 'cccdcccc', 'ccdldccc', 'cdlcldcc', 'ccdldccc', 'cccdcccc', 'cccccccc', 'dccccccc'];
  S['tile-carpet'] = tile({c: 'q-carpet', d: 'q-carpet-d', l: 'q-carpet-l'}, [repeat(carpet, 2).concat(repeat(carpet, 2))]);
  const chk = Array(8).fill('aaaaaaaabbbbbbbb').concat(Array(8).fill('bbbbbbbbaaaaaaaa'));
  S['tile-check'] = tile({a: 'q-tile-a', b: 'q-tile-b'}, [chk]);
  S['tile-rug'] = tile({r: 'q-rug', l: 'q-rug-l'}, [repeat(['rrrr', 'rlrr', 'rrrr', 'rrrl'], 4).concat(repeat(['rrrr', 'rlrr', 'rrrr', 'rrrl'], 4), repeat(['rrrr', 'rlrr', 'rrrr', 'rrrl'], 4), repeat(['rrrr', 'rlrr', 'rrrr', 'rrrl'], 4))]);
  S['tile-stairs'] = tile(Object.assign({t: 'q-trim-d'}, WOOD), [[].concat(...Array(4).fill(['tllllllllllllllt', 'tppppppppppppppt', 'tppppppppppppppt', 'tddddddddddddddt']))]);
  S['tile-void'] = tile({v: 'q-void'}, [Array(16).fill('vvvvvvvvvvvvvvvv')]);
  S['tile-cap'] = tile({d: 'q-wall-d', v: 'q-void'}, [['dddddddddddddddd', 'dddvdddddddddddd', 'dddddddddddvdddd', 'dddddddddddddddd', 'ddddddvddddddddd',
    'dddddddddddddddd', 'ddddddddddddddvd', 'dvdddddddddddddd', 'dddddddddddddddd', 'dddddddddvdddddd', 'dddddddddddddddd', 'dddddvdddddddddd',
    'dddddddddddddddd', 'dddddddddddddvdd', 'dddddddddddddddd', 'dddddddddddddddd']]);
  // fog: the floor with a dithered, drifting mist (2 frames)
  const mist = ['................', '................', '...ff...........', '..ffff.f........', '....fff.........', '................', '................',
    '..........ff....', '........ffff.f..', '..........fff...', '................', '................', '.f..............', 'fff.......f.....', '.f.......fff....', '................'];
  S['tile-fog'] = tile(Object.assign({f: 'q-fog'}, WOOD), [over(PLANKS, mist), over(PLANKS, mist.map(r => r.slice(15) + r.slice(0, 15)))], {fps: 2});
  // an exit at the bottom of a room: a doormat with an arrow
  S['tile-mat'] = tile(Object.assign({m: 'q-carpet-d', a: 'q-carpet-l'}, WOOD), [over(PLANKS, ['', '', '..mmmmmmmmmmmm..', '..mmmmmmmmmmmm..', '..mmmmmaammmmm..', '..mmmmmaammmmm..',
    '..mmmmmaammmmm..', '..mmmaaaaaammm..', '..mmmmaaaammmm..', '..mmmmmaammmmm..', '..mmmmmmmmmmmm..', '..mmmmmmmmmmmm..'])]);

  /* ---------- walls (the face of the back wall; decorations sit on it) ---------- */
  const WALL = {W: 'q-wall', d: 'q-wall-d', l: 'q-wall-l', t: 'q-trim', T: 'q-trim-d', v: 'q-void', g: 'q-brass', G: 'q-brass-d'};
  const FACE = ['tttttttttttttttt', 'TTTTTTTTTTTTTTTT', 'WWWdWWWWWWWdWWWW', 'WWWdWWWlWWWdWWWW', 'WWWdWWlWlWWdWWWW', 'WWWdWWWlWWWdWWWW',
    'WWWdWWWWWWWdWWWW', 'WWWdWWWWWWWdWWWW', 'WWWdWWWWWWWdWWWW', 'WWWdWWWlWWWdWWWW', 'WWWdWWlWlWWdWWWW', 'WWWdWWWlWWWdWWWW',
    'WWWdWWWWWWWdWWWW', 'TTTTTTTTTTTTTTTT', 'tttttttttttttttt', 'TTTTTTTTTTTTTTTT'];
  S['tile-wall'] = tile(WALL, [FACE]);
  const flame = (lean) => ['', '', '.......f'.padStart(8 + lean, '.'), '......fYf'.padStart(9 + lean, '.'), '......fYf'.padStart(9 + lean, '.'), '.......F'.padStart(8 + lean, '.'),
    '......www', '......www', '......www', '......www', '....ggggggg', '.....GgggG', '.......G'];
  S['tile-candle'] = tile(Object.assign({f: 'q-flame', F: 'q-flame-d', Y: 'q-white', w: 'q-tea'}, WALL), [over(FACE, flame(0)), over(FACE, flame(1))], {fps: 4});
  S['tile-door'] = tile(WALL, [['tttttttttttttttt', 'TTTTTTTTTTTTTTTT', 'WWTttttttttttTWW'].concat(Array(13).fill('WWtvvvvvvvvvvtWW'))]);
  S['tile-locked'] = tile(Object.assign({p: 'q-plank-d', P: 'q-plank', c: 'q-steel', C: 'q-steel-d'}, WALL), [['tttttttttttttttt', 'TTTTTTTTTTTTTTTT', 'WWTttttttttttTWW',
    'WWtpPpPpPpPpPtWW', 'WWtcpPpPpPpPctWW', 'WWtpcPpPpPpcptWW', 'WWtpPcpPpPcPptWW', 'WWtpPpcggcpPptWW', 'WWtpPpPgGgpPptWW', 'WWtpPpPgGgpPptWW',
    'WWtpPpcgggcPptWW', 'WWtpPcPpPpPcptWW', 'WWtpcPpPpPpPctWW', 'WWtcpPpPpPpPpcWW', 'WWtpPpPpPpPpPtWW', 'WWtpPpPpPpPpPtWW']]);
  const frame = (inner) => ['', '', '...gggggggggg', '...g' + inner[0] + 'g', '...g' + inner[1] + 'g', '...g' + inner[2] + 'g', '...g' + inner[3] + 'g',
    '...g' + inner[4] + 'g', '...g' + inner[5] + 'g', '...g' + inner[6] + 'g', '...g' + inner[7] + 'g', '...gggggggggg'];
  const PORT = Object.assign({h: 'q-ghost', k: 'q-black', m: 'q-out', b: 'q-glass', M: 'q-moon', r: 'q-carpet', R: 'q-carpet-d', y: 'q-tea', e: 'q-grey'}, WALL);
  S['tile-portrait'] = tile(PORT, [over(FACE, frame(['vvvhhvvv', 'vvhhhhvv', 'vhkhhkhv', 'vhhhhhhv', 'vhhmmhhv', 'vhhhhhhv', 'vhvhhvhv', 'vvvvvvvv']))]);
  S['tile-portrait2'] = tile(PORT, [over(FACE, frame(['bbyyyybb', 'byyyyyyb', 'byhhhhyb', 'bbhkkhbb', 'bbhhhhbb', 'bRRRRRRb', 'RRRrrRRR', 'RRRrrRRR']))]);
  S['tile-portrait3'] = tile(PORT, [over(FACE, frame(['bbbbbMMb', 'bbbbMMMM', 'bybbbMMb', 'bbbbbbbb', 'bbbbybbb', 'eeebbbbb', 'eeeeebbe', 'eeeeeeee']))]);
  S['tile-window'] = tile(Object.assign({b: 'q-glass', M: 'q-moon', s: 'q-white'}, WALL), [over(FACE, ['', '', '...gggggggggg', '...gbbbbgbbbg', '...gbbbbgbMMg', '...gbbbbgbMMg',
    '...gbbbbgbbbg', '...gggggggggg', '...gbbbbgbbbg', '...gbsbbgbbbg', '...gbbbbgbbbg', '...gggggggggg', '..gggggggggggg'])]);
  S['tile-clock'] = tile(Object.assign({w: 'q-plank-d', P: 'q-plank', m: 'q-tea', k: 'q-black', b: 'q-glass', y: 'q-brass'}, WALL), [over(FACE, [
    '.....wwwwww', '....wPPPPPPw', '....wPmmmmPw', '....wmmkmmmw', '....wmmkkmmw', '....wmmmmmmw', '....wPmmmmPw', '....wwwwwwww',
    '....wPbbbbPw', '....wPbybbPw', '....wPbybbPw', '....wPbyybPw', '....wPbbbbPw', '....wwwwwwww', '...wwwwwwwwww', '...PPPPPPPPPP'])]);
  S['tile-fireplace'] = tile(Object.assign({s: 'q-grey', S: 'q-grey-d', f: 'q-flame', F: 'q-flame-d', Y: 'q-white'}, WALL), [0, 1].map(i => over(FACE, [
    '', '', 'ssssssssssssssss', 'SSSSSSSSSSSSSSSS', '.ss..........ss.', '.sSvvvvvvvvvvSs.', '.sSvvvvvvvvvvSs.', '.sSvvvvvvvvvvSs.',
    i ? '.sSvvvfvvvvvvSs.' : '.sSvvvvvvfvvvSs.', i ? '.sSvvfFfvvfvvSs.' : '.sSvvfvvfFfvvSs.', '.sSvvfFYfFFfvSs.', '.sSvfFYYYYFfvSs.', '.sSvFFFFFFFFvSs.', '.sSGGGGGGGGGGSs.'])), {fps: 4});

  /* ---------- furniture (on the wood floor) ---------- */
  const FURN = Object.assign({c: 'q-tea', C: 'q-tea-d', w: 'q-plank-d', g: 'q-green-d', G: 'q-green', o: 'q-orange-d', O: 'q-orange', k: 'q-black', K: 'q-grey-d',
    y: 'q-white', s: 'q-steel', S: 'q-steel-d', r: 'q-red', b: 'q-brass', B: 'q-brass-d', e: 'q-ghost-d', E: 'q-ghost', z: 'q-out', t: 'q-trim'}, WOOD);
  S['tile-table'] = tile(FURN, [pad16(['', '...cccccccccc', '..cccccccccccc', '.cccccccccccccc', '.cccccccbcccccc', '.ccccccbbbcccccc', '.cccccccwcccccc',
    '.cccccccwcccccc', '..cccccccccccc', '..CCcccccccCCC', '...CCCCCCCCCC', '.....ww..ww', '.....ww..ww'])]);
  S['tile-chair'] = tile(FURN, [pad16(['', '', '....wwwwwwww', '....wppppppw', '....wppppppw', '....wwwwwwww', '....wrrrrrrw', '....wrrrrrrw',
    '....wrrrrrrw', '....wwwwwwww', '....w......w', '....w......w', '....w......w'])]);
  S['tile-plant'] = tile(FURN, [pad16(['......g..g', '...g..g.g..g', '....g.gGg.g', '.....gGGg', '..g..gGg..g', '...gggGggg', '.....ggg', '.......g',
    '....oooooooo', '....OOOOOOOO', '.....oOOOOo', '.....oOOOOo', '......oooo'])]);
  S['tile-piano'] = tile(FURN, [['kkkkkkkkkkkkkkkk', 'kKKKKKKKKKKKKKKk', 'kKkkkkkkkkkkkkKk', 'kKkkkkkkkkkkkkKk', 'kKkkkkkkkkkkkkKk', 'kKkkkkkkkkkkkkKk', 'kKkkkkkkkkkkkkKk', 'kKkkkkkkkkkkkkKk',
    'kKkkkkkkkkkkkkKk', 'kKkkkkkkkkkkkkKk', 'kKkkkkkkkkkkkkKk', 'kKkkkkkkkkkkkkKk', 'kKkkkkkkkkkkkkKk', 'kKkkkkkkkkkkkkKk', 'kKKKKKKKKKKKKKKk', 'kkkkkkkkkkkkkkkk']]);
  S['tile-keys'] = tile(FURN, [['kkkkkkkkkkkkkkkk', 'ykykyykykykyykyk', 'ykykyykykykyykyk', 'ykykyykykykyykyk', 'ykykyykykykyykyk', 'yyyyyyyyyyyyyyyy', 'yyyyyyyyyyyyyyyy', 'yyyyyyyyyyyyyyyy',
    'CCCCCCCCCCCCCCCC', 'kkkkkkkkkkkkkkkk', 'k.............k.'.replace(/\./g, 'p'), 'kppppppppppppkpp', 'kppppppppppppkpp', 'pppppppppppppppp', 'dddddddddddddddd', 'pppppppppppppppp']]);
  S['tile-counter'] = tile(FURN, [['SSSSSSSSSSSSSSSS', 'ssssssssssssssss', 'ssssssssssssssss', 'sssyssssssssssss', 'ssssssssssssssss', 'SSSSSSSSSSSSSSSS',
    'wwwwwwwwwwwwwwww', 'wpppppppwpppppppw'.slice(0, 16), 'wpppbpppwpppbppp', 'wpppppppwppppppp', 'wpppppppwppppppp', 'wpppppppwppppppp', 'wpppppppwppppppp',
    'wwwwwwwwwwwwwwww', 'dddddddddddddddd', 'pppppppppppppppp']]);
  const stove = i => ['kkkkkkkkkkkkkkkk', 'kKKKKKKKKKKKKKKk', 'kKsssKKKKKsssKKk', 'kKs' + (i ? 'r' : 'O') + 'sKKKKKs' + (i ? 'O' : 'r') + 'sKKk', 'kKsssKKKKKsssKKk',
    'kKKKKKKKKKKKKKKk', 'kkkkkkkkkkkkkkkk', 'kSSSSSSSSSSSSSSk', 'kSkkkkkkkkkkkkSk', 'kSkk' + (i ? 'OrOr' : 'rOrO') + 'kkkkkkSk', 'kSkkkkkkkkkkkkSk', 'kSSSSSSSSSSSSSSk',
    'kkkkkkkkkkkkkkkk', 'k..............k'.replace(/\./g, 'p'), 'dddddddddddddddd', 'pppppppppppppppp'];
  S['tile-stove'] = tile(FURN, [stove(0), stove(1)], {fps: 4});
  const juke = i => ['....rrrrrrrr', '..rrbbbbbbbbrr', '.rbb' + (i ? 'EyEyEy' : 'yEyEyE') + 'bbr', 'rbbcccccccccbbr', 'rbcckkkkkkkccbr', 'rbcckOOOOOkccbr', 'rbcckkkkkkkccbr',
    'rbcccccccccccbr', 'rb' + (i ? 'GbGbGbGbGbG' : 'bGbGbGbGbGb') + 'br', 'rbcccccccccccbr', 'rbcsssssssssbcr'.slice(0, 15), 'rbcsKsKsKsKscbr', 'rbcsssssssssbcr', 'rbbbbbbbbbbbbbr', 'rrrrrrrrrrrrrrr', 'ddddddddddddddd'];
  S['tile-jukebox'] = tile(Object.assign({}, FURN, {r: 'q-pink', b: 'q-purple', E: 'q-cursor', G: 'q-gold'}), [juke(0), juke(1)].map(f => f.map(r => r.padEnd(16, 'p'))), {fps: 2});
  S['tile-booth'] = tile(Object.assign({}, FURN, {r: 'q-red', R: 'q-carpet-d', g: 'q-glass', b: 'q-brass', y: 'q-gold'}), [['RRRRRRRRRRRRRRRR', 'RyRyRyRyRyRyRyRR', 'RRRRRRRRRRRRRRRR',
    'rggggggggggggggr', 'rgggggggggggeggr', 'rggggggggggeggggr'.slice(0, 16), 'rgggggggggeggggr', 'rggggggggggggggr', 'rrrrrrrrrrrrrrrr', 'rrrrrbbbbbbrrrrr', 'rrrrbbybbybbrrrr',
    'rrrrrbbbbbbrrrrr', 'rrrrrrrrrrrrrrrr', 'RRRRRRRRRRRRRRRR', 'dddddddddddddddd', 'pppppppppppppppp']]);
  S['tile-shop'] = tile(Object.assign({}, FURN, {g: 'q-brass', G: 'q-brass-d', v: 'q-glass', m: 'q-steel'}), [['................'.replace(/\./g, 'p'),
    'pppgpppppmppppgp', 'ppgGgpppmmmppgGg', 'ppgGgpppmmmppgGg', 'ppgGgpppmmmppgGg', 'ppgggpppmmmppggg', 'wwwwwwwwwwwwwwww', 'wttttttttttttttw',
    'wppppppppppppppw', 'wppppbbbbbbppppw', 'wppppbBBBBbppppw', 'wppppbbbbbbppppw', 'wppppppppppppppw', 'wwwwwwwwwwwwwwww', 'dddddddddddddddd', 'pppppppppppppppp']]);
  S['tile-books'] = tile({W: 'q-plank', w: 'q-plank-d', v: 'q-void', 1: 'q-book-1', 2: 'q-book-2', 3: 'q-book-3', 4: 'q-book-4', y: 'q-gold'}, [['WWWWWWWWWWWWWWWW',
    'Wv12v33v4v21v3vW', 'W1122334412213vW', 'W1y2233y4121334W', 'W11223344122134W', 'W11223344122134W', 'WwwwwwwwwwwwwwwW',
    'W4v31v2vv13v24vW', 'W4431122v1332v4W', 'W4431y2213y2244W', 'W4431122v1332v4W', 'W4431122v133224W', 'W4431122v133224W', 'WwwwwwwwwwwwwwwW', 'WWWWWWWWWWWWWWWW', 'wwwwwwwwwwwwwwww']]);
  // the dusty sheet fills its tiles edge to edge, so 2 × 2 of them make one big draped shape
  S['tile-sheet'] = tile(FURN, [['EEEEEEEEEEEEEEEE', 'EEEEEEEEEEEEEEEE', 'EEEEeEEEEEEEEEEE', 'EEEEEeEEEEEEEEEE', 'EEEEEEEEEEEEeEEE', 'EEEEEEEEEEEeEEEE',
    'EEeEEEEEEEEEEEEE', 'EEEeEEEEEEEEEEEE', 'EEEEEEEEEEEEEEEE', 'EEEEEEEEeEEEEEEE', 'EEEEEEEEEeEEEEEE', 'EEEEEEEEEEEEEEEE', 'EEEEEeEEEEEEEEeE',
    'EEEEEEeEEEEEEEEE', 'EEEEEEEEEEEEEEEE', 'eeeeeeeeeeeeeeee']]);
  S['tile-cable'] = tile(FURN, [pad16(['', '', '', '', '', '', '', 'zzzzzzzzzzzzzzzz', 'kkkkkkkkkkkkkkkk', 'zzzzzzzzzzzzzzzz'])]);
  // THE Ghost Notes cabinet you came through: a tiny arcade cabinet with a ghost on its screen
  S['tile-cabinet'] = tile(Object.assign({}, FURN, {a: 'q-purple', A: 'q-purple-d', n: 'q-ghost', g: 'q-glass', p: 'q-pink'}), [['..aaaaaaaaaaaa..', '..appppppppppa..', '..aAAAAAAAAAAa..',
    '..agggggggggga..', '..aggggnngggga..', '..agggnnnnggga..', '..aggnknnkngga..', '..agggnnnnggga..', '..agggnnnnggga..', '..agggggggggga..', '..aaaaaaaaaaaa..',
    '..aAAyAAAAyAAa..', '..aAAAAAAAAAAa..', '..aaaaaaaaaaaa..', '..AAAAAAAAAAAA..', '................']]);

  /* ---------- the ghosts of the manor (NPCs): a ghost body + their own look, 24 × 28, 2 frames (a bob) ---------- */
  const GHOST = ['.....oooooooo', '...oowwwwwwwwoo', '..owwwwwwwwwwwwo', '.owwwwwwwwwwwwwwo', '.owwwwwwwwwwwwwwo', 'owwwwkkwwwwkkwwwwo', 'owwwwkKwwwwkKwwwwo',
    'owwwpwwwwwwwwpwwwo', 'owwwwwwwmmwwwwwwwo', 'owwwwwwwwwwwwwwwwo', 'owwwwwwwwwwwwwwwwo', 'owwwwwwwwwwwwwwwwo', 'owwwwwwwwwwwwwwwwo', 'owwwwwwwwwwwwwwwwo',
    'owwdwwwwwwwwwwdwwo', 'owwwwwwwwwwwwwwwwo', 'owwwwowwwwwowwwwwo', '.owwo.owwwo.owwwo', '..oo...ooo...ooo'];
  const npc = (palette, body, parts, at = [3, 6]) => ({w: 24, h: 28, fps: 2,
    layers: [0, 1].map(dy => [{rows: body, palette, at: [at[0], at[1] + dy]}].concat(parts.map(p => ({rows: p.rows, palette, at: [p.at[0], p.at[1] + dy]}))))});
  const GP = {o: 'q-ghost-d', w: 'q-ghost', d: 'q-ghost-d', k: 'q-black', K: 'q-white', p: 'q-cheek', m: 'q-out'};
  // Madame Mezzo: lavender, a tiara, pearls, eyelashes and a big "Ahhh!" mouth
  S['npc-mezzo'] = npc(Object.assign({}, GP, {w: 'q-ghost-2', y: 'q-gold', r: 'q-pink', e: 'q-white', l: 'q-out'}),
    swap(GHOST, {4: '.owwwlwwwwwwlwwwwo', 8: 'owwwwwwwmmwwwwwwwo', 9: 'owwwwwwmrrmwwwwwwo', 10: 'owwwwwwwmmwwwwwwwo', 12: 'owwewewewewewewewo'}),
    [{at: [8, 2], rows: ['.y..y..y', 'yyyyyyyy', '.yryyry.']}]);
  // Rusty: a small, worried drop of valve oil (with a sweat drop)
  S['npc-rusty'] = npc(Object.assign({}, GP, {o: 'q-brass-d', w: 'q-brass', d: 'q-brass-d', s: 'q-wisp'}),
    ['.......oo', '......owwo', '.....owwwwo', '....owwwwwwo', '...owwwwwwwwo', '..owkwwwwwkwwo', '..owkKwwwkKwwo', '.owwwwwwwwwwwwo', '.owpwwmmmmwwpwo',
      '.owwwwwwwwwwwwo', '.owwwwwwwwwwwwo', '..owwwwwwwwwwo', '...owwwwwwwwo', '....oooooooo'], [{at: [19, 10], rows: ['.s', 'sss', '.s']}], [4, 12]);
  // Token Booth Terry: a red visor, a bow tie and a coin belt
  S['npc-terry'] = npc(Object.assign({}, GP, {r: 'q-red', R: 'q-carpet-d', y: 'q-gold', s: 'q-steel'}), GHOST,
    [{at: [4, 4], rows: ['..rrrrrrrrrrrr', '.rRRRRRRRRRRRRr', 'rrrrrrrrrrrrrrrrrr'.slice(0, 16)]}, {at: [10, 16], rows: ['rr..rr', 'rrrrrr', 'rr..rr']},
      {at: [4, 20], rows: ['ssyssyssyssyssss'.slice(0, 16)]}]);
  // Sir Reginald Rest: a nightcap, closed eyes (always sleepy)
  S['npc-reginald'] = npc(Object.assign({}, GP, {b: 'q-blue', B: 'q-blue-d', y: 'q-white'}),
    swap(GHOST, {5: 'owwwwwwwwwwwwwwwwo', 6: 'owwwkkwwwwwkkwwwwo', 8: 'owwwwwwwwwwwwwwwwo', 9: 'owwwwwwwmmwwwwwwwo'}),
    [{at: [6, 0], rows: ['..........yy', '.........bbyy', '.......bbbb', '.....bbbbbB', '...bbbbbbbBB', '.bbbbbbbbbbBB', 'yyyyyyyyyyyyyy']}]);
  // The Library Twins: Tilly (pink bow, glasses) and Tally (blue bow tie, glasses)
  const MINI = ['....oooooo', '..oowwwwwwoo', '.owwwwwwwwwwo', 'owwwwwwwwwwwwo', 'owwsssswssssww'.slice(0, 14), 'owwskKswskKsww'.slice(0, 14), 'owwsssswsssswo',
    'owpwwwwwwwwpwo', 'owwwwwmmwwwwwo', 'owwwwwwwwwwwwo', 'owwwwwwwwwwwwo', 'owwwwwwwwwwwwo', 'owwowwwowwwowo', '.oo.ooo.ooo.o'];
  S['npc-tilly'] = npc(Object.assign({}, GP, {s: 'q-steel', r: 'q-pink'}), MINI, [{at: [12, 7], rows: ['r...r', 'rr.rr', 'rrrrr', 'rr.rr', 'r...r']}], [5, 11]);
  S['npc-tally'] = npc(Object.assign({}, GP, {s: 'q-steel', r: 'q-blue'}), MINI, [{at: [9, 19], rows: ['rr.rr', 'rrrrr', 'rr.rr']}], [5, 11]);
  // The Butler: slick hair, a mustache, a tuxedo front and a bow tie
  S['npc-butler'] = npc(Object.assign({}, GP, {h: 'q-grey-d', t: 'q-black', y: 'q-white', r: 'q-red'}),
    swap(GHOST, {8: 'owwwwwhhhhhhwwwwwo', 9: 'owwwwwwwwwwwwwwwwo'}),
    [{at: [6, 5], rows: ['..hhhhhhhhhh', '.hhhhhhhhhhhh', 'hh..........hh']}, {at: [4, 17], rows: ['tttttyyyttttt', 'ttttyyryyyttt'.slice(0, 13), 'ttttyyyyyyttt', 'tttttyyyyyttt']}]);
  // background ghosts
  S['npc-lou'] = npc(Object.assign({}, GP, {s: 'q-steel', S: 'q-steel-d', y: 'q-white', b: 'q-sour'}), GHOST,
    [{at: [19, 12], rows: ['yyyyy', 'ykyky', 'yyyyy', '..S', '..S', '..S', '..S', '..S', '.S.S', 'S...S']}, {at: [3, 2], rows: ['...b', '..bb', '.b..']}]);
  S['npc-fran'] = npc(Object.assign({}, GP, {q: 'q-gold', y: 'q-paper'}), GHOST,
    [{at: [18, 0], rows: ['.qqq', 'q...q', '...q', '..q', '..q', '', '..q']}, {at: [8, 18], rows: ['yyyyyy', 'yyyyyy', 'yyyyyy', 'yyyyyy']}]);
  S['npc-dot'] = npc(Object.assign({}, GP, {w: 'q-cheek', o: 'q-pink', d: 'q-pink', p: 'q-carpet-l', y: 'q-white'}),
    swap(GHOST, {11: 'owwywwwwywwwwywwwo', 14: 'owwwwywwwwywwwywwo'}), [{at: [4, 3], rows: ['......yy', '....yyyyyy', '......yy']}]);
  S['npc-sizzle'] = npc(Object.assign({}, GP, {y: 'q-white', Y: 'q-tea-d', r: 'q-red'}), GHOST,
    [{at: [6, 0], rows: ['..yyy.yyy', '.yyyyyyyyy', '.yyyyyyyyyy', '..yyyyyyyy', '..YYYYYYYY']}, {at: [6, 16], rows: ['r.....r', '.rrrrr']}]);

  /* ---------- Episode 1 enemies (32 × 32: idle, idle, happy). Halves are mirrored; m1 mirrors one half row. ---------- */
  const m1 = half => mirror([half])[0];
  const three = (rows, happy) => [rows, down(rows), swap(rows, happy)];
  /* WISP: a little blue flame ghost that loves one note */
  const wisp = mirror(['', '', '...............o', '..............ow', '.............owl', '............owll', '...........owwll', '..........owwwll',
    '.........owwwwwl', '........owwwwwww', '.......owwwwwwww', '......owwwwwwwww', '......owwkkkwwww', '.....owwwkKkwwww', '.....owwwkkkwwww',
    '.....owpwwwwwwww', '.....owwwwwwwwmm', '.....owwwwwwwwww', '......owwwwwwwww', '......oBwwwwwwww', '.......oBwwwwwww', '........oBBwwwww',
    '.........ooBBBBB', '...........ooooo', '', '....l']);
  S.wisp = {w: 32, h: 32, fps: 4, palette: {o: 'q-wisp-d', w: 'q-wisp', l: 'q-white', B: 'q-wisp-d', k: 'q-black', K: 'q-white', p: 'q-cheek', m: 'q-out'},
    frames: three(wisp, {12: m1('......owwwwwwwww'), 13: m1('.....owwwwkwwwww'), 14: m1('.....owwwkwkwwww'), 16: m1('.....owwwwwwwwmw'), 17: m1('.....owwwwwwwwwm')})};
  /* SQUEAKER: a reed-shaped ghost that squeaks (the little lines). It calms when you play slowly and clearly. */
  const squeakBody = mirror(['', '..........oooooo', '.........orrrrrr', '.........orlrrrr', '.........orrrrrr', '........orrrrrrr', '........orrkkrrr',
    '........orrkKrrr', '........orrkkrrr', '........orrrrrrr', '........orprrrrr', '........orrrrroo', '........orrrrrok', '........orrrrroo',
    '........orrrrrrr', '........ordrrrrr', '........orrrrrrr', '........orrrdrrr', '........orrrrrrr', '........ordrrrrr', '........orrrrrrr',
    '........orrrrrrr', '........orrorrro', '.........oo.oooo']);
  const squeakLines = mirror(['', '', '', '', '...s', '..s', '...s', '..s', '...s']);
  const squeak = over(squeakBody.map(r => r.padEnd(32, '.')), squeakLines).map((r, i) => (squeakLines[i] ? r.slice(0, 16) + [...r.slice(0, 16)].reverse().join('') : r));
  S.squeaker = {w: 32, h: 32, fps: 5, palette: {o: 'q-trim-d', r: 'q-reed', l: 'q-white', d: 'q-trim', k: 'q-black', K: 'q-white', p: 'q-cheek', s: 'q-sour'},
    frames: three(squeak, {4: squeakBody[4], 5: squeakBody[5], 6: m1('........orrrrkrr'), 7: m1('........orrrkrkr'), 8: m1('........orrrrrrr'), 11: m1('........orrrrrrr'),
      12: m1('........orrrrrkr'), 13: m1('........orrrrrrk')})};
  /* HUSH: a librarian ghost with a bun, round glasses and a big book (shhh!) */
  const hush = mirror(['.............ggg', '............gggg', '.............ggg', '..........oooooo', '........oowwwwww', '.......owwwwwwww', '......owwwwwwwww',
    '.....owwsssswwww', '.....owwskkswwss', '.....owwsssswwww', '.....owpwwwwwwww', '.....owwwwwwwwmm', '.....owwwwwwwwww', '....owwwwwwwwwww',
    '....owwwwbbbbbbb', '....owwwwbBBBBBB', '....owwwwbBPPPPP', '....owwwwbBBBBBB', '....owwwwbbbbbbb', '....owwwwwwwwwww', '....owwwwwwwwwww',
    '....owwowwwowwww', '.....oo.ooo.oooo']);
  S.hush = {w: 32, h: 32, fps: 2, palette: {o: 'q-ghost-d', w: 'q-ghost-2', g: 'q-grey', s: 'q-steel', k: 'q-black', p: 'q-cheek', m: 'q-out', b: 'q-book-2', B: 'q-blue-d', P: 'q-paper'},
    frames: three(hush, {8: m1('.....owwsssswwss'), 11: m1('.....owwwwwwwwmw'), 12: m1('.....owwwwwwwwwm')})};
  /* WOBBLE: a jelly ghost that shakes. A steady long tone calms it. */
  const wobble = mirror(['', '', '', '', '', '', '..........oooooo', '........oojjjjjj', '.......ojjjjjjjj', '......ojjWWjjjjj', '.....ojjWjjjjjjj', '.....ojjjjjjjjjj',
    '....ojjjjkkjjjjj', '....ojjjjkKjjjjj', '....ojjjjkkjjjjj', '....ojjpjjjjjjjj', '...ojjjjjjjjjjmj', '...ojjjjjjjjjmjm', '...ojjjjjjjjjjjj', '...oJjjjjjjjjjjj',
    '...oJJjjjjjjjjjj', '...oJJJJjjjjjjjj', '....ooJJJJJJJJJJ', '......oooooooooo']);
  S.wobble = {w: 32, h: 32, fps: 5, palette: {o: 'q-jelly-d', j: 'q-jelly', J: 'q-jelly-d', W: 'q-white', k: 'q-black', K: 'q-white', p: 'q-cheek', m: 'q-out'},
    frames: three(wobble, {12: m1('....ojjjjjjjjjjj'), 13: m1('....ojjjjjkjjjjj'), 14: m1('....ojjjjkjkjjjj'), 16: m1('...ojjjjjjjjjjmj'), 17: m1('...ojjjjjjjjjjjm')})};
  /* CHATTERBOX: a teacup ghost that won't stop talking (steam rising, mouth open) */
  const chatter = mirror(['', '', '..............l.', '.............l..', '..............l.', '.............l..', '', '....oooooooooooo', '....oTTTTTTTTTTT',
    '....ottttttttttt', '....oooooooooooo', '.oo.owwwwwwwwwww', 'o..oowwkkwwwwwww', 'o...owwkKwwwwwww', 'o...owwkkwwwwwww', '.o..owpwwwwwwwkk',
    '..o.owwwwwwwwwkr', '...oowwwwwwwwwkk', '.....owwwwwwwwww', '......owWwwwwwww', '.......ooooooooo', '....ssssssssssss', '.....ooooooooooo']);
  S.chatterbox = {w: 32, h: 32, fps: 6, palette: {o: 'q-tea-d', w: 'q-tea', W: 'q-white', T: 'q-wood-l', t: 'q-wood', l: 'q-ghost', k: 'q-black', K: 'q-white', r: 'q-red', p: 'q-cheek', s: 'q-tea-d'},
    frames: [chatter, swap(chatter, {15: m1('.o..owpwwwwwwwww'), 16: m1('..o.owwwwwwwwwkk'), 17: m1('...oowwwwwwwwwww')}),
      swap(chatter, {12: m1('o..oowwwwwwwwwww'), 13: m1('o...owwwkwwwwwww'), 14: m1('o...owwkwkwwwwww'), 15: m1('.o..owpwwwwwwwww'), 16: m1('..o.owwwwwwwwwkw'), 17: m1('...oowwwwwwwwwwk')})]};
  /* THE PHANTOM FERMATA (mini-boss): a huge ghostly fermata whose dot is one big eye. It holds the attic door shut. */
  const ferm = mirror(['', '..................oooooooooo', '..............oooowwwwwwwwww', '...........ooowwwwwwwwwwwwwww', '.........oowwwwwwwwwwwwwwwww',
    '.......oowwwwwwwwwoooooooooo', '......owwwwwwwwooo', '.....owwwwwwwoo', '....owwwwwwoo', '...owwwwwwo', '...owwwwwo', '..owwwwwo', '..owwwwwo', '..owwwwo',
    '.owwwwwo', '.owwwwo', '.owwwwo', '.owwwwo', '.owwwwo', '..owwo', '..owwo', '...ow', '..owo', '...o', '......................oooooo',
    '....................ooEEEEEE', '...................oEEEEEEEE', '..................oEEEEEEEEE', '..................oEEEEEEkkk', '.................oEEEEEEkkKk',
    '.................oEEEEEEkkkk', '.................oEEEEEEEkkk', '..................oEEEEEEEEE', '..................oEEEEEEEEE', '...................oEEEEEEEE',
    '....................ooEEEEEE', '......................oooooo'].map(r => r.padEnd(28, '.').slice(0, 28)));
  S.fermata = {w: 56, h: 40, fps: 3, palette: {o: 'q-purple-d', w: 'q-ghost-2', E: 'q-ghost', k: 'q-purple-d', K: 'q-white'},
    frames: three(ferm, {28: m1('..................oEEEEEEEEE'), 29: m1('.................oEEEEEEkkkk'), 30: m1('.................oEEEEEkEEEE'), 31: m1('.................oEEEEkEEEEE')})};

  /* ---------- small things for the overworld ---------- */
  S.coin = {w: 7, h: 7, palette: {y: 'q-gold', Y: 'q-brass-d', w: 'q-white'}, frames: [['.yyyyy.', 'yywyyyY', 'ywyyyyY', 'yyyyyyY', 'yyyyyyY', 'YyyyyyY', '.YYYYY.']]};
  S.talk = {w: 9, h: 9, palette: {w: 'q-white', k: 'q-black'}, frames: [['.wwwwwww.', 'wwwwwwwww', 'wwkwkwkww', 'wwwwwwwww', '.wwwwwww.', '...ww....', '..w......', '', '']]};
})(window.QUEST_ART);
