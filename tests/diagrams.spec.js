/* THE FINGERING DIAGRAMS (shared/diagrams.js): the clarinet (and bass clarinet) and sax diagrams have their LEFT
   pinky keys ABOVE the body (between the throat / palm keys and the side keys, over the gap between fingers 3 and 4)
   and the right pinky keys below. No key or caption overlaps another, everything is inside the picture, and a hint
   still lights the right keys. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const GROUPS = {
  clarinet: {left: ['LF#', 'LE', 'LF'], right: ['RAb', 'RE', 'RF'], between: [['G#', 'A'], ['SEb', 'SBb']]},
  sax: {left: ['G#', 'LC#', 'LB', 'LBb'], right: ['REb', 'RC'], between: [['pD', 'pEb', 'pF', 'fF'], ['SE', 'SC', 'SBb']]},
};

test('clarinet and sax diagrams: the left pinky keys above the body, nothing overlapping, hints on the right keys', async ({page}) => {
  const watch = await prepare(page, {store: device('clarinet')});
  await page.goto('button-masher/index.html?demo&nostart');
  for (const [id, G] of Object.entries(GROUPS)) {
    const r = await page.evaluate(([id, G]) => {
      const box = document.createElement('div'); box.style.cssText = 'position:absolute;left:0;top:0;width:900px';
      box.innerHTML = Arcade.Masher.diagramSVG(id, {interactive: true}); document.body.appendChild(box);
      const svg = box.querySelector('svg'), vb = svg.viewBox.baseVal;
      const key = k => svg.querySelector(`.key[data-k="${CSS.escape(k)}"] .k-base`).getBBox();
      const body = svg.querySelector('.dg-body').getBBox();
      const holes = ['3', '4'].map(k => key(k));
      const left = G.left.map(key), right = G.right.map(key);
      const lx = Math.min(...left.map(b => b.x)), rx = Math.max(...left.map(b => b.x + b.width));
      const between = G.between.map(g => g.map(key));
      // visible things: every key and every caption (not a key's own label)
      const items = [...svg.querySelectorAll('.key')].map(k => ({n: k.dataset.k, b: k.querySelector('.k-base').getBBox()}))
        .concat([...svg.querySelectorAll('.dg-draw text, svg > text')].map(t => ({n: t.textContent, b: t.getBBox()})));
      const hit = (a, c) => a.x < c.x + c.width && c.x < a.x + a.width && a.y < c.y + c.height && c.y < a.y + a.height;
      const overlaps = [];
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (hit(items[i].b, items[j].b)) overlaps.push(items[i].n + ' × ' + items[j].n);
      const outside = items.filter(x => x.b.x < vb.x || x.b.y < vb.y || x.b.x + x.b.width > vb.x + vb.width || x.b.y + x.b.height > vb.y + vb.height).map(x => x.n);
      const label = [...svg.querySelectorAll('.dg-draw text')].find(t => t.textContent === 'left pinky').getBBox();
      Arcade.Masher.setState(svg, {}, {hint: G.left});
      const lit = [...svg.querySelectorAll('.key.hint')].map(k => k.dataset.k);
      box.remove();
      return {
        leftAbove: left.every(b => b.y + b.height < body.y), rightBelow: right.every(b => b.y > body.y + body.height),
        centered: Math.abs((lx + rx) / 2 - (holes[0].x + holes[0].width / 2 + holes[1].x + holes[1].width / 2) / 2),
        betweenGroups: Math.max(...between[0].map(b => b.x + b.width)) < lx && Math.min(...between[1].map(b => b.x)) > rx,
        labelAbove: label.y + label.height <= Math.min(...left.map(b => b.y)) && label.x < rx && label.x + label.width > lx,
        overlaps, outside, lit,
      };
    }, [id, G]);
    expect(r.leftAbove, id).toBe(true);
    expect(r.rightBelow, id).toBe(true);
    expect(r.centered, id).toBeLessThan(6);
    expect(r.betweenGroups, id).toBe(true);
    expect(r.labelAbove, id).toBe(true);
    expect(r.overlaps, id).toEqual([]);
    expect(r.outside, id).toEqual([]);
    expect(r.lit.sort(), id).toEqual([...G.left].sort());
  }
  watch.check();
});
