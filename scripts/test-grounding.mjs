// ponytail: tiny self-check for lib/ai/grounding.ts. Run with `node scripts/test-grounding.mjs`.
import assert from 'node:assert/strict';
import {
  collectAllowedNumbers,
  filterGroundedBullets,
  stripUngroundedSentences,
  isGrounded,
} from '../lib/ai/grounding.ts';

const allowed = collectAllowedNumbers({
  totals: { NON_CARGO: 475, CGO: 580 },
  data: [{ label: 'Open', value: 120 }, { label: 'Closed', value: 935 }],
});

assert.ok(allowed.has(475), '475 must be allowed');
assert.ok(allowed.has(120), '120 must be allowed');

assert.equal(isGrounded(475, allowed), true);
assert.equal(isGrounded(999, allowed), false);
assert.equal(isGrounded(12.5, allowed), true, 'percent-shaped floats pass');

const kept = stripUngroundedSentences(
  'Ada 475 laporan non-cargo. Ada 999 laporan fiktif.',
  allowed,
);
assert.equal(kept.includes('999'), false, 'ungrounded sentence stripped');
assert.equal(kept.includes('475'), true, 'grounded sentence kept');

const bullets = filterGroundedBullets(
  ['Top kategori: 475 kasus', 'Mengarang: 12345 insiden', 'No-number bullet'],
  allowed,
);
assert.deepEqual(bullets, ['Top kategori: 475 kasus', 'No-number bullet']);

console.log('ok — grounding self-check passed');
