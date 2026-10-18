# Datenschutzerklärung: Recherche und offene Betriebsangaben

Stand: 18. Oktober 2026. Der deutsche Entwurf wird unter `/privacypolicy` angezeigt,
auch bei englischer Oberflächensprache. Textquelle: `src/locales/privacyPolicy.de.ts`.

## Zugrunde gelegter Betrieb

- Laut Betreiber laufen Frontend, Datenbank und Authentifizierung auf dem eigenen
  Hetzner-Server. Der Entwurf setzt für System-E-Mails einen selbst gehosteten
  SMTP-Server voraus.
- Die Projektanleitung aktiviert Supabase Logs & Analytics mit einem separaten
  Compose-Override. Die offizielle Konfiguration verwendet Vector zur Sammlung
  von Container-Protokollen und Logflare mit einem eigenen PostgreSQL-Backend.
  Eine Auslagerung zu BigQuery ist eine gesonderte, hier nicht unterstellte Option.
- Die Standard-Vector-Konfiguration erfasst unter anderem Anfragezeitpunkte,
  Pfade, Methoden, Antwortstatus, User-Agent, Referrer und Verbindungsadressen.
  Authentifizierungsprotokolle übernehmen dienstabhängige strukturierte Felder.
- Konkrete Löschfristen des Produktionsservers wurden nicht geprüft. Cloud-Tarife
  und deren Log-Aufbewahrungsfristen gelten nicht automatisch für Selbsthosting.
  Der Compose-Override legt keine einheitliche Aufbewahrungsfrist für sämtliche
  Protokolle fest. Deshalb verspricht der Entwurf weder sieben Tage noch eine
  andere unbestätigte automatische Löschung.
- Verwaltete Supabase-Cloud-Backups und PITR sind keine automatisch mitgelieferte
  Leistung des selbst gehosteten Stacks. Der Betreiber kennt bisher kein zusätzlich
  eingerichtetes regelmäßiges Backup-Verfahren. Das beweist nicht die Abwesenheit
  manueller Exporte, Migrationssicherungen oder Hetzner-Snapshots.

## Vor einer abschließenden Veröffentlichung bestätigen

1. Serverstandort und abgeschlossenen Hetzner-AVV prüfen.
2. Versionen und konkrete Retention/Löschmechanismen von Logflare, PostgreSQL/Auth,
   Docker, Reverse Proxy/Webserver und SMTP prüfen; Fristen festlegen und technisch
   durchsetzen. Auth-Auditdaten und Docker-Logs sind nicht mit dem Bild-Cache oder
   einem einzigen Logflare-Speicher gleichzusetzen.
3. Bestehende Backups, Snapshots und frühere Migrationskopien inventarisieren und
   gegebenenfalls deren Löschfristen ergänzen.
4. Eigenen SMTP-Betrieb bestätigen. Die öffentliche Kontaktadresse ist weiterhin
   eine Gmail-Adresse; deren Verarbeitung ist vom eigenen Systemmail-Versand
   getrennt zu bewerten und bei Beibehaltung zu konkretisieren.
5. GitHubs tatsächlich anwendbare Drittland-Transfergrundlage prüfen. Die
   Einwilligung in externe Bilder ersetzt diese Prüfung nicht.
6. Nachweis der Einwilligungen und die Erforderlichkeit der jeweiligen dauerhaften
   lokalen Einstellungen prüfen. `allow_image_loading` speichert derzeit nur die
   Entscheidung; Zeitpunkt und Textversion werden darüber nicht protokolliert.

Der Entwurf dokumentiert diese Unsicherheiten sichtbar. Er ändert keine
Server-Konfiguration, Log-Aufbewahrung, Backup-Verfahren oder Einwilligungsdaten.

## Primärquellen

- [Supabase: Selbsthosting, Unterschiede zur Cloud, Verantwortung für Backups](https://supabase.com/docs/guides/self-hosting)
- [Offizieller Logs-Compose-Override: Logflare und PostgreSQL-Backend](https://github.com/supabase/supabase/blob/master/docker/docker-compose.logs.yml)
- [Offizielle Vector-Konfiguration: Protokollquellen und Felder](https://github.com/supabase/supabase/blob/master/docker/volumes/logs/vector.yml)
- [Supabase: Analytics-Konfiguration](https://supabase.com/docs/guides/self-hosting/analytics/config)
- [GitHub: Datenkategorien und internationale Übermittlungen](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
- [Hetzner: Impressum](https://www.hetzner.com/de/legal/legal-notice/)
- [Hetzner: Datenschutz und Auftragsverarbeitung](https://docs.hetzner.com/de/general/company-and-policy/data-protection-at-hetzner/)
- [DSGVO, insbesondere Art. 6, 7, 13, 15–22, 28 und 44 ff.](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=de)
- [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html)

Die recherchierten Upstream-Konfigurationen beschreiben Standards, nicht den
ausgelesenen Istzustand des Produktionsservers.
