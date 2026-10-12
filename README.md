# Die verschlossene Schokoladenfabrik

Vollständige statische Lernwebsite für Q12 Wirtschaft und Recht: sechs Räume, eigene anspruchsvolle Lerntexte, Fachrätsel und Codes, Hilfen, Ermittlungsheft und Unterrichtswerkzeuge. Die Akten sind als blätterbare Hefter gestaltet: ein Absatz pro Seite, Seitenauswahl, Vor-/Zurück-Schaltflächen und Pfeiltasten innerhalb der Akte. Die aktuelle Seite und Markierungen bleiben gespeichert. Beim Blättern dreht sich ein vollständiges Papierblatt am Heftrand, mit Rückseite, leicht durchscheinender Schrift und bewegtem Schatten. Die Lesefläche bleibt gleich hoch; schnelle Seitenwechsel unterbrechen die laufende Bewegung sauber. Reduzierte Bewegung und ausgeschaltete Animationen führen zu sofortigen Wechseln. Akte C enthält außerdem eine zweistimmige Tonakte zur Entscheidung über Eigenfertigung oder Fremdbezug. Die Mitschrift ist im Hefter zunächst eingeklappt.

Die Akten besitzen einen historischen Umschlag, Registerlaschen, Aktenzeichen, einen dezenten Stempel, Schreibmaschinenschrift und eine gealterte Papiertextur.

Die synthetischen Stimmen der Tonakte wurden lokal mit [Supertonic 3](https://github.com/supertone-oss-archive/supertonic) erzeugt. Die Website enthält nur die fertige Audiodatei und benötigt für die Wiedergabe keinen externen Dienst.

## Unterricht
Planungsreferenz der Lehrkraft für den bisherigen Umfang: ungefähr 90 Minuten. Diese Einschätzung dient als Maßstab für kommende Aufgaben; die neue Tonakte mit Auswertung benötigt zusätzliche Bearbeitungszeit. Ausführliche Präsentationen oder Vertiefungen sind ebenfalls zusätzlich zu planen. Teamarbeit beim Erschließen und Rätseln, individuelle Ergebnissicherung im eigenen Browser. Kein Konto erforderlich. Einträge werden ausschließlich auf dem verwendeten Gerät und Browser gespeichert. Keine gemeinsame Cloud-Synchronisation. Backups erlauben einen Gerätewechsel.

## Start
`npm start`, anschließend http://localhost:4173 öffnen. Die Website funktioniert auch mit jedem statischen Webserver. GitHub Pages veröffentlicht den Ordner `dist`.

## Inhalt
Die Lerntexte sind eigenständige didaktische Bearbeitungen der Themen der bereitgestellten Unterrichtsmaterialien. Historische Fallbeispiele sind als solche bezeichnet. Originale Schulunterlagen und Lösungspdfs werden nicht mitveröffentlicht. Der Rechtsfall spielt ausdrücklich im Jahr 2024 auf Basis der bezeichneten Gesetzesfassung. Alle für die Aufgaben benötigten Fallinformationen, Fachbegriffe, Rechenregeln und die didaktisch zusammengefassten Rechtsregeln stehen in den Akten. Nucao, Bareiss und die Möbelmacher werden eigenständig erläutert. Quellenlinks dienen nur der freiwilligen Vertiefung. Vorhandene Absatznummern bleiben erhalten; zusätzliche Grundlagenblätter folgen nach den bisherigen Anlagen.

## Lehrkraft
Der Lehrkraftbereich bietet Erwartungshorizonte, Unterrichtsablauf, lokale Freigaben und Musterlösungen. Er ist eine offen zugängliche Unterrichtshilfe, kein geschütztes Administrationssystem. Rätsel und Codes werden im Browser geprüft und sind kein Prüfungs-Sicherheitssystem.

## Daten
Notizen und Textmarkierungen werden lokal gespeichert. Ein Ermittlungsheft lässt sich als Markdown, druckbare Fassung/PDF oder JSON-Backup exportieren. Browserdaten löschen entfernt die lokalen Einträge. Imports werden geprüft. Bei nicht verfügbarer Speicherung zeigt die Website eine Warnung und ermöglicht weiter Export.

## Grafik
Das Fabrikmotiv wird mit dem eingebauten Bildgenerator erstellt: detaillierter isometrischer Fabrikschnitt mit sechs verbundenen Räumen, Abendlicht, Kupferkesseln, Backstein und dunkelblauem Umfeld; ohne Beschriftungen, Personen oder Logos. Der genaue Prompt liegt in `ASSETS.md`.

## Verifikation
Der vollständige Browserdurchlauf prüft 16 Gruppen: Türsperren, Notizen, Zuordnungen, falsche Codes, alle sechs Räume, blätterbare Akten, Speicherung, Export und Import, sichere Textdarstellung, Offline-Nutzung, Handy, Tablet und WebKit. `tests/a11y.cjs` prüft sieben Ansichten mit axe auf WCAG 2.1 A/AA. Automatische Prüfungen ersetzen keine vollständige manuelle Zugänglichkeitsbewertung.

## Eigene Domain und freie Vorschau
Spielversion: https://daniel-zahnweh.de/Q12/Fabrik/
Freie Vorschau mit sechs direkt zugänglichen Räumen: https://daniel-zahnweh.de/Q12/Fabrik/?vorschau=1
Die Vorschau verwendet einen eigenen lokalen Speicherbereich. Sie öffnet Räume ohne Code und lässt den Arbeitsstand der Spielversion unverändert. Der URL-Parameter funktioniert auch auf GitHub Pages.
Die Domain-Veröffentlichung enthält die Dateien aus `dist` unter `dist/Q12/Fabrik` in der bestehenden Domain-Website.

## Abschlussauftrag
Nach der sechsten Tür öffnet sich `#finale`: vier zusammenhängende Teile eines Neustartplans, neue Nachfrage- und Kapazitätsbedingungen sowie ein gemeinsamer sechsstelliger Startcode aus allen sechs Türcodes. Die Akten und der Codepass bleiben zugänglich. Alle Abschlussnotizen und Codes werden lokal gespeichert und mit Markdown, Druck/PDF und JSON-Backup gesichert. Alte Backups erhalten eine leere Abschlussaufgabe. In der freien Vorschau ist das Finale direkt verfügbar.
