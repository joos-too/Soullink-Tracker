// Import the functions you need from the SDKs you need
import { type FirebaseOptions, initializeApp } from "firebase/app";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { BACKEND } from "@/src/services/backend/backend.ts";

// Read Firebase config from Vite env
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as
  | string
  | undefined;
const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL as
  | string
  | undefined;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as
  | string
  | undefined;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as
  | string
  | undefined;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as
  | string
  | undefined;
const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR as
  | string
  | undefined;

// Emulator env toggles (optional). Vite injects import.meta.env.MODE and DEV.
const IS_FIREBASE_BACKEND = BACKEND === "firebase";
const USE_EMULATORS =
  IS_FIREBASE_BACKEND && useEmulator?.toLowerCase() === "true";
const EMULATOR_HOST = import.meta.env.VITE_FIREBASE_EMULATOR_HOST as
  | string
  | undefined;
const AUTH_EMULATOR_PORT = Number(
  import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT ?? 9099,
);
const DB_EMULATOR_PORT = Number(
  import.meta.env.VITE_FIREBASE_DB_EMULATOR_PORT ?? 9000,
);

// Validate required env vars for production only
if (
  IS_FIREBASE_BACKEND &&
  !USE_EMULATORS &&
  (!apiKey ||
    !authDomain ||
    !databaseURL ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId)
) {
  throw new Error(
    "Missing one or more required Firebase env vars for production. Please set VITE_FIREBASE_* in your .env file as described in README.md.",
  );
}

// Firebase configuration
// In emulator mode, Firebase Web SDK still requires a valid-looking config object.
const firebaseConfig: FirebaseOptions = USE_EMULATORS
  ? {
      apiKey: apiKey || "not-an-api-key",
      authDomain: EMULATOR_HOST,
      databaseURL: `http://${EMULATOR_HOST}:${DB_EMULATOR_PORT}/?ns=${projectId}`,
      projectId: projectId,
      storageBucket: storageBucket || "demo.app",
      messagingSenderId: messagingSenderId || "0",
      appId: appId || "demo:app",
    }
  : IS_FIREBASE_BACKEND
    ? {
        apiKey: apiKey!,
        authDomain: authDomain!,
        databaseURL: databaseURL!,
        projectId: projectId!,
        storageBucket: storageBucket!,
        messagingSenderId: messagingSenderId!,
        appId: appId!,
      }
    : {
        apiKey: "firebase-not-active",
        authDomain: "firebase-not-active.invalid",
        // Firebase validates this value during SDK initialization even when
        // Supabase is the selected backend.
        databaseURL: "https://firebase-not-active.firebaseio.com",
        projectId: "firebase-not-active",
        storageBucket: "firebase-not-active.invalid",
        messagingSenderId: "0",
        appId: "firebase-not-active",
      };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Connect to emulators when running locally (dev or explicit flag)
if (USE_EMULATORS) {
  try {
    connectDatabaseEmulator(db, EMULATOR_HOST, DB_EMULATOR_PORT);
  } catch {}
  try {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`);
  } catch {}
}

export { db, auth, USE_EMULATORS };
