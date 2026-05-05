// Página Nutrición — portada de misterdata-source/src/components/pages/nutrition/nutrition.js
// 3 pestañas (preseason / season / reference), opción 1/2 en modo recomendado,
// gestión de planes personalizados (PlanManagerModal) y edición (EditPlanModal),
// modales de detalle (día, contexto, comida) y exportación a PDF.
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  MdFitnessCenter,
  MdSportsSoccer,
  MdMenuBook,
  MdRestaurant,
  MdDinnerDining,
  MdFreeBreakfast,
  MdLocalCafe,
  MdFastfood,
  MdGrain,
  MdMedication,
  MdWaterDrop,
  MdSchedule,
  MdChevronRight,
  MdExpandMore,
  MdExpandLess,
  MdPictureAsPdf,
  MdPerson,
  MdAutoAwesome,
  MdKeyboardArrowDown,
} from 'react-icons/md';

import {
  getPreSeasonData,
  getSeasonData,
  getPreSeasonDataOption2,
  getSeasonDataOption2,
  getReferenceData,
  getEmptyPlanStructure,
  MEAL_COLORS,
} from './nutritionData';
import {
  getAllNutritionPlans,
  createNutrition,
  duplicateNutritionPlan,
  deleteNutritionPlan,
} from '../../api/nutritionMethodology';
import Modal from '../../ui/Modal';
import { Stack, Muted, PageHeader, PageTitle } from '../../ui/primitives';
import { toast } from '../../ui/toast';
import { confirmAction } from '../../ui/confirm';
import { generateNutritionPdf } from './pdf';
import EditPlanModal from './EditPlanModal';
import PlanManagerModal from './PlanManagerModal';

// ---------- styles ----------
const GRAD_BLUE = 'linear-gradient(135deg, #1a237e, #3949ab, #5c6bc0)';
const GRAD_GREEN = 'linear-gradient(135deg, #059669, #10b981, #34d399)';
const GRAD_ORANGE = 'linear-gradient(135deg, #ea580c, #f59e0b, #fbbf24)';
const GRAD_PURPLE = 'linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 18px 18px 24px;
  box-sizing: border-box;

  @media (max-width: 720px) {
    padding: 16px 14px 20px;
    gap: 16px;
  }
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ModePill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ $custom, theme }) => ($custom ? theme.colors.success : theme.colors.primary)};
  font-weight: 600;
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const Counter = styled.span`
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
`;

const PdfBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 0;
  background: ${({ theme }) => theme.colors.error};
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  margin-left: auto;
  &:hover { opacity: 0.9; }

  @media (max-width: 720px) {
    width: 100%;
    justify-content: center;
    margin-left: 0;
  }
`;

const OptionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const OptionPill = styled.button`
  flex: 1 1 140px;
  min-width: 120px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.text)};
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;

  @media (max-width: 600px) {
    font-size: 12px;
    padding: 8px 10px;
  }
`;

const TabBar = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  background: ${({ theme }) => theme.colors.surface};
  padding: 6px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const TabBtn = styled.button`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 0;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  background: ${({ $active }) => ($active ? GRAD_BLUE : 'transparent')};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.textSecondary)};

  @media (max-width: 600px) {
    font-size: 13px;
    padding: 10px 10px;
  }
`;

const SeasonHeader = styled.div`
  background: ${({ $variant }) => ($variant === 'season' ? GRAD_GREEN : GRAD_BLUE)};
  color: #fff;
  padding: 16px 18px;
  border-radius: ${({ theme }) => theme.radius.lg};
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 16px;
`;

const SectionTitle = styled.h3`
  font-size: 14px;
  margin: 10px 0 6px;
  color: ${({ theme }) => theme.colors.text};

  @media (max-width: 600px) {
    font-size: 13px;
    margin: 8px 0 5px;
  }
`;

const HScroll = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 4px 2px 8px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const MealTile = styled.button`
  width: 100%;
  min-width: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 0;
  padding: 18px 14px;
  color: #fff;
  background: ${({ $bg }) => $bg};
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
  &:hover { transform: translateY(-2px); transition: transform .15s; }
`;

const MealTileTitle = styled.div`
  font-weight: 700;
  font-size: 15px;

  @media (max-width: 600px) {
    font-size: 14px;
  }
