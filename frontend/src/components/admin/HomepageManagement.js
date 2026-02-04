import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import '../pages/HeroSwiper.css';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const HomepageManagement = (props) => {
    const { user } = props; // Utiliser l'utilisateur depuis les props
    const [heroImages, setHeroImages] = useState([]);
    const [newImage, setNewImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const adminRole = user?.role; // Obtenir le rôle depuis l'objet user

    useEffect(() => {
        const fetchHomepageSettings = async () => {
            try {
                const response = await axios.get(`${API_URL}/settings/homepage`);
                setHeroImages(response.data.heroImages || []);
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

    const handleUploadImage = async () => {
        if (!newImage) {
            setMessage("Veuillez sélectionner une image à téléverser.");
            return;
        }
        if (!adminRole) {
            setMessage("Erreur: Rôle administrateur non trouvé. Impossible d'autoriser l'opération.");
            return;
        }

        setUploading(true);
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

            // 3. Add the new image to the list
            const updatedImages = [...heroImages, publicUrl];
            await updateHeroImages(updatedImages);

            setNewImage(null); // Reset file input
            const fileInput = document.getElementById('heroImageUpload');
            if(fileInput) fileInput.value = ''; // Clear file input visually
            setMessage("L'image a été ajoutée avec succès au carrousel !");

        } catch (error) {
            console.error("Erreur lors de l'upload de l'image:", error);
            setMessage("Erreur: Impossible d'uploader l'image. Vérifiez les permissions et la configuration du serveur.");
        } finally {
            setUploading(false);
        }
    };

    const updateHeroImages = async (images) => {
        try {
            setLoading(true);
            await axios.put(`${API_URL}/settings/homepage`,
            {
                heroImages: images,
            },
            {
                headers: { 'X-Admin-Role': adminRole }
            });
            setHeroImages(images);
        } catch (error) {
            console.error("Erreur lors de la mise à jour des images:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteImage = async (index) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
            try {
                const updatedImages = heroImages.filter((_, i) => i !== index);
                await updateHeroImages(updatedImages);
                setMessage('Image supprimée avec succès !');
            } catch (error) {
                setMessage('Erreur lors de la suppression de l\'image.');
            }
        }
    };

    const handleMoveUp = async (index) => {
        if (index === 0) return;
        const updatedImages = [...heroImages];
        [updatedImages[index - 1], updatedImages[index]] = [updatedImages[index], updatedImages[index - 1]];
        try {
            await updateHeroImages(updatedImages);
            setMessage('Ordre des images mis à jour !');
        } catch (error) {
            setMessage('Erreur lors de la réorganisation.');
        }
    };

    const handleMoveDown = async (index) => {
        if (index === heroImages.length - 1) return;
        const updatedImages = [...heroImages];
        [updatedImages[index], updatedImages[index + 1]] = [updatedImages[index + 1], updatedImages[index]];
        try {
            await updateHeroImages(updatedImages);
            setMessage('Ordre des images mis à jour !');
        } catch (error) {
            setMessage('Erreur lors de la réorganisation.');
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            <h2 className="text-3xl font-bold mb-6">Gestion de la Page d'Accueil</h2>

            {/* Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-xl font-semibold mb-4">Ajouter une nouvelle image au carrousel</h3>

                <div className="mb-4">
                    <label htmlFor="heroImageUpload" className="block text-sm font-medium text-gray-700 mb-2">
                        Téléverser une nouvelle image
                    </label>
                    <input
                        type="file"
                        id="heroImageUpload"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        JPG, PNG ou WebP. Dimensions recommandées : 1920x1080px (16:9)
                    </p>
                </div>

                <button
                    onClick={handleUploadImage}
                    disabled={uploading || !newImage}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-400 transition-colors"
                >
                    {uploading ? 'Upload en cours...' : 'Ajouter l\'image au carrousel'}
                </button>

                {message && (
                    <p className={`mt-4 text-sm font-medium ${message.includes('Erreur') ? 'text-red-600' : 'text-green-600'}`}>
                        {message}
                    </p>
                )}
            </div>

            {/* Preview Section with Swiper */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-xl font-semibold mb-4">
                    Aperçu du Carrousel Hero ({heroImages.length} {heroImages.length > 1 ? 'images' : 'image'})
                </h3>

                {heroImages.length > 0 ? (
                    <div className="mb-6">
                        <Swiper
                            modules={[Navigation, Pagination, Autoplay, EffectFade]}
                            spaceBetween={0}
                            slidesPerView={1}
                            navigation
                            pagination={{ clickable: true }}
                            autoplay={{
                                delay: 5000,
                                disableOnInteraction: false,
                            }}
                            effect="fade"
                            fadeEffect={{ crossFade: true }}
                            loop={heroImages.length > 1}
                            className="rounded-lg shadow-xl"
                            style={{ maxHeight: '500px' }}
                        >
                            {heroImages.map((imageUrl, index) => (
                                <SwiperSlide key={index}>
                                    <img
                                        src={imageUrl}
                                        alt={`Hero ${index + 1}`}
                                        className="w-full h-96 object-cover rounded-lg"
                                        onError={(e) => {
                                            e.target.src = 'https://via.placeholder.com/1920x1080?text=Image+non+disponible';
                                        }}
                                    />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                        <p className="text-sm text-gray-600 mt-3 text-center">
                            ℹ️ Prévisualisation du carrousel tel qu'il apparaîtra sur la page d'accueil
                        </p>
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-lg">
                        <div className="text-6xl mb-4">🖼️</div>
                        <p className="text-gray-600 text-lg">Aucune image dans le carrousel</p>
                        <p className="text-gray-500 text-sm mt-2">Ajoutez votre première image ci-dessus</p>
                    </div>
                )}
            </div>

            {/* Images Management Section */}
            {heroImages.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4">Gestion des images</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {heroImages.map((imageUrl, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                                <img
                                    src={imageUrl}
                                    alt={`Hero ${index + 1}`}
                                    className="w-full h-48 object-cover rounded-lg mb-3"
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/400x200?text=Image+non+disponible';
                                    }}
                                />

                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-700">
                                        Image {index + 1}
                                    </span>

                                    <div className="flex gap-2">
                                        {/* Move Up */}
                                        <button
                                            onClick={() => handleMoveUp(index)}
                                            disabled={index === 0 || loading}
                                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            title="Déplacer vers le haut"
                                        >
                                            ⬆️
                                        </button>

                                        {/* Move Down */}
                                        <button
                                            onClick={() => handleMoveDown(index)}
                                            disabled={index === heroImages.length - 1 || loading}
                                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            title="Déplacer vers le bas"
                                        >
                                            ⬇️
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => handleDeleteImage(index)}
                                            disabled={loading}
                                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-colors"
                                            title="Supprimer"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500 truncate" title={imageUrl}>
                                    {imageUrl}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Info Box */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Conseils</h4>
                        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                            <li>Utilisez 3 à 5 images maximum pour des performances optimales</li>
                            <li>Les images défilent automatiquement toutes les 5 secondes</li>
                            <li>Privilégiez des images avec des couleurs harmonieuses</li>
                            <li>Assurez-vous que les éléments importants sont visibles sur mobile</li>
                            <li>Utilisez les flèches ⬆️⬇️ pour réorganiser l'ordre d'affichage</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomepageManagement;
