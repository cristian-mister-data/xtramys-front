import { useTranslation } from 'react-i18next';
import { MdDescription, MdAdd, MdSportsSoccer, MdVisibility } from 'react-icons/md';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import RNWebPage from './_RNWebPage';
import MatchSheetList from '@/vendor/matchSheet/matchSheetList';
import OpponentMatchReports from '@/features/opponentMatchReports/OpponentMatchReports';
import TeamRequiredCard from '@/components/shared/TeamRequiredCard';
import CanMutate from '@/components/shared/CanMutate';
import useSupervision from '@/hooks/useSupervision';
import { Button, Row } from '@/ui/primitives';

const Content = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  overflow-x: auto;

  @media (max-width: 600px) {
    padding: 8px;
  }
`;

const Tab = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 42px;
  padding: 8px 13px;
  border: 1px solid ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $active }) => $active ? theme.colors.primarySoft : theme.colors.backgroundAlt};
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.textSecondary};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }

  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }

  @media (max-width: 600px) {
    flex: 1;
    min-width: 0;
    padding-inline: 8px;
  }
`;

const OwnMatchSheets = styled.div`
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const OpponentMatchSheets = styled.div`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
`;

export default function MatchSheets() {
  const { t } = useTranslation();
  const teams = useSelector((s) => s.team?.teams ?? []);
  const selectedTeam = teams.find((e) => e.seleccionado) || null;
  const { canMutate } = useSupervision();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'opponents' ? 'opponents' : 'own';

  const selectTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'opponents') next.set('tab', 'opponents');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  const create = () => window.dispatchEvent(new CustomEvent(activeTab === 'own' ? 'matchsheets:create' : 'opponent-reports:create'));

  return (
    <RNWebPage
      themed
      title={t('menu.matchSheets', 'Fichas de Partido')}
      subtitle={activeTab === 'own' ? t('sectionHeaders.matchSheets') : t('opponentMatch.pageSubtitle')}
      icon={MdDescription}
      actions={selectedTeam ? (
        <CanMutate>
          <Button $variant="primary" onClick={create}>
            <Row $gap={6}>
              <MdAdd size={18} />
              {activeTab === 'own' ? t('matchSheet.actions.createMatchSheet') : t('opponentMatch.actions.create')}
            </Row>
          </Button>
        </CanMutate>
      ) : null}
    >
      {selectedTeam ? (
        <Content>
          <Tabs role="tablist" aria-label={t('opponentMatch.tabsLabel')}>
            <Tab type="button" role="tab" aria-selected={activeTab === 'own'} $active={activeTab === 'own'} onClick={() => selectTab('own')}>
              <MdSportsSoccer aria-hidden="true" /> {t('opponentMatch.tabs.own')}
            </Tab>
            <Tab type="button" role="tab" aria-selected={activeTab === 'opponents'} $active={activeTab === 'opponents'} onClick={() => selectTab('opponents')}>
              <MdVisibility aria-hidden="true" /> {t('opponentMatch.tabs.opponents')}
            </Tab>
          </Tabs>
          {activeTab === 'own' ? (
            <OwnMatchSheets role="tabpanel"><MatchSheetList canMutate={canMutate} /></OwnMatchSheets>
          ) : (
            <OpponentMatchSheets role="tabpanel"><OpponentMatchReports selectedTeam={selectedTeam} canMutate={canMutate} /></OpponentMatchSheets>
          )}
        </Content>
      ) : <TeamRequiredCard />}
    </RNWebPage>
  );
}

