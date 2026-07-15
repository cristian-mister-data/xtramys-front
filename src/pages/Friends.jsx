import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdClose, MdEmail, MdInbox, MdPeople, MdPersonAdd, MdSend } from 'react-icons/md';
import { acceptFriendRequest, cancelSentRequest, getFriends, getPendingRequests, getSentRequests, rejectFriendRequest, removeFriend, sendFriendRequest } from '@/api/friendship';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';
import RNWebPage from './_RNWebPage';

const Page = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 20px clamp(12px, 3vw, 28px) 32px;
  display: grid;
  gap: 18px;
  grid-auto-rows: max-content;
  align-content: start;
  min-height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
`;
const Invite = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 440px);
  gap: clamp(16px, 3vw, 28px);
  align-items: center;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: clamp(18px, 3vw, 26px);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.14);
  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;
const Kicker = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;
const Title = styled.h2`
  margin: 8px 0 6px;
  color: ${({ theme }) => theme.colors.text};
  font-size: clamp(21px, 2.5vw, 28px);
  line-height: 1.12;
`;
const Muted = styled.div`color: ${({ theme }) => theme.colors.textMuted}; font-size: 14px; line-height: 1.5;`;
const Form = styled.form`
  display: flex;
  gap: 10px;
  align-items: stretch;
  @media (max-width: 540px) { flex-direction: column; }
`;
const InputWrap = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 0 13px;
  background: ${({ theme }) => theme.colors.surfaceAlt || theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
`;
const Input = styled.input`
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  padding: 13px 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
`;
const Button = styled.button`
  border: 1px solid ${({ $danger, theme }) => ($danger ? 'rgba(239,68,68,.35)' : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 10px 13px;
  background: ${({ $primary, $danger, theme }) => ($primary ? theme.colors.primary : $danger ? 'rgba(239,68,68,.08)' : theme.colors.surface)};
  color: ${({ $primary, $danger, theme }) => ($primary ? theme.colors.onPrimary : $danger ? '#ef4444' : theme.colors.text)};
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  min-height: 42px;
  white-space: nowrap;
  &:disabled { opacity: .6; cursor: not-allowed; }
`;
const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;
const Tab = styled.button`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $active, theme }) => ($active ? theme.colors.primarySoft : theme.colors.surface)};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  text-align: left;
`;
const TabIcon = styled.span`
  width: 42px;
  height: 42px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;
const TabLabel = styled.span`font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const Count = styled.span`font-size: 24px; font-weight: 950; color: ${({ theme }) => theme.colors.text};`;
const List = styled.section`display: grid; gap: 12px;`;
const Row = styled.article`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: clamp(14px, 2vw, 18px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows?.sm || 'none'};
  @media (max-width: 700px) { grid-template-columns: 48px minmax(0, 1fr); }
`;
const Avatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 950;
`;
const Name = styled.div`font-weight: 900; color: ${({ theme }) => theme.colors.text}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const Meta = styled.div`color: ${({ theme }) => theme.colors.textMuted}; font-size: 13px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  @media (max-width: 700px) { grid-column: 1 / -1; justify-content: stretch; > button { flex: 1; } }
`;
const Empty = styled.div`
  padding: 42px 16px;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const displayName = (u) => [u?.nombre, u?.apellido].filter(Boolean).join(' ') || u?.correo;
const initial = (text) => String(text || '?').slice(0, 1).toUpperCase();

export default function Friends() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('friends');
  const [email, setEmail] = useState('');
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const [f, p, s] = await Promise.all([getFriends(), getPendingRequests(), getSentRequests()]);
    setFriends(f.data || []);
    setPending(p.data || []);
    setSent(s.data || []);
  };

  useEffect(() => { refresh().catch(() => {}); }, []);

  const tabs = useMemo(() => [
    { key: 'friends', label: t('friends.myFriends'), icon: MdPeople, count: friends.length },
    { key: 'pending', label: t('friends.pendingReceived'), icon: MdInbox, count: pending.length },
    { key: 'sent', label: t('friends.pendingSent'), icon: MdSend, count: sent.length },
  ], [friends.length, pending.length, sent.length, t]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendFriendRequest(email.trim());
      toast.success(t('friends.requestSent'));
      setEmail('');
      await refresh();
      setTab('sent');
    } catch (err) {
      toast.error(err.message || t('message.error'));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (friend) => {
    if (!(await confirmAction(t('friends.removeConfirm', { name: displayName(friend) })))) return;
    await removeFriend(friend._id);
    toast.success(t('friends.friendRemoved'));
    refresh();
  };

  const list = tab === 'friends' ? friends : tab === 'pending' ? pending : sent;
  const empty = tab === 'friends' ? t('friends.noFriends') : tab === 'pending' ? t('friends.noPending') : t('friends.noSent');

  return (
    <RNWebPage themed title={t('friends.title')} subtitle={t('friends.subtitle')} icon={MdPeople}>
      <Page>
        <Invite>
          <div>
            <Kicker><MdPersonAdd /> {t('friends.inviteTitle')}</Kicker>
            <Title>{t('friends.inviteHeading')}</Title>
            <Muted>{t('friends.inviteSubtitle')}</Muted>
          </div>
          <Form onSubmit={submit}>
            <InputWrap>
              <MdEmail size={18} />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('friends.addFriendPlaceholder')} />
            </InputWrap>
            <Button type="submit" $primary disabled={loading}><MdPersonAdd />{loading ? t('friends.sendingRequest') : t('friends.sendRequest')}</Button>
          </Form>
        </Invite>

        <Stats>
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <Tab key={key} type="button" $active={tab === key} onClick={() => setTab(key)}>
              <TabIcon><Icon size={21} /></TabIcon>
              <TabLabel>{label}</TabLabel>
              <Count>{count}</Count>
            </Tab>
          ))}
        </Stats>

        <List>
          {list.length === 0 ? <Empty>{empty}</Empty> : list.map((row) => {
            const person = row.requester || row.recipient || row;
            const emailText = tab === 'sent' ? (row.recipientEmail || person?.correo) : person?.correo;
            const name = displayName(person) || emailText;
            return (
              <Row key={row._id || person?._id || emailText}>
                <Avatar>{initial(name || emailText)}</Avatar>
                <div>
                  <Name>{name || emailText}</Name>
                  <Meta>{tab === 'sent' ? t('friends.sentTo', { email: emailText }) : emailText}</Meta>
                </div>
                <Actions>
                  {tab === 'friends' && <Button type="button" $danger onClick={() => remove(person)}><MdClose />{t('friends.remove')}</Button>}
                  {tab === 'pending' && (
                    <>
                      <Button type="button" $primary onClick={() => acceptFriendRequest(row._id).then(refresh)}>{t('friends.accept')}</Button>
                      <Button type="button" onClick={() => rejectFriendRequest(row._id).then(refresh)}>{t('friends.reject')}</Button>
                    </>
                  )}
                  {tab === 'sent' && <Button type="button" onClick={() => cancelSentRequest(row._id).then(refresh)}>{t('friends.cancel')}</Button>}
                </Actions>
              </Row>
            );
          })}
        </List>
      </Page>
    </RNWebPage>
  );
}
