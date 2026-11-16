import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Centre du Cameroun, quand aucun point n'a de coordonnées
const CAMEROON = [5.7, 12.4];

const escapeHtml = (text = '') => String(text)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Épingles en HTML : pas d'images Leaflet à copier dans le build
const pinIcon = (nearest) => L.divIcon({
  className: '',
  html: `<span class="pickup-pin${nearest ? ' pickup-pin--nearest' : ''}" aria-hidden="true"></span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});

const userIcon = L.divIcon({
  className: '',
  html: '<span class="pickup-me" aria-hidden="true"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/**
 * Carte des points de retrait (Leaflet + OpenStreetMap). Le point le plus
 * proche de l'utilisateur est mis en évidence ; `focusId` centre la carte sur
 * un point et ouvre sa bulle.
 */
const PickupMap = ({ points, user, nearestId, focusId, onSelect, labels }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef({});

  // Création de la carte, une fois
  useEffect(() => {
    const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: true })
      .setView(CAMEROON, 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Épingles, position de l'utilisateur et cadrage
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current = {};

    points.forEach(point => {
      const nearest = point.id === nearestId;
      const marker = L.marker([point.latitude, point.longitude], {
        icon: pinIcon(nearest),
        title: point.name,
        zIndexOffset: nearest ? 1000 : 0,
      });
      const distance = point.distanceKm != null ? `<p class="pickup-popup__distance">${escapeHtml(labels.distance(point.distanceKm))}</p>` : '';
      marker.bindPopup(
        `<div class="pickup-popup">
          ${nearest ? `<p class="pickup-popup__badge">${escapeHtml(labels.nearest)}</p>` : ''}
          <p class="pickup-popup__name">${escapeHtml(point.name)}</p>
          <p class="pickup-popup__address">${escapeHtml(point.address)}</p>
          ${point.hours ? `<p class="pickup-popup__hours">${escapeHtml(point.hours)}</p>` : ''}
          ${distance}
          <a class="pickup-popup__link" target="_blank" rel="noopener noreferrer"
             href="https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}">${escapeHtml(labels.directions)}</a>
        </div>`,
      );
      marker.on('click', () => onSelect?.(point.id));
      marker.addTo(layer);
      markersRef.current[point.id] = marker;
    });

    if (user) {
      L.marker([user.latitude, user.longitude], { icon: userIcon, title: labels.you, zIndexOffset: 2000 })
        .bindTooltip(labels.you)
        .addTo(layer);
    }

    // Cadrage : l'utilisateur et le plus proche, sinon tous les points visibles
    const nearestPoint = points.find(p => p.id === nearestId);
    const frame = user && nearestPoint
      ? [[user.latitude, user.longitude], [nearestPoint.latitude, nearestPoint.longitude]]
      : points.map(p => [p.latitude, p.longitude]);
    if (frame.length === 1) {
      map.setView(frame[0], 14);
    } else if (frame.length > 1) {
      map.fitBounds(frame, { padding: [40, 40], maxZoom: 15 });
    }
    if (nearestPoint && user) markersRef.current[nearestPoint.id]?.openPopup();
  }, [points, user, nearestId, labels, onSelect]);

  // « Voir sur la carte » depuis la liste
  useEffect(() => {
    const marker = focusId && markersRef.current[focusId.id];
    if (!marker || !mapRef.current) return;
    mapRef.current.setView(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 15));
    marker.openPopup();
  }, [focusId]);

  return (
    <div
      ref={containerRef}
      className="h-[22rem] sm:h-[28rem] w-full rounded-xl border border-gray-200 overflow-hidden z-0"
      role="region"
      aria-label={labels.mapLabel}
    />
  );
};

export default PickupMap;
