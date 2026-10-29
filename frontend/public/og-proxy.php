<?php
// Relais vers le backend FastAPI pour les aperçus Open Graph et le sitemap.
$backend = 'https://backend.nengoo.com';

$type = $_GET['type'] ?? '';
if ($type === 'product') {
    $slug = $_GET['slug'] ?? '';
    if (!preg_match('/^[A-Za-z0-9_-]+$/', $slug)) {
        http_response_code(400);
        exit;
    }
    $url = $backend . '/api/og/product/' . rawurlencode($slug);
    $contentType = 'text/html; charset=utf-8';
} elseif ($type === 'sitemap') {
    $url = $backend . '/sitemap.xml';
    $contentType = 'application/xml; charset=utf-8';
} else {
    http_response_code(404);
    exit;
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_USERAGENT => $_SERVER['HTTP_USER_AGENT'] ?? 'nengoo-proxy',
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($body === false) {
    http_response_code(502);
    exit;
}
http_response_code($code ?: 200);
header('Content-Type: ' . $contentType);
echo $body;
