import React, { useState, useEffect } from 'react';
import { notify, confirmAction } from './adminFeedback';
import { SectionHeader, SelectionBar, EmptyRow, LoadingRows, Modal, Field, Toolbar, SearchInput } from './AdminUI';
import { topLevelCategories, subcategoriesOf, normalizeCategoryName } from '../../lib/categories';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const emptyCategory = { name: '', nameEn: '', description: '', parentId: '', image: '', order: 0 };
    const [newCategoryData, setNewCategoryData] = useState(emptyCategory);
    // Catégorie en cours de modification
    const [editingCategory, setEditingCategory] = useState(null);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [search, setSearch] = useState('');

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/categories`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewCategoryData({ ...newCategoryData, [name]: value });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedCategories(categories.map(c => c.id));
        } else {
            setSelectedCategories([]);
        }
    };

    const handleSelectOne = (e, id) => {
        if (e.target.checked) {
            setSelectedCategories([...selectedCategories, id]);
        } else {
            setSelectedCategories(selectedCategories.filter(catId => catId !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (await confirmAction({ title: `Supprimer ${selectedCategories.length} catégorie(s) ?`, message: 'Seules les catégories vides peuvent être supprimées : déplacez d\'abord leurs produits.' })) {
            try {
                const response = await fetch(`${API_BASE_URL}/categories`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: selectedCategories }),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    try {
                        const err = JSON.parse(errorText);
                        throw new Error(err.detail || 'Failed to delete categories');
                    } catch (e) {
                        throw new Error(errorText || 'Failed to delete categories');
                    }
                }
                await fetchCategories();
                setSelectedCategories([]);
                notify('Catégories supprimées avec succès.', 'success');
            } catch (error) {
                console.error('Error deleting categories:', error);
                notify(error.message, 'error');
            }
        }
    };


    const handleAddCategory = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryPayload(newCategoryData)),
            });
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const err = JSON.parse(errorText);
                    throw new Error(err.detail || 'Failed to create category');
                } catch (e) {
                    throw new Error(errorText || 'Failed to create category');
                }
            }
            await fetchCategories();
            setShowAddModal(false);
            setNewCategoryData(emptyCategory);
            notify('Catégorie ajoutée avec succès.', 'success');
        } catch (error) {
            console.error('Error adding category:', error);
            notify(error.message, 'error');
        }
    };

    const handleUpdateCategory = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/categories/${editingCategory.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryPayload(editingCategory)),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || 'La modification a échoué.');
            }
            await fetchCategories();
            setEditingCategory(null);
            notify('Catégorie modifiée.', 'success');
        } catch (error) {
            notify(error.message, 'error');
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (await confirmAction({ title: 'Supprimer cette catégorie ?', message: 'Seule une catégorie vide peut être supprimée : déplacez d\'abord ses produits.' })) {
            try {
                const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    try {
                        const err = JSON.parse(errorText);
                        throw new Error(err.detail || 'Failed to delete category');
                    } catch (e) {
                        throw new Error(errorText || 'Failed to delete category');
                    }
                }
                await fetchCategories();
                notify('Catégorie supprimée avec succès.', 'success');
            } catch (error) {
                console.error('Error deleting category:', error);
                notify(error.message, 'error');
            }
        }
    };
    
    const categoryPayload = (data) => ({
        name: data.name,
        nameEn: data.nameEn || null,
        description: data.description || '',
        parentId: data.parentId || null,
        image: data.image || null,
        order: Number(data.order) || 0,
    });

    // Catégories principales proposées comme parent ; une catégorie qui a déjà
    // des sous-catégories ne peut pas devenir elle-même une sous-catégorie
    const parentOptions = (selfId) => topLevelCategories(categories).filter(c => c.id !== selfId);
    const hasChildren = (id) => categories.some(c => c.parentId === id);

    // Chaque catégorie principale suivie de ses sous-catégories
    const allRows = [];
    topLevelCategories(categories).forEach(parent => {
        allRows.push({ cat: parent, isSub: false });
        subcategoriesOf(categories, parent.id).forEach(child => allRows.push({ cat: child, isSub: true, parent }));
    });
    categories.filter(c => !allRows.some(r => r.cat.id === c.id)).forEach(c => allRows.push({ cat: c, isSub: true }));

    // Recherche : une sous-catégorie trouvée s'affiche avec sa catégorie principale
    const query = normalizeCategoryName(search);
    const matches = (c) => [c.name, c.nameEn, ...(c.formerNames || [])].some(n => normalizeCategoryName(n).includes(query));
    const rows = query
        ? allRows.filter(({ cat, isSub, parent }) => matches(cat) || (!isSub && subcategoriesOf(categories, cat.id).some(matches)) || (isSub && parent && matches(parent)))
        : allRows;
    const familyCount = (cat) => (cat.productCount || 0)
        + subcategoriesOf(categories, cat.id).reduce((sum, c) => sum + (c.productCount || 0), 0);

    const parentField = (value, onChange, selfId) => (
        <Field label="Catégorie parente" hint="Laissez « Aucune » pour une catégorie principale.">
            <select value={value || ''} onChange={onChange} className="adm-input" disabled={selfId && hasChildren(selfId)}>
                <option value="">Aucune (catégorie principale)</option>
                {parentOptions(selfId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {selfId && hasChildren(selfId) && (
                <span className="block text-xs text-gray-500 mt-1">Cette catégorie a des sous-catégories : elle reste une catégorie principale.</span>
            )}
        </Field>
    );

    const detailFields = (data, setData) => (
        <>
            <Field label="Nom en anglais" hint="Affiché quand le site est en anglais.">
                <input type="text" value={data.nameEn || ''} onChange={(e) => setData({ ...data, nameEn: e.target.value })} className="adm-input" />
            </Field>
            <div className="grid sm:grid-cols-[1fr_8rem] gap-4">
                <Field label="Image (adresse)" hint="Lien vers une image carrée, affichée sur l'accueil.">
                    <input type="url" value={data.image || ''} onChange={(e) => setData({ ...data, image: e.target.value })} placeholder="https://…" className="adm-input" />
                </Field>
                <Field label="Ordre" hint="Les plus petits d'abord.">
                    <input type="number" value={data.order ?? 0} onChange={(e) => setData({ ...data, order: e.target.value })} className="adm-input" />
                </Field>
            </div>
            {data.image && <img src={data.image} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />}
        </>
    );

    return (
        <div>
            <SectionHeader
                title="Catégories"
                count={categories.length}
                description="Les catégories et sous-catégories proposées aux vendeurs et affichées dans le catalogue. Celles sans produit n'apparaissent pas sur le site."
                actions={
                    <button onClick={() => setShowAddModal(true)} className="adm-btn adm-btn-primary">
                        Ajouter une catégorie
                    </button>
                }
            />

            <Toolbar>
                <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une catégorie" />
            </Toolbar>

            <SelectionBar count={selectedCategories.length} onDelete={handleBulkDelete} onClear={() => setSelectedCategories([])} />

            {showAddModal && (
                <Modal title="Ajouter une catégorie" onClose={() => setShowAddModal(false)} size="max-w-lg">
                    <form onSubmit={handleAddCategory} className="space-y-4">
                        <Field label="Nom" required>
                            <input type="text" name="name" value={newCategoryData.name} onChange={handleInputChange} placeholder="Ex. : Maison et jardin" className="adm-input" required />
                        </Field>
                        {parentField(newCategoryData.parentId, (e) => setNewCategoryData({ ...newCategoryData, parentId: e.target.value }))}
                        {detailFields(newCategoryData, setNewCategoryData)}
                        <Field label="Description">
                            <textarea name="description" value={newCategoryData.description} onChange={handleInputChange} className="adm-input" rows="3" />
                        </Field>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setShowAddModal(false)} className="adm-btn adm-btn-secondary">Annuler</button>
                            <button type="submit" className="adm-btn adm-btn-primary">Ajouter la catégorie</button>
                        </div>
                    </form>
                </Modal>
            )}

            {editingCategory && (
                <Modal title="Modifier la catégorie" onClose={() => setEditingCategory(null)} size="max-w-lg">
                    <form onSubmit={handleUpdateCategory} className="space-y-4">
                        <Field label="Nom" required>
                            <input type="text" value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} className="adm-input" required />
                        </Field>
                        {parentField(editingCategory.parentId, (e) => setEditingCategory({ ...editingCategory, parentId: e.target.value }), editingCategory.id)}
                        {detailFields(editingCategory, setEditingCategory)}
                        <Field label="Description">
                            <textarea value={editingCategory.description || ''} onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })} className="adm-input" rows="3" />
                        </Field>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setEditingCategory(null)} className="adm-btn adm-btn-secondary">Annuler</button>
                            <button type="submit" className="adm-btn adm-btn-primary">Enregistrer</button>
                        </div>
                    </form>
                </Modal>
            )}

            <div className="adm-card overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="adm-th w-10">
                                <input
                                    type="checkbox"
                                    aria-label="Tout sélectionner"
                                    onChange={handleSelectAll}
                                    checked={selectedCategories.length === categories.length && categories.length > 0}
                                />
                            </th>
                            <th className="adm-th">Catégorie</th>
                            <th className="adm-th">Description</th>
                            <th className="adm-th text-right">Produits</th>
                            <th className="adm-th"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <LoadingRows colSpan={5} />
                        ) : categories.length === 0 ? (
                            <EmptyRow colSpan={5}>Aucune catégorie. Ajoutez-en une pour que les vendeurs puissent classer leurs produits.</EmptyRow>
                        ) : rows.length === 0 ? (
                            <EmptyRow colSpan={5}>Aucune catégorie ne correspond à « {search} ».</EmptyRow>
                        ) : rows.map(({ cat, isSub, parent }) => (
                            <tr key={cat.id} className={selectedCategories.includes(cat.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                                <td className="adm-td">
                                    <input
                                        type="checkbox"
                                        aria-label={`Sélectionner ${cat.name}`}
                                        checked={selectedCategories.includes(cat.id)}
                                        onChange={(e) => handleSelectOne(e, cat.id)}
                                    />
                                </td>
                                <td className="adm-td">
                                    <div className={`flex items-center gap-3 ${isSub ? 'pl-6 border-l-2 border-purple-200' : ''}`}>
                                        {cat.image && <img src={cat.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />}
                                        <div>
                                            <p className={isSub ? 'font-medium' : 'font-semibold'}>{cat.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {[cat.nameEn, isSub ? (parent ? `sous-catégorie de ${parent.name}` : 'sous-catégorie (parent supprimé)') : null, `ordre ${cat.order || 0}`].filter(Boolean).join(' · ')}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="adm-td text-gray-600 max-w-md">{cat.description}</td>
                                <td className={`adm-td text-right tabular-nums ${(isSub ? cat.productCount : familyCount(cat)) ? '' : 'text-gray-400'}`}>
                                    {isSub ? (cat.productCount || 0) : familyCount(cat)}
                                </td>
                                <td className="adm-td text-right">
                                    <div className="inline-flex gap-4">
                                        <button onClick={() => setEditingCategory({ ...cat, parentId: cat.parentId || '', nameEn: cat.nameEn || '', image: cat.image || '' })} className="adm-link !min-h-0">Modifier</button>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="adm-link-danger !min-h-0">Supprimer</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CategoryManagement;