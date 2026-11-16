# Documents numériques

Documents numériques téléchargeables : cours, guides, fiches pratiques, documentation,
recherches, sujets d'examens, corrigés, mémoires…

- Seule l'équipe Nengoo publie.
- Il faut un **compte client** Nengoo pour télécharger. Les fiches et les aperçus
  restent visibles par tous.
- Chaque compte a **10 documents offerts, une fois pour toutes**. Un document à 0 FCFA
  est gratuit et ne compte pas. Retélécharger un document déjà obtenu ne compte pas.
- Au-delà, le document se paie à son prix par **Orange Money ou MTN MoMo**, sur le
  numéro de Nengoo. Le client saisit la référence de la transaction, et l'équipe
  valide à la main. Pas d'API de paiement pour le moment.
- Chaque exemplaire téléchargé porte, sur chaque page, le nom et le numéro du client.

Code : `backend/documents.py` (règles, PDF), `backend/document_storage.py` (S3),
`backend/routers/documents.py` (API), tests `backend/tests/test_documents.py`.

## Mise en service

### 1. Bucket S3 privé

Les PDF payants ne doivent **jamais** être dans le bucket des photos, qui est public.
Créer un second bucket :

1. AWS → S3 → **Create bucket**, par exemple `nengoo-documents`, dans la même région.
   Laisser **Block all public access** coché.
2. Onglet **Permissions → CORS** : autoriser l'envoi depuis l'admin.
   ```json
   [{"AllowedOrigins": ["https://www.nengoo.com", "http://localhost:3000"],
     "AllowedMethods": ["POST"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3000}]
   ```
3. L'utilisateur IAM du backend doit pouvoir faire `s3:PutObject`, `s3:GetObject` et
   `s3:DeleteObject` sur `arn:aws:s3:::nengoo-documents/*`.

Les aperçus gratuits vont dans le bucket public existant, dans `uploads/document-previews/`.

### 2. `.env` du backend, puis redémarrer

```ini
DOCUMENTS_S3_BUCKET=nengoo-documents
# DOCUMENTS_S3_REGION=        # seulement si différente de AWS_REGION
```

Sans `DOCUMENTS_S3_BUCKET`, ou s'il est identique à `S3_BUCKET_NAME`, les envois et
les téléchargements répondent 503. Ce n'est pas un bug : on évite ainsi de rendre
publics des fichiers payants.

En production, installer la nouvelle dépendance (`pypdf`, en pur Python) :
`pip install -r requirements.txt`.

### 3. Numéros Mobile Money

Ils se règlent dans l'admin, en bas de **Paiements à vérifier**
(`PUT /api/admin/document-settings`) : numéro et nom du
titulaire pour Orange et pour MTN, plus un texte d'instructions. Un opérateur sans
numéro n'est pas proposé.

## Réglages

| Variable | Défaut | Rôle |
|---|---|---|
| `DOCUMENT_FREE_DOWNLOADS` | `10` | Documents offerts par compte, une fois pour toutes |
| `DOCUMENT_MAX_MB` | `50` | Taille maximale d'un PDF (vérifiée aussi par S3) |
| `DOCUMENT_PREVIEW_PAGES` | `3` | Pages de l'aperçu, au plus la moitié du document |
| `DOCUMENT_MAX_DOWNLOADS_PER_BUYER` | `20` | Téléchargements par client et par document |
| `DOCUMENT_PAYMENT_TTL_HOURS` | `48` | Délai avant expiration d'une demande non traitée |

## Parcours

**Publication (équipe, rôle modérateur et plus)**
1. `POST /admin/documents/upload` `{fileName, fileSize}` renvoie un formulaire S3
   (`url`, `fields`) et une `fileKey`. Le navigateur envoie le PDF directement à S3 en
   `multipart/form-data` (champs `fields`, puis `file`). Le fichier ne passe pas par
   cPanel.
2. `POST /admin/documents` `{title, description, category, level, subject, year,
   language, price, coverImage, status, fileKey}` : le serveur vérifie que le PDF est
   lisible (et sans mot de passe), compte les pages, puis crée et publie l'aperçu.
3. `PUT /admin/documents/{id}` modifie la fiche. Une nouvelle `fileKey` crée une
   nouvelle version, que les clients reçoivent à leur prochain téléchargement.
   `POST …/archive` retire le document de la boutique ; ceux qui l'ont obtenu le
   gardent. `GET …/file` donne un lien vers l'original.

Catégories : `cours`, `examens`, `corriges`, `exercices`, `fiches`, `guides`,
`documentation`, `recherches`, `memoires`, `autres`.

**Client**

| Situation (`viewer.action` dans `GET /documents/{id}`) | Action |
|---|---|
| `unlock_free` : document gratuit | `POST /documents/{id}/unlock` |
| `unlock_quota` : il reste des documents offerts | `POST /documents/{id}/unlock`, après confirmation (« il vous en reste 7 ») |
| `pay` : quota épuisé | Paiement Mobile Money, puis `POST /documents/{id}/payments` `{operator, payerPhone, reference}` |
| `payment_pending` : demande en cours | Attendre la validation, ou `POST /documents/payments/{id}/cancel` |
| `download` : document obtenu | `GET /documents/{id}/download` renvoie un lien de 5 minutes |

