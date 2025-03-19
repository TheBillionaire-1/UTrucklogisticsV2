import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Truck } from "lucide-react";
import { Link, useLocation } from "wouter";

type NavBarProps = {
  currentPage?: "customer" | "driver";
};

export default function NavBar({ currentPage = "customer" }: NavBarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const isDriverPage = currentPage === "driver" || location.startsWith("/driver");
  const isDashboardVisible = location !== "/" && user;

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <Button
            variant="ghost"
            className="p-0"
            onClick={() => location !== "/" && window.location.replace("/")}
          >
            <Truck className="h-6 w-6" />
            <span className="ml-2">UTruck</span>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <>
              {isDashboardVisible && (
                <Link href={isDriverPage ? "/booking/details" : "/driver/bookings"}>
                  <Button variant="ghost">
                    {isDriverPage ? "Customer Dashboard" : "Driver Dashboard"}
                  </Button>
                </Link>
              )}
              {!isDriverPage && (
                <Link href="/booking">
                  <Button variant="ghost">Book Transport</Button>
                </Link>
              )}
              <Button
                variant="outline"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}