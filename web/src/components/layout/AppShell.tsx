import type { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <Sidebar />
      <div className="app-shell__workspace">
        <TopBar />
        <main id="main-content" className="app-shell__main">
          {children}
        </main>
      </div>
    </div>
  );
}
