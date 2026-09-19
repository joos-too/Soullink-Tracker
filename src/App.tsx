import React, { lazy, Suspense, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import LoginPage from "@/src/components/pages/LoginPage";
import RegisterPage from "@/src/components/pages/RegisterPage";
import { AppSessionProvider, useAppSession } from "@/src/app/AppSession";
import LoadingScreen from "@/src/app/LoadingScreen";
import { getInitialActiveTrackerId } from "@/src/app/trackerStorage";

const HomeRoute = lazy(() => import("@/src/app/HomeRoute"));
const TrackerRoute = lazy(() => import("@/src/app/TrackerRoute"));
const AccountRoute = lazy(() => import("@/src/app/AccountRoute"));
const RulesetsRoute = lazy(() => import("@/src/app/RulesetsRoute"));
const PasswordResetPage = lazy(
  () => import("@/src/components/pages/PasswordResetPage"),
);

function RequireUser({ children }: { children: React.ReactNode }) {
  const { user } = useAppSession();
  const [authScreen, setAuthScreen] = useState<"login" | "register">("login");
  if (user) return children;
  return authScreen === "login" ? (
    <LoginPage onSwitchToRegister={() => setAuthScreen("register")} />
  ) : (
    <RegisterPage onSwitchToLogin={() => setAuthScreen("login")} />
  );
}

function LastTrackerRoute() {
  const { user, userTrackerIds, userTrackersLoading } = useAppSession();
  const stored = getInitialActiveTrackerId();
  if (userTrackersLoading) return <LoadingScreen />;
  const target =
    user && stored && userTrackerIds.includes(stored)
      ? `/tracker/${stored}`
      : "/";
  return <Navigate to={target} replace />;
}

function PasswordResetRoute() {
  const [searchParams] = useSearchParams();
  return <PasswordResetPage oobCode={searchParams.get("oobCode")} />;
}

function AppRoutes() {
  const { authLoading } = useAppSession();
  const { pathname } = useLocation();
  if (authLoading && pathname !== "/reset") return <LoadingScreen />;
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route
          path="/"
          element={
            <RequireUser>
              <HomeRoute />
            </RequireUser>
          }
        />
        <Route path="/tracker/:trackerId" element={<TrackerRoute />} />
        <Route path="/tracker" element={<LastTrackerRoute />} />
        <Route
          path="/account"
          element={
            <RequireUser>
              <AccountRoute />
            </RequireUser>
          }
        />
        <Route
          path="/rulesets"
          element={
            <RequireUser>
              <RulesetsRoute />
            </RequireUser>
          }
        />
        <Route path="/reset" element={<PasswordResetRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AppSessionProvider>
      <AppRoutes />
    </AppSessionProvider>
  );
}
