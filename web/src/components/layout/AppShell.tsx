import type { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import styles from "./AppShell.module.css";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <Sidebar />
      <div className={styles.workspace}>
        <TopBar />
        <main id="main-content" className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
