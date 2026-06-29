import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import {
  MdAccessibility,
  MdAnalytics,
  MdArrowBack,
  MdArrowForward,
  MdBarChart,
  MdCalendarMonth,
  MdCheckCircle,
  MdDescription,
  MdEmojiEvents,
  MdFavorite,
  MdFitnessCenter,
  MdHealthAndSafety,
  MdHome,
  MdLibraryBooks,
  MdLightbulbOutline,
  MdMap,
  MdMedicalServices,
  MdMenu,
  MdOutlineAssignment,
  MdPeople,
  MdRestaurant,
  MdRocketLaunch,
  MdShield,
  MdSportsHandball,
  MdTimer,
  MdTouchApp,
  MdVideoLibrary,
} from 'react-icons/md';
import { useTranslation } from 'react-i18next';

const menuItems = [
  { id: 'home', labelKey: 'menu.home', Icon: MdHome, color: '#1a237e' },
  { id: 'season', labelKey: 'menu.season', Icon: MdCalendarMonth, color: '#f97316' },
  { id: 'tournaments', labelKey: 'menu.tournaments', Icon: MdEmojiEvents, color: '#f59e0b' },
  { id: 'players', labelKey: 'menu.players', Icon: MdPeople, color: '#10b981' },
  { id: 'tacticalBoard', labelKey: 'menu.tacticalBoard', Icon: MdMap, color: '#8b5cf6' },
  { id: 'exercises', labelKey: 'menu.exercises', Icon: MdFitnessCenter, color: '#3b82f6' },
  { id: 'strategies', labelKey: 'menu.strategies', Icon: MdOutlineAssignment, color: '#a855f7' },
  { id: 'videos', labelKey: 'menu.myVideos', Icon: MdVideoLibrary, color: '#ef4444' },
  { id: 'methodology', labelKey: 'menu.methodology', Icon: MdLibraryBooks, color: '#06b6d4' },
  {
    id: 'goalkeeperMethodology',
    labelKey: 'menu.goalkeeperMethodology',
    Icon: MdSportsHandball,
    color: '#0ea5e9',
  },
  { id: 'training', labelKey: 'menu.training', Icon: MdTimer, color: '#f97316' },
  { id: 'wellness', labelKey: 'menu.wellness', Icon: MdFavorite, color: '#ec4899' },
  { id: 'rivals', labelKey: 'menu.rivals', Icon: MdShield, color: '#14b8a6' },
  { id: 'matchSheets', labelKey: 'menu.matchSheets', Icon: MdDescription, color: '#64748b' },
  { id: 'injuries', labelKey: 'menu.injuries', Icon: MdMedicalServices, color: '#ef4444' },
  { id: 'rivalAnalysis', labelKey: 'menu.rivalAnalysis', Icon: MdAnalytics, color: '#8b5cf6' },
  { id: 'anthropometry', labelKey: 'menu.anthropometry', Icon: MdAccessibility, color: '#f59e0b' },
  { id: 'statistics', labelKey: 'menu.statistics', Icon: MdBarChart, color: '#3b82f6' },
  { id: 'nutrition', labelKey: 'menu.nutrition', Icon: MdRestaurant, color: '#10b981' },
  {
    id: 'injuryPrevention',
    labelKey: 'menu.injuryPrevention',
    Icon: MdHealthAndSafety,
    color: '#ef4444',
  },
];

const getTutorialMenuItems = () => menuItems;

const getSectionLabel = (item) => {
  if (item.id === 'tacticalBoard') return 'menu.tools';
  if (item.id === 'methodology') return 'menu.management';
  if (item.id === 'injuries') return 'menu.analysis';
  return '';
};

const buildTutorialSteps = (items) => [
  {
    id: 'welcome',
    type: 'fullscreen',
    Icon: MdRocketLaunch,
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 48%, #0891b2 100%)',
    bullets: ['b1', 'b2', 'b3', 'b4'],
  },
  {
    id: 'drawer',
    type: 'drawer',
    Icon: MdMenu,
    color: '#1a237e',
    titleKey: 'tutorial.drawer.title',
    descriptionKey: 'tutorial.drawer.description',
  },
  ...items.map((item, menuIndex) => ({
    ...item,
    type: 'menu',
    menuIndex,
  })),
  {
    id: 'ready',
    type: 'fullscreen',
    Icon: MdCheckCircle,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #047857 0%, #059669 52%, #0891b2 100%)',
  },
];

