// node tests/hadith-ref.test.cjs
const assert = require('node:assert/strict');
const R = require('../hadith-ref.js');
assert.equal(R.slugFor('Sahih al-Bukhari'), 'bukhari');
assert.equal(R.slugFor('Sahih Muslim'), 'muslim');
assert.equal(R.slugFor("Jami' at-Tirmidhi"), 'tirmidhi');
assert.equal(R.permalink('Sahih al-Bukhari', 1, 7), '/hadith.html?ref=bukhari:1');
assert.equal(R.permalink('Sahih al-Bukhari', 1, 7, true), '/hadith.html?ref=bukhari:1&id=7');
assert.equal(R.permalink('Sahih al-Bukhari', null, 7), '/hadith.html?id=7');
assert.equal(R.prettyPath('bukhari', 1), '/hadith/bukhari:1');
for (const s of ['bukhari:1', 'bukhari/1', 'Bukhari 1']) { const p = R.parse(s); assert.equal(p && p.slug, 'bukhari', s); assert.equal(String(p.number), '1', s); }
assert.equal(R.parse('nonsense'), null);
console.log('hadith-ref: all tests pass');
