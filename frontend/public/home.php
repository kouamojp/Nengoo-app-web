<?php
// Accueil (/) : index.html avec les réglages du carrousel déjà dedans.
//
// Sans ce relais, le navigateur devait télécharger le script de l'application
// (ou attendre l'appel /settings/homepage lancé par index.html) avant de
// connaître la première image du carrousel, la plus grande de l'écran. Ici,
// elle est préchargée dès la lecture du HTML et Homepage.js lit les réglages
// sans appel réseau (window.__nengooHomeData).
//
// Réglages gardés 2 minutes en cache. Backend lent ou en panne : dernière
// version connue, sinon index.html tel quel (la page fait alors l'appel elle-même).

$backend = getenv('NENGOO_BACKEND') ?: 'https://backend.nengoo.com';
$ttl = 120;
$cacheFile = rtrim(sys_get_temp_dir(), '/\\') . '/nengoo-home-settings.json';

// Largeurs affichées du carrousel : identiques à HeroCarousel.js
$sizes = '(min-width: 1024px) 46vw, (min-width: 640px) 576px, calc(100vw - 2rem)';

$html = @file_get_contents(__DIR__ . '/index.html');
if ($html === false) {
    http_response_code(500);
    exit;
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');

function nengoo_fetch_settings($url)
{
    if (!function_exists('curl_init')) {
        return null;
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 1,
        CURLOPT_TIMEOUT => 2,
        CURLOPT_USERAGENT => 'nengoo-home',
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $code !== 200) {
        return null;
    }
    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

$data = null;
$cached = @file_get_contents($cacheFile);
$cachedData = $cached !== false ? json_decode($cached, true) : null;
$fresh = is_array($cachedData) && @filemtime($cacheFile) > time() - $ttl;

if ($fresh) {
    $data = $cachedData;
} else {
    $data = nengoo_fetch_settings($backend . '/api/settings/homepage');
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

$inject = '';

// Première image : préchargée en priorité haute, même choix de taille que la page
// (versions réduites de backend/image_variants.py : AVIF, sinon WebP, sinon l'originale)
$source = (isset($data['heroSources'][0]) && is_array($data['heroSources'][0])) ? $data['heroSources'][0] : [];
$original = (isset($data['heroImages'][0]) && is_string($data['heroImages'][0])) ? $data['heroImages'][0] : '';
$srcset = '';
$attrs = '';
if (!empty($source['avif']) && is_string($source['avif'])) {
    $srcset = $source['avif'];
    $attrs = ' type="image/avif"';
} elseif (!empty($source['webp']) && is_string($source['webp'])) {
    $srcset = $source['webp'];
}
if ($srcset !== '') {
    $inject .= '<link rel="preload" as="image" fetchpriority="high"' . $attrs
        . ' imagesrcset="' . htmlspecialchars($srcset, ENT_QUOTES) . '"'
        . ' imagesizes="' . htmlspecialchars($sizes, ENT_QUOTES) . '">';
} elseif (preg_match('#^https?://#', $original)) {
    $inject .= '<link rel="preload" as="image" fetchpriority="high" href="'
        . htmlspecialchars($original, ENT_QUOTES) . '">';
}

// Réglages lus par public/index.html puis Homepage.js (« < » échappé : pas de </script> possible)
$json = json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES);
$inject .= '<script>window.__nengooHomeData=' . $json . ';</script>';

// Juste après <meta name="viewport"> : avant, le navigateur choisirait la
// taille de l'image pour un écran de 980 px de large (et <meta charset> doit
// rester dans les premiers octets du document)
$replacement = str_replace(['\\', '$'], ['\\\\', '\\$'], $inject);
$count = 0;
$out = preg_replace('#(<meta name="viewport"[^>]*>)#i', '$1' . $replacement, $html, 1, $count);
if (!$count) {
    $out = preg_replace('#(<meta charset="utf-8"\s*/?>)#i', '$1' . $replacement, $html, 1, $count);
}
echo $count ? $out : $html;
