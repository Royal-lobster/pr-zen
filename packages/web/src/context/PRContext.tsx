import { createContext, useContext, type ReactNode } from "react";
import { usePR, type PRState } from "../hooks/usePR";

const PRContext = createContext<PRState | null>(null);

export function PRProvider({ children }: { children: ReactNode }) {
  const state = usePR();
  return <PRContext.Provider value={state}>{children}</PRContext.Provider>;
}

export function usePRContext(): PRState {
  const ctx = useContext(PRContext);
  if (!ctx) throw new Error("usePRContext must be used within PRProvider");
  return ctx;
}
