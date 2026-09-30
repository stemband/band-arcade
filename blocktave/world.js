/* BLOCKTAVE: THE WORLD (Arcade.BlocktaveWorld): the blocks, the seeded generator, the saved format, light and rooms.
   Testable on its own (no drawing, no DOM).
     BW.BLOCKS                 every block: {id (number, saved: never renumber), key, name, solid, mine, tier, drop, …}
     BW.generate(seed, R)      a new world {seed, w, h, b (Uint8Array, row-major), meta, bags, spawn, time, nights, …}
     BW.encode(world) / BW.decode(obj)   the saved form: {v, seed, w, h, chunks: [RLE per 16 columns], …} (versioned)
     BW.zone(world, x, y)      {biome, layer: 'peaks'|'surface'|'middle'|'depths'} (Treble Peaks / Bass Depths)
     BW.light(world, x, y, sky, lamps)   0–1
     BW.room(world, x, y)      the enclosed space around an air tile: {tiles, doors, walls} or null (open / too big)
   The world is side view: x = column (0 at the left), y = row (0 at the top of the sky). */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  /* ---------- THE BLOCKS ----------
     solid   the player stands on it and can't walk through it
     mine    'tap' (one tap) | 'tone' | 'scale' | 'sustain' | 'rhythm' | 'rest' (a CHALLENGE CARD) | null (can't be mined)
     tier    the tool needed (0 hands, 1 Wooden Mallet, 2 Brass, 3 Silver, 4 Golden Baton)
     drop    the item it gives (recipes.js BT_ITEMS); use: tapping it in BUILD mode does something
     look    how it's drawn (game.js TILES) */
  const B = [
    {key: 'air'},
    {key: 'dirt', name: 'Dirt', solid: 1, mine: 'tap', tier: 0, drop: 'dirt'},
    {key: 'moss', name: 'Glow Moss', solid: 1, mine: 'tap', tier: 0, drop: 'dirt'},
    {key: 'sand', name: 'Sand', solid: 1, mine: 'tap', tier: 0, drop: 'sand'},
    {key: 'leaves', name: 'Leaves', solid: 0, mine: 'tap', tier: 0, drop: 'leaves'},
    {key: 'slate', name: 'Slate', solid: 1, mine: 'tap', tier: 1, drop: 'slate'},
    {key: 'bedrock', name: 'World Floor', solid: 1, mine: null},
    {key: 'water', name: 'Water', solid: 0, mine: null, fluid: 1},
    {key: 'reed', name: 'Reed Cane', solid: 0, mine: 'tap', tier: 0, drop: 'reed'},
    {key: 'cork', name: 'Cork Trunk', solid: 0, mine: 'tap', tier: 0, drop: 'cork'},
    {key: 'felt', name: 'Pad Felt', solid: 1, mine: 'tap', tier: 0, drop: 'felt'},
    {key: 'maple', name: 'Maple Trunk', solid: 0, mine: 'tap', tier: 0, drop: 'maple'},
    {key: 'rawhide', name: 'Rawhide Brush', solid: 0, mine: 'tap', tier: 0, drop: 'rawhide'},
    {key: 'toneOre', name: 'Tone Ore', solid: 1, mine: 'tone', tier: 1, drop: 'tone'},
    {key: 'brassOre', name: 'Brass Ore', solid: 1, mine: 'tone', tier: 1, drop: 'brass'},
    {key: 'scaleVein', name: 'Scale Vein', solid: 1, mine: 'scale', tier: 2, drop: 'gem'},
    {key: 'springVein', name: 'Spring Vein', solid: 1, mine: 'scale', tier: 2, drop: 'spring'},
    {key: 'sustain', name: 'Sustain Stone', solid: 1, mine: 'sustain', tier: 3, drop: 'hum'},
    {key: 'rhythmRock', name: 'Rhythm Rock', solid: 1, mine: 'rhythm', tier: 1, drop: 'rhythm'},
    {key: 'restCrystal', name: 'Rest Crystal', solid: 1, mine: 'rest', tier: 3, drop: 'rest'},
    {key: 'planks', name: 'Maple Planks', solid: 1, mine: 'tap', tier: 0, drop: 'planks'},
    {key: 'panel', name: 'Soundproof Panel', solid: 1, mine: 'tap', tier: 0, drop: 'panel'},
    {key: 'brick', name: 'Band Hall Brick', solid: 1, mine: 'tap', tier: 1, drop: 'brick'},
    {key: 'stage', name: 'Stage Floor', solid: 1, mine: 'tap', tier: 0, drop: 'stage'},
    {key: 'riser', name: 'Riser Steps', solid: 0, mine: 'tap', tier: 0, drop: 'riser', climb: 1},
    {key: 'door', name: 'Door', solid: 1, mine: 'tap', tier: 0, drop: 'door', door: 1, use: 'door'},
    {key: 'doorOpen', name: 'Door (open)', solid: 0, mine: 'tap', tier: 0, drop: 'door', door: 1, use: 'door'},
    {key: 'glass', name: 'Glass', solid: 1, mine: 'tap', tier: 0, drop: 'glass'},
    {key: 'lamp', name: 'Stage Lamp', solid: 0, mine: 'tap', tier: 0, drop: 'lamp', light: 1},
    {key: 'cot', name: 'Practice Cot', solid: 0, mine: 'tap', tier: 0, drop: 'cot', use: 'cot'},
    {key: 'locker', name: 'Band Locker', solid: 0, mine: 'tap', tier: 0, drop: 'locker', use: 'locker'},
    {key: 'stand', name: 'Music Stand', solid: 0, mine: 'tap', tier: 0, drop: 'stand'},
    {key: 'metronome', name: 'Metronome', solid: 0, mine: 'tap', tier: 0, drop: 'metronome'},
    {key: 'tuner', name: 'Tuner', solid: 0, mine: 'tap', tier: 0, drop: 'tuner'},
    {key: 'composer', name: 'Composer Block', solid: 1, mine: 'tap', tier: 0, drop: 'composer', use: 'composer'},
    {key: 'podium', name: "Conductor's Podium", solid: 0, mine: 'tap', tier: 0, drop: 'podium', use: 'podium'},
    {key: 'bench', name: "Luthier's Bench", solid: 0, mine: 'tap', tier: 0, drop: 'bench', use: 'bench'},
    {key: 'clay', name: 'Canyon Clay', solid: 1, mine: 'tap', tier: 0, drop: 'dirt'},
  ];
  B.forEach((b, i) => { b.id = i; b.solid = !!b.solid; b.name = b.name || b.key; });
  const ID = {}; B.forEach(b => { ID[b.key] = b.id; });

  /* ---------- a seeded random number generator (mulberry32) and value noise ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const smooth = t => t * t * (3 - 2 * t);
  function noise1(r, n = 512) {
    const v = Array.from({length: n}, r);
    return x => { const i = Math.floor(x), f = x - i, a = v[((i % n) + n) % n], b = v[(((i + 1) % n) + n) % n]; return a + (b - a) * smooth(f); };
  }
  function noise2(r, n = 128) {
    const v = Array.from({length: n * n}, r), at = (i, j) => v[(((j % n) + n) % n) * n + (((i % n) + n) % n)];
    return (x, y) => {
      const i = Math.floor(x), j = Math.floor(y), fx = smooth(x - i), fy = smooth(y - j);
      const a = at(i, j) + (at(i + 1, j) - at(i, j)) * fx, b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fx;
      return a + (b - a) * fy;
    };
  }

  /* ---------- THE GENERATOR ---------- */
  const biomeOf = (R, x) => R.biomes.find(b => x >= b.from && x < b.to) || R.biomes[R.biomes.length - 1];
  function generate(seed, R) {
    R = R || window.BT_RULES;
    const W = R.world.w, H = R.world.h, S = R.world.surface, r = rng(seed);
    const n1 = noise1(r), n2 = noise1(r), ridge = noise1(r), cave = noise2(r), cave2 = noise2(r);
    const b = new Uint8Array(W * H);
    const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = v; };
    const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? ID.bedrock : b[y * W + x];
    // the ground's height in each biome, blended across the borders
    const [marsh, brass, canyon] = R.biomes;
    const peakAt = brass.from + Math.round((brass.to - brass.from) * (.35 + .3 * r()));   // one tall peak always reaches the Treble Peaks
    const cutAt = canyon.from + Math.round((canyon.to - canyon.from) * (.4 + .2 * r()));  // the canyon's gorge
    const heightIn = (id, x) => {
      if (id === 'marsh') return S + 5 + (n1(x / 12) - .5) * 7;
      if (id === 'brass') {
        const d = Math.abs(x - peakAt), main = Math.max(0, 1 - d / 26);
        return S - 4 - 12 * ridge(x / 9) - (S - 4 - (R.world.peaksY - 12)) * smooth(main) * .75 - 8 * smooth(main);
      }
      const mesa = n2(x / 20) > .5 ? -6 : 0, gorge = Math.max(0, 1 - Math.abs(x - cutAt) / 7);
      return S - 2 + mesa + (n1(x / 6) - .5) * 1.5 + 14 * smooth(gorge);
    };
    const heights = [];
    for (let x = 0; x < W; x++) {
      const bi = biomeOf(R, x); let h = heightIn(bi.id, x);
      const idx = R.biomes.indexOf(bi), prev = R.biomes[idx - 1], next = R.biomes[idx + 1], blend = 8;
      if (prev && x - bi.from < blend) { const t = smooth((x - bi.from) / blend * .5 + .5); h = heightIn(prev.id, x) * (1 - t) + h * t; }
      if (next && bi.to - x <= blend) { const t = smooth((bi.to - x) / blend * .5 + .5); h = heightIn(next.id, x) * (1 - t) + h * t; }
      if (x < 3) h = Math.min(h, S + 4);
      heights.push(Math.max(6, Math.min(H - 20, Math.round(h))));
    }
    // columns: the top, dirt, then slate; the world floor at the bottom
    for (let x = 0; x < W; x++) {
      const h = heights[x], bi = biomeOf(R, x).id;
      for (let y = h; y < H; y++) {
        let v = ID.slate;
        if (y === h) v = bi === 'canyon' ? ID.clay : bi === 'brass' && h < R.world.peaksY + 6 ? ID.slate : ID.moss;
        else if (y < h + 4) v = bi === 'canyon' ? ID.clay : bi === 'brass' && h < R.world.peaksY + 6 ? ID.slate : ID.dirt;
        if (bi === 'marsh' && y === h && h >= R.world.sea - 1 && r() < .6) v = ID.sand;             // sandy banks by the pools
        set(x, y, v);
      }
      for (let y = H - 2; y < H; y++) set(x, y, ID.bedrock);
    }
    // caves (only below the first few rows of ground, never through the world floor)
    for (let y = 0; y < H - 2; y++) for (let x = 0; x < W; x++) {
      const h = heights[x]; if (y < h + 5) continue;
      const depth = (y - h) / (H - h), c = cave(x / 11, y / 7) * .7 + cave2(x / 5, y / 4) * .3;
      if (c > 1 - R.world.caves * (.7 + .3 * depth)) set(x, y, ID.air);
    }
    // water: the marsh's hollows fill up to the sea row
    for (let x = 0; x < W; x++) for (let y = R.world.sea; y < heights[x]; y++) if (get(x, y) === ID.air) set(x, y, ID.water);
    // ORES: veins of a few blocks in the slate, by biome and depth
    const vein = (x, y, v, size) => { for (let k = 0; k < size; k++) { if (get(x, y) === ID.slate) set(x, y, v); x += Math.round(r() * 2 - 1); y += Math.round(r() * 2 - 1); } };
    const oreFor = (x, y) => {
      const h = heights[x], bi = biomeOf(R, x).id, d = y - h, p = r();
      const deep = y >= R.world.deepY, peak = y < R.world.peaksY;
      if (deep) return p < .5 ? ID.sustain : p < .8 ? ID.restCrystal : bi === 'brass' ? ID.springVein : ID.scaleVein;
      if (peak) return p < .45 ? ID.sustain : p < .65 ? ID.restCrystal : ID.springVein;
      if (bi === 'canyon' && p < .35) return ID.rhythmRock;
      if (d > 14 && p < .55) return bi === 'brass' ? ID.springVein : ID.scaleVein;
      if (d > 30 && p < .75) return ID.sustain;
      return bi === 'brass' ? ID.brassOre : ID.toneOre;
    };
    const veins = Math.round(W * H / 55 * R.world.oreEvery);
    for (let k = 0; k < veins; k++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * (H - 3));
      if (get(x, y) !== ID.slate) continue;
      vein(x, y, oreFor(x, y), 2 + Math.floor(r() * 4));
    }
    // the SPAWN: in the Reed Marsh, on dry ground; Tone Ore close by and a little way down (chapter 1 needs 10)
    let sx = Math.round(marsh.from + (marsh.to - marsh.from) * .3);
    for (let k = 0; k < 30 && heights[sx] >= R.world.sea - 1; k++) sx++;
    const sy = heights[sx] - 1;
    for (let k = 0; k < 6; k++) {
      const x = sx - 14 + Math.floor(r() * 28), y = heights[Math.max(0, Math.min(W - 1, x))] + 5 + Math.floor(r() * 5);
      for (let j = 0; j < 4; j++) { const xx = x + j % 2, yy = y + (j >> 1); if (get(xx, yy) === ID.slate || get(xx, yy) === ID.dirt) set(xx, yy, ID.toneOre); }
    }
    // PLANTS AND TREES on the surface
    const tree = (x, trunk) => {
      const h = heights[x], tall = 4 + Math.floor(r() * 3);
      if (get(x, h - 1) !== ID.air) return;
      for (let k = 1; k <= tall; k++) set(x, h - k, trunk);
      const top = h - tall;
      for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > 3 || (dx === 0 && dy >= 0)) continue;
        if (get(x + dx, top + dy) === ID.air) set(x + dx, top + dy, ID.leaves);
      }
    };
    for (let x = 2; x < W - 2; x++) {
      const bi = biomeOf(R, x).id, h = heights[x], topV = get(x, h), p = r();
      if (Math.abs(x - sx) <= 1) continue;
      if (get(x, h - 1) !== ID.air) continue;
      if (bi === 'marsh') {
        if (topV === ID.sand || (h >= R.world.sea - 2 && p < .35)) { if (p < .55) set(x, h - 1, ID.reed); if (p < .3 && get(x, h - 2) === ID.air) set(x, h - 2, ID.reed); }
        else if (p < .07) tree(x, ID.cork);
        else if (p < .12) tree(x, ID.maple);
        else if (p < .2 && topV === ID.moss) set(x, h, ID.felt);
        else if (p < .26) set(x, h - 1, ID.reed);
      } else if (bi === 'brass') {
        if (p < .05 && h > R.world.peaksY + 6) tree(x, ID.maple);
      } else {
        if (p < .06) tree(x, ID.maple);
        else if (p < .16) set(x, h - 1, ID.rawhide);
        else if (p < .2) set(x, h, ID.rhythmRock);
      }
    }
    // a few trees always stand near the spawn (the first mallet needs Maple Planks and Cork)
    [[-6, ID.maple], [7, ID.cork], [12, ID.maple]].forEach(([dx, t]) => { const x = sx + dx; if (x > 1 && x < W - 2 && get(x, heights[x] - 1) === ID.air) tree(x, t); });
    return {v: 1, seed: seed >>> 0, w: W, h: H, b, meta: {}, bags: [], spawn: {x: sx, y: sy}, time: 20, nights: 0, survived: 0, player: null, cot: null, dirty: true};
  }

  /* ---------- SAVING: run-length encoded chunks of 16 columns (column by column), versioned ---------- */
  const CHUNK = 16, VERSION = 1;
  function encode(w) {
    const chunks = [];
    for (let c = 0; c < Math.ceil(w.w / CHUNK); c++) {
      const runs = []; let last = -1, n = 0;
      for (let x = c * CHUNK; x < Math.min(w.w, (c + 1) * CHUNK); x++) for (let y = 0; y < w.h; y++) {
        const v = w.b[y * w.w + x];
        if (v === last) n++; else { if (n) runs.push(last.toString(36) + '.' + n.toString(36)); last = v; n = 1; }
      }
      if (n) runs.push(last.toString(36) + '.' + n.toString(36));
      chunks.push(runs.join(','));
    }
    return {v: VERSION, seed: w.seed, w: w.w, h: w.h, chunks, meta: w.meta, bags: w.bags, spawn: w.spawn, time: w.time,
      nights: w.nights, survived: w.survived, player: w.player, cot: w.cot, stats: w.stats || {}};
  }
  function decode(o) {
    if (!o || typeof o !== 'object' || o.v !== VERSION || !Array.isArray(o.chunks) || !(o.w > 0) || !(o.h > 0)) return null;
    const b = new Uint8Array(o.w * o.h);
    for (let c = 0; c < o.chunks.length; c++) {
      let x = c * CHUNK, y = 0;
      const x1 = Math.min(o.w, (c + 1) * CHUNK);
      for (const run of String(o.chunks[c]).split(',').filter(Boolean)) {
        const [vs, ns] = run.split('.'), v = parseInt(vs, 36), n = parseInt(ns, 36);
        if (!(v >= 0 && v < B.length) || !(n > 0)) return null;
        for (let k = 0; k < n; k++) { if (x >= x1) return null; b[y * o.w + x] = v; y++; if (y >= o.h) { y = 0; x++; } }
      }
      if (x !== x1) return null;
    }
    return {v: VERSION, seed: o.seed >>> 0, w: o.w, h: o.h, b, meta: o.meta || {}, bags: o.bags || [], spawn: o.spawn || {x: 20, y: 30},
      time: +o.time || 0, nights: +o.nights || 0, survived: +o.survived || 0, player: o.player || null, cot: o.cot || null, stats: o.stats || {}};
  }

  /* ---------- queries ---------- */
  const at = (w, x, y) => (x < 0 || x >= w.w || y >= w.h) ? ID.bedrock : y < 0 ? ID.air : w.b[y * w.w + x];
  const put = (w, x, y, v) => { if (x >= 0 && y >= 0 && x < w.w && y < w.h) { w.b[y * w.w + x] = v; w.dirty = true; if (w.tops) w.tops[x] = -1; } };
  /** the first row from the top holding a solid block (cached per column; -1 = recount) */
  function top(w, x) {
    if (x < 0 || x >= w.w) return 0;
    if (!w.tops) w.tops = new Int16Array(w.w).fill(-1);
    if (w.tops[x] < 0) { let y = 0; while (y < w.h - 1 && !B[w.b[y * w.w + x]].solid) y++; w.tops[x] = y; }
    return w.tops[x];
  }
  function zone(w, x, y, R) {
    R = R || window.BT_RULES;
    const bi = biomeOf(R, Math.max(0, Math.min(w.w - 1, x)));
    const layer = y < R.world.peaksY ? 'peaks' : y >= R.world.deepY ? 'depths' : y <= top(w, x) + R.world.shallow ? 'surface' : 'middle';
    return {biome: bi.id, biomeName: bi.name, layer};
  }
  /** 0–1: the sky's light (sky = the sky's light now) fading below the ground, and every Stage Lamp's */
  function light(w, x, y, sky, lamps, R) {
    R = R || window.BT_RULES;
    const t = top(w, x), below = y - t;
    let l = below <= 0 ? sky : sky * Math.max(0, 1 - below / R.light.caveDepth);
    if (lamps) for (const L of lamps) { const d = Math.hypot(L.x - x, L.y - y); if (d < R.light.lampRadius) l = Math.max(l, 1 - (d / R.light.lampRadius) ** 2 * .6); }
    return Math.min(1, l);
  }
  /** the enclosed space around (x, y): walk every open tile (a door is a wall); null if it's open or too big */
  function room(w, x, y, R) {
    R = R || window.BT_RULES;
    const open = v => !B[v].solid && !B[v].door;
    if (!open(at(w, x, y))) return null;
    const seen = new Set([y * w.w + x]), q = [[x, y]], tiles = [], walls = new Set(), doors = new Set();
    while (q.length) {
      const [cx, cy] = q.pop(); tiles.push([cx, cy]);
      if (tiles.length > R.room.maxTiles) return null;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= w.w || ny < 0) return null;                  // reaches the edge of the world or the sky
        const k = ny * w.w + nx, v = at(w, nx, ny);
        if (open(v)) { if (!seen.has(k)) { seen.add(k); q.push([nx, ny]); } }
        else { walls.add(k); if (B[v].door) doors.add(k); }
      }
    }
    const xy = k => [k % w.w, Math.floor(k / w.w)];
    return {tiles, walls: [...walls].map(xy), doors: [...doors].map(xy)};
  }
  A.BlocktaveWorld = {BLOCKS: B, ID, rng, generate, encode, decode, at, put, top, zone, light, room, biomeOf, CHUNK, VERSION};
})(window.Arcade);
