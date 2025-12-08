
import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerManagement = (props) => {
    const { user } = props;
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSellers = async () => {
        if (!user || !user.role) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/sellers`, {
                headers: { 'X-Admin-Role': user.role }
            });
            if (!response.ok) throw new Error('Failed to fetch sellers');
            const data = await response.json();
            setSellers(data);
        } catch (error) {
            console.error("Error fetching sellers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSellers();
    }, [user]);

    const handleStatusChange = async (seller, newStatus) => {
        if (!newStatus) return;
        try {
            const response = await fetch(`${API_BASE_URL}/sellers/${seller.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': user.role,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update seller status');
            }
            
            setSellers(sellers.map(s => s.id === seller.id ? { ...s, status: newStatus } : s));
            alert(`✅ Statut du vendeur mis à jour à "${newStatus}".`);

        } catch (error) {
            console.error("Error updating seller status:", error);
            alert(`Erreur: ${error.message}`);
            fetchSellers();
        }
    };

    if (!user || !['super_admin', 'admin'].includes(user.role)) {
        return (
            <div className="p-6 bg-yellow-50 border-l-4 border-yellow-400">
                <p className="font-bold">Permission Denied</p>
                <p>You do not have the required permissions to view this section.</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Gestion des vendeurs ({sellers.length})</h2>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? <p className="p-6">Chargement...</p> : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boutique</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sellers.map((seller) => (
                                <tr key={seller.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{seller.businessName}</td>
                                    <td className="px-6 py-4 text-sm">{seller.whatsapp} <br/> {seller.email}</td>
                                    <td className="px-6 py-4 text-sm">{seller.city}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={seller.status}
                                            onChange={(e) => handleStatusChange(seller, e.target.value)}
                                            className={`p-2 rounded text-sm border-transparent focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                                seller.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                seller.status === 'suspended' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}
                                        >
                                            <option value="approved">Approuvé</option>
                                            <option value="suspended">Suspendu</option>
                                            <option value="pending">En attente</option>
                                        </select>
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

export default SellerManagement;
