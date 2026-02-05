"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// Client-side credentials only contains URL (secrets stay server-side)
export interface ClientCredentials {
  url: string;
}

// Full credentials for form submission (sent to server, not stored client-side)
export interface LiveKitCredentials {
  url: string;
  apiKey: string;
  apiSecret: string;
}

interface CredentialsContextValue {
  credentials: ClientCredentials | null;
  isLoading: boolean;
  setCredentials: (credentials: LiveKitCredentials) => Promise<void>;
  clearCredentials: () => Promise<void>;
}

const CredentialsContext = createContext<CredentialsContextValue | null>(null);

export function CredentialsProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentialsState] = useState<ClientCredentials | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Check session status on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/credentials");
        const data = await response.json();

        if (data.connected && data.url) {
          setCredentialsState({ url: data.url });
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkSession();
  }, []);

  const setCredentials = useCallback(
    async (newCredentials: LiveKitCredentials) => {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCredentials),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set credentials");
      }

      const data = await response.json();
      setCredentialsState({ url: data.url });
    },
    [],
  );

  const clearCredentials = useCallback(async () => {
    try {
      await fetch("/api/credentials", { method: "DELETE" });
      setCredentialsState(null);
    } catch (error) {
      console.error("Error clearing credentials:", error);
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
