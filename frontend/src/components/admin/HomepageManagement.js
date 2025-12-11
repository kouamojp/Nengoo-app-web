import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const HomepageManagement = (props) => {
    const { user } = props; // Utiliser l'utilisateur depuis les props
    const [heroImageUrl, setHeroImageUrl] = useState('');
    const [newImage, setNewImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const adminRole = user?.role; // Obtenir le rôle depuis l'objet user

    useEffect(() => {
        const fetchHomepageSettings = async () => {
            try {
                const response = await axios.get(`${API_URL}/settings/homepage`);
                setHeroImageUrl(response.data.heroImageUrl);
            } catch (error) {
                console.error("Erreur lors de la récupération des paramètres de la page d'accueil:", error);
                setMessage("Erreur: Impossible de charger les paramètres actuels.");
            }
        };

        fetchHomepageSettings();
    }, []);

    const handleFileChange = (e) => {
        setNewImage(e.target.files[0]);
    };

    const handleSave = async () => {
        if (!newImage) {
            setMessage("Veuillez sélectionner une image à téléverser.");
            return;
        }
        if (!adminRole) {
            setMessage("Erreur: Rôle administrateur non trouvé. Impossible d'autoriser l'opération.");
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            // 1. Get pre-signed URL from our backend
            const presignedUrlResponse = await axios.post(`${API_URL}/generate-presigned-url`, 
            {
                fileName: newImage.name,
                fileType: newImage.type,
            },
            {
                headers: { 'X-Admin-Role': adminRole }
            });

            const { uploadUrl, publicUrl } = presignedUrlResponse.data;

            // 2. Upload the file directly to S3 using the pre-signed URL
            await axios.put(uploadUrl, newImage, {
                headers: {
                    'Content-Type': newImage.type,
                },
            });

            // 3. Update the homepage settings with the new public URL
            await axios.put(`${API_URL}/settings/homepage`, 
            {
                heroImageUrl: publicUrl,
            },
            {
                headers: { 'X-Admin-Role': adminRole }
            });

            setHeroImageUrl(publicUrl);
            setNewImage(null); // Reset file input
            const fileInput = document.getElementById('heroImageUpload');
            if(fileInput) fileInput.value = ''; // Clear file input visually
            setMessage("L'image de la page d'accueil a été mise à jour avec succès !");

        } catch (error) {
            console.error("Erreur lors de la mise à jour de l'image:", error);
            setMessage("Erreur: Impossible de mettre à jour l'image. Vérifiez les permissions et la configuration du serveur.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Gestion de la Page d'Accueil</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2">Image de la Section "Hero"</h3>
                
                <div className="mb-4">
                    <p className="mb-2">Image actuelle :</p>
                    {heroImageUrl ? (
                        <img src={heroImageUrl} alt="Hero" className="w-full md:w-1/2 rounded-lg" />
                    ) : (
                        <p>Aucune image configurée.</p>
                    )}
                </div>

                <div className="mb-4">
                    <label htmlFor="heroImageUpload" className="block text-sm font-medium text-gray-700">
                        Téléverser une nouvelle image
                    </label>
                    <input 
                        type="file" 
                        id="heroImageUpload"
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading || !newImage}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                >
                    {loading ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
                </button>

                {message && <p className={`mt-4 text-sm ${message.includes('Erreur') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
            </div>
        </div>
    );
};

export default HomepageManagement;
