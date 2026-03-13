import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sendFeedback } from '../api/feedback';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function FeedbackPage() {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const subjectLabel = (key: string) => {
    const map: Record<string, string> = {
      suggestion: t('feedback.subjectSuggestion'),
      bug: t('feedback.subjectBug'),
      other: t('feedback.subjectOther'),
    };
    return map[key] ?? key;
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setStatus('sending');
    try {
      await sendFeedback({
        subject: subjectLabel(subject),
        message: message.trim(),
        email: email.trim() || undefined,
      });
      setStatus('sent');
      setMessage('');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="screen">
      <h2 className="screen-title">{t('feedback.title')}</h2>
      <div className="feedback-form">
        <label className="settings-label">{t('feedback.subjectLabel')}</label>
        <select
          className="input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="suggestion">{t('feedback.subjectSuggestion')}</option>
          <option value="bug">{t('feedback.subjectBug')}</option>
          <option value="other">{t('feedback.subjectOther')}</option>
        </select>

        <label className="settings-label">{t('feedback.messageLabel')}</label>
        <textarea
          className="input feedback-textarea"
          placeholder={t('feedback.messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
        />

        <label className="settings-label">{t('feedback.emailLabel')}</label>
        <input
          className="input"
          type="email"
          placeholder={t('feedback.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {status === 'error' && <p className="error">{t('feedback.sendError')}</p>}
        {status === 'sent' && <p className="success">{t('feedback.sent')}</p>}

        <button
          className="btn btn-primary"
          style={{ marginTop: 12 }}
          onClick={handleSubmit}
          disabled={status === 'sending' || !message.trim()}
        >
          {status === 'sending' ? t('feedback.sending') : t('feedback.submit')}
        </button>
      </div>
    </div>
  );
}
