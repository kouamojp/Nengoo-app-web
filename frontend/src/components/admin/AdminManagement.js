
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminRoles } from '../../lib/mockData'; // Keep for role display info

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const AdminManagement = (props) => {
  const { user } = props;
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [passwordChangeAdmin, setPasswordChangeAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    email: '',
    role: 'support',
    accessCode: ''
  });

  const isSuperAdmin = user && user.type === 'admin' && user.whatsapp === '+237600000000';

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admins`, {
        headers: { 'X-Admin-Role': 'super_admin' }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }
      const data = await response.json();
      setAdmins(data);
    } catch (error) {
      console.error("Error fetching admins:", error);
      alert('Erreur lors de la récupération des administrateurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin]);


  if (!user || user.type !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-4">Accès Refusé</h2>
          <p className="text-gray-600 mb-6">Réservé aux administrateurs.</p>
          <Link to="/admin/login" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };


  const handleEditAdmin = (admin) => {
    setEditingAdmin(admin.id);
    setFormData({
      name: admin.name,
      email: admin.email,
      role: admin.role,
      whatsapp: admin.whatsapp,
      accessCode: '' // Ne pas afficher le code d'accès
    });
    setShowAddForm(true); // Afficher le formulaire
  };

  const handleAddAdmin = async () => {
    if (!formData.name || !formData.whatsapp || !formData.email || !formData.accessCode) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Role': 'super_admin'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
            const err = JSON.parse(errorText);
            throw new Error(err.detail || 'Failed to create admin');
        } catch (e) {
            throw new Error(errorText || 'Failed to create admin');
        }
      }

      await fetchAdmins(); // Refetch admins
      setFormData({ name: '', whatsapp: '', email: '', role: 'support', accessCode: '' });
      setShowAddForm(false);
      alert(`✅ Administrateur "${formData.name}" ajouté avec succès!`);

    } catch (error) {
      console.error("Error creating admin:", error);
      alert(`Erreur: ${error.message}`);
    }
  };
  
  const handleUpdateAdmin = async () => {
      if (!editingAdmin) return;
  
      const updateData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
      };
  
      try {
          const response = await fetch(`${API_BASE_URL}/admins/${editingAdmin}`, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'X-Admin-Role': 'super_admin',
              },
              body: JSON.stringify(updateData),
          });
  
          if (!response.ok) {
            const errorText = await response.text();
            try {
                const err = JSON.parse(errorText);
                throw new Error(err.detail || 'Failed to update admin');
            } catch (e) {
                throw new Error(errorText || 'Failed to update admin');
            }
          }
  
          await fetchAdmins();
          setEditingAdmin(null);
          setFormData({ name: '', whatsapp: '', email: '', role: 'support', accessCode: '' });
          alert('✅ Administrateur mis à jour avec succès!');
  
      } catch (error) {
          console.error("Error updating admin:", error);
          alert(`Erreur: ${error.message}`);
      }
  };

  const handlePasswordChange = async () => {
    if (!passwordChangeAdmin) return;

    if (newPassword.length < 6) {
        alert('Le nouveau mot de passe doit contenir au moins 6 caractères.');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Les mots de passe ne correspondent pas.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admins/${passwordChangeAdmin.id}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Role': 'super_admin',
            },
            body: JSON.stringify({ newPassword: newPassword }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const err = JSON.parse(errorText);
                throw new Error(err.detail || 'Failed to update password');
            } catch (e) {
                throw new Error(errorText || 'Failed to update password');
            }
        }

        alert('✅ Mot de passe mis à jour avec succès!');
        setPasswordChangeAdmin(null);
        setNewPassword('');
        setConfirmPassword('');

    } catch (error) {
        console.error("Error updating password:", error);
        alert(`Erreur: ${error.message}`);
    }
  };
  

  const toggleAdminStatus = async (adminId, currentStatus) => {
    if (!isSuperAdmin) {
      alert('⚠️ Seul le Super Administrateur peut changer le statut des admins');
      return;
    }
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
        const response = await fetch(`${API_BASE_URL}/admins/${adminId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Role': 'super_admin'
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const err = JSON.parse(errorText);
                throw new Error(err.detail || 'Failed to update status');
            } catch (e) {
                throw new Error(errorText || 'Failed to update status');
            }
        }
        await fetchAdmins();
        alert(`Statut de l'administrateur mis à jour à "${newStatus}".`);
    } catch (error) {
        console.error("Error updating status:", error);
        alert(`Erreur: ${error.message}`);
    }
  };

  const deleteAdmin = async (adminId) => {
    if (!isSuperAdmin) {
      alert('⚠️ Seul le Super Administrateur peut supprimer des admins');
      return;
    }

    const admin = admins.find(a => a.id === adminId);
    if (admin && confirm(`Êtes-vous sûr de vouloir supprimer "${admin.name}"?`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/admins/${adminId}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Role': 'super_admin' }
        });
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const err = JSON.parse(errorText);
                throw new Error(err.detail || 'Failed to delete admin');
            } catch (e) {
                throw new Error(errorText || 'Failed to delete admin');
            }
        }
        await fetchAdmins();
        alert('✅ Administrateur supprimé');
      } catch (error) {
          console.error("Error deleting admin:", error);
          alert(`Erreur: ${error.message}`);
      }
    }
  };

  const getRoleStats = () => {
    return Object.keys(adminRoles).map(roleKey => ({
      role: roleKey,
      ...adminRoles[roleKey],
      count: admins.filter(a => a.role === roleKey).length
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-700 to-red-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/admin/dashboard" className="text-white hover:text-gray-200">
                ← Retour Dashboard
              </Link>
              <div className="border-l border-white/30 pl-4">
                <h1 className="text-2xl font-bold">👥 Gestion des Administrateurs</h1>
                <p className="text-sm opacity-90">Rôles et permissions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">👤 {user.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {getRoleStats().map((stat) => (
            <div key={stat.role} className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-${stat.color}-500`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold">{stat.count}</p>
                </div>
                <div className="text-4xl">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Roles & Permissions Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">📋 Rôles et Permissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(adminRoles).map(([key, role]) => (
              <div key={key} className="border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-3xl">{role.icon}</span>
                  <div>
                    <h3 className="font-bold">{role.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full bg-${role.color}-100 text-${role.color}-800`}>
                      {key}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Permissions:</p>
                  {role.permissions.map((perm, idx) => (
                    <div key={idx} className="text-xs text-gray-600 flex items-start justify-center">
                      <span className="text-green-500 mr-1">✓</span>
                      <span>{perm.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Admin Button */}
        {isSuperAdmin && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-700 hover:to-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg"
            >
              {showAddForm ? '✕ Annuler' : '+ Ajouter un Administrateur'}
            </button>
          </div>
        )}

        {/* Add/Edit Admin Form */}
        {isSuperAdmin && (showAddForm || editingAdmin) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-xl font-bold mb-6">
              {editingAdmin ? '✏️ Modifier Administrateur' : '➕ Nouvel Administrateur'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Marie Kouam"
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Numéro WhatsApp *</label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  placeholder="+237 XXX XXX XXX"
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={editingAdmin}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@nengoo.com"
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rôle *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!isSuperAdmin}
                >
                  {Object.entries(adminRoles).map(([key, role]) => (
                    <option key={key} value={key}>
                      {role.icon} {role.name}
                    </option>
                  ))}
                </select>
                {!isSuperAdmin && (
                  <p className="text-xs text-gray-500 mt-1">Seul le Super Admin peut changer les rôles</p>
                )}
              </div>

              {!editingAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code d'accès *</label>
                  <input
                    type="password"
                    name="accessCode"
                    value={formData.accessCode}
                    onChange={handleInputChange}
                    placeholder="Créer un code d'accès"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Code secret pour la connexion</p>
                </div>
              )}
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={editingAdmin ? handleUpdateAdmin : handleAddAdmin}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {editingAdmin ? 'Mettre à jour' : 'Créer Administrateur'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingAdmin(null);
                  setFormData({ name: '', whatsapp: '', email: '', role: 'support', accessCode: '' });
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Admins List */}
        {isSuperAdmin && (
          <div className="bg-white rounded-lg shadow-md overflow-auto">
          <div className="p-6 border-b">
            <h3 className="text-xl font-bold">Liste des Administrateurs ({admins.length})</h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
                <p className="p-6">Chargement des administrateurs...</p>
            ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Administrateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Création</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dernière Connexion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {admins.map((admin) => {
                  const roleInfo = adminRoles[admin.role];
                  return (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{roleInfo?.icon}</div>
                          <div>
                            <p className="font-medium text-gray-900">{admin.name}</p>
                            <p className="text-sm text-gray-500">{admin.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{admin.whatsapp}</p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs rounded-full font-medium bg-${roleInfo?.color}-100 text-${roleInfo?.color}-800`}>
                          {roleInfo?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs rounded-full font-medium ${ 
                          admin.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.status === 'active' ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(admin.createdDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Jamais'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditAdmin(admin)}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                          >
                            ✏️ Modifier
                          </button>
                          {isSuperAdmin && (
                            <button
                                onClick={() => {
                                    setPasswordChangeAdmin(admin);
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }}
                                className="text-gray-600 hover:text-gray-800 font-semibold text-sm"
                            >
                                🔑 Changer Mdp
                            </button>
                          )}
                          {isSuperAdmin && admin.role !== 'super_admin' && (
                            <>
                              <button
                                onClick={() => toggleAdminStatus(admin.id, admin.status)}
                                className="text-orange-600 hover:text-orange-800 font-semibold text-sm"
                              >
                                {admin.status === 'active' ? '🚫 Suspendre' : '✅ Activer'}
                              </button>
                              <button
                                onClick={() => deleteAdmin(admin.id)}
                                className="text-red-600 hover:text-red-800 font-semibold text-sm"
                              >
                                🗑️ Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        </div>
        )}
        
        {/* Password Change Modal */}
        {isSuperAdmin && passwordChangeAdmin && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                    <h3 className="text-2xl font-bold mb-6">Changer le mot de passe pour <span className="text-purple-600">{passwordChangeAdmin.name}</span></h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex space-x-4 mt-8">
                        <button
                            onClick={handlePasswordChange}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold w-full"
                        >
                            Mettre à jour le mot de passe
                        </button>
                        <button
                            onClick={() => setPasswordChangeAdmin(null)}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-semibold w-full"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        )}

        

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
          <div className="flex items-start space-x-3">
            <span className="text-3xl">ℹ️</span>
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Informations Importantes</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Seul le <strong>Super Administrateur</strong> peut suspendre ou supprimer des admins</li>
                <li>• Les codes d'accès ne sont affichés qu'une seule fois lors de la création</li>
                <li>• Chaque rôle a des permissions spécifiques définies</li>
                <li>• Les admins suspendus ne peuvent plus se connecter</li>
                <li>• Le Super Admin ne peut pas être supprimé ou suspendu</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;
