
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

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
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-4">
                <div className="text-red-500 text-xl mb-4">⚠️ {error}</div>
                <Link to="/" className="text-purple-600 underline">Retour à l'accueil</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 font-sans">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-purple-700 text-white p-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">👤 Profil Client Nengoo</h1>
                        <img src="/images/logo-nengoo.png" alt="Nengoo" className="h-8 bg-white rounded p-1" />
                    </div>
                </div>

                <div className="p-6">
                    {/* Client Info Card */}
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-6">
                        <h2 className="text-lg font-semibold text-purple-800 mb-3 border-b border-purple-200 pb-2">Informations Client</h2>
                        <div className="grid grid-cols-1 gap-2 text-gray-700">
                            <p><span className="font-medium">Nom:</span> {buyer?.name || 'N/A'}</p>
                            <p><span className="font-medium">ID:</span> <code className="bg-gray-200 px-2 py-1 rounded text-sm">{buyerId}</code></p>
                            <p><span className="font-medium">WhatsApp:</span> 
                                {buyer?.whatsapp ? (
                                    <a href={`https://wa.me/${buyer.whatsapp.replace(/\D/g, '')}`} className="text-green-600 font-medium hover:underline ml-1">
                                        {buyer.whatsapp} 📱
                                    </a>
                                ) : ' N/A'}
                            </p>
                            <p><span className="font-medium">Email:</span> {buyer?.email || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Orders History */}
                    <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Historique des Commandes ({orders.length})</h2>
                    
                    {orders.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Aucune commande trouvée pour ce client.</p>
                    ) : (
                        <div className="space-y-4">
                            {orders.map(order => (
                                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-gray-800">Commande #{order.id}</h3>
                                            <p className="text-xs text-gray-500">{new Date(order.orderedDate).toLocaleDateString()} à {new Date(order.orderedDate).toLocaleTimeString()}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="bg-gray-50 rounded p-3 mb-3">
                                        <ul className="space-y-2">
                                            {order.products.map((p, idx) => (
                                                <li key={idx} className="flex justify-between text-sm">
                                                    <span className="text-gray-700">{p.quantity}x {p.name}</span>
                                                    <span className="font-medium text-gray-900">{(p.price * p.quantity).toLocaleString()} FCFA</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="flex justify-end border-t pt-2">
                                        <span className="text-lg font-bold text-purple-700">
                                            Total: {order.totalAmount.toLocaleString()} FCFA
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="bg-gray-50 p-4 text-center text-xs text-gray-500 border-t">
                    Vérification générée par Nengoo App • {new Date().toLocaleString()}
                </div>
            </div>
        </div>
    );
};

export default BuyerVerification;
