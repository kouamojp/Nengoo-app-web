<?php
// Fiches produit, boutiques et catégories (/product/…, /seller/…, /catalog/…) :
// index.html avec le contenu de la page déjà dedans.
//
// Le site est une application React : sans ce relais, le HTML reçu est vide
// tant que le script n'a pas tourné, et les robots (Google, WhatsApp,
// Facebook…) voient peu de chose. Ici le backend (GET /api/seo/page, voir
// backend/seo_pages.py) fournit le titre, la description, l'adresse
// canonique, les données structurées et un contenu simple (titre, prix,
// description, liens), placés dans index.html. Tout le monde reçoit la même
// page ; React la remplace dès que le script est chargé.
//
// Anciennes adresses (id d'une boutique, ancien slug, nom de catégorie avec
// accents) : redirection 301 vers l'adresse actuelle.
//
// Réponses gardées 5 minutes en cache. Backend lent ou en panne : dernière
// version connue, sinon index.html tel quel (la page se charge comme avant).

$backend = getenv('NENGOO_BACKEND') ?: 'https://backend.nengoo.com';
$site = 'https://www.nengoo.com';
$ttl = 300;

$html = @file_get_contents(__DIR__ . '/index.html');
if ($html === false) {
    http_response_code(500);
    exit;
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = rawurldecode(parse_url($uri, PHP_URL_PATH) ?: '/');
$query = parse_url($uri, PHP_URL_QUERY);
$path = '/' . trim($path, '/');

function nengoo_fetch_page($url)
{
    if (!function_exists('curl_init')) {
        return null;
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_TIMEOUT => 4,
        CURLOPT_USERAGENT => 'nengoo-page',
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $code !== 200) {
        return null;
    }
    $data = json_decode($body, true);
    return (is_array($data) && isset($data['status'])) ? $data : null;
}

$cacheFile = rtrim(sys_get_temp_dir(), '/\\') . '/nengoo-page-' . md5($path) . '.json';
$cached = @file_get_contents($cacheFile);
$cachedData = $cached !== false ? json_decode($cached, true) : null;
$fresh = is_array($cachedData) && @filemtime($cacheFile) > time() - $ttl;

if ($fresh) {
    $data = $cachedData;
} else {
    $data = nengoo_fetch_page($backend . '/api/seo/page?path=' . rawurlencode($path));
    if ($data !== null) {
        @file_put_contents($cacheFile, json_encode($data), LOCK_EX);
    } elseif (is_array($cachedData)) {
        $data = $cachedData; // ancienne version plutôt que rien
    }
}

if (!is_array($data)) {
    echo $html;
    exit;
}

$e = function ($value) {
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
};

// Ancienne adresse : vers l'adresse actuelle (paramètres conservés)
if ((int) $data['status'] === 301) {
    $location = (string) ($data['location'] ?? '');
    if (preg_match('#^/(product|seller|catalog)/[a-z0-9_-]+$#i', $location)) {
        header('Location: ' . $site . $location . ($query ? '?' . $query : ''), true, 301);
        exit;
    }
    echo $html;
    exit;
}

// Balises de index.html remplacées par celles de la page
$strip = [
    '#<title>.*?</title>#is',
    '#<meta\s+name="description"[^>]*>#i',
    '#<meta\s+property="(og|twitter):[^"]*"[^>]*>#i',
];

if ((int) $data['status'] === 404) {
    // Adresse inconnue : l'application affiche sa page « introuvable »
    http_response_code(404);
    $inject = '<meta name="robots" content="noindex">';
    $out = preg_replace('#(<meta name="viewport"[^>]*>)#i', '$1' . $inject, $html, 1);
    echo $out ?: $html;
    exit;
}

$title = (string) ($data['title'] ?? 'Nengoo');
$description = (string) ($data['description'] ?? '');
$canonical = (string) ($data['canonical'] ?? '');
$image = (string) ($data['image'] ?? '');

// data-rh : react-helmet-async remplace ces balises par les siennes au chargement
// (pas de doublon une fois la page affichée par React)
$head = '<title>' . $e($title) . '</title>';
$head .= '<meta data-rh="true" name="description" content="' . $e($description) . '">';
if ($canonical !== '') {
    $head .= '<link data-rh="true" rel="canonical" href="' . $e($canonical) . '">';
}
if (!empty($data['robots'])) {
    $head .= '<meta data-rh="true" name="robots" content="' . $e($data['robots']) . '">';
}
$og = [
    'og:type' => $data['ogType'] ?? 'website',
    'og:site_name' => 'Nengoo',
    'og:locale' => 'fr_CM',
    'og:url' => $canonical,
    'og:title' => $title,
    'og:description' => $description,
];
if ($image !== '') {
    $og['og:image'] = $image;
}
foreach ($og as $property => $content) {
    if ($content !== '') {
        $head .= '<meta data-rh="true" property="' . $property . '" content="' . $e($content) . '">';
    }
}
$head .= '<meta data-rh="true" name="twitter:card" content="' . ($image !== '' ? 'summary_large_image' : 'summary') . '">';
$head .= '<meta data-rh="true" name="twitter:title" content="' . $e($title) . '">';
$head .= '<meta data-rh="true" name="twitter:description" content="' . $e($description) . '">';
if ($image !== '') {
    $head .= '<meta data-rh="true" name="twitter:image" content="' . $e($image) . '">';
}
// Données structurées (« < » échappé : pas de </script> possible)
foreach (($data['jsonLd'] ?? []) as $schema) {
    $json = json_encode($schema, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json !== false) {
        $head .= '<script data-rh="true" type="application/ld+json">' . $json . '</script>';
    }
}

$out = preg_replace($strip, '', $html);
// Juste après <meta name="viewport"> (<meta charset> doit rester en tête)
$replacement = str_replace(['\\', '$'], ['\\\\', '\\$'], $head);
$count = 0;
$out = preg_replace('#(<meta name="viewport"[^>]*>)#i', '$1' . $replacement, $out, 1, $count);
if (!$count) {
    echo $html;
    exit;
}

// Contenu de la page dans #root, remplacé par l'application une fois chargée
$body = str_replace(['\\', '$'], ['\\\\', '\\$'], (string) ($data['body'] ?? ''));
$out = preg_replace('#<div id="root">\s*</div>#i', '<div id="root">' . $body . '</div>', $out, 1);

echo $out;