function useHydratedSteps() {
  const { t } = useTranslation();
  const items = useMemo(() => getTutorialMenuItems(), []);

  return useMemo(
    () =>
      buildTutorialSteps(items).map((step) => {
        const baseKey = `tutorial.steps.${step.id}`;
        return {
          ...step,
          title: t(step.titleKey || `${baseKey}.title`),
          description: t(step.descriptionKey || `${baseKey}.description`),
          tip: step.type === 'menu' || step.id === 'welcome' ? t(`${baseKey}.tip`, '') : '',
          bullets: step.bullets?.map((key) => t(`${baseKey}.${key}`)) || [],
        };
      }),
    [t, items],
  );
}

export default function OnboardingTutorial({ visible, onComplete }) {
  const { t } = useTranslation();
  const steps = useHydratedSteps();
  const drawerItems = useMemo(() => getTutorialMenuItems(), []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const drawerScrollRef = useRef(null);
  const itemRefs = useRef({});
  const currentStep = steps[currentIndex] || steps[0];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  useEffect(() => {
    if (visible) setCurrentIndex(0);
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || currentStep?.type !== 'menu') return;
    itemRefs.current[currentStep.menuIndex]?.scrollIntoView({ block: 'center' });
  }, [visible, currentStep]);

  if (!visible || typeof document === 'undefined') return null;

  const finish = () => {
    onComplete?.();
  };

  const next = () => {
    if (isLast) finish();
    else setCurrentIndex((value) => Math.min(value + 1, steps.length - 1));
  };

  const back = () => {
    setCurrentIndex((value) => Math.max(value - 1, 0));
  };

  const content =
    currentStep.type === 'fullscreen' ? (
      <FullscreenStep
        step={currentStep}
        t={t}
        currentIndex={currentIndex}
        totalSteps={steps.length}
        isFirst={isFirst}
        isLast={isLast}
        onBack={back}
        onNext={next}
        onSkip={finish}
      />
    ) : (
      <SpotlightStep
        step={currentStep}
        t={t}
        currentIndex={currentIndex}
        totalSteps={steps.length}
        isFirst={isFirst}
        isLast={isLast}
        onBack={back}
        onNext={next}
        onSkip={finish}
        drawerScrollRef={drawerScrollRef}
        itemRefs={itemRefs}
        drawerItems={drawerItems}
      />
    );

  return createPortal(content, document.body);
}

function FullscreenStep({
  step,
  t,
  currentIndex,
  totalSteps,
  isFirst,
  isLast,
  onBack,
  onNext,
  onSkip,
}) {
  const Icon = step.Icon;
  return (
    <FullscreenOverlay
      $gradient={step.gradient}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      data-theme-aware="true"
    >
      <FullscreenContent>
        <HeroIcon>
          <Icon size={54} />
        </HeroIcon>
        <FullscreenTitle id="tutorial-title">{step.title}</FullscreenTitle>
        <FullscreenDescription>{step.description}</FullscreenDescription>
        {step.bullets.length > 0 ? (
          <BulletList>
            {step.bullets.map((bullet) => (
              <BulletRow key={bullet}>
                <MdCheckCircle size={18} />
                <span>{bullet}</span>
              </BulletRow>
            ))}
          </BulletList>
        ) : null}
        {step.tip ? (
          <Tip $light>
            <MdLightbulbOutline size={18} />
            {step.tip}
          </Tip>
        ) : null}
      </FullscreenContent>
      <FooterNav>
        <ProgressLabel>
          {currentIndex + 1}/{totalSteps}
        </ProgressLabel>
        <ProgressTrack>
          <ProgressFill $value={(currentIndex + 1) / totalSteps} />
        </ProgressTrack>
        <ButtonRow>
          <IconButton
            type="button"
            onClick={onBack}
            disabled={isFirst}
            aria-label={t('tutorial.back')}
          >
            <MdArrowBack size={20} />
          </IconButton>
          {!isLast ? (
            <TextButton type="button" style={{ color: '#ffffff' }} onClick={onSkip}>
              {t('tutorial.skip')}
            </TextButton>
          ) : (
            <span />
          )}
          <PrimaryButton type="button" onClick={onNext} $finish={isLast}>
            {isLast ? t('tutorial.start') : t('tutorial.next')}
            {isLast ? <MdCheckCircle size={18} /> : <MdArrowForward size={18} />}
          </PrimaryButton>
        </ButtonRow>
      </FooterNav>
    </FullscreenOverlay>
  );
}

