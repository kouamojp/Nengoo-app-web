import React, { useState, useEffect } from 'react';
import { notify } from './adminFeedback';
import { SectionHeader, Field } from './AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const ShippingSettingsManagement = ({ user }) => {
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchShippingPrice = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/settings/shipping`);
                if (!response.ok) {
                    throw new Error('Failed to fetch shipping price');
                }
                const data = await response.json();
                setPrice(data.price);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchShippingPrice();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/settings/shipping`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': user.role,
                },
                body: JSON.stringify({ price: parseFloat(price) }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to update shipping price');
            }
            
            notify('Frais de livraison enregistrés.', 'success');
        } catch (err) {
            setError(err.message);
            notify(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    if (user.role !== 'super_admin') {
        return (
            <p className="adm-card p-5 text-gray-700">
                Seul le super administrateur peut modifier les frais de livraison.
            </p>
        );
    }

    return (
        <div>
            <SectionHeader
                title="Frais de livraison"
                description="Prix appliqué à la livraison à domicile quand le vendeur n'a pas fixé le sien."
            />
            <form
                className="adm-card p-5 sm:p-6 max-w-md space-y-4"
                onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            >
                <Field label="Livraison standard (FCFA)">
                    <input
                        type="number"
                        id="shippingPrice"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="adm-input"
                    />
                </Field>
                {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
                <button type="submit" disabled={loading} className="adm-btn adm-btn-primary">
                    {loading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
            </form>
        </div>
    );
};

export default ShippingSettingsManagement;
