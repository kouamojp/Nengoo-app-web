import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { notify, confirmAction } from './adminFeedback';
import { SectionHeader } from './AdminUI';
import { formatSize } from '../../lib/documents';
import {
  acceptAttribute, deleteMedia, fileExtension, fileProblem, listMedia, syncMedia, uploadMedia,
} from '../../lib/media';

// Médiathèque de l'admin, sur le modèle de WordPress :
// - MediaLibraryModal : fenêtre de choix (une ou plusieurs images) avec envoi de fichiers ;
// - MediaLibraryPage : section « Médiathèque » de l'admin et de l'espace vendeur ;
// - ImagePicker : champ « Photos » du formulaire produit.
// Principe côté serveur : backend/routers/media.py

const PAGE_SIZE = 40;

const formatDate = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const CheckBadge = () => (
  <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-purple-700 text-white ring-2 ring-white" aria-hidden="true">
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
  </span>
);

const DocumentThumb = ({ name, compact }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gray-50 p-2 text-center">
    <span className={`inline-flex items-center justify-center rounded-md bg-white border border-gray-300 font-bold text-purple-800 ${compact ? 'w-9 h-11 text-[0.625rem]' : 'w-12 h-14 text-xs'}`}>
      {fileExtension(name)}
    </span>
    {!compact && <span className="w-full text-xs text-gray-700 leading-tight line-clamp-2 break-all">{name}</span>}
  </div>
);

