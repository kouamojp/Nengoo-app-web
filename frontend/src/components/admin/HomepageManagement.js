import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { confirmAction } from './adminFeedback';
import { SectionHeader, Field } from './AdminUI';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const LINK_ERROR = "Erreur : lien invalide. Indiquez une page du site (/catalog) ou une adresse complète (https://…).";

// Même règle que le serveur : chemin interne ou http(s), rien d'autre
const isValidLink = (raw) => {
    const link = (raw || '').trim();
    return !link || (link.startsWith('/') && !link.startsWith('//')) || /^https?:\/\/\S+$/i.test(link);
};

const swap = (list, a, b) => {
    const copy = [...list];
    [copy[a], copy[b]] = [copy[b], copy[a]];
    return copy;
};

const HomepageManagement = (props) => {
    const { user } = props; // Utiliser l'utilisateur depuis les props
    const [heroImages, setHeroImages] = useState([]);
    // Même ordre que heroImages ; "" = image non cliquable
    const [heroLinks, setHeroLinks] = useState([]);
    // Saisie en cours dans chaque carte, enregistrée au clic sur « Enregistrer »
    const [linkDrafts, setLinkDrafts] = useState([]);
    const [newLink, setNewLink] = useState('');
    const [newImage, setNewImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    // Sans la liste actuelle, enregistrer remplacerait tout le carrousel
    const [loadFailed, setLoadFailed] = useState(false);
    const adminRole = user?.role; // Obtenir le rôle depuis l'objet user

    useEffect(() => {
        const fetchHomepageSettings = async () => {
            try {
                const response = await axios.get(`${API_URL}/settings/homepage`);
                const images = response.data.heroImages || [];
                const links = images.map((_, i) => (response.data.heroLinks || [])[i] || '');
                setHeroImages(images);
                setHeroLinks(links);
                setLinkDrafts(links);
            } catch (error) {
                console.error("Erreur lors de la récupération des paramètres de la page d'accueil:", error);
                setLoadFailed(true);
                setMessage("Erreur : impossible de charger le carrousel actuel. Rechargez la page ; les modifications restent bloquées en attendant.");
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
        if (!isValidLink(newLink)) {
            setMessage(LINK_ERROR);
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
            await updateHeroImages([...heroImages, publicUrl], [...heroLinks, newLink.trim()]);

            setNewImage(null); // Reset file input
            setNewLink('');
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

    const updateHeroImages = async (images, links) => {
        try {
            setLoading(true);
            await axios.put(`${API_URL}/settings/homepage`,
            {
                heroImages: images,
                heroLinks: links,
            },
            {
                headers: { 'X-Admin-Role': adminRole }
            });
            setHeroImages(images);
            setHeroLinks(links);
            setLinkDrafts(links);
        } catch (error) {
            console.error("Erreur lors de la mise à jour des images:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteImage = async (index) => {
        if (await confirmAction({ title: 'Retirer cette image ?', message: "Elle ne s'affichera plus dans le carrousel de la page d'accueil.", confirmLabel: 'Retirer' })) {
            try {
                await updateHeroImages(
                    heroImages.filter((_, i) => i !== index),
                    heroLinks.filter((_, i) => i !== index)
                );
                setMessage('Image supprimée avec succès !');
            } catch (error) {
                setMessage('Erreur lors de la suppression de l\'image.');
            }
        }
    };

    const handleMoveUp = async (index) => {
        if (index === 0) return;
        try {
            await updateHeroImages(swap(heroImages, index - 1, index), swap(heroLinks, index - 1, index));
            setMessage('Ordre des images mis à jour !');
        } catch (error) {
            setMessage('Erreur lors de la réorganisation.');
        }
    };

    const handleMoveDown = async (index) => {
        if (index === heroImages.length - 1) return;
        try {
            await updateHeroImages(swap(heroImages, index, index + 1), swap(heroLinks, index, index + 1));
            setMessage('Ordre des images mis à jour !');
        } catch (error) {
            setMessage('Erreur lors de la réorganisation.');
        }
    };

    const handleSaveLink = async (index) => {
        const link = (linkDrafts[index] || '').trim();
        if (!isValidLink(link)) {
            setMessage(LINK_ERROR);
            return;
        }
        try {
            await updateHeroImages(heroImages, heroLinks.map((l, i) => (i === index ? link : l)));
            setMessage(link ? `Lien de l'image ${index + 1} enregistré !` : `L'image ${index + 1} n'est plus cliquable.`);
        } catch (error) {
            setMessage("Erreur lors de l'enregistrement du lien.");
        }
    };

    const isError = message.includes('Erreur');

    return (
        <div>
            <SectionHeader
                title="Page d'accueil"
                description="Les images du carrousel en haut de la page d'accueil, dans leur ordre d'affichage."
            />

            {message && (
                <p
                    role={isError ? 'alert' : 'status'}
                    className={`mb-5 p-3 rounded-lg text-sm ${isError ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}
                >
                    {message}
                </p>
            )}

            <div className="grid xl:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
                <section aria-labelledby="hero-images-title" className="adm-card p-5 sm:p-6">
                    <h3 id="hero-images-title" className="text-lg font-bold mb-4">
                        Images du carrousel <span className="font-normal text-gray-500">{heroImages.length}</span>
                    </h3>
                    {heroImages.length === 0 ? (
                        <p className="py-10 text-center text-gray-600">
                            Aucune image. Sans image, la page d'accueil affiche une photo par défaut.
                        </p>
                    ) : (
                        <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {heroImages.map((imageUrl, index) => (
                                <li key={imageUrl + index} className="rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="relative aspect-[4/3] bg-gray-100">
                                        <img src={imageUrl} alt={`Image ${index + 1} du carrousel`} className="w-full h-full object-cover" loading="lazy" />
                                        {/* L'ordre est une vraie séquence d'affichage, d'où la numérotation */}
                                        <span className="price absolute top-2 left-2 w-8 h-8 rounded-full bg-purple-950 text-white text-sm flex items-center justify-center">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <div className="px-2 pt-2">
                                        <label htmlFor={`hero-link-${index}`} className="block text-xs font-semibold text-gray-700 mb-1">
                                            Lien au clic
                                        </label>
                                        <div className="flex gap-1">
                                            <input
                                                id={`hero-link-${index}`}
                                                type="text"
                                                inputMode="url"
                                                placeholder="Aucun lien"
                                                value={linkDrafts[index] || ''}
                                                onChange={(e) => setLinkDrafts(linkDrafts.map((l, i) => (i === index ? e.target.value : l)))}
                                                disabled={loading}
                                                className="min-w-0 flex-1 h-9 px-2 rounded-lg border border-gray-300 text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleSaveLink(index)}
                                                disabled={loading || (linkDrafts[index] || '').trim() === (heroLinks[index] || '')}
                                                className="adm-btn adm-btn-secondary !px-3"
                                            >
                                                Enregistrer
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 p-2">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveUp(index)}
                                            disabled={index === 0 || loading}
                                            aria-label={`Afficher l'image ${index + 1} plus tôt`}
                                            className="adm-btn adm-btn-secondary !px-3"
                                        >
                                            Avant
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveDown(index)}
                                            disabled={index === heroImages.length - 1 || loading}
                                            aria-label={`Afficher l'image ${index + 1} plus tard`}
                                            className="adm-btn adm-btn-secondary !px-3"
                                        >
                                            Après
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteImage(index)}
                                            disabled={loading}
                                            className="adm-link-danger !min-h-0 ml-auto px-2 text-sm"
                                        >
                                            Retirer
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                <aside className="space-y-6">
                    <section aria-labelledby="hero-upload-title" className="adm-card p-5 sm:p-6">
                        <h3 id="hero-upload-title" className="text-lg font-bold mb-4">Ajouter une image</h3>
                        <Field
                            label="Fichier"
                            hint="JPG, PNG ou WebP, au format paysage. L'image est recadrée en 4:3 sur la page d'accueil (par exemple 1600 × 1200 px)."
                        >
                            <input
                                type="file"
                                id="heroImageUpload"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={uploading || loadFailed}
                                className="block w-full text-sm text-gray-600 file:mr-3 file:h-10 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 disabled:opacity-50"
                            />
                        </Field>
                        <div className="mt-4">
                            <Field
                                label="Lien au clic (facultatif)"
                                hint="Une page du site, par exemple /catalog, ou une adresse complète https://…"
                            >
                                <input
                                    type="text"
                                    inputMode="url"
                                    value={newLink}
                                    onChange={(e) => setNewLink(e.target.value)}
                                    disabled={uploading || loadFailed}
                                    placeholder="/catalog"
                                    className="block w-full h-10 px-3 rounded-lg border border-gray-300 text-sm"
                                />
                            </Field>
                        </div>
                        <button
                            type="button"
                            onClick={handleUploadImage}
                            disabled={uploading || !newImage || loadFailed}
                            className="adm-btn adm-btn-primary w-full mt-4"
                        >
                            {uploading ? 'Envoi en cours…' : 'Ajouter au carrousel'}
                        </button>
                    </section>

                    <section className="bg-purple-50 rounded-xl p-5" aria-labelledby="hero-tips">
                        <h3 id="hero-tips" className="font-bold text-purple-950 mb-2">Conseils</h3>
                        <ul className="text-sm text-purple-900 space-y-1.5 list-disc pl-5">
                            <li>3 à 5 images suffisent : chacune reste affichée 5 secondes.</li>
                            <li>Gardez le texte et les produits au centre de l'image, pour qu'ils restent visibles sur mobile.</li>
                        </ul>
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default HomepageManagement;
