import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AnalysisPage } from "./routes/analysis/AnalysisPage";
import { DashboardPage } from "./routes/dashboard/DashboardPage";
import { LearnPage } from "./routes/learn/LearnPage";
import { MasterDetailPage } from "./routes/masters/MasterDetailPage";
import { MastersPage } from "./routes/masters/MastersPage";
import { AdminPage } from "./routes/admin/AdminPage";
import { KitchenSinkPage } from "./routes/kitchen-sink/KitchenSinkPage";
import { MyPage } from "./routes/mypage/MyPage";
import { PortfolioPage } from "./routes/portfolio/PortfolioPage";
import { ReportDetailPage } from "./routes/reports/ReportDetailPage";
import { ReportsPage } from "./routes/reports/ReportsPage";
import { StockDetailPage } from "./routes/stocks/StockDetailPage";
import { StocksPage } from "./routes/stocks/StocksPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/auth/callback" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stocks" element={<StocksPage />} />
        <Route path="/stocks/:symbol" element={<StockDetailPage />} />
        <Route
          path="/portfolio"
          element={
            <ProtectedRoute>
              <PortfolioPage />
            </ProtectedRoute>
          }
        />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/masters" element={<MastersPage />} />
        <Route path="/masters/:id" element={<MasterDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route
          path="/mypage"
          element={
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="/_kitchen-sink" element={<KitchenSinkPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