function SpotlightStep({
  step,
  t,
  currentIndex,
  totalSteps,
  isFirst,
  isLast,
  onBack,
  onNext,
  onSkip,
  drawerScrollRef,
  itemRefs,
  drawerItems,
}) {
  return (
    <SpotlightOverlay role="dialog" aria-modal="true" aria-labelledby="tutorial-title" data-theme-aware="true">
      <TutorialScene>
        <DrawerPreview t={t} step={step} drawerScrollRef={drawerScrollRef} itemRefs={itemRefs} items={drawerItems} />
        <PagePreview aria-hidden="true">
          <PageHeader>
            <MdMenu size={24} />
            <span>Xtramys</span>
          </PageHeader>
          <PreviewContent>
            <PreviewLine $wide />
            <PreviewLine />
            <PreviewGrid>
              <PreviewCard />
              <PreviewCard />
              <PreviewCard $wide />
            </PreviewGrid>
          </PreviewContent>
        </PagePreview>
      </TutorialScene>
      <TooltipCard>
        <TooltipHeader>
          <StepIcon $color={step.color}>
            {step.Icon ? <step.Icon size={22} /> : <MdMenu size={22} />}
          </StepIcon>
          <TooltipTitle id="tutorial-title">{step.title}</TooltipTitle>
          <Counter>
            {currentIndex + 1}/{totalSteps}
          </Counter>
        </TooltipHeader>
        <TooltipDescription>{step.description}</TooltipDescription>
        {step.tip ? (
          <Tip>
            <MdLightbulbOutline size={16} />
            {step.tip}
          </Tip>
        ) : null}
        <TooltipButtons>
          <SecondaryButton type="button" onClick={onBack} disabled={isFirst}>
            <MdArrowBack size={18} />
            {t('tutorial.back')}
          </SecondaryButton>
          <ButtonSpacer />
          {!isLast ? (
            <TextButton type="button" onClick={onSkip}>
              {t('tutorial.skip')}
            </TextButton>
          ) : null}
          <PrimaryButton type="button" onClick={onNext} $finish={isLast}>
            {isLast ? t('tutorial.start') : t('tutorial.next')}
            {isLast ? <MdCheckCircle size={18} /> : <MdArrowForward size={18} />}
          </PrimaryButton>
        </TooltipButtons>
        <ProgressTrack $compact>
          <ProgressFill $value={(currentIndex + 1) / totalSteps} $color={step.color} />
        </ProgressTrack>
      </TooltipCard>
    </SpotlightOverlay>
  );
}

function DrawerPreview({ t, step, drawerScrollRef, itemRefs, items }) {
  const highlightIndex = step.type === 'menu' ? step.menuIndex : -1;
  return (
    <DrawerShell $highlightDrawer={step.type === 'drawer'}>
      <DrawerHeader>
        <AvatarCircle>{t('tutorial.drawer.yourAccount').charAt(0)}</AvatarCircle>
        <span>{t('tutorial.drawer.yourAccount')}</span>
      </DrawerHeader>
      <DrawerScroll ref={drawerScrollRef}>
        {items.map((item, index) => {
          const Icon = item.Icon;
          const active = index === highlightIndex;
          const sectionLabel = getSectionLabel(item);
          return (
            <MenuFragment key={item.id}>
              {sectionLabel ? (
                <SectionDivider>{t(sectionLabel)}</SectionDivider>
              ) : null}
              <DrawerItem
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                $active={active}
                $color={item.color}
              >
                <IconBox $active={active} $color={item.color}>
                  <Icon size={19} />
                </IconBox>
                <span>{t(item.labelKey)}</span>
                {active ? <MdTouchApp size={18} /> : null}
              </DrawerItem>
            </MenuFragment>
          );
        })}
      </DrawerScroll>
    </DrawerShell>
  );
}

