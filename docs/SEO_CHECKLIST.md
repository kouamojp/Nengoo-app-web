# Checklist SEO - Nengoo Marketplace

## ✅ Implémenté Aujourd'hui

### 1. robots.txt
- [x] Créé dans `frontend/public/robots.txt`
- [x] Configure ce qui peut être crawlé
- [x] Référence le sitemap
- [x] Bloque les pages privées (/admin, /cart, /checkout)

### 2. Sitemap.xml Dynamique
- [x] Endpoint créé: `GET /sitemap.xml`
- [x] Génère automatiquement toutes les URLs:
  - Homepage
  - Pages de catalogue
  - Tous les produits approuvés
  - Tous les vendeurs approuvés
  - Toutes les catégories
  - Pages statiques (about, privacy-policy, etc.)
- [x] Format XML valide selon schema.org
- [x] Priorités et fréquences de mise à jour configurées

### 3. Métadonnées WhatsApp Améliorées
- [x] Open Graph avec `og:image:secure_url`
- [x] Open Graph avec `og:image:type`
- [x] Open Graph avec `og:image:alt`
- [x] Force HTTPS sur toutes les images
- [x] Validation robuste des images

---

## 📋 Actions Immédiates (À Faire Maintenant)

### 1. Tester en Local
```bash
# Démarrer le serveur backend
cd backend
python server.py

# Dans un autre terminal, tester
cd backend
python test_seo.py http://localhost:8001
```

### 2. Vérifier les URLs
- [ ] http://localhost:8001/sitemap.xml
- [ ] http://localhost:3000/robots.txt (après build)

### 3. Déployer en Production
```bash
# Build le frontend
cd frontend
npm run build

# Déployer backend + frontend sur le serveur
# Vérifier:
# https://www.nengoo.com/sitemap.xml
# https://www.nengoo.com/robots.txt
```

### 4. Soumettre à Google
1. Aller sur https://search.google.com/search-console
2. Cliquer sur "Sitemaps" dans le menu de gauche
3. Ajouter: `https://www.nengoo.com/sitemap.xml`
4. Cliquer "Soumettre"

---

## 🔥 Quick Wins (Impact Rapide)

### Semaine 1 - Structured Data

**Fichier:** `frontend/src/components/pages/ProductDetail.js`

**Ajouter après </Helmet> (ligne ~320):**

```jsx
<script type="application/ld+json">
  {JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name[language],
    "image": images.map(img => {
      if (img.startsWith('http')) return img;
      return `${window.location.origin}${img}`;
    }),
    "description": product.description[language],
    "sku": product.id,
    "brand": {
      "@type": "Brand",
      "name": product.sellerName
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "XAF",
      "price": product.promoPrice || product.price,
      "availability": product.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock"
    }
  })}
</script>
```

**Tester:** https://search.google.com/test/rich-results

---

### Semaine 1 - Lazy Loading Images

**Fichier:** `frontend/src/components/product/ProductCard.js`

**Modifier ligne ~49:**

```jsx
<img
  src={product.image}
  alt={product.name[language]}
  loading="lazy"        // ← Ajouter
  width="400"           // ← Ajouter
  height="300"          // ← Ajouter
  className="w-full h-48 object-cover..."
/>
```

**Impact:** Réduit le temps de chargement de 30-40%

---

### Semaine 1 - Canonical URLs

**Ajouter dans chaque page avec Helmet:**

```jsx
// ProductDetail.js
<link rel="canonical" href={`https://www.nengoo.com/product/${product.slug || product.id}`} />

// Homepage.js
<link rel="canonical" href="https://www.nengoo.com/" />

// ProductCatalog.js
<link rel="canonical" href={`https://www.nengoo.com/catalog${category ? '/' + category : ''}`} />

