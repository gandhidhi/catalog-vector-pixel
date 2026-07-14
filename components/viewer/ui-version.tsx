"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type UIVersion = "a" | "b" | "classic";

export interface UIVersionOption {
  id: UIVersion;
  label: string;
  available: boolean;
}

export const UI_VERSIONS: UIVersionOption[] = [
  { id: "a", label: "A", available: true },
  { id: "b", label: "B", available: false },
  { id: "classic", label: "旧", available: true },
];

const STORAGE_KEY = "viewer-ui-version";
const DEFAULT_VERSION: UIVersion = "a";

interface UIVersionContextValue {
  version: UIVersion;
  setVersion: (version: UIVersion) => void;
}

const UIVersionContext = createContext<UIVersionContextValue>({
  version: DEFAULT_VERSION,
  setVersion: () => {},
});

function isAvailableVersion(value: string): value is UIVersion {
  return UI_VERSIONS.some((v) => v.id === value && v.available);
}

export function UIVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersionState] = useState<UIVersion>(DEFAULT_VERSION);

  // localStorage はクライアントでのみ参照可能（SSR時はデフォルトを描画）
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isAvailableVersion(stored)) {
        setVersionState(stored);
      }
    } catch {
      // localStorage が使えない環境ではデフォルトのまま
    }
  }, []);

  function setVersion(next: UIVersion) {
    setVersionState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 保存失敗時もセッション内の切り替えは有効
    }
  }

  return (
    <UIVersionContext.Provider value={{ version, setVersion }}>
      {children}
    </UIVersionContext.Provider>
  );
}

export function useUIVersion() {
  return useContext(UIVersionContext);
}
