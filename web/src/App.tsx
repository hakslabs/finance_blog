import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AnalysisPage } from "./routes/analysis/AnalysisPage";
import { DashboardPage } from "./routes/dashboard/DashboardPage";
import { LearnPage } from "./routes/learn/LearnPage";
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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stocks" element={<StocksPage />} />
        <Route path="/stocks/:symbol" element={<StockDetailPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/masters" element={<MastersPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/_kitchen-sink" element={<KitchenSinkPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
