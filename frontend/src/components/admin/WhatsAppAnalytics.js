import React, { useState, useEffect } from 'react';
import { SectionHeader, EmptyRow, LoadingRows } from './AdminUI';

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
        } else {
            setLoading(false);
        }
    }, [user]);

    const sortedClicks = [...clicks].sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0));
    const totalClicks = clicks.reduce((sum, c) => sum + (c.clickCount || 0), 0);

    return (
        <div>
            <SectionHeader
                title="Contacts WhatsApp"
                description={loading ? undefined : `${totalClicks} clic${totalClicks > 1 ? 's' : ''} sur « Contacter sur WhatsApp » depuis les fiches produit, les plus demandés d'abord.`}
            />
            <div className="adm-card overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="adm-th">Produit</th>
                            <th className="adm-th">Vendeur</th>
                            <th className="adm-th text-right">Clics</th>
                            <th className="adm-th">Dernier clic</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <LoadingRows colSpan={4} />
                        ) : sortedClicks.length === 0 ? (
                            <EmptyRow colSpan={4}>Aucun clic enregistré pour le moment.</EmptyRow>
                        ) : sortedClicks.map((click) => (
                            <tr key={click._id || `${click.productName}-${click.sellerName}`} className="hover:bg-gray-50">
                                <td className="adm-td font-semibold">{click.productName}</td>
                                <td className="adm-td">{click.sellerName}</td>
                                <td className="adm-td text-right price">{click.clickCount}</td>
                                <td className="adm-td text-gray-600 whitespace-nowrap">
                                    {new Date(click.lastClick).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WhatsAppAnalytics;
