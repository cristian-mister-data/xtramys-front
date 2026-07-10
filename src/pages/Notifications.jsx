import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdDelete, MdDone, MdDoneAll, MdNotifications, MdOpenInNew } from 'react-icons/md';
import { deleteAllNotifications, deleteNotification, getNotifications, markAllAsRead, markAsRead, notifyNotificationsChanged } from '@/api/notification';
import { acceptFriendRequest, rejectFriendRequest } from '@/api/friendship';
import { loadUser } from '@/auth/storage';
import { confirmAction } from '@/ui/confirm';
import RNWebPage from './_RNWebPage';

const Page = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 20px clamp(12px, 3vw, 28px) 32px;
  display: grid;
  gap: 18px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
`;
const TopGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 620px) { grid-template-columns: 1fr; }
`;
const Stat = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
`;
const StatLabel = styled.div`color: ${({ theme }) => theme.colors.textMuted}; font-size: 13px; font-weight: 800;`;
const StatValue = styled.div`color: ${({ theme }) => theme.colors.text}; font-size: 26px; font-weight: 900; line-height: 1;`;
const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;
const Segment = styled.div`
  display: inline-flex;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  @media (max-width: 620px) { width: 100%; }
`;
const Button = styled.button`
  border: 1px solid ${({ $danger, theme }) => ($danger ? 'rgba(239,68,68,.35)' : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 10px 12px;
  background: ${({ $primary, $danger, theme }) => ($primary ? theme.colors.primary : $danger ? 'rgba(239,68,68,.08)' : theme.colors.surface)};
  color: ${({ $primary, $danger, theme }) => ($primary ? theme.colors.onPrimary : $danger ? '#ef4444' : theme.colors.text)};
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
  min-height: 40px;
  white-space: nowrap;
`;
const SegmentButton = styled(Button)`
  flex: 1;
  border-color: transparent;
  background: ${({ $active, theme }) => ($active ? theme.colors.primarySoft : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
`;
const BulkActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  @media (max-width: 620px) { width: 100%; > button { flex: 1; } }
`;
const List = styled.div`display: grid; gap: 12px;`;
const Card = styled.article`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  padding: clamp(14px, 2vw, 18px);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ $unread, theme }) => ($unread ? theme.colors.primary : theme.colors.border)};
  border-left: 4px solid ${({ $unread, theme }) => ($unread ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadows?.sm || 'none'};
  @media (max-width: 760px) { grid-template-columns: 48px minmax(0, 1fr); }
`;
const IconBox = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
`;
const BodyButton = styled.button`
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;
`;
const Message = styled.div`font-weight: 850; line-height: 1.38; font-size: 15px;`;
const Meta = styled.div`margin-top: 6px; color: ${({ theme }) => theme.colors.textMuted}; font-size: 13px;`;
const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 11px;
  font-weight: 900;
`;
const CardActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  @media (max-width: 760px) { grid-column: 1 / -1; justify-content: stretch; > button { flex: 1; } }
`;
const Empty = styled.div`
  padding: 42px 16px;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;

function messageFor(t, n) {
  const d = n.data || {};
  if (n.type === 'friend_request_received') return t('notifications.friendRequestReceived', { name: d.fromUserName });
  if (n.type === 'friend_request_accepted') return t('notifications.friendRequestAccepted', { name: d.fromUserName });
  if (n.type === 'friend_request_rejected') return t('notifications.friendRequestRejected', { name: d.fromUserName });
  if (d.contentType === 'exercise') return t('notifications.contentSharedExercise', { name: d.fromUserName, contentName: d.contentName });
  if (d.contentType === 'setPiece') return t('notifications.contentSharedSetPiece', { name: d.fromUserName, contentName: d.contentName });
  return t('notifications.contentSharedStrategy', { name: d.fromUserName, contentName: d.contentName });
}

function responseLabel(t, n) {
  if (n.data?.responseStatus === 'accepted') return t('notifications.accepted');
  if (n.data?.responseStatus === 'rejected') return t('notifications.rejected');
  return '';
}

export default function Notifications() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);

  const refresh = async () => {
    const { data } = await getNotifications();
    const currentUser = loadUser?.();
    const currentUserId = currentUser?._id || currentUser?.id;
    const nextItems = (data || []).filter((n) => !currentUserId || !n.user || String(n.user) === String(currentUserId));
    setItems(nextItems);
    notifyNotificationsChanged({ unreadCount: nextItems.filter((n) => !n.read).length });
  };

  useEffect(() => { refresh().catch(() => {}); }, []);

  const counts = useMemo(() => ({
    all: items.length,
    unread: items.filter((n) => !n.read).length,
  }), [items]);
  const visibleItems = useMemo(() => (
    filter === 'unread' ? items.filter((n) => !n.read) : items
  ), [filter, items]);

  const open = async (n) => {
    await markAsRead(n._id);
    if (n.data?.actionUrl) navigate(n.data.actionUrl);
    refresh();
  };

  const respond = async (n, accept) => {
    const id = n.data?.friendshipId;
    if (!id) return;
    if (accept) await acceptFriendRequest(id);
    else await rejectFriendRequest(id);
    await markAsRead(n._id);
    refresh();
  };

  const clear = async () => {
    if (!(await confirmAction(t('notifications.deleteAllConfirm')))) return;
    await deleteAllNotifications();
    refresh();
  };

  return (
    <RNWebPage themed title={t('notifications.title')} subtitle={t('notifications.subtitle')} icon={MdNotifications}>
      <Page>
        <TopGrid>
          <Stat>
            <StatLabel>{t('notifications.all')}</StatLabel>
            <StatValue>{counts.all}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>{t('notifications.unread')}</StatLabel>
            <StatValue>{counts.unread}</StatValue>
          </Stat>
        </TopGrid>

        <Toolbar>
          <Segment>
            <SegmentButton type="button" $active={filter === 'all'} onClick={() => setFilter('all')}>
              {t('notifications.all')}
            </SegmentButton>
            <SegmentButton type="button" $active={filter === 'unread'} onClick={() => setFilter('unread')}>
              {t('notifications.unread')}
            </SegmentButton>
          </Segment>
          <BulkActions>
            <Button type="button" onClick={() => markAllAsRead().then(refresh)}><MdDoneAll />{t('notifications.markAllRead')}</Button>
            <Button type="button" $danger onClick={clear}><MdDelete />{t('notifications.deleteAll')}</Button>
          </BulkActions>
        </Toolbar>

        <List>
          {visibleItems.length === 0 ? <Empty>{filter === 'unread' ? t('notifications.noUnread') : t('notifications.noNotifications')}</Empty> : visibleItems.map((n) => (
            <Card key={n._id} $unread={!n.read}>
              <IconBox><MdNotifications size={22} /></IconBox>
              <BodyButton type="button" onClick={() => open(n)}>
                <Message>
                  {messageFor(t, n)}
                  {responseLabel(t, n) && <Badge>{responseLabel(t, n)}</Badge>}
                  {!n.read && !responseLabel(t, n) && <Badge>{t('notifications.unread')}</Badge>}
                </Message>
                <Meta>{new Date(n.createdAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'es-ES')}</Meta>
              </BodyButton>
              <CardActions>
                {n.type === 'friend_request_received' && !n.read && !n.data?.responseStatus && (
                  <>
                    <Button type="button" $primary onClick={() => respond(n, true)}>{t('friends.accept')}</Button>
                    <Button type="button" onClick={() => respond(n, false)}>{t('friends.reject')}</Button>
                  </>
                )}
                {n.data?.actionUrl && <Button type="button" onClick={() => open(n)}><MdOpenInNew />{t('notifications.open')}</Button>}
                {!n.read && <Button type="button" onClick={() => markAsRead(n._id).then(refresh)}><MdDone />{t('notifications.markRead')}</Button>}
                <Button type="button" $danger onClick={() => deleteNotification(n._id).then(refresh)}><MdDelete />{t('common.delete')}</Button>
              </CardActions>
            </Card>
          ))}
        </List>
      </Page>
    </RNWebPage>
  );
}
