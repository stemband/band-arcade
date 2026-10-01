/* BLOCKTAVE: THE WORLD (Arcade.BlocktaveWorld): the blocks, the seeded generator, the saved format, light and rooms.
   Testable on its own (no drawing, no DOM).
     BW.BLOCKS                 every block: {id (number, saved: never renumber), key, name, solid, mine, tier, drop, …}
     BW.starter(world, orig)   the STARTER CHECK (chapter 1's trees and Tone Ore near the spawn): {maple, cork, toneOre, ok}
     BW.repair(world)          the one-time repair of an older saved world (plants what the starter check misses)
     BW.generate(seed, R)      a new world {seed, w, h, b (Uint8Array, row-major), meta, bags, spawn, time, nights, …}
     BW.encode(world) / BW.decode(obj)   the saved form: {v, seed, w, h, chunks: [RLE per 16 columns], drops, …} (versioned: v 2; v 1 = no drops)
     BW.zone(world, x, y)      {biome, layer: 'peaks'|'surface'|'middle'|'depths'} (Treble Peaks / Bass Depths)
     BW.light(world, x, y, sky, lamps)   0–1   ·   BW.lightMap(world, x0, y0, cols, rows, sky, lamps)   a rectangle's light
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
  // GEN = the generator's version, saved in each world (old saves = 1): the repair rebuilds a world's ORIGINAL with the
  // same version, so it can tell natural tiles from ones the player placed or dug
  const GEN = 2;
  function generate(seed, R, gen) {
    R = R || window.BT_RULES; gen = gen || GEN;
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
    // (the dry column nearest 30 % into the marsh: a wet marsh can flood a long way)
    const aim = Math.round(marsh.from + (marsh.to - marsh.from) * .3);
    let sx = aim;
    // (gen 2: the dry column nearest that with at least half the starter range's columns dry around it, room for its trees)
    const dry = x => heights[x] <= R.world.sea - 1, rg = R.starterRange;
    const roomy = x => { let n = 0; for (let d = -rg; d <= rg; d++) if (x + d >= 0 && x + d < W && dry(x + d)) n++; return n >= rg; };
    for (const pass of gen >= 2 ? [roomy, () => true] : [() => true]) {
      let found = false;
      for (let k = 0; k < W; k++) { const x = aim + (k % 2 ? -1 : 1) * Math.ceil(k / 2); if (x > 14 && x < W - 15 && dry(x) && pass(x)) { sx = x; found = true; break; } }
      if (found) break;
    }
    const sy = heights[sx] - 1;
    for (let k = 0; k < 6; k++) {
      const x = sx - 14 + Math.floor(r() * 28), y = heights[Math.max(0, Math.min(W - 1, x))] + (gen >= 2 ? 3 : 5) + Math.floor(r() * 5);
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
        else if (p < (gen >= 2 ? R.world.corkChance : .07)) tree(x, ID.cork);
        else if (p < (gen >= 2 ? R.world.corkChance + R.world.mapleChance : .12)) tree(x, ID.maple);
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
    // (each one looks outward from its spot for open ground; a tree needs air where its trunk goes)
    const hasTree = (x, t) => get(x, heights[x] - 1) === t;
    [[-6, ID.maple], [7, ID.cork], [12, ID.maple], [-11, ID.cork]].forEach(([dx, t]) => {
      for (let k = 0; k < 24; k++) {
        const x = sx + dx + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * Math.sign(dx);
        if (x < 3 || x > W - 4 || Math.abs(x - sx) < 3) continue;
        if (get(x - 1, heights[x] - 1) === t || get(x + 1, heights[x] - 1) === t) continue;
        if (get(x, heights[x] - 1) === ID.reed) set(x, heights[x] - 1, ID.air);
        if (get(x, heights[x] - 1) === ID.air && heights[x] <= R.world.sea) { tree(x, t); if (hasTree(x, t)) break; }
      }
    });
    const world = {v: 1, gen, seed: seed >>> 0, w: W, h: H, b, meta: {}, bags: [], spawn: {x: sx, y: sy}, time: 20, nights: 0, survived: 0,
      player: null, cot: null, lockers: {}, drops: [], repaired: REPAIR, dirty: true};
    if (gen >= 2) ensureStarter(world, world, R);             // THE STARTER GUARANTEE (below)
    delete world.tops;
    return world;
  }

  /* ---------- THE STARTER GUARANTEE: every world has chapter 1's materials near its spawn ----------
     Within R.starterRange columns of the spawn, on dry ground (not under water): R.starter.maple Maple trees and
     R.starter.cork Cork trees, and R.starter.toneOre Tone Ore no more than R.starter.oreDepth rows below the ground.
     `orig` = the world as generated (its ground); in a fresh world it's the world itself. */
  function starter(w, orig, R) {
    R = R || window.BT_RULES;
    const S = R.starter, sx = w.spawn.x, rg = R.starterRange, out = {maple: 0, cork: 0, toneOre: 0};
    for (let x = Math.max(1, sx - rg); x <= Math.min(w.w - 2, sx + rg); x++) {
      const g = top(orig, x);
      const trunk = at(w, x, g - 1);
      if (g <= R.world.sea && B[at(w, x, g)].solid) {
        if (trunk === ID.maple) out.maple++;
        if (trunk === ID.cork) out.cork++;
      }
      for (let y = g + 1; y <= g + S.oreDepth; y++) if (at(w, x, y) === ID.toneOre) out.toneOre++;
    }
    out.ok = out.maple >= S.maple && out.cork >= S.cork && out.toneOre >= S.toneOre;
    return out;
  }
  /** plants the missing trees and ore; `ok(x, y)` = this tile may change (the repair: only untouched natural tiles).
      Returns how many trees and ore blocks it added. */
  function ensureStarter(w, orig, R, ok) {
    R = R || window.BT_RULES; ok = ok || (() => true);
    const have = starter(w, orig, R), S = R.starter, sx = w.spawn.x, rg = R.starterRange, r = rng((w.seed ^ 0x5eed) >>> 0);
    const added = {trees: 0, ore: 0};
    const set = (x, y, v) => { w.b[y * w.w + x] = v; if (w.tops) w.tops[x] = -1; };
    const cols = [];
    for (let k = 2; k <= rg; k++) cols.push(sx + k, sx - k);          // (never on the spawn's own column or beside it)
    const plant = (x, t) => {
      if (x < 2 || x > w.w - 3) return false;
      const g = top(orig, x), tall = 4 + Math.floor(r() * 3);
      if (g > R.world.sea || !B[at(w, x, g)].solid || !ok(x, g)) return false;               // dry, untouched ground
      if ([-1, 1].some(d => at(w, x + d, top(orig, x + d) - 1) === t)) return false;   // not right beside one of its kind
      for (let k = 1; k <= tall; k++) { const v = at(w, x, g - k); if (!(v === ID.air || v === ID.reed || v === ID.leaves) || !ok(x, g - k)) return false; }
      for (let k = 1; k <= tall; k++) set(x, g - k, t);
      const topY = g - tall;
      for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > 3 || (dx === 0 && dy >= 0)) continue;
        const xx = x + dx, yy = topY + dy;
        if (xx >= 0 && yy >= 0 && xx < w.w && at(w, xx, yy) === ID.air && ok(xx, yy)) set(xx, yy, ID.leaves);
      }
      return true;
    };
    [['maple', ID.maple], ['cork', ID.cork]].forEach(([k, t]) => {
      let need = S[k] - have[k];
      for (const x of cols) { if (need <= 0) break; if (plant(x, t)) { need--; added.trees++; } }
    });
    let need = S.toneOre - have.toneOre;
    for (let tries = 0; need > 0 && tries < 400; tries++) {
      const x = sx - rg + Math.floor(r() * (rg * 2 + 1)), g = top(orig, x), y = g + 3 + Math.floor(r() * (S.oreDepth - 3));
      for (let j = 0; j < 4 && need > 0; j++) {
        const xx = x + (j % 2), yy = y + (j >> 1), v = at(w, xx, yy);
        if (Math.abs(xx - sx) > rg || yy > top(orig, xx) + S.oreDepth || yy <= top(orig, xx)) continue;
        if ((v === ID.slate || v === ID.dirt) && ok(xx, yy)) { set(xx, yy, ID.toneOre); need--; added.ore++; }
      }
    }
    w.dirty = true;
    return added;
  }
  /* THE ONE-TIME REPAIR of a saved world (w.repaired < REPAIR): if the starter check fails, the missing trees and ore
     grow near the spawn, only into tiles still as the seed made them (compared with the regenerated original).
     Returns {trees, ore} added, or null when nothing was needed. */
  const REPAIR = 1;
  function repair(w, R) {
    R = R || window.BT_RULES;
    if ((w.repaired || 0) >= REPAIR) return null;
    w.repaired = REPAIR; w.dirty = true;
    if (w.w !== R.world.w || w.h !== R.world.h || !w.spawn) return null;
    const orig = generate(w.seed, R, w.gen || 1);
    if (starter(w, orig, R).ok) return null;
    const added = ensureStarter(w, orig, R, (x, y) => w.b[y * w.w + x] === orig.b[y * w.w + x]);
    return added.trees || added.ore ? added : null;
  }

  /* ---------- SAVING: run-length encoded chunks of 16 columns (column by column), versioned ---------- */
  // VERSION 2 added `drops` (items lying in the world: [{x, y, item, n, t (seconds spent off screen)}]); a version-1 save
  // loads with none
  const CHUNK = 16, VERSION = 2;
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
    return {v: VERSION, gen: w.gen || 1, repaired: w.repaired || 0, seed: w.seed, w: w.w, h: w.h, chunks, meta: w.meta, bags: w.bags,
      spawn: w.spawn, time: w.time, nights: w.nights, survived: w.survived, player: w.player, cot: w.cot, lockers: w.lockers || {},
      drops: (w.drops || []).map(d => ({x: +d.x.toFixed(2), y: +d.y.toFixed(2), item: d.item, n: d.n, t: Math.round(d.t || 0)})), stats: w.stats || {}};
  }
  function decode(o) {
    if (!o || typeof o !== 'object' || !(o.v === 1 || o.v === VERSION) || !Array.isArray(o.chunks) || !(o.w > 0) || !(o.h > 0)) return null;
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
    return {v: VERSION, gen: +o.gen || 1, repaired: +o.repaired || 0, seed: o.seed >>> 0, w: o.w, h: o.h, b, meta: o.meta || {}, bags: o.bags || [],
      spawn: o.spawn || {x: 20, y: 30}, time: +o.time || 0, nights: +o.nights || 0, survived: +o.survived || 0, player: o.player || null,
      cot: o.cot || null, lockers: o.lockers || {}, stats: o.stats || {},
      drops: Array.isArray(o.drops) ? o.drops.filter(d => d && isFinite(d.x) && isFinite(d.y) && typeof d.item === 'string' && d.n > 0).map(d => ({x: +d.x, y: +d.y, item: d.item, n: +d.n, t: +d.t || 0})) : []};
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
  /** THE LIGHT of a rectangle of tiles (0–1 each; rules.js light):
      · the SKY's light (sky = the sky's light now) on every tile open to the sky, fading caveDepth rows into the ground;
      · a SHAFT (an open column with solid tiles on both sides) lets it down shaftRows rows, fading: a mine shaft is lit by day;
      · light spreads from lit open tiles into the open tiles beside them (× spread a tile, shaftRows tiles at most), so a
        cave's mouth is lit and the rock around an opening shows;
      · nothing underground is ever darker than caveMin (the cave's shape always shows faintly);
      · every Stage Lamp lights lampRadius tiles.
      (The player's own glow is drawn by game.js only: it never changes where creatures may appear.)
      Returns {x0, y0, cols, rows, v: Float32Array (row by row)}. */
  function lightMap(w, x0, y0, cols, rows, sky, lamps, R) {
    R = R || window.BT_RULES;
    const L = R.light, M = L.shaftRows + 1, X0 = x0 - M, Y0 = y0 - M, C = cols + 2 * M, H = rows + 2 * M;
    const v = new Float32Array(C * H), open = new Uint8Array(C * H);
    const solidAt = (x, y) => x < 0 || x >= w.w || (y >= 0 && y < w.h && B[w.b[y * w.w + x]].solid);
    for (let i = 0; i < C; i++) {
      const x = X0 + i;
      if (x < 0 || x >= w.w) continue;
      const t = top(w, x);
      let walled = 0;                                                         // rows of this open column with rock on both sides
      for (let y = t > Y0 ? Math.min(0, Y0) : Y0; y < Y0 + H; y++) {
        let l;
        if (y < 0) l = sky;                                                   // above the world: the open sky
        else if (y < t) {                                                     // open to the sky (a shaft fades after shaftRows)
          if (y > 0 && solidAt(x - 1, y) && solidAt(x + 1, y)) walled++;
          l = walled ? sky * Math.max(0, 1 - walled / (L.shaftRows + 1)) : sky;
        } else l = sky * Math.max(0, 1 - (y - t) / L.caveDepth);              // into the ground
        if (y < Y0) continue;
        const k = (y - Y0) * C + i;
        v[k] = l;
        open[k] = y < 0 ? 1 : y >= w.h ? 0 : !B[w.b[y * w.w + x]].solid ? 1 : 0;
      }
    }
    // the spread: shaftRows passes, each lit open tile lighting the open tiles beside it (× spread)
    for (let pass = 0; pass < L.shaftRows; pass++) {
      for (let j = 0; j < H; j++) for (let i = 0; i < C; i++) {
        const k = j * C + i; if (!open[k]) continue;
        const n = Math.max(i > 0 ? v[k - 1] : 0, i < C - 1 ? v[k + 1] : 0, j > 0 ? v[k - C] : 0, j < H - 1 ? v[k + C] : 0) * L.spread;
        if (n > v[k]) v[k] = n;
      }
    }
    // the rock beside lit open tiles shows (its face is lit), then the floor and the lamps
    const out = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = (j + M) * C + (i + M);
      let l = v[k];
      if (!open[k]) l = Math.max(l, Math.max(v[k - 1] * open[k - 1], v[k + 1] * open[k + 1], v[k - C] * open[k - C], v[k + C] * open[k + C]) * L.spread);
      l = Math.max(l, L.caveMin);
      const x = x0 + i, y = y0 + j;
      if (lamps) for (const Lp of lamps) { const d = Math.hypot(Lp.x - x, Lp.y - y); if (d < L.lampRadius) l = Math.max(l, 1 - (d / L.lampRadius) ** 2 * .6); }
      out[j * cols + i] = Math.min(1, l);
    }
    return {x0, y0, cols, rows, v: out};
  }
  /** 0–1: one tile's light (lightMap of that one tile) */
  function light(w, x, y, sky, lamps, R) { return lightMap(w, x, y, 1, 1, sky, lamps, R).v[0]; }
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
  A.BlocktaveWorld = {BLOCKS: B, ID, rng, generate, starter, ensureStarter, repair, GEN, REPAIR, encode, decode, at, put, top, zone, light, lightMap, room, biomeOf, CHUNK, VERSION};
})(window.Arcade);
