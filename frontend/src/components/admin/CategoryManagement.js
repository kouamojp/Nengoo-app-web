import React, { useState, useEffect } from 'react';
import { notify, confirmAction } from './adminFeedback';
import { SectionHeader, SelectionBar, EmptyRow, LoadingRows, Modal, Field } from './AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const CategoryManagement = (props) => {
    const { user } = props;
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCategoryData, setNewCategoryData] = useState({
        name: '',
        description: '',
    });
    const [selectedCategories, setSelectedCategories] = useState([]);

    const getRoleForHeader = () => {
        if (user && user.whatsapp === '+237600000000') {
            return 'super_admin';
        }
        return 'admin'; 
    };

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
        if (await confirmAction({ title: `Supprimer ${selectedCategories.length} catégorie(s) ?`, message: 'Les produits rattachés ne seront plus classés dans ces catégories.' })) {
            try {
                const response = await fetch(`${API_BASE_URL}/categories`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Role': getRoleForHeader(),
                    },
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
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': getRoleForHeader(),
                },
                body: JSON.stringify(newCategoryData),
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
            setNewCategoryData({ name: '', description: '' });
            notify('Catégorie ajoutée avec succès.', 'success');
        } catch (error) {
            console.error('Error adding category:', error);
            notify(error.message, 'error');
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (await confirmAction({ title: 'Supprimer cette catégorie ?', message: 'Les produits rattachés ne seront plus classés dans cette catégorie.' })) {
            try {
                const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                    method: 'DELETE',
                    headers: { 'X-Admin-Role': getRoleForHeader() },
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
    
    return (
        <div>
            <SectionHeader
                title="Catégories"
                count={categories.length}
                description="Les catégories proposées aux vendeurs et affichées dans le catalogue."
                actions={
                    <button onClick={() => setShowAddModal(true)} className="adm-btn adm-btn-primary">
                        Ajouter une catégorie
                    </button>
                }
            />

            <SelectionBar count={selectedCategories.length} onDelete={handleBulkDelete} onClear={() => setSelectedCategories([])} />

            {showAddModal && (
                <Modal title="Ajouter une catégorie" onClose={() => setShowAddModal(false)} size="max-w-lg">
                    <form onSubmit={handleAddCategory} className="space-y-4">
                        <Field label="Nom" required>
                            <input type="text" name="name" value={newCategoryData.name} onChange={handleInputChange} placeholder="Ex. : Maison et jardin" className="adm-input" required />
                        </Field>
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
                        ) : categories.map((cat) => (
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
                                    <p className="font-semibold">{cat.name}</p>
                                    <p className="text-xs text-gray-500">{cat.id}</p>
                                </td>
                                <td className="adm-td text-gray-600 max-w-md">{cat.description}</td>
                                <td className={`adm-td text-right tabular-nums ${cat.productCount ? '' : 'text-gray-400'}`}>{cat.productCount || 0}</td>
                                <td className="adm-td text-right">
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="adm-link-danger !min-h-0">Supprimer</button>
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