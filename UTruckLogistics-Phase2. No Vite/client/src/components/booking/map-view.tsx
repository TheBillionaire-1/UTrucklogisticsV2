import { Card } from "@/components/ui/card";
import { LocationData } from "@/pages/booking-page";
import { MapContainer, TileLayer, Marker, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
});

// Create a custom green marker icon for dropoff
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

type Props = {
  locationData: LocationData | null;
};

async function getRoute(start: [number, number], end: [number, number]) {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
    );
    const data = await response.json();

    if (data.code !== 'Ok') {
      throw new Error('Failed to get route');
    }

    return data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
  } catch (error) {
    console.error('Route fetch error:', error);
    return null;
  }
}

function RouteLayer({ locationData }: Props) {
  const [routePoints, setRoutePoints] = useState<[number, number][] | null>(null);

  useEffect(() => {
    async function fetchRoute() {
      if (locationData?.pickup && locationData?.dropoff) {
        const start: [number, number] = [locationData.pickup.coords.lat, locationData.pickup.coords.lng];
        const end: [number, number] = [locationData.dropoff.coords.lat, locationData.dropoff.coords.lng];
        const points = await getRoute(start, end);
        setRoutePoints(points);
      }
    }
    fetchRoute();
  }, [locationData]);

  if (!routePoints) return null;

  return (
    <Polyline 
      positions={routePoints}
      color="#3B82F6"
      weight={4}
      opacity={0.8}
    />
  );
}

function MapCenter({ locationData }: Props) {
  const map = useMap();

  useEffect(() => {
    if (locationData?.pickup && locationData?.dropoff) {
      const bounds = new L.LatLngBounds([
        [locationData.pickup.coords.lat, locationData.pickup.coords.lng],
        [locationData.dropoff.coords.lat, locationData.dropoff.coords.lng],
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [locationData, map]);

  return null;
}

function MapMarkers({ locationData }: Props) {
  const pickupMarker = useMemo(
    () =>
      locationData?.pickup ? (
        <Marker
          position={[locationData.pickup.coords.lat, locationData.pickup.coords.lng]}
          title="Pickup Location"
        />
      ) : null,
    [locationData?.pickup]
  );

  const dropoffMarker = useMemo(
    () =>
      locationData?.dropoff ? (
        <Marker
          position={[locationData.dropoff.coords.lat, locationData.dropoff.coords.lng]}
          title="Dropoff Location"
          icon={greenIcon}
        />
      ) : null,
    [locationData?.dropoff]
  );

  return (
    <>
      {pickupMarker}
      {dropoffMarker}
    </>
  );
}

export default function MapView({ locationData }: Props) {
  // Default center (world view)
  const defaultCenter = { lat: 20, lng: 0 };
  const defaultZoom = 2;

  return (
    <Card className="w-full h-full overflow-hidden">
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapMarkers locationData={locationData} />
        <RouteLayer locationData={locationData} />
        <MapCenter locationData={locationData} />
      </MapContainer>
    </Card>
  );
}