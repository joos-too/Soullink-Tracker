import { useEffect, useState } from "react";
import {
  onCurrentAuthStateChange,
  type AuthenticatedUser,
} from "@/src/services/backend/auth.ts";

export interface AuthSessionState {
  user: AuthenticatedUser | null;
  loading: boolean;
}

export const useAuthSession = (): AuthSessionState => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onCurrentAuthStateChange((nextUser) => {
        setUser(nextUser);
        setLoading(false);
      }),
    [],
  );

  return { user, loading };
};
