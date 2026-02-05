"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export interface LiveKitCredentials {
  url: string; // e.g., wss://your-server.livekit.cloud
  apiKey: string;
  apiSecret: string;
}

interface CredentialsContextValue {
  credentials: LiveKitCredentials | null;
  isLoading: boolean;
  setCredentials: (credentials: LiveKitCredentials) => void;
  clearCredentials: () => void;
}

const STORAGE_KEY = "livekit-credentials";

const CredentialsContext = createContext<CredentialsContextValue | null>(null);

export function CredentialsProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentialsState] = useState<LiveKitCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load credentials from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LiveKitCredentials;
        // Validate the stored data has required fields
        if (parsed.url && parsed.apiKey && parsed.apiSecret) {
          setCredentialsState(parsed);
        }
      }
    } catch (error) {
      console.error("Error loading credentials from sessionStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setCredentials = useCallback((newCredentials: LiveKitCredentials) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newCredentials));
      setCredentialsState(newCredentials);
    } catch (error) {
      console.error("Error saving credentials to sessionStorage:", error);
    }
  }, []);

  const clearCredentials = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      setCredentialsState(null);
    } catch (error) {
      console.error("Error clearing credentials from sessionStorage:", error);
    }
  }, []);

  return (
    <CredentialsContext.Provider
      value={{
        credentials,
        isLoading,
        setCredentials,
        clearCredentials,
      }}
    >
      {children}
    </CredentialsContext.Provider>
  );
}

export function useCredentials() {
  const context = useContext(CredentialsContext);
  if (!context) {
    throw new Error("useCredentials must be used within a CredentialsProvider");
  }
  return context;
}
