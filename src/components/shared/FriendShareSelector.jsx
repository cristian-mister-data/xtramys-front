import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { getFriends } from '@/api/friendship';
import { getSharingDetails } from '@/api/sharedContent';

const sameId = (a, b) => String(a || '') === String(b || '');

export default function FriendShareSelector({ contentType, contentId, value, onChange, disabled, skipLoadFromDb }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [friends, setFriends] = useState([]);
  const selected = value || { sharedWithFriends: false, shareWithAll: true, sharingFriendIds: [] };

  useEffect(() => {
    getFriends().then(({ data }) => setFriends(data || [])).catch(() => setFriends([]));
  }, []);

  useEffect(() => {
    if (skipLoadFromDb || !contentId || !contentType) return;
    getSharingDetails(contentType, contentId).then(({ data }) => {
      onChange({
        sharedWithFriends: !!(data?.shareWithAll || data?.sharedWith?.length),
        shareWithAll: data?.shareWithAll !== false,
        sharingFriendIds: (data?.sharedWith || []).map(String),
      });
    }).catch(() => {});
  }, [contentId, contentType, skipLoadFromDb]);

  const set = (patch) => onChange({ ...selected, ...patch });
  const toggleFriend = (id) => {
    const current = selected.sharingFriendIds || [];
    set({
      sharingFriendIds: current.some((item) => sameId(item, id))
        ? current.filter((item) => !sameId(item, id))
        : [...current, id],
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="people-outline" size={20} color={theme?.colors?.primary || '#3b82f6'} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('friends.shareWithFriends')}</Text>
          <Text style={styles.desc}>{t('friends.shareWithFriendsDesc')}</Text>
        </View>
        <TouchableOpacity
          disabled={disabled}
          style={[styles.switch, selected.sharedWithFriends && styles.switchOn]}
          onPress={() => set({ sharedWithFriends: !selected.sharedWithFriends })}
          activeOpacity={0.85}
        >
          {!selected.sharedWithFriends && <View style={styles.switchKnob} />}
          <Text style={[styles.switchText, selected.sharedWithFriends && styles.switchTextOn]}>
            {selected.sharedWithFriends ? t('common.yes') : t('common.no')}
          </Text>
          {selected.sharedWithFriends && <View style={styles.switchKnob} />}
        </TouchableOpacity>
      </View>

      {selected.sharedWithFriends && (
        <View style={styles.body}>
          <View style={styles.segment}>
            <TouchableOpacity
              disabled={disabled}
              style={[styles.segmentBtn, selected.shareWithAll && styles.segmentBtnOn]}
              onPress={() => set({ shareWithAll: true })}
            >
              <Text style={[styles.segmentText, selected.shareWithAll && styles.segmentTextOn]}>{t('friends.shareModeAll')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={disabled}
              style={[styles.segmentBtn, !selected.shareWithAll && styles.segmentBtnOn]}
              onPress={() => set({ shareWithAll: false })}
            >
              <Text style={[styles.segmentText, !selected.shareWithAll && styles.segmentTextOn]}>{t('friends.shareModeSelected')}</Text>
            </TouchableOpacity>
          </View>

          {!selected.shareWithAll && (
            <View style={styles.friends}>
              {friends.length === 0 ? (
                <Text style={styles.empty}>{t('friends.noFriends')}</Text>
              ) : friends.map((friend) => {
                const checked = (selected.sharingFriendIds || []).some((id) => sameId(id, friend._id));
                const name = [friend.nombre, friend.apellido].filter(Boolean).join(' ') || friend.correo;
                return (
                  <TouchableOpacity key={friend._id} disabled={disabled} style={styles.friend} onPress={() => toggleFriend(friend._id)}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{String(name || '?').slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={styles.friendMeta}>
                      <Text style={styles.friendName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.friendEmail} numberOfLines={1}>{friend.correo}</Text>
                    </View>
                    <View style={[styles.check, checked && styles.checkOn]}>
                      {checked && <Ionicons name="checkmark" size={15} color={theme?.colors?.onPrimary || '#fff'} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme?.colors?.border || '#e2e8f0',
      backgroundColor: theme?.colors?.surface || '#fff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme?.colors?.primarySoft || '#dbeafe',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: { fontSize: 15, fontWeight: '700', color: theme?.colors?.text || '#111827' },
    desc: { marginTop: 2, fontSize: 12, color: theme?.colors?.textMuted || '#64748b' },
    switch: {
      minWidth: 74,
      height: 34,
      borderRadius: 999,
      backgroundColor: theme?.colors?.backgroundAlt || '#f1f5f9',
      borderWidth: 1,
      borderColor: theme?.colors?.border || '#cbd5e1',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      gap: 6,
    },
    switchOn: {
      backgroundColor: theme?.colors?.primary || '#00b4d8',
      borderColor: theme?.colors?.primary || '#00b4d8',
    },
    switchKnob: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#fff',
    },
    switchText: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '800',
      color: theme?.colors?.textMuted || '#64748b',
    },
    switchTextOn: {
      color: theme?.colors?.onPrimary || '#fff',
    },
    body: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme?.colors?.border || '#e2e8f0',
    },
    segment: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: 8,
      backgroundColor: theme?.colors?.backgroundAlt || '#f1f5f9',
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      minHeight: 36,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    segmentBtnOn: {
      backgroundColor: theme?.colors?.surface || '#fff',
      borderWidth: 1,
      borderColor: theme?.colors?.border || '#e2e8f0',
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme?.colors?.textMuted || '#64748b',
      textAlign: 'center',
    },
    segmentTextOn: {
      color: theme?.colors?.text || '#111827',
    },
    empty: {
      marginTop: 12,
      color: theme?.colors?.textMuted || '#64748b',
      fontSize: 13,
      textAlign: 'center',
    },
    friends: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 12,
    },
    friend: {
      minWidth: 220,
      flexGrow: 1,
      flexBasis: 220,
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderRadius: 8,
      borderColor: theme?.colors?.border || '#e2e8f0',
      backgroundColor: theme?.colors?.surfaceAlt || theme?.colors?.surface || '#fff',
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme?.colors?.primarySoft || '#dbeafe',
    },
    avatarText: {
      color: theme?.colors?.primary || '#2563eb',
      fontWeight: '800',
    },
    friendMeta: {
      flex: 1,
      minWidth: 0,
    },
    friendName: { color: theme?.colors?.text || '#111827', fontSize: 14 },
    friendEmail: { color: theme?.colors?.textMuted || '#64748b', fontSize: 12, marginTop: 2 },
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme?.colors?.border || '#cbd5e1',
    },
    checkOn: { backgroundColor: theme?.colors?.primary || '#00b4d8', borderColor: theme?.colors?.primary || '#00b4d8' },
  });
}
