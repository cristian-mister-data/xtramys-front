export function normalizeFriendSharing(value) {
  return {
    sharedWithFriends: value?.sharedWithFriends === true,
    shareWithAll: value?.shareWithAll !== false,
    sharingFriendIds: Array.isArray(value?.sharingFriendIds) ? value.sharingFriendIds : [],
  };
}
