import React, { useState, useEffect, useMemo } from 'react';
import { notify } from './adminFeedback';
import { SectionHeader, Toolbar, SearchInput, EmptyRow, LoadingRows, formatXAF } from './AdminUI';
import { categorySelectOptions } from '../../lib/categories';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

// Produits invisibles dans les rayons (catégorie supprimée) ou rangés dans
// « Autres » : l'admin valide la catégorie suggérée ou en choisit une autre.
const ProductReclassification = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('orphans');
    const [search, setSearch] = useState('');
    // Catégorie choisie par produit (la suggestion par défaut)
    const [choices, setChoices] = useState({});
    const [selected, setSelected] = useState([]);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/products/unclassified`),
                fetch(`${API_BASE_URL}/categories`),
            ]);
            if (!productsRes.ok || !categoriesRes.ok) throw new Error('Chargement impossible. Réessayez.');
            const data = await productsRes.json();
            setProducts(data);
            setCategories(await categoriesRes.json());
            setChoices(Object.fromEntries(data.map(p => [p.id, p.suggestedCategoryId || ''])));
            setSelected([]);
        } catch (error) {
            notify(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const options = useMemo(() => categorySelectOptions(categories), [categories]);
    const orphans = products.filter(p => !p.inOther);
    const inOther = products.filter(p => p.inOther);
    const query = search.trim().toLowerCase();
    const rows = (tab === 'orphans' ? orphans : inOther)
        .filter(p => !query || [p.name, p.sellerName].some(v => (v || '').toLowerCase().includes(query)));
    const ready = rows.filter(p => choices[p.id]);

    const move = async (ids) => {
        // Un appel par catégorie de destination
        const groups = ids.reduce((acc, id) => {
            const target = choices[id];
            if (target) (acc[target] = acc[target] || []).push(id);
            return acc;
        }, {});
        if (!Object.keys(groups).length) {
            notify('Choisissez d\'abord une catégorie.', 'error');
            return;
        }
        setSaving(true);
        try {
            let moved = 0;
            for (const [categoryId, productIds] of Object.entries(groups)) {
                const response = await fetch(`${API_BASE_URL}/admin/products/reclassify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productIds, categoryId }),
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.detail || 'Le déplacement a échoué.');
                }
                moved += productIds.length;
                setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
                setSelected(prev => prev.filter(id => !productIds.includes(id)));
            }
            notify(`${moved} produit${moved > 1 ? 's' : ''} déplacé${moved > 1 ? 's' : ''}.`, 'success');
        } catch (error) {
            notify(error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggle = (id, checked) => setSelected(prev => (checked ? [...prev, id] : prev.filter(x => x !== id)));
    const allChecked = rows.length > 0 && rows.every(p => selected.includes(p.id));
    const tabClass = (active) => `!min-h-0 h-9 px-4 rounded-full text-sm font-semibold border transition-colors ${
        active ? 'bg-purple-700 border-purple-700 text-white' : 'bg-white border-gray-300 text-gray-800 hover:border-purple-400'
    }`;
    const selectedReady = selected.filter(id => choices[id]);

    return (
        <div>
            <SectionHeader
                title="Reclassement des produits"
                count={products.length}
                description="Ces produits n'apparaissent dans aucun rayon, ou sont rangés dans « Autres ». Vérifiez la catégorie proposée, changez-la si besoin, puis déplacez-les."
            />

            <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Produits à reclasser">
                <button type="button" role="tab" aria-selected={tab === 'orphans'} onClick={() => { setTab('orphans'); setSelected([]); }} className={tabClass(tab === 'orphans')}>
                    Sans rayon <span className="tabular-nums">{orphans.length}</span>
                </button>
                <button type="button" role="tab" aria-selected={tab === 'other'} onClick={() => { setTab('other'); setSelected([]); }} className={tabClass(tab === 'other')}>
                    Dans « Autres » <span className="tabular-nums">{inOther.length}</span>
                </button>
            </div>

            <Toolbar>
                <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un produit ou un vendeur" />
                <button
                    type="button"
                    className="adm-btn adm-btn-primary ml-auto"
                    disabled={saving || (selected.length ? !selectedReady.length : !ready.length)}
                    onClick={() => move(selected.length ? selectedReady : ready.map(p => p.id))}
                >
                    {selected.length
                        ? `Déplacer la sélection (${selectedReady.length})`
                        : `Déplacer tous ceux qui ont une catégorie (${ready.length})`}
                </button>
            </Toolbar>

            <div className="adm-card overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="adm-th w-10">
                                <input
                                    type="checkbox"
                                    aria-label="Tout sélectionner"
                                    checked={allChecked}
                                    onChange={(e) => setSelected(e.target.checked ? rows.map(p => p.id) : [])}
                                />
                            </th>
                            <th className="adm-th">Produit</th>
                            <th className="adm-th">Nouvelle catégorie</th>
                            <th className="adm-th"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <LoadingRows colSpan={4} />
                        ) : rows.length === 0 ? (
                            <EmptyRow colSpan={4}>
                                {query ? `Aucun produit ne correspond à « ${search} ».` : 'Rien à reclasser ici : tous ces produits sont rangés.'}
                            </EmptyRow>
                        ) : rows.map(p => {
                            const choice = choices[p.id] || '';
                            const isSuggestion = choice && choice === p.suggestedCategoryId;
                            return (
                                <tr key={p.id} className={selected.includes(p.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                                    <td className="adm-td">
                                        <input type="checkbox" aria-label={`Sélectionner ${p.name}`} checked={selected.includes(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} />
                                    </td>
                                    <td className="adm-td">
                                        <div className="flex items-center gap-3 min-w-[14rem]">
                                            {p.image
                                                ? <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
                                                : <span className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" aria-hidden="true" />}
                                            <div>
                                                <p className="font-semibold">{p.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {[p.sellerName, formatXAF(p.price), p.status !== 'approved' ? p.status : null].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="adm-td">
                                        <select
                                            value={choice}
                                            onChange={(e) => setChoices(prev => ({ ...prev, [p.id]: e.target.value }))}
                                            aria-label={`Catégorie pour ${p.name}`}
                                            className="adm-input min-w-[16rem]"
                                        >
                                            <option value="">Choisir une catégorie</option>
                                            {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                        </select>
                                        <span className="block text-xs mt-1 text-gray-500">
                                            {isSuggestion ? 'Proposée d\'après le nom du produit' : !p.suggestedCategoryId ? 'Aucune proposition' : ''}
                                        </span>
                                    </td>
                                    <td className="adm-td text-right">
                                        <button type="button" className="adm-link !min-h-0" disabled={!choice || saving} onClick={() => move([p.id])}>
                                            Déplacer
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProductReclassification;
