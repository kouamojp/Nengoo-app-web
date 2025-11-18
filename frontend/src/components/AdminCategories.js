import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '../services/api';

export const AdminCategories = (props) => {
  const { setUser } = props;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getAllCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Le nom de la catégorie est requis');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        setCategories(categories.map(cat =>
          cat.id === editingCategory.id ? { ...cat, ...formData } : cat
        ));
        alert('Catégorie mise à jour avec succès');
      } else {
        const result = await createCategory(formData);
        await loadCategories();
        alert('Catégorie créée avec succès');
      }

      setFormData({ name: '', description: '', icon: '' });
      setShowAddForm(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      alert(error.message || 'Erreur lors de l\'enregistrement de la catégorie');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (deleteConfirm !== categoryId) {
      setDeleteConfirm(categoryId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await deleteCategory(categoryId);
      setCategories(categories.filter(cat => cat.id !== categoryId));
      setDeleteConfirm(null);
      alert('Catégorie supprimée avec succès');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Erreur lors de la suppression de la catégorie');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', icon: '' });
    setShowAddForm(false);
    setEditingCategory(null);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar setUser={setUser} />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Gestion des Catégories</h1>
              <p className="text-gray-600 mt-2">
                Total: {categories.length} catégorie(s)
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              + Ajouter une catégorie
            </button>
          </div>

          {showAddForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la catégorie *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: Fruits et légumes"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Description de la catégorie"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icône (emoji)
                  </label>
                  <input
                    type="text"
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: 🍎"
                    maxLength="2"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    {editingCategory ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Chargement des catégories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-4">🏷️</div>
              <p className="text-gray-600 mb-4">Aucune catégorie créée</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Créer la première catégorie
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{category.icon || '🏷️'}</div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          {category.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {category.description && (
                    <p className="text-sm text-gray-600 mb-4">
                      {category.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        deleteConfirm === category.id
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {deleteConfirm === category.id ? 'Confirmer ?' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCategories;
