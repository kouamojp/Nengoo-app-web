import React, { useState, useEffect } from 'react';
import { notify } from './adminFeedback';
import { SectionHeader, EmptyRow } from './AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const PERIODS = [
    { days: 7, label: '7 jours' },
    { days: 30, label: '30 jours' },
    { days: 90, label: '3 mois' },
];

const NEED_LABELS = { search: 'Recherche', advice: 'Conseil', compare: 'Comparaison', support: 'Questions pratiques' };

const usd = (value) => `${(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} $`;
const percent = (part, total) => (total ? `${Math.round((part / total) * 100)} %` : '0 %');

const Stat = ({ label, value, hint }) => (
    <div className="adm-card p-4">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
);

const Breakdown = ({ title, rows, label = (name) => name }) => (
    <div className="adm-card overflow-x-auto">
        <table className="w-full">
            <caption className="px-4 pt-3 pb-1 text-left text-sm font-semibold text-gray-800">{title}</caption>
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="adm-th">Nom</th>
                    <th className="adm-th text-right">Messages</th>
                    <th className="adm-th text-right">Coût</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {rows.length === 0 ? (
                    <EmptyRow colSpan={3}>Aucune donnée sur cette période.</EmptyRow>
                ) : rows.map(row => (
                    <tr key={row.name}>
                        <td className="adm-td font-medium">{label(row.name)}</td>
                        <td className="adm-td text-right tabular-nums">{row.messages}</td>
                        <td className="adm-td text-right tabular-nums">{usd(row.costUsd)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// Usage et coût de l'assistant. Les fournisseurs se règlent dans le .env du
// serveur (voir docs/ASSISTANT_IA.md) : cet écran montre ce qui est actif.
const AssistantStats = () => {
    const [days, setDays] = useState(30);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/admin/assistant/stats?days=${days}`);
                if (!response.ok) throw new Error('Chargement impossible. Réessayez.');
                setStats(await response.json());
            } catch (error) {
                notify(error.message, 'error');
            }
        };
        load();
    }, [days]);

    const chipClass = (active) => `!min-h-0 h-9 px-4 rounded-full text-sm font-semibold border transition-colors ${
        active ? 'bg-purple-700 border-purple-700 text-white' : 'bg-white border-gray-300 text-gray-800 hover:border-purple-400'
    }`;

    return (
        <div>
            <SectionHeader
                title="Assistant IA"
                description="Usage et coût des conversations. Le texte des messages n'est pas enregistré."
            />

            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Période">
                {PERIODS.map(p => (
                    <button key={p.days} type="button" aria-pressed={days === p.days} onClick={() => setDays(p.days)} className={chipClass(days === p.days)}>
                        {p.label}
                    </button>
                ))}
            </div>

            {!stats ? (
                <p role="status" className="text-sm text-gray-600">Chargement…</p>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Stat label="Conversations" value={stats.conversations} hint={`${stats.messages} messages`} />
                        <Stat label="Coût de la période" value={usd(stats.costUsd)} hint={`${usd(stats.costPerConversationUsd)} par conversation`} />
                        <Stat label="Dépensé aujourd'hui" value={usd(stats.spentTodayUsd)} hint={`Plafond : ${usd(stats.dailyBudgetUsd)} par jour`} />
                        <Stat label="Sans résultat" value={percent(stats.noResult, stats.messages)} hint={`${stats.noResult} messages`} />
                        <Stat label="Servis par le cache" value={percent(stats.cached, stats.messages)} hint="Gratuits" />
                        <Stat label="Réponses sans IA" value={percent(stats.withoutAi, stats.messages)} hint="Clé absente, panne ou plafond" />
                        <Stat label="Passages au secours" value={stats.fallbacks} hint="Fournisseur principal indisponible" />
                        <Stat label="Réponses corrigées" value={stats.guarded} hint={`Prix ou délai non vérifié · ${(stats.averageLatencyMs / 1000).toFixed(1).replace('.', ',')} s en moyenne`} />
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Breakdown title="Par fournisseur" rows={stats.byProvider} label={(name) => (name === '—' ? 'Sans IA ou cache' : name)} />
                        <Breakdown title="Par besoin" rows={stats.byNeed} label={(name) => NEED_LABELS[name] || name} />
                    </div>

                    <div className="adm-card overflow-x-auto">
                        <table className="w-full">
                            <caption className="px-4 pt-3 pb-1 text-left text-sm font-semibold text-gray-800">Fournisseurs configurés</caption>
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="adm-th">Fournisseur</th>
                                    <th className="adm-th">Modèle</th>
                                    <th className="adm-th text-right">Clé</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {stats.providers.map(p => (
                                    <tr key={p.name}>
                                        <td className="adm-td font-medium">{p.name}</td>
                                        <td className="adm-td">{p.model}</td>
                                        <td className="adm-td text-right">{p.configured ? 'Configurée' : 'Absente'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <dl className="px-4 py-3 text-sm text-gray-700 border-t border-gray-200 space-y-1">
                            {Object.entries(stats.routing).map(([need, chain]) => (
                                <div key={need} className="flex gap-2">
                                    <dt className="font-medium">{NEED_LABELS[need]} :</dt>
                                    <dd>{chain.length ? chain.join(' → ') : 'catalogue sans IA'}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssistantStats;
