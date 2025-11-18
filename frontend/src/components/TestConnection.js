import React, { useState, useEffect } from 'react';

/**
 * Composant de test de connexion au backend
 * Utilisez ce composant pour vérifier que le frontend communique bien avec le backend
 *
 * Usage: Ajoutez <TestConnection /> dans Homepage ou n'importe où
 */
export const TestConnection = () => {
  const [status, setStatus] = useState('loading');
  const [apiUrl, setApiUrl] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001/api';
    setApiUrl(baseUrl);

    try {
      const response = await fetch(`${baseUrl}/`);
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Connexion réussie !');
      } else {
        setStatus('error');
        setMessage('Erreur de connexion au backend');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Impossible de se connecter au backend: ${error.message}`);
    }
  };

  const statusColors = {
    loading: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };

  const statusIcons = {
    loading: '⏳',
    success: '✅',
    error: '❌'
  };

  return (
    <div className={`border rounded-lg p-4 ${statusColors[status]}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">{statusIcons[status]}</div>
        <div className="flex-1">
          <h3 className="font-bold mb-1">Test de connexion Backend</h3>
          <p className="text-sm mb-2">{message}</p>
          <p className="text-xs opacity-75">
            <strong>API URL:</strong> {apiUrl}
          </p>
          {status === 'error' && (
            <div className="mt-3 text-xs">
              <p><strong>Vérifiez que :</strong></p>
              <ul className="list-disc list-inside mt-1">
                <li>Le backend est démarré (uvicorn server:app --reload --port 8001)</li>
                <li>L'URL dans .env est correcte : REACT_APP_API_BASE_URL</li>
                <li>MongoDB est en cours d'exécution</li>
              </ul>
            </div>
          )}
          {status !== 'loading' && (
            <button
              onClick={testConnection}
              className="mt-3 px-3 py-1 bg-white bg-opacity-50 hover:bg-opacity-75 rounded text-xs font-medium transition-colors"
            >
              Retester
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestConnection;
