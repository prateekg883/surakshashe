import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Admin from "@/pages/Admin";
import EmergencyView from "@/pages/EmergencyView";
import ForgotPassword from "@/pages/ForgotPassword";
import Home from "@/pages/Home";
import Landing from "@/pages/Landing";
import ResetPassword from "@/pages/ResetPassword";
import AuthCallback from "@/pages/AuthCallback";
import TrustPage from "@/pages/TrustPages";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/welcome" component={Landing} />
      <Route path="/privacy" component={TrustPage} />
      <Route path="/terms" component={TrustPage} />
      <Route path="/disclaimer" component={TrustPage} />
      <Route path="/support" component={TrustPage} />
      <Route path="/admin" component={Admin} />
      <Route path="/emergency/:token" component={EmergencyView} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