const FullscreenOverlay = styled.div.attrs({ 'data-theme-aware': 'true' })`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: grid;
  grid-template-rows: 1fr auto;
  background: ${({ $gradient }) => $gradient};
  color: #fff;
  padding: 28px clamp(18px, 4vw, 48px);
  overflow: auto;

  @media (max-width: 760px) {
    padding: 18px 14px;
  }
`;

const FullscreenContent = styled.div`
  width: min(720px, 100%);
  margin: auto;
  text-align: center;
  display: grid;
  justify-items: center;
  gap: 18px;
`;

const HeroIcon = styled.div`
  width: 118px;
  height: 118px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.22);

  @media (max-height: 680px) {
    width: 88px;
    height: 88px;
  }

  @media (max-width: 480px) {
    width: 78px;
    height: 78px;
  }
`;

const FullscreenTitle = styled.h2`
  margin: 0;
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.08;
  font-weight: 800;

  @media (max-height: 680px) {
    font-size: clamp(26px, 5vw, 34px);
  }
`;

const FullscreenDescription = styled.p`
  margin: 0;
  width: min(620px, 100%);
  font-size: clamp(16px, 2vw, 20px);
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.88);

  @media (max-width: 480px) {
    font-size: 15px;
  }
`;

const BulletList = styled.div`
  width: min(560px, 100%);
  display: grid;
  gap: 10px;
  margin-top: 4px;
`;

const BulletRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 11px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.13);
  color: rgba(255, 255, 255, 0.92);
  font-weight: 600;
`;

const SpotlightOverlay = styled.div.attrs({ 'data-theme-aware': 'true' })`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  overflow: hidden;
  background: rgba(15, 23, 42, 0.72);

  @media (max-width: 760px) {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    padding: 10px;
    gap: 10px;
  }
`;

const TutorialScene = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: minmax(260px, 300px) 1fr;
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 760px) {
    position: relative;
    inset: auto;
    min-height: 0;
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr);
    border-radius: 8px;
    overflow: hidden;
  }
`;

const DrawerShell = styled.aside`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: ${({ theme }) => theme.colors.sidebarBg};
  border-right: 1px solid ${({ theme }) => theme.colors.sidebarBorder};
  box-shadow: ${({ $highlightDrawer }) =>
    $highlightDrawer
      ? '0 0 0 3px rgba(255,255,255,0.9), 0 0 0 7px rgba(37, 99, 235, 0.8)'
      : 'none'};

  @media (max-width: 760px) {
    width: min(100%, 380px);
    height: 100%;
    max-height: none;
    justify-self: center;
    margin-top: 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.colors.sidebarBorder};
  }
`;

const DrawerHeader = styled.div`
  padding: 20px;
  color: #fff;
  background: linear-gradient(135deg, #1a237e 0%, #2563eb 58%, #0891b2 100%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
`;

const AvatarCircle = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.92);
  color: #1d4ed8;
  font-weight: 800;
`;

const DrawerScroll = styled.div`
  flex: 1;
  overflow: hidden auto;
  padding: 8px 10px 18px;
`;

const MenuFragment = styled.div``;

const SectionDivider = styled.div`
  padding: 14px 8px 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.sidebarSection};
`;

const DrawerItem = styled.div`
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  color: ${({ $active, $color, theme }) => ($active ? $color : theme.colors.sidebarText)};
  background: ${({ $active, $color, theme }) => ($active ? `${$color}18` : theme.colors.sidebarBg)};
  border: 1px solid ${({ $active, $color }) => ($active ? $color : 'transparent')};
  box-shadow: ${({ $active, $color }) =>
    $active ? `0 0 0 3px ${$color}26, 0 18px 34px rgba(15, 23, 42, 0.3)` : 'none'};
  position: relative;
  z-index: ${({ $active }) => ($active ? 4 : 1)};
  opacity: ${({ $active }) => ($active ? 1 : 0.52)};
`;

const IconBox = styled.span`
  width: 31px;
  height: 31px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: ${({ $active }) => ($active ? '#fff' : 'currentColor')};
  background: ${({ $active, $color, theme }) => ($active ? $color : theme.colors.sidebarItemHover)};
`;

const PagePreview = styled.div`
  min-width: 0;
  opacity: 0.4;

  @media (max-width: 760px) {
    display: none;
  }
