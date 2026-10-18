interface PrivacyPolicySection {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
  links?: { label: string; href: string }[];
}

// Intentionally German only: this is an operator-reviewed legal draft, not a UI translation.
export const privacyPolicyDe = {
  title: "Datenschutzerklärung",
  updated: "Stand des Entwurfs: 18. Oktober 2026",
  draftTitle: "Entwurf – Betriebsangaben noch zu bestätigen",
  draftDescription:
    "Dieser Entwurf beschreibt den derzeit vorgesehenen Betrieb des Soullink Trackers. Die folgenden offenen Angaben müssen vor Verwendung als abschließende Datenschutzerklärung geprüft und ergänzt werden:",
  openPoints: [
    "Die tatsächlichen Aufbewahrungs- und Löschfristen für Webserver-, Docker-, Supabase-/Logflare-, Authentifizierungs- und SMTP-Protokolle prüfen und festlegen. Aus der Standardkonfiguration ergibt sich keine hier verifizierte einheitliche Frist.",
    "Prüfen, ob neben dem laufenden Datenbestand manuelle Sicherungen, Migrationskopien, Server-Snapshots oder Backups des Hosters bestehen. Der Entwurf geht bisher von keinem zusätzlich eingerichteten regelmäßigen Backup-Verfahren aus.",
    "Die konkreten Leistungs- und Verarbeitungsbedingungen des genutzten Hetzner-SMTP-Dienstes einschließlich Verarbeitungsstandorten und Löschfristen prüfen.",
    "Die Einbindung der Gmail-Kontaktadresse und mögliche Drittlandverarbeitungen bei Gmail und GitHub sowie die Nachweisbarkeit erteilter Einwilligungen prüfen.",
  ],
  sections: [
    {
      id: "verantwortlicher",
      title: "1. Verantwortlicher und Kontakt",
      paragraphs: [
        "Verantwortlich für die Verarbeitung personenbezogener Daten beim Betrieb des Soullink Trackers ist:",
        "Jan Erik Lieder\nc/o flexdienst – #22275\nKurt-Schumacher-Straße 74\n67663 Kaiserslautern\nDeutschland\nTelefon: +49 160 96770129\nE-Mail: jlzmk56@gmail.com",
        "Für Fragen zum Datenschutz und zur Ausübung Ihrer Rechte können Sie sich über diese Kontaktdaten an uns wenden.",
      ],
      links: [
        {
          label: "E-Mail an den Verantwortlichen",
          href: "mailto:jlzmk56@gmail.com",
        },
      ],
    },
    {
      id: "ueberblick",
      title: "2. Überblick und Rechtsgrundlagen",
      paragraphs: [
        "Der Soullink Tracker ist eine Webanwendung zur Verwaltung gemeinsamer Pokémon-Spielstände. Öffentliche Tracker können ohne Benutzerkonto angesehen werden. Für das Erstellen, Bearbeiten und gemeinsame Verwalten von Trackern ist eine Anmeldung erforderlich.",
        "Wir verarbeiten Daten zur Bereitstellung der von Ihnen gewünschten Konto- und Tracker-Funktionen auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Die Verarbeitung zur Sicherung des Betriebs, zur Fehlerbehebung und zur Abwehr von Missbrauch beruht auf Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse besteht in einem sicheren und funktionsfähigen Angebot.",
        "Soweit wir eine Einwilligung einholen, erfolgt die darauf beruhende Verarbeitung nach Art. 6 Abs. 1 lit. a DSGVO. Für das Speichern von Informationen auf Ihrem Endgerät oder den Zugriff darauf gilt zusätzlich § 25 TDDDG: Unbedingt erforderliche Vorgänge erfolgen nach § 25 Abs. 2 Nr. 2 TDDDG, einwilligungsbedürftige Vorgänge nach § 25 Abs. 1 TDDDG. Gesetzlich vorgeschriebene Verarbeitungen richten sich nach Art. 6 Abs. 1 lit. c DSGVO.",
      ],
    },
    {
      id: "hosting",
      title: "3. Hosting und selbst gehostete Dienste",
      paragraphs: [
        "Wir betreiben die Website, die Datenbank und die Authentifizierung auf einem eigenen Server mit Standort in Deutschland bei folgendem Hosting-Anbieter:",
        "Hetzner Online GmbH\nIndustriestr. 25\n91710 Gunzenhausen\nDeutschland",
        "Bei Hetzner werden die für den Betrieb erforderlichen Daten verarbeitet, insbesondere technische Verbindungsdaten sowie die auf dem Server gespeicherten Konto- und Tracker-Daten. Rechtsgrundlagen sind Art. 6 Abs. 1 lit. b DSGVO für die Bereitstellung der gewünschten Funktionen und Art. 6 Abs. 1 lit. f DSGVO für den sicheren und zuverlässigen Betrieb. Mit Hetzner haben wir einen Auftragsverarbeitungsvertrag nach Art. 28 DSGVO abgeschlossen.",
        "Für Datenbank, Anmeldung und Echtzeit-Synchronisierung verwenden wir selbst gehostete Supabase-Software. Allein durch diese Verwendung werden Konto- und Tracker-Daten nicht an einen von Supabase betriebenen Cloud-Dienst ausgelagert. Die technische Protokollauswertung mit Vector und Logflare wird ebenfalls selbst betrieben. Für den Versand von System-E-Mails nutzen wir den SMTP-Dienst von Hetzner, wie in Abschnitt 10 beschrieben.",
      ],
      links: [
        {
          label: "Datenschutzhinweise von Hetzner",
          href: "https://www.hetzner.com/de/legal/privacy-policy/",
        },
      ],
    },
    {
      id: "protokolle",
      title: "4. Server-Protokolle und technische Betriebsanalyse",
      paragraphs: [
        "Beim Aufruf der Website und bei der Nutzung der Schnittstellen fallen technische Verbindungs- und Betriebsdaten an. Webserver, API-Gateway, Authentifizierung, Datenbank und weitere Dienste können solche Vorgänge protokollieren. Die aktivierten Supabase-Dienste „Logs & Analytics“ sammeln und verarbeiten Dienstprotokolle mit Vector und Logflare in der eigenen Serverumgebung; die Standardkonfiguration verwendet hierfür ein PostgreSQL-Backend.",
        "Die Daten dienen dazu, die Website auszuliefern, Betriebsstörungen zu erkennen, Fehler zu untersuchen und unberechtigte Zugriffe oder Missbrauch abzuwehren. Die Bezeichnung „Analytics“ bezeichnet hier die technische Betriebs- und Protokollanalyse; sie beschreibt keine zu Werbezwecken eingesetzte Besucheranalyse. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.",
        "Die Aufbewahrung richtet sich nach dem für den jeweiligen Protokolltyp erforderlichen Zeitraum und den eingerichteten Lösch- oder Rotationsregeln. Bei einem konkreten Sicherheitsvorfall können erforderliche Auszüge länger zur Aufklärung und Rechtsverfolgung aufbewahrt werden. Die tatsächlichen regulären Fristen sind für diesen Entwurf noch nicht verifiziert und müssen vor Abschluss ergänzt werden; eine automatische Löschung nach einer bestimmten Anzahl von Tagen wird hier nicht zugesagt.",
      ],
      items: [
        "IP-Adresse beziehungsweise vom vorgeschalteten Server weitergereichte Verbindungsadresse;",
        "Datum und Uhrzeit, angefragter Pfad, HTTP-Methode und Antwortstatus;",
        "Browser-/Geräteinformationen und gegebenenfalls die übermittelte Herkunftsseite;",
        "Anmelde-, Verbindungs-, Fehler- und Sicherheitsereignisse sowie darin enthaltene Benutzer- oder Vorgangskennungen, soweit der jeweilige Dienst diese protokolliert.",
      ],
    },
    {
      id: "konto",
      title: "5. Registrierung, Benutzerkonto und Anmeldung",
      paragraphs: [
        "Für ein Benutzerkonto verarbeiten wir Ihre E-Mail-Adresse, den gewählten Anzeigenamen, eine interne Benutzer-ID, einen Passwort-Hash, Registrierungs- und Anmeldezeitpunkte sowie Ihre Sprach- und Kontoeinstellungen. Das Passwort wird zur Anmeldung verarbeitet; in der Authentifizierungsdatenbank wird ein Hash und kein Klartextpasswort gespeichert.",
        "Diese Daten dienen der Einrichtung und Verwaltung Ihres Kontos, der Prüfung Ihrer E-Mail-Adresse, der Anmeldung, der Wiederherstellung des Zugangs und der Zuordnung von Berechtigungen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO; ergänzende Maßnahmen zum Schutz vor Missbrauch erfolgen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.",
        "Die für Registrierung und Anmeldung als erforderlich gekennzeichneten Angaben sind für diese Funktionen notwendig. Ohne sie können wir kein entsprechendes Benutzerkonto bereitstellen. Öffentliche Tracker bleiben im vorgesehenen Umfang ohne Anmeldung zugänglich. Konto- und Profildaten werden grundsätzlich für die Dauer des Benutzerkontos gespeichert. Sie können die Löschung über die oben genannten Kontaktdaten anfordern; gesetzliche Ausnahmen bleiben unberührt.",
      ],
    },
    {
      id: "tracker",
      title: "6. Tracker, Zusammenarbeit und öffentliche Freigaben",
      paragraphs: [
        "Wir speichern die von Ihnen angelegten Tracker und deren Inhalte, beispielsweise Tracker-Titel, Spielernamen, Pokémon-Namen und Spitznamen, Spielstände, Regeln, Notizen, Statistiken sowie Mitgliedschaften, Rollen und zugehörige Benutzerkennungen. Diese Angaben können personenbezogen sein, wenn sie Ihnen oder anderen Personen zugeordnet werden können.",
        "Tracker-Inhalte sind für Personen sichtbar, die nach den vergebenen Mitgliedschaften darauf zugreifen dürfen. Berechtigte Mitglieder können Anzeigenamen und Rollen anderer Mitglieder sehen. Tracker-Eigentümer können zusätzlich die E-Mail-Adressen ihrer Mitglieder sehen; diese dienen insbesondere der Zuordnung und Verwaltung der Mitgliedschaft. Beim Hinzufügen von Mitgliedern wird die eingegebene E-Mail-Adresse zur Suche nach einem bestehenden Konto verarbeitet.",
        "Wenn ein Tracker öffentlich freigegeben wird, können seine freigegebenen Inhalte einschließlich darin eingetragener Spielernamen ohne Anmeldung über die Tracker-Adresse aufgerufen werden. Eine anschließende Einschränkung der Sichtbarkeit kann bereits von Dritten angefertigte Kopien nicht zurückholen. Tragen Sie deshalb keine unnötigen personenbezogenen oder vertraulichen Angaben in Tracker ein.",
        "Die Verarbeitung erfolgt zur Bereitstellung der gewünschten Zusammenarbeit und Freigaben auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Tracker-Inhalte bleiben grundsätzlich bis zur Löschung des betreffenden Inhalts oder Trackers gespeichert. Das Verlassen eines gemeinsamen Trackers löscht nicht automatisch sämtliche gemeinsam erfassten Inhalte. Personenbezogene Löschbegehren können Sie an uns richten; dabei werden die Rechte anderer Beteiligter und gesetzliche Ausnahmen berücksichtigt.",
      ],
    },
    {
      id: "anmeldecookies",
      title: "7. Cookies für Anmeldung und „Angemeldet bleiben“",
      paragraphs: [
        "Die Anwendung verwendet eigene Authentifizierungs-Cookies, um Ihre Anmeldung aufrechtzuerhalten und den Zugriff auf geschützte Inhalte zu ermöglichen. Ohne die Auswahl „Angemeldet bleiben“ werden diese als Sitzungscookies ohne ausdrücklich festgelegte dauerhafte Ablaufzeit gespeichert. Wann die Browsersitzung endet, bestimmt Ihr Browser; Funktionen zur Sitzungswiederherstellung können Sitzungscookies auch nach einem Neustart erhalten.",
        "Wenn Sie die standardmäßig nicht aktivierte Option „Angemeldet bleiben“ auswählen, werden die Authentifizierungs-Cookies mit einer Laufzeit von 90 Tagen gespeichert. Bei der Aktualisierung der Anmeldung wird diese Frist erneuert. Die serverseitige Sitzung kann unabhängig davon, etwa durch Abmeldung oder Widerruf des Zugangs, ungültig werden. Beim Abmelden werden die von der Anwendung verwalteten Authentifizierungs-Cookies in diesem Browser gelöscht.",
        "Die notwendigen Sitzungscookies dienen der ausdrücklich gewünschten Anmeldung (§ 25 Abs. 2 Nr. 2 TDDDG); die zugehörige Verarbeitung personenbezogener Daten erfolgt nach Art. 6 Abs. 1 lit. b DSGVO. Die optionale dauerhafte Speicherung beruht auf Ihrer Auswahl und Einwilligung (§ 25 Abs. 1 TDDDG und Art. 6 Abs. 1 lit. a DSGVO). Sie können diese durch Abmelden beenden und sich anschließend ohne „Angemeldet bleiben“ erneut anmelden. Das Löschen von Browser-Cookies ist ebenfalls möglich.",
        "Nicht angemeldete Besucher benötigen für das reine Ansehen öffentlicher Tracker keine Authentifizierungs-Cookies. Weitere Speicherungen, insbesondere die Entscheidung zu externen Bildern, sind nachfolgend beschrieben.",
      ],
    },
    {
      id: "browserspeicher",
      title: "8. Lokale Einstellungen und Speicherung der Bildentscheidung",
      paragraphs: [
        "Neben Cookies verwendet die Anwendung den lokalen Browserspeicher. Im Local Storage werden beispielsweise die ausgewählte Sprache, das Farbschema, Filter- und Darstellungsoptionen, ausgeblendete Einträge, geschlossene Hinweise und ein zuletzt verwendeter Tracker gespeichert. Dies dient dazu, die von Ihnen verwendeten Funktionen und Einstellungen bei weiteren Aufrufen wiederherzustellen. Diese lokalen Einstellungswerte werden nicht allein durch ihre Speicherung an GitHub übermittelt.",
        "Für diese Local-Storage-Einträge ist in der Anwendung keine allgemeine automatische Ablaufzeit hinterlegt. Sie bleiben bestehen, bis die Anwendung sie anlassbezogen entfernt, Sie die Website-Daten löschen oder der Browser sie entfernt. Bei Abmeldung wird die lokal gespeicherte Zuordnung zum zuletzt verwendeten Tracker entfernt; andere lokale Einstellungen werden dadurch nicht pauschal gelöscht.",
        "Die Entscheidung über externe Bilder wird bei angemeldeten Nutzern als Kontoeinstellung gespeichert. Bei nicht angemeldeten Besuchern wird sie getrennt davon im Session Storage des aktuellen Browser-Tabs gespeichert und übersteht dort ein Neuladen. Sie besteht grundsätzlich für die jeweilige Tab-Sitzung; Wiederherstellungsfunktionen des Browsers können die tatsächliche Dauer beeinflussen.",
        "Soweit eine Speicherung für eine ausdrücklich gewünschte Einstellung oder das Merken Ihrer Datenschutzentscheidung unbedingt erforderlich ist, erfolgt sie nach § 25 Abs. 2 Nr. 2 TDDDG. Die Verarbeitung personenbezogener Daten zur Bereitstellung der gewünschten Einstellungen erfolgt nach Art. 6 Abs. 1 lit. b DSGVO beziehungsweise zur Beachtung Ihrer Datenschutzentscheidung nach Art. 6 Abs. 1 lit. c DSGVO. Die optionale Bildverarbeitung selbst beruht auf der im folgenden Abschnitt beschriebenen Einwilligung.",
      ],
    },
    {
      id: "githubbilder",
      title: "9. Optionale externe Bilder von GitHub und Bild-Cache",
      paragraphs: [
        "Pokémon- und Item-Bilder werden nach Ihrer Einwilligung aus dem PokeAPI-Sprites-Repository über raw.githubusercontent.com geladen. GitHub wird nach seinen Datenschutzhinweisen durch GitHub B.V., Prins Bernhardplein 200, 1097 JB Amsterdam, Niederlande, und GitHub, Inc., 88 Colin P. Kelly Jr. St., San Francisco, CA 94107, USA, betrieben.",
        "Bei einem Abruf erhält GitHub Ihre IP-Adresse und technisch erforderliche Anfragedaten. GitHub beschreibt darüber hinaus die Verarbeitung von Geräte- und Nutzungsinformationen sowie Datum und Uhrzeit von Anfragen. Wir übermitteln für die Bildanzeige keine Konto-E-Mail-Adresse und kein Passwort an GitHub. Informationen zu GitHubs eigener Verarbeitung und deren Speicherdauer finden Sie in den verlinkten Datenschutzhinweisen.",
        "Ohne Entscheidung oder bei Ablehnung veranlasst die Bildanzeige keine externen Bildabrufe. Lokal von unserer Website bereitgestellte Bilder, beispielsweise Logos und Abzeichen, können weiterhin angezeigt werden. Die externe Bildanzeige und ihre Zwischenspeicherung beruhen auf Ihrer Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG. Die Nutzung des Trackers ist auch ohne externe Bilder möglich.",
        "Bei erlaubter Bildanzeige kann ein Service Worker Bilder im Cache Ihres Browsers speichern, um erneute Downloads zu vermeiden. Für diesen von der App verwalteten Cache ist derzeit keine feste zeitliche Ablaufgrenze eingerichtet. Ein Widerruf stoppt weitere externe Bildabrufe durch die Anwendung, meldet den Bild-Service-Worker ab und löscht diesen Cache im aktuellen Browser. Die normale HTTP-Zwischenspeicherung des Browsers wird durch dessen eigene Regeln gesteuert; sie kann über das Löschen der Website-Daten entfernt werden. Bereits erfolgte Datenübermittlungen und von GitHub gespeicherte Daten werden durch unseren Widerrufsschalter nicht rückwirkend gelöscht.",
        "Die erstmalige Entscheidung erfolgt in einem Dialog vor der Nutzung externer Bilder. Bei Ablehnung können anklickbare Bildplatzhalter den Einstellungsdialog erneut öffnen; vorhandene Ersatzbilder bleiben erhalten. Sie können Ihre Auswahl jederzeit ändern: angemeldet in den Kontoeinstellungen unter „Externe Bilder von GitHub“, als nicht angemeldeter Besucher über „Datenschutzeinstellungen“ im Footer des öffentlichen Trackers. Die Rechtmäßigkeit der Verarbeitung bis zum Widerruf bleibt unberührt.",
        "GitHub weist auf eine Verarbeitung unter anderem in den USA hin und nennt für internationale Übermittlungen unter anderem das EU-US Data Privacy Framework sowie Standardvertragsklauseln. Welche Garantie den konkreten Abruf absichert, ist für die abschließende Fassung zu prüfen. Die Einwilligung zur Bildanzeige wird hier nicht als pauschale Ausnahme nach Art. 49 DSGVO für beliebige Drittlandübermittlungen verstanden.",
      ],
      links: [
        {
          label:
            "Datenschutzerklärung von GitHub und Hinweise zu internationalen Übermittlungen",
          href: "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
        },
      ],
    },
    {
      id: "email",
      title: "10. System-E-Mails und Kontaktanfragen",
      paragraphs: [
        "Bestätigungs- und Wiederherstellungs-E-Mails werden über den SMTP-Dienst der Hetzner Online GmbH versendet. Dabei verarbeitet Hetzner insbesondere die Empfängeradresse, den Nachrichteninhalt, erforderliche Bestätigungs- oder Wiederherstellungslinks sowie technische Zustellinformationen. Zur Zustellung werden Nachrichten an die Mailserver Ihres E-Mail-Anbieters weitergegeben. Die Angaben zu Hetzner und zum abgeschlossenen Auftragsverarbeitungsvertrag finden Sie in Abschnitt 3.",
        "Die Verarbeitung der System-E-Mails erfolgt zur Bereitstellung und Absicherung des gewünschten Kontos nach Art. 6 Abs. 1 lit. b DSGVO beziehungsweise Art. 6 Abs. 1 lit. f DSGVO. Nachrichtenwarteschlangen und Zustellprotokolle können bis zur Zustellung, zum endgültigen Fehlschlagen des Versands oder entsprechend den eingerichteten Protokollregeln bestehen bleiben. Die konkreten Fristen des SMTP-Betriebs sind noch zu prüfen; eine bestimmte Aufbewahrungsdauer wird im Entwurf nicht behauptet.",
        "Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir die mitgeteilten Kontaktdaten und den Inhalt Ihrer Anfrage zur Bearbeitung. Rechtsgrundlage ist bei kontobezogenen Anliegen Art. 6 Abs. 1 lit. b DSGVO, bei sonstigen Anfragen unser berechtigtes Interesse an deren Bearbeitung nach Art. 6 Abs. 1 lit. f DSGVO und bei der Erfüllung gesetzlicher Pflichten Art. 6 Abs. 1 lit. c DSGVO. Die im Verantwortlichenabschnitt genannte Gmail-Adresse ist vom SMTP-Versand der App über Hetzner zu unterscheiden; bei Kontakt an diese Adresse erfolgt die Verarbeitung auch über den zugehörigen E-Mail-Anbieter. Dessen Einbindung und mögliche Drittlandverarbeitung sind vor Abschluss dieses Entwurfs gesondert zu prüfen.",
        "Kontaktanfragen werden gespeichert, solange sie zur Bearbeitung erforderlich sind. Danach werden sie gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten oder erforderlichen Gründe zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen entgegenstehen.",
      ],
    },
    {
      id: "speicherdauer",
      title: "11. Speicherdauer, Löschung und Sicherungskopien",
      paragraphs: [
        "Personenbezogene Daten werden nur so lange gespeichert, wie es für den jeweiligen Zweck erforderlich ist oder eine gesetzliche Pflicht beziehungsweise ein zulässiger Grund zur weiteren Aufbewahrung besteht. Die vorstehenden Abschnitte beschreiben die jeweiligen Zwecke und bekannten Speicherbedingungen. Eine Kontolöschung entfernt nicht automatisch alle Inhalte, die in gemeinsamen Trackern unabhängig weitergeführt werden; personenbezogene Angaben darin werden bei einem Löschbegehren gesondert geprüft.",
        "Nach den bisher zugrunde gelegten Betreiberangaben ist kein zusätzliches regelmäßiges Backup-Verfahren eingerichtet. Die selbst gehostete Supabase-Installation enthält nicht automatisch die verwalteten Backup- und Wiederherstellungsleistungen der Supabase-Cloud. Ob manuelle Exporte, frühere Migrationssicherungen oder Server-Snapshots bestehen, ist noch zu prüfen. Deshalb wird keine bestimmte zusätzliche Aufbewahrungsfrist für Sicherungskopien zugesagt.",
        "Gesetzliche Ausnahmen von einer Löschung, insbesondere zur Erfüllung rechtlicher Pflichten und zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen, bleiben unberührt. Falls solche Gründe bestehen, werden die betroffenen Daten auf die dafür erforderliche Verarbeitung beschränkt.",
      ],
    },
    {
      id: "empfaenger",
      title: "12. Empfänger, externe Verweise und Sicherheit",
      paragraphs: [
        "Empfänger können im beschriebenen Umfang Hetzner als Hosting- und SMTP-Anbieter, technisch notwendige E-Mail-Empfänger beziehungsweise deren Mailserver, bei Kontaktanfragen der Anbieter unserer Kontakt-Mailbox, berechtigte Tracker-Mitglieder sowie bei öffentlichen Freigaben die Öffentlichkeit sein. Nach Einwilligung kommen die genannten GitHub-Dienste für externe Bilder hinzu. Eine Übermittlung an Behörden oder weitere Stellen erfolgt, soweit hierfür eine gesetzliche Pflicht oder andere zulässige Grundlage besteht.",
        "Links zu GitHub oder Pokémon-Nachschlagewerken sind von automatisch geladenen Bildern zu unterscheiden: Wenn Sie einen externen Link öffnen, verlassen Sie unser Angebot und Ihr Browser stellt eine Verbindung zum Zielanbieter her. Für die dortige Verarbeitung gelten dessen Datenschutzhinweise.",
        "Die Anwendung verwendet HTTPS zur geschützten Übertragung. Zugriffsrechte begrenzen den Zugriff auf Konto- und Tracker-Daten entsprechend der jeweiligen Berechtigungen. Eine vollständige Sicherheit jeder Internetübertragung kann dennoch nicht gewährleistet werden.",
      ],
    },
    {
      id: "rechte",
      title: "13. Ihre Rechte",
      paragraphs: [
        "Ihnen stehen nach Maßgabe der gesetzlichen Voraussetzungen insbesondere die folgenden Rechte zu. Wenden Sie sich dazu an die im ersten Abschnitt genannten Kontaktdaten.",
        "Sie können eine erteilte Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Dies berührt nicht die Rechtmäßigkeit der vorherigen Verarbeitung. Die direkten Einstellmöglichkeiten für externe Bilder und für „Angemeldet bleiben“ sind oben beschrieben.",
        "Soweit eine Verarbeitung auf Art. 6 Abs. 1 lit. f DSGVO beruht, können Sie aus Gründen Ihrer besonderen Situation gemäß Art. 21 DSGVO widersprechen. Wir verarbeiten die betroffenen Daten dann nicht weiter, es sei denn, es bestehen nachweisbare zwingende schutzwürdige Gründe, die Ihre Interessen, Rechte und Freiheiten überwiegen, oder die Verarbeitung dient Rechtsansprüchen. Gegen eine etwaige Verarbeitung für Direktwerbung besteht ein jederzeitiges Widerspruchsrecht ohne diese Interessenabwägung.",
        "Sie können sich bei einer Datenschutzaufsichtsbehörde beschweren, insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes oder des Orts eines vermuteten Verstoßes. Es findet im Rahmen des Trackers keine automatisierte Entscheidung mit rechtlicher oder ähnlich erheblicher Wirkung im Sinne von Art. 22 DSGVO statt.",
      ],
      items: [
        "Auskunft über die Verarbeitung Ihrer personenbezogenen Daten (Art. 15 DSGVO);",
        "Berichtigung unrichtiger und Vervollständigung unvollständiger Daten (Art. 16 DSGVO);",
        "Löschung personenbezogener Daten unter den gesetzlichen Voraussetzungen (Art. 17 DSGVO);",
        "Einschränkung der Verarbeitung (Art. 18 DSGVO);",
        "Datenübertragbarkeit für hierfür geeignete, automatisiert auf Grundlage einer Einwilligung oder eines Vertrags verarbeitete Daten (Art. 20 DSGVO).",
      ],
    },
  ] satisfies PrivacyPolicySection[],
};
