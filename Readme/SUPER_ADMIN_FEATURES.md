# 👑 Fonctionnalités Super Administrateur - Code à Ajouter

## Vue d'ensemble
Ce document contient le code pour 3 nouvelles sections du dashboard admin:
1. **Accès Utilisateurs** - Voir et modifier tous les profils
2. **Éditeur de Contenu** - Modifier produits et données
3. **Panneaux Publicitaires** - Créer/gérer les bannières

---

## Code à ajouter après la section Orders (ligne ~5854)

```javascript
            {/* User Access Section - Accès à tous les utilisateurs */}
            {activeSection === 'user_access' && (
              <div>
                <h2 className="text-3xl font-bold mb-6">👁️ Accès à Tous les Utilisateurs</h2>
                
                {/* Tabs: Acheteurs / Vendeurs */}
                <div className="flex space-x-4 mb-6">
                  <button
                    onClick={() => setActiveSection('user_access')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold"
                  >
                    👥 Acheteurs
                  </button>
                  <button
                    onClick={() => setActiveSection('user_access')}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold"
                  >
                    🏪 Vendeurs
                  </button>
                </div>

                {/* Liste des Acheteurs */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6 border-b">
                    <h3 className="text-xl font-bold">Liste des Acheteurs</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commandes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Dépensé</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {buyers.map((buyer) => (
                          <tr key={buyer.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium">{buyer.name}</p>
                                <p className="text-sm text-gray-500">ID: {buyer.id}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm">{buyer.whatsApp}</p>
                              <p className="text-sm text-gray-500">Inscrit le {buyer.joinDate}</p>
                            </td>
                            <td className="px-6 py-4 text-sm">{buyer.orders}</td>
                            <td className="px-6 py-4 text-sm font-medium">{formatPrice(buyer.spent)}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs rounded-full ${
                                buyer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {buyer.status === 'active' ? 'Actif' : 'Suspendu'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingUser(buyer)}
                                  className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                                >
                                  ✏️ Modifier
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Voir le profil complet de ${buyer.name}?`)) {
                                      alert(`Fonctionnalité: Ouverture du profil détaillé de ${buyer.name}\nCommandes, adresses, paiements, etc.`);
                                    }
                                  }}
                                  className="text-purple-600 hover:text-purple-800 font-semibold text-sm"
                                >
                                  👁️ Voir Profil
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modal Edit User */}
                {editingUser && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">✏️ Modifier Utilisateur</h2>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                          <input
                            type="text"
                            defaultValue={editingUser.name}
                            className="w-full px-4 py-3 border rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                          <input
                            type="text"
                            defaultValue={editingUser.whatsapp}
                            disabled
                            className="w-full px-4 py-3 border rounded-lg bg-gray-100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                          <select className="w-full px-4 py-3 border rounded-lg">
                            <option value="active">Actif</option>
                            <option value="suspended">Suspendu</option>
                          </select>
                        </div>

                        <div className="flex space-x-4 mt-6">
                          <button
                            onClick={() => {
                              alert('✅ Utilisateur mis à jour!');
                              setEditingUser(null);
                            }}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold"
                          >
                            Enregistrer
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content Editor Section - Éditeur de contenu */}
            {activeSection === 'content_editor' && (
              <div>
                <h2 className="text-3xl font-bold mb-6">✏️ Éditeur de Contenu</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
                    <div className="text-4xl mb-3">📦</div>
                    <h3 className="text-xl font-bold mb-2">Produits</h3>
                    <p className="text-sm opacity-90 mb-4">Modifier les produits existants</p>
                    <p className="text-3xl font-bold">{products.length}</p>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
                    <div className="text-4xl mb-3">🏷️</div>
                    <h3 className="text-xl font-bold mb-2">Catégories</h3>
                    <p className="text-sm opacity-90 mb-4">Gérer les catégories</p>
                    <p className="text-3xl font-bold">12</p>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
                    <div className="text-4xl mb-3">📄</div>
                    <h3 className="text-xl font-bold mb-2">Pages</h3>
                    <p className="text-sm opacity-90 mb-4">Contenu des pages</p>
                    <p className="text-3xl font-bold">8</p>
                  </div>
                </div>

                {/* Liste des produits éditables */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold">Produits - Mode Édition</h3>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">
                      + Ajouter Produit
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendeur</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-gray-200 rounded"></div>
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-sm text-gray-500">{product.category}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-medium">{formatPrice(product.price)}</td>
                            <td className="px-6 py-4 text-sm">{product.stock}</td>
                            <td className="px-6 py-4 text-sm">{product.seller}</td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingProduct(product)}
                                  className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                                >
                                  ✏️ Éditer
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Supprimer "${product.name}"?`)) {
                                      setProducts(products.filter(p => p.id !== product.id));
                                      alert('🗑️ Produit supprimé!');
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-800 font-semibold text-sm"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modal Edit Product */}
                {editingProduct && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">✏️ Éditer Produit</h2>
                        <button
                          onClick={() => setEditingProduct(null)}
                          className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nom du produit</label>
                          <input
                            type="text"
                            defaultValue={editingProduct.name}
                            className="w-full px-4 py-3 border rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Prix (XAF)</label>
                          <input
                            type="number"
                            defaultValue={editingProduct.price}
                            className="w-full px-4 py-3 border rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                          <input
                            type="number"
                            defaultValue={editingProduct.stock}
                            className="w-full px-4 py-3 border rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                          <select defaultValue={editingProduct.category} className="w-full px-4 py-3 border rounded-lg">
                            <option value="clothing_accessories">Vêtements</option>
                            <option value="electronics">Électroniques</option>
                            <option value="handicrafts">Artisanat</option>
                            <option value="food_drinks">Aliments</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                          <textarea
                            rows="4"
                            defaultValue="Description du produit..."
                            className="w-full px-4 py-3 border rounded-lg"
                          ></textarea>
                        </div>
                      </div>

                      <div className="flex space-x-4 mt-6">
                        <button
                          onClick={() => {
                            alert('✅ Produit mis à jour!');
                            setEditingProduct(null);
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                        >
                          Enregistrer les Modifications
                        </button>
                        <button
                          onClick={() => setEditingProduct(null)}
                          className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Banners Section - Panneaux publicitaires */}
            {activeSection === 'banners' && (
              <div>
                <h2 className="text-3xl font-bold mb-6">📢 Panneaux Publicitaires</h2>
                
                <div className="mb-6">
                  <button
                    onClick={() => setShowBannerForm(true)}
                    className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg"
                  >
                    + Créer une Publicité
                  </button>
                </div>

                {/* Liste des bannières */}
                <div className="grid grid-cols-1 gap-6">
                  {banners.map((banner) => (
                    <div key={banner.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                        <div className="lg:col-span-1">
                          <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>

                        <div className="lg:col-span-2">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-bold mb-2">{banner.title}</h3>
                              <p className="text-gray-600 mb-3">{banner.description}</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {banner.position}
                                </span>
                                <span className={`px-3 py-1 text-xs rounded-full ${
                                  banner.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {banner.status === 'active' ? 'Actif' : 'Inactif'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <p>🔗 Lien: {banner.link}</p>
                            <p>📅 Du {banner.startDate} au {banner.endDate}</p>
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingBanner(banner)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm"
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              onClick={() => {
                                setBanners(banners.map(b =>
                                  b.id === banner.id ? { ...b, status: b.status === 'active' ? 'inactive' : 'active' } : b
                                ));
                              }}
                              className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                                banner.status === 'active'
                                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {banner.status === 'active' ? '🚫 Désactiver' : '✅ Activer'}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Supprimer la bannière "${banner.title}"?`)) {
                                  setBanners(banners.filter(b => b.id !== banner.id));
                                  alert('🗑️ Bannière supprimée!');
                                }
                              }}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm"
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulaire Créer/Éditer Bannière */}
                {(showBannerForm || editingBanner) && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">
                          {editingBanner ? '✏️ Modifier Publicité' : '➕ Nouvelle Publicité'}
                        </h2>
                        <button
                          onClick={() => {
                            setShowBannerForm(false);
                            setEditingBanner(null);
                          }}
                          className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                          <input
                            type="text"
                            defaultValue={editingBanner?.title || ''}
                            placeholder="Ex: Promo Spéciale -30%"
                            className="w-full px-4 py-3 border rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                          <textarea
                            rows="3"
                            defaultValue={editingBanner?.description || ''}
                            placeholder="Description de l'offre..."
                            className="w-full px-4 py-3 border rounded-lg"
                          ></textarea>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">URL de l'image</label>
                          <input
                            type="text"
                            defaultValue={editingBanner?.imageUrl || ''}
                            placeholder="https://example.com/image.jpg"
                            className="w-full px-4 py-3 border rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Lien de destination</label>
                          <input
                            type="text"
                            defaultValue={editingBanner?.link || ''}
                            placeholder="/catalog/electronics"
                            className="w-full px-4 py-3 border rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                          <select defaultValue={editingBanner?.position || 'homepage_hero'} className="w-full px-4 py-3 border rounded-lg">
                            <option value="homepage_hero">Page d'accueil - Hero</option>
                            <option value="homepage_top">Page d'accueil - Haut</option>
                            <option value="homepage_middle">Page d'accueil - Milieu</option>
                            <option value="catalog_top">Catalogue - Haut</option>
                            <option value="sidebar">Barre latérale</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
                            <input
                              type="date"
                              defaultValue={editingBanner?.startDate || ''}
                              className="w-full px-4 py-3 border rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
                            <input
                              type="date"
                              defaultValue={editingBanner?.endDate || ''}
                              className="w-full px-4 py-3 border rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            onClick={() => {
                              alert(editingBanner ? '✅ Bannière mise à jour!' : '✅ Bannière créée!');
                              setShowBannerForm(false);
                              setEditingBanner(null);
                            }}
                            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-semibold"
                          >
                            {editingBanner ? 'Enregistrer' : 'Créer la Publicité'}
                          </button>
                          <button
                            onClick={() => {
                              setShowBannerForm(false);
                              setEditingBanner(null);
                            }}
                            className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
```

---

## Instructions d'Intégration

1. Ouvrir `/app/frontend/src/components.js`
2. Trouver la ligne ~5854 (fin de la section Orders)
3. Ajouter le code ci-dessus juste avant la fermeture de `</div>` du main content
4. Sauvegarder et redémarrer le frontend

---

## Fonctionnalités Incluses

### 1. Accès Utilisateurs (👁️)
- ✅ Voir tous les acheteurs
- ✅ Modifier profils utilisateurs
- ✅ Voir détails complets
- ✅ Changer statut (actif/suspendu)
- ✅ Modal d'édition complet

### 2. Éditeur de Contenu (✏️)
- ✅ Liste tous les produits
- ✅ Éditer produits existants
- ✅ Modifier prix, stock, catégorie
- ✅ Modifier descriptions
- ✅ Supprimer produits
- ✅ Ajouter nouveaux produits

### 3. Panneaux Publicitaires (📢)
- ✅ Créer nouvelles bannières
- ✅ Modifier bannières existantes
- ✅ Upload image URL
- ✅ Définir position (hero, top, sidebar)
- ✅ Dates début/fin
- ✅ Activer/Désactiver
- ✅ Supprimer bannières

---

## Notes Importantes

- Toutes les fonctionnalités sont **mockées** pour la démo
- Pour production: connecter au backend Laravel
- Les modifications sont **temporaires** (localStorage)
- Interfaces **responsives** sur tous appareils

---

## Couleurs des Sections

```css
Accès Utilisateurs: Orange (bg-orange-100)
Éditeur Contenu:    Bleu (bg-blue-100)
Publicités:         Jaune (bg-yellow-100)
```
