import React from 'react';
import { Link } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { openWhatsApp } from '../../lib/utils';
import { CheckIcon, ClockIcon, WhatsAppIcon } from '../ui/Icons';
import { AuthShell } from './AuthLayout';

const SUPPORT_WHATSAPP = '+237655123456';

// Étape 1 faite, étape 2 en cours, le reste à venir
const StepMark = ({ index }) => {
  if (index === 0) {
    return (
      <span className="w-7 h-7 rounded-full bg-purple-800 text-white flex items-center justify-center shrink-0">
        <CheckIcon className="w-4 h-4" strokeWidth={2.4} />
      </span>
    );
  }
  if (index === 1) {
    return (
      <span className="w-7 h-7 rounded-full bg-yellow-300 text-purple-950 flex items-center justify-center shrink-0">
        <ClockIcon className="w-4 h-4" strokeWidth={2.2} />
      </span>
    );
  }
  return <span className="w-7 h-7 rounded-full border-2 border-gray-400 shrink-0" aria-hidden="true" />;
};

const PendingApproval = ({ language }) => {
  const all = translations[language];
  const t = all.pendingPage;

  return (
    <AuthShell title={t.title} homeLabel={all.loginPage.home} intro={all.approvalMessage}>
      <div className="space-y-6">
        <section aria-labelledby="pending-steps">
          <h2 id="pending-steps" className="mb-4 text-xl font-bold text-gray-900">{t.nextSteps}</h2>
          <ol className="space-y-3">
            {t.steps.map((step, index) => (
              <li key={step} aria-current={index === 1 ? 'step' : undefined} className="flex items-center gap-3">
                <StepMark index={index} />
                <span className={`text-base ${index < 2 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <p className="text-sm text-gray-700">{t.delay}</p>

        <div className="space-y-3">
          <Link to="/" className="w-full h-12 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-semibold transition-colors flex items-center justify-center">
            {all.backToHome}
          </Link>
          <button
            type="button"
            onClick={() => openWhatsApp(SUPPORT_WHATSAPP, t.supportMessage)}
            className="w-full h-12 rounded-xl border border-gray-400 hover:border-purple-700 text-gray-900 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <WhatsAppIcon />
            {t.support}
          </button>
        </div>
      </div>
    </AuthShell>
  );
};

export default PendingApproval;
