import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdNotifications } from 'react-icons/md';
import { getUnreadCount, NOTIFICATION_CHANGED_EVENT } from '@/api/notification';

const Wrap = styled.div`position: relative;`;
const Btn = styled.button`
  position: relative;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  display: grid;
  place-items: center;
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;
const Badge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.error};
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
`;

export default function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  const refreshCount = useCallback(async () => {
    const { data } = await getUnreadCount();
    setCount(data.count || 0);
  }, []);

  useEffect(() => {
    refreshCount().catch(() => {});
    const id = setInterval(() => refreshCount().catch(() => {}), 60000);
    const onChanged = () => refreshCount().catch(() => {});
    window.addEventListener(NOTIFICATION_CHANGED_EVENT, onChanged);
    return () => {
      clearInterval(id);
      window.removeEventListener(NOTIFICATION_CHANGED_EVENT, onChanged);
    };
  }, [refreshCount]);

  return (
    <Wrap>
      <Btn type="button" onClick={() => navigate('/notifications')} aria-label={t('notifications.title')}>
        <MdNotifications size={22} />
        {count > 0 && <Badge>{count > 99 ? '99+' : count}</Badge>}
      </Btn>
    </Wrap>
  );
}
