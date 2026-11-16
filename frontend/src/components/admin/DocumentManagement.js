import React, { useCallback, useEffect, useState } from 'react';
import { EmptyRow, Field, formatXAF, LoadingRows, Modal, SectionHeader, Toolbar, SearchInput } from './AdminUI';
import { confirmAction, notify } from './adminFeedback';
import { api, formatSize, uploadImage, uploadPdf } from '../../lib/documents';
import { BusyLabel, Spinner, WaitingPanel } from '../ui/Spinner';

// Après l'envoi : le serveur relit le PDF et prépare l'aperçu
const PROCESS_STEPS = ['Vérification du PDF…', 'Comptage des pages…', "Création de l'aperçu gratuit…", 'Enregistrement de la fiche…'];

const CATEGORIES = {
  cours: 'Cours',
  examens: "Sujets d'examens",
  corriges: 'Corrigés',
  exercices: 'Exercices et TD',
  fiches: 'Fiches pratiques',
  guides: 'Guides et tutoriels',
  documentation: 'Documentation',
  recherches: 'Recherches et études',
  memoires: 'Mémoires et rapports',
  autres: 'Autres documents',
};

const STATUS = {
  published: { label: 'En ligne', className: 'bg-green-100 text-green-800' },
  draft: { label: 'Brouillon', className: 'bg-yellow-100 text-yellow-900' },
  archived: { label: 'Retiré', className: 'bg-gray-100 text-gray-700' },
};

const EMPTY = {
  title: '', description: '', category: 'cours', level: '', subject: '', year: '',
  language: 'fr', price: '', coverImage: '', status: 'published',
};

