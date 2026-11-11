"""Nettoyage des descriptions de boutique (rich_text.py)."""
import os
import sys

import pytest
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402
from rich_text import MAX_DESCRIPTION_LENGTH, sanitize_description as clean  # noqa: E402


def test_formatting_kept():
    html = "<p>Bonjour <strong>gras</strong> <em>it</em> <u>s</u></p><ul><li>un</li><li>deux</li></ul><ol><li>a</li></ol>"
    assert clean(html) == html


def test_dangerous_content_removed():
    out = clean('<p>A<script>alert(1)</script><img src=x onerror=alert(1)>B<style>p{}</style>'
                '<iframe src="https://x"></iframe><span style="color:red" onclick="x()">C</span></p>')
    assert out == "<p>ABC</p>"


def test_links():
    out = clean('<p><a href="javascript:alert(1)">mauvais</a> <a href="www.boutique.cm" onclick="x">site</a> '
                '<a href="java\tscript:alert(1)">tab</a> <a href="mailto:a@b.cm">mail</a></p>')
    assert "javascript" not in out and "onclick" not in out and "java\t" not in out
    assert 'mauvais' in out and 'tab' in out
    assert '<a href="https://www.boutique.cm" rel="noopener noreferrer nofollow" target="_blank">site</a>' in out
    assert '<a href="mailto:a@b.cm"' in out


def test_editor_markup_normalized():
    assert clean("<div>ligne 1</div><div>ligne 2<br/></div>") == "<p>ligne 1</p><p>ligne 2<br></p>"
    assert clean("<h1>Titre</h1>") == "<p>Titre</p>"
    assert clean("<b><i>x</b>y") == "<b><i>x</i></b>y"
    assert clean("<ul><li>un<li>deux</ul>").count("<li>") == 2
    # Liste placée par Chrome dans un paragraphe
    assert clean("<p>Intro</p><p><ul><li>a</li></ul></p>") == "<p>Intro</p><ul><li>a</li></ul>"


def test_plain_text_untouched():
    assert clean("Vente & réparation <3\nDepuis 2015") == "Vente & réparation <3\nDepuis 2015"
    assert clean("  ") == ""
    assert clean(None) is None


def test_text_escaped_inside_html():
    assert clean("<p>Prix < 5000 & plus</p>") == "<p>Prix &lt; 5000 &amp; plus</p>"


def test_empty_editor_is_empty():
    assert clean("<p><br></p>") == ""
    assert clean("<p>&nbsp;</p>") == ""


def test_length_limit():
    with pytest.raises(ValueError):
        clean("<p>" + "x" * (MAX_DESCRIPTION_LENGTH + 1) + "</p>")


def test_seller_models_clean_description():
    update = server.SellerUpdate(description='<p onclick="x">Bio <script>x</script></p>')
    assert update.description == "<p>Bio </p>"
    assert server.SellerUpdate().description is None
    with pytest.raises(ValidationError):
        server.SellerUpdate(description="<p>" + "x" * (MAX_DESCRIPTION_LENGTH + 1) + "</p>")
