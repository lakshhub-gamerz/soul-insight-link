import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import QueryNetEnhanced from "./pages/QueryNetEnhanced";
import LifeSyncEnhanced from "./pages/LifeSyncEnhanced";
import Astra from "./pages/Astra";
import Projects from "./pages/Projects";
import AiChat from "./pages/AiChat";
import Workspace from "./pages/Workspace";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Help from "./pages/Help";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import StarfieldBackground from "./components/StarfieldBackground";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <StarfieldBackground />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/querynet" element={
            <ProtectedRoute>
              <AppLayout>
                <QueryNetEnhanced />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/lifesync" element={
            <ProtectedRoute>
              <AppLayout>
                <LifeSyncEnhanced />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/astra" element={
            <ProtectedRoute>
              <AppLayout>
                <Astra />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/projects" element={
            <ProtectedRoute>
              <AppLayout>
                <Projects />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/ai-chat" element={
            <ProtectedRoute>
              <AppLayout>
                <AiChat />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/workspace" element={
            <ProtectedRoute>
              <AppLayout>
                <Workspace />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <AppLayout>
                <History />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <AppLayout>
                <Settings />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <AppLayout>
                <Profile />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/help" element={
            <ProtectedRoute>
              <AppLayout>
                <Help />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