/** Fenêtre d'ajout ou de modification d'un document. */
const DocumentForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState(() => (editing
    ? { ...EMPTY, ...initial, year: initial.year || '', price: String(initial.price ?? ''), coverImage: initial.coverImage || '',
        status: initial.status === 'archived' ? 'draft' : initial.status }
    : EMPTY));
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const pickFile = (e) => {
    const chosen = e.target.files?.[0] || null;
    setError('');
    if (chosen && !/\.pdf$/i.test(chosen.name)) {
      setError('Choisissez un fichier PDF.');
      e.target.value = '';
      return;
    }
    setFile(chosen);
  };

  const pickCover = async (e) => {
    const image = e.target.files?.[0];
    if (!image) return;
    setCoverUploading(true);
    try {
      setForm(f => ({ ...f, coverImage: '' }));
      const url = await uploadImage(image);
      setForm(f => ({ ...f, coverImage: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCoverUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!editing && !file) {
      setError('Ajoutez le fichier PDF.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let fileKey = null;
      if (file) {
        setProgress(0);
        fileKey = await uploadPdf(file, setProgress);
        setProgress(null);
      }
      setProcessing(Boolean(file));
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        level: form.level.trim(),
        subject: form.subject.trim(),
        year: form.year ? Number(form.year) : null,
        language: form.language,
        price: Number(form.price) || 0,
        coverImage: form.coverImage || null,
        status: form.status,
        fileKey,
      };
      // Le serveur vérifie le PDF et prépare l'aperçu : quelques secondes
      const saved = await api(editing ? `/admin/documents/${initial.id}` : '/admin/documents', {
        method: editing ? 'PUT' : 'POST',
        body,
        fallback: "L'enregistrement a échoué.",
      });
      notify(editing ? 'Document modifié.' : `« ${saved.title} » ajouté (${saved.pages} pages, aperçu de ${saved.previewPages}).`);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
      setProgress(null);
      setProcessing(false);
    }
  };

  return (
    <Modal title={editing ? 'Modifier le document' : 'Ajouter un document'} onClose={() => !saving && onClose()}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={editing ? 'Remplacer le fichier PDF' : 'Fichier PDF'} required={!editing}
          hint={editing
            ? `Actuel : ${initial.pages} pages, ${formatSize(initial.fileSize)}. Un nouveau fichier crée une nouvelle version pour les acheteurs.`
            : '50 Mo au maximum, sans mot de passe. Un aperçu des premières pages est créé automatiquement.'}>
          <input type="file" accept="application/pdf,.pdf" onChange={pickFile} className="adm-input" disabled={saving} />
        </Field>
        {progress !== null && (
          <div>
            <div className="h-2 rounded-full bg-purple-100 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Envoi du fichier">
              <div className="h-full bg-purple-700 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 flex items-center gap-2 text-xs text-gray-600"><Spinner tone="dark" className="w-3 h-3" />Envoi du fichier : {progress} %</p>
          </div>
        )}
        {processing && <WaitingPanel steps={PROCESS_STEPS} stepMs={2000} />}

        <Field label="Titre" required>
          <input value={form.title} onChange={set('title')} required minLength={3} maxLength={140} className="adm-input" placeholder="BAC C 2024 — Mathématiques, sujet et corrigé" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Catégorie" required>
            <select value={form.category} onChange={set('category')} className="adm-input">
              {Object.entries(CATEGORIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </Field>
          <Field label="Prix (FCFA)" required hint="0 = gratuit pour tous, sans utiliser les documents offerts.">
            <input type="number" min="0" step="50" value={form.price} onChange={set('price')} required className="adm-input" />
          </Field>
          <Field label="Niveau" hint="Ex. Terminale C, Licence 2">
            <input value={form.level} onChange={set('level')} maxLength={60} className="adm-input" list="doc-levels" />
          </Field>
          <Field label="Matière" hint="Ex. Mathématiques">
            <input value={form.subject} onChange={set('subject')} maxLength={60} className="adm-input" />
          </Field>
          <Field label="Année">
            <input type="number" min="1950" max="2100" value={form.year} onChange={set('year')} className="adm-input" />
          </Field>
          <Field label="Langue">
            <select value={form.language} onChange={set('language')} className="adm-input">
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
            </select>
          </Field>
        </div>
        <datalist id="doc-levels">
          {['6e', '5e', '4e', '3e', 'Seconde', 'Première', 'Terminale', 'Licence 1', 'Licence 2', 'Licence 3', 'Master'].map(v => <option key={v} value={v} />)}
        </datalist>
        <Field label="Description" hint="Contenu, programme, ce que le document permet de réviser.">
          <textarea value={form.description} onChange={set('description')} maxLength={4000} rows={4} className="adm-input" />
        </Field>
        <Field label="Image de couverture (facultatif)" hint="Sinon, une couverture avec la matière et le niveau est affichée.">
          <div className="flex items-center gap-3">
            {coverUploading && (
              <span className="w-12 h-16 rounded bg-purple-50 flex items-center justify-center" role="status" aria-label="Envoi de l'image">
                <Spinner tone="dark" className="w-5 h-5" />
              </span>
            )}
            {!coverUploading && form.coverImage && <img src={form.coverImage} alt="" className="w-12 h-16 rounded object-cover" />}
            <input type="file" accept="image/*" onChange={pickCover} className="adm-input" disabled={saving || coverUploading} />
          </div>
        </Field>
        <Field label="Visibilité">
          <select value={form.status} onChange={set('status')} className="adm-input">
            <option value="published">En ligne</option>
            <option value="draft">Brouillon (invisible)</option>
          </select>
        </Field>

        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="adm-btn adm-btn-secondary">Annuler</button>
          <button type="submit" disabled={saving || coverUploading} aria-busy={saving} className="adm-btn adm-btn-primary"><BusyLabel busy={saving} busyText="Enregistrement…">Enregistrer</BusyLabel></button>
        </div>
      </form>
    </Modal>
  );
};

const DocumentManagement = () => {
  const [docs, setDocs] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    api(`/admin/documents${status ? `?status=${status}` : ''}`)
      .then(setDocs)
      .catch(e => { setDocs([]); notify(e.message, 'error'); });
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const archive = async (doc) => {
    const ok = await confirmAction({
      title: 'Retirer ce document ?',
      message: `« ${doc.title} » ne sera plus en vente. Ceux qui l'ont déjà obtenu pourront toujours le télécharger.`,
      confirmLabel: 'Retirer',
    });
    if (!ok) return;
    try {
      await api(`/admin/documents/${doc.id}/archive`, { method: 'POST' });
      notify('Document retiré de la boutique.');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const openOriginal = async (doc) => {
    try {
      const { url } = await api(`/admin/documents/${doc.id}/file`);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const term = search.trim().toLowerCase();
  const shown = (docs || []).filter(d => !term || [d.title, d.subject, d.level].join(' ').toLowerCase().includes(term));

  return (
    <div>
      <SectionHeader
        title="Documents numériques"
        count={docs ? docs.length : undefined}
        description="Cours, guides, fiches, recherches, documentation… à télécharger. Chaque client a 10 documents offerts, puis paie par Mobile Money."
        actions={<button type="button" onClick={() => setEditing({})} className="adm-btn adm-btn-primary">Ajouter un document</button>}
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un titre, une matière…" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrer par état" className="adm-input w-auto">
          <option value="">Tous (sauf retirés)</option>
          <option value="published">En ligne</option>
          <option value="draft">Brouillons</option>
          <option value="archived">Retirés</option>
        </select>
      </Toolbar>

      <div className="adm-card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="adm-th">Document</th>
              <th className="adm-th">Catégorie</th>
              <th className="adm-th text-right">Prix</th>
              <th className="adm-th text-right">Obtenu</th>
              <th className="adm-th text-right">Recettes</th>
              <th className="adm-th">État</th>
              <th className="adm-th"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!docs && <LoadingRows colSpan={7} />}
            {docs && shown.length === 0 && (
              <EmptyRow colSpan={7}>{docs.length ? 'Aucun document ne correspond.' : 'Aucun document. Ajoutez le premier avec « Ajouter un document ».'}</EmptyRow>
            )}
            {shown.map(doc => (
              <tr key={doc.id}>
                <td className="adm-td">
                  <span className="font-semibold">{doc.title}</span>
                  <span className="block text-xs text-gray-500">
                    {[doc.level, doc.subject, doc.year].filter(Boolean).join(' · ')} · {doc.pages} p. · {formatSize(doc.fileSize)}
                    {doc.fileVersion > 1 && ` · version ${doc.fileVersion}`}
                  </span>
                </td>
                <td className="adm-td text-sm">{doc.categoryLabel}</td>
                <td className="adm-td text-right price whitespace-nowrap">{doc.isFree ? 'Gratuit' : formatXAF(doc.price)}</td>
                <td className="adm-td text-right tabular-nums" title="Clients ayant obtenu le document / ayant téléchargé">
                  {doc.licences}<span className="text-gray-500"> / {doc.downloads}</span>
                </td>
                <td className="adm-td text-right price whitespace-nowrap">{formatXAF(doc.revenue)}</td>
                <td className="adm-td">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS[doc.status]?.className}`}>{STATUS[doc.status]?.label || doc.status}</span>
                </td>
                <td className="adm-td whitespace-nowrap text-right space-x-3">
                  {doc.previewUrl && <a href={doc.previewUrl} target="_blank" rel="noopener noreferrer" className="adm-link text-sm">Aperçu</a>}
                  <button type="button" onClick={() => openOriginal(doc)} className="adm-link !min-h-0 text-sm">Original</button>
                  <button type="button" onClick={() => setEditing(doc)} className="adm-link !min-h-0 text-sm">Modifier</button>
                  {doc.status !== 'archived' && (
                    <button type="button" onClick={() => archive(doc)} className="adm-link !min-h-0 text-sm text-red-700">Retirer</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <DocumentForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

export default DocumentManagement;
