import { Card } from "@/components/ui/card";
import BookingForm from "@/components/booking/booking-form";
import MapView from "@/components/booking/map-view";
import { useState } from "react";
import NavBar from "@/components/layout/nav-bar";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type LocationData = {
  pickup: { address: string; coords: Coordinates };
  dropoff: { address: string; coords: Coordinates };
};

export default function BookingPage() {
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container mx-auto p-6 grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <BookingForm
            onLocationSelect={setLocationData}
            locationData={locationData}
          />
        </Card>
        <div className="lg:h-[calc(100vh-8rem)] h-[400px]">
          <MapView locationData={locationData} />
        </div>
      </div>
    </div>
  );
}
