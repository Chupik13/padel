import { useTranslation } from 'react-i18next';
import type { GuidePage } from '../hooks/useGuide';

interface GuideModalProps {
  page: GuidePage;
  onClose: () => void;
}

export default function GuideModal({ page, onClose }: GuideModalProps) {
  const { t } = useTranslation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal guide-modal" onClick={e => e.stopPropagation()}>
        <h3 className="guide-title">{t(`guide.${page}.title`)}</h3>
        <p className="guide-text">{t(`guide.${page}.text`)}</p>
        <button className="btn btn-primary" onClick={onClose}>{t('guide.ok')}</button>
      </div>
    </div>
  );
}
