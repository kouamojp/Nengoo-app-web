
import React, { useState, useEffect } from 'react';
import { notify, confirmAction, statusLabel } from './adminFeedback';
import { SectionHeader, SelectionBar, StatusSelect, EmptyRow, LoadingRows, Modal, Field } from './AdminUI';

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
    const [selectedPickupPoints, setSelectedPickupPoints] = useState([]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedPickupPoints(pickupPoints.map(p => p.id));
        } else {
            setSelectedPickupPoints([]);
        }
    };

    const handleSelectOne = (e, id) => {
        if (e.target.checked) {
            setSelectedPickupPoints([...selectedPickupPoints, id]);
        } else {
            setSelectedPickupPoints(selectedPickupPoints.filter(pointId => pointId !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (await confirmAction({ title: `Supprimer ${selectedPickupPoints.length} point(s) de retrait ?`, message: 'Les acheteurs ne pourront plus les choisir à la commande.' })) {
            try {
                const response = await fetch(`${API_BASE_URL}/pickup-points`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Role': 'super_admin',
                    },
                    body: JSON.stringify({ ids: selectedPickupPoints }),
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || 'Failed to delete pickup points');
                }
                await fetchPickupPoints();
                setSelectedPickupPoints([]);
                notify('Points de retrait supprimés avec succès.', 'success');
            } catch (error) {
                console.error('Error deleting pickup points:', error);
                notify(error.message, 'error');
            }
        }
    };

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
            notify('Point de retrait ajouté avec succès.', 'success');
        } catch (error) {
            console.error('Error adding pickup point:', error);
            notify(error.message, 'error');
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
            notify('Point de retrait mis à jour avec succès.', 'success');
        } catch (error) {
            console.error('Error updating pickup point:', error);
            notify(error.message, 'error');
        }
    };

    const handleDeletePickupPoint = async (pickupPointId) => {
        if (await confirmAction({ title: 'Supprimer ce point de retrait ?', message: 'Les acheteurs ne pourront plus le choisir à la commande.' })) {
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
                notify('Point de retrait supprimé avec succès.', 'success');
            } catch (error) {
                console.error('Error deleting pickup point:', error);
                notify(error.message, 'error');
            }
        }
    };
    
    // Statut affiché sur le site : seuls les points refusés ou désactivés y sont masqués
    const handleStatusChange = async (point, newStatus) => {
        try {
            const response = await fetch(`${API_BASE_URL}/pickup-points/${point.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Role': 'super_admin' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update pickup point status');
            }
            setPickupPoints(pickupPoints.map(p => p.id === point.id ? { ...p, status: newStatus } : p));
            notify(`Statut de « ${point.name} » : ${statusLabel(newStatus)}.`, 'success');
        } catch (error) {
            console.error('Error updating pickup point status:', error);
            notify(error.message, 'error');
        }
    };

    const pickupFields = (data, onChange) => (
        <>
            <Field label="Nom du point de retrait" required>
                <input type="text" name="name" value={data.name} onChange={onChange} className="adm-input" required />
            </Field>
            <Field label="Adresse" required hint="Assez précise pour être trouvée : quartier, repère proche.">
                <input type="text" name="address" value={data.address} onChange={onChange} className="adm-input" required />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Ville" required>
                    <input type="text" name="city" value={data.city} onChange={onChange} className="adm-input" required />
                </Field>
                <Field label="Région" required>
                    <input type="text" name="region" value={data.region} onChange={onChange} className="adm-input" required />
                </Field>
                <Field label="Nom du gestionnaire" required>
                    <input type="text" name="managerName" value={data.managerName} onChange={onChange} className="adm-input" required />
                </Field>
                <Field label="WhatsApp du gestionnaire" required>
                    <input type="tel" name="managerWhatsApp" value={data.managerWhatsApp} onChange={onChange} className="adm-input" required />
                </Field>
                <Field label="Téléphone" required>
                    <input type="tel" name="phone" value={data.phone} onChange={onChange} className="adm-input" required />
                </Field>
                <Field label="Email" required>
                    <input type="email" name="email" value={data.email} onChange={onChange} className="adm-input" required />
                </Field>
            </div>
            <Field label="Horaires" required>
                <input type="text" name="hours" value={data.hours} onChange={onChange} placeholder="Ex. : Lun-Sam, 8h-18h" className="adm-input" required />
            </Field>
            <Field label="Description" required>
                <textarea name="description" value={data.description} onChange={onChange} className="adm-input" rows="3" required />
            </Field>
        </>
    );

    const COLUMNS = 6;

    return (
        <div>
            <SectionHeader
                title="Points de retrait"
                count={pickupPoints.length}
                description="Les points refusés ou désactivés n'apparaissent ni sur le site ni au moment de commander."
                actions={
                    <button onClick={() => setShowAddModal(true)} className="adm-btn adm-btn-primary">
                        Ajouter un point de retrait
                    </button>
                }
            />

            <SelectionBar count={selectedPickupPoints.length} onDelete={handleBulkDelete} onClear={() => setSelectedPickupPoints([])} />

            {showAddModal && (
                <Modal title="Ajouter un point de retrait" onClose={() => setShowAddModal(false)}>
                    <form onSubmit={handleAddPickupPoint} className="space-y-4">
                        {pickupFields(newPickupPointData, handleInputChange)}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setShowAddModal(false)} className="adm-btn adm-btn-secondary">Annuler</button>
                            <button type="submit" className="adm-btn adm-btn-primary">Ajouter le point de retrait</button>
                        </div>
                    </form>
                </Modal>
            )}

            {showEditModal && currentPickupPoint && (
                <Modal title={`Modifier ${currentPickupPoint.name}`} onClose={() => setShowEditModal(false)}>
                    <form onSubmit={handleUpdatePickupPoint} className="space-y-4">
                        {pickupFields(currentPickupPoint, handleEditInputChange)}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setShowEditModal(false)} className="adm-btn adm-btn-secondary">Annuler</button>
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
                                    checked={selectedPickupPoints.length === pickupPoints.length && pickupPoints.length > 0}
                                />
                            </th>
                            <th className="adm-th">Point de retrait</th>
                            <th className="adm-th">Gestionnaire</th>
                            <th className="adm-th">Horaires</th>
                            <th className="adm-th">Statut</th>
                            <th className="adm-th"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <LoadingRows colSpan={COLUMNS} />
                        ) : pickupPoints.length === 0 ? (
                            <EmptyRow colSpan={COLUMNS}>Aucun point de retrait. Ajoutez-en un pour proposer le retrait aux acheteurs.</EmptyRow>
                        ) : pickupPoints.map((point) => (
                            <tr key={point.id} className={selectedPickupPoints.includes(point.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                                <td className="adm-td">
                                    <input
                                        type="checkbox"
                                        aria-label={`Sélectionner ${point.name}`}
                                        checked={selectedPickupPoints.includes(point.id)}
                                        onChange={(e) => handleSelectOne(e, point.id)}
                                    />
                                </td>
                                <td className="adm-td">
                                    <p className="font-semibold">{point.name}</p>
                                    <p className="text-xs text-gray-500">{[point.address, point.city].filter(Boolean).join(', ')}</p>
                                </td>
                                <td className="adm-td">
                                    <p>{point.managerName}</p>
                                    <p className="text-xs text-gray-500 whitespace-nowrap">{point.managerWhatsApp}</p>
                                </td>
                                <td className="adm-td text-gray-600">{point.hours}</td>
                                <td className="adm-td">
                                    <StatusSelect
                                        value={point.status || 'pending'}
                                        onChange={(value) => handleStatusChange(point, value)}
                                        options={['pending', 'approved', 'rejected']}
                                        label={`Statut de ${point.name}`}
                                    />
                                </td>
                                <td className="adm-td whitespace-nowrap text-right">
                                    <button onClick={() => handleEditClick(point)} className="adm-link !min-h-0">Modifier</button>
                                    <button onClick={() => handleDeletePickupPoint(point.id)} className="adm-link-danger !min-h-0 ml-4">Supprimer</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PickupPointManagement;
