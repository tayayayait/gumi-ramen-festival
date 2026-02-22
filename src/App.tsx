import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ClientLayout from "./layouts/ClientLayout";
import HomePage from "./pages/client/HomePage";
import CommunityPage from "./pages/client/CommunityPage";
import NotFound from "./pages/NotFound";

import PickupPage from "./pages/client/PickupPage";
import OrderStatusPage from "./pages/client/OrderStatusPage";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminInventoryPage from "./pages/admin/AdminInventoryPage";
import AdminRecipeConfigPage from "./pages/admin/AdminRecipeConfigPage";
import AdminQRScannerPage from "./pages/admin/AdminQRScannerPage";
import AdminPickupConfigPage from "./pages/admin/AdminPickupConfigPage";
import LoginPage from "./pages/client/LoginPage";
import MyPage from "./pages/client/MyPage";
import OrderHistoryPage from "./pages/client/OrderHistoryPage";
import NotificationsPage from "./pages/client/NotificationsPage";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Auth Route */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/login" element={<LoginPage />} />

              {/* Client (B2C) Routes */}
              <Route path="/" element={<ClientLayout />}>
                <Route index element={<HomePage />} />
                <Route path="pickup" element={<PickupPage />} />
                <Route path="pickup/order/:orderId" element={<OrderStatusPage />} />
                <Route path="community" element={<CommunityPage />} />
                <Route path="mypage" element={<MyPage />} />
                <Route path="mypage/orders" element={<OrderHistoryPage />} />
                <Route path="mypage/notifications" element={<NotificationsPage />} />
              </Route>

              {/* Admin (B2B) Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="scanner" element={<AdminQRScannerPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="inventory" element={<AdminInventoryPage />} />
                <Route path="recipe-config" element={<AdminRecipeConfigPage />} />
                <Route path="pickup-config" element={<AdminPickupConfigPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AdminAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
