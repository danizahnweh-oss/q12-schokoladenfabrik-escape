# Die verschlossene Schokoladenfabrik

Vollständige statische Lernwebsite für Q12 Wirtschaft und Recht: sechs Räume, eigene anspruchsvolle Lerntexte, Fachrätsel und Codes, Hilfen, Ermittlungsheft und Unterrichtswerkzeuge. Die Akten sind als blätterbare Hefter gestaltet: ein Absatz pro Seite, Seitenauswahl, Vor-/Zurück-Schaltflächen und Pfeiltasten innerhalb der Akte. Die aktuelle Seite und Markierungen bleiben gespeichert. Beim Blättern dreht sich ein vollständiges Papierblatt am Heftrand, mit Rückseite, leicht durchscheinender Schrift und bewegtem Schatten. Die Lesefläche bleibt gleich hoch; schnelle Seitenwechsel unterbrechen die laufende Bewegung sauber. Reduzierte Bewegung und ausgeschaltete Animationen führen zu sofortigen Wechseln.

Die Akten besitzen einen historischen Umschlag, Registerlaschen, Aktenzeichen, einen dezenten Stempel, Schreibmaschinenschrift und eine gealterte Papiertextur.

## Unterricht
Vier Doppelstunden. Teamarbeit beim Erschließen und Rätseln, individuelle Ergebnissicherung im eigenen Browser. Kein Konto erforderlich. Einträge werden ausschließlich auf dem verwendeten Gerät und Browser gespeichert. Keine gemeinsame Cloud-Synchronisation. Backups erlauben einen Gerätewechsel.

## Start
`npm start`, anschließend http://localhost:4173 öffnen. Die Website funktioniert auch mit jedem statischen Webserver. GitHub Pages veröffentlicht den Ordner `dist`.

## Inhalt
Die Lerntexte sind eigenständige didaktische Bearbeitungen der Themen der bereitgestellten Unterrichtsmaterialien. Historische Fallbeispiele sind als solche bezeichnet. Originale Schulunterlagen und Lösungspdfs werden nicht mitveröffentlicht. Der Rechtsfall spielt ausdrücklich im Jahr 2024 auf Basis der bezeichneten Gesetzesfassung. Quellenlinks stehen in den Räumen.

## Lehrkraft
Der Lehrkraftbereich bietet Erwartungshorizonte, Unterrichtsablauf, lokale Freigaben und Musterlösungen. Er ist eine offen zugängliche Unterrichtshilfe, kein geschütztes Administrationssystem. Rätsel und Codes werden im Browser geprüft und sind kein Prüfungs-Sicherheitssystem.

## Daten
Notizen und Textmarkierungen werden lokal gespeichert. Ein Ermittlungsheft lässt sich als Markdown, druckbare Fassung/PDF oder JSON-Backup exportieren. Browserdaten löschen entfernt die lokalen Einträge. Imports werden geprüft. Bei nicht verfügbarer Speicherung zeigt die Website eine Warnung und ermöglicht weiter Export.

## Grafik
Das Fabrikmotiv wird mit dem eingebauten Bildgenerator erstellt: detaillierter isometrischer Fabrikschnitt mit sechs verbundenen Räumen, Abendlicht, Kupferkesseln, Backstein und dunkelblauem Umfeld; ohne Beschriftungen, Personen oder Logos. Der genaue Prompt liegt in `ASSETS.md`.

## Verifikation
Der vollständige Browserdurchlauf prüft 16 Gruppen: Türsperren, Notizen, Zuordnungen, falsche Codes, alle sechs Räume, blätterbare Akten, Speicherung, Export und Import, sichere Textdarstellung, Offline-Nutzung, Handy, Tablet und WebKit. `tests/a11y.cjs` prüft sieben Ansichten mit axe auf WCAG 2.1 A/AA. Automatische Prüfungen ersetzen keine vollständige manuelle Zugänglichkeitsbewertung.
