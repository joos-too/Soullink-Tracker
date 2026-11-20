# Datenschutzerklärung: Recherche und offene Betriebsangaben

Stand: 18. Oktober 2026. Der deutsche Entwurf wird unter `/privacypolicy` angezeigt,
auch bei englischer Oberflächensprache. Textquelle: `src/locales/privacyPolicy.de.ts`.

## Zugrunde gelegter Betrieb

- Laut Betreiber laufen Frontend, Datenbank und Authentifizierung auf dem eigenen
  Hetzner-Server mit Standort in Deutschland. Ein Auftragsverarbeitungsvertrag
  mit Hetzner ist abgeschlossen. Diese Angaben wurden am 18. Oktober 2026 bestätigt.
- Für System-E-Mails wird laut Betreiber der SMTP-Dienst von Hetzner verwendet.
  Die frühere Annahme eines selbst betriebenen SMTP-Servers entfällt. Der genaue
  SMTP-Tarif, dessen Verarbeitungsstandorte und Löschfristen sind damit noch nicht
  bestätigt; der Standort des App-Servers belegt diese Angaben nicht.
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

1. Konkreten Hetzner-SMTP-Dienst und dessen Verarbeitungsstandorte sowie die
   Abdeckung der genutzten Leistungen durch den abgeschlossenen AVV prüfen.
2. Versionen und konkrete Retention/Löschmechanismen von Logflare, PostgreSQL/Auth,
   Docker, Reverse Proxy/Webserver und SMTP prüfen; Fristen festlegen und technisch
   durchsetzen. Auth-Auditdaten und Docker-Logs sind nicht mit dem Bild-Cache oder
   einem einzigen Logflare-Speicher gleichzusetzen.
3. Bestehende Backups, Snapshots und frühere Migrationskopien inventarisieren und
   gegebenenfalls deren Löschfristen ergänzen.
4. Die öffentliche Kontaktadresse ist weiterhin eine Gmail-Adresse; deren
   Verarbeitung ist vom Systemmail-Versand über Hetzner
   getrennt zu bewerten und bei Beibehaltung zu konkretisieren.
5. Die Erforderlichkeit der jeweiligen dauerhaften lokalen Einstellungen prüfen.
   Für die zeitliche Nachvollziehbarkeit der Bildentscheidung die tatsächlichen
   Deployment- und Rollback-Zeitpunkte mit dem ausgelieferten Commit dokumentieren
   und ältere Texte und Dialogabläufe erhalten (siehe unten).

Der Entwurf dokumentiert diese Unsicherheiten sichtbar. Er ändert keine
Server-Konfiguration, Log-Aufbewahrung, Backup-Verfahren oder Einwilligungsdaten.

## GitHub-Bildabrufe: DPF-Prüfung vom 18. Oktober 2026

- Das offizielle DPF-Register führt GitHub (Teilnehmer 6174) als aktiv für das
  EU–US DPF und Non-HR Data. Als nächsten Rezertifizierungstermin nennt es den 3. August 2027; das ist kein pauschales Ablaufdatum des Datenschutzes.
- Der Eintrag nennt ausdrücklich Website-Besucher sowie Geräteinformationen
  einschließlich IP-Adressen und verweist auf GitHubs allgemeine
  Datenschutzerklärung. Die Teilnahme ist damit nicht auf Mitarbeiterdaten oder
  zahlende Enterprise-Kunden beschränkt.
- GitHubs Datenschutzerklärung nennt die DPF-Teilnahme und die Verarbeitung von
  IP-Adressen und Anfragedaten. Die Europäische Kommission führt die USA für am
  DPF teilnehmende Unternehmen weiterhin unter den Angemessenheitsbeschlüssen.
- Einordnung für diese App: Die Verbindungsdaten beim öffentlichen Abruf von
  PokeAPI-Sprites über `raw.githubusercontent.com` lassen sich dem beschriebenen
  Besucher- und Dienstdatenumfang zuordnen. Das ist eine Schlussfolgerung aus
  Registerumfang und Datenschutzhinweisen; eine gesonderte Bestätigung speziell
  dieser Domain wurde nicht gefunden. Der Entwurf benennt für Übermittlungen an
  GitHub, Inc. in den USA daher Art. 45 DSGVO und das EU–US DPF.
- Der bisherige pauschale Recherchepunkt zur GitHub-Transfergrundlage ist damit
  bearbeitet. Die Einwilligung zur Bildanzeige bleibt eigenständig erforderlich.
  Bei Konten wird die letzte Entscheidung wie unten beschrieben mit einem
  Zeitpunkt gespeichert, bei Gästen nur für die Tab-Sitzung ohne Zeitstempel.
  DPF-Status, Beschluss und Anbieterangaben sind bei späteren
  Überarbeitungen erneut zu prüfen.

