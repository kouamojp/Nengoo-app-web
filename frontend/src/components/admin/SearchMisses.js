import React, { useState, useEffect } from 'react';
import { notify } from './adminFeedback';
import { SectionHeader, EmptyRow, LoadingRows } from './AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const PERIODS = [
    { days: 7, label: '7 jours' },
    { days: 30, label: '30 jours' },
    { days: 90, label: '3 mois' },
];

// Ce que les clients cherchent sans le trouver : produits à ajouter au
// catalogue, ou mots à rattacher à une catégorie.
const SearchMisses = () => {
    const [days, setDays] = useState(30);
    const [misses, setMisses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/admin/search-misses?days=${days}&limit=100`);
                if (!response.ok) throw new Error('Chargement impossible. Réessayez.');
                setMisses(await response.json());
            } catch (error) {
                notify(error.message, 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [days]);

    const formatDate = (value) => new Date(`${value}${value.endsWith('Z') ? '' : 'Z'}`)
        .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const chipClass = (active) => `!min-h-0 h-9 px-4 rounded-full text-sm font-semibold border transition-colors ${
        active ? 'bg-purple-700 border-purple-700 text-white' : 'bg-white border-gray-300 text-gray-800 hover:border-purple-400'
    }`;

    return (
        <div>
            <SectionHeader
                title="Recherches sans résultat"
                count={misses.length}
                description="Ce que les clients ont cherché sans trouver de produit correspondant. Les mêmes mots écrits autrement (accents, pluriel) sont regroupés."
            />

            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Période">
                {PERIODS.map(p => (
                    <button key={p.days} type="button" aria-pressed={days === p.days} onClick={() => setDays(p.days)} className={chipClass(days === p.days)}>
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="adm-card overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="adm-th">Recherche</th>
                            <th className="adm-th text-right">Fois</th>
                            <th className="adm-th text-right">Dernière</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <LoadingRows colSpan={3} />
                        ) : misses.length === 0 ? (
                            <EmptyRow colSpan={3}>Aucune recherche sans résultat sur cette période.</EmptyRow>
                        ) : misses.map(m => (
                            <tr key={m.query} className="hover:bg-gray-50">
                                <td className="adm-td font-medium">{m.query}</td>
                                <td className="adm-td text-right tabular-nums">{m.count}</td>
                                <td className="adm-td text-right text-gray-500">{m.lastAt ? formatDate(m.lastAt) : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SearchMisses;