`unlock` répond **402** (`detail.code = "payment_required"`) quand le quota est épuisé.
`GET /documents/me/library` renvoie le quota, les documents obtenus et les demandes de
paiement. `GET /documents/payment-info` renvoie les numéros à afficher.

**Validation des paiements (rôle admin et plus)**
- `GET /admin/document-payments?status=pending` affiche la file, des plus anciennes
  aux plus récentes, avec le nombre de demandes par état.
- Comparer le montant, la référence et le numéro payeur avec le SMS reçu sur le
  téléphone de Nengoo, puis appeler `POST …/{id}/approve` ou
  `POST …/{id}/reject` `{reason}`. Le client reçoit une notification et un push.
- Une demande expirée (48 h) libère sa référence, que le client peut renvoyer. Elle
  peut encore être validée si l'argent arrive en retard.

## Site

| Page | Rôle |
|---|---|
| `/documents` | Catalogue : catégories, recherche, niveau, matière, année, tri, quota restant |
| `/documents/:slug` | Fiche : aperçu gratuit, action selon `viewer.action`, fenêtre de paiement Mobile Money |
| `/profile?tab=documents` | « Mes documents » : quota, documents obtenus, téléchargement, suivi des paiements |
| Admin → **Documents numériques** | Ajout (envoi direct du PDF à S3, avec progression), modification, nouvelle version, retrait, lien vers l'original, recettes par document |
| Admin → **Paiements à vérifier** | File des demandes (pastille dans le menu), validation, refus motivé, numéros Mobile Money |

Entrées : lien « Documents » dans l'en-tête (ordinateur), pied de page, bandeau sur
l'accueil (affiché seulement quand au moins un document est en ligne). La connexion et
l'inscription acceptent `?next=/chemin` pour revenir sur la fiche consultée.

Code : `frontend/src/lib/documents.js` (API, textes FR/EN), `components/documents/`,
`components/pages/DocumentStore.js`, `DocumentDetail.js`,
`components/admin/DocumentManagement.js`, `DocumentPayments.js`.

## Application (nengoo-front)

Côté client seulement ; l'équipe publie et valide depuis l'admin du site.

| Écran | Accès |
|---|---|
| `DocumentsScreen` (`/documents`) | Bandeau sur l'accueil (si au moins un document en ligne), Profil → Activités |
| `DocumentDetailScreen` | Depuis le catalogue ou « Mes documents » |
| `MyDocumentsScreen` (`/my_documents`) | Profil → Mon compte (compte client), notification de paiement |

- Téléchargement : le lien signé s'ouvre dans le navigateur du téléphone, qui
  enregistre le PDF (aucune dépendance ajoutée).
- Connexion depuis une fiche : `SignInScreen` ouvert avec
  `arguments: SignInScreen.returnArgument` revient à la fiche au lieu de l'accueil.
- Notifications : `/profile?tab=documents` ouvre « Mes documents ».
- Attentes : cartes squelettes au chargement, étapes animées pendant la préparation
  de l'exemplaire (`WaitingPanel`), cercle dans les boutons ; figés si le téléphone
  réduit les animations. Même principe sur le site (`components/ui/Spinner.js`).

Code : `lib/models/digital_document.dart`, `lib/repositories/document_repository.dart`,
`lib/screens/documents/`. Tests : `test/documents_test.dart`.

## Garde-fous

- Le bucket privé est obligatoire, et seules les clés `private-documents/originals/…`
  créées par le formulaire d'envoi sont acceptées.
- Les liens de téléchargement sont signés et valables 5 minutes. L'exemplaire est
  filigrané une fois par client et par version (dans
  `private-documents/licensed/…`), puis réutilisé.
- Quota réservé en une seule opération en base : deux clics simultanés ne dépassent
  pas la limite.
- Une référence de transaction ne sert qu'une fois, tous clients confondus. Une
  référence refusée ne peut pas resservir.
- Le montant demandé est celui du document au moment de la demande.

## Limites connues

- **Plusieurs comptes = plusieurs fois 10 documents offerts.** L'inscription ne
  vérifie pas le numéro par SMS. Pour le faire, il faudra ajouter un code de
  vérification à l'inscription (`sms.py` sait déjà envoyer des SMS).
- Seuls les comptes clients téléchargent. Un vendeur doit créer un compte client.
- Le filigrane dissuade sans empêcher la copie : un PDF peut toujours être partagé
  ou imprimé. Il permet d'identifier l'origine d'une fuite.
- PDF uniquement. Pas de miniature générée : la couverture (`coverImage`) est une
  image envoyée comme les photos produits.
- Les sujets d'examens officiels appartiennent à leurs auteurs (Office du Bac,
  ministères…). Ne publier que des annales passées ou des documents dont Nengoo a
  les droits. Préciser dans les CGU : « pas de remboursement après téléchargement,
  sauf fichier défectueux ».

## Essais

```bash
cd backend && python -m pytest tests/test_documents.py
cd frontend && npx craco test --watchAll=false src/lib/documents.test.js
```
