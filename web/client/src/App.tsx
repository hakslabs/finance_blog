import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { WatchlistProvider } from "./contexts/WatchlistContext";
import { BookmarkProvider } from "./contexts/BookmarkContext";
import { FollowProvider } from "./contexts/FollowContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Analysis from "./pages/Analysis";
import Stocks from "./pages/Stocks";
import StockDetail from "./pages/StockDetail";
import Masters from "./pages/Masters";
import MasterDetail from "./pages/MasterDetail";
import Reports from "./pages/Reports";
import Learn from "./pages/Learn";
import LearnDetail from "./pages/LearnDetail";
import MyPage from "./pages/MyPage";
import Admin from "./pages/Admin";
import News from "./pages/News";
import CalendarPage from "./pages/Calendar";
import NotFound from "./pages/NotFound";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location]);
  return null;
}

function Router() {
  return (
    <Layout>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/analysis" component={Analysis} />
        <Route path="/news" component={News} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/masters" component={Masters} />
        <Route path="/masters/:id" component={MasterDetail} />
        <Route path="/stocks" component={Stocks} />
        <Route path="/stocks/:ticker" component={StockDetail} />
        <Route path="/reports" component={Reports} />
        <Route path="/learn" component={Learn} />
        <Route path="/learn/:id" component={LearnDetail} />
        <Route path="/mypage" component={MyPage} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

/**
 * Use hash-based routing when the app is built as a single self-contained HTML
 * (e.g. for Cowork artifact preview). Toggle via Vite env flag SINGLEFILE.
 */
const USE_HASH_ROUTING = import.meta.env.VITE_SINGLEFILE === "1";

export default function App() {
  const tree = (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <AuthProvider>
          <WatchlistProvider>
            <BookmarkProvider>
              <FollowProvider>
                <TooltipProvider>
                  <Toaster />
                  <Router />
                </TooltipProvider>
              </FollowProvider>
            </BookmarkProvider>
          </WatchlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
  if (USE_HASH_ROUTING) {
    return <WouterRouter hook={useHashLocation}>{tree}</WouterRouter>;
  }
  return tree;
}
