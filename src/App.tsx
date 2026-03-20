import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { lazy, Suspense } from "react";
import AuthPage from "@/pages/Auth"; // Keep auth non-lazy or lazy as needed, but usually kept static if it's the entry. Let's lazy load it.
import NotFound from "@/pages/NotFound";

const DashboardPage = lazy(() => import("@/pages/Dashboard"));
const InventoryPage = lazy(() => import("@/pages/Inventory"));
const TransactionsPage = lazy(() => import("@/pages/Transactions"));
const POSPage = lazy(() => import("@/pages/POS"));
const CalculatorPage = lazy(() => import("@/pages/Calculator"));
const StoreSettingsPage = lazy(() => import("@/pages/StoreSettings"));
const CategoriesPage = lazy(() => import("@/pages/Categories"));
const PublicStorePage = lazy(() => import("@/pages/PublicStore"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  
  return <AppLayout locationKey={location.pathname}>{children}</AppLayout>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando...</div>}>
            <Routes>
              <Route path="/s/:slug" element={<PublicStorePage />} />
              <Route path="/auth" element={<AuthRoute />} />
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
              <Route path="/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
              <Route path="/store-config" element={<ProtectedRoute><StoreSettingsPage /></ProtectedRoute>} />
              <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
              <Route path="/calculator" element={<ProtectedRoute><CalculatorPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
