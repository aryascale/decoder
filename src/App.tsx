import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { initFrontendLogger } from "./lib/frontend-logger";
import { ErrorBoundary } from "./components/ErrorBoundary";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import UserEventPage from "./pages/UserEventPage";
import HomePage from "./pages/HomePage";
import CreateEventPage from "./pages/CreateEventPage";
import EventPage from "./pages/EventPage";
import SupportTicketPage from "./pages/SupportTicketPage";
import CheckTicketPage from "./pages/CheckTicketPage";
import RpcPage from "./pages/RpcPage";

import CheckpointLayout from "./components/checkpoint/CheckpointLayout";
import CheckpointDashboard from "./pages/checkpoint/CheckpointDashboard";

import AdminLayout from "./components/admin/AdminLayout";
import {
  OverviewPageWrapper,
  EventsPageWrapper,
  BannersPageWrapper
} from "./components/admin/wrappers";
import PaymentsPage from "./components/admin/pages/PaymentsPage";
import ActivityLogsPage from "./components/admin/pages/ActivityLogsPage";
import TicketsPage from "./components/admin/pages/TicketsPage";
import { EventProvider } from "./contexts/EventContext";
import SplashScreen from "./components/SplashScreen";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import VerifyPage from "./pages/VerifyPage";

export default function App() {
  useEffect(() => {
    initFrontendLogger();
  }, []);

  return (
    <ErrorBoundary>
      <EventProvider>
      {/* <SplashScreen /> */}
      <Routes>
        {/* <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} /> */}
        <Route path="/verify/:id" element={<VerifyPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/leaderboard" element={<UserEventPage />} />
        <Route path="/event" element={<UserEventPage />} />
        <Route path="/bantuan" element={<SupportTicketPage />} />
        <Route path="/cek-tiket" element={<CheckTicketPage />} />

        <Route path="/admin/home" element={<HomePage />} />
        <Route path="/admin/create-event" element={<CreateEventPage />} />
        <Route path="/event/:slug" element={<EventPage />} />
        <Route path="/rpc/:slug" element={<RpcPage />} />

        {/* New Admin Routes with Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="events" replace />} />
          <Route path="overview" element={<OverviewPageWrapper />} />
          <Route path="events" element={<EventsPageWrapper />} />
          <Route path="banners" element={<BannersPageWrapper />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="activity-logs" element={<ActivityLogsPage />} />
        </Route>

        {/* Checkpoint Routes */}
        <Route path="/manualtiming" element={<CheckpointLayout />}>
          <Route index element={<CheckpointDashboard />} />
        </Route>
      </Routes>
    </EventProvider>
    </ErrorBoundary>
  );
}