`;

const PageHeader = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 22px;
  background: ${({ theme }) => theme.colors.headerBg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.headerBorder};
  color: ${({ theme }) => theme.colors.headerText};
  font-weight: 800;
`;

const PreviewContent = styled.div`
  padding: 28px;
`;

const PreviewLine = styled.div`
  width: ${({ $wide }) => ($wide ? 'min(560px, 72%)' : 'min(380px, 50%)')};
  height: ${({ $wide }) => ($wide ? '26px' : '14px')};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.border};
  margin-bottom: 14px;
`;

const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(160px, 280px));
  gap: 16px;
  margin-top: 24px;
`;

const PreviewCard = styled.div`
  height: 130px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};
`;

const TooltipCard = styled.div`
  position: absolute;
  z-index: 5;
  left: min(332px, calc(82vw + 24px));
  top: 50%;
  transform: translateY(-50%);
  width: min(420px, calc(100vw - 360px));
  padding: 18px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.35);

  @media (max-width: 760px) {
    position: relative;
    left: auto;
    right: auto;
    bottom: auto;
    top: auto;
    transform: none;
    width: 100%;
    max-height: none;
    overflow: visible;
    display: grid;
    grid-template-rows: auto auto auto auto;
    padding: 14px;
  }
`;

const TooltipHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const StepIcon = styled.span`
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: #fff;
  background: ${({ $color }) => $color};
`;

const TooltipTitle = styled.h3`
  flex: 1;
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
`;

const Counter = styled.span`
  padding: 4px 9px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  font-weight: 800;
`;

const TooltipDescription = styled.p`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  line-height: 1.55;

  @media (max-width: 760px) {
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }
`;

const Tip = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: ${({ $light, theme }) => 
    $light 
      ? 'rgba(255, 255, 255, 0.16)' 
      : theme.mode === 'dark' 
        ? 'rgba(245, 158, 11, 0.12)' 
        : '#fffbeb'};
  color: ${({ $light, theme }) => 
    $light 
      ? 'rgba(255, 255, 255, 0.92)' 
      : theme.mode === 'dark' 
        ? '#f59e0b' 
        : '#92400e'};
  font-size: 13px;
  line-height: 1.45;
`;

const TooltipButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: stretch;

    > button {
      width: 100%;
      min-width: 0;
    }

    > button:nth-of-type(2) {
      grid-column: 1 / -1;
      order: 3;
    }
  }
`;

const ButtonSpacer = styled.div`
  flex: 1;

  @media (max-width: 480px) {
    display: none;
  }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  border: 0;
  color: ${({ $finish }) => ($finish ? '#052e16' : '#fff')};
  background: ${({ $finish }) => ($finish ? '#86efac' : '#1d4ed8')};
  font-weight: 800;
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.surface};
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    visibility: hidden;
  }
`;

const TextButton = styled.button`
  min-height: 40px;
  padding: 0 10px;
  border: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  background: transparent;
  font-weight: 800;
  cursor: pointer;
`;

const IconButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  background: rgba(255, 255, 255, 0.13);
  display: grid;
  place-items: center;
  cursor: pointer;

  &:disabled {
    opacity: 0;
    pointer-events: none;
  }
`;

const FooterNav = styled.div`
  width: min(720px, 100%);
  margin: 0 auto;
`;

const ButtonRow = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: center;
  gap: 14px;
  margin-top: 16px;

  @media (max-width: 480px) {
    grid-template-columns: 44px minmax(0, 1fr) minmax(104px, auto);
    gap: 10px;

    > button {
      min-width: 0;
      padding-left: 10px;
      padding-right: 10px;
    }
  }
`;

const ProgressLabel = styled.div`
  text-align: right;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.78);
`;

const ProgressTrack = styled.div`
  height: ${({ $compact }) => ($compact ? '4px' : '6px')};
  border-radius: 999px;
  overflow: hidden;
  background: ${({ $compact, theme }) =>
    $compact ? theme.colors.border : 'rgba(255,255,255,0.22)'};
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${({ $value }) => `${Math.round($value * 100)}%`};
  background: ${({ $color }) => $color || '#fff'};
  transition: width 180ms ease;
`;
