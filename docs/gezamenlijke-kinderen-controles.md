# Gezamenlijke kinderen per partnerschap

## Invoer

Open een partnerschap en selecteer ieder gezamenlijk kind één keer bij **Gezamenlijke kinderen**. Beide partners worden in de stamboom als ouders getoond. Ieder partnerschap heeft een eigen kinderenlijst, ook als iemand meerdere partnerschappen heeft.

**Losse ouder-kindrelaties** blijven beschikbaar voor afzonderlijk vastgelegd ouderschap. Een apart vastgelegde koppeling blijft staan wanneer het kind uit een gezamenlijke lijst wordt gehaald. Een partnerschap met kinderen kan niet zonder meer worden verwijderd of aan andere partners worden toegewezen.

De opgeslagen kinderenlijst is de bron voor het gezamenlijke ouderschap. Bij het lezen ontstaat een ontdubbelde verzameling ouder-kindverbindingen uit die lijsten en uit het losse ouderschap. Er hoeven geen twee aparte invoerregels per kind te worden onderhouden. De grafische indeling, muisbediening en bezoekersafscherming zijn niet veranderd.

## Uitgevoerde controles

- 36 logische tests, waaronder invoer via partnerschappen, uitzonderingen, dubbele verbindingen, gemengde vooroudercirkels en de veilige omzettingsregels.
- 23 aanvullende databasecontroles in afzonderlijke testdatabases. Ze controleren één selectie naar twee ouders, wijzigingen, verwijderen, meerdere partnerschappen, toegangscontrole, behoud van personen en accounts bij omzetting, herhaalbaarheid en gelijktijdige wijzigingen die anders een cirkel zouden vormen.
- In het testbeheer is één fictief proefkind geselecteerd en opgeslagen bij een partnerschap. In het werkelijk gerenderde schema heeft dat kind daarna beide partners als ouders. De twee ouders zijn in het detailpaneel gecontroleerd.
- Typecontrole, lintcontrole en productiebuild zijn uitgevoerd.
- De nieuwe schemamigratie voegt alleen de opslag voor de kinderenlijst toe. Er worden bij de schematoevoeging geen bestaande personen, beheerders of relatiekolommen verwijderd.

## Werkende lokale database

Vlak vóór de update is een actuele PostgreSQL-back-up gemaakt. Het omzettingsprogramma is daarna op de lokale werkdatabase uitgevoerd. Er waren op dat moment geen losse ouder-kindregels aanwezig die omgezet moesten worden: er zijn dus geen relatie-invoerregels verplaatst of vervangen.

De oorspronkelijke back-up en de huidige database zijn afzonderlijk lezend vergeleken voor personen en beheeraccounts, inclusief de opgeslagen wachtwoordgegevens. Die zijn behouden. De geheime waarden en persoonsgegevens zijn niet afgedrukt. De lokale instellingen en cookie-instellingen zijn behouden, zodat bestaande eigen beheeraccounts bruikbaar blijven.

## Bij een andere bestaande installatie

`scripts/migrate-partnership-children.ts` geeft standaard alleen een voorstel. Met `--apply` zet het uitsluitend eenduidige koppelingen om: precies twee afzonderlijk bekende ouders die samen precies één partnerschap vormen. Complexere of al bewust gecombineerde koppelingen blijven los vastgelegd.

Een daadwerkelijke omzetting maakt een privéherstelbestand onder `.local-migrations/`, verandert alle passende relaties in één transactie en vergelijkt de volledige verzameling effectieve familieverbindingen vóór en na. Bij een verschil wordt de transactie teruggedraaid. `npm run test:children` maakt altijd zijn eigen testdatabase en wijzigt de werkdatabase niet.

De JSON-export heeft nu `schemaVersion: 2`: `partnerships.children` bevat de gezamenlijke kinderen; `parentages` bevat het losse ouderschap. PostgreSQL-back-ups bevatten beide soorten gegevens.

De afbeelding `gezamenlijke-kinderen.jpg` toont uitsluitend fictieve testgegevens uit de afzonderlijke testversie.
