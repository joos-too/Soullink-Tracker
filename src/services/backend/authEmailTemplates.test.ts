import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("authentication email templates", () => {
  const confirmation = readProjectFile(
    "public/auth-email-templates/confirmation.html",
  );
  const recovery = readProjectFile("public/auth-email-templates/recovery.html");

  it.each([
    [confirmation, "Email-Adresse bestätigen", "Confirm your email address"],
    [recovery, "Passwort zurücksetzen", "Reset your password"],
  ])("contains German and English branches", (template, german, english) => {
    expect(template).toContain('{{ if eq .Data.language "de" }}');
    expect(template).toContain(german);
    expect(template).toContain(english);
    expect(template).toContain("{{ .ConfirmationURL }}");
  });

  it("keeps the signup token out of password recovery", () => {
    expect(confirmation).toContain("{{ .Token }}");
    expect(recovery).not.toContain("{{ .Token }}");
  });

  it.each([
    "supabase/config.toml",
    "supabase/docker-compose.auth-email-templates.yml",
  ])("localizes subjects in %s", (path) => {
    const configuration = readProjectFile(path);
    expect(configuration).toContain(
      '{{ if eq .Data.language "de" }}Bestätige deinen Soullink Tracker Account{{ else }}Confirm your Soullink Tracker account{{ end }}',
    );
    expect(configuration).toContain(
      '{{ if eq .Data.language "de" }}Setze dein Soullink Tracker Passwort zurück{{ else }}Reset your Soullink Tracker password{{ end }}',
    );
  });
});
