import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookingSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { LocationData } from "@/pages/booking-page";
import VehicleSelect from "./vehicle-select";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";

type Props = {
  onLocationSelect: (data: LocationData) => void;
  locationData: LocationData | null;
};

async function searchLocation(query: string) {
  if (!query.trim()) return null;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query.trim()
      )}&limit=1`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch location');
    }

    const data = await response.json();
    if (!data.length) return null;

    return {
      address: data[0].display_name,
      coords: {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      },
    };
  } catch (error) {
    console.error('Location search error:', error);
    return null;
  }
}

export default function BookingForm({ onLocationSelect, locationData }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSearching, setIsSearching] = useState(false);
  const [pickupSearch, setPickupSearch] = useState("");
  const [dropoffSearch, setDropoffSearch] = useState("");

  const debouncedPickupSearch = useDebounce(pickupSearch, 500);
  const debouncedDropoffSearch = useDebounce(dropoffSearch, 500);

  const form = useForm({
    resolver: zodResolver(insertBookingSchema),
    defaultValues: {
      vehicleType: "",
      pickupLocation: "",
      dropoffLocation: "",
      pickupCoords: "",
      dropoffCoords: "",
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bookings", data);
      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.message || 'Failed to create booking');
      }
      return responseData;
    },
    onSuccess: () => {
      toast({
        title: "Booking Confirmed",
        description: "Your transport has been successfully booked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setLocation("/booking/details");
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    async function performSearch() {
      if (!debouncedPickupSearch) return;

      setIsSearching(true);
      try {
        const location = await searchLocation(debouncedPickupSearch);
        if (location) {
          const newLocationData = {
            ...locationData || {
              pickup: { address: "", coords: { lat: 0, lng: 0 } },
              dropoff: { address: "", coords: { lat: 0, lng: 0 } },
            },
            pickup: location,
          };
          onLocationSelect(newLocationData);
          form.setValue("pickupLocation", location.address);
        }
      } catch (error) {
        toast({
          title: "Search Failed",
          description: "Failed to search pickup location. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    }

    performSearch();
  }, [debouncedPickupSearch]);

  useEffect(() => {
    async function performSearch() {
      if (!debouncedDropoffSearch) return;

      setIsSearching(true);
      try {
        const location = await searchLocation(debouncedDropoffSearch);
        if (location) {
          const newLocationData = {
            ...locationData || {
              pickup: { address: "", coords: { lat: 0, lng: 0 } },
              dropoff: { address: "", coords: { lat: 0, lng: 0 } },
            },
            dropoff: location,
          };
          onLocationSelect(newLocationData);
          form.setValue("dropoffLocation", location.address);
        }
      } catch (error) {
        toast({
          title: "Search Failed",
          description: "Failed to search dropoff location. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    }

    performSearch();
  }, [debouncedDropoffSearch]);

  const onSubmit = (data: any) => {
    if (!locationData?.pickup || !locationData?.dropoff) {
      toast({
        title: "Location Required",
        description: "Please select both pickup and dropoff locations",
        variant: "destructive",
      });
      return;
    }

    if (!data.vehicleType) {
      toast({
        title: "Vehicle Required",
        description: "Please select a vehicle type",
        variant: "destructive",
      });
      return;
    }

    const bookingData = {
      ...data,
      pickupCoords: JSON.stringify(locationData.pickup.coords),
      dropoffCoords: JSON.stringify(locationData.dropoff.coords),
      pickupLocation: locationData.pickup.address,
      dropoffLocation: locationData.dropoff.address,
    };

    bookingMutation.mutate(bookingData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="vehicleType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vehicle Type</FormLabel>
              <FormControl>
                <VehicleSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pickupLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pickup Location</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input
                    {...field}
                    placeholder="Enter pickup address"
                    value={pickupSearch}
                    onChange={(e) => {
                      setPickupSearch(e.target.value);
                      field.onChange(e);
                    }}
                  />
                  {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dropoffLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dropoff Location</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input
                    {...field}
                    placeholder="Enter dropoff address"
                    value={dropoffSearch}
                    onChange={(e) => {
                      setDropoffSearch(e.target.value);
                      field.onChange(e);
                    }}
                  />
                  {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={bookingMutation.isPending || isSearching}
        >
          {bookingMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Confirm Booking
        </Button>
      </form>
    </Form>
  );
}