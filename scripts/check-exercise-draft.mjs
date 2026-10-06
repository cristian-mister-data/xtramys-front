import assert from 'node:assert/strict';
import { normalizeFriendSharing } from '../src/utils/friendSharing.js';

const invalidDraft = { sharedWithFriends: true, shareWithAll: false, sharingFriendIds: {} };
const restored = normalizeFriendSharing(JSON.parse(JSON.stringify(invalidDraft)));
assert.equal(restored.sharingFriendIds.some((id) => id === 'friend'), false);
assert.deepEqual(restored, { sharedWithFriends: true, shareWithAll: false, sharingFriendIds: [] });
assert.deepEqual(normalizeFriendSharing(null), { sharedWithFriends: false, shareWithAll: true, sharingFriendIds: [] });
const valid = { sharedWithFriends: true, shareWithAll: false, sharingFriendIds: ['friend'] };
assert.deepEqual(normalizeFriendSharing(valid), valid);
console.log('exercise draft sharing recovery: ok');
