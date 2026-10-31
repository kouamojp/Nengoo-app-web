import React, { useState, useEffect } from 'react';
import SellerHeader from './SellerHeader';
import { Field } from '../admin/AdminUI';
import { cameroonCities } from '../../lib/mockData';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const formatXAF = (value) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value || 0)} XAF`;

const fromUser = (user) => ({
  businessName: user.businessName || '',
  email: user.email || '',
  whatsapp: user.whatsapp || '',
  address: user.address || '',
  city: user.city || '',
  description: user.description || '',
  logoUrl: user.logoUrl || '',
  deliveryPrice: user.deliveryPrice ?? 0,
  facebook: user.socialMedia?.facebook || '',
});

// Ligne de lecture : libellé + valeur, ou « Non renseigné »
const Row = ({ label, children }) => (
  <div className="py-3 grid sm:grid-cols-3 gap-1 sm:gap-4">
    <dt className="text-sm font-semibold text-gray-600">{label}</dt>
    <dd className="sm:col-span-2 text-gray-900 break-words">
      {children || <span className="text-gray-500">Non renseigné</span>}
    </dd>
  </div>
);

const SellerProfile = (props) => {
  const { user, setUser } = props;
  const [form, setForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  useEffect(() => {
    // Le formulaire n'est réinitialisé qu'hors édition (sinon la saisie serait perdue)
    if (user && !isEditing) setForm(fromUser(user));
  }, [user, isEditing]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  // Logo : URL S3 pré-signée, comme les images produit
  const uploadLogo = async (file) => {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const presigned = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Seller-Id': user.id },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      if (!presigned.ok) throw new Error('presigned');
      const { uploadUrl, publicUrl } = await presigned.json();
      const put = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!put.ok) throw new Error('upload');
      setForm(f => ({ ...f, logoUrl: publicUrl }));
    } catch (err) {
      console.error('Logo upload failed:', err);
      setMessage({ type: 'error', text: 'Le logo n\'a pas pu être envoyé. Essayez une image JPG ou PNG plus légère.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/sellers/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Seller-Id': user.id },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          email: form.email.trim(),
          whatsapp: form.whatsapp.trim(),
          address: form.address.trim(),
          city: form.city,
          description: form.description.trim(),
          logoUrl: form.logoUrl || null,
          deliveryPrice: Number(form.deliveryPrice) || 0,
          socialMedia: { ...(user.socialMedia || {}), facebook: form.facebook.trim() || undefined },
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Enregistrement impossible');
      }
      const updated = await response.json();
      // La réponse ne contient pas le jeton de session : on le conserve
      setUser({ ...user, ...updated });
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profil enregistré.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div>
        <SellerHeader title="Boutique et livraison" />
        <p className="adm-card px-5 py-12 text-center text-gray-600">Chargement du profil…</p>
      </div>
    );
  }

  const initial = (form.businessName || 'B').charAt(0).toUpperCase();
  const logo = form.logoUrl
    ? <img src={form.logoUrl} alt="" className="w-20 h-20 rounded-full object-cover bg-gray-100" />
    : <span className="w-20 h-20 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-display text-4xl" aria-hidden="true">{initial}</span>;

  return (
    <div>
      <SellerHeader
        title="Boutique et livraison"
        description="Ces informations apparaissent sur votre page boutique et vos produits."
        actions={!isEditing && (
          <button type="button" onClick={() => { setMessage(null); setIsEditing(true); }} className="adm-btn adm-btn-primary">
            Modifier
          </button>
        )}
      />

      {message && (
        <p role={message.type === 'error' ? 'alert' : 'status'}
           className={`adm-card p-4 mb-4 ${message.type === 'error' ? 'text-red-700' : 'text-green-800'}`}>
          {message.text}
        </p>
      )}

      {!isEditing ? (
        <section className="adm-card p-5 sm:p-6">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
            {logo}
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-purple-950 truncate">{form.businessName}</p>
              <a href={`/seller/${user.id}`} className="adm-link text-sm">Voir ma page boutique</a>
            </div>
          </div>
          <dl className="divide-y divide-gray-100">
            <Row label="WhatsApp">{form.whatsapp}</Row>
            <Row label="E-mail">{form.email}</Row>
            <Row label="Adresse">{[form.address, form.city].filter(Boolean).join(', ')}</Row>
            <Row label="Frais de livraison">{formatXAF(form.deliveryPrice)}</Row>
            <Row label="Présentation">{form.description}</Row>
            <Row label="Facebook">{form.facebook && <a href={form.facebook} target="_blank" rel="noopener noreferrer" className="adm-link">{form.facebook}</a>}</Row>
          </dl>
        </section>
      ) : (
        <form onSubmit={handleSave} className="adm-card p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            {logo}
            <div>
              <label className="adm-btn adm-btn-secondary cursor-pointer">
                {uploading ? 'Envoi…' : form.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
                       disabled={uploading} onChange={(e) => uploadLogo(e.target.files?.[0])} />
              </label>
              {form.logoUrl && (
                <button type="button" onClick={() => setForm(f => ({ ...f, logoUrl: '' }))} className="adm-link-danger text-sm ml-3">
                  Retirer
                </button>
              )}
              <p className="mt-1 text-xs text-gray-500">Image carrée, JPG ou PNG.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nom de la boutique" required>
              <input className="adm-input" required value={form.businessName} onChange={set('businessName')} />
            </Field>
            <Field label="WhatsApp" required hint="Numéro utilisé par les clients et pour vous connecter.">
              <input className="adm-input" type="tel" required value={form.whatsapp} onChange={set('whatsapp')} placeholder="+237 6XX XX XX XX" />
            </Field>
            <Field label="E-mail" required>
              <input className="adm-input" type="email" required value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Ville">
              <select className="adm-input" value={form.city} onChange={set('city')}>
                {!cameroonCities.includes(form.city) && <option value={form.city}>{form.city || 'Choisir'}</option>}
                {cameroonCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Adresse">
              <input className="adm-input" value={form.address} onChange={set('address')} />
            </Field>
            <Field label="Frais de livraison (XAF)" hint="0 si la livraison est offerte.">
              <input className="adm-input" type="number" min="0" step="100" value={form.deliveryPrice} onChange={set('deliveryPrice')} />
            </Field>
          </div>

          <Field label="Présentation de la boutique">
            <textarea className="adm-input" rows={4} value={form.description} onChange={set('description')} />
          </Field>
          <Field label="Page Facebook" hint="Facultatif.">
            <input className="adm-input" type="url" value={form.facebook} onChange={set('facebook')} placeholder="https://facebook.com/…" />
          </Field>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" disabled={saving || uploading} className="adm-btn adm-btn-primary">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => { setIsEditing(false); setMessage(null); }} className="adm-btn adm-btn-secondary">
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SellerProfile;
