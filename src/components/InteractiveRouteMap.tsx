import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet markers in React Context
// We use simple generic marker icons to avoid webpack require paths missing issues
const createMarker = (color: string) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const defaultStartIcon = createMarker('#22c55e'); // Green
const defaultFinishIcon = createMarker('#ef4444'); // Red

// Component to recenter map when tracks change
function RecenterMap({ trackPoints }: { trackPoints: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (trackPoints.length > 0) {
      const bounds = L.latLngBounds(trackPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [trackPoints, map]);
  return null;
}

interface MapProps {
  trackPoints: Array<[number, number]>;
  fallbackLat?: number;
  fallbackLng?: number;
}

export default function InteractiveRouteMap({ trackPoints, fallbackLat, fallbackLng }: MapProps) {
  const defaultCenter: [number, number] = trackPoints.length > 0 
    ? trackPoints[Math.floor(trackPoints.length / 2)] 
    : [fallbackLat || -0.789275, fallbackLng || 113.921327]; // Indonesia center fallback

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        className="w-full h-full"
        scrollWheelZoom={false}
      >
        {/* Light Mode CartoDB Tile */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {trackPoints.length > 0 && (
          <>
            <Polyline 
              positions={trackPoints} 
              color="#DC2626" 
              weight={6} 
              opacity={0.8}
            />
            {/* Start Marker */}
            <Marker position={trackPoints[0]} icon={defaultStartIcon}>
              <Popup className="font-bold uppercase tracking-widest text-xs">Start Point</Popup>
            </Marker>
            {/* Finish Marker */}
            <Marker position={trackPoints[trackPoints.length - 1]} icon={defaultFinishIcon}>
              <Popup className="font-bold uppercase tracking-widest text-xs">Finish Point</Popup>
            </Marker>
            <RecenterMap trackPoints={trackPoints} />
          </>
        )}
      </MapContainer>

      {/* Styled JSX for the map overrides to prevent bleeding out of container */}
      <style>{`
        .leaflet-container {
          width: 100%;
          height: 100%;
          z-index: 10;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 4px;
          background-color: #1c1917; /* stone-900 */
          color: white;
          border-left: 4px solid #dc2626; /* red-600 */
        }
        .leaflet-popup-tip {
          background-color: #1c1917;
        }
      `}</style>
    </div>
  );
}
