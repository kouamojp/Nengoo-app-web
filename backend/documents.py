"""
Boutique de documents numériques (cours, guides, fiches, recherches,
documentation, sujets d'examens…) :
règles et traitement des PDF. Les accès à la base et au stockage sont dans
routers/documents.py et document_storage.py.

Principe (docs/DOCUMENTS_NUMERIQUES.md) :
- seule l'équipe Nengoo publie ;
- il faut un compte acheteur pour télécharger ;
- chaque compte a DOCUMENT_FREE_DOWNLOADS documents gratuits, une fois pour
  toutes ; au-delà, le document se paie à son prix par Orange Money ou MTN MoMo,
  sur le numéro de Nengoo, et l'équipe valide le paiement à la main ;
- chaque exemplaire téléchargé porte le nom et le numéro de l'acheteur.
"""
import io
import os
import re
import unicodedata
from datetime import datetime
from typing import Optional

from pypdf import PageObject, PdfReader, PdfWriter
from pypdf.generic import DictionaryObject, FloatObject, NameObject, StreamObject

CATEGORIES = {
    "cours": "Cours",
    "examens": "Sujets d'examens",
    "corriges": "Corrigés",
    "exercices": "Exercices et TD",
    "fiches": "Fiches pratiques",
    "guides": "Guides et tutoriels",
    "documentation": "Documentation",
    "recherches": "Recherches et études",
    "memoires": "Mémoires et rapports",
    "autres": "Autres documents",
}

OPERATORS = {"orange": "Orange Money", "mtn": "MTN Mobile Money"}

# États d'une demande de paiement
PAYMENT_STATUSES = {"pending", "approved", "rejected", "expired", "cancelled"}
# Une référence de transaction reste bloquée tant que la demande est en cours,
# acceptée ou refusée (une fausse référence ne doit pas resservir)
LOCKING_STATUSES = {"pending", "approved", "rejected"}

ORIGINALS_PREFIX = "private-documents/originals/"
LICENSED_PREFIX = "private-documents/licensed/"
PREVIEWS_PREFIX = "uploads/document-previews/"

_REFERENCE_RE = re.compile(r"^[A-Z0-9][A-Z0-9.\-]{3,39}$")


def _int_setting(name: str, default: int, minimum: int = 0) -> int:
    try:
        return max(minimum, int(os.environ.get(name, default)))
    except (TypeError, ValueError):
        return default


def free_downloads() -> int:
    return _int_setting("DOCUMENT_FREE_DOWNLOADS", 10)


def max_file_bytes() -> int:
    return _int_setting("DOCUMENT_MAX_MB", 50, 1) * 1024 * 1024


def max_downloads_per_licence() -> int:
    return _int_setting("DOCUMENT_MAX_DOWNLOADS_PER_BUYER", 20, 1)


def payment_ttl_hours() -> int:
    return _int_setting("DOCUMENT_PAYMENT_TTL_HOURS", 48, 1)


def preview_pages_setting() -> int:
    return _int_setting("DOCUMENT_PREVIEW_PAGES", 3, 1)


class PdfRejected(ValueError):
    """Fichier refusé à la mise en ligne (message pour l'admin)."""


# --- PDF -------------------------------------------------------------------

def inspect_pdf(data: bytes) -> int:
    """Nombre de pages d'un PDF lisible ; PdfRejected sinon."""
    if not data.startswith(b"%PDF-"):
        raise PdfRejected("Le fichier n'est pas un PDF.")
    if len(data) > max_file_bytes():
        raise PdfRejected(f"Le fichier dépasse {max_file_bytes() // (1024 * 1024)} Mo.")
    try:
        reader = _open(data)
        pages = len(reader.pages)
    except PdfRejected:
        raise
    except Exception:
        raise PdfRejected("PDF illisible ou endommagé.")
    if pages == 0:
        raise PdfRejected("Le PDF ne contient aucune page.")
    return pages


def _open(data: bytes) -> PdfReader:
    reader = PdfReader(io.BytesIO(data), strict=False)
    if reader.is_encrypted:
        # Un PDF protégé seulement contre la modification s'ouvre sans mot de passe
        try:
            ok = reader.decrypt("")
        except Exception:
            ok = 0
        if not ok:
            raise PdfRejected("PDF protégé par un mot de passe : envoyez une version sans mot de passe.")
    return reader