`;

const MealTileCount = styled.div`
  font-size: 12px;
  opacity: 0.85;

  @media (max-width: 600px) {
    font-size: 11px;
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  @media (max-width: 900px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const DayCardWrap = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 0;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const DayCardHeader = styled.div`
  background: ${({ $rest }) => ($rest ? GRAD_PURPLE : GRAD_GREEN)};
  color: #fff;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
`;

const DayName = styled.div`
  font-weight: 700;
  font-size: 14px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 600px) {
    font-size: 13px;
  }
`;

const DayTag = styled.div`
  font-size: 10px;
  opacity: 0.92;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;

  @media (max-width: 600px) {
    font-size: 9px;
  }
`;

const DayBody = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  background: ${({ theme }) => theme.colors.surface};
  min-width: 0;
`;

const MealRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
  > div:last-child { min-width: 0; flex: 1; }
`;

const MealCircle = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: ${({ $color }) => `${$color}22`};
  color: ${({ $color }) => $color};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const MealLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 2px;

  @media (max-width: 600px) {
    font-size: 9px;
  }
`;

const MealDescription = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @media (max-width: 600px) {
    font-size: 11.5px;
  }
`;

const ContextCardWrap = styled.button`
  border: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 16px;
  text-align: left;
  cursor: pointer;
  background: ${({ $bg }) => $bg};
  color: #fff;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  &:hover { transform: translateY(-2px); transition: transform .15s; }
`;

const ContextLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
`;

const ContextRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  min-width: 0;
  justify-content: flex-end;
`;

const ContextStat = styled.div`
  text-align: center;
  font-size: 11px;
  strong { display: block; font-size: 18px; }

  @media (max-width: 600px) {
    font-size: 10px;
    strong { font-size: 16px; }
  }
`;

const RefCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const RefHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 14px;

  @media (max-width: 600px) {
    font-size: 13px;
    gap: 8px;
  }
`;

const Collapsible = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 600;
`;

const Table = styled.table`
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 12px;
  th, td {
    padding: 6px 8px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    text-align: left;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
    vertical-align: top;
  }
  th { background: ${({ theme }) => theme.colors.backgroundAlt}; font-weight: 600; }
  td:first-child { min-width: 0; }
  tr:nth-child(even) td { background: #fafbfd; }
`;

const Bullet = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.primary};
    margin-top: 7px;
    flex-shrink: 0;
  }
`;

const TimelineItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: 0; }
`;

const TimelineCircle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: ${({ $color, theme }) => $color || theme.colors.primary};
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SupplementCard = styled.div`
  display: flex;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: 0; }
`;

const ModalOptionItem = styled.div`
  display: flex;
  gap: 10px;
  padding: 6px 0;
  align-items: flex-start;
`;

const OptionNumber = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: ${({ $color }) => `${$color}22`};
  color: ${({ $color }) => $color};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
