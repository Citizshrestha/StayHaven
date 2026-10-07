import { useEffect } from "react";
import { refreshSession } from "../../../../core/api/client";

/**
 * Keeps the live connection working across access-token expiry.
 *
 * SocketContext builds the handshake `auth` once, with the access token that existed at
 * login. The server closes the socket when that token expires ("io server disconnect",
 * which socket.io does NOT retry on its own), and every later attempt would present the
 * same expired token. The result was a dashboard that stopped receiving orders and waiter
 * calls after one token lifetime (1 hour by default).
 *
 * This hook (1) hands socket.io a function so each (re)connect reads the current token,
 * refreshing it first when it is about to expire, and (2) reconnects after a server-side
 * disconnect. Remove it once SocketContext does the same (REQ-waiter-16).
 */
const TOKEN_KEY = "staffAccessToken";
const REFRESH_MARGIN_MS = 30 * 1000;

const expiryOf = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const currentToken = async () => {
  const stored = sessionStorage.getItem(TOKEN_KEY);
  const exp = stored ? expiryOf(stored) : null;
  if (stored && exp && exp - Date.now() > REFRESH_MARGIN_MS) return stored;
  try {
    return await refreshSession("staff");
  } catch {
    return sessionStorage.getItem(TOKEN_KEY) || stored || undefined;
  }
};

export default function useSocketTokenKeepAlive(socket) {
  useEffect(() => {
    if (!socket) return undefined;

    const base = socket.auth && typeof socket.auth === "object" ? { ...socket.auth } : {};
    socket.auth = (cb) => {
      currentToken().then((token) => cb({ ...base, token }));
    };

    let timer;
    const onDisconnect = (reason) => {
      // The server ended the session (token expiry): socket.io will not retry by itself.
      if (reason === "io server disconnect") {
        clearTimeout(timer);
        timer = setTimeout(() => socket.connect(), 500);
      }
    };
    socket.on("disconnect", onDisconnect);

    return () => {
      clearTimeout(timer);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);
}
