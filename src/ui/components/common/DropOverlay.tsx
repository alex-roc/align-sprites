import { useI18n } from '../../../i18n/index.ts';

export function DropOverlay({ show }: { show: boolean }) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <div className="drop-overlay" aria-hidden="true">
      <p>{t('drop.overlay')}</p>
    </div>
  );
}
