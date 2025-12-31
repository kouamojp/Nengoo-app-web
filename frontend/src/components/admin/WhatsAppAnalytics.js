import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const WhatsAppAnalytics = ({ user }) => {
    const [clicks, setClicks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClicks = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/analytics/whatsapp-clicks`, {
                    headers: {
                        'X-Admin-Role': user.role
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setClicks(data);
                }
            } catch (error) {
                console.error("Error fetching WhatsApp clicks:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user && (user.role === 'admin' || user.role === 'super_admin')) {
            fetchClicks();
        }
    }, [user]);

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Analytics WhatsApp</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendeur</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre de Clics</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernier Clic</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {clicks.map((click) => (
                            <tr key={click._id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{click.productName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{click.sellerName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{click.clickCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(click.lastClick).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {clicks.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">Aucune donnée disponible</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WhatsAppAnalytics;
