import React, { useState } from "react";
import { requestPasswordReset, signIn } from "@/src/services/backend/auth.ts";
import {
  focusRingBlueClasses,
  focusRingClasses,
  focusRingInputClasses,
} from "@/src/styles/focusRing.ts";
import { useTranslation } from "react-i18next";
import PasswordInput from "@/src/components/auth/PasswordInput.tsx";

type LoginPageProps = {
  onSwitchToRegister: () => void;
};

const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const { t } = useTranslation();

  const handleAuthAction = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      console.error("Error signing in", err);
      setError(t("auth.login.error"));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const normalizedEmail = email.trim();
      await requestPasswordReset(normalizedEmail);
      setPasswordResetSent(true);
    } catch (err) {
      console.error("Error requesting password reset", err);
      setError(t("auth.login.passwordResetError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f0f0f0] dark:bg-gray-900 min-h-screen p-2 sm:p-4 md:p-8 text-gray-800 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-[6px_6px_0_0_rgba(31,41,55,0.25)] border border-gray-200 dark:border-gray-700 p-6 sm:p-8 rounded-lg">
          <header className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
            <img
              src="/Soullinktracker-Logo.png"
              alt="Soullink Tracker Logo"
              className="mx-auto mb-3 w-40 h-40 object-contain"
            />
            <h1 className="text-2xl sm:text-3xl font-bold font-press-start tracking-tighter dark:text-gray-100">
              {showForgotPassword
                ? t("auth.passwordReset.title")
                : t("auth.login.title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              {showForgotPassword ? (
                <span className="block">
                  {t("auth.login.passwordResetInstructions")}
                </span>
              ) : (
                <>
                  <span className="block">{t("auth.login.headline")}</span>
                  <span className="block mt-1">
                    {t("auth.login.fallback")}{" "}
                    <button
                      type="button"
                      onClick={onSwitchToRegister}
                      className={`font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline focus-visible:underline ${focusRingBlueClasses}`}
                    >
                      {t("auth.login.registerPrompt")}
                    </button>
                  </span>
                </>
              )}
            </p>
          </header>

          <form
            onSubmit={
              showForgotPassword ? handlePasswordReset : handleAuthAction
            }
            className="mt-6 space-y-4"
          >
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t("auth.login.emailLabel")}
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${focusRingInputClasses}`}
                placeholder={t("auth.login.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {!showForgotPassword && (
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {t("auth.login.passwordLabel")}
                </label>
                <PasswordInput
                  id="login-password"
                  autoComplete="current-password"
                  required
                  className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${focusRingInputClasses}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setPasswordResetSent(false);
                      setShowForgotPassword(true);
                    }}
                    className={`text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline focus-visible:underline dark:text-blue-400 ${focusRingBlueClasses}`}
                  >
                    {t("auth.login.forgotPassword")}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-500 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || passwordResetSent}
              aria-live="polite"
              className={`w-full bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors shadow-md disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:hover:bg-gray-300 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 dark:disabled:hover:bg-gray-700 ${focusRingClasses}`}
            >
              {passwordResetSent
                ? t("auth.login.passwordResetSent")
                : loading
                  ? `${t(showForgotPassword ? "auth.login.sendReset" : "auth.login.submit")}…`
                  : t(
                      showForgotPassword
                        ? "auth.login.sendReset"
                        : "auth.login.submit",
                    )}
            </button>
            {showForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPasswordResetSent(false);
                  setShowForgotPassword(false);
                }}
                className={`w-full text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline focus-visible:underline dark:text-blue-400 ${focusRingBlueClasses}`}
              >
                {t("auth.passwordReset.backToLogin")}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
