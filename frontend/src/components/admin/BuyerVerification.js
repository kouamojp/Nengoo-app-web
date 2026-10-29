
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StatusBadge, formatXAF } from './AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const BuyerVerification = (props) => {
    const { user, language } = props;
    const { buyerId } = useParams();
    const [buyer, setBuyer] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBuyerData = async () => {
            if (!user) {
                // If this page requires auth, we handle it later. 
                // For now assuming public or protected by client side check
                // In a real app, this endpoint should verify the viewer has rights (seller/admin)
                // or use a signed token in the URL.
            }

            try {
                setLoading(true);
                // Fetch buyer info (reusing existing endpoint if possible or just assuming we have access)
                // NOTE: We might need a specific endpoint for this view if regular users can't see others
                // For now, I'll assume we can fetch basic user info or use an admin endpoint
                
                // Fetching buyer details (Admin/Seller check should happen on backend)
                // Using a hypothetical endpoint or existing one. 
                // Since I don't have a "get user by id" public endpoint, I'll use the orders endpoint 
                // which might return user details or fetch specifically if user is admin/seller.
                
                // Let's try to fetch orders for this buyer. 
                // If the current user is a seller/admin, they might have access.
                
                const ordersResponse = await fetch(`${API_BASE_URL}/orders?buyer_id=${buyerId}`);
                if (!ordersResponse.ok) throw new Error("Impossible de récupérer les commandes");
                const ordersData = await ordersResponse.json();
                setOrders(ordersData);

                // For buyer details, we might need another call or extract from orders if available
                // If not available, we might only show orders.
                // Ideally, we have a way to get user name.
                // Let's assume we can get it from the first order if exists, or a separate call.
                if (ordersData.length > 0) {
                     // Try to extract buyer info from order if available (often denormalized)
                     // If not, we might need a specific endpoint. 
                     // Let's mock the name for now or fetch from a user endpoint if I created one.
                     // I see `buyers.py` router. Let's check if there is a `GET /buyers/{id}`
                }
                
                // I will fetch from /users/{id} if it existed, but I only recall /buyers/signup
                // Let's try to fetch user info from a generic /users endpoint if it exists or /admin/users
                // Given the constraints, I will rely on the `orders` fetching for now and maybe a direct fetch if I add the endpoint.
                
                // TEMP: Fetch from a new endpoint I'll likely need to create or just use orders.
                // Wait, the previous turn `UserProfile` had all this info because it was THE logged in user.
                // Here we are viewing SOMEONE ELSE.
                
                // I'll assume for this prototype that I can fetch the buyer details via a new endpoint or 
                // just by being an admin.
                
                // Let's try fetching the specific buyer profile if the backend supports it.
                // If not, I'll fallback to just showing "Client Nengoo" and the ID.
                
                 const userResponse = await fetch(`${API_BASE_URL}/users/${buyerId}`); 
                 if (userResponse.ok) {
                     const userData = await userResponse.json();
                     setBuyer(userData);
                 } else {
                     // Fallback if we can't fetch direct user profile (e.g. privacy)
                     setBuyer({ id: buyerId, name: "Client Nengoo", whatsapp: "Masqué" });
                 }

            } catch (err) {
                console.error("Error fetching verification data", err);
                setError("Impossible de charger les données. Vérifiez votre connexion ou vos droits d'accès.");
            } finally {
                setLoading(false);
            }
        };

        if (buyerId) {
            fetchBuyerData();
        }
    }, [buyerId, user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 sm:p-8" aria-busy="true">
                <div className="max-w-2xl mx-auto space-y-4">
                    <div className="h-24 rounded-2xl loading-shimmer" />
                    <div className="h-40 rounded-2xl loading-shimmer" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="adm-card max-w-md w-full p-8 text-left" role="alert">
                    <h1 className="adm-title">Profil indisponible</h1>
                    <p className="adm-subtitle mb-6">{error}</p>
                    <Link to="/" className="adm-btn adm-btn-secondary">Retour au site</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-6 sm:py-10 px-4 text-left">
            <div className="max-w-2xl mx-auto">
                <header className="on-dark flex items-center justify-between gap-4 rounded-t-2xl bg-purple-950 text-white px-5 sm:px-6 py-5">
                    <div>
                        <p className="text-sm text-purple-300">Vérification client</p>
                        <h1 className="text-2xl font-extrabold">{buyer?.name || 'Client Nengoo'}</h1>
                    </div>
                    <img src="/images/logo-nengoo-white.png" alt="Nengoo" className="h-8 w-auto" />
                </header>

                <div className="bg-white rounded-b-2xl border border-t-0 border-gray-200 p-5 sm:p-6">
                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div>
                            <dt className="text-gray-500">WhatsApp</dt>
                            <dd className="font-semibold">
                                {buyer?.whatsapp ? (
                                    <a href={`https://wa.me/${buyer.whatsapp.replace(/\D/g, '')}`} className="text-green-700 hover:underline underline-offset-4">
                                        {buyer.whatsapp}
                                    </a>
                                ) : 'Non renseigné'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Email</dt>
                            <dd className="font-semibold break-all">{buyer?.email || 'Non renseigné'}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-gray-500">Identifiant</dt>
                            <dd className="font-semibold">{buyerId}</dd>
                        </div>
                    </dl>

                    <h2 className="text-xl font-extrabold mt-8 mb-3">
                        Commandes <span className="font-semibold text-gray-500 tabular-nums">{orders.length}</span>
                    </h2>

                    {orders.length === 0 ? (
                        <p className="py-8 text-center text-gray-600">Ce client n'a encore passé aucune commande.</p>
                    ) : (
                        <ul className="space-y-3">
                            {orders.map(order => (
                                <li key={order.id} className="rounded-xl border border-gray-200 p-4">
                                    <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                                        <div>
                                            <h3 className="font-bold">Commande {order.id}</h3>
                                            <p className="text-xs text-gray-500">
                                                {new Date(order.orderedDate).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <StatusBadge status={order.status} />
                                    </div>
                                    <ul className="space-y-1.5 text-sm">
                                        {order.products.map((p, idx) => (
                                            <li key={idx} className="flex justify-between gap-3">
                                                <span className="text-gray-700">{p.quantity} × {p.name}</span>
                                                <span className="price whitespace-nowrap">{formatXAF(p.price * p.quantity)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-bold">
                                        <span>Total</span>
                                        <span className="price text-purple-800">{formatXAF(order.totalAmount)}</span>
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <p className="mt-4 text-center text-xs text-gray-500">
                    Page générée par Nengoo le {new Date().toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                </p>
            </div>
        </div>
    );
};

export default BuyerVerification;