// SellerShop.js
<link rel="canonical" href={`https://www.nengoo.com/seller/${seller.id}`} />
```

**Impact:** Évite le duplicate content

---

## 📊 Métriques à Suivre

### Google Search Console
- [ ] Pages indexées (objectif: 500+)
- [ ] Impressions (objectif: 10,000+/mois)
- [ ] CTR (objectif: > 3%)
- [ ] Position moyenne (objectif: < 20)

### Google Analytics
- [ ] Trafic organique (objectif: 1,000+/mois)
- [ ] Bounce rate (objectif: < 50%)
- [ ] Pages/session (objectif: > 3)
- [ ] Durée session (objectif: > 2 min)

### Core Web Vitals
- [ ] LCP - Largest Contentful Paint (objectif: < 2.5s)
- [ ] FID - First Input Delay (objectif: < 100ms)
- [ ] CLS - Cumulative Layout Shift (objectif: < 0.1)

### PageSpeed Insights
- [ ] Performance score (objectif: > 90)
- [ ] SEO score (objectif: > 95)
- [ ] Accessibility (objectif: > 95)
- [ ] Best Practices (objectif: > 95)

---

## 🎯 Roadmap SEO

### ✅ Fait (Aujourd'hui)
- [x] robots.txt
- [x] sitemap.xml dynamique
- [x] Métadonnées WhatsApp
- [x] Guide SEO complet
- [x] Scripts de test

### 📅 Semaine 1
- [ ] JSON-LD structured data (ProductDetail)
- [ ] Canonical URLs (toutes les pages)
- [ ] Lazy loading images
- [ ] Width/height sur images
- [ ] Meta tags pages manquantes (Catalog, Search, About)

### 📅 Semaine 2
- [ ] Code splitting (React.lazy)
- [ ] Compression gzip/brotli
- [ ] Optimisation bundle size
- [ ] Test PageSpeed Insights
- [ ] Soumettre 10 URLs à Google

### 📅 Semaine 3
- [ ] Pre-rendering (react-snap)
- [ ] Optimisation images WebP
- [ ] CDN pour images
- [ ] Schema.org LocalBusiness (vendeurs)
- [ ] Schema.org Organization (homepage)

### 📅 Mois 2
- [ ] Audit complet Lighthouse
- [ ] Correction erreurs Search Console
- [ ] Amélioration Core Web Vitals
- [ ] Hreflang tags (FR/EN)
- [ ] Monitoring SEO automatisé

### 📅 Mois 3+
- [ ] Migration vers Next.js (SSR)
- [ ] AMP pages (produits)
- [ ] Blog SEO
- [ ] Link building
- [ ] Content marketing

---

## 🧪 Tests à Effectuer

### Après Déploiement
```bash
# 1. Vérifier sitemap
curl https://www.nengoo.com/sitemap.xml

# 2. Vérifier robots.txt
curl https://www.nengoo.com/robots.txt

# 3. Test complet SEO
cd backend
python test_seo.py https://www.nengoo.com
```

### Tests Manuels
- [ ] Partager un produit sur WhatsApp → Image s'affiche
- [ ] Partager sur Facebook → Aperçu correct
- [ ] Recherche Google "site:nengoo.com" → Pages indexées
- [ ] Test mobile → Responsive OK
- [ ] Temps de chargement < 3s

### Outils en Ligne
- [ ] https://search.google.com/test/rich-results
- [ ] https://pagespeed.web.dev/
- [ ] https://developers.facebook.com/tools/debug/
- [ ] https://search.google.com/test/mobile-friendly
- [ ] https://validator.w3.org/

---

## 📚 Documentation

### Fichiers Créés
1. **frontend/public/robots.txt** - Configuration crawlers
2. **backend/server.py** (modifié) - Sitemap dynamique
3. **SEO_GUIDE.md** - Guide complet SEO
4. **SEO_CHECKLIST.md** - Cette checklist
5. **backend/test_seo.py** - Script de test
6. **WHATSAPP_METADATA_FIX.md** - Doc métadonnées

### Ressources Utiles
- Google Search Console: https://search.google.com/search-console
- PageSpeed Insights: https://pagespeed.web.dev/
- Rich Results Test: https://search.google.com/test/rich-results
- Schema.org: https://schema.org/
- Web.dev Learn: https://web.dev/learn/

---

## ⚡ Commandes Rapides

```bash
# Tester SEO en local
cd backend && python test_seo.py http://localhost:8001

# Tester metadata d'un produit
cd backend && python test_whatsapp_metadata.py product_id

# Build frontend
cd frontend && npm run build

# Analyser bundle size
cd frontend && npm run analyze

# Générer sitemap statique (optionnel)
cd backend && python generate_sitemap.py
```

---

## 🎉 Résultat Attendu

### Dans 1 Mois
- 50-100 pages indexées
- 1,000+ impressions Google
- Premiers visiteurs organiques
- Rich snippets visibles

### Dans 3 Mois
- 300-500 pages indexées
- 5,000+ impressions Google
- 200-300 visiteurs organiques/mois
- Position < 30 pour mots-clés cibles

### Dans 6 Mois
- 500+ pages indexées
- 10,000+ impressions Google
- 1,000+ visiteurs organiques/mois
- Position < 20 pour mots-clés cibles
- Top 3 pour "{catégorie} Cameroun"

---

## 🆘 Support

**En cas de problème:**

1. Vérifier les logs backend
2. Tester avec `python test_seo.py`
3. Consulter le SEO_GUIDE.md
4. Tester dans Google Search Console
5. Vérifier WHATSAPP_METADATA_FIX.md pour images

**Contacts:**
- Google Search Central: https://support.google.com/webmasters
- Community: https://www.reddit.com/r/SEO/
- Stack Overflow: https://stackoverflow.com/questions/tagged/seo

---

**Dernière mise à jour:** 2026-01-29
**Status:** ✅ Prêt pour déploiement
**Priorité suivante:** Structured Data (JSON-LD)