const MediaTile = ({ item, selected, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    title={disabled ? 'Un document ne peut pas servir de photo.' : item.name}
    className={`relative block w-full aspect-square overflow-hidden rounded-lg bg-gray-100 !min-h-0 transition-shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400 ${
      selected ? 'ring-4 ring-purple-600' : 'ring-1 ring-gray-200 hover:ring-2 hover:ring-purple-300'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    {item.kind === 'image' ? (
      <img src={item.thumbnail || item.url} alt={item.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
    ) : (
      <DocumentThumb name={item.name} />
    )}
    {selected && <CheckBadge />}
  </button>
);

// Détails du dernier fichier cliqué (colonne de droite, comme WordPress)
// Droit de suppression donné par le serveur pour chaque fichier (item.canDelete)
const MediaDetails = ({ item, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);
  if (!item) {
    return <p className="text-sm text-gray-600">Cliquez sur un fichier pour voir ses détails.</p>;
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      notify('Adresse du fichier copiée.');
    } catch {
      notify("Copie impossible : sélectionnez l'adresse et copiez-la.", 'error');
    }
  };

  const remove = async () => {
    const ok = await confirmAction({
      title: 'Supprimer ce fichier ?',
      message: `« ${item.name} » sera effacé définitivement du stockage. Les pages qui l'affichent encore ne le montreront plus.`,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteMedia(item.id);
      notify('Fichier supprimé.');
      onDeleted(item);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
        {item.kind === 'image'
          ? <img src={item.url} alt={item.name} className="absolute inset-0 w-full h-full object-contain" />
          : <DocumentThumb name={item.name} />}
      </div>
      <div>
        <p className="font-semibold break-all leading-snug">{item.name}</p>
        <p className="text-gray-600 mt-0.5">
          {[formatDate(item.uploadedAt), formatSize(item.size), item.kind === 'image' ? 'Image' : 'Document'].filter(Boolean).join(' · ')}
        </p>
        {item.usedBy > 0 && (
          <p className="text-purple-800 mt-0.5">Photo de {item.usedBy} produit{item.usedBy > 1 ? 's' : ''}</p>
        )}
      </div>
      <label className="block">
        <span className="adm-label">Adresse du fichier</span>
        <input readOnly value={item.url} onFocus={(e) => e.target.select()} className="adm-input text-xs" />
      </label>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button type="button" onClick={copy} className="adm-link !min-h-0">Copier l'adresse</button>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="adm-link">Ouvrir</a>
        {item.canDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={deleting || item.usedBy > 0}
            title={item.usedBy > 0 ? "Retirez d'abord ce fichier des produits qui l'utilisent." : undefined}
            className="adm-link-danger !min-h-0 disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
          >
            {deleting ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Bibliothèque + envoi de fichiers. En mode choix (`selectable`), un clic
 * coche ou décoche le fichier ; `selected` est la liste des fichiers cochés.
 */
// imagesOnly : bibliothèque sans documents (espace vendeur), filtre de type masqué
const MediaBrowser = ({ accept = 'all', imagesOnly = false, multiple = true, selectable = false, selected = [], onSelectedChange }) => {
  const [tab, setTab] = useState('library');
  const [kind, setKind] = useState(accept === 'image' ? 'image' : 'all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [active, setActive] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const inputId = useId();

  // Recherche lancée après une courte pause de frappe
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await listMedia({ kind, q: query, page: nextPage, limit: PAGE_SIZE });
      setItems((list) => (nextPage === 1 ? data.items : [...list, ...data.items.filter((i) => !list.some((x) => x.id === i.id))]));
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [kind, query]);

  useEffect(() => { load(1); }, [load]);

  const isSelected = (item) => selected.some((s) => s.id === item.id);
  const selectable_ = (item) => selectable && (accept !== 'image' || item.kind === 'image');

  const toggle = (item) => {
    setActive(item);
    if (!selectable_(item)) return;
    if (isSelected(item)) onSelectedChange(selected.filter((s) => s.id !== item.id));
    else onSelectedChange(multiple ? [...selected, item] : [item]);
  };

  const startUploads = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setTab('library');
    const added = [];
    files.forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const problem = fileProblem(file, accept);
      const entry = { id, name: file.name, progress: 0, error: problem };
      setUploads((list) => [entry, ...list]);
      if (problem) return;
      added.push(
        uploadMedia(file, (progress) => setUploads((list) => list.map((u) => (u.id === id ? { ...u, progress } : u))))
          .then((item) => {
            setUploads((list) => list.filter((u) => u.id !== id));
            setItems((list) => [item, ...list.filter((x) => x.id !== item.id)]);
            setTotal((n) => n + 1);
            setActive(item);
            return item;
          })
          .catch((error) => {
            setUploads((list) => list.map((u) => (u.id === id ? { ...u, error: error.message } : u)));
            return null;
          }),
      );
    });
    // Les fichiers envoyés depuis la fenêtre de choix sont cochés d'office
    Promise.all(added).then((results) => {
      const fresh = results.filter((item) => item && selectable && (accept !== 'image' || item.kind === 'image'));
      if (!fresh.length) return;
      onSelectedChange((current) => (multiple ? [...current, ...fresh.filter((f) => !current.some((c) => c.id === f.id))] : [fresh[fresh.length - 1]]));
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    startUploads(e.dataTransfer.files);
  };

  const dragProps = {
    onDragEnter: (e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); dragDepth.current += 1; setDragging(true); } },
    onDragOver: (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); },
    onDragLeave: () => { dragDepth.current -= 1; if (dragDepth.current <= 0) setDragging(false); },
    onDrop,
  };

  const onDeleted = (item) => {
    setItems((list) => list.filter((x) => x.id !== item.id));
    setTotal((n) => Math.max(0, n - 1));
    setActive(null);
    if (selectable) onSelectedChange(selected.filter((s) => s.id !== item.id));
  };

  const resync = async () => {
    setSyncing(true);
    try {
      const { added } = await syncMedia();
      notify(added ? `${added} fichier${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} à la médiathèque.` : 'Aucun nouveau fichier trouvé.');
      if (added) load(1);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const tabClass = (id) => `px-1 pb-2 -mb-px border-b-2 text-sm font-semibold !min-h-0 ${
    tab === id ? 'border-purple-700 text-purple-900' : 'border-transparent text-gray-600 hover:text-gray-900'
  }`;

  const hiddenInput = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      multiple
      accept={acceptAttribute(accept)}
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => { startUploads(e.target.files); e.target.value = ''; }}
    />
  );

  return (
    <div className="relative flex flex-col min-h-0 h-full" {...dragProps}>
      {hiddenInput}
      <div className="flex gap-6 border-b border-gray-200 mb-4" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'upload'} className={tabClass('upload')} onClick={() => setTab('upload')}>
          Téléverser des fichiers
        </button>
        <button type="button" role="tab" aria-selected={tab === 'library'} className={tabClass('library')} onClick={() => setTab('library')}>
          Médiathèque{typeof total === 'number' && !loading ? ` (${total})` : ''}
        </button>
      </div>

      {uploads.length > 0 && (
        <ul className="mb-3 space-y-1.5" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${u.error ? 'bg-red-50 text-red-800' : 'bg-purple-50'}`}>
              <span className="truncate flex-1 min-w-0 font-medium">{u.name}</span>
              {u.error ? (
                <>
                  <span className="shrink-0">{u.error}</span>
                  <button type="button" className="shrink-0 adm-link !min-h-0 text-xs" onClick={() => setUploads((l) => l.filter((x) => x.id !== u.id))}>Masquer</button>
                </>
              ) : (
                <span className="shrink-0 w-28 h-2 rounded-full bg-purple-100 overflow-hidden" role="progressbar" aria-valuenow={u.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Envoi de ${u.name}`}>
                  <span className="block h-full bg-purple-700 transition-[width]" style={{ width: `${u.progress}%` }} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === 'upload' ? (
        <label
          htmlFor={inputId}
          className="flex-1 min-h-[16rem] flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 p-8 text-center cursor-pointer"
        >
          <span className="text-lg font-bold text-purple-950">Déposez vos fichiers ici</span>
          <span className="text-sm text-gray-600">ou</span>
          <span className="adm-btn adm-btn-primary">Choisir des fichiers</span>
          <span className="text-xs text-gray-500 max-w-md">
            {accept === 'image'
              ? 'Images JPG, PNG, WEBP ou GIF, 10 Mo maximum chacune.'
              : 'Images JPG, PNG, WEBP ou GIF (10 Mo max.) et documents PDF, Word, Excel, PowerPoint, TXT ou CSV (25 Mo max.).'}
            {' '}Les fichiers sont publics : pas de documents payants ou privés ici.
          </span>
        </label>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {!imagesOnly && (
              <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type de fichier" className="adm-input w-auto">
                <option value="all">Tous les fichiers</option>
                <option value="image">Images</option>
                <option value="document">Documents</option>
              </select>
            )}
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un fichier"
              aria-label="Rechercher un fichier"
              className="adm-input flex-1 min-w-[12rem] max-w-sm"
            />
            <button type="button" onClick={() => inputRef.current?.click()} className="adm-btn adm-btn-secondary">
              Téléverser
            </button>
            {!selectable && (
              <button type="button" onClick={resync} disabled={syncing} className="adm-link !min-h-0 text-sm"
                title="Ajoute les fichiers déjà présents sur le stockage (envoyés avant la médiathèque).">
                {syncing ? 'Recherche…' : 'Retrouver les fichiers existants'}
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_16rem] gap-5">
            <div className="min-h-0 overflow-y-auto pr-1 -mr-1">
              {loadError ? (
                <div className="py-12 text-center text-gray-700">
                  <p>{loadError}</p>
                  <button type="button" onClick={() => load(1)} className="adm-link mt-2">Réessayer</button>
                </div>
              ) : !loading && items.length === 0 ? (
                <div className="py-12 text-center text-gray-600">
                  {query ? 'Aucun fichier ne correspond à cette recherche.' : (
                    <>
                      <p>Aucun fichier pour le moment.</p>
                      <button type="button" onClick={() => setTab('upload')} className="adm-link mt-2">Téléverser des fichiers</button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3 p-1">
                    {items.map((item) => (
                      <li key={item.id}>
                        <MediaTile
                          item={item}
                          selected={selectable ? isSelected(item) : active?.id === item.id}
                          disabled={selectable && !selectable_(item)}
                          onClick={() => toggle(item)}
                        />
                      </li>
                    ))}
                    {loading && [...Array(items.length ? 6 : 12)].map((_, i) => (
                      <li key={`s${i}`} aria-hidden="true"><div className="aspect-square rounded-lg loading-shimmer" /></li>
                    ))}
                  </ul>
                  {!loading && page < pages && (
                    <div className="text-center py-4">
                      <button type="button" onClick={() => load(page + 1)} className="adm-btn adm-btn-secondary">
                        Charger plus ({items.length} sur {total})
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            <aside className="hidden lg:block min-h-0 overflow-y-auto border-l border-gray-200 pl-5" aria-label="Détails du fichier">
              <MediaDetails item={active} onDeleted={onDeleted} />
            </aside>
          </div>
        </>
      )}

      {dragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-4 border-dashed border-purple-600 bg-purple-50/95 pointer-events-none">
          <p className="text-xl font-bold text-purple-950">Déposez pour téléverser</p>
        </div>
      )}
    </div>
  );
};

/** Fenêtre de choix de fichiers, au-dessus du formulaire en cours. */
export const MediaLibraryModal = ({
  title = 'Choisir des images', accept = 'image', imagesOnly = false, multiple = true, confirmLabel = 'Insérer',
  onClose, onConfirm,
}) => {
  const [selected, setSelected] = useState([]);
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
    // Échap ferme cette fenêtre seulement, pas le formulaire en dessous
    const onKey = (e) => {
      if (e.key !== 'Escape' || !dialogRef.current?.contains(document.activeElement)) return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="adm-backdrop z-[65]" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-6xl h-[90vh] rounded-2xl bg-white text-left focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5">
          <h2 id={titleId} className="adm-modal-title">{title}</h2>
          <button type="button" onClick={onClose} className="adm-close -mt-1 -mr-2" aria-label="Fermer">✕</button>
        </div>
        <div className="flex-1 min-h-0 px-5 sm:px-6 pt-3 pb-4">
          <MediaBrowser accept={accept} imagesOnly={imagesOnly} multiple={multiple} selectable selected={selected} onSelectedChange={setSelected} />
        </div>
        <div className="flex flex-wrap items-center gap-3 px-5 sm:px-6 py-4 border-t border-gray-200">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selected.length > 0 ? (
              <>
                <div className="flex -space-x-2 shrink-0" aria-hidden="true">
                  {selected.slice(0, 5).map((item) => (
                    <span key={item.id} className="relative w-9 h-9 rounded-md overflow-hidden ring-2 ring-white bg-gray-100">
                      {item.kind === 'image'
                        ? <img src={item.thumbnail || item.url} alt="" className="w-full h-full object-cover" />
                        : <DocumentThumb name={item.name} compact />}
                    </span>
                  ))}
                </div>
                <span className="text-sm font-semibold">{selected.length} sélectionné{selected.length > 1 ? 's' : ''}</span>
                <button type="button" onClick={() => setSelected([])} className="adm-link !min-h-0 text-sm">Tout désélectionner</button>
              </>
            ) : (
              <span className="text-sm text-gray-600">
                {multiple ? 'Cliquez sur les fichiers à ajouter, ou déposez-en de nouveaux.' : 'Cliquez sur le fichier à utiliser.'}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="adm-btn adm-btn-secondary">Annuler</button>
          <button type="button" onClick={() => onConfirm(selected)} disabled={!selected.length} className="adm-btn adm-btn-primary">
            {confirmLabel}{selected.length > 1 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Section « Médiathèque » du menu admin. */
export const MediaLibraryPage = ({ imagesOnly = false, header }) => (
  <div>
    {header || (
      <SectionHeader
        title="Médiathèque"
        description="Images et documents envoyés depuis l'administration et par les vendeurs. Glissez des fichiers sur la page pour les téléverser."
      />
    )}
    <div className="adm-card p-4 sm:p-5 h-[calc(100vh-13rem)] min-h-[32rem]">
      <MediaBrowser accept={imagesOnly ? 'image' : 'all'} imagesOnly={imagesOnly} />
    </div>
  </div>
);

/**
 * Photos d'un produit : la première est la photo principale. Ajout depuis la
 * médiathèque (avec envoi) ou par adresse.
 */
export const ImagePicker = ({ value = [], onChange, label = 'Photos', imagesOnly = false }) => {
  const images = value.filter(Boolean);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  const add = (urls) => onChange([...images, ...urls.filter((u) => u && !images.includes(u))]);
  const remove = (index) => onChange(images.filter((_, i) => i !== index));
  const makeMain = (index) => onChange([images[index], ...images.filter((_, i) => i !== index)]);
  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addUrl = () => {
    const clean = url.trim();
    if (!/^https?:\/\/\S+$/i.test(clean)) {
      notify("Indiquez une adresse d'image complète (https://…).", 'error');
      return;
    }
    add([clean]);
    setUrl('');
    setShowUrl(false);
  };

  const closeModal = useCallback(() => setOpen(false), []);

  return (
    <fieldset className="space-y-3">
      <legend className="adm-label">{label}</legend>
      {images.length > 0 ? (
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {images.map((src, index) => (
            <li key={src} className="group relative">
              <div className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 ${index === 0 ? 'ring-2 ring-purple-600' : 'ring-1 ring-gray-200'}`}>
                <img src={src} alt={`Photo ${index + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                {index === 0 && (
                  <span className="absolute left-1 bottom-1 px-1.5 py-0.5 rounded bg-purple-700 text-white text-[0.6875rem] font-semibold">Principale</span>
                )}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Retirer la photo ${index + 1}`}
                  className="absolute top-1 right-1 flex items-center justify-center w-7 h-7 !min-h-0 rounded-full bg-white/95 text-gray-800 shadow hover:bg-red-600 hover:text-white"
                >✕</button>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs">
                {index > 0 ? (
                  <button type="button" onClick={() => makeMain(index)} className="adm-link !min-h-0">Principale</button>
                ) : <span />}
                <span className="flex">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Avancer la photo ${index + 1}`} className="px-1.5 !min-h-0 text-gray-600 hover:text-purple-800 disabled:opacity-30">←</button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label={`Reculer la photo ${index + 1}`} className="px-1.5 !min-h-0 text-gray-600 hover:text-purple-800 disabled:opacity-30">→</button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">Aucune photo : le logo de la boutique s'affichera à la place.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className="adm-btn adm-btn-secondary">
          {images.length ? 'Ajouter des photos' : 'Choisir des photos'}
        </button>
        <button type="button" onClick={() => setShowUrl((v) => !v)} className="adm-link !min-h-0 text-sm" aria-expanded={showUrl}>
          Ajouter par adresse (URL)
        </button>
      </div>
      {showUrl && (
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
            placeholder="https://exemple.com/image.jpg"
            aria-label="Adresse de l'image"
            className="adm-input flex-1"
          />
          <button type="button" onClick={addUrl} className="adm-btn adm-btn-primary">Ajouter</button>
        </div>
      )}
      {open && (
        <MediaLibraryModal
          title="Choisir des photos"
          confirmLabel="Ajouter au produit"
          imagesOnly={imagesOnly}
          onClose={closeModal}
          onConfirm={(items) => { add(items.map((i) => i.url)); setOpen(false); }}
        />
      )}
    </fieldset>
  );
};

export default MediaLibraryPage;
