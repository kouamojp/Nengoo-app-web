
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminRoles } from '../../lib/mockData'; // Keep for role display info
import AdminLayout from './AdminLayout';
import { SelectionBar, StatusBadge, EmptyRow, LoadingRows } from './AdminUI';
import { notify, confirmAction, statusLabel } from './adminFeedback';

const PERMISSION_LABELS = {
  all: 'Toutes les permissions',
  manage_users: 'Gérer les utilisateurs',
  view_users: 'Voir les utilisateurs',
  manage_sellers: 'Gérer les vendeurs',
  manage_products: 'Gérer les produits',
  manage_orders: 'Gérer les commandes',
  view_orders: 'Voir les commandes',
  view_analytics: 'Voir les statistiques',
  manage_messages: 'Gérer les messages',
};

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
      const [selectedAdmins, setSelectedAdmins] = useState([]);
      const [formData, setFormData] = useState({    name: '',
    whatsapp: '',
    email: '',
    role: 'support',
    accessCode: ''
  });

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedAdmins(admins.map(a => a.id));
        } else {
            setSelectedAdmins([]);
        }
    };

    const handleSelectOne = (e, id) => {
        if (e.target.checked) {
            setSelectedAdmins([...selectedAdmins, id]);
        } else {
            setSelectedAdmins(selectedAdmins.filter(adminId => adminId !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedAdmins.includes(user.id)) {
            notify("Vous ne pouvez pas vous supprimer vous-même.", 'error');
            return;
        }
        if (await confirmAction({ title: `Supprimer ${selectedAdmins.length} administrateur(s) ?`, message: "Ils ne pourront plus se connecter à l'administration. Cette action est définitive." })) {
            try {
                const response = await fetch(`${API_BASE_URL}/admins`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Role': 'super_admin',
                    },
                    body: JSON.stringify({ ids: selectedAdmins }),
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || 'Failed to delete admins');
                }
                await fetchAdmins();
                setSelectedAdmins([]);
                notify('Administrateurs supprimés avec succès.', 'success');
            } catch (error) {
                console.error('Error deleting admins:', error);
                notify(error.message, 'error');
            }
        }
    };

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
      notify("Impossible de charger la liste des administrateurs. Rechargez la page pour réessayer.", 'error');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="adm-card max-w-md w-full p-8 text-left">
          <h1 className="adm-title">Accès réservé</h1>
          <p className="adm-subtitle mb-6">Connectez-vous avec un compte administrateur pour accéder à cette page.</p>
          <Link to="/admin/login" className="adm-btn adm-btn-primary">Se connecter</Link>
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
      notify('Veuillez remplir tous les champs', 'error');
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
      notify(`Administrateur "${formData.name}" ajouté avec succès.`, 'success');

    } catch (error) {
      console.error("Error creating admin:", error);
      notify(error.message, 'error');
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
          notify('Administrateur mis à jour avec succès.', 'success');
  
      } catch (error) {
          console.error("Error updating admin:", error);
          notify(error.message, 'error');
      }
  };

  const handlePasswordChange = async () => {
    if (!passwordChangeAdmin) return;

    if (newPassword.length < 6) {
        notify('Le nouveau mot de passe doit contenir au moins 6 caractères.', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        notify('Les mots de passe ne correspondent pas.', 'error');
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

        notify('Mot de passe mis à jour avec succès.', 'success');
        setPasswordChangeAdmin(null);
        setNewPassword('');
        setConfirmPassword('');

    } catch (error) {
        console.error("Error updating password:", error);
        notify(error.message, 'error');
    }
  };
  

  const toggleAdminStatus = async (adminId, currentStatus) => {
    if (!isSuperAdmin) {
      notify('Seul le Super Administrateur peut changer le statut des admins', 'error');
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
        notify(`Statut de l'administrateur : ${statusLabel(newStatus)}.`, 'success');
    } catch (error) {
        console.error("Error updating status:", error);
        notify(error.message, 'error');
    }
  };

  const deleteAdmin = async (adminId) => {
    if (!isSuperAdmin) {
      notify('Seul le Super Administrateur peut supprimer des admins', 'error');
      return;
    }

    const admin = admins.find(a => a.id === adminId);
    if (admin && await confirmAction({ title: `Supprimer ${admin.name} ?`, message: "Cet administrateur ne pourra plus se connecter. Cette action est définitive." })) {
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
        notify('Administrateur supprimé', 'success');
      } catch (error) {
          console.error("Error deleting admin:", error);
          notify(error.message, 'error');
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
    <AdminLayout
      user={user}
      setUser={props.setUser}
      active="admins"
      title="Administrateurs"
      description="Les membres de l'équipe et ce que chaque rôle peut faire."
      actions={isSuperAdmin && !editingAdmin && (
        <button onClick={() => setShowAddForm(!showAddForm)} className={`adm-btn ${showAddForm ? 'adm-btn-secondary' : 'adm-btn-primary'}`}>
          {showAddForm ? 'Annuler' : 'Ajouter un administrateur'}
        </button>
      )}
    >
        {/* Rôles : effectif et permissions */}
        <section aria-labelledby="roles-title" className="mb-8">
          <h2 id="roles-title" className="text-xl font-extrabold mb-3">Rôles</h2>
          <ul className="adm-card grid sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 overflow-hidden">
            {getRoleStats().map((stat) => (
              <li key={stat.role} className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-bold">{stat.name}</h3>
                  <span className="price text-2xl text-purple-800" aria-label={`${stat.count} membre(s)`}>{stat.count}</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  {stat.permissions.map((perm, idx) => (
                    <li key={idx}>{PERMISSION_LABELS[perm] || perm.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        {/* Add/Edit Admin Form */}
        {isSuperAdmin && (showAddForm || editingAdmin) && (
          <div className="adm-card p-6 mb-8">
            <h3 className="text-xl font-extrabold mb-6">
              {editingAdmin ? "Modifier l'administrateur" : "Nouvel administrateur"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="adm-label">Nom complet *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Marie Kouam"
                  className="adm-input"
                  required
                />
              </div>

              <div>
                <label className="adm-label">Numéro WhatsApp *</label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  placeholder="+237 XXX XXX XXX"
                  className="adm-input"
                  disabled={editingAdmin}
                  required
                />
              </div>

              <div>
                <label className="adm-label">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@nengoo.com"
                  className="adm-input"
                  required
                />
              </div>

              <div>
                <label className="adm-label">Rôle *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="adm-input"
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
                  <label className="adm-label">Code d'accès *</label>
                  <input
                    type="password"
                    name="accessCode"
                    value={formData.accessCode}
                    onChange={handleInputChange}
                    placeholder="Créer un code d'accès"
                    className="adm-input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Code secret pour la connexion</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={editingAdmin ? handleUpdateAdmin : handleAddAdmin}
                className="adm-btn adm-btn-primary"
              >
                {editingAdmin ? 'Mettre à jour' : 'Créer Administrateur'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingAdmin(null);
                  setFormData({ name: '', whatsapp: '', email: '', role: 'support', accessCode: '' });
                }}
                className="adm-btn adm-btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Admins List */}
        {isSuperAdmin && (
          <section aria-labelledby="members-title">
            <h2 id="members-title" className="text-xl font-extrabold mb-3">
              Membres <span className="font-semibold text-gray-500 tabular-nums">{admins.length}</span>
            </h2>
            <SelectionBar count={selectedAdmins.length} onDelete={handleBulkDelete} onClear={() => setSelectedAdmins([])} />
            <div className="adm-card overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="adm-th w-10">
                      <input
                        type="checkbox"
                        aria-label="Tout sélectionner"
                        onChange={handleSelectAll}
                        checked={selectedAdmins.length === admins.length && admins.length > 0}
                      />
                    </th>
                    <th className="adm-th">Membre</th>
                    <th className="adm-th">Contact</th>
                    <th className="adm-th">Rôle</th>
                    <th className="adm-th">Statut</th>
                    <th className="adm-th">Dernière connexion</th>
                    <th className="adm-th"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <LoadingRows colSpan={7} rows={3} />
                  ) : admins.length === 0 ? (
                    <EmptyRow colSpan={7}>Aucun administrateur.</EmptyRow>
                  ) : admins.map((admin) => {
                    const roleInfo = adminRoles[admin.role];
                    const isSelf = admin.id === user.id;
                    return (
                      <tr key={admin.id} className={selectedAdmins.includes(admin.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                        <td className="adm-td">
                          <input
                            type="checkbox"
                            aria-label={`Sélectionner ${admin.name}`}
                            checked={selectedAdmins.includes(admin.id)}
                            onChange={(e) => handleSelectOne(e, admin.id)}
                            disabled={isSelf}
                          />
                        </td>
                        <td className="adm-td">
                          <p className="font-semibold">{admin.name}{isSelf && <span className="font-normal text-gray-500"> (vous)</span>}</p>
                          {admin.createdDate && (
                            <p className="text-xs text-gray-500">
                              Depuis le {new Date(admin.createdDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          )}
                        </td>
                        <td className="adm-td">
                          <p className="whitespace-nowrap">{admin.whatsapp}</p>
                          <p className="text-xs text-gray-500 break-all">{admin.email}</p>
                        </td>
                        <td className="adm-td whitespace-nowrap">{roleInfo?.name || admin.role}</td>
                        <td className="adm-td"><StatusBadge status={admin.status === 'active' ? 'active' : 'suspended'} /></td>
                        <td className="adm-td text-gray-600 whitespace-nowrap">
                          {admin.lastLogin
                            ? new Date(admin.lastLogin).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'Jamais'}
                        </td>
                        <td className="adm-td whitespace-nowrap text-right">
                          <button onClick={() => handleEditAdmin(admin)} className="adm-link !min-h-0">Modifier</button>
                          <button
                            onClick={() => {
                              setPasswordChangeAdmin(admin);
                              setNewPassword('');
                              setConfirmPassword('');
                            }}
                            className="adm-link !min-h-0 ml-4"
                          >
                            Code d'accès
                          </button>
                          {admin.role !== 'super_admin' && (
                            <>
                              <button onClick={() => toggleAdminStatus(admin.id, admin.status)} className="adm-link !min-h-0 ml-4">
                                {admin.status === 'active' ? 'Suspendre' : 'Réactiver'}
                              </button>
                              <button onClick={() => deleteAdmin(admin.id)} className="adm-link-danger !min-h-0 ml-4">
                                Supprimer
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Password Change Modal */}
        {isSuperAdmin && passwordChangeAdmin && (
            <div className="adm-backdrop">
                <div className="adm-modal max-w-md">
                    <h3 className="adm-modal-title mb-6">Nouveau code d'accès pour {passwordChangeAdmin.name}</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="adm-label">Nouveau mot de passe</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="adm-input"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="adm-label">Confirmer le mot de passe</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="adm-input"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-3 mt-8">
                        <button
                            onClick={handlePasswordChange}
                            className="adm-btn adm-btn-primary w-full"
                        >
                            Mettre à jour le mot de passe
                        </button>
                        <button
                            onClick={() => setPasswordChangeAdmin(null)}
                            className="adm-btn adm-btn-secondary w-full"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        )}

        

        {/* Info Box */}
        <section className="mt-8 bg-purple-50 rounded-xl p-5 sm:p-6" aria-labelledby="admins-rules">
          <h2 id="admins-rules" className="font-bold text-purple-950 mb-2">À savoir</h2>
          <ul className="text-sm text-purple-900 space-y-1.5 list-disc pl-5">
            <li>Seul le super administrateur peut suspendre ou supprimer un administrateur.</li>
            <li>Le code d'accès n'est affiché qu'une fois, à la création du compte.</li>
            <li>Un administrateur suspendu ne peut plus se connecter.</li>
            <li>Le super administrateur ne peut être ni suspendu ni supprimé.</li>
          </ul>
        </section>
    </AdminLayout>
  );
};

export default AdminManagement;
