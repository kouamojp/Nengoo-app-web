import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';

export const AdminOrders = (props) => {
  const { setUser } = props;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar setUser={setUser} />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Gestion des Commandes</h1>
            <p className="text-gray-600 mt-2">
              Gérez toutes les commandes de la plateforme
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Gestion des commandes
            </h2>
            <p className="text-gray-600 mb-6">
              Cette section permettra de gérer toutes les commandes
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-blue-800 text-sm">
                <strong>Fonctionnalités à venir:</strong><br/>
                • Voir toutes les commandes<br/>
                • Filtrer par statut (en cours, livrée, annulée)<br/>
                • Voir les détails de chaque commande<br/>
                • Suivre les commandes par vendeur<br/>
                • Générer des rapports
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
