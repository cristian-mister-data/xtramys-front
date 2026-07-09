import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from '@/platform/capacitor';
import { getNotifications } from '@/api/notification';
import i18n from '@/i18n';

// Local storage key to keep track of already notified notification IDs
const NOTIFIED_IDS_KEY = 'xtramys:notified-notification-ids';

function getMessageForNotification(type, data) {
  const d = data || {};
  if (type === 'friend_request_received') return i18n.t('notifications.friendRequestReceived', { name: d.fromUserName });
  if (type === 'friend_request_accepted') return i18n.t('notifications.friendRequestAccepted', { name: d.fromUserName });
  if (type === 'friend_request_rejected') return i18n.t('notifications.friendRequestRejected', { name: d.fromUserName });
  if (d.contentType === 'exercise') return i18n.t('notifications.contentSharedExercise', { name: d.fromUserName, contentName: d.contentName });
  if (d.contentType === 'setPiece') return i18n.t('notifications.contentSharedSetPiece', { name: d.fromUserName, contentName: d.contentName });
  return i18n.t('notifications.contentSharedStrategy', { name: d.fromUserName, contentName: d.contentName });
}

export function useLocalNotifications() {
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (!isNative) return;
    if (initialized.current) return;
    initialized.current = true;

    const setupNotifications = async () => {
      try {
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== 'granted') {
          console.log('Local notifications permission not granted');
          return;
        }

        // Create high importance notification channel for Android heads-up banners
        await LocalNotifications.createChannel({
          id: 'xtramys-notifications',
          name: 'Xtramys Notifications',
          description: 'Xtramys application notifications',
          importance: 5, // High/Urgent importance for heads-up banners
          visibility: 1, // Public
          vibration: true,
          sound: 'default'
        });

        // Action performed (notification clicked) listener
        await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          const extra = action.notification.extra;
          if (extra && extra.actionUrl) {
            navigate(extra.actionUrl);
          } else {
            navigate('/notifications');
          }
        });
      } catch (err) {
        console.error('Error setting up local notifications:', err);
      }
    };

    setupNotifications();
  }, [navigate]);

  useEffect(() => {
    if (!isNative) return;

    let notifiedIds = [];
    try {
      const stored = localStorage.getItem(NOTIFIED_IDS_KEY);
      if (stored) notifiedIds = JSON.parse(stored);
    } catch (_) {}

    let isFirstRun = notifiedIds.length === 0;

    const checkNewNotifications = async () => {
      try {
        const { data } = await getNotifications();
        if (!data || !Array.isArray(data)) return;

        const unread = data.filter((n) => !n.read);
        if (unread.length === 0) return;

        let updatedNotifiedIds = [...notifiedIds];
        let hasNew = false;

        for (const n of unread) {
          if (!notifiedIds.includes(n._id)) {
            updatedNotifiedIds.push(n._id);
            hasNew = true;

            // If it is the first run we just populate the cache to avoid spamming historical unreads
            if (!isFirstRun) {
              const body = getMessageForNotification(n.type, n.data);
              await LocalNotifications.schedule({
                notifications: [
                  {
                    title: i18n.t('notifications.title', 'Notificaciones'),
                    body,
                    id: Math.floor(Math.random() * 1000000),
                    extra: {
                      actionUrl: n.data?.actionUrl,
                    },
                    channelId: 'xtramys-notifications',
                    sound: 'default',
                  },
                ],
              });
            }
          }
        }

        if (isFirstRun) {
          isFirstRun = false;
        }

        if (hasNew) {
          notifiedIds = updatedNotifiedIds;
          localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(notifiedIds));
        }
      } catch (err) {
        console.error('Failed to check notifications:', err);
      }
    };

    // Run first check after 5 seconds
    const initialTimeout = setTimeout(checkNewNotifications, 5000);

    // Poll every 45 seconds (balance battery consumption vs real-time alerts)
    const intervalId = setInterval(checkNewNotifications, 45000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, []);
}
