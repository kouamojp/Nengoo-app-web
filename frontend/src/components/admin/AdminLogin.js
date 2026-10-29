
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const AdminLogin = (props) => {
  const { setUser } = props;
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    whatsapp: '',
    accessCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/admins/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erreur de connexion');
      }
      
      const adminUser = {
        ...data,
        type: 'admin' // Assurez-vous que le type est défini pour la logique de l'application
      };

      setUser(adminUser);
      localStorage.setItem('nengoo-user', JSON.stringify(adminUser));
      navigate('/admin/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="on-dark min-h-screen bg-purple-950 flex items-center justify-center p-4 text-left">
      <div className="max-w-md w-full">
        <img
          src="/images/logo-nengoo-white.png"
          alt="Nengoo"
          className="h-12 w-auto mb-8"
        />
        <div className="bg-white rounded-2xl p-6 sm:p-8">
          <h1 className="adm-title">Administration</h1>
          <p className="adm-subtitle mb-6">Connectez-vous avec le numéro WhatsApp et le code d'accès de votre compte administrateur.</p>

          {error && (
            <p className="mb-5 p-3 rounded-lg bg-red-50 text-red-800 text-sm" role="alert">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="adm-label" htmlFor="admin-whatsapp">
                Numéro WhatsApp
              </label>
              <input
                id="admin-whatsapp"
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleInputChange}
                placeholder="+237 6XX XXX XXX"
                autoComplete="username"
                required
                className="adm-input"
              />
            </div>

            <div>
              <label className="adm-label" htmlFor="admin-code">
                Code d'accès
              </label>
              <input
                id="admin-code"
                type="password"
                name="accessCode"
                value={formData.accessCode}
                onChange={handleInputChange}
                autoComplete="current-password"
                required
                className="adm-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="adm-btn adm-btn-primary w-full !min-h-[2.75rem]"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <Link to="/" className="inline-block mt-6 text-sm text-purple-200 hover:text-white hover:underline underline-offset-4">
          Retour au site
        </Link>
      </div>
    </div>
  );
};

export default AdminLogin;
