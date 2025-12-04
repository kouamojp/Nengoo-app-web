
import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const PickupPointManagement = (props) => {
    const [pickupPoints, setPickupPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentPickupPoint, setCurrentPickupPoint] = useState(null);
    const [newPickupPointData, setNewPickupPointData] = useState({
        name: '',
        address: '',
        city: '',
        region: '',
        managerName: 'Jean Mbarga',
        managerWhatsApp: '+237655888999',
        phone: '',
        email: '',
        hours: '',
        description: '',
    });

    const fetchPickupPoints = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/pickup-points`, {
                headers: { 'X-Admin-Role': 'super_admin' }
            });
            if (!response.ok) throw new Error('Failed to fetch pickup points');
            const data = await response.json();
            setPickupPoints(data);
        } catch (error) {
            console.error("Error fetching pickup points:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPickupPoints();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewPickupPointData({ ...newPickupPointData, [name]: value });
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentPickupPoint({ ...currentPickupPoint, [name]: value });
    };

    const handleAddPickupPoint = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/pickup-points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Role': 'super_admin' },
                body: JSON.stringify(newPickupPointData),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to create pickup point');
            }
            await fetchPickupPoints();
            setShowAddModal(false);
            alert('✅ Point de retrait ajouté avec succès!');
        } catch (error) {
            console.error('Error adding pickup point:', error);
            alert(`Erreur: ${error.message}`);
        }
    };

    const handleEditClick = (point) => {
        setCurrentPickupPoint(point);
        setShowEditModal(true);
    };

    const handleUpdatePickupPoint = async (e) => {
        e.preventDefault();
        if (!currentPickupPoint) return;

        try {
            const response = await fetch(`${API_BASE_URL}/pickup-points/${currentPickupPoint.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Role': 'super_admin' },
                body: JSON.stringify(currentPickupPoint),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update pickup point');
            }
            await fetchPickupPoints();
            setShowEditModal(false);
            alert('✅ Point de retrait mis à jour avec succès!');
        } catch (error) {
            console.error('Error updating pickup point:', error);
            alert(`Erreur: ${error.message}`);
        }
    };

    const handleDeletePickupPoint = async (pickupPointId) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce point de retrait?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/pickup-points/${pickupPointId}`, {
                    method: 'DELETE',
                    headers: { 'X-Admin-Role': 'super_admin' },
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || 'Failed to delete pickup point');
                }
                await fetchPickupPoints();
                alert('🗑️ Point de retrait supprimé avec succès!');
            } catch (error) {
                console.error('Error deleting pickup point:', error);
                alert(`Erreur: ${error.message}`);
            }
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Gestion des Points de Retrait ({pickupPoints.length})</h2>
                <button onClick={() => setShowAddModal(true)} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded">
                    + Ajouter un Point de Retrait
                </button>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">📍 Ajouter un nouveau Point de Retrait</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                        </div>
                        <form onSubmit={handleAddPickupPoint} className="space-y-4">
                            <input type="text" name="name" value={newPickupPointData.name} onChange={handleInputChange} placeholder="Nom du point de retrait" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="address" value={newPickupPointData.address} onChange={handleInputChange} placeholder="Adresse" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="city" value={newPickupPointData.city} onChange={handleInputChange} placeholder="Ville" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="region" value={newPickupPointData.region} onChange={handleInputChange} placeholder="Région" className="w-full px-4 py-3 border rounded-lg" required />
                            
                            <input type="text" name="managerName" value={newPickupPointData.managerName} onChange={handleInputChange} placeholder="Nom du gestionnaire" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="tel" name="managerWhatsApp" value={newPickupPointData.managerWhatsApp} onChange={handleInputChange} placeholder="WhatsApp du gestionnaire" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="tel" name="phone" value={newPickupPointData.phone} onChange={handleInputChange} placeholder="Téléphone du point de retrait" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="email" name="email" value={newPickupPointData.email} onChange={handleInputChange} placeholder="Email du point de retrait" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="hours" value={newPickupPointData.hours} onChange={handleInputChange} placeholder="Horaires (ex: Lun-Sam: 8h-18h)" className="w-full px-4 py-3 border rounded-lg" required />
                            <textarea name="description" value={newPickupPointData.description} onChange={handleInputChange} placeholder="Description du point de retrait" className="w-full px-4 py-3 border rounded-lg" required />
                            
                            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-semibold">Ajouter le point de retrait</button>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && currentPickupPoint && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                 <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                     <div className="flex justify-between items-center mb-6">
                         <h2 className="text-2xl font-bold text-gray-900">✏️ Modifier le Point de Retrait</h2>
                         <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                     </div>
                     <form onSubmit={handleUpdatePickupPoint} className="space-y-4">
                         <input type="text" name="name" value={currentPickupPoint.name} onChange={handleEditInputChange} placeholder="Nom du point de retrait" className="w-full px-4 py-3 border rounded-lg" required />
                         <input type="text" name="address" value={currentPickupPoint.address} onChange={handleEditInputChange} placeholder="Adresse" className="w-full px-4 py-3 border rounded-lg" required />
                         <input type="text" name="city" value={currentPickupPoint.city} onChange={handleEditInputChange} placeholder="Ville" className="w-full px-4 py-3 border rounded-lg" required />
                         <input type="text" name="region" value={currentPickupPoint.region} onChange={handleEditInputChange} placeholder="Région" className="w-full px-4 py-3 border rounded-lg" required />
                         
                         <input type="text" name="managerName" value={currentPickupPoint.managerName} onChange={handleEditInputChange} placeholder="Nom du gestionnaire" className="w-full px-4 py-3 border rounded-lg" required />
                         <input type="tel" name="managerWhatsApp" value={currentPickupPoint.managerWhatsApp} onChange={handleEditInputChange} placeholder="WhatsApp du gestionnaire" className="w-full px-4 py-3 border rounded-lg" required />
                         <input type="tel" name="phone" value={currentPickupPoint.phone} onChange={handleEditInputChange} placeholder="Téléphone du point de retrait" className="w-full px-4 py-3 border rounded-lg" required />
                         <input type="email" name="email" value={currentPickupPoint.email} onChange={handleEditInputChange} placeholder="Email du point de retrait" className="w-full px-4 py-3 border rounded-lg" required />
                         <input type="text" name="hours" value={currentPickupPoint.hours} onChange={handleEditInputChange} placeholder="Horaires (ex: Lun-Sam: 8h-18h)" className="w-full px-4 py-3 border rounded-lg" required />
                         <textarea name="description" value={currentPickupPoint.description} onChange={handleEditInputChange} placeholder="Description du point de retrait" className="w-full px-4 py-3 border rounded-lg" required />
                         
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adresse</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gestionnaire</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {pickupPoints.map((point) => (
                                <tr key={point.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{point.name}</td>
                                    <td className="px-6 py-4 text-sm">{point.address}, {point.city}</td>
                                    <td className="px-6 py-4 text-sm">{point.managerName}</td>
                                    <td className="px-6 py-4 text-sm">{point.city}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${point.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {point.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleEditClick(point)} className="text-blue-600 hover:text-blue-800 font-semibold text-sm">Modifier</button>
                                        <button onClick={() => handleDeletePickupPoint(point.id)} className="text-red-600 hover:text-red-800 font-semibold text-sm ml-4">Supprimer</button>
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

export default PickupPointManagement;
