// Página Prevención de Lesiones — portada de misterdata-source/src/components/pages/injuryPrevention/.
// Combina InjuryPreventionHome y ProtocolDetail en un único feature con estado interno
// (la ruta `/injury-prevention` no recibe parámetros, así que la selección del protocolo
// se gestiona en memoria — equivalente al navigation.navigate('ProtocolDetail') del RN).
import { useState, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  MdHealthAndSafety,
  MdAssignment,
  MdLayers,
  MdFitnessCenter,
  MdArrowForward,
  MdArrowBack,
  MdInfoOutline,
  MdInfo,
  MdWarning,
  MdFlag,
  MdSettings,
  MdPlayArrow,
  MdRepeat,
  MdLightbulbOutline,
  MdExpandLess,
  MdExpandMore,
  MdKeyboardArrowUp,
  MdKeyboardArrowDown,
  MdPictureAsPdf,
} from 'react-icons/md';

import { INJURY_PREVENTION_PROTOCOLS } from './injuryPreventionData';
import { generateProtocolPdf } from './pdf';
import { Button } from '../../ui/primitives';

// ---------- styles ----------
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const HeaderHero = styled.div`
  background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
  border-radius: 20px;
  padding: 28px 24px;
  color: #fff;
  text-align: center;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25);
`;

const HeroIcon = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
`;

const HeroTitle = styled.h1`
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 800;
`;

const HeroSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  opacity: 0.92;
  line-height: 1.5;
`;

const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  svg { color: ${({ theme }) => theme.colors.primary}; }
`;

const SectionSubtitle = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding-left: 30px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
`;

const ProtocolCard = styled.button`
  position: relative;
  text-align: left;
  border-radius: 16px;
  padding: 18px;
  background: ${({ $color }) => `${$color}18`};
  border: 1px solid ${({ $color }) => `${$color}55`};
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  min-height: 150px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  }
`;

const ProtocolIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $color }) => $color};
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
`;

const ProtocolTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 10px;
  line-height: 1.35;
`;

const ProtocolMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};

  span { display: inline-flex; align-items: center; gap: 4px; }
`;

const ProtocolArrow = styled.div`
  position: absolute;
  bottom: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: ${({ $color }) => $color};
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const InfoCard = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: ${({ theme }) => `${theme.colors.primary}10`};
  border-left: 4px solid ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;

  svg { color: ${({ theme }) => theme.colors.primary}; flex-shrink: 0; margin-top: 2px; }
`;

// ----- Detail view -----
const DetailHero = styled.div`
  background: linear-gradient(135deg, ${({ $color }) => $color} 0%, ${({ $color }) => `${$color}dd`} 50%, ${({ $color }) => `${$color}aa`} 100%);
  color: #fff;
  border-radius: 20px;
  padding: 24px 20px;
  text-align: center;
`;

const BackBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const StatBadgeRow = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 8px 0 14px;
`;

const StatBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.22);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
`;

const Panel = styled.div`
  background: #fff;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 18px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const IntroHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const IntroBlock = styled.div`
  margin-bottom: 14px;
  &:last-child { margin-bottom: 0; }
`;

const IntroBlockHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;

  .icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: ${({ $bg }) => $bg};
    color: ${({ $color }) => $color};
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .title { font-size: 14px; font-weight: 600; color: ${({ theme }) => theme.colors.text}; }
`;

const FactorList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const FactorItem = styled.li`
  position: relative;
  padding-left: 16px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.55;
  margin-bottom: 8px;

  &::before {
    content: '';
    position: absolute;
    left: 0; top: 8px;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: ${({ $bullet }) => $bullet};
  }
`;

const SectionCard = styled.div`
  background: #fff;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  overflow: hidden;
`;

const SectionCardHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  width: 100%;
  background: #fff;
  cursor: pointer;
  text-align: left;
  border: none;

  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const SectionNumber = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: ${({ $color }) => $color};
  color: #fff;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const ExerciseList = styled.div`
  padding: 0 14px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ExerciseCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  margin-top: 10px;
  overflow: hidden;
`;

const ExerciseHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
`;

const ExerciseIcon = styled.div`
  width: 32px; height: 32px;
  border-radius: 9px;
  background: ${({ $color }) => `${$color}22`};
  color: ${({ $color }) => $color};
  display: inline-flex; align-items: center; justify-content: center;
`;

const ExerciseName = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  ${({ $clamp }) =>
    $clamp &&
    css`
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    `}
`;

const ExerciseDetails = styled.div`
  padding: 0 14px 14px;
