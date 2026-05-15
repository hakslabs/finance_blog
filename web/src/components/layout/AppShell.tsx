import { useState, type PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import styles from "./AppShell.module.css";

const SIDEBAR_STORAGE_KEY = "finance-lab-sidebar-collapsed";

export function AppShell({ children }: PropsWithChildren) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className={sidebarCollapsed ? styles.shellCollapsed : styles.shell}>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />
      <div className={styles.workspace}>
        <TopBar />
        <main id="main-content" className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