def preview_page_count(total_pages: int) -> int:
    """Pages montrées gratuitement : au plus la moitié du document."""
    return max(1, min(preview_pages_setting(), total_pages // 2))


def _pdf_text(text: str) -> bytes:
    """Chaîne PDF littérale en WinAnsi (Helvetica standard)."""
    raw = text.encode("cp1252", "replace")
    return raw.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


def _overlay(width: float, height: float, footer: str, diagonal: str) -> PageObject:
    """Page transparente : ligne en pied de page et texte en diagonale, très clair."""
    page = PageObject.create_blank_page(width=width, height=height)
    font = DictionaryObject({
        NameObject("/Type"): NameObject("/Font"),
        NameObject("/Subtype"): NameObject("/Type1"),
        NameObject("/BaseFont"): NameObject("/Helvetica"),
        NameObject("/Encoding"): NameObject("/WinAnsiEncoding"),
    })
    faint = DictionaryObject({NameObject("/Type"): NameObject("/ExtGState"), NameObject("/ca"): FloatObject(0.12)})
    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/Font"): DictionaryObject({NameObject("/NgWm"): font}),
        NameObject("/ExtGState"): DictionaryObject({NameObject("/NgGs"): faint}),
    })
    size = max(14, min(32, int(min(width, height) / 18)))
    ops = (
        b"q 0.35 g BT /NgWm 7 Tf 1 0 0 1 %d 10 Tm (" % 18 + _pdf_text(footer) + b") Tj ET Q\n"
        b"q /NgGs gs 0.3 g BT /NgWm %d Tf 0.7071 0.7071 -0.7071 0.7071 %d %d Tm ("
        % (size, int(width * 0.18), int(height * 0.22))
        + _pdf_text(diagonal) + b") Tj ET Q\n"
    )
    stream = StreamObject()
    stream.set_data(ops)
    page[NameObject("/Contents")] = stream
    return page


def _stamp(writer: PdfWriter, footer: str, diagonal: str) -> bytes:
    for page in writer.pages:
        # Le filigrane suit l'orientation affichée de la page
        if page.get("/Rotate"):
            page.transfer_rotation_to_content()
        box = page.mediabox
        page.merge_transformed_page(
            _overlay(float(box.width), float(box.height), footer, diagonal),
            (1, 0, 0, 1, float(box.left), float(box.bottom)),
        )
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def make_preview(data: bytes, title: str) -> tuple:
    """(aperçu PDF, nombre de pages de l'aperçu) : les premières pages,
    marquées « Aperçu »."""
    reader = _open(data)
    count = preview_page_count(len(reader.pages))
    writer = PdfWriter()
    for page in reader.pages[:count]:
        writer.add_page(page)
    writer.add_metadata({"/Title": f"Aperçu - {title}", "/Producer": "Nengoo"})
    footer = f"Aperçu gratuit - {title} - document complet sur nengoo.com"
    return _stamp(writer, footer, "APERÇU NENGOO"), count


def licence_footer(buyer_name: str, buyer_phone: str, when: Optional[datetime] = None) -> str:
    when = when or datetime.utcnow()
    name = " ".join((buyer_name or "").split())[:60] or "Client Nengoo"
    phone = re.sub(r"\D", "", buyer_phone or "")
    return (f"Exemplaire personnel de {name} ({phone}) - nengoo.com - "
            f"{when:%d/%m/%Y} - Reproduction et partage interdits")


def watermark_pdf(data: bytes, buyer_name: str, buyer_phone: str, when: Optional[datetime] = None) -> bytes:
    """Exemplaire de l'acheteur : son nom et son numéro sur chaque page."""
    reader = _open(data)
    writer = PdfWriter(clone_from=reader)
    name = " ".join((buyer_name or "").split())[:40] or "Client Nengoo"
    writer.add_metadata({"/Producer": "Nengoo", "/Subject": f"Exemplaire de {name}"})
    return _stamp(writer, licence_footer(buyer_name, buyer_phone, when), f"Nengoo - {name}")


# --- Saisie ----------------------------------------------------------------

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text or "").encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:80].strip("-") or "document"


def download_filename(title: str) -> str:
    return f"{slugify(title)}.pdf"


def normalize_reference(reference: str) -> Optional[str]:
    """Référence de transaction (SMS de l'opérateur) en majuscules, sans
    espaces ; None si elle ne ressemble pas à une référence."""
    ref = re.sub(r"\s+", "", (reference or "")).upper()
    ref = ref.removeprefix("ID:").removeprefix("REF:")
    return ref if _REFERENCE_RE.match(ref) else None


def reference_lock(operator: str, reference: str) -> str:
    return f"{operator}:{reference}"


def quota(used: Optional[int]) -> dict:
    limit = free_downloads()
    used = max(0, int(used or 0))
    return {"limit": limit, "used": min(used, limit), "remaining": max(0, limit - used)}


PUBLIC_FIELDS = (
    "id", "slug", "title", "description", "category", "level", "subject", "year",
    "language", "price", "pages", "fileSize", "previewUrl", "previewPages",
    "coverImage", "downloads", "createdAt", "updatedAt",
)


def public_document(doc: dict) -> dict:
    """Fiche sans les clés de stockage."""
    out = {k: doc.get(k) for k in PUBLIC_FIELDS}
    out["categoryLabel"] = CATEGORIES.get(doc.get("category"), doc.get("category"))
    out["isFree"] = not (doc.get("price") or 0) > 0
    return out