## Bildentscheidung mit Zeitstempel

- Bei Konten speichert `profiles.allow_image_loading` die letzte Entscheidung.
  `image_consent_updated_at` enthält den Zeitpunkt der letzten ausdrücklichen
  Auswahl, einschließlich Ablehnung und Widerruf. Ein Datenbank-Trigger setzt
  beide Angaben im selben Schreibvorgang; der Browser darf den Zeitpunkt nicht
  vorgeben. Andere Profiländerungen und erneutes Einlesen verändern ihn nicht.
- Bei Gästen enthält `sessionStorage` unter `soullink:allowImageLoading` nur die
  Entscheidung als `"true"` oder `"false"` für die Tab-Sitzung, ohne Zeitstempel.
  Es erfolgt keine Übermittlung dieser Gastentscheidung an die Datenbank. Bei gesperrtem
  Browserspeicher bleibt die Entscheidung nur im Arbeitsspeicher.
- Eine neue ausdrückliche Auswahl ersetzt die vorherige Entscheidung und bei
  Konten deren Zeitpunkt. Es werden weder eine Entscheidungshistorie noch eine Textversion,
  Gastkennung, zusätzliche IP-Adresse oder eine neue Aufbewahrungsfrist erfasst.
  Vorhandene lokale Entscheidungen ohne Zeitpunkt erhalten keinen erfundenen
  Zeitstempel. Laut Betreiber war der bisherige Einwilligungsablauf noch nicht live.
- Texte und Dialogabläufe beider Sprachen bleiben über die Git-Historie erhalten.
  Für die betriebliche Dokumentation sind erfolgreiche Deployments und Rollbacks
  je Umgebung mit tatsächlichem Zeitpunkt und Commit zu archivieren. Ein Commit-
  oder Build-Zeitpunkt allein belegt nicht den Zeitpunkt der Veröffentlichung.
  Dies ist eine Betriebsaufgabe; die Zeitstempel-Migration erzeugt kein
  Deployment-Archiv. Screenshots der Dialoge und Tests der Bildsperre ergänzen
  die Prozessdokumentation.
- Grenze der Zuordnung: Ein länger geöffneter Tab oder eine zwischengespeicherte
  Seite kann beim Klick noch ein älteres Release anzeigen. Auch die gewählte
  Sprache lässt sich aus dem Zeitstempel allein nicht ermitteln. Der Zeitstempel
  und die Release-Dokumentation ermöglichen eine zeitliche Einordnung, garantieren
  aber keine eindeutige Rekonstruktion des tatsächlich angezeigten Texts.
- Die DSK beschreibt in ihrer Orientierungshilfe Digitale Dienste, Randnummern
  84–85, einen Nachweis über dokumentierte Prozesse und gespeicherte Entscheidungen.
  Die Dokumentation umfasst auch frühere Texte, Konfigurationen und technische
  Abläufe. Ein zusätzliches personenbezogenes Ereignisprotokoll wird mit dieser
  Umsetzung nicht eingeführt.

## Primärquellen

- [Supabase: Selbsthosting, Unterschiede zur Cloud, Verantwortung für Backups](https://supabase.com/docs/guides/self-hosting)
- [Offizieller Logs-Compose-Override: Logflare und PostgreSQL-Backend](https://github.com/supabase/supabase/blob/master/docker/docker-compose.logs.yml)
- [Offizielle Vector-Konfiguration: Protokollquellen und Felder](https://github.com/supabase/supabase/blob/master/docker/volumes/logs/vector.yml)
- [Supabase: Analytics-Konfiguration](https://supabase.com/docs/guides/self-hosting/analytics/config)
- [GitHub: Datenkategorien und internationale Übermittlungen](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
- [Offizielles DPF-Register: GitHub, Teilnehmer 6174](https://www.dataprivacyframework.gov/participant/6174)
- [Europäische Kommission: geltende Angemessenheitsbeschlüsse](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en)
- [Hetzner: Impressum](https://www.hetzner.com/de/legal/legal-notice/)
- [Hetzner: Datenschutz und Auftragsverarbeitung](https://docs.hetzner.com/de/general/company-and-policy/data-protection-at-hetzner/)
- [DSGVO, insbesondere Art. 6, 7, 13, 15–22, 28 und 44 ff.](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=de)
- [DSK: Orientierungshilfe Digitale Dienste, insbesondere Randnummern 84–85](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf)
- [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html)

Die recherchierten Upstream-Konfigurationen beschreiben Standards, nicht den
ausgelesenen Istzustand des Produktionsservers.
Die Hetzner-Dokumentation nennt für Webhosting und Managed Server eigene
Aufbewahrungsfristen. Diese werden ohne Bestätigung des eingesetzten SMTP-Produkts
nicht als Fristen für den konkreten Systemmail-Versand übernommen.
