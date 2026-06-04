import { Suspense, lazy, useEffect } from "react";
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
import { ROUTE_LOADERS } from "./lib/route-prefetch";

const Home = lazy(ROUTE_LOADERS.home);
const Terminal = lazy(ROUTE_LOADERS.terminal);
const Analysis = lazy(ROUTE_LOADERS.analysis);
const Stocks = lazy(ROUTE_LOADERS.stocks);
const StockDetail = lazy(ROUTE_LOADERS.stockDetail);
const Masters = lazy(ROUTE_LOADERS.masters);
const MasterDetail = lazy(ROUTE_LOADERS.masterDetail);
const Reports = lazy(ROUTE_LOADERS.reports);
const Learn = lazy(ROUTE_LOADERS.learn);
const LearnDetail = lazy(ROUTE_LOADERS.learnDetail);
const MyPage = lazy(ROUTE_LOADERS.mypage);
const Portfolio = lazy(ROUTE_LOADERS.portfolio);
const Admin = lazy(ROUTE_LOADERS.admin);
const News = lazy(ROUTE_LOADERS.news);
const CalendarPage = lazy(ROUTE_LOADERS.calendar);
const NotFound = lazy(ROUTE_LOADERS.notFound);

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location]);
  return null;
}

function PageFallback() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-44 animate-pulse rounded bg-muted/30" />
      <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/10" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/10" />
        <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/10" />
        <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/10" />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/terminal" component={Terminal} />
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
          <Route path="/portfolio" component={Portfolio} />
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
