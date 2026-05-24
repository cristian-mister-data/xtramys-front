import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';
import Select from '@/ui/Select';
import { Button, Field, Label, Row } from '@/ui/primitives';
import { formatSeasonYear, yearOptions } from './seasonHelpers';

export default function CreateSeasonModal({ open, onClose, onCreate, loading }) {
  const { t } = useTranslation();
  const [year, setYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    if (open) setYear(String(new Date().getFullYear()));
  }, [open]);

  const handleCreate = () => {
    if (!year) return;
    onCreate({ año: parseInt(year, 10) });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('season.createNewSeason')}
      width={420}
    >
      <Field>
        <Label>{t('season.year', 'Año')}</Label>
        <Select
          value={year}
          onChange={setYear}
          options={yearOptions}
          renderLabel={(o) => formatSeasonYear(o.value)}
        />
      </Field>
      <Row $gap={8} style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <Button $variant="secondary" onClick={onClose} disabled={loading}>
          {t('common.cancel', 'Cancelar')}
        </Button>
        <Button onClick={handleCreate} disabled={loading || !year}>
          {loading ? '...' : t('common.create', 'Crear')}
        </Button>
      </Row>
    </Modal>
  );
}
