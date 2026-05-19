import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { WatchlistProvider } from "./contexts/WatchlistContext";
import { BookmarkProvider } from "./contexts/BookmarkContext";
import { FollowProvider } from "./contexts/FollowContext";

// Route-level code splitting: each page becomes its own JS chunk so the first
// paint only ships the shell + Home's dependencies.
const Home = lazy(() => import("./pages/Home"));
const Analysis = lazy(() => import("./pages/Analysis"));
const News = lazy(() => import("./pages/News"));
const CalendarPage = lazy(() => import("./pages/Calendar"));
const Masters = lazy(() => import("./pages/Masters"));
const MasterDetail = lazy(() => import("./pages/MasterDetail"));
const Stocks = lazy(() => import("./pages/Stocks"));
const StockDetail = lazy(() => import("./pages/StockDetail"));
const Reports = lazy(() => import("./pages/Reports"));
const Learn = lazy(() => import("./pages/Learn"));
const LearnDetail = lazy(() => import("./pages/LearnDetail"));
const MyPage = lazy(() => import("./pages/MyPage"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      페이지를 불러오는 중…
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    </Layout>
  );
}

/**
 * Use hash-based routing when the app is built as a single self-contained HTML
 * (e.g. for Cowork artifact preview). Toggle via Vite env flag VITE_SINGLEFILE.
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
