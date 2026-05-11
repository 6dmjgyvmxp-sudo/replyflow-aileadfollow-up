import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b bg-card/50 backdrop-blur px-4 sticky top-0 z-10">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
            <Outlet />
          </main>
          <footer className="border-t py-4 px-4 text-center text-xs text-muted-foreground">
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
              <Link to="/refund" className="hover:text-foreground">Refund Policy</Link>
            </div>
            <div className="mt-2">© 2026 ReplyFlow. All rights reserved.</div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}