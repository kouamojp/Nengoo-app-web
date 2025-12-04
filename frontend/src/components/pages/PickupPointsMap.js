
import React, { useState } from 'react';
import { mockPickupPoints } from '../../lib/mockData';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

export const PickupPointsMap = (props) => {
    const { language, user } = props;
    const [selectedCity, setSelectedCity] = useState('all');
    const [selectedPoint, setSelectedPoint] = useState(null);
    
    // Grouper les points de retrait par ville
    const approvedPoints = mockPickupPoints.approved;
    const pointsByCity = approvedPoints.reduce((acc, point) => {
      if (!acc[point.city]) {
        acc[point.city] = [];
      }
      acc[point.city].push(point);
      return acc;
    }, {});
    
    const cities = Object.keys(pointsByCity).sort();
    const totalPoints = approvedPoints.length;
    
    // Filtrer les points selon la ville sélectionnée
    const filteredPoints = selectedCity === 'all' 
      ? approvedPoints 
      : pointsByCity[selectedCity] || [];
    
    return (
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="bg-gradient-to-r from-purple-600 to-red-600 text-white rounded-lg p-8 mb-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-3">📍 Points de Retrait Nengoo</h1>
              <p className="text-lg opacity-90">Trouvez le point de retrait le plus proche de vous</p>
              <p className="text-sm opacity-75 mt-2">{totalPoints} points disponibles au Cameroun</p>
            </div>
          </div>
  
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-gray-700">Filtrer par ville :</span>
              <button
                onClick={() => setSelectedCity('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCity === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Toutes les villes ({totalPoints})
              </button>
              {cities.map(city => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCity === city
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {city} ({pointsByCity[city].length})
                </button>
              ))}
            </div>
          </div>
  
          {/* Points Grid by City */}
          {selectedCity === 'all' ? (
            <div className="space-y-8">
              {cities.map(city => (
                <div key={city}>
                  <h2 className="text-2xl font-bold mb-4 flex items-center">
                    <span className="text-purple-600 mr-2">📍</span>
                    {city} ({pointsByCity[city].length} {pointsByCity[city].length > 1 ? 'points' : 'point'})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pointsByCity[city].map(point => (
                      <div
                        key={point.id}
                        className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden cursor-pointer"
                        onClick={() => setSelectedPoint(point)}
                      >
                        <div className="bg-gradient-to-r from-purple-500 to-red-500 text-white p-4">
                          <h3 className="font-bold text-lg mb-1">{point.name}</h3>
                          <p className="text-sm opacity-90">📍 {point.city}</p>
                        </div>
                        <div className="p-4 space-y-2">
                          <p className="text-sm text-gray-600">
                            <strong>Adresse:</strong> {point.address}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Téléphone:</strong> {point.phone}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Horaires:</strong> {point.hours}
                          </p>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center">
                              <span className="text-yellow-500 mr-1">⭐</span>
                              <span className="text-sm font-semibold">{point.rating}</span>
                              <span className="text-xs text-gray-500 ml-1">({point.reviewsCount})</span>
                            </div>
                            <div className="text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                point.currentLoad / point.capacity > 0.8
                                  ? 'bg-red-100 text-red-700'
                                  : point.currentLoad / point.capacity > 0.5
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {point.currentLoad}/{point.capacity} colis
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 text-center">
                          <button className="text-purple-600 hover:text-purple-700 font-semibold text-sm">
                            Voir les détails →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <span className="text-purple-600 mr-2">📍</span>
                {selectedCity} ({filteredPoints.length} {filteredPoints.length > 1 ? 'points' : 'point'})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPoints.map(point => (
                  <div
                    key={point.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden cursor-pointer"
                    onClick={() => setSelectedPoint(point)}
                  >
                    <div className="bg-gradient-to-r from-purple-500 to-red-500 text-white p-4">
                      <h3 className="font-bold text-lg mb-1">{point.name}</h3>
                      <p className="text-sm opacity-90">📍 {point.city}</p>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-sm text-gray-600">
                        <strong>Adresse:</strong> {point.address}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Téléphone:</strong> {point.phone}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Horaires:</strong> {point.hours}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Gestionnaire:</strong> {point.managerName}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>WhatsApp:</strong> {point.managerWhatsApp}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center">
                          <span className="text-yellow-500 mr-1">⭐</span>
                          <span className="text-sm font-semibold">{point.rating}</span>
                          <span className="text-xs text-gray-500 ml-1">({point.reviewsCount})</span>
                        </div>
                        <div className="text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            point.currentLoad / point.capacity > 0.8
                              ? 'bg-red-100 text-red-700'
                              : point.currentLoad / point.capacity > 0.5
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {point.currentLoad}/{point.capacity} colis
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3">
                      <p className="text-xs text-gray-600 italic mb-2">{point.description}</p>
                      <div className="flex space-x-2">
                        <a
                          href={`https://wa.me/${point.managerWhatsApp.replace(/\s/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded text-center text-sm font-semibold transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          💬 WhatsApp
                        </a>
                        <a
                          href={`tel:${point.phone}`}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-center text-sm font-semibold transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📞 Appeler
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
  
          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <span className="text-3xl">ℹ️</span>
              <div>
                <h3 className="font-bold text-blue-900 mb-2">Comment ça marche ?</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Choisissez un point de retrait lors de votre commande</li>
                  <li>Le vendeur livre votre produit au point choisi</li>
                  <li>Vous recevez une notification quand le produit arrive</li>
                  <li>Venez récupérer votre commande pendant les horaires d'ouverture</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        
        {/* Modal Point Details */}
        {selectedPoint && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPoint(null)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedPoint.name}</h2>
                  <p className="text-gray-600">📍 {selectedPoint.city}, {selectedPoint.region}</p>
                </div>
                <button
                  onClick={() => setSelectedPoint(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">📍 Localisation</h3>
                  <p className="text-sm text-gray-700">{selectedPoint.address}</p>
                  <p className="text-sm text-gray-700">{selectedPoint.city}, {selectedPoint.region}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">📞 Contact</h3>
                    <p className="text-sm text-gray-700">Tel: {selectedPoint.phone}</p>
                    <p className="text-sm text-gray-700">Email: {selectedPoint.email}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">🕐 Horaires</h3>
                    <p className="text-sm text-gray-700">{selectedPoint.hours}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">👤 Gestionnaire</h3>
                  <p className="text-sm text-gray-700">{selectedPoint.managerName}</p>
                  <p className="text-sm text-gray-700">WhatsApp: {selectedPoint.managerWhatsApp}</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">📊 Statistiques</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{selectedPoint.activeOrders}</p>
                      <p className="text-xs text-gray-600">Colis en cours</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{selectedPoint.capacity}</p>
                      <p className="text-xs text-gray-600">Capacité totale</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">⭐ {selectedPoint.rating}</p>
                      <p className="text-xs text-gray-600">{selectedPoint.reviewsCount} avis</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <a
                  href={`https://wa.me/${selectedPoint.managerWhatsApp.replace(/\s/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg text-center font-semibold transition-colors"
                >
                  💬 Contacter sur WhatsApp
                </a>
                <a
                  href={`tel:${selectedPoint.phone}`}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg text-center font-semibold transition-colors"
                >
                  📞 Appeler
                </a>
              </div>
            </div>
          </div>
        )}
        
        <Footer language={language} />
      </div>
    );
  };

  export default PickupPointsMap;
