


import React, { useState, useEffect } from 'react';



const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';



const BuyerManagement = (props) => {

    const [buyers, setBuyers] = useState([]);

    const [loading, setLoading] = useState(true);

    const [showEditModal, setShowEditModal] = useState(false);

    const [currentBuyer, setCurrentBuyer] = useState(null);

    const [newPassword, setNewPassword] = useState('');



    const fetchBuyers = async () => {

        setLoading(true);

        try {

            const response = await fetch(`${API_BASE_URL}/buyers`, {

                headers: { 'X-Admin-Role': 'super_admin' }

            });

            if (!response.ok) throw new Error('Failed to fetch buyers');

            const data = await response.json();

            setBuyers(data);

        } catch (error) {

            console.error("Error fetching buyers:", error);

        } finally {

            setLoading(false);

        }

    };



    useEffect(() => {

        fetchBuyers();

    }, []);



    const handleEditClick = (buyer) => {

        setCurrentBuyer(buyer);

        setNewPassword('');

        setShowEditModal(true);

    };



    const handleEditInputChange = (e) => {

        const { name, value } = e.target;

        setCurrentBuyer({ ...currentBuyer, [name]: value });

    };



    const handleUpdateBuyer = async (e) => {

        e.preventDefault();

        if (!currentBuyer) return;



        const updatedData = { ...currentBuyer };

        if (newPassword) {

            updatedData.password = newPassword;

        }



        try {

            const response = await fetch(`${API_BASE_URL}/buyers/${currentBuyer.id}`, {

                method: 'PUT',

                headers: {

                    'Content-Type': 'application/json',

                    'X-Admin-Role': 'super_admin'

                },

                body: JSON.stringify(updatedData)

            });

            if (!response.ok) {

                const err = await response.json();

                throw new Error(err.detail || 'Failed to update buyer');

            }

            await fetchBuyers();

            setShowEditModal(false);

            alert('✅ Acheteur mis à jour avec succès!');

        } catch (error) {

            console.error("Error updating buyer:", error);

            alert(`Erreur: ${error.message}`);

        }

    };



    const handleDeleteBuyer = async (buyerId) => {

        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet acheteur?')) {

            try {

                const response = await fetch(`${API_BASE_URL}/buyers/${buyerId}`, {

                    method: 'DELETE',

                    headers: { 'X-Admin-Role': 'super_admin' },

                });

                if (!response.ok) {

                    const err = await response.json();

                    throw new Error(err.detail || 'Failed to delete buyer');

                }

                await fetchBuyers();

                alert('🗑️ Acheteur supprimé avec succès!');

            } catch (error) {

                console.error('Error deleting buyer:', error);

                alert(`Erreur: ${error.message}`);

            }

        }

    };



    const toggleBuyerStatus = async (buyerId, currentStatus) => {

        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

        try {

            const response = await fetch(`${API_BASE_URL}/buyers/${buyerId}/status`, {

                method: 'PUT',

                headers: {

                    'Content-Type': 'application/json',

                    'X-Admin-Role': 'super_admin'

                },

                body: JSON.stringify({ status: newStatus })

            });

            if (!response.ok) {

                const err = await response.json();

                throw new Error(err.detail || 'Failed to update buyer status');

            }

            await fetchBuyers();

            alert(`Statut de l'acheteur mis à jour à "${newStatus}".`);

        } catch (error) {

            console.error("Error updating buyer status:", error);

            alert(`Erreur: ${error.message}`);

        }

    };

    

    const formatPrice = (price) => {

        return new Intl.NumberFormat('fr-FR', {

          style: 'currency',

          currency: 'XAF',

          minimumFractionDigits: 0,

        }).format(price);

    };



    return (

        <div>

            <h2 className="text-3xl font-bold mb-6">Gestion des acheteurs ({buyers.length})</h2>

            

            {showEditModal && currentBuyer && (

                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">

                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">

                        <div className="flex justify-between items-center mb-6">

                            <h2 className="text-2xl font-bold text-gray-900">✏️ Modifier l'acheteur</h2>

                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>

                        </div>

                        <form onSubmit={handleUpdateBuyer} className="space-y-4">

                            <input type="text" name="name" value={currentBuyer.name} onChange={handleEditInputChange} placeholder="Nom" className="w-full px-4 py-3 border rounded-lg" required />

                            <input type="tel" name="whatsapp" value={currentBuyer.whatsapp} onChange={handleEditInputChange} placeholder="WhatsApp" className="w-full px-4 py-3 border rounded-lg" required />

                            <input type="email" name="email" value={currentBuyer.email} onChange={handleEditInputChange} placeholder="Email" className="w-full px-4 py-3 border rounded-lg" required />

                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe (laisser vide pour ne pas changer)" className="w-full px-4 py-3 border rounded-lg" />

                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold">Mettre à jour</button>

                        </form>

                    </div>

                </div>

            )}



            <div className="bg-white rounded-lg shadow-md overflow-hidden">

                {loading ? <p className="p-6">Chargement...</p> : (

                    <table className="w-full">

                        <thead className="bg-gray-50 border-b">

                            <tr>

                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>

                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>

                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>

                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commandes</th>

                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total dépensé</th>

                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>

                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>

                            </tr>

                        </thead>

                        <tbody className="divide-y divide-gray-200">

                            {buyers.map((buyer) => (

                                <tr key={buyer.id} className="hover:bg-gray-50">

                                    <td className="px-6 py-4 font-medium">{buyer.name}</td>

                                    <td className="px-6 py-4 text-sm">{buyer.whatsapp}</td>

                                    <td className="px-6 py-4 text-sm">{buyer.email}</td>

                                    <td className="px-6 py-4 text-sm">{buyer.totalOrders}</td>

                                    <td className="px-6 py-4 text-sm font-medium">{formatPrice(buyer.totalSpent)}</td>

                                    <td className="px-6 py-4">

                                        <span className={`px-2 py-1 text-xs rounded-full ${buyer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>

                                            {buyer.status}

                                        </span>

                                    </td>

                                    <td className="px-6 py-4">

                                        <button onClick={() => toggleBuyerStatus(buyer.id, buyer.status)} className="text-purple-600 hover:text-purple-700 font-semibold text-sm">

                                            {buyer.status === 'active' ? '🚫 Suspendre' : '✅ Activer'}

                                        </button>

                                        <button onClick={() => handleEditClick(buyer)} className="text-blue-600 hover:text-blue-800 font-semibold text-sm ml-4">Modifier</button>

                                        <button onClick={() => handleDeleteBuyer(buyer.id)} className="text-red-600 hover:text-red-800 font-semibold text-sm ml-4">Supprimer</button>

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



export default BuyerManagement;


