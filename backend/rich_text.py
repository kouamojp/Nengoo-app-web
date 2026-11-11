"""Texte riche des descriptions de boutique : un petit sous-ensemble de HTML.

Le site envoie le HTML produit par son éditeur (gras, italique, souligné,
listes, liens). On ne garde que ces balises, sans attribut sauf l'adresse des
liens (http, https, mailto, tel) ; tout le reste devient du texte. Une
description en texte brut (anciens comptes, app mobile) est laissée telle
quelle : le site l'affiche avec ses retours à la ligne.
"""
import re
from html import escape
from html.parser import HTMLParser

MAX_DESCRIPTION_LENGTH = 5000

ALLOWED_TAGS = {"p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a"}
VOID_TAGS = {"br"}
# Balises de bloc ramenées à un paragraphe
AS_PARAGRAPH = {"div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"}
# Contenu supprimé avec la balise
DROPPED = {"script", "style", "iframe", "object", "embed", "template", "noscript", "svg", "math", "head", "title"}
# Toute balise, autorisée ou non : un texte qui en contient passe au nettoyage
TAG_PATTERN = re.compile(r"<[a-zA-Z/!][^>]*>")
SAFE_HREF = re.compile(r"^(https?://|mailto:|tel:)", re.I)


def looks_like_html(text: str) -> bool:
    return bool(TAG_PATTERN.search(text or ""))


def safe_href(href):
    value = (href or "").strip()
    if value.lower().startswith("www."):
        value = "https://" + value
    # Pas de caractères de contrôle (« java\tscript: » etc.)
    if any(ord(c) < 32 for c in value):
        return None
    return value if SAFE_HREF.match(value) else None


class _Cleaner(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.stack = []  # balises ouvertes conservées
        self.dropping = 0

    def handle_starttag(self, tag, attrs):
        if tag in DROPPED:
            self.dropping += 1
            return
        if self.dropping:
            return
        if tag in AS_PARAGRAPH:
            tag = "p"
        if tag not in ALLOWED_TAGS:
            return
        if tag in VOID_TAGS:
            self.out.append("<br>")
            return
        # Comme en HTML : un bloc (liste, paragraphe) ferme le paragraphe ouvert
        if tag in ("p", "ul", "ol") and "p" in self.stack:
            self.handle_endtag("p")
        if tag == "a":
            href = safe_href(dict(attrs).get("href"))
            if not href:
                self.stack.append(None)  # lien refusé : son texte reste
                return
            self.out.append(f'<a href="{escape(href, quote=True)}" rel="noopener noreferrer nofollow" target="_blank">')
        else:
            self.out.append(f"<{tag}>")
        self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        if tag in VOID_TAGS and not self.dropping:
            self.out.append("<br>")

    def handle_endtag(self, tag):
        if tag in DROPPED:
            self.dropping = max(0, self.dropping - 1)
            return
        if self.dropping:
            return
        if tag in AS_PARAGRAPH:
            tag = "p"
        if tag not in ALLOWED_TAGS or tag in VOID_TAGS:
            return
        # Ferme jusqu'à la balise correspondante (HTML mal imbriqué)
        for index in range(len(self.stack) - 1, -1, -1):
            open_tag = self.stack[index]
            if open_tag == tag or (tag == "a" and open_tag is None):
                for closing in reversed(self.stack[index:]):
                    if closing:
                        self.out.append(f"</{closing}>")
                del self.stack[index:]
                return

    def handle_data(self, data):
        if not self.dropping:
            self.out.append(escape(data, quote=False))

    def result(self):
        for closing in reversed(self.stack):
            if closing:
                self.out.append(f"</{closing}>")
        self.stack = []
        return "".join(self.out)


def sanitize_description(value):
    """HTML nettoyé ; texte brut inchangé ; None reste None."""
    if value is None:
        return None
    text = value.strip()
    if not looks_like_html(text):
        return text[:MAX_DESCRIPTION_LENGTH]
    cleaner = _Cleaner()
    cleaner.feed(text)
    cleaner.close()
    # Paragraphes vides laissés par l'éditeur autour des listes
    html = re.sub(r"<p>\s*</p>", "", cleaner.result())
    # Éditeur vide (« <p><br></p> ») : description vide
    if not re.sub(r"<[^>]+>|&nbsp;|\s", "", html):
        return ""
    if len(html) > MAX_DESCRIPTION_LENGTH:
        raise ValueError(f"Description trop longue ({MAX_DESCRIPTION_LENGTH} caractères au plus).")
    return html
