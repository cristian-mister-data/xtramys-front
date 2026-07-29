import { useCallback, useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { FiDownloadCloud, FiRefreshCw, FiShield } from 'react-icons/fi';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { API_URL } from '@/config';
import { isNative, platform } from '@/platform/capacitor';
import { openExternalWeb } from '@/platform/externalWeb';
import { isVersionOlder } from '@/utils/appVersion';

const StoreFallback = {
  android: 'https://play.google.com/store/apps/details?id=com.xtramys.app',
  ios: 'https://apps.apple.com/es/search?term=Xtramys',
};

export default function MandatoryUpdateGate({ children }) {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(isNative);
  const [requiredUpdate, setRequiredUpdate] = useState(null);

  const checkVersion = useCallback(async () => {
    if (!isNative || (platform !== 'ios' && platform !== 'android')) {
      setChecking(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const [appInfo, response] = await Promise.all([
        CapacitorApp.getInfo(),
        fetch(`${API_URL}/app-version`, { cache: 'no-store', signal: controller.signal }),
      ]);
      if (!response.ok) throw new Error(`Version policy unavailable: ${response.status}`);

      const policy = (await response.json())?.[platform];
      setRequiredUpdate(
        policy?.minimumVersion && isVersionOlder(appInfo.version, policy.minimumVersion)
          ? {
              currentVersion: appInfo.version,
              minimumVersion: policy.minimumVersion,
              storeUrl: policy.storeUrl || StoreFallback[platform],
            }
          : null,
      );
    } catch {
      // No bloqueamos la aplicación por una caída temporal de red o de la API.
    } finally {
      window.clearTimeout(timeout);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkVersion();
    if (!isNative) return undefined;

    let listener;
    let disposed = false;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) checkVersion();
    }).then((handle) => {
      if (disposed) handle.remove();
      else listener = handle;
    }).catch(() => {});

    return () => {
      disposed = true;
      listener?.remove();
    };
  }, [checkVersion]);

  if (checking) {
    return (
      <Gate role="status" aria-live="polite" aria-busy="true">
        <Spinner aria-hidden="true" />
        <ScreenReaderOnly>{t('mandatoryUpdate.checking')}</ScreenReaderOnly>
      </Gate>
    );
  }

  if (!requiredUpdate) return children;

  return (
    <Gate role="alertdialog" aria-modal="true" aria-labelledby="mandatory-update-title">
      <Card>
        <IconWrap aria-hidden="true"><FiDownloadCloud /></IconWrap>
        <Eyebrow><FiShield aria-hidden="true" /> {t('mandatoryUpdate.required')}</Eyebrow>
        <Title id="mandatory-update-title">{t('mandatoryUpdate.title')}</Title>
        <Description>{t('mandatoryUpdate.description')}</Description>
        <Version>
          {t('mandatoryUpdate.version', {
            current: requiredUpdate.currentVersion,
            minimum: requiredUpdate.minimumVersion,
          })}
        </Version>
        <PrimaryButton type="button" onClick={() => openExternalWeb(requiredUpdate.storeUrl)}>
          <FiDownloadCloud aria-hidden="true" />
          {t('mandatoryUpdate.updateNow')}
        </PrimaryButton>
        <RetryButton type="button" onClick={checkVersion}>
          <FiRefreshCw aria-hidden="true" />
          {t('mandatoryUpdate.checkAgain')}
        </RetryButton>
      </Card>
    </Gate>
  );
}

const Gate = styled.main`
  min-height: 100dvh;
  padding:
    max(24px, env(safe-area-inset-top))
    max(20px, env(safe-area-inset-right))
    max(24px, env(safe-area-inset-bottom))
    max(20px, env(safe-area-inset-left));
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 50% 10%, ${({ theme }) => theme.colors.primarySoft} 0, transparent 42%),
    ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
`;

const Card = styled.section`
  width: min(100%, 440px);
  padding: 34px 26px 26px;
  text-align: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 28px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.xl};
`;

const IconWrap = styled.div`
  width: 82px;
  height: 82px;
  margin: 0 auto 22px;
  display: grid;
  place-items: center;
  border-radius: 26px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 38px;
`;

const Eyebrow = styled.p`
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(27px, 7vw, 34px);
  line-height: 1.12;
  letter-spacing: -0.025em;
`;

const Description = styled.p`
  margin: 16px auto 0;
  max-width: 34ch;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 16px;
  line-height: 1.55;
`;

const Version = styled.p`
  margin: 20px 0 24px;
  padding: 10px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  font-weight: 700;
`;

const PrimaryButton = styled.button`
  width: 100%;
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 15px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  box-shadow: ${({ theme }) => theme.shadows.md};
  font-size: 16px;
  font-weight: 800;
`;

const RetryButton = styled.button`
  min-height: 48px;
  margin-top: 10px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  font-weight: 700;
`;

const Spinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ScreenReaderOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;
