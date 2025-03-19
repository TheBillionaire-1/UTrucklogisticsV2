import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import BookingPage from "@/pages/booking-page";
import BookingDetailsPage from "@/pages/booking-details";
import TrackingPage from "@/pages/tracking-page";
import DriverBookingManagement from "@/pages/driver/booking-management";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/booking" component={BookingPage} />
      <ProtectedRoute path="/booking/details" component={BookingDetailsPage} />
      <ProtectedRoute path="/tracking" component={TrackingPage} />
      <ProtectedRoute path="/driver/bookings" component={DriverBookingManagement} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;