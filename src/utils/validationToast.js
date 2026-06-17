import { toast } from '@/ui/toast';

const normalizeFields = (fields = []) => {
  if (!Array.isArray(fields)) return [];
  const seen = new Set();
  return fields
    .map((field) => String(field || '').trim())
    .filter(Boolean)
    .filter((field) => {
      if (seen.has(field)) return false;
      seen.add(field);
      return true;
    });
};

export function showMissingFieldsToast(t, fields) {
  const normalized = normalizeFields(fields);
  if (!normalized.length) return;
  toast.error(t('message.missingFields', { fields: normalized.join(', ') }));
}
