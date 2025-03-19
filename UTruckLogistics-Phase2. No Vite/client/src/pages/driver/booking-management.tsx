import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Booking, BookingStatus } from "@shared/schema";
import { Loader2 } from "lucide-react";
import NavBar from "@/components/layout/nav-bar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

type StatusUpdatePayload = {
  bookingId: number;
  status: BookingStatus;
};

export default function DriverBookingManagement() {
  const { toast } = useToast();
  const [justCompleted, setJustCompleted] = useState(false);
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let isConnecting = false;
    let isCleanup = false;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    const connect = () => {
      if (isConnecting || isCleanup || retryCount >= MAX_RETRIES) return;
      isConnecting = true;

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

        ws.onopen = () => {
          console.log(`[${new Date().toISOString()}] WebSocket connected successfully`);
          isConnecting = false;
          retryCount = 0; // Reset retry count on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'BOOKING_STATUS_UPDATED') {
              console.log(`[${new Date().toISOString()}] WebSocket status update:`, data);
              // Wrap in try-catch to handle potential promise rejections
              try {
                queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
                  .catch(error => {
                    console.error(`[${new Date().toISOString()}] Cache invalidation error:`, error);
                  });
              } catch (error) {
                console.error(`[${new Date().toISOString()}] Query invalidation error:`, error);
              }
            }
          } catch (error) {
            console.error(`[${new Date().toISOString()}] WebSocket message parsing error:`, error);
          }
        };

        ws.onclose = (event) => {
          if (!event.wasClean && !isCleanup) {
            console.log(`[${new Date().toISOString()}] WebSocket connection lost, attempt ${retryCount + 1}/${MAX_RETRIES}`);
            isConnecting = false;
            retryCount++;
            if (retryCount < MAX_RETRIES) {
              const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
              console.log(`[${new Date().toISOString()}] Scheduling reconnect in ${backoffDelay}ms`);
              reconnectTimeout = setTimeout(connect, backoffDelay);
            } else {
              console.log(`[${new Date().toISOString()}] Max retries (${MAX_RETRIES}) reached, stopping reconnection attempts`);
            }
          }
        };

        ws.onerror = (error) => {
          console.error(`[${new Date().toISOString()}] WebSocket error:`, error);
          isConnecting = false;
          if (ws?.readyState !== WebSocket.CLOSED && !isCleanup) {
            ws?.close();
          }
        };
      } catch (error) {
        console.error(`[${new Date().toISOString()}] WebSocket connection error:`, error);
        isConnecting = false;
        if (!isCleanup && retryCount < MAX_RETRIES) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          console.log(`[${new Date().toISOString()}] Scheduling reconnect in ${backoffDelay}ms`);
          reconnectTimeout = setTimeout(connect, backoffDelay);
          retryCount++;
        } else {
          console.log(`[${new Date().toISOString()}] Max retries reached or cleanup in progress, stopping reconnection attempts`);
        }
      }
    };

    connect();

    return () => {
      console.log(`[${new Date().toISOString()}] Starting WebSocket cleanup process...`);
      console.log(`[${new Date().toISOString()}] Current connection state:`, {
        isConnecting,
        retryCount,
        hasActiveSocket: !!ws,
        socketReadyState: ws?.readyState,
        hasReconnectTimer: !!reconnectTimeout
      });

      // Set cleanup flag first to prevent new connections
      isCleanup = true;
      isConnecting = false;

      // Clear any pending reconnect timer
      if (reconnectTimeout) {
        console.log(`[${new Date().toISOString()}] Clearing pending reconnect timer`);
        clearTimeout(reconnectTimeout);
        reconnectTimeout = undefined;
        console.log(`[${new Date().toISOString()}] Reconnect timer cleared`);
      }

      // Close WebSocket if it exists
      if (ws) {
        try {
          console.log(`[${new Date().toISOString()}] Attempting to close WebSocket connection`);

          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            console.log(`[${new Date().toISOString()}] WebSocket connection closed successfully`);
          } else {
            console.log(`[${new Date().toISOString()}] WebSocket already closed (state: ${ws.readyState})`);
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error during WebSocket cleanup:`, error);
        } finally {
          ws = null;
          console.log(`[${new Date().toISOString()}] WebSocket reference cleared`);
        }
      }

      console.log(`[${new Date().toISOString()}] WebSocket cleanup process completed`);
    };
  }, []);

  const statusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: StatusUpdatePayload) => {
      try {
        console.log(`[${new Date().toISOString()}] Mutation executing for booking ${bookingId} to status ${status}`);
        console.log(`[${new Date().toISOString()}] Current booking state:`, currentBooking);
        const payload = { status };

        // Validate input and transition
        if (!bookingId || !status) {
          throw new Error('Invalid booking ID or status');
        }

        // Validate status transitions within mutation
        let isValidTransition = true;
        switch (status) {
          case BookingStatus.COMPLETED:
            isValidTransition = currentBooking?.status === BookingStatus.IN_TRANSIT;
            break;
          case BookingStatus.REJECTED:
            isValidTransition = currentBooking?.status === BookingStatus.PENDING;
            break;
          case BookingStatus.ACCEPTED:
            isValidTransition = currentBooking?.status === BookingStatus.PENDING;
            break;
          case BookingStatus.IN_TRANSIT:
            isValidTransition = currentBooking?.status === BookingStatus.ACCEPTED;
            break;
          default:
            isValidTransition = false;
        }

        if (!isValidTransition) {
          throw new Error(`Invalid status transition from ${currentBooking?.status} to ${status}`);
        }

        // Make API request with error handling
        let res;
        try {
          res = await apiRequest(
            "PATCH",
            `/api/bookings/${bookingId}/status`,
            payload
          );
        } catch (error) {
          console.error(`[${new Date().toISOString()}] API request failed:`, error);
          throw error;
        }

        if (!res.ok) {
          const errorText = await res.text().catch(() => 'Unknown error');
          console.error(`[${new Date().toISOString()}] API response not OK:`, {
            status: res.status,
            statusText: res.statusText,
            error: errorText
          });
          throw new Error(`Failed to update status: ${res.statusText}`);
        }

        const data = await res.json().catch(error => {
          console.error(`[${new Date().toISOString()}] Failed to parse API response:`, error);
          throw error;
        });

        console.log(`[${new Date().toISOString()}] API Response Validation:`, {
          status: data.status,
          expectedStatus: status,
          match: data.status === status ? "Success" : "Failure"
        });

        return data;
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Status update error:`, error);
        throw error;
      }
    },
    onSuccess: (data) => {
      try {
        console.log(`[${new Date().toISOString()}] Mutation success:`, {
          bookingId: data.id,
          oldStatus: currentBooking?.status,
          newStatus: data.status,
          timestamp: new Date().toISOString()
        });

        // Cache invalidation with error handling
        try {
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
            .catch(error => {
              console.error(`[${new Date().toISOString()}] Cache invalidation error:`, error);
            });
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error during cache invalidation:`, error);
        }

        console.log(`[${new Date().toISOString()}] Cache invalidation completed`);

        toast({
          title: "Status Updated",
          description: "The booking status has been updated successfully.",
        });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in mutation success handler:`, error);
      }
    },
    onError: (error: Error) => {
      console.error(`[${new Date().toISOString()}] Mutation error:`, error);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get the latest booking regardless of status
  const currentBooking = bookings?.[0];

  console.log(`[${new Date().toISOString()}] Current active booking after filtering:`, currentBooking);

  const handleStatusUpdate = (bookingId: number, status: BookingStatus) => {
    const beforeState = {...currentBooking};
    console.log(`[${new Date().toISOString()}] Status update initiated:`, {
      bookingId,
      currentStatus: beforeState?.status,
      targetStatus: status,
      timestamp: new Date().toISOString()
    });

    // For Complete/Cancel/Reject, validate the transition is allowed
    let isValidTransition = true;

    switch (status) {
      case BookingStatus.COMPLETED:
        isValidTransition = beforeState?.status === BookingStatus.IN_TRANSIT;
        break;
      case BookingStatus.REJECTED:
        isValidTransition = beforeState?.status === BookingStatus.PENDING;
        break;
      case BookingStatus.ACCEPTED:
        isValidTransition = beforeState?.status === BookingStatus.PENDING;
        break;
      case BookingStatus.IN_TRANSIT:
        isValidTransition = beforeState?.status === BookingStatus.ACCEPTED;
        break;
      default:
        isValidTransition = false;
    }

    if (!isValidTransition) {
      console.error(`[${new Date().toISOString()}] Invalid status transition from ${beforeState?.status} to ${status}`);
      toast({
        title: "Invalid Status Update",
        description: `Cannot update booking from ${beforeState?.status} to ${status}`,
        variant: "destructive",
      });
      return;
    }

    console.log(`[${new Date().toISOString()}] Status transition validation passed:`, {
      from: beforeState?.status,
      to: status,
      timestamp: new Date().toISOString()
    });

    statusMutation.mutate({ bookingId, status });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar currentPage="driver" />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Manage Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {currentBooking ? (
              <div className="grid gap-6">
                <div className="space-y-2">
                  <p className="font-semibold">Vehicle Type</p>
                  <p className="text-muted-foreground">{currentBooking.vehicleType}</p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">Pickup Location</p>
                  <p className="text-muted-foreground break-words">
                    {currentBooking.pickupLocation || "Not specified"}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">Dropoff Location</p>
                  <p className="text-muted-foreground break-words">
                    {currentBooking.dropoffLocation || "Not specified"}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">Status</p>
                  <p className={`font-medium capitalize ${getStatusColor(currentBooking.status)}`}>
                    {currentBooking.status.replace('_', ' ')}
                  </p>
                </div>

                <div className="flex gap-4">
                  {currentBooking.status === BookingStatus.PENDING && (
                    <>
                      <Button
                        variant="default"
                        onClick={() => handleStatusUpdate(
                          currentBooking.id,
                          BookingStatus.ACCEPTED
                        )}
                        disabled={statusMutation.isPending}
                      >
                        {statusMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Accept Booking
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleStatusUpdate(
                          currentBooking.id,
                          BookingStatus.REJECTED
                        )}
                        disabled={statusMutation.isPending}
                      >
                        {statusMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Reject Booking
                      </Button>
                    </>
                  )}

                  {currentBooking.status === BookingStatus.ACCEPTED && (
                    <Button
                      variant="default"
                      onClick={() => handleStatusUpdate(
                        currentBooking.id,
                        BookingStatus.IN_TRANSIT
                      )}
                      disabled={statusMutation.isPending}
                    >
                      {statusMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Start Transit
                    </Button>
                  )}

                  {currentBooking.status === BookingStatus.IN_TRANSIT && (
                    <Button
                      variant="default"
                      onClick={() => handleStatusUpdate(
                        currentBooking.id,
                        BookingStatus.COMPLETED
                      )}
                      disabled={statusMutation.isPending}
                    >
                      {statusMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Complete Delivery
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                {justCompleted ? (
                  <p className="text-green-600 font-medium">
                    Delivery completed successfully! Waiting for new bookings...
                  </p>
                ) : (
                  <p className="text-muted-foreground">No active bookings found</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case BookingStatus.PENDING:
      return "text-yellow-600";
    case BookingStatus.ACCEPTED:
      return "text-blue-600";
    case BookingStatus.IN_TRANSIT:
      return "text-purple-600";
    case BookingStatus.COMPLETED:
      return "text-green-600";
    case BookingStatus.REJECTED:
      return "text-red-600";
    default:
      return "text-gray-600";
  }
};