import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Booking, BookingStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

type VehicleLocation = {
  lat: number;
  lng: number;
};

type WSMessage = {
  type: 'CONNECTED' | 'LOCATION_UPDATE';
  message?: string;
  data?: VehicleLocation;
};

export default function TrackingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [vehicleLocation, setVehicleLocation] = useState<VehicleLocation>({
    lat: 0,
    lng: 0,
  });
  const [wsRetryCount, setWsRetryCount] = useState(0);

  // Get current booking to check status
  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const currentBooking = bookings?.find(booking => 
    booking.status === BookingStatus.ACCEPTED || 
    booking.status === BookingStatus.IN_TRANSIT
  );

  const connectWebSocket = useCallback(() => {
    if (!currentBooking) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    let reconnectTimeout: NodeJS.Timeout;

    socket.onopen = () => {
      console.log('WebSocket connected');
      setWsRetryCount(0);
    };

    socket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        if (message.type === 'LOCATION_UPDATE' && message.data) {
          setVehicleLocation(message.data);
        } else if (message.type === 'CONNECTED') {
          console.log('Connected to tracking server:', message.message);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      // Implement exponential backoff for reconnection
      const backoffTime = Math.min(1000 * Math.pow(2, wsRetryCount), 30000);
      reconnectTimeout = setTimeout(() => {
        setWsRetryCount(prev => prev + 1);
        connectWebSocket();
      }, backoffTime);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Lost connection to tracking server. Attempting to reconnect...",
        variant: "destructive",
      });
    };

    return () => {
      socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, [currentBooking, wsRetryCount, toast]);

  useEffect(() => {
    const cleanup = connectWebSocket();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connectWebSocket]);

  if (!currentBooking) {
    setLocation("/booking/details");
    return null;
  }

  return (
    <div className="relative h-screen w-screen">
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 right-4 z-[9999] bg-white shadow-md hover:bg-gray-100"
        onClick={() => setLocation("/booking/details")}
      >
        <X className="h-4 w-4" />
      </Button>

      <Card className="w-full h-full">
        <MapContainer
          center={[vehicleLocation.lat || 0, vehicleLocation.lng || 0]}
          zoom={15}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {vehicleLocation.lat !== 0 && vehicleLocation.lng !== 0 && (
            <Marker position={[vehicleLocation.lat, vehicleLocation.lng]} />
          )}
        </MapContainer>
      </Card>
    </div>
  );
}