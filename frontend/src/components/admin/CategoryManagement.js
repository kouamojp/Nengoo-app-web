import React, { useState, useEffect } from 'react';

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
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedCategories.length} catégories?`)) {
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
                alert('🗑️ Catégories supprimées avec succès!');
            } catch (error) {
                console.error('Error deleting categories:', error);
                alert(`Erreur: ${error.message}`);
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
            alert('✅ Catégorie ajoutée avec succès!');
        } catch (error) {
            console.error('Error adding category:', error);
            alert(`Erreur: ${error.message}`);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie?')) {
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
                alert('🗑️ Catégorie supprimée avec succès!');
            } catch (error) {
                console.error('Error deleting category:', error);
                alert(`Erreur: ${error.message}`);
            }
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6 max-sm:flex-col max-sm:space-y-4">
                <h2 className="text-xl md:text-3xl font-bold">Gestion des Catégories ({categories.length})</h2>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={handleBulkDelete}
                        disabled={selectedCategories.length === 0}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
                    >
                        Supprimer la sélection
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded">
                        + Ajouter une Catégorie
                    </button>
                </div>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">🏷️ Ajouter une nouvelle catégorie</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                        </div>
                        <form onSubmit={handleAddCategory} className="space-y-4">
                            <input type="text" name="name" value={newCategoryData.name} onChange={handleInputChange} placeholder="Nom de la catégorie (ex: Maison et Jardin)" className="w-full px-4 py-3 border rounded-lg" required />
                            <textarea name="description" value={newCategoryData.description} onChange={handleInputChange} placeholder="Description" className="w-full px-4 py-3 border rounded-lg" />
                            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-6 rounded-lg font-semibold">Ajouter la Catégorie</button>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md overflow-auto">
                {loading ? <p className="p-6">Chargement...</p> : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input 
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={selectedCategories.length === categories.length && categories.length > 0}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre de produits</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {categories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <input 
                                            type="checkbox"
                                            checked={selectedCategories.includes(cat.id)}
                                            onChange={(e) => handleSelectOne(e, cat.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm">{cat.id}</td>
                                    <td className="px-6 py-4 font-medium">{cat.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{cat.description}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{cat.productCount}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:text-red-800 font-semibold text-sm">Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default CategoryManagement;