
import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const PickupPointManagement = (props) => {
    const [pickupPoints, setPickupPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPickupPointData, setNewPickupPointData] = useState({
        name: '',
        address: '',
        city: '',
        region: '',
        coordinates: { latitude: 0, longitude: 0 },
        managerId: 'manager_001',
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
        if (name === 'latitude' || name === 'longitude') {
            setNewPickupPointData(prev => ({
                ...prev,
                coordinates: {
                    ...prev.coordinates,
                    [name]: parseFloat(value) || 0
                }
            }));
        } else {
            setNewPickupPointData({ ...newPickupPointData, [name]: value });
        }
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
                            
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" step="any" name="latitude" value={newPickupPointData.coordinates.latitude} onChange={handleInputChange} placeholder="Latitude" className="w-full px-4 py-3 border rounded-lg" required />
                                <input type="number" step="any" name="longitude" value={newPickupPointData.coordinates.longitude} onChange={handleInputChange} placeholder="Longitude" className="w-full px-4 py-3 border rounded-lg" required />
                            </div>

                            <input type="text" name="managerId" value={newPickupPointData.managerId} onChange={handleInputChange} placeholder="ID du gestionnaire" className="w-full px-4 py-3 border rounded-lg" required />
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
                                        <button className="text-blue-600 hover:text-blue-800 font-semibold text-sm">Modifier</button>
                                        <button className="text-red-600 hover:text-red-800 font-semibold text-sm ml-4">Supprimer</button>
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