`;

// ---------- subcomponents ----------
const MEAL_ICON_MAP = {
  breakfast: MdFreeBreakfast,
  mid_morning: MdLocalCafe,
  snacks: MdFastfood,
};

const MEAL_BG = {
  breakfast: GRAD_ORANGE,
  mid_morning: GRAD_PURPLE,
  snacks: GRAD_BLUE,
};

function MealTypeCard({ mealKey, mealData, onClick, t }) {
  const Icon = MEAL_ICON_MAP[mealKey] || MdRestaurant;
  const titles = {
    breakfast: t('nutrition.meals.breakfasts'),
    mid_morning: t('nutrition.meals.midMorning'),
    snacks: t('nutrition.meals.snacks'),
  };
  return (
    <MealTile $bg={MEAL_BG[mealKey]} onClick={onClick}>
      <Icon size={28} />
      <MealTileTitle>{titles[mealKey]}</MealTileTitle>
      <MealTileCount>
        {mealData.length} {mealKey === 'breakfast' ? t('nutrition.edit.types', 'tipos') : t('nutrition.edit.options', 'opciones')}
      </MealTileCount>
    </MealTile>
  );
}

function DayCard({ dayData, onClick, t }) {
  const restTag = t('nutrition.tags.rest');
  const isRest = dayData.tag === restTag;
  return (
    <DayCardWrap onClick={onClick}>
      <DayCardHeader $rest={isRest}>
        <div>
          <DayName>{dayData.day}</DayName>
          <DayTag>{dayData.tag}</DayTag>
        </div>
        <MdChevronRight size={24} />
      </DayCardHeader>
      <DayBody>
        <MealRow>
          <MealCircle $color={MEAL_COLORS.lunch}><MdRestaurant size={18} /></MealCircle>
          <div>
            <MealLabel>{t('nutrition.meals.lunch')}</MealLabel>
            <MealDescription>{dayData.lunch}</MealDescription>
          </div>
        </MealRow>
        <MealRow>
          <MealCircle $color={MEAL_COLORS.dinner}><MdDinnerDining size={18} /></MealCircle>
          <div>
            <MealLabel>{t('nutrition.meals.dinner')}</MealLabel>
            <MealDescription>{dayData.dinner}</MealDescription>
          </div>
        </MealRow>
      </DayBody>
    </DayCardWrap>
  );
}

function ContextCard({ contextData, onClick, t }) {
  const bg = contextData.icon === 'fitness-center' ? GRAD_GREEN
    : contextData.icon === 'weekend' ? GRAD_PURPLE
    : contextData.icon === 'sports-soccer' ? GRAD_ORANGE
    : GRAD_BLUE;
  return (
    <ContextCardWrap $bg={bg} onClick={onClick}>
      <ContextLeft>
        <MdRestaurant size={28} />
        <div style={{ fontWeight: 700, fontSize: 15 }}>{contextData.context}</div>
      </ContextLeft>
      <ContextRight>
        <ContextStat>
          <strong>{contextData.lunches.length}</strong>
          <span>{t('nutrition.meals.lunches', 'comidas')}</span>
        </ContextStat>
        <ContextStat>
          <strong>{contextData.dinners.length}</strong>
          <span>{t('nutrition.meals.dinners', 'cenas')}</span>
        </ContextStat>
        <MdChevronRight size={22} />
      </ContextRight>
    </ContextCardWrap>
  );
}

function QuantitiesSection({ data, t }) {
  const [expanded, setExpanded] = useState('carbs');
  const carbs = data?.quantities_gr?.carbohydrates || [];
  const proteins = data?.quantities_gr?.proteins || [];
  return (
    <RefCard>
      <RefHeader>
        <MdGrain color="#10b981" size={22} />
        {t('nutrition.reference.quantitiesTitle')}
      </RefHeader>
      <Collapsible onClick={() => setExpanded(expanded === 'carbs' ? '' : 'carbs')}>
        <span><MdGrain color="#f59e0b" /> {t('nutrition.reference.carbohydrates')}</span>
        {expanded === 'carbs' ? <MdExpandLess /> : <MdExpandMore />}
      </Collapsible>
      {expanded === 'carbs' && (
        <Table>
          <thead>
            <tr>
              <th>{t('nutrition.reference.food')}</th>
              <th>{t('nutrition.meals.lunch')}</th>
              <th>{t('nutrition.meals.dinner')}</th>
            </tr>
          </thead>
          <tbody>
            {carbs.map((it, i) => (
              <tr key={i}>
                <td>{it.name}{it.note ? <Muted> ({it.note})</Muted> : null}</td>
                <td>{it.lunch}g</td>
                <td>{it.dinner === 0 ? '—' : `${it.dinner}g`}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Collapsible onClick={() => setExpanded(expanded === 'proteins' ? '' : 'proteins')}>
        <span>🥩 {t('nutrition.reference.proteins')}</span>
        {expanded === 'proteins' ? <MdExpandLess /> : <MdExpandMore />}
      </Collapsible>
      {expanded === 'proteins' && (
        <Table>
          <thead>
            <tr>
              <th>{t('nutrition.reference.food')}</th>
              <th>{t('nutrition.meals.lunch')}</th>
              <th>{t('nutrition.meals.dinner')}</th>
            </tr>
          </thead>
          <tbody>
            {proteins.map((it, i) => (
              <tr key={i}>
                <td>{it.name}</td>
                <td>{it.lunch}{it.unit || 'g'}</td>
                <td>{it.dinner}{it.unit || 'g'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </RefCard>
  );
}

function SupplementsSection({ data, t }) {
  return (
    <RefCard>
      <RefHeader>
        <MdMedication color="#3949ab" size={22} />
        {t('nutrition.reference.supplementsTitle', t('nutrition.reference.supplements', 'Suplementos'))}
      </RefHeader>
      {(data?.supplements || []).map((s, i) => (
        <SupplementCard key={i}>
          <MdMedication size={20} color="#1a237e" />
          <div>
            <div style={{ fontWeight: 600 }}>{s.name}</div>
            <Muted>{s.description}</Muted>
          </div>
        </SupplementCard>
      ))}
    </RefCard>
  );
}

function MatchProtocolSection({ data, t }) {
  const steps = data?.match_day_protocol?.steps || [];
  return (
    <RefCard>
      <RefHeader>
        <MdSportsSoccer color="#f59e0b" size={22} />
        {t('nutrition.reference.matchProtocolTitle', t('nutrition.reference.matchProtocol', 'Protocolo partido'))}
      </RefHeader>
      {steps.map((step, i) => (
        <TimelineItem key={i}>
          <TimelineCircle $color={step.color}>
            <MdSchedule size={16} />
          </TimelineCircle>
          <div>
            <div style={{ fontWeight: 600 }}>{step.time}</div>
            <Muted>{step.description}</Muted>
          </div>
        </TimelineItem>
      ))}
    </RefCard>
  );
}

function HydrationSection({ data, t }) {
  return (
    <RefCard>
      <RefHeader>
        <MdWaterDrop color="#00bcd4" size={22} />
        {t('nutrition.reference.hydrationTitle', t('nutrition.reference.hydration', 'Hidratación'))}
      </RefHeader>
      {(data?.hydration_tips || []).map((tip, i) => (
        <Bullet key={i}>{tip}</Bullet>
      ))}
    </RefCard>
  );
}

// ---------- detail modals ----------
function DayDetailModal({ open, onClose, dayData, t }) {
  if (!dayData) return null;
  const restTag = t('nutrition.tags.rest');
  const isRest = dayData.tag === restTag;
  return (
    <Modal open={open} onClose={onClose} title={`${dayData.day} · ${dayData.tag}`} width={560}>
      <Stack $gap={12}>
        <div style={{
          padding: 12,
          borderRadius: 8,
          background: isRest ? GRAD_PURPLE : GRAD_GREEN,
          color: '#fff',
          fontWeight: 600,
        }}>
          {isRest ? t('nutrition.tags.rest') : t('nutrition.tags.training', dayData.tag)}
        </div>
        <RefCard>
          <RefHeader>
            <MealCircle $color={MEAL_COLORS.lunch}><MdRestaurant size={18} /></MealCircle>
            {t('nutrition.meals.lunch')}
          </RefHeader>
          <div>{dayData.lunch}</div>
        </RefCard>
        <RefCard>
          <RefHeader>
            <MealCircle $color={MEAL_COLORS.dinner}><MdDinnerDining size={18} /></MealCircle>
            {t('nutrition.meals.dinner')}
          </RefHeader>
          <div>{dayData.dinner}</div>
        </RefCard>
      </Stack>
    </Modal>
  );
}

function ContextDetailModal({ open, onClose, contextData, t }) {
  if (!contextData) return null;
  return (
    <Modal open={open} onClose={onClose} title={contextData.context} width={620}>
      <Stack $gap={12}>
        <RefCard>
          <RefHeader>
            <MealCircle $color={MEAL_COLORS.lunch}><MdRestaurant size={18} /></MealCircle>
            {t('nutrition.meals.lunchOptions', t('nutrition.meals.lunches', 'Comidas'))}
          </RefHeader>
          {contextData.lunches.map((lunch, i) => (
            <ModalOptionItem key={i}>
              <OptionNumber $color={MEAL_COLORS.lunch}>{i + 1}</OptionNumber>
              <div>{lunch}</div>
            </ModalOptionItem>
          ))}
        </RefCard>
        <RefCard>
          <RefHeader>
            <MealCircle $color={MEAL_COLORS.dinner}><MdDinnerDining size={18} /></MealCircle>
            {t('nutrition.meals.dinnerOptions', t('nutrition.meals.dinners', 'Cenas'))}
          </RefHeader>
          {contextData.dinners.map((dinner, i) => (
            <ModalOptionItem key={i}>
              <OptionNumber $color={MEAL_COLORS.dinner}>{i + 1}</OptionNumber>
              <div>{dinner}</div>
            </ModalOptionItem>
          ))}
        </RefCard>
      </Stack>
    </Modal>
  );
}

function MealDetailModal({ open, onClose, mealKey, mealData, t }) {
  if (!mealData) return null;
  const titles = {
    breakfast: t('nutrition.meals.breakfasts'),
    mid_morning: t('nutrition.meals.midMorning'),
    snacks: t('nutrition.meals.snacks'),
  };
  return (
    <Modal open={open} onClose={onClose} title={titles[mealKey]} width={620}>
      <Stack $gap={10}>
        {mealData.map((item, i) => (
          <RefCard key={i}>
            <RefHeader>{item.type || item.condition}</RefHeader>
            {(item.items || []).map((food, j) => (
              <Bullet key={`f-${j}`}>{food}</Bullet>
            ))}
            {(item.options || []).map((opt, j) => (
              <ModalOptionItem key={`o-${j}`}>
                <OptionNumber $color="#1a237e">{j + 1}</OptionNumber>
                <div>{opt}</div>
              </ModalOptionItem>
            ))}
          </RefCard>
        ))}
      </Stack>
    </Modal>
  );
}

// ---------- main ----------
export default function Nutrition() {
  const { t } = useTranslation();
  const userId = useSelector((s) => s.usuario.user?._id);

  const [activeTab, setActiveTab] = useState('preseason');
  const [viewMode, setViewMode] = useState('recommended');
  const [recommendedOption, setRecommendedOption] = useState(1);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showManager, setShowManager] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedContext, setSelectedContext] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState({ key: null, data: null });

  const customData = useMemo(
    () => (selectedPlanId ? plans.find((p) => p._id === selectedPlanId) || null : null),
    [plans, selectedPlanId],
  );

  const defaultPreseasonData = useMemo(() => getPreSeasonData(t), [t]);
  const defaultSeasonData = useMemo(() => getSeasonData(t), [t]);
  const defaultReferenceData = useMemo(() => getReferenceData(t), [t]);
  const defaultPreseasonDataOpt2 = useMemo(() => getPreSeasonDataOption2(t), [t]);
  const defaultSeasonDataOpt2 = useMemo(() => getSeasonDataOption2(t), [t]);

  const currentPreseasonData = viewMode === 'custom' && customData?.preseason
    ? customData.preseason
    : recommendedOption === 2 ? defaultPreseasonDataOpt2 : defaultPreseasonData;
  const currentSeasonData = viewMode === 'custom' && customData?.season
    ? customData.season
    : recommendedOption === 2 ? defaultSeasonDataOpt2 : defaultSeasonData;
  const currentReferenceData = viewMode === 'custom' && customData?.reference
    ? customData.reference
    : defaultReferenceData;

  // Load plans
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await getAllNutritionPlans(userId);
        if (!alive) return;
        const arr = Array.isArray(data) ? data : data ? [data] : [];
        setPlans(arr);
        if (arr.length > 0) {
          setSelectedPlanId(arr[0]._id);
          setViewMode('custom');
        }
      } catch (e) {
        console.error('load nutrition plans', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const handleGeneratePDF = () => {
    const optionLabel = viewMode === 'recommended' ? `${t('nutrition.option', 'Opción')} ${recommendedOption}` : null;
    generateNutritionPdf(currentPreseasonData, currentSeasonData, currentReferenceData, t, optionLabel);
  };

  const handleSelectRecommended = () => {
    setViewMode('recommended');
    setSelectedPlanId(null);
    setShowManager(false);
  };

  const handleSelectPlan = (id) => {
    setSelectedPlanId(id);
    setViewMode('custom');
    setShowManager(false);
  };

  const handleCreateFromRecommended = async () => {
    try {
      const newPlan = {
        user: userId,
        name: plans.length === 0
          ? t('nutrition.titles.myNutritionalPlan', 'Mi plan nutricional')
          : `${t('nutrition.titles.myNutritionalPlan', 'Mi plan nutricional')} ${plans.length + 1}`,
        isCustom: true,
        preseason: JSON.parse(JSON.stringify(defaultPreseasonData)),
        season: JSON.parse(JSON.stringify(defaultSeasonData)),
        reference: JSON.parse(JSON.stringify(defaultReferenceData)),
      };
      const { data } = await createNutrition(newPlan);
      setPlans((prev) => [data, ...prev]);
      setSelectedPlanId(data._id);
      setViewMode('custom');
      setShowManager(false);
      toast.success(t('nutrition.alerts.customPlanCreated', 'Plan creado'));
      setEditingPlan(data);
      setShowEdit(true);
    } catch (e) {
      console.error(e);
      toast.error(t('nutrition.alerts.couldNotCreatePlan', 'No se pudo crear el plan'));
    }
  };

  const handleCreateEmpty = async () => {
    try {
      const empty = getEmptyPlanStructure(t, userId);
      if (plans.length > 0) {
        empty.name = `${t('nutrition.titles.myNutritionalPlan', 'Mi plan nutricional')} ${plans.length + 1}`;
      }
      const { data } = await createNutrition(empty);
      setPlans((prev) => [data, ...prev]);
      setSelectedPlanId(data._id);
      setViewMode('custom');
      setShowManager(false);
      toast.success(t('nutrition.alerts.emptyPlanCreated', 'Plan vacío creado'));
      setEditingPlan(data);
      setShowEdit(true);
    } catch (e) {
      console.error(e);
      toast.error(t('nutrition.alerts.couldNotCreateEmptyPlan', 'No se pudo crear plan vacío'));
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setShowEdit(true);
    setShowManager(false);
  };

  const handleDuplicatePlan = async (plan) => {
    try {
      const { data } = await duplicateNutritionPlan(plan._id);
      setPlans((prev) => [data, ...prev]);
      setSelectedPlanId(data._id);
      setViewMode('custom');
      toast.success(t('nutrition.alerts.planDuplicated', 'Plan duplicado'));
    } catch (e) {
      console.error(e);
      toast.error(t('nutrition.alerts.couldNotDuplicatePlan', 'No se pudo duplicar'));
    }
  };

  const handleDeletePlan = async (plan) => {
    const ok = await confirmAction(
      `${t('nutrition.alerts.deletePlanConfirm', '¿Eliminar plan?')} "${plan.name || ''}"`,
    );
    if (!ok) return;
    try {
      await deleteNutritionPlan(plan._id);
      const remaining = plans.filter((p) => p._id !== plan._id);
      setPlans(remaining);
      if (remaining.length > 0) {
        setSelectedPlanId(remaining[0]._id);
      } else {
        setSelectedPlanId(null);
        setViewMode('recommended');
      }
      toast.success(t('nutrition.alerts.planDeleted', 'Plan eliminado'));
    } catch (e) {
      console.error(e);
      toast.error(t('nutrition.alerts.couldNotDeletePlan', 'No se pudo eliminar'));
    }
  };

  const handleSavedPlan = (data) => {
    setPlans((prev) => prev.map((p) => (p._id === data._id ? data : p)));
  };

  if (loading) {
    return <Container><Muted>{t('nutrition.loading', 'Cargando...')}</Muted></Container>;
  }

  const renderPreseason = () => (
    <Stack $gap={12}>
      <SeasonHeader $variant="preseason">
        <MdFitnessCenter size={22} /> {currentPreseasonData.title}
      </SeasonHeader>
      <SectionTitle>🍳 {t('nutrition.edit.dailyMeals', 'Comidas diarias')}</SectionTitle>
      <HScroll>
        <MealTypeCard mealKey="breakfast" mealData={currentPreseasonData.meals.breakfast}
          onClick={() => setSelectedMeal({ key: 'breakfast', data: currentPreseasonData.meals.breakfast })} t={t} />
        <MealTypeCard mealKey="mid_morning" mealData={currentPreseasonData.meals.mid_morning}
          onClick={() => setSelectedMeal({ key: 'mid_morning', data: currentPreseasonData.meals.mid_morning })} t={t} />
        <MealTypeCard mealKey="snacks" mealData={currentPreseasonData.meals.snacks}
          onClick={() => setSelectedMeal({ key: 'snacks', data: currentPreseasonData.meals.snacks })} t={t} />
      </HScroll>
      <SectionTitle>📅 {t('nutrition.edit.weeklyMenu', 'Menú semanal')}</SectionTitle>
      <CardGrid>
        {currentPreseasonData.weekly_menu.map((d, i) => (
          <DayCard key={i} dayData={d} onClick={() => setSelectedDay(d)} t={t} />
        ))}
      </CardGrid>
    </Stack>
  );

  const renderSeason = () => (
    <Stack $gap={12}>
      <SeasonHeader $variant="season">
        <MdSportsSoccer size={22} /> {currentSeasonData.title}
      </SeasonHeader>
      <SectionTitle>🍳 {t('nutrition.edit.dailyMeals', 'Comidas diarias')}</SectionTitle>
      <HScroll>
        <MealTypeCard mealKey="breakfast" mealData={currentSeasonData.meals.breakfast}
          onClick={() => setSelectedMeal({ key: 'breakfast', data: currentSeasonData.meals.breakfast })} t={t} />
        <MealTypeCard mealKey="mid_morning" mealData={currentSeasonData.meals.mid_morning}
          onClick={() => setSelectedMeal({ key: 'mid_morning', data: currentSeasonData.meals.mid_morning })} t={t} />
        <MealTypeCard mealKey="snacks" mealData={currentSeasonData.meals.snacks}
          onClick={() => setSelectedMeal({ key: 'snacks', data: currentSeasonData.meals.snacks })} t={t} />
      </HScroll>
      <SectionTitle>📋 {t('nutrition.edit.menusByContext', 'Menús por contexto')}</SectionTitle>
      <Stack $gap={10}>
        {currentSeasonData.menu_options.map((c, i) => (
          <ContextCard key={i} contextData={c} onClick={() => setSelectedContext(c)} t={t} />
        ))}
      </Stack>
    </Stack>
  );

  const renderReference = () => (
    <Stack $gap={12}>
      <QuantitiesSection data={currentReferenceData} t={t} />
      <SupplementsSection data={currentReferenceData} t={t} />
      <MatchProtocolSection data={currentReferenceData} t={t} />
      <HydrationSection data={currentReferenceData} t={t} />
    </Stack>
  );

  return (
    <Container>
      <PageHeader>
        <PageTitle>{t('nutrition.title', 'Nutrición')}</PageTitle>
      </PageHeader>

      <TopBar>
        <ModePill $custom={viewMode === 'custom'} onClick={() => setShowManager(true)}>
          {viewMode === 'custom' ? <MdPerson size={18} /> : <MdAutoAwesome size={18} />}
          <span>
            {viewMode === 'custom' && customData
              ? customData.name || t('nutrition.viewMode.custom', 'Personalizado')
              : t('nutrition.viewMode.recommended', 'Recomendado')}
          </span>
          {plans.length > 0 && <Counter>{plans.length}</Counter>}
          <MdKeyboardArrowDown size={18} />
        </ModePill>
        <PdfBtn onClick={handleGeneratePDF}>
          <MdPictureAsPdf size={18} /> PDF
        </PdfBtn>
      </TopBar>

      {viewMode === 'recommended' && (
        <OptionRow>
          <OptionPill $active={recommendedOption === 1} onClick={() => setRecommendedOption(1)}>
            {t('nutrition.option', 'Opción')} 1
          </OptionPill>
          <OptionPill $active={recommendedOption === 2} onClick={() => setRecommendedOption(2)}>
            {t('nutrition.option', 'Opción')} 2
          </OptionPill>
        </OptionRow>
      )}

      <TabBar>
        <TabBtn $active={activeTab === 'preseason'} onClick={() => setActiveTab('preseason')}>
          <MdFitnessCenter size={16} /> {t('nutrition.tabs.preseason')}
        </TabBtn>
        <TabBtn $active={activeTab === 'season'} onClick={() => setActiveTab('season')}>
          <MdSportsSoccer size={16} /> {t('nutrition.tabs.season')}
        </TabBtn>
        <TabBtn $active={activeTab === 'reference'} onClick={() => setActiveTab('reference')}>
          <MdMenuBook size={16} /> {t('nutrition.tabs.reference')}
        </TabBtn>
      </TabBar>

      {activeTab === 'preseason' && renderPreseason()}
      {activeTab === 'season' && renderSeason()}
      {activeTab === 'reference' && renderReference()}

      <PlanManagerModal
        open={showManager}
        onClose={() => setShowManager(false)}
        plans={plans}
        selectedPlanId={selectedPlanId}
        viewMode={viewMode}
        onSelectRecommended={handleSelectRecommended}
        onSelectPlan={handleSelectPlan}
        onEditPlan={handleEditPlan}
        onDuplicatePlan={handleDuplicatePlan}
        onDeletePlan={handleDeletePlan}
        onCreateFromRecommended={handleCreateFromRecommended}
        onCreateEmpty={handleCreateEmpty}
      />

      <EditPlanModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        plan={editingPlan}
        onSaved={handleSavedPlan}
      />

      <DayDetailModal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        dayData={selectedDay}
        t={t}
      />
      <ContextDetailModal
        open={!!selectedContext}
        onClose={() => setSelectedContext(null)}
        contextData={selectedContext}
        t={t}
      />
      <MealDetailModal
        open={!!selectedMeal.key}
        onClose={() => setSelectedMeal({ key: null, data: null })}
        mealKey={selectedMeal.key}
        mealData={selectedMeal.data}
        t={t}
      />
    </Container>
  );
}