`;

const DetailRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-top: 12px;
  ${({ $tips }) =>
    $tips &&
    css`
      background: #f59e0b15;
      padding: 10px;
      border-radius: 10px;
    `}
`;

const DetailIcon = styled.div`
  width: 28px; height: 28px;
  border-radius: 8px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
`;

const DetailLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 2px;
`;

const DetailText = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.5;
  ${({ $dosage }) => $dosage && css` font-weight: 600; color: #10b981; `}
  ${({ $tips }) => $tips && css` font-style: italic; color: #92400e; `}
`;

// ---------- Components ----------
function ProtocolHome({ onSelect }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'es';

  return (
    <Container>
      <HeaderHero>
        <HeroIcon>
          <MdHealthAndSafety size={42} color="#fff" />
        </HeroIcon>
        <HeroTitle>{t('injuryPrevention.title')}</HeroTitle>
        <HeroSubtitle>{t('injuryPrevention.subtitle')}</HeroSubtitle>
      </HeaderHero>

      <SectionHeader>
        <SectionTitle>
          <MdAssignment size={22} />
          {t('injuryPrevention.protocols.title')}
        </SectionTitle>
        <SectionSubtitle>{t('injuryPrevention.protocols.subtitle')}</SectionSubtitle>
      </SectionHeader>

      <Grid>
        {INJURY_PREVENTION_PROTOCOLS.map((protocol) => {
          const totalEx = protocol.sections.reduce((acc, s) => acc + s.exercises.length, 0);
          return (
            <ProtocolCard key={protocol.id} $color={protocol.color} onClick={() => onSelect(protocol)}>
              <ProtocolIcon $color={protocol.color}>
                <MdFitnessCenter size={26} />
              </ProtocolIcon>
              <ProtocolTitle>{protocol.title[lang]}</ProtocolTitle>
              <ProtocolMeta>
                <span><MdLayers size={14} /> {protocol.sections.length} {t('injuryPrevention.blocks')}</span>
                <span><MdFitnessCenter size={14} /> {totalEx} {t('injuryPrevention.exercises')}</span>
              </ProtocolMeta>
              <ProtocolArrow $color={protocol.color}>
                <MdArrowForward size={18} />
              </ProtocolArrow>
            </ProtocolCard>
          );
        })}
      </Grid>

      <InfoCard>
        <MdInfo size={22} />
        <span>{t('injuryPrevention.infoText')}</span>
      </InfoCard>
    </Container>
  );
}

function ProtocolDetail({ protocol, onBack }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'es';
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedExercises, setExpandedExercises] = useState({});

  const toggleSection = (id) =>
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleExercise = (key) =>
    setExpandedExercises((prev) => ({ ...prev, [key]: !prev[key] }));

  const totalExercises = useMemo(
    () => protocol.sections.reduce((acc, s) => acc + s.exercises.length, 0),
    [protocol]
  );
  const hasRiskFactors = protocol.introduction?.risk_factors?.length > 0;
  const hasObjectives = protocol.introduction?.objectives?.length > 0;

  return (
    <Container>
      <BackBar>
        <Button $variant="secondary" onClick={onBack}>
          <MdArrowBack size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {t('common.back', 'Volver')}
        </Button>
      </BackBar>

      <DetailHero $color={protocol.color}>
        <HeroIcon>
          <MdFitnessCenter size={36} color="#fff" />
        </HeroIcon>
        <HeroTitle>{protocol.title[lang]}</HeroTitle>
        <StatBadgeRow>
          <StatBadge><MdLayers size={14} /> {protocol.sections.length} {t('injuryPrevention.blocks')}</StatBadge>
          <StatBadge><MdFitnessCenter size={14} /> {totalExercises} {t('injuryPrevention.exercises')}</StatBadge>
        </StatBadgeRow>
        <Button
          $variant="secondary"
          onClick={() => generateProtocolPdf(protocol, lang, t)}
          style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
        >
          <MdPictureAsPdf size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {t('injuryPrevention.downloadPdf')}
        </Button>
      </DetailHero>

      {(hasRiskFactors || hasObjectives) && (
        <Panel>
          <IntroHeader>
            <MdInfoOutline size={22} color={protocol.color} />
            {protocol.introduction?.title?.[lang] || t('injuryPrevention.introduction')}
          </IntroHeader>

          {hasRiskFactors && (
            <IntroBlock>
              <IntroBlockHeader $bg="#ef444420" $color="#ef4444">
                <span className="icon"><MdWarning size={18} /></span>
                <span className="title">{t('injuryPrevention.riskFactors')}</span>
              </IntroBlockHeader>
              <FactorList>
                {protocol.introduction.risk_factors.map((f, i) => (
                  <FactorItem key={i} $bullet="#ef4444">{f[lang]}</FactorItem>
                ))}
              </FactorList>
            </IntroBlock>
          )}

          {hasObjectives && (
            <IntroBlock>
              <IntroBlockHeader $bg="#10b98120" $color="#10b981">
                <span className="icon"><MdFlag size={18} /></span>
                <span className="title">{t('injuryPrevention.objectives')}</span>
              </IntroBlockHeader>
              <FactorList>
                {protocol.introduction.objectives.map((o, i) => (
                  <FactorItem key={i} $bullet="#10b981">{o[lang]}</FactorItem>
                ))}
              </FactorList>
            </IntroBlock>
          )}
        </Panel>
      )}

      <SectionTitle>
        <MdAssignment size={22} />
        {t('injuryPrevention.exerciseProgram')}
      </SectionTitle>

      {protocol.sections.map((section, sectionIndex) => {
        const isOpen = expandedSections[section.section_id] !== false;
        return (
          <SectionCard key={section.section_id}>
            <SectionCardHeader onClick={() => toggleSection(section.section_id)}>
              <SectionNumber $color={protocol.color}>{sectionIndex + 1}</SectionNumber>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{section.title[lang]}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {section.exercises.length} {t('injuryPrevention.exercises')}
                </div>
              </div>
              {isOpen ? <MdExpandLess size={26} /> : <MdExpandMore size={26} />}
            </SectionCardHeader>

            {isOpen && (
              <ExerciseList>
                {section.exercises.map((exercise, exerciseIndex) => {
                  const key = `${section.section_id}_${exerciseIndex}`;
                  const open = expandedExercises[key] === true;
                  const setupOk = exercise.setup?.[lang] && exercise.setup[lang] !== 'N/A';
                  const tipsOk = exercise.tips?.[lang] && exercise.tips[lang].trim() !== '';
                  return (
                    <ExerciseCard key={key}>
                      <ExerciseHeader onClick={() => toggleExercise(key)}>
                        <ExerciseIcon $color={protocol.color}>
                          <MdFitnessCenter size={18} />
                        </ExerciseIcon>
                        <ExerciseName $clamp={!open}>{exercise.name[lang]}</ExerciseName>
                        {open ? <MdKeyboardArrowUp size={22} /> : <MdKeyboardArrowDown size={22} />}
                      </ExerciseHeader>

                      {open && (
                        <ExerciseDetails>
                          {setupOk && (
                            <DetailRow>
                              <DetailIcon $bg="#6366f120" $color="#6366f1"><MdSettings size={16} /></DetailIcon>
                              <div style={{ flex: 1 }}>
                                <DetailLabel>{t('injuryPrevention.setup')}</DetailLabel>
                                <DetailText>{exercise.setup[lang]}</DetailText>
                              </div>
                            </DetailRow>
                          )}
                          <DetailRow>
                            <DetailIcon $bg="#0ea5e920" $color="#0ea5e9"><MdPlayArrow size={16} /></DetailIcon>
                            <div style={{ flex: 1 }}>
                              <DetailLabel>{t('injuryPrevention.execution')}</DetailLabel>
                              <DetailText>{exercise.execution[lang]}</DetailText>
                            </div>
                          </DetailRow>
                          <DetailRow>
                            <DetailIcon $bg="#10b98120" $color="#10b981"><MdRepeat size={16} /></DetailIcon>
                            <div style={{ flex: 1 }}>
                              <DetailLabel>{t('injuryPrevention.dosage')}</DetailLabel>
                              <DetailText $dosage>{exercise.dosage[lang]}</DetailText>
                            </div>
                          </DetailRow>
                          {tipsOk && (
                            <DetailRow $tips>
                              <DetailIcon $bg="#f59e0b20" $color="#f59e0b"><MdLightbulbOutline size={16} /></DetailIcon>
                              <div style={{ flex: 1 }}>
                                <DetailLabel>{t('injuryPrevention.tips')}</DetailLabel>
                                <DetailText $tips>{exercise.tips[lang]}</DetailText>
                              </div>
                            </DetailRow>
                          )}
                        </ExerciseDetails>
                      )}
                    </ExerciseCard>
                  );
                })}
              </ExerciseList>
            )}
          </SectionCard>
        );
      })}
    </Container>
  );
}

export default function InjuryPrevention() {
  const [selected, setSelected] = useState(null);
  if (selected) return <ProtocolDetail protocol={selected} onBack={() => setSelected(null)} />;
  return <ProtocolHome onSelect={setSelected} />;
}
