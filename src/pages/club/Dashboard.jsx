import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { MdPersonAdd, MdShield, MdDelete, MdVisibility, MdLockOpen, MdLock, MdMail, MdEdit, MdCalendarMonth, MdSportsSoccer, MdRestaurant, MdLibraryBooks, MdSportsHandball } from 'react-icons/md';
import api from '@/api/client';
import { Card, Button, Field, Input, Label, Row, Stack, Badge, Muted, PageHeader, PageTitle, Divider } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { startSupervision, stopSupervision } from '@/store/slices/user/userSlice';
import { forgetWorkspace, selectWorkspace, setSupervisionWorkspaces } from '@/store/slices/workspace/workspaceSlice';
import { checkSubscription } from '@/store/slices/user/userThunks';
import { RESET_WORKSPACE } from '@/store/actionTypes';
import Modal from '@/ui/Modal';
import { isNative } from '@/platform/capacitor';
import TeamPermissionManager from './TeamPermissionManager';

const isDuplicateSeasonError = (error) => {
  const message = `${error?.message || ''} ${error?.response?.data?.mensaje || ''} ${error?.response?.data?.message || ''}`.toLowerCase();
  return error?.status === 409 || error?.response?.status === 409 || error?.code === 'DUPLICATE_ENTRY' || error?.code === 'SEASON_DUPLICATE' || error?.response?.data?.code === 'DUPLICATE_ENTRY' || error?.response?.data?.code === 'SEASON_DUPLICATE' || message.includes('ya existe') || message.includes('already exists') || message.includes('duplic');
};

const PaymentSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }
`;

const ResourcesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const ResourceCard = styled(Card)`
  padding: 20px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const ResourceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ResourceIconBox = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg || 'rgba(59, 130, 246, 0.1)'};
  color: ${({ $color }) => $color || '#3b82f6'};
`;

const ResourceTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const ResourceDescription = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.textSecondary};
  flex: 1;
`;

const StatCard = styled(Card)`
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.02)'};
  background: ${({ theme }) => theme.colors.surface};
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 4px;
    background: ${({ $color }) => $color || 'linear-gradient(90deg, #3b82f6, #60a5fa)'};
  }

  @media (max-width: 480px) {
    padding: 14px;
    border-radius: 12px;
  }
`;

const StatNumber = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  margin: 6px 0 2px;

  @media (max-width: 480px) {
    font-size: 22px;
  }
`;

const StatLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatIcon = styled.div`
  position: absolute;
  top: 14px;
  right: 14px;
  font-size: 30px;
  opacity: 0.1;
  color: ${({ theme }) => theme.colors.text};
`;

const TableContainer = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
`;

const Th = styled.th`
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 600;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.8px;

  @media (max-width: 600px) {
    padding: 10px 10px;
    font-size: 10px;

    &:nth-child(2) {
      display: none;
    }
  }
`;

const Td = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  vertical-align: middle;

  @media (max-width: 600px) {
    padding: 10px 10px;

    &:nth-child(2) {
      display: none;
    }
  }
`;

const MemberNameSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 13px;
  background-image: ${({ $src }) => $src ? `url(${$src})` : 'none'};
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
`;

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme, $type }) => {
    if ($type === 'danger') return theme.colors.error;
    if ($type === 'success') return '#10b981';
    if ($type === 'warning') return '#f59e0b';
    return theme.colors.border;
  }};
  background: ${({ theme, $type }) => {
    if ($type === 'danger') return 'rgba(239,68,68,0.08)';
    if ($type === 'success') return 'rgba(16,185,129,0.08)';
    if ($type === 'warning') return 'rgba(245,158,11,0.08)';
    return theme.colors.surface;
  }};
  color: ${({ theme, $type }) => {
    if ($type === 'danger') return theme.colors.error;
    if ($type === 'success') return '#10b981';
    if ($type === 'warning') return '#f59e0b';
    return theme.colors.text;
  }};
  cursor: pointer;
  transition: all 150ms ease;
  margin-right: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;

  &:hover {
    opacity: 0.8;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 600px) {
    padding: 4px 7px;
    font-size: 11px;
    gap: 3px;
    margin-right: 2px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ClubBanner = styled.div`
  background: ${({ theme }) => theme.mode === 'dark' ? 'linear-gradient(135deg, #1e293b, #0f172a)' : 'linear-gradient(135deg, #1e3a5f, #2563eb 60%, #3b82f6)'};
  border-radius: 16px;
  padding: 28px 24px;
  color: #fff;
  margin-bottom: 24px;
  box-shadow: ${({ theme }) => theme.mode === 'dark' ? 'none' : '0 4px 20px rgba(37,99,235,0.15)'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  @media (max-width: 480px) {
    padding: 20px 16px;
    border-radius: 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    margin-bottom: 16px;
  }
`;

const BannerActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;

  @media (max-width: 480px) {
    width: 100%;
  }
`;

const LicenseBar = styled.div`
  margin-top: 6px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.15);
  overflow: hidden;
  div {
    height: 100%;
    border-radius: 3px;
    background: ${({ $full }) => $full ? '#ef4444' : '#10b981'};
    transition: width 0.4s ease;
  }
`;

const ConfirmBox = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
`;

const Page = styled.div`
  width: 100%; min-width: 0; box-sizing: border-box; overflow-x: hidden;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 16px; }
  @media (max-width: 480px) { padding: 12px; }
`;

const InfoNotice = styled.div`
  background: rgba(59,130,246,0.06);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 16px;
  line-height: 1.5;
`;

const BillingNoticeBox = styled.div`
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(245, 158, 11, 0.03)'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)'};
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 14px;
`;

const BillingNoticeTitle = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? '#fbbf24' : '#d97706'};
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const CLUB_MIN_LICENSES = 5;
const PENDING_LICENSE_PAYMENT_KEY = 'xtramys:pendingLicensePayment';
const LICENSE_SCHEDULE_OVERRIDES_KEY = 'xtramys:licenseScheduleOverrides';

function toPositiveInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function toDateMs(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const raw = typeof value === 'number' && value < 10000000000 ? value * 1000 : value;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

function formatLicenseDate(value) {
  if (!value) return 'la renovación';
  const raw = typeof value === 'number' && value < 10000000000 ? value * 1000 : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return 'la renovación';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function getLicenseScheduleKey(subStatus, club) {
  const clubId = club?._id || club?.id || 'club';
  const subscriptionId = subStatus?.stripeSubscriptionId || subStatus?.subscriptionId || 'subscription';
  return `${clubId}:${subscriptionId}`;
}

function readLicenseScheduleOverrides(key) {
  if (!key) return {};
  try {
    const all = JSON.parse(localStorage.getItem(LICENSE_SCHEDULE_OVERRIDES_KEY) || '{}');
    return all[key] || {};
  } catch {
    return {};
  }
}

function writeLicenseScheduleOverrides(key, overrides) {
  if (!key) return;
  try {
    const all = JSON.parse(localStorage.getItem(LICENSE_SCHEDULE_OVERRIDES_KEY) || '{}');
    all[key] = overrides;
    localStorage.setItem(LICENSE_SCHEDULE_OVERRIDES_KEY, JSON.stringify(all));
  } catch {
    // Local persistence is only a UI fallback. Stripe/backend remains the source of truth.
  }
}

function batchMatchesOverride(batch, item) {
  if (!batch || !item) return false;
  const batchDate = toDateMs(batch.currentPeriodEnd);
  const itemDate = toDateMs(item.currentPeriodEnd);
  return (
    batch.id === item.batchId ||
    batch.subscriptionItemId === item.subscriptionItemId ||
    batch.stripeSubscriptionItemId === item.stripeSubscriptionItemId ||
    (batchDate !== Number.MAX_SAFE_INTEGER && batchDate === itemDate)
  );
}

function getOverrideCancelQuantity(batch, overrides) {
  const items = Array.isArray(overrides?.cancellations) ? overrides.cancellations : [];
  return items.reduce((total, item) => {
    if (toDateMs(item.currentPeriodEnd) < Date.now() - 24 * 60 * 60 * 1000) return total;
    return batchMatchesOverride(batch, item) ? total + toPositiveInt(item.quantity, 0) : total;
  }, 0);
}

function toCancellationPlanPayload(plan) {
  return plan.map((item) => ({
    batchId: item.id,
    subscriptionItemId: item.subscriptionItemId,
    stripeSubscriptionItemId: item.stripeSubscriptionItemId,
    currentPeriodEnd: item.currentPeriodEnd,
    cancelQuantity: item.cancelQuantity,
  }));
}

function mergeCancellationOverrides(overrides, plan) {
  const existing = Array.isArray(overrides?.cancellations) ? overrides.cancellations : [];
  const nextItems = [...existing];

  plan.forEach((item) => {
    const idx = nextItems.findIndex((candidate) => batchMatchesOverride(item, candidate));
    const quantity = toPositiveInt(item.cancelQuantity, 0);
    if (!quantity) return;

    if (idx >= 0) {
      nextItems[idx] = {
        ...nextItems[idx],
        quantity: Math.min(item.quantity || Number.MAX_SAFE_INTEGER, toPositiveInt(nextItems[idx].quantity, 0) + quantity),
      };
    } else {
      nextItems.push({
        batchId: item.id,
        subscriptionItemId: item.subscriptionItemId,
        stripeSubscriptionItemId: item.stripeSubscriptionItemId,
        currentPeriodEnd: item.currentPeriodEnd,
        quantity,
      });
    }
  });

  return {
    ...overrides,
    cancellations: nextItems.filter(item => toPositiveInt(item.quantity, 0) > 0),
    updatedAt: Date.now(),
  };
}

function subtractCancellationOverride(overrides, batch, quantity) {
  let remaining = toPositiveInt(quantity, 0);
  const existing = Array.isArray(overrides?.cancellations) ? overrides.cancellations : [];
  const cancellations = existing
    .map((item) => {
      if (!remaining || !batchMatchesOverride(batch, item)) return item;
      const itemQuantity = toPositiveInt(item.quantity, 0);
      const consumed = Math.min(itemQuantity, remaining);
      remaining -= consumed;
      return { ...item, quantity: itemQuantity - consumed };
    })
    .filter(item => toPositiveInt(item.quantity, 0) > 0);

  return { ...overrides, cancellations, updatedAt: Date.now() };
}

function normalizeLicenseBatches(subStatus, club, t, scheduleOverrides = {}) {
  const source =
    (Array.isArray(subStatus?.licenseBatches) && subStatus.licenseBatches) ||
    (Array.isArray(subStatus?.licenseRenewals) && subStatus.licenseRenewals) ||
    (Array.isArray(subStatus?.licenseGroups) && subStatus.licenseGroups) ||
    (Array.isArray(club?.licenseBatches) && club.licenseBatches) ||
    (Array.isArray(club?.licenseRenewals) && club.licenseRenewals) ||
    [];

  const mapped = source.map((batch, index) => {
    const quantity = toPositiveInt(
      batch.quantity ?? batch.total ?? batch.licenses ?? batch.maxUsers ?? batch.activeQuantity,
      0
    );
    const explicitRenewing = batch.renewingQuantity ?? batch.renewQuantity ?? batch.activeRenewingQuantity ?? batch.willRenewQuantity ?? batch.renewingLicenses;
    const backendCanceling = toPositiveInt(
      batch.cancelAtPeriodEndQuantity ??
      batch.cancelingQuantity ??
      batch.scheduledCancelQuantity ??
      batch.scheduledCancellationQuantity ??
      batch.pendingCancellationQuantity ??
      batch.pendingCancelQuantity ??
      batch.nonRenewingQuantity ??
      batch.willNotRenewQuantity ??
      batch.cancelQuantity ??
      (batch.cancelAtPeriodEnd ? quantity : 0),
      0
    );
    const currentPeriodEnd =
      batch.currentPeriodEnd || batch.periodEnd || batch.renewsAt || batch.renewalDate || batch.cancelAt || subStatus?.currentPeriodEnd;
    const baseBatch = {
      id: batch.id || batch._id || batch.subscriptionItemId || batch.stripeSubscriptionItemId || `batch-${index}`,
      subscriptionItemId: batch.subscriptionItemId || batch.stripeSubscriptionItemId || batch.id || batch._id,
      stripeSubscriptionItemId: batch.stripeSubscriptionItemId || batch.subscriptionItemId || batch.id || batch._id,
      currentPeriodEnd,
    };
    const explicitCancelingFromRenewing = explicitRenewing == null ? 0 : Math.max(0, quantity - toPositiveInt(explicitRenewing, 0));
    const overrideCanceling = getOverrideCancelQuantity(baseBatch, scheduleOverrides);
    const cancelingQuantity = Math.min(quantity, Math.max(backendCanceling, explicitCancelingFromRenewing, overrideCanceling));
    const renewingQuantity = Math.max(0, quantity - cancelingQuantity);

    return {
      ...baseBatch,
      label: batch.label || batch.name || (index === 0 ? t('clubDashboard.mainBlock', 'Bloque principal') : t('clubDashboard.additionalBlock', { num: index + 1 })),
      quantity,
      renewingQuantity,
      cancelingQuantity,
      canReactivate: Boolean(batch.canReactivate ?? cancelingQuantity > 0),
    };
  }).filter(batch => batch.quantity > 0);

  if (mapped.length > 0) {
    return mapped.sort((a, b) => toDateMs(a.currentPeriodEnd) - toDateMs(b.currentPeriodEnd));
  }

  const fallbackQuantity = toPositiveInt(club?.maxUsers ?? subStatus?.quantity ?? subStatus?.maxUsers, 0);
  if (!fallbackQuantity) return [];

  const fallbackBatch = {
    id: 'current-subscription',
    subscriptionItemId: subStatus?.subscriptionItemId || subStatus?.stripeSubscriptionItemId,
    stripeSubscriptionItemId: subStatus?.stripeSubscriptionItemId || subStatus?.subscriptionItemId,
    currentPeriodEnd: subStatus?.currentPeriodEnd,
  };
  const fallbackCanceling = Math.min(
    fallbackQuantity,
    Math.max(
      subStatus?.cancelAtPeriodEnd ? fallbackQuantity : 0,
      getOverrideCancelQuantity(fallbackBatch, scheduleOverrides)
    )
  );

  return [{
    ...fallbackBatch,
    label: t('clubDashboard.currentPlan'),
    quantity: fallbackQuantity,
    renewingQuantity: Math.max(0, fallbackQuantity - fallbackCanceling),
    cancelingQuantity: fallbackCanceling,
    canReactivate: Boolean(subStatus?.cancelAtPeriodEnd || fallbackCanceling > 0),
  }];
}

function createCancellationPlan(batches, cancelQuantity) {
  let remaining = Math.max(0, cancelQuantity);
  return [...batches]
    .sort((a, b) => toDateMs(a.currentPeriodEnd) - toDateMs(b.currentPeriodEnd))
    .map((batch) => {
      const available = Math.max(0, batch.renewingQuantity ?? batch.quantity);
      const quantity = Math.min(available, remaining);
      remaining -= quantity;
      return quantity > 0 ? { ...batch, cancelQuantity: quantity } : null;
    })
    .filter(Boolean);
}

function readPendingLicensePayment() {
  try {
    const raw = sessionStorage.getItem(PENDING_LICENSE_PAYMENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writePendingLicensePayment(payload) {
  sessionStorage.setItem(PENDING_LICENSE_PAYMENT_KEY, JSON.stringify(payload));
}

function clearPendingLicensePayment() {
  sessionStorage.removeItem(PENDING_LICENSE_PAYMENT_KEY);
}

function normalizeStripeInvoiceUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return String(value).split('?')[0];
  }
}

function getInvoiceCreatedMs(invoice) {
  const created = invoice?.created ?? invoice?.createdAt;
  if (!created) return 0;
  if (typeof created === 'number') return created > 100000000000 ? created : created * 1000;
  const createdMs = new Date(created).getTime();
  return Number.isFinite(createdMs) ? createdMs : 0;
}

function findPaidInvoiceForPendingPayment(invoices = [], pendingPayment = {}) {
  const pendingUrl = normalizeStripeInvoiceUrl(pendingPayment.paymentUrl);
  const startedAt = Number(pendingPayment.startedAt || 0);
  const minCreatedAt = startedAt ? startedAt - 5 * 60 * 1000 : 0;

  return invoices.find((invoice) => {
    if (invoice?.status !== 'paid') return false;
    if (pendingPayment.invoiceId && invoice.id === pendingPayment.invoiceId) return true;

    const hostedUrl = normalizeStripeInvoiceUrl(invoice.hostedUrl || invoice.hostedInvoiceUrl || invoice.url);
    if (pendingUrl && hostedUrl && pendingUrl === hostedUrl) return true;

    const createdMs = getInvoiceCreatedMs(invoice);
    return startedAt && createdMs >= minCreatedAt;
  });
}

export default function ClubDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Invite modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Deactivate/Remove confirm modal
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'deactivate'|'activate'|'remove', member }
  const [actionLoading, setActionLoading] = useState(false);

  // Subscription & Licenses management states
  const [subStatus, setSubStatus] = useState(null);
  // Upgrade modal
  const [isQtyOpen, setIsQtyOpen] = useState(false);
  const [newQty, setNewQty] = useState(6);
  const [updatingQty, setUpdatingQty] = useState(false);
  const pendingLicensePayment = isNative ? null : readPendingLicensePayment();
  const [isWaitingPayment, setIsWaitingPayment] = useState(Boolean(pendingLicensePayment?.targetQty));
  const [paymentUrl, setPaymentUrl] = useState(pendingLicensePayment?.paymentUrl || null);
  const [targetQty, setTargetQty] = useState(pendingLicensePayment?.targetQty || null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  // Upgrade inline price preview (auto-fetched)
  const [previewCost, setPreviewCost] = useState(null);     // number | null
  const [previewCurrency, setPreviewCurrency] = useState('eur');
  const [previewCardLast4, setPreviewCardLast4] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  // Reduce licenses modal
  const [isReduceOpen, setIsReduceOpen] = useState(false);
  const [reduceQty, setReduceQty] = useState(5);
  const [reducingQty, setReducingQty] = useState(false);
  const [selectedCoachIds, setSelectedCoachIds] = useState([]);
  // Cancel subscription modal, 2-step redesign
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelingSub, setCancelingSub] = useState(false);
  const [cancelStep, setCancelStep] = useState(1);          // 1 = choose type, 2 = pick users
  const [cancelType, setCancelType] = useState('partial'); // 'partial' | 'all'
  const [cancelKeepQty, setCancelKeepQty] = useState(5);   // licencias a mantener (type=partial)
  const [cancelSelectedIds, setCancelSelectedIds] = useState([]);
  const [reactivatingBatchId, setReactivatingBatchId] = useState(null);
  const [reactivationQtyByBatch, setReactivationQtyByBatch] = useState({});
  const [licenseScheduleOverrides, setLicenseScheduleOverrides] = useState({});
  const [isTeamEditorOpen, setIsTeamEditorOpen] = useState(false);
  const [clubTeam, setClubTeam] = useState(null);
  const [teamForm, setTeamForm] = useState({ nombre: '', escudo: null });
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);
  const [isSeasonOpen, setIsSeasonOpen] = useState(false);
  const [clubSeasonYear, setClubSeasonYear] = useState('');
  const [seasonSaving, setSeasonSaving] = useState(false);

  const handleOpenQtyModal = () => {
    const currentMax = data?.club?.maxUsers || CLUB_MIN_LICENSES;
    setNewQty(currentMax + 1);
    setPreviewCost(null);
    setIsQtyOpen(true);
  };

  const handleCloseQtyModal = () => {
    setIsQtyOpen(false);
    setPreviewCost(null);
  };

  const handleOpenReduceModal = () => {
    const currentMax = data?.club?.maxUsers || CLUB_MIN_LICENSES;
    setReduceQty(Math.max(CLUB_MIN_LICENSES, currentMax - 1));
    setSelectedCoachIds([]);
    setIsReduceOpen(true);
  };

  const handleCloseReduceModal = () => {
    setIsReduceOpen(false);
    setSelectedCoachIds([]);
  };

  const persistLicenseScheduleOverrides = (updater) => {
    const key = getLicenseScheduleKey(subStatus, data?.club);
    setLicenseScheduleOverrides((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeLicenseScheduleOverrides(key, next);
      return next;
    });
  };

  const fetchClubData = async () => {
    try {
      sessionStorage.removeItem('xtramys:club-manage-user');
      sessionStorage.removeItem('xtramys:club-supervision-user');
      sessionStorage.removeItem('xtramys:club-supervision-mode');
      sessionStorage.removeItem('xtramys:club-supervision-owner');
      sessionStorage.removeItem('xtramys:club-supervision-user-data');
      sessionStorage.removeItem('xtramys:club-supervision-active');
      dispatch(stopSupervision());
      const response = await api.get('/club/my-club');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching club data:', error);
      toast.error(error.message || t('connection.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartCoachSupervision = async (member, mode = 'view') => {
    try {
      const res = await api.get(`/user/${member._id}`);
      const coachUser = res.data?.usuario || res.data;
      if (!coachUser?._id) {
        throw new Error(t('connection.loadError', 'Error al cargar los datos del entrenador'));
      }

      // Resolvemos primero los equipos mientras el panel sigue estable. Si
      // activamos la supervisión antes, WorkspaceGate alcanza a leer los
      // workspaces del director y abre el selector con datos incorrectos.
      const workspacesRes = await api.get(`/club/workspaces?userId=${encodeURIComponent(coachUser._id)}`);
      const workspaces = workspacesRes.data?.workspaces || [];
      const managing = mode === 'manage';
      const target = workspaces.length === 1 ? workspaces[0] : null;
      const teamId = target?.team?._id || target?.teamId;
      const selected = target ? {
        ...target,
        teamId,
        permission: managing ? 'manage' : 'view',
        historical: false,
        canWrite: managing,
      } : null;

      const directorId = data?.club?.ownerUserId || coachUser.clubId;
      sessionStorage.setItem('xtramys:club-supervision-owner', directorId);
      sessionStorage.setItem('xtramys:club-supervision-user', coachUser._id);
      sessionStorage.setItem('xtramys:club-supervision-user-data', JSON.stringify(coachUser));
      sessionStorage.setItem('xtramys:club-supervision-mode', mode);
      sessionStorage.setItem('xtramys:club-supervision-active', '1');
      sessionStorage.setItem('xtramys:club-manage-user', coachUser._id);
      dispatch({ type: RESET_WORKSPACE });
      dispatch(setSupervisionWorkspaces({ items: workspaces, selected }));
      dispatch(startSupervision({ user: coachUser, mode }));

      if (workspaces.length === 1) {
        navigate('/app', { replace: true });
      } else if (workspaces.length > 1) {
        navigate('/team-select', {
          replace: true,
          state: { from: { pathname: '/app' }, clubSupervision: true },
        });
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err) {
      console.error('Error starting supervision:', err);
      toast.error(
        err?.status === 403
          ? t('clubDashboard.pendingInviteAccessDenied', 'El entrenador aun no ha aceptado la invitacion del club.')
          : (err.message || t('connection.loadError', 'Error al cargar los datos del entrenador'))
      );
    }
  };

  const fetchSubStatus = async () => {
    try {
      const response = await api.get('/stripe/subscription-status');
      setSubStatus(response.data);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    }
  };

  const handleOpenTeamEditor = async () => {
    const ownerUserId = data?.club?.ownerUserId;
    if (!ownerUserId) {
      toast.error('No se pudo identificar el equipo del club.');
      return;
    }

    setIsTeamEditorOpen(true);
    setTeamLoading(true);
    try {
      const seasonsResponse = await api.get(`/season/user/${ownerUserId}`);
      const seasons = Array.isArray(seasonsResponse.data) ? seasonsResponse.data : [];
      const clubSeason = seasons.find((season) => season.seleccionada) || seasons[0];
      if (!clubSeason?._id) {
        throw new Error('No hay temporada del club disponible.');
      }

      const teamsResponse = await api.get(`/team/season/${clubSeason._id}`);
      const teams = Array.isArray(teamsResponse.data) ? teamsResponse.data : [];
      const ownerTeam = teams.find((team) => String(team.usuario) === String(ownerUserId)) || teams[0];
      if (!ownerTeam?._id) {
        throw new Error('No se encontrÃ³ el equipo asociado a la temporada del club.');
      }

      setClubTeam(ownerTeam);
      setTeamForm({
        nombre: ownerTeam.nombre || '',
        escudo: ownerTeam.escudo || null,
      });
    } catch (error) {
      setIsTeamEditorOpen(false);
      toast.error(error.message || 'No se pudo cargar el equipo del club.');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleTeamBadgeChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setTeamForm((prev) => ({ ...prev, escudo: reader.result }));
    };
    reader.onerror = () => {
      toast.error('No se pudo leer el escudo seleccionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveClubTeam = async (event) => {
    event.preventDefault();
    if (!clubTeam?._id) return;

    const nombre = teamForm.nombre.trim();
    if (!nombre) {
      toast.error('El nombre del equipo es obligatorio.');
      return;
    }

    setTeamSaving(true);
    try {
      await api.post(`/team/${clubTeam._id}`, {
        nombre,
        escudo: teamForm.escudo || null,
      });
      toast.success('Equipo del club actualizado.');
      setIsTeamEditorOpen(false);
      setClubTeam(null);
    } catch (error) {
      toast.error(error.response?.data?.mensaje || error.message || 'No se pudo guardar el equipo del club.');
    } finally {
      setTeamSaving(false);
    }
  };

  const handleCreateClubSeason = async (event) => {
    event.preventDefault();
    const year = clubSeasonYear.trim();
    if (!year) {
      toast.error('La temporada es obligatoria.');
      return;
    }
    try {
      setSeasonSaving(true);
      const response = await api.post('/club/season', { año: year });
      toast.success(response.data?.createdForUsers > 1
        ? `Temporada creada para ${response.data.createdForUsers} usuarios.`
        : 'Temporada creada.');
      setIsSeasonOpen(false);
      setClubSeasonYear('');
      fetchClubData();
    } catch (error) {
      toast.error(isDuplicateSeasonError(error) ? t('season.duplicateSeasonError') : (error.response?.data?.mensaje || error.message || 'No se pudo crear la temporada.'));
    } finally {
      setSeasonSaving(false);
    }
  };

  const finishPendingLicensePayment = () => {
    setIsWaitingPayment(false);
    setPaymentUrl(null);
    setTargetQty(null);
    clearPendingLicensePayment();
  };

  const applyPaidLicenseState = (clubData, subscriptionData, paidInvoice) => {
    const nextTargetQty = Number(targetQty || 0);
    if (!nextTargetQty) return;

    if (clubData?.club) {
      setData({
        ...clubData,
        club: {
          ...clubData.club,
          maxUsers: Math.max(Number(clubData.club.maxUsers || 0), nextTargetQty),
        },
      });
    }

    setSubStatus({
      ...subscriptionData,
      maxUsers: Math.max(Number(subscriptionData?.maxUsers || 0), nextTargetQty),
      invoices: subscriptionData?.invoices || subStatus?.invoices || (paidInvoice ? [paidInvoice] : []),
    });
  };

  const syncPaidLicensePayment = async (paidInvoice) => {
    const payload = {
      quantity: Number(targetQty),
      targetQty: Number(targetQty),
      invoiceId: paidInvoice?.id || null,
      hostedInvoiceUrl: paidInvoice?.hostedUrl || paidInvoice?.hostedInvoiceUrl || paymentUrl || null,
    };

    const endpoints = [
      '/stripe/confirm-license-payment',
      '/stripe/sync-subscription',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await api.post(endpoint, payload);
        return response.data || {};
      } catch (error) {
        if (error?.status !== 404) {
          console.warn(`License payment sync failed at ${endpoint}:`, error);
        }
      }
    }

    return null;
  };

  const verifyPendingLicensePayment = async ({ silent = false } = {}) => {
    if (!targetQty) return false;
    if (!silent) setCheckingPayment(true);

    try {
      const [subResponse, clubResponse] = await Promise.all([
        api.get('/stripe/subscription-status'),
        api.get('/club/my-club'),
      ]);

      const subscriptionData = subResponse.data || {};
      const clubData = clubResponse.data || null;
      const subscriptionMaxUsers = Number(subscriptionData.maxUsers ?? subscriptionData.clubMaxUsers ?? 0);
      const clubMaxUsers = Number(clubData?.club?.maxUsers ?? 0);
      const hasExpectedLicenses = Math.max(subscriptionMaxUsers, clubMaxUsers) >= Number(targetQty);
      const pendingPayment = readPendingLicensePayment() || { paymentUrl, targetQty };
      const paidInvoice = findPaidInvoiceForPendingPayment(subscriptionData.invoices || [], pendingPayment);

      setSubStatus(subscriptionData);
      if (clubData?.club) setData(clubData);

      if (hasExpectedLicenses) {
        toast.success('Pago confirmado. Tus nuevas licencias ya están activas.');
        finishPendingLicensePayment();
        dispatch(checkSubscription());
        return true;
      }

      if (paidInvoice) {
        const syncResult = await syncPaidLicensePayment(paidInvoice);
        if (syncResult?.club || syncResult?.subscriptionStatus) {
          try {
            const [freshSub, freshClub] = await Promise.all([
              api.get('/stripe/subscription-status'),
              api.get('/club/my-club'),
            ]);
            subscriptionData.invoices = freshSub.data?.invoices || subscriptionData.invoices;
            applyPaidLicenseState(freshClub.data, freshSub.data || subscriptionData, paidInvoice);
          } catch {
            applyPaidLicenseState(clubData, subscriptionData, paidInvoice);
          }
        } else {
          applyPaidLicenseState(clubData, subscriptionData, paidInvoice);
        }
        toast.success('Pago confirmado. Tus nuevas licencias ya están activas.');
        finishPendingLicensePayment();
        dispatch(checkSubscription());
        return true;
      }

      if (!silent) {
        toast.info('Stripe aún no ha confirmado la factura. Espera unos segundos y vuelve a verificar.');
      }
      return false;
    } catch (error) {
      console.error('Error verifying license payment:', error);
      if (!silent) {
        toast.error(error.message || 'No se pudo verificar el pago. Inténtalo de nuevo.');
      }
      return false;
    } finally {
      if (!silent) setCheckingPayment(false);
    }
  };

  useEffect(() => {
    fetchClubData();
    fetchSubStatus();
  }, []);

  useEffect(() => {
    if (!isWaitingPayment || !targetQty) return;

    let intervalId;
    let isSubscribed = true;

    const pollStatus = async () => {
      if (!isSubscribed) return;
      await verifyPendingLicensePayment({ silent: true });
    };

    pollStatus();
    intervalId = setInterval(pollStatus, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [isWaitingPayment, targetQty, dispatch]);

  useEffect(() => {
    if (data?.club?.maxUsers && !isQtyOpen) {
      setNewQty(data.club.maxUsers + 1);
    }
  }, [data]);

  useEffect(() => {
    if (!data?.club || !subStatus) return;
    setLicenseScheduleOverrides(readLicenseScheduleOverrides(getLicenseScheduleKey(subStatus, data.club)));
  }, [data?.club?._id, data?.club?.id, subStatus?.stripeSubscriptionId, subStatus?.subscriptionId]);

  // Auto-fetch price preview when upgrade modal is open and quantity changes
  useEffect(() => {
    if (!isQtyOpen) return;
    const currentMax = data?.club?.maxUsers || 0;
    if (newQty <= currentMax) { setPreviewCost(null); return; }

    setLoadingPreview(true);
    setPreviewCost(null);
    const timer = setTimeout(async () => {
      try {
        const res = await api.post('/stripe/preview-licenses', { quantity: newQty });
        setPreviewCost(res.data.cost);
        setPreviewCurrency(res.data.currency || 'eur');
        setPreviewCardLast4(res.data.cardLast4 || null);
      } catch {
        setPreviewCost(null);
      } finally {
        setLoadingPreview(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [newQty, isQtyOpen]);

  const handleOpenCancelModal = () => {
    const currentMax = data?.club?.maxUsers || CLUB_MIN_LICENSES;
    setCancelStep(1);
    setCancelType(currentMax > CLUB_MIN_LICENSES ? 'partial' : 'all');
    setCancelKeepQty(Math.max(CLUB_MIN_LICENSES, currentMax - 1));
    setCancelSelectedIds([]);
    setIsCancelOpen(true);
  };

  const handleCloseCancelModal = () => {
    setIsCancelOpen(false);
    setCancelStep(1);
    setCancelType('partial');
    setCancelSelectedIds([]);
  };

  const handleCancelNext = () => {
    if (cancelType === 'all') {
      // Skip to confirmation directly (step 2 = confirm all)
      setCancelStep(2);
      return;
    }
    const currentMax = data?.club?.maxUsers || CLUB_MIN_LICENSES;
    if (currentMax <= CLUB_MIN_LICENSES) {
      toast.error(`Con ${CLUB_MIN_LICENSES} licencias solo puedes cancelar toda la suscripción o mantenerla.`);
      return;
    }
    if (cancelKeepQty < CLUB_MIN_LICENSES || cancelKeepQty >= currentMax) {
      toast.error(`Debes mantener al menos ${CLUB_MIN_LICENSES} licencias y cancelar como mínimo una.`);
      return;
    }
    const activeTeams = (data?.teams || []).filter((team) => team.licenseActive !== false);
    const needToFree = Math.max(0, activeTeams.length - cancelKeepQty);
    if (needToFree > 0) {
      setCancelSelectedIds([]);
      setCancelStep(2);
    } else {
      // No conflict, go straight to confirm step
      setCancelStep(2);
    }
  };

  const handleCancelSubscription = async () => {
    const currentMax = data?.club?.maxUsers || CLUB_MIN_LICENSES;
    const cancelQuantity = cancelType === 'partial' ? currentMax - cancelKeepQty : currentMax;

    if (cancelType === 'partial' && (currentMax <= CLUB_MIN_LICENSES || cancelQuantity <= 0)) {
      toast.error(`Con ${CLUB_MIN_LICENSES} licencias no puedes cancelar parcialmente. Cancela todo o mantenlas.`);
      return;
    }

    setCancelingSub(true);
    try {
      const cancellationPlan = createCancellationPlan(licenseBatches, cancelQuantity);
      if (cancelType === 'all') {
        await api.post('/stripe/cancel-subscription', {
          effectiveAtPeriodEnd: true,
          strategy: 'all_batches_at_period_end',
          minRenewingLicenses: CLUB_MIN_LICENSES,
          cancellationPlan: toCancellationPlanPayload(cancellationPlan),
        });
        toast.success('Cancelación programada. Mantendrás el acceso hasta la renovación de cada bloque.');
      } else {
        const activeTeams = (data?.teams || []).filter((team) => team.licenseActive !== false);
        const needToFree = Math.max(0, activeTeams.length - cancelKeepQty);
        await api.post('/stripe/cancel-licenses', {
          quantity: cancelKeepQty,
          keepQuantity: cancelKeepQty,
          cancelQuantity,
          effectiveAtPeriodEnd: true,
          strategy: 'earliest_period_end_first',
          minRenewingLicenses: CLUB_MIN_LICENSES,
          cancellationPlan: toCancellationPlanPayload(cancellationPlan),
          teamsToDeactivate: needToFree > 0 ? cancelSelectedIds : [],
        });
        toast.success(`Cancelación programada: ${cancelQuantity} licencia${cancelQuantity !== 1 ? 's' : ''} dejará${cancelQuantity !== 1 ? 'n' : ''} de renovar al vencimiento.`);
        fetchClubData();
      }
      persistLicenseScheduleOverrides((prev) => mergeCancellationOverrides(prev, cancellationPlan));
      handleCloseCancelModal();
      fetchSubStatus();
      dispatch(checkSubscription());
    } catch (error) {
      toast.error(error.response?.data?.mensaje || error.message || 'Error al cancelar');
    } finally {
      setCancelingSub(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setCancelingSub(true);
    try {
      await api.post('/stripe/reactivate-subscription');
      persistLicenseScheduleOverrides({ cancellations: [], updatedAt: Date.now() });
      toast.success('Suscripción reactivada correctamente.');
      fetchSubStatus();
      dispatch(checkSubscription());
    } catch (error) {
      toast.error(error.message || 'Error al reactivar la suscripción');
    } finally {
      setCancelingSub(false);
    }
  };

  const handleReactivateLicenseBatch = async (batch, quantity = 1) => {
    const maxQuantity = Math.max(1, batch.cancelingQuantity || 1);
    const requestedQuantity = Math.min(maxQuantity, Math.max(1, toPositiveInt(quantity, 1)));
    setReactivatingBatchId(batch.id);
    try {
      await api.post('/stripe/reactivate-licenses', {
        batchId: batch.id,
        subscriptionItemId: batch.subscriptionItemId,
        stripeSubscriptionItemId: batch.stripeSubscriptionItemId,
        currentPeriodEnd: batch.currentPeriodEnd,
        quantity: requestedQuantity,
        strategy: 'selected_batch_quantity',
        minRenewingLicenses: CLUB_MIN_LICENSES,
      });
      toast.success(requestedQuantity > 1 ? 'Licencias reactivadas correctamente.' : 'Licencia reactivada correctamente.');
      setReactivationQtyByBatch((prev) => ({ ...prev, [batch.id]: 1 }));
      persistLicenseScheduleOverrides((prev) => subtractCancellationOverride(prev, batch, requestedQuantity));
      fetchClubData();
      fetchSubStatus();
      dispatch(checkSubscription());
    } catch (error) {
      toast.error(error.response?.data?.mensaje || error.message || 'Error al reactivar la licencia');
    } finally {
      setReactivatingBatchId(null);
    }
  };

  const handleUpdateLicenses = async (e) => {
    e.preventDefault();
    const currentMax = data?.club?.maxUsers || 0;
    if (subStatus?.cancelAtPeriodEnd) {
            toast.error(t('clubDashboard.errorSubscriptionCancelledForPeriodEnd', 'La suscripción está cancelada para final de período. Reactívala antes de añadir licencias.'));
      return;
    }
    if (newQty < CLUB_MIN_LICENSES) {
            toast.error(t('clubDashboard.errorMinimumLicenses', 'El número mínimo es {{min}} licencias.', { min: CLUB_MIN_LICENSES }));
      return;
    }
    if (newQty <= currentMax) {
            toast.info(t('clubDashboard.errorReduceLicensesNotice', 'Para reducir licencias usa el botón "Reducir licencias".'));
      handleCloseQtyModal();
      handleOpenReduceModal();
      return;
    }
    setUpdatingQty(true);
    try {
      const response = await api.post('/stripe/update-licenses', { quantity: newQty });
      const { hostedInvoiceUrl, url, invoiceId, latestInvoiceId } = response.data;
      const stripeUrl = hostedInvoiceUrl || url;
      if (hostedInvoiceUrl) {
        const pendingPayload = {
          paymentUrl: stripeUrl,
          invoiceId: invoiceId || latestInvoiceId || null,
          targetQty: newQty,
          startedAt: Date.now(),
        };
        writePendingLicensePayment(pendingPayload);
        const opened = window.open(stripeUrl, '_blank', 'noopener,noreferrer');
        if (!opened) {
                    toast.info(t('clubDashboard.errorStripeAutoOpen', 'No se pudo abrir Stripe automáticamente. Usa el botón "Abrir pago de Stripe".'));
        }
        setPaymentUrl(stripeUrl);
        setTargetQty(newQty);
        setIsQtyOpen(false);
        setIsWaitingPayment(true);
      } else if (url) {
        sessionStorage.setItem('xtramys:postCheckoutPath', '/club/dashboard');
        window.location.href = url;
      } else {
                toast.success(response.data?.mensaje || t('clubDashboard.successLicensesUpdated', 'Licencias actualizadas a {{qty}}.', { qty: newQty }));
        setIsQtyOpen(false);
        fetchClubData();
        fetchSubStatus();
        dispatch(checkSubscription());
      }
    } catch (error) {
            toast.error(error.response?.data?.mensaje || error.message || t('clubDashboard.errorUpdateLicenses', 'Error al actualizar las licencias'));
    } finally {
      setUpdatingQty(false);
    }
  };

  const handleReduceLicenses = async (e) => {
    e.preventDefault();
    const currentMax = data?.club?.maxUsers || 0;
    const activeTeams = (data.teams || []).filter((team) => team.licenseActive !== false);
    const needToFree = Math.max(0, activeTeams.length - reduceQty);

    if (subStatus?.cancelAtPeriodEnd) {
      toast.error('La suscripción ya está cancelada para final de período. Reactívala si quieres cambiar licencias.');
      return;
    }
    if (reduceQty >= currentMax) {
            toast.error(t('clubDashboard.errorReduceQtyGreater', 'La cantidad debe ser menor a las licencias actuales.'));
      return;
    }
    if (reduceQty > 0 && reduceQty < CLUB_MIN_LICENSES) {
            toast.error(t('clubDashboard.errorReduceQtyMinimum', 'El mínimo es {{min}} licencias. Para cancelar todo usa {{btn}}.', { min: CLUB_MIN_LICENSES, btn: t('clubDashboard.cancelSubscription') }));
      return;
    }
    if (needToFree > 0 && selectedCoachIds.length !== needToFree) {
            toast.error(t('clubDashboard.errorSelectCoachesCount', 'Selecciona exactamente {{count}} entrenadores para marcar al vencimiento.', { count: needToFree, plural: needToFree > 1 ? 'es' : '' }));
      return;
    }

    setReducingQty(true);
    try {
      const cancellationPlan = createCancellationPlan(licenseBatches, currentMax - reduceQty);
      const response = await api.post('/stripe/cancel-licenses', {
        quantity: reduceQty,
        keepQuantity: reduceQty,
        cancelQuantity: currentMax - reduceQty,
        effectiveAtPeriodEnd: true,
        strategy: 'earliest_period_end_first',
        minRenewingLicenses: CLUB_MIN_LICENSES,
        cancellationPlan: toCancellationPlanPayload(cancellationPlan),
        teamsToDeactivate: selectedCoachIds,
      });
            toast.success(response.data?.mensaje || t('clubDashboard.successCancelLicenses', 'Cancelación de licencias programada correctamente.'));
      persistLicenseScheduleOverrides((prev) => mergeCancellationOverrides(prev, cancellationPlan));
      setIsReduceOpen(false);
      setSelectedCoachIds([]);
      fetchClubData();
      fetchSubStatus();
      dispatch(checkSubscription());
    } catch (error) {
            toast.error(error.response?.data?.mensaje || error.message || t('clubDashboard.errorReduceLicenses', 'Error al reducir licencias'));
    } finally {
      setReducingQty(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    if (subStatus?.cancelAtPeriodEnd) {
            toast.error(t('clubDashboard.errorSubscriptionCancelledForPeriodEndInvite', 'La suscripción está cancelada para final de período. Reactívala antes de invitar entrenadores.'));
      return;
    }
    setInviting(true);
    try {
      await api.post('/club/invite', { email: inviteEmail });
      toast.success(t('club.inviteModal.success', 'Invitación enviada correctamente'));
      setIsInviteOpen(false);
      setInviteEmail('');
      fetchClubData();
    } catch (error) {
      toast.error(error.message || t('errors.EMAIL_SEND_FAILED'));
    } finally {
      setInviting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const isActivating = confirmModal.type === 'activate' || confirmModal.member?.clubMemberStatus !== 'active';
    if (isActivating && subStatus?.cancelAtPeriodEnd) {
            toast.error(t('clubDashboard.errorSubscriptionCancelledForPeriodEndReactivate', 'La suscripción está cancelada para final de período. Reactívala antes de reactivar entrenadores.'));
      return;
    }
    setActionLoading(true);
    try {
      if (confirmModal.type === 'remove') {
        await api.post('/club/remove-user', { targetUserId: confirmModal.member._id });
                toast.success(t('clubDashboard.successUserRemoved', 'Usuario eliminado de la organización'));
      } else {
        await api.post('/club/toggle-user', { targetUserId: confirmModal.member._id });
        const isActivating = confirmModal.member.clubMemberStatus !== 'active';
                toast.success(isActivating ? t('clubDashboard.successAccessReactivated', 'Acceso reactivado') : t('clubDashboard.successAccessSuspended', 'Acceso suspendido'));
      }
      setConfirmModal(null);
      fetchClubData();
    } catch (error) {
            toast.error(error.message || t('clubDashboard.errorPerformAction', 'Error al realizar la acción'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Muted>{t('message.loading')}</Muted>
      </div>
    );
  }

  if (!data || !data.club) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
                <PageTitle>{t('club.title')}</PageTitle>
        <Muted>{t('clubDashboard.errorNoClubInfo', 'No se encontró información del club.')}</Muted>
      </div>
    );
  }

  const { club, members, stats } = data;
  const initials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const activeCount = club.activeTeams ?? (data.teams || []).filter((team) => team.licenseActive !== false).length;
  const maxCount = club.maxTeams ?? club.maxUsers ?? 0;
  const availableSlots = Math.max(0, maxCount - activeCount);
  const isFull = activeCount >= maxCount;
  const pct = maxCount > 0 ? Math.min(100, Math.round((activeCount / maxCount) * 100)) : 0;
  const isSubscriptionEnding = Boolean(subStatus?.cancelAtPeriodEnd);
  const licenseBatches = normalizeLicenseBatches(subStatus, club, t, licenseScheduleOverrides);
  const renewingLicenses = licenseBatches.reduce((total, batch) => total + (batch.renewingQuantity || 0), 0);
  const scheduledCancelLicenses = licenseBatches.reduce((total, batch) => total + (batch.cancelingQuantity || 0), 0);
  const willDropBelowMinimum = licenseBatches.some((batch) => {
    if (!batch.cancelingQuantity) return false;
    const remainingAfterBatch = licenseBatches.reduce((total, item) => {
      if (toDateMs(item.currentPeriodEnd) <= toDateMs(batch.currentPeriodEnd)) {
        return total + Math.max(0, item.renewingQuantity || 0);
      }
      return total + (item.quantity || 0);
    }, 0);
    return remainingAfterBatch > 0 && remainingAfterBatch < CLUB_MIN_LICENSES;
  }) || (scheduledCancelLicenses > 0 && renewingLicenses > 0 && renewingLicenses < CLUB_MIN_LICENSES);

  return (
    <Page>
      {/* Club Banner */}
      <ClubBanner>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{club.name}</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: 13 }}>
            {t('clubDashboard.adminPanel')} · {t('clubTeamManager.licenseCount', { used: activeCount, total: maxCount })}
          </p>
          <LicenseBar $full={isFull}>
            <div style={{ width: `${pct}%` }} />
          </LicenseBar>
        </div>
        <BannerActions>
        <Button
          type="button"
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
            padding: '12px 18px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700,
            fontSize: 14,
            justifyContent: 'center',
          }}
          onClick={handleOpenTeamEditor}
        >
          <MdEdit size={18} />
          Editar equipo
        </Button>
        <Button
          type="button"
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
            padding: '12px 18px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700,
            fontSize: 14,
            justifyContent: 'center',
          }}
          onClick={() => setIsSeasonOpen(true)}
        >
          <MdCalendarMonth size={18} />
          Nueva temporada
        </Button>
        <Button
          style={{
            background: isSubscriptionEnding ? 'rgba(255,255,255,0.15)' : '#10b981',
            color: '#fff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: isSubscriptionEnding ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
            cursor: isSubscriptionEnding ? 'not-allowed' : 'pointer',
            opacity: isSubscriptionEnding ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700,
            fontSize: 14,
            justifyContent: 'center',
          }}
          onClick={() => !isSubscriptionEnding && setIsInviteOpen(true)}
          disabled={isSubscriptionEnding}
          title={t('clubDashboard.inviteMemberTitle', 'Invitar miembro')}
        >
          <MdPersonAdd size={18} />
          {t('club.actions.invite', 'Invitar Miembro')}
        </Button>
        </BannerActions>
      </ClubBanner>

      {/* Stats */}
      <StatsGrid>
        <StatCard $color="linear-gradient(90deg, #10b981, #34d399)">
          <StatIcon><MdShield /></StatIcon>
          <StatLabel>{club.permissionsModel === 'legacy' ? t('clubDashboard.activeAccountLicenses') : t('clubTeamManager.activeTeamLicenses')}</StatLabel>
          <StatNumber>{activeCount} / {maxCount}</StatNumber>
                    <Muted style={{ fontSize: 12 }}>{t('clubDashboard.freeLicensesCount', '{{count}} libres', { count: availableSlots })}</Muted>
        </StatCard>
        <StatCard $color="linear-gradient(90deg, #3b82f6, #60a5fa)">
          <StatLabel>{t('club.trainings', 'Entrenamientos')}</StatLabel>
          <StatNumber>{stats.trainings}</StatNumber>
          <Muted style={{ fontSize: 12 }}>{t('clubDashboard.clubTotal')}</Muted>
        </StatCard>
        <StatCard $color="linear-gradient(90deg, #f59e0b, #fbbf24)">
          <StatLabel>{t('club.exercises', 'Ejercicios')}</StatLabel>
          <StatNumber>{stats.exercises}</StatNumber>
          <Muted style={{ fontSize: 12 }}>{t('clubDashboard.sharedLibrary')}</Muted>
        </StatCard>
        <StatCard $color="linear-gradient(90deg, #8b5cf6, #a78bfa)">
          <StatLabel>{t('club.strategies', 'Estrategias')}</StatLabel>
          <StatNumber>{stats.strategies}</StatNumber>
          <Muted style={{ fontSize: 12 }}>{t('clubDashboard.sharedTactics')}</Muted>
        </StatCard>
      </StatsGrid>

      {club.permissionsModel === 'teams' ? (
        <TeamPermissionManager data={data} onRefresh={fetchClubData} />
      ) : null}

      {/* Recursos Compartidos del Club */}
      <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>
        Recursos Compartidos del Club
      </h2>
      <ResourcesGrid>
        <ResourceCard>
          <ResourceHeader>
            <ResourceIconBox $bg="rgba(16, 185, 129, 0.12)" $color="#10b981">
              <MdSportsSoccer size={22} />
            </ResourceIconBox>
            <ResourceTitle>Biblioteca de Ejercicios</ResourceTitle>
          </ResourceHeader>
          <ResourceDescription>
            Biblioteca de ejercicios oficiales del club compartida con todos los entrenadores.
          </ResourceDescription>
          <Button
            type="button"
            $variant="primary"
            style={{ borderRadius: 10, fontWeight: 600, fontSize: 13, marginTop: 'auto' }}
            onClick={() => navigate('/exercises?filter=club')}
          >
            Gestionar Biblioteca
          </Button>
        </ResourceCard>

        <ResourceCard>
          <ResourceHeader>
            <ResourceIconBox $bg="rgba(239, 68, 68, 0.12)" $color="#ef4444">
              <MdRestaurant size={22} />
            </ResourceIconBox>
            <ResourceTitle>Plan de Nutrición</ResourceTitle>
          </ResourceHeader>
          <ResourceDescription>
            Plan nutricional y pautas de alimentación de referencia para los jugadores del club.
          </ResourceDescription>
          <Button
            type="button"
            $variant="primary"
            style={{ borderRadius: 10, fontWeight: 600, fontSize: 13, marginTop: 'auto' }}
            onClick={() => navigate('/nutrition')}
          >
            Gestionar Nutrición
          </Button>
        </ResourceCard>

        <ResourceCard>
          <ResourceHeader>
            <ResourceIconBox $bg="rgba(59, 130, 246, 0.12)" $color="#3b82f6">
              <MdLibraryBooks size={22} />
            </ResourceIconBox>
            <ResourceTitle>Metodología del Club</ResourceTitle>
          </ResourceHeader>
          <ResourceDescription>
            Definición oficial de la metodología de entrenamiento y modelo de juego del club.
          </ResourceDescription>
          <Button
            type="button"
            $variant="primary"
            style={{ borderRadius: 10, fontWeight: 600, fontSize: 13, marginTop: 'auto' }}
            onClick={() => navigate('/methodology')}
          >
            Gestionar Metodología
          </Button>
        </ResourceCard>

        <ResourceCard>
          <ResourceHeader>
            <ResourceIconBox $bg="rgba(245, 158, 11, 0.12)" $color="#f59e0b">
              <MdSportsHandball size={22} />
            </ResourceIconBox>
            <ResourceTitle>Metodología de Porteros</ResourceTitle>
          </ResourceHeader>
          <ResourceDescription>
            Líneas metodológicas y modelo de entrenamiento específico para porteros.
          </ResourceDescription>
          <Button
            type="button"
            $variant="primary"
            style={{ borderRadius: 10, fontWeight: 600, fontSize: 13, marginTop: 'auto' }}
            onClick={() => navigate('/goalkeeper-methodology')}
          >
            Gestionar M. Porteros
          </Button>
        </ResourceCard>
      </ResourcesGrid>

      {isNative && (
        <Card style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            {t('clubDashboard.webManagementTitle', 'Gestión de cuenta del club')}
          </h2>
          <p style={{ margin: '8px 0 16px', fontSize: 13, opacity: 0.75 }}>
            {t('clubDashboard.webManagementNotice', 'Las opciones administrativas del plan están disponibles en la versión web.')}
          </p>
        </Card>
      )}

      {/* {t('clubDashboard.subscriptionAndLicenses')} Card */}
      {!isNative && subStatus && subStatus.stripeSubscriptionId && (
        <Card style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                {t('clubDashboard.subscriptionAndLicenses')}
                {subStatus.cancelAtPeriodEnd ? (
                  <Badge $tone="warning" style={{ fontSize: 11 }}>{t('clubDashboard.scheduledCancellation')}</Badge>
                ) : (
                  <Badge $tone="success" style={{ fontSize: 11 }}>{t('clubDashboard.active')}</Badge>
                )}
              </h2>
              <p style={{ margin: '6px 0 4px', fontSize: 13, opacity: 0.8 }}>
                {t('clubDashboard.contractedLicenses', { total: club.maxUsers, used: activeCount, free: Math.max(0, club.maxUsers - activeCount) })}
              </p>
              {subStatus.currentPeriodEnd && (
                <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
                  {subStatus.cancelAtPeriodEnd
                    ? t('clubDashboard.accessUntil', { date: new Date(subStatus.currentPeriodEnd).toLocaleDateString() })
                    : t('clubDashboard.nextRenewalDate', { date: new Date(subStatus.currentPeriodEnd).toLocaleDateString() })}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {/* Subir licencias */}
              {!subStatus.cancelAtPeriodEnd && (
                <Button
                  type="button"
                  $variant="primary"
                  style={{ borderRadius: 10, fontWeight: 600, fontSize: 13 }}
                  onClick={handleOpenQtyModal}
                >
                  {t('clubDashboard.addLicenses')}
                </Button>
              )}
              {/* Reducir licencias */}
              {!subStatus.cancelAtPeriodEnd && club.maxUsers > 5 && (
                <Button
                  type="button"
                  $variant="secondary"
                  style={{ borderRadius: 10, fontWeight: 600, fontSize: 13 }}
                  onClick={handleOpenReduceModal}
                >
                  {t('clubDashboard.reduceLicenses')}
                </Button>
              )}
              {/* Reactivar / {t('clubDashboard.cancelSubscription')} */}
              {subStatus.cancelAtPeriodEnd ? (
                <Button
                  type="button"
                  $variant="primary"
                  style={{ borderRadius: 10, fontWeight: 600, fontSize: 13 }}
                  onClick={handleReactivateSubscription}
                  disabled={cancelingSub}
                >
                  {cancelingSub ? t('clubDashboard.processing') : t('clubDashboard.reactivateSubscription')}
                </Button>
              ) : (
                <Button
                  type="button"
                  $variant="secondary"
                  style={{ borderRadius: 10, fontWeight: 600, fontSize: 13, border: '1px solid #ef4444', color: '#ef4444', background: 'rgba(239,68,68,0.02)' }}
                  onClick={handleOpenCancelModal}
                >
                  {t('clubDashboard.cancelSubscription')}
                </Button>
              )}
            </div>
          </Row>

          {!subStatus.cancelAtPeriodEnd && (
            <>
              <Divider style={{ margin: '18px 0' }} />

              <div>
                <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t('clubDashboard.licenseRenewals')}</div>
                    <Muted style={{ fontSize: 12 }}>
                      {scheduledCancelLicenses > 0
                        ? t('clubDashboard.renewAndCancelSummary', { renewQty: renewingLicenses, cancelQty: scheduledCancelLicenses })
                        : t('clubDashboard.willRenewLicenses', { qty: renewingLicenses })}
                    </Muted>
                  </div>
                                    {renewingLicenses > 0 && renewingLicenses < CLUB_MIN_LICENSES && (
                    <Badge $tone="warning">{t('clubDashboard.doesNotRenewAlone', 'No renueva sola')}</Badge>
                  )}
                </Row>

                <div style={{ display: 'grid', gap: 8 }}>
                  {licenseBatches.map((batch) => {
                    const maxReactivate = Math.max(0, batch.cancelingQuantity || 0);
                    const reactivateQty = Math.min(
                      maxReactivate || 1,
                      Math.max(1, toPositiveInt(reactivationQtyByBatch[batch.id], 1))
                    );

                    return (
                      <div
                        key={batch.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          gap: 12,
                          alignItems: 'center',
                          padding: '12px 14px',
                          border: '1px solid rgba(148,163,184,0.2)',
                          borderRadius: 10,
                          background: 'rgba(148,163,184,0.04)',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{batch.label}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                            <Badge $tone={batch.renewingQuantity > 0 ? 'success' : 'warning'}>
                              {t('clubDashboard.renewing', { qty: batch.renewingQuantity || 0 })}
                            </Badge>
                            <Badge $tone={batch.cancelingQuantity > 0 ? 'warning' : 'success'}>
                              {t('clubDashboard.notRenewing', { qty: batch.cancelingQuantity || 0 })}
                            </Badge>
                          </div>
                          <Muted style={{ fontSize: 12, marginTop: 6 }}>
                            {t('clubDashboard.renewal', { date: formatLicenseDate(batch.currentPeriodEnd) })}
                          </Muted>
                        </div>
                        {maxReactivate > 0 && batch.canReactivate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <input
                              type="number"
                              min={1}
                              max={maxReactivate}
                              value={reactivateQty}
                              aria-label={`Licencias a reactivar de ${batch.label}`}
                              onChange={(e) => {
                                const nextQty = Math.min(maxReactivate, Math.max(1, toPositiveInt(e.target.value, 1)));
                                setReactivationQtyByBatch((prev) => ({ ...prev, [batch.id]: nextQty }));
                              }}
                              style={{
                                width: 70,
                                height: 36,
                                textAlign: 'center',
                                border: '1px solid rgba(148,163,184,0.35)',
                                borderRadius: 10,
                                background: 'transparent',
                                color: 'inherit',
                                fontWeight: 700,
                              }}
                            />
                            <Button
                              type="button"
                              $variant="secondary"
                              style={{ borderRadius: 10, fontSize: 12, padding: '8px 10px' }}
                              disabled={reactivatingBatchId === batch.id}
                              onClick={() => handleReactivateLicenseBatch(batch, reactivateQty)}
                            >
                              {reactivatingBatchId === batch.id ? t('clubDashboard.processing') : t('clubDashboard.reactivateQty', { qty: reactivateQty })}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {willDropBelowMinimum && (
                  <InfoNotice style={{ marginTop: 10, borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.08)' }}>
                    {t('clubDashboard.willDropBelowMinimumNotice', 'Al quedar por debajo de {{min}} licencias renovables, el plan club no podrá continuar solo. Para seguir suscrito tendrás que comprar las licencias necesarias hasta llegar a {{min}}.', { min: CLUB_MIN_LICENSES })}
                  </InfoNotice>
                )}
              </div>
            </>
          )}
        </Card>
      )}

      {/* HISTORIAL DE FACTURACIÓN */}
      {!isNative && subStatus && subStatus.invoices && subStatus.invoices.filter(inv => inv.status === 'paid').length > 0 && (
        <Card style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>
            {t('clubDashboard.billingHistory')}
          </h2>
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <Th>{t('clubDashboard.date')}</Th>
                  <Th>{t('clubDashboard.concept')}</Th>
                  <Th>{t('clubDashboard.amount')}</Th>
                  <Th>{t('clubDashboard.status')}</Th>
                  <Th>{t('clubDashboard.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {subStatus.invoices.filter(inv => inv.status === 'paid').map((inv) => {
                  const date = new Date(inv.created * 1000).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const amount = (inv.amount / 100).toFixed(2);
                  const currency = (inv.currency || 'eur').toUpperCase();
                  const isPaid = inv.status === 'paid';

                  return (
                    <tr key={inv.id}>
                      <Td style={{ fontWeight: 600 }}>{date}</Td>
                      <Td style={{ fontSize: 13, opacity: 0.8 }}>
                        {t('clubDashboard.clubSubscriptionLicenses')}
                      </Td>
                      <Td style={{ fontWeight: 700 }}>{amount} {currency}</Td>
                      <Td>
                        <Badge $tone={isPaid ? 'success' : 'warning'}>
                          {isPaid ? t('clubDashboard.paidStatus') : inv.status}
                        </Badge>
                      </Td>
                      <Td>
                        {inv.pdfUrl && (
                          <ActionBtn
                            title={t('clubDashboard.downloadPdfTitle')}
                            onClick={() => window.open(inv.pdfUrl, '_blank')}
                          >
                            {t('clubDashboard.downloadPdf')}
                          </ActionBtn>
                        )}
                        {inv.hostedUrl && (
                          <ActionBtn
                            title={t('clubDashboard.viewInStripeTitle')}
                            onClick={() => window.open(inv.hostedUrl, '_blank')}
                          >
                            {t('clubDashboard.viewInStripe')}
                          </ActionBtn>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Members table */}
      <Card style={{ padding: 24, borderRadius: 16 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>
          {t('clubDashboard.clubCoaches')}
        </h2>
        <InfoNotice>
          <span dangerouslySetInnerHTML={{ __html: t('clubDashboard.suspendAccessInfo') }} />
        </InfoNotice>
        <TableContainer>
          {members.length === 0 ? (
            <EmptyState>
              <MdMail size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>{t('clubDashboard.noCoachesYet')}</p>
              <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                {t('clubDashboard.useInviteButton')}
              </p>
            </EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('clubDashboard.coachColumn', 'Entrenador')}</Th>
                  <Th>{t('clubDashboard.emailColumn', 'Correo')}</Th>
                  <Th>{t('clubDashboard.categoryColumn', 'Categoría')}</Th>
                  <Th>{t('clubDashboard.statusColumn', 'Estado')}</Th>
                  <Th>{t('clubDashboard.actionsColumn', 'Acciones')}</Th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isActive = member.clubMemberStatus === 'active';
                  const isPending = member.clubMemberStatus === 'pending';
                  let statusTone = 'neutral';
                  if (isActive) statusTone = 'success';
                  else if (member.clubMemberStatus === 'inactive') statusTone = 'error';
                  else if (isPending) statusTone = 'warning';

                  return (
                    <tr key={member._id}>
                      <Td>
                        <MemberNameSection>
                          <Avatar $src={member.imagen}>
                            {!member.imagen && initials(`${member.nombre} ${member.apellido}`)}
                          </Avatar>
                          <div>
                            <div style={{ fontWeight: 600 }}>{member.nombre} {member.apellido}</div>
                            {!member.emailVerificado && (
                                                            <Badge $tone="warning" style={{ fontSize: 10, padding: '1px 6px', marginTop: 2 }}>
                                {t('clubDashboard.pendingActivationBadge', 'Pendiente activación')}
                              </Badge>
                            )}
                          </div>
                        </MemberNameSection>
                      </Td>
                      <Td style={{ fontSize: 13, color: 'inherit', opacity: 0.8 }}>{member.correo}</Td>
                      <Td>
                        {member.accessCategories?.length ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {member.accessCategories.map((category) => (
                              <Badge key={category} $tone="neutral">
                                {category === 'otro'
                                  ? t('team.categories.otro', 'Otro')
                                  : t(`team.categories.${category}`, category)}
                              </Badge>
                            ))}
                          </div>
                        ) : member.categoriaKey ? (
                          <Badge $tone="neutral">
                            {member.categoriaKey === 'otro'
                              ? (member.categoriaCustom || member.categoria || t('team.categories.otro', 'Otro'))
                              : t(`team.categories.${member.categoriaKey}`, member.categoria || member.categoriaKey)}
                          </Badge>
                        ) : (
                          <span style={{ opacity: 0.45 }}>-</span>
                        )}
                      </Td>
                      <Td>
                        <Badge $tone={statusTone}>
                          {isActive ? t('clubDashboard.statusActive', 'Activo') : isPending ? t('clubDashboard.statusPending', 'Invitado') : t('clubDashboard.statusSuspended', 'Suspendido')}
                        </Badge>
                      </Td>
                      <Td>
                        {/* View coach data (read-only) */}
                        <ActionBtn
                          title={t('clubDashboard.viewActivityTitle', 'Ver actividad')}
                          onClick={() => handleStartCoachSupervision(member, 'view')}
                        >
                          <MdVisibility size={14} />
                          {t('clubDashboard.viewActivityBtn', 'Ver')}
                        </ActionBtn>
                        {/* Manage coach team (edit mode) */}
                        <ActionBtn
                          title={t('clubDashboard.manageActivityTitle', 'Gestionar equipo')}
                          onClick={() => handleStartCoachSupervision(member, 'manage')}
                        >
                          <MdEdit size={14} />
                          {t('clubDashboard.manageActivityBtn', 'Gestionar')}
                        </ActionBtn>
                        {/* Resend invite for pending members */}
                        {isPending && (
                                                    <ActionBtn
                            title={t('clubDashboard.resendInviteTitle', 'Reenviar invitación')}
                            onClick={async () => {
                              try {
                                const res = await api.post('/club/resend-invite', { targetUserId: member._id });
                                                                toast.success(res.data?.mensaje || t('clubDashboard.successInviteResent', 'Invitación reenviada'));
                                fetchClubData();
                              } catch (err) {
                                toast.error(err.message || t('errors.EMAIL_SEND_FAILED'));
                              }
                            }}
                          >
                                                        <MdMail size={14} />
                            {t('clubDashboard.resendBtn', 'Reenviar')}
                          </ActionBtn>
                        )}
                        {/* Suspend / Reactivate access */}
                        {isActive ? (
                                                    <ActionBtn
                            $type="warning"
                            title={t('clubDashboard.suspendAccessTitle', 'Suspender acceso (conserva datos y licencia en Stripe)')}
                            onClick={() => setConfirmModal({ type: 'deactivate', member })}
                          >
                            <MdLock size={14} />
                            {t('clubDashboard.suspendBtn', 'Suspender')}
                          </ActionBtn>
                        ) : !isPending ? (
                                                    <ActionBtn
                            $type="success"
                            title={t('clubDashboard.reactivateAccessTitle', 'Reactivar acceso')}
                            onClick={() => setConfirmModal({ type: 'activate', member })}
                            disabled={false}
                          >
                            <MdLockOpen size={14} />
                            {t('clubDashboard.reactivateBtn', 'Reactivar')}
                          </ActionBtn>
                        ) : null}
                        {/* Remove from club */}
                                                <ActionBtn
                          $type="danger"
                          title={t('clubDashboard.removeMemberTitle', 'Eliminar del club')}
                          onClick={() => setConfirmModal({ type: 'remove', member })}
                        >
                          <MdDelete size={14} />
                          {t('clubDashboard.removeBtn', 'Eliminar')}
                        </ActionBtn>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </TableContainer>
      </Card>

      {/* TEAM EDITOR MODAL */}
      <Modal
        open={isTeamEditorOpen}
        onClose={() => { if (!teamSaving) setIsTeamEditorOpen(false); }}
        title="Editar equipo del club"
      >
        {teamLoading ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Muted>{t('message.loading', 'Cargando...')}</Muted>
          </div>
        ) : (
          <form onSubmit={handleSaveClubTeam}>
            <Stack $gap={16}>
              <InfoNotice>
                Al guardar, el nombre y el escudo se actualizarán en todos los equipos asociados a esta temporada del club.
              </InfoNotice>
              <Field>
                <Label>Nombre del equipo</Label>
                <Input
                  value={teamForm.nombre}
                  onChange={(event) => setTeamForm((prev) => ({ ...prev, nombre: event.target.value }))}
                  placeholder="Nombre del equipo"
                  disabled={teamSaving}
                  required
                  autoFocus
                />
              </Field>
              <Field>
                <Label>Escudo</Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      border: '1px solid rgba(148,163,184,0.35)',
                      background: teamForm.escudo ? `center / cover no-repeat url(${teamForm.escudo})` : 'rgba(148,163,184,0.12)',
                    }}
                    aria-hidden="true"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleTeamBadgeChange}
                    disabled={teamSaving}
                    style={{ maxWidth: 260 }}
                  />
                  {teamForm.escudo && (
                    <Button
                      type="button"
                      $variant="secondary"
                      onClick={() => setTeamForm((prev) => ({ ...prev, escudo: null }))}
                      disabled={teamSaving}
                    >
                      Quitar escudo
                    </Button>
                  )}
                </div>
              </Field>
              <Row style={{ justifyContent: 'flex-end', gap: 8 }}>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={() => setIsTeamEditorOpen(false)}
                  disabled={teamSaving}
                >
                  {t('message.cancel', 'Cancelar')}
                </Button>
                <Button
                  type="submit"
                  $variant="primary"
                  disabled={teamSaving || !teamForm.nombre.trim()}
                >
                  {teamSaving ? t('message.loading', 'Guardando...') : 'Guardar equipo'}
                </Button>
              </Row>
            </Stack>
          </form>
        )}
      </Modal>

      {/* SEASON MODAL */}
      <Modal
        open={isSeasonOpen}
        onClose={() => { if (!seasonSaving) setIsSeasonOpen(false); }}
        title="Nueva temporada"
      >
        <form onSubmit={handleCreateClubSeason}>
          <Stack $gap={16}>
            <InfoNotice>
              Se creará para el club y aparecerá en el selector de temporadas de los usuarios activos. Las temporadas anteriores se mantienen.
            </InfoNotice>
            <Field>
              <Label>Temporada</Label>
              <Input
                value={clubSeasonYear}
                onChange={(event) => setClubSeasonYear(event.target.value)}
                placeholder="2026-2027"
                disabled={seasonSaving}
                autoFocus
              />
            </Field>
            <Row style={{ justifyContent: 'flex-end', gap: 8 }}>
              <Button
                type="button"
                $variant="secondary"
                onClick={() => setIsSeasonOpen(false)}
                disabled={seasonSaving}
              >
                {t('message.cancel', 'Cancelar')}
              </Button>
              <Button
                type="submit"
                $variant="primary"
                disabled={seasonSaving || !clubSeasonYear.trim()}
              >
                {seasonSaving ? t('message.loading', 'Guardando...') : 'Crear temporada'}
              </Button>
            </Row>
          </Stack>
        </form>
      </Modal>

      {/* INVITE MODAL */}
      <Modal
        open={isInviteOpen}
        onClose={() => { setIsInviteOpen(false); setInviteEmail(''); }}
        title={t('club.inviteModal.title', 'Invitar entrenador')}
      >
        <form onSubmit={handleInvite}>
          <Stack $gap={16}>
                        <InfoNotice>
              {t('clubDashboard.inviteNoticeText', 'El entrenador recibirá un correo con un enlace para establecer su contraseña y activar su cuenta. Si ya tiene cuenta en Xtramys, se vinculará automáticamente.')}
            </InfoNotice>
            <Field>
              <Label>{t('club.inviteModal.emailLabel', 'Correo electrónico')}</Label>
              <Input
                type="email"
                placeholder={t('club.inviteModal.emailPlaceholder', 'entrenador@ejemplo.com')}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Row style={{ justifyContent: 'flex-end', gap: 8 }}>
              <Button
                type="button"
                $variant="secondary"
                onClick={() => { setIsInviteOpen(false); setInviteEmail(''); }}
              >
                {t('message.cancel', 'Cancelar')}
              </Button>
              <Button
                type="submit"
                $variant="primary"
                disabled={inviting || !inviteEmail}
              >
                {inviting ? t('message.loading', 'Enviando...') : t('club.inviteModal.send', 'Enviar invitación')}
              </Button>
            </Row>
          </Stack>
        </form>
      </Modal>

      {/* CONFIRM ACTION MODAL (suspend / remove) */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={
          confirmModal?.type === 'remove'
            ? t('clubDashboard.removeMemberTitle')
            : confirmModal?.type === 'deactivate'
              ? t('clubDashboard.suspendMemberTitle')
              : t('clubDashboard.reactivateMemberTitle')
        }
      >
        <Stack $gap={16}>
          <ConfirmBox>
            <strong>{confirmModal?.member?.nombre} {confirmModal?.member?.apellido}</strong>
            <br />
            <span style={{ fontSize: 13, opacity: 0.7 }}>{confirmModal?.member?.correo}</span>
          </ConfirmBox>

          {confirmModal?.type === 'remove' && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              {t('clubDashboard.removeMemberDesc')}
            </p>
          )}
          {confirmModal?.type === 'deactivate' && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              {t('clubDashboard.suspendMemberDesc')}
            </p>
          )}
          {confirmModal?.type === 'activate' && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              {t('clubDashboard.reactivateMemberDesc')}
            </p>
          )}
          <Row style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" $variant="secondary" onClick={() => setConfirmModal(null)}>
              {t('clubDashboard.cancel')}
            </Button>
            <Button
              type="button"
              $variant={confirmModal?.type === 'remove' ? 'danger' : 'primary'}
              disabled={actionLoading}
              onClick={handleConfirmAction}
            >
              {actionLoading
                ? t('clubDashboard.processing')
                : confirmModal?.type === 'remove'
                  ? t('clubDashboard.yesRemove')
                  : confirmModal?.type === 'deactivate'
                    ? t('clubDashboard.yesSuspend')
                    : t('clubDashboard.yesReactivate')}
            </Button>
          </Row>
        </Stack>
      </Modal>

      {/* UPGRADE LICENSES MODAL */}
      <Modal
        open={isQtyOpen}
        onClose={handleCloseQtyModal}
        title={t('clubDashboard.addLicensesTitle')}
      >
        <form onSubmit={handleUpdateLicenses}>
          <Stack $gap={16}>
            <Field>
              <Label>{t('clubDashboard.newTotalLicenses', { min: (data?.club?.maxUsers || 5) + 1 })}</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <Button
                  type="button"
                  $variant="secondary"
                  style={{ width: 44, height: 44, padding: 0, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 'bold' }}
                  onClick={() => setNewQty(Math.max((data?.club?.maxUsers || 5) + 1, newQty - 1))}
                  disabled={newQty <= (data?.club?.maxUsers || 5) + 1 || updatingQty}
                >
                  -
                </Button>
                <input
                  type="number"
                  style={{ width: 80, height: 44, textAlign: 'center', border: '1px solid #334155', borderRadius: 10, background: 'transparent', color: 'inherit', fontSize: 16, fontWeight: 'bold' }}
                  value={newQty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > (data?.club?.maxUsers || 5)) setNewQty(val);
                  }}
                  min={(data?.club?.maxUsers || 5) + 1}
                  disabled={updatingQty}
                />
                <Button
                  type="button"
                  $variant="secondary"
                  style={{ width: 44, height: 44, padding: 0, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 'bold' }}
                  onClick={() => setNewQty(newQty + 1)}
                  disabled={updatingQty}
                >
                  +
                </Button>
              </div>
              <Muted style={{ fontSize: 11, marginTop: 6 }}>
                {newQty - (data?.club?.maxUsers || 0) === 1
                  ? t('clubDashboard.upgradePreview', { current: data?.club?.maxUsers || 0, newQty, diff: Math.max(0, newQty - (data?.club?.maxUsers || 0)) })
                  : t('clubDashboard.upgradePreviewPlural', { current: data?.club?.maxUsers || 0, newQty, diff: Math.max(0, newQty - (data?.club?.maxUsers || 0)) })
                }
              </Muted>
            </Field>

            {/* Inline price preview */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.06))',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 12,
              padding: '16px 20px',
              minHeight: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}>
              {loadingPreview ? (
                <>
                  <div style={{ opacity: 0.5, fontSize: 13 }}>{t('clubDashboard.calculatingCost')}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#3b82f6', opacity: 0.3 }}>...</div>
                </>
              ) : previewCost !== null ? (
                <>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.55, marginBottom: 4 }}>{t('clubDashboard.prorationCharge')}</div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>
                      {previewCardLast4 ? `•••• ${previewCardLast4}` : t('clubDashboard.addPaymentMethod')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: previewCost === 0 ? '#10b981' : '#3b82f6', lineHeight: 1 }}>
                      {previewCost === 0 ? t('clubDashboard.noCharge') : `+${previewCost.toFixed(2)} ${previewCurrency.toUpperCase()}`}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 3 }}>{t('clubDashboard.untilNextRenewal')}</div>
                  </div>
                </>
              ) : (
                <div style={{ opacity: 0.4, fontSize: 13 }}>{t('clubDashboard.exactCostWillShow')}</div>
              )}
            </div>

            <InfoNotice style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)' }}>
              {t('clubDashboard.confirmStripeRedirect')}
            </InfoNotice>

            <Row style={{ justifyContent: 'flex-end', gap: 8 }}>
              <Button type="button" $variant="secondary" onClick={handleCloseQtyModal} disabled={updatingQty}>
                {t('clubDashboard.cancel')}
              </Button>
              <Button
                type="submit"
                $variant="primary"
                disabled={updatingQty || newQty <= (data?.club?.maxUsers || 5) || loadingPreview}
              >
                {updatingQty ? t('clubDashboard.redirectingToStripe') : t('clubDashboard.continueToPayment')}
              </Button>
            </Row>
          </Stack>
        </form>
      </Modal>

      {/* REDUCE LICENSES MODAL */}
      <Modal
        open={isReduceOpen}
        onClose={handleCloseReduceModal}
        title={t('clubDashboard.reduceLicensesTitle')}
      >
        <form onSubmit={handleReduceLicenses}>
          {(() => {
            const currentMax = data?.club?.maxTeams ?? data?.club?.maxUsers ?? CLUB_MIN_LICENSES;
            const canCancelPartially = currentMax > CLUB_MIN_LICENSES;
            const partialCancellationPlan = createCancellationPlan(licenseBatches, Math.max(0, currentMax - cancelKeepQty));
            const activeTeams = (data.teams || []).filter((team) => team.licenseActive !== false);
            const needToFree = Math.max(0, activeTeams.length - reduceQty);
            const invalidRange = reduceQty > 0 && reduceQty < 5;
            const notAReduction = reduceQty >= currentMax;

            return (
              <Stack $gap={16}>
                <InfoNotice style={{ background: 'rgba(239,68,68,0.02)', borderColor: 'rgba(239,68,68,0.1)' }}>
                  {t('clubDashboard.reduceLicensesNotice')}
                </InfoNotice>
                <Field>
                  <Label>{t('clubDashboard.licensesToKeepLabel', { min: 5, max: currentMax - 1 })}</Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <Button
                      type="button"
                      $variant="secondary"
                      style={{ width: 44, height: 44, padding: 0, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 'bold' }}
                      onClick={() => { setReduceQty(Math.max(5, reduceQty - 1)); setSelectedCoachIds([]); }}
                      disabled={reduceQty <= 5}
                    >
                      -
                    </Button>
                    <input
                      type="number"
                      style={{ width: 80, height: 44, textAlign: 'center', border: '1px solid #334155', borderRadius: 10, background: 'transparent', color: 'inherit', fontSize: 16, fontWeight: 'bold' }}
                      value={reduceQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) { setReduceQty(val); setSelectedCoachIds([]); }
                      }}
                      min={5}
                      max={currentMax - 1}
                    />
                    <Button
                      type="button"
                      $variant="secondary"
                      style={{ width: 44, height: 44, padding: 0, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 'bold' }}
                      onClick={() => { setReduceQty(Math.min(currentMax - 1, reduceQty + 1)); setSelectedCoachIds([]); }}
                      disabled={reduceQty >= currentMax - 1}
                    >
                      +
                    </Button>
                  </div>
                  {invalidRange && (
                    <Muted style={{ color: '#ef4444', fontSize: 11, marginTop: 6, fontWeight: 600 }}>
                      {t('clubDashboard.minimumLicensesError', { min: 5 })}
                    </Muted>
                  )}
                  {!invalidRange && !notAReduction && reduceQty >= 5 && (
                    <Muted style={{ color: '#10b981', fontSize: 11, marginTop: 6, fontWeight: 600 }}>
                      {t('clubDashboard.licensesWillBeCanceledLabel', { qty: currentMax - reduceQty })}
                    </Muted>
                  )}
                </Field>

                {/* Team selector: a reduced license count must leave only licensed teams active. */}
                {needToFree > 0 && (
                  <Field>
                    <Label style={{ color: '#f59e0b', fontWeight: 700 }}>
                      {t('clubTeamManager.selectTeamsLabel', { count: needToFree })}
                    </Label>
                    <Muted style={{ fontSize: 12, marginBottom: 8 }}>
                      {t('clubTeamManager.selectTeamsDescription', { active: activeTeams.length, keep: reduceQty, selected: selectedCoachIds.length, need: needToFree })}
                    </Muted>
                    <div style={{ border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                      {activeTeams.map((team, idx) => {
                        const isChecked = selectedCoachIds.includes(team._id);
                        const isDisabled = !isChecked && selectedCoachIds.length >= needToFree;
                        return (
                          <label
                            key={team._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 14px',
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              background: isChecked
                                ? 'rgba(239,68,68,0.12)'
                                : idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              opacity: isDisabled ? 0.4 : 1,
                              transition: 'background 0.15s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isDisabled}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (selectedCoachIds.length < needToFree) {
                                    setSelectedCoachIds([...selectedCoachIds, team._id]);
                                  }
                                } else {
                                  setSelectedCoachIds(selectedCoachIds.filter(id => id !== team._id));
                                }
                              }}
                              style={{ width: 16, height: 16, flexShrink: 0 }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>
                                {team.nombre}
                                {isChecked && (
                                  <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginLeft: 8 }}>
                                    {t('clubDashboard.atExpirationLabel')}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, opacity: 0.6 }}>{team.temporada?.año || ''}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {selectedCoachIds.length === needToFree && (
                      <Muted style={{ color: '#10b981', fontSize: 11, marginTop: 6, fontWeight: 600 }}>
                        {t('clubTeamManager.teamsSelectedReady', { count: needToFree })}
                      </Muted>
                    )}
                  </Field>
                )}

                <BillingNoticeBox>
                  <BillingNoticeTitle>
                    {t('clubDashboard.noteRenewDates')}
                  </BillingNoticeTitle>
                  <div>
                    {t('clubDashboard.noteDesc1')}<br /><br />
                    {t('clubDashboard.noteDesc2')}
                  </div>
                </BillingNoticeBox>

                <Row style={{ justifyContent: 'flex-end', gap: 8 }}>
                  <Button type="button" $variant="secondary" onClick={handleCloseReduceModal}>
                    {t('clubDashboard.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    $variant="primary"
                    disabled={
                      reducingQty ||
                      reduceQty >= currentMax ||
                      reduceQty < 5 ||
                      (needToFree > 0 && selectedCoachIds.length !== needToFree)
                    }
                  >
                    {reducingQty ? t('clubDashboard.processing') : t('clubDashboard.cancelKeepQtyLabel', { qty: reduceQty })}
                  </Button>
                </Row>
              </Stack>
            );
          })()}
        </form>
      </Modal>


      {/* CANCEL SUBSCRIPTION MODAL, 2-step redesign */}
      <Modal
        open={isCancelOpen}
        onClose={handleCloseCancelModal}
        title={cancelStep === 1 ? t('clubDashboard.manageCancel') : cancelType === 'all' ? t('clubDashboard.confirmTotalCancel') : 'Seleccionar entrenadores y confirmar'}
      >
        <Stack $gap={16}>

          {/* STEP 1: choose type */}
          {cancelStep === 1 && (() => {
            const currentMax = data?.club?.maxUsers || CLUB_MIN_LICENSES;
            const canCancelPartially = currentMax > CLUB_MIN_LICENSES;
            const partialCancellationPlan = createCancellationPlan(licenseBatches, currentMax - cancelKeepQty);
            return (
              <>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                  {t('clubDashboard.whatToDoWithLicenses')}
                </p>

                {/* Option: cancel some */}
                <div
                  onClick={() => canCancelPartially && setCancelType('partial')}
                  style={{
                    border: `2px solid ${cancelType === 'partial' ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    cursor: canCancelPartially ? 'pointer' : 'not-allowed',
                    background: cancelType === 'partial' ? 'rgba(59,130,246,0.08)' : 'transparent',
                    opacity: canCancelPartially ? 1 : 0.55,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="radio"
                      id="cancel-partial"
                      name="cancelType"
                      checked={cancelType === 'partial'}
                      disabled={!canCancelPartially}
                      onChange={() => canCancelPartially && setCancelType('partial')}
                      style={{ width: 16, height: 16, flexShrink: 0 }}
                    />
                    <label htmlFor="cancel-partial" style={{ cursor: 'pointer' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t('clubDashboard.cancelSomeLicenses')}</div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{t('clubDashboard.reduceLicensesDesc')}</div>
                    </label>
                  </div>
                  {!canCancelPartially && (
                    <InfoNotice style={{ marginTop: 12 }}>
                      Tienes el mínimo de {CLUB_MIN_LICENSES} licencias para club. Puedes cancelar las {CLUB_MIN_LICENSES} al vencimiento o mantener la suscripción.
                    </InfoNotice>
                  )}
                  {canCancelPartially && cancelType === 'partial' && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <Label style={{ fontSize: 12 }}>Licencias a mantener (mínimo 5, máximo {currentMax - 1})</Label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                        <Button
                          type="button"
                          $variant="secondary"
                          style={{ width: 36, height: 36, padding: 0, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 'bold' }}
                          onClick={(e) => { e.stopPropagation(); setCancelKeepQty(q => Math.max(5, q - 1)); }}
                          disabled={cancelKeepQty <= 5}
                        >
                          -
                        </Button>
                        <input
                          type="number"
                          style={{ width: 70, height: 36, textAlign: 'center', border: '1px solid #334155', borderRadius: 10, background: 'transparent', color: 'inherit', fontSize: 15, fontWeight: 'bold' }}
                          value={cancelKeepQty}
                          min={5}
                          max={currentMax - 1}
                          onClick={e => e.stopPropagation()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) setCancelKeepQty(Math.min(currentMax - 1, Math.max(5, val)));
                          }}
                        />
                        <Button
                          type="button"
                          $variant="secondary"
                          style={{ width: 36, height: 36, padding: 0, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 'bold' }}
                          onClick={(e) => { e.stopPropagation(); setCancelKeepQty(q => Math.min(currentMax - 1, q + 1)); }}
                          disabled={cancelKeepQty >= currentMax - 1}
                        >
                          +
                        </Button>
                        <Muted style={{ fontSize: 12 }}>
                          {t('clubDashboard.licensesWillBeCanceledLabel', { qty: currentMax - cancelKeepQty })}
                        </Muted>
                      </div>
                      {partialCancellationPlan.length > 0 && (
                        <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, opacity: 0.78 }}>
                          {t('clubDashboard.cancelOrderNotice')}
                          {partialCancellationPlan.map((item) => (
                            <div key={item.id}>
                              {t('clubDashboard.licensesWillCancel', { qty: item.cancelQuantity, label: item.label, date: formatLicenseDate(item.currentPeriodEnd) })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <BillingNoticeBox style={{ marginTop: 6, marginBottom: 6 }}>
                  <BillingNoticeTitle>
                    {t('clubDashboard.noteRenewDates')}
                  </BillingNoticeTitle>
                  <div>
                    {t('clubDashboard.noteDesc1')}<br /><br />
                    {t('clubDashboard.noteDesc2')}
                  </div>
                </BillingNoticeBox>

                {/* Option: cancel all */}
                <div
                  onClick={() => setCancelType('all')}
                  style={{
                    border: `2px solid ${cancelType === 'all' ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    background: cancelType === 'all' ? 'rgba(239,68,68,0.08)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="radio"
                      id="cancel-all"
                      name="cancelType"
                      checked={cancelType === 'all'}
                      onChange={() => setCancelType('all')}
                      style={{ width: 16, height: 16, flexShrink: 0 }}
                    />
                    <label htmlFor="cancel-all" style={{ cursor: 'pointer' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#ef4444' }}>{t('clubDashboard.cancelAllSubscription')}</div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{t('clubDashboard.cancelAllDesc')}</div>
                    </label>
                  </div>
                </div>

                <Row style={{ justifyContent: 'flex-end', gap: 8 }}>
                  <Button type="button" $variant="secondary" onClick={handleCloseCancelModal}>
                    {t('clubDashboard.noKeep')}
                  </Button>
                  <Button
                    type="button"
                    $variant={cancelType === 'all' ? 'danger' : 'primary'}
                    disabled={cancelType === 'partial' && (!canCancelPartially || cancelKeepQty < CLUB_MIN_LICENSES || cancelKeepQty >= currentMax)}
                    onClick={handleCancelNext}
                  >
                    {t('clubDashboard.next')}
                  </Button>
                </Row>
              </>
            );
          })()}

          {/* STEP 2: pick users to deactivate (partial) or confirm (all) */}
          {cancelStep === 2 && (() => {
            const activeTeams = (data?.teams || []).filter((team) => team.licenseActive !== false);
            const needToFree = cancelType === 'partial' ? Math.max(0, activeTeams.length - cancelKeepQty) : 0;
            const selectionComplete = needToFree === 0 || cancelSelectedIds.length === needToFree;
            const cancelQuantity = cancelType === 'partial' ? (data?.club?.maxUsers || 0) - cancelKeepQty : (data?.club?.maxUsers || 0);
            const cancellationPlan = createCancellationPlan(licenseBatches, cancelQuantity);

            return (
              <>
                {/* Summary box */}
                <div style={{
                  background: cancelType === 'all' ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
                  border: `1px solid ${cancelType === 'all' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  borderRadius: 12,
                  padding: '14px 18px',
                }}>
                  {cancelType === 'all' ? (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#ef4444', marginBottom: 6 }}>{t('clubDashboard.totalCancelTitle')}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>
                        {t('clubDashboard.keepAccessUntil', { date: subStatus?.currentPeriodEnd ? new Date(subStatus.currentPeriodEnd).toLocaleDateString() : 'final del período' })}{' '}
                        {t('clubDashboard.allFreeMode')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#f59e0b', marginBottom: 6 }}>{t('clubDashboard.reduceLicensesSummaryTitle')}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>
                        {t('clubDashboard.reduceLicensesSummaryDesc', { keep: cancelKeepQty, cancel: (data?.club?.maxUsers || 0) - cancelKeepQty })}
                      </div>
                    </>
                  )}
                </div>

                {cancellationPlan.length > 0 && (
                  <InfoNotice>
                    <strong>{t('clubDashboard.cancelPlan')}</strong>
                    <div style={{ marginTop: 6, lineHeight: 1.6 }}>
                      {cancellationPlan.map((item) => (
                        <div key={item.id}>
                          {t('clubDashboard.licensesWillCancel', { qty: item.cancelQuantity, label: item.label, date: formatLicenseDate(item.currentPeriodEnd) })}
                        </div>
                      ))}
                    </div>
                  </InfoNotice>
                )}

                <BillingNoticeBox>
                  <BillingNoticeTitle>
                    {t('clubDashboard.noteRenewDates')}
                  </BillingNoticeTitle>
                  <div>
                    {t('clubDashboard.noteDesc1')}<br /><br />
                    {t('clubDashboard.noteDesc2')}
                  </div>
                </BillingNoticeBox>

                {/* Team selection (only for partial reductions with active-team conflicts) */}
                {cancelType === 'partial' && needToFree > 0 && (
                  <Field>
                    <Label style={{ color: '#f59e0b', fontWeight: 700 }}>
                      {t('clubTeamManager.selectTeamsLabel', { count: needToFree })}
                    </Label>
                    <Muted style={{ fontSize: 12, marginBottom: 8 }}>
                      {t('clubTeamManager.selectTeamsDescription', { active: activeTeams.length, keep: cancelKeepQty, selected: cancelSelectedIds.length, need: needToFree })}
                    </Muted>
                    <div style={{ border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
                      {activeTeams.map((team, idx) => {
                        const isChecked = cancelSelectedIds.includes(team._id);
                        const isDisabled = !isChecked && cancelSelectedIds.length >= needToFree;
                        return (
                          <label
                            key={team._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '11px 14px',
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              background: isChecked
                                ? 'rgba(239,68,68,0.12)'
                                : idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              opacity: isDisabled ? 0.4 : 1,
                              transition: 'background 0.15s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isDisabled}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (cancelSelectedIds.length < needToFree) {
                                    setCancelSelectedIds(ids => [...ids, team._id]);
                                  }
                                } else {
                                  setCancelSelectedIds(ids => ids.filter(id => id !== team._id));
                                }
                              }}
                              style={{ width: 16, height: 16, flexShrink: 0 }}
                            />
                            <MdShield size={24} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>
                                {team.nombre}
                                {isChecked && (
                                  <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginLeft: 8 }}>{t('clubDashboard.atExpirationLabel')}</span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, opacity: 0.6 }}>{team.temporada?.año || ''}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {selectionComplete && (
                      <Muted style={{ color: '#10b981', fontSize: 11, marginTop: 6, fontWeight: 600 }}>
                        {t('clubTeamManager.teamsSelectedReady', { count: needToFree })}
                      </Muted>
                    )}
                  </Field>
                )}

                <Row style={{ justifyContent: 'space-between', gap: 8 }}>
                  <Button type="button" $variant="secondary" onClick={() => setCancelStep(1)} disabled={cancelingSub}>
                    {t('clubDashboard.back')}
                  </Button>
                  <Button
                    type="button"
                    $variant={cancelType === 'all' ? 'danger' : 'primary'}
                    disabled={cancelingSub || (cancelType === 'partial' && !selectionComplete)}
                    onClick={handleCancelSubscription}
                  >
                    {cancelingSub
                      ? t('clubDashboard.processing')
                      : cancelType === 'all'
                        ? t('clubDashboard.yesCancelAll')
                        : t('clubDashboard.cancelKeepQtyLabel', { qty: cancelKeepQty })}
                  </Button>
                </Row>
              </>
            );
          })()}

        </Stack>
      </Modal>
      {/* WAITING FOR PAYMENT MODAL */}
      <Modal
        open={isWaitingPayment}
        onClose={() => {
          finishPendingLicensePayment();
        }}
        title={t('clubDashboard.waitingPaymentTitle')}
      >
        <Stack $gap={16} style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
            <PaymentSpinner />
          </div>

          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            {t('clubDashboard.waitingPaymentMessage')}
          </p>

          <p style={{ margin: 0, fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>
            {t('clubDashboard.waitingPaymentDesc')}
          </p>

          <div style={{
            background: 'rgba(59,130,246,0.05)',
            border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 12,
            textAlign: 'left',
            color: '#60a5fa'
          }}>
            {t('clubDashboard.waitingPaymentClosedNotice')}
          </div>

          <Row style={{ justifyContent: 'center', gap: 12, marginTop: 8 }}>
            <Button
              type="button"
              $variant="secondary"
              onClick={() => {
                finishPendingLicensePayment();
              }}
            >
              {t('clubDashboard.cancelWaiting')}
            </Button>
            <Button
              type="button"
              $variant="secondary"
              onClick={() => verifyPendingLicensePayment()}
              disabled={checkingPayment}
            >
              {checkingPayment ? t('clubDashboard.verifying') : t('clubDashboard.alreadyPaidVerify')}
            </Button>
            <Button
              type="button"
              $variant="primary"
              onClick={() => {
                if (paymentUrl) window.open(paymentUrl, '_blank');
              }}
            >
              {t('clubDashboard.openStripePayment')}
            </Button>
          </Row>
        </Stack>
      </Modal>
    </Page>
  );
}
