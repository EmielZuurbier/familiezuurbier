# Familieboom · Familie Zuurbier

Een besloten stamboomwebsite voor de **familie Zuurbier**. De app tekent personen, partnerschappen en ouderschap als een interactief schema. Voorbeeldgegevens zijn uitsluitend beschikbaar zolang er geen personen in de database staan, of wanneer er nog geen database is ingesteld.

De familienaam komt terug bij het logo, in de opgeslagen weergaven, op het inlogscherm, in het beheer, in de paginatitels en in de e-mailteksten. Naam, teksten, modules, logo’s en huisstijl zijn centraal instelbaar in **CMS → Website → Website-instellingen**. De standaardwaarden staan in `src/lib/site-settings.ts`; de huidige Zuurbier-inrichting is vooringevuld. Het [hostingadvies en de featurevoorstellen van 17 november 2026](docs/hostingadvies-2026-11-17.md) beschrijven een volgende stap; de applicatie is nog niet online gepubliceerd en er is nog geen hosting ingericht.

## Repository

Broncode: <https://github.com/EmielZuurbier/familiezuurbier>.

```sh
git clone https://github.com/EmielZuurbier/familiezuurbier.git
cd familiezuurbier
npm ci
npm run dev
```

Gebruik de Node-versie uit `.nvmrc`. Zonder lokale instellingen opent de app uitsluitend fictieve voorbeelden. Voor eigen opslag volg je hieronder **Schone installatie**. Wachtwoorden, `.env`, uploads, databaseback-ups, privé-importen en lokale controlescreenshots worden niet in Git opgenomen. Een nieuwe checkout bevat dus geen echte familiegegevens of foto's.

## Voorbeeldgegevens en eigen invoer

De applicatie controleert bij ieder verzoek of er personen zijn opgeslagen. Bij een lege database verschijnen de vaste fictieve voorbeelden, zonder die in de database op te slaan. Zodra de eerste persoon is toegevoegd, gebruikt de app uitsluitend de opgeslagen gegevens en is inloggen verplicht. Een oude instelling `FAMILY_DATA_MODE=demo` kan dit niet omzeilen en is niet meer nodig.

De routes `/voorbeeld` en `/voorvertoning`, inclusief hun kaarten, kalenders en subpagina's, controleren dezelfde voorwaarde. Bij een gevulde database geven ze 404. De verwijzing naar een voorbeeldstamboom staat niet meer bij het inloggen. Bij een databasefout of onvolledige databaseconfiguratie wordt geen voorbeeldstamboom als vervanging getoond.

In **Overzichtelijk** krijgen gezinnen eigen horizontale ruimte; in **Vrije boom** groeien takken omhoog en spreiden grote groepen zich over meerdere hoogtes. Beide indelingen zijn beschikbaar voor de eigen familie.

Ontwerpcontroles in ontwikkeling: `/voorvertoning/controle`, uitsluitend als voorbeelden nog beschikbaar zijn. `/interaction-check` controleert de gewone homepage met de bestaande toegangscontrole. De browsercontroles veranderen geen opgeslagen gegevens en zijn in productie uitgeschakeld.

De lokale fotoanalyse staat afzonderlijk in de genegeerde map `.local-import/`, buiten de website en voorbeeldgegevens. Dit is een privévoorstel ter controle, geen uitgevoerde import.

## Nu openen op deze Mac

- Stamboom: <http://127.0.0.1:3000>
- Verjaardagskalender: <http://127.0.0.1:3000/verjaardagen>
- Beheer: <http://127.0.0.1:3000/admin>
- Alleen bij een lege database: fictieve voorbeelden op <http://127.0.0.1:3000/voorbeeld>
- Het lokale ontwikkelaccount staat in **`.local-admin.txt`** in deze projectmap. Dit privébestand staat buiten versiebeheer. Het wachtwoord staat niet in deze handleiding of de broncode.

De lokale database en geheime sleutels zijn al aangemaakt in de genegeerde `.env`. De database is gestart met een opgeslagen fictieve proefstamboom met 16 personen, 18 ouder-kindrelaties en 6 partnerschappen. Het ontwikkelaccount is lokaal aangemaakt en het inloggen is gecontroleerd. Je kunt daarnaast je eigen beheeraccount aanmaken in het beheer. Bestaande accounts en eigen invoer blijven behouden. Echte gegevens worden standaard uitsluitend na beheerlogin getoond. Er is niets gepubliceerd.

Als de app is gestopt:

```sh
cd /Users/emielzuurbier/Documents/TDA/Projects/Familieboom
npm run db:up
npm run dev
```

Docker Desktop moet draaien voor de database. De webserver luistert uitsluitend op `127.0.0.1`; de database uitsluitend op `127.0.0.1:54329`. Gebruik in de browser steeds dezelfde host (`127.0.0.1`), omdat een login op `localhost` een andere browsercookie heeft.

## Bediening

Klik en sleep om de stamboom te verplaatsen. Trackpad-scrollen werkt ook. De boom mag vrij door het veld bewegen, ook wanneer hij volledig in beeld past. De grens ligt op 16 schermpixels nadat de hele boom buiten beeld is geraakt. React Flow begrenst de beweging tijdens het slepen; loslaten centreert de boom niet opnieuw. De overzichtsknop haalt de volledige stamboom terug.

**Subtiele muisbeweging** is uitsluitend een decoratief diepte-effect. De drie sterkten **Zeer subtiel, Subtiel en Meer beweging** verschuiven het getekende schema maximaal 6, 12 of 20 schermpixels per as, onafhankelijk van zoom en stamboomgrootte. De echte camera blijft staan; herhaalde muisbeweging kan dus geen navigatie opbouwen. Binnenkomen begint zonder sprong. Selectie, gezinsfocus, slepen, trackpadgebruik en pauze stoppen het effect. Bij de systeemvoorkeur voor minder beweging wordt het effect niet getoond.

**Toetsenbord:** bereik het veld met Tab of klik op de achtergrond. Pijltjestoetsen verplaatsen het veld in gelijke schermstappen; Shift gebruikt grotere stappen. Enter selecteert de dichtstbijzijnde kaart. Met een geselecteerde persoon gaan omhoog/omlaag naar een ouder/kind, ook in de opwaartse indeling. Links/rechts lopen door partners, broers, zussen en halfbroers/halfzussen in de getoonde volgorde; gezinsfocus gaat bij een volgende rij verder en blijft binnen het gezin. De toetsenbordfocus volgt de kaart. Escape sluit de selectie en brengt de focus terug naar het veld. Zoeken, dropdowns en andere invoervelden behouden hun eigen pijltjestoetsbediening.

- Klik op een naam voor geboortegegevens, levensstatus, ouders, partners, kinderen en (half)broers of (half)zussen. Tijdens de selectie volgt het schema de muis niet. Klik nogmaals op dezelfde kaart om te deselecteren en het volgen te hervatten. Een eerdere handmatige pauze blijft behouden. Vanuit het paneel kun je verder klikken.
- De onderdelen **Ouders** en **Kinderen** in de persoonsgegevens verschijnen alleen als er gekoppelde personen zijn.
- Kinderen en hun gezinstakken staan van oudste naar jongste. Dit geldt ook voor gezinsfocus en de lijsten met kinderen en broers/zussen. Eerst telt het geboortejaar, daarna maand en dag; ontbrekende onderdelen volgen bekende onderdelen binnen hetzelfde jaar of dezelfde maand. Zonder bruikbaar geboortejaar komt een kind na de gedateerde kinderen, in de volgorde van **Gezamenlijke kinderen** bij het betreffende partnerschap. Ook bij gelijke datums bepaalt die lijst de volgorde. Een partner die aangetrouwd is bepaalt niet de plaats van de kindertak. Bij losse ouder-kindrelaties zonder lijstpositie is het persoonsnummer de laatste vaste sorteersleutel.
- Alleen overleden personen hebben een klein **†** op hun kaartje en bij de persoonsgegevens. Personen met een andere status krijgen geen statusicoon of tooltip. Ook het decoratieve blaadje bij de profielavatar is verwijderd. De overlijdensdatum blijft apart zichtbaar wanneer de persoon overleden is.
- Zoek linksboven op een naam; een resultaat opent en brengt de persoon in beeld.
- Pauzeer de muisbediening met de pauzeknop of spatiebalk. Escape sluit gegevens/uitleg.
- Plus/min zoomen; het vierkante overzichtspictogram past de hele stamboom in beeld.
- **Indeling van de stamboom:** schakel boven het schema tussen **Overzichtelijk** (de bestaande generatierijen) en **Vrije boom** (een stam onderaan met opwaartse, verspringende takken en gebogen, diagonale lijnen). Grote groepen vertakken over meerdere hoogtes, met maximaal drie complete familietakken naast elkaar per groep. Elke tak reserveert ruimte voor de eigen kinderen en kleinkinderen. De kindvolgorde loopt van links naar rechts en daarna naar de volgende, hogere groep takken; partners blijven samen. Gedeelde afstamming en los vastgelegd ouderschap blijven meetellen bij de plaatsing en botsingscontrole. Ook onafhankelijke families komen op meerdere hoogtes als ze samen te breed worden. De keuze wordt lokaal in deze browser onthouden; er worden geen familiegegevens of coördinaten opgeslagen. Zoeken, de minimap, muisbediening en gezinsfocus werken in beide standen. Bij een omschakeling blijft een geselecteerde persoon of een gekozen gezin in beeld. In de vrije boom delen gezamenlijke kinderen één vertakkende stam vanuit het partnerschap. Verbindingen mijden kaarten en bestaande lijnen, versmallen naar het kind en krijgen bij onvermijdelijke kruisingen een onderbreking. Ook gezinsfocus gebruikt deze verbindingen. De berekening draait in een browserworker; de laatste twee berekende indelingen blijven alleen tijdelijk binnen de geopende stamboom beschikbaar.
- **Gezin in beeld:** open een persoon en kies deze knop bovenaan de persoonsgegevens. Het gekozen ouderpaar en zijn directe kinderen krijgen tijdelijk een compacte opstelling, met maximaal vier kaarten per rij en de overige personen gedimd als context. Kinderen volgen de geboortevolgorde van links naar rechts en daarna op de volgende rij; de laatste rij staat gecentreerd. Het hele gezin wordt automatisch passend in beeld gebracht en de verbindingslijnen lopen tussen de rijen door. Bij meerdere partnerschappen kies je het betreffende gezin; afzonderlijk ouderschap blijft apart. Heeft iemand geen eigen partner of kinderen, dan kun je het vastgelegde gezin van de ouders bekijken. Er worden geen nieuwe familiebanden afgeleid.
- **Focus sluiten** in de focusbalk (of Escape wanneer geen gegevenspaneel openstaat) brengt de oorspronkelijke indeling terug en verwijdert de markering, met behoud van je huidige zoomniveau en beeldpositie. Het overzichtspictogram **Hele stamboom in beeld** zoomt alleen op verzoek uit naar de hele familie. De gezinsfocus pauzeert het automatische volgen van de muis; slepen en zoomen blijven beschikbaar. Na sluiten van persoonsgegevens binnen de focus komt het hele gekozen gezin opnieuw in beeld. Een eerdere handmatige muispauze blijft behouden.
- De **minimap rechtsonder** toont het hele schema en omlijnt het zichtbare gedeelte. Geselecteerde personen en gezinsleden krijgen een andere kleur. Je kunt de minimap verslepen of erop zoomen. Op mobiel blijft deze boven een geopend gegevenspaneel zichtbaar. Zie de [React Flow-minimap](https://reactflow.dev/api-reference/components/minimap).
- Op een telefoon blijft hetzelfde schema staan: met één vinger vegen en met twee vingers knijpen om te zoomen. Persoonsgegevens openen onderaan. Trackpad-scrollen/pinchen gebruikt React Flow en onderbreekt de eigen muisbediening.

De telefoonopmaak is op 390 × 844 bekeken. Gebaren op een fysiek aanraakscherm zijn nog niet handmatig gecontroleerd.

De vier weergaven gebruiken dezelfde kop met navigatie, dezelfde zijbalkbreedte en dezelfde beginhoogte voor de ondertitel. De opslagvermelding en hulpknop van de stamboom staan vóór de navigatie. Op kleinere schermen krijgt de navigatie in elke weergave dezelfde tweede rij. De kalenderdropdowns hebben een eigen pijltje met ruimte tot de rand; het blijven gewone, met het toetsenbord bedienbare selecties.

## Familie op de kaart

Met **Kaart** naast **Stamboom** open je de Mapbox-weergave. De opgeslagen familiekaart staat op `/kaart` en gebruikt dezelfde toegang als de stamboom. `/voorbeeld/kaart` en `/voorvertoning/kaart` zijn alleen bij een lege database beschikbaar en bevatten uitsluitend fictieve personen met voorbeeldwoonplaatsen.

- Vul **Huidige woonplaats** bij een persoon in als `Haarlem, Nederland`. Daarna opent/ververst de kaart met deze woonplaats. Er wordt geen woonplaats afgeleid uit geboorteplaats of familiebanden.
- Kies bij **Kaartlagen** voor **Huidige woonplaats**, **Geboorteplaats** of beide. Woonplaatsen zijn groen en rond, geboorteplaatsen blauw met afgeronde hoeken. Overlappende lagen op hetzelfde plaatscentrum staan in schermpixels naast elkaar; de coördinaten blijven ongewijzigd. Het aan- en uitzetten hergebruikt de tijdelijke resultaten en behoudt handmatige plaatskeuzes per laag.
- Een marker bundelt de personen per plaats en per laag. Het totaal aantal personen telt iemand met beide lagen één keer. Klik op de stip om de bijbehorende groep te vinden, of zoek op naam, geboortenaam of woon- of geboorteplaats. Klik op een persoon voor dezelfde persoonsgegevens als in de stamboom.
- Personen met een ontbrekende plaats blijven per actieve laag zichtbaar onder **Huidige woonplaats onbekend** of **Geboorteplaats onbekend**. Bij een niet gevonden of dubbelzinnige plaats wordt geen locatie geraden: kies uit de gevonden plaatsen of verduidelijk de woonplaats in het beheer. Via **Andere plaats kiezen** kun je een gevonden plaats corrigeren. Deze kaartkeuze geldt voor de huidige weergave; maak de opgeslagen woonplaats nauwkeuriger om de keuze bij een volgende opening eenduidig te maken.
- Sleep en zoom op de kaart of kies **Alles in beeld**. De bestaande muisbediening van de stamboom is onafhankelijk van de kaart.

In het CMS hebben **Huidige woonplaats** en **Geboorteplaats** een tijdelijke zoekhulp. Na minimaal drie tekens en 400 ms typpauze verschijnen passende plaatsen met regio en land. Een unieke exacte overeenkomst krijgt ‘Plaats gevonden’; bij een onvolledige, dubbelzinnige of onbekende plaats helpt de feedback om de eigen invoer te verduidelijken. Klik op een suggestie om de volledige plaatsnaam in het veld over te nemen; dit kan ook met de pijltjestoetsen en Enter. Escape sluit de lijst. Alleen de tekst in het plaatsveld wordt opgeslagen, dus de zelf ingevoerde tekst of de gekozen plaatsnaam. Ook historische of onbekende plaatsen blijven bewaarbaar; ontbrekende kaartinstellingen of een API-storing blokkeren het formulier niet.

De CMS-zoekhulp gebruikt `autocomplete=true` en `permanent=false`. De gekozen plaatsnaam kan als veldtekst worden bewaard. Overige gegevens uit de antwoorden, waaronder coördinaten, Mapbox-ID’s en de uitkomst van de controle, blijven uitsluitend tijdelijk in het geopende formulier; deze worden niet aan de database, browseropslag of een cache toegevoegd. Alleen plaatsinvoer gaat naar Mapbox; geen namen of andere formuliergegevens. De verwijzende URL bevat alleen de site-oorsprong, zodat URL-beperkte publieke tokens blijven werken zonder het CMS-pad mee te sturen. Nieuwe invoer breekt eerdere verzoeken af en verbergt verouderde suggesties. De bestaande kaart blijft bij het openen de opgeslagen invoer opnieuw opzoeken.

De lokale instelling is `MAPBOX_ACCESS_TOKEN` in `.env`. Gebruik uitsluitend een publiek Mapbox-token dat begint met `pk.`. Het token wordt alleen aan de kaartcomponent doorgegeven; een geheim `sk.`-token wordt geweigerd. `.env.example` bevat een leeg voorbeeldveld, geen echt token.

Alleen de plaatsnaam wordt voor plaatsbepaling naar Mapbox gestuurd; persoonsnamen worden niet in verzoeken of een Mapbox-dataset meegestuurd. De kaart gebruikt tijdelijke Geocoding API-resultaten, alleen in het geheugen van de geopende weergave. Coördinaten of resultaten worden niet in de database, browseropslag of een eigen cache bewaard. Elke unieke plaatsnaam (gedeeld tussen beide lagen) wordt eenmaal per geopende kaart opgezocht, met maximaal drie gelijktijdige verzoeken. Een nieuwe kaartopening of handmatige herkansing kan nieuwe verzoeken maken. De verplichte Mapbox- en OpenStreetMap-bronvermelding blijft zichtbaar. Zie de [Mapbox-handleiding](https://docs.mapbox.com/mapbox-gl-js/guides/get-started/use-with-npm/) en [uitleg over tijdelijke plaatsbepaling](https://docs.mapbox.com/api/search/geocoding/).

De kaartlagen zijn in een geïsoleerde voorbeeldomgeving gecontroleerd: 13 unieke fictieve personen, 12 markers over beide lagen en zes markers per afzonderlijke laag. Ook beide lagen uitzetten, geboorteplaatsselectie, onafhankelijke plaatskeuzes en behoud daarvan tijdens filterwissels zijn gecontroleerd. Personen zonder plaats blijven in de lijst beschikbaar. Ook de telefoonopmaak op 390 × 844 is gecontroleerd: geen horizontale overloop en de gekozen stip blijft boven het gegevenspaneel zichtbaar. Dit is geen fysieke test van aanraakgebaren. De afscherming van `/kaart` en de bestaande gegevens-API is apart gecontroleerd.

## Verjaardagskalender

Naast **Stamboom** en **Kaart** staat **Verjaardagskalender**. `/verjaardagen` gebruikt dezelfde afgeschermde familiegegevens en toegang als de andere weergaven. `/voorbeeld/verjaardagen` en `/voorvertoning/verjaardagen` zijn alleen bij een lege database beschikbaar en bevatten uitsluitend fictieve personen en verzonnen geboortedatums.

De kalender groepeert op maand en dag en toont de geboortedatum en de leeftijd die iemand in het gekozen kalenderjaar bereikt. Je kunt zoeken, een maand kiezen, de levensstatus filteren en het kalenderjaar wisselen. Een klik opent de gewone persoonsgegevens. De datum van vandaag volgt de tijdzone Europe/Amsterdam.

Onvolledige datums blijven apart zichtbaar: er wordt geen dag, maand of geboortejaar geraden. Zonder geboortejaar verschijnt geen berekende leeftijd. Alleen bij een als overleden gemarkeerde persoon staat **Zou … jaar worden**. Zonder overlijdensvinkje gebruikt de kalender **Wordt … jaar**, **Werd … jaar** of **Vandaag … jaar**, ook bij de opgeslagen status ‘onbekend’. Er worden daarvoor geen levensstatussen aangepast. Een verjaardag op 29 februari blijft op die datum staan, ook in een niet-schrikkeljaar; er wordt geen vervangende vierdag gekozen. Geboorten na het gekozen jaar leveren geen negatieve leeftijd op.

Met **Download .ics** download je de verjaardagen uit je huidige selectie (zoekopdracht, maand en filter) voor import in een agenda. Het getal op de knop geeft het aantal afspraken aan. Voor alle verjaardagen kies je het hele jaar en wis je eventuele filters. Bij een lege selectie is de knop uitgeschakeld.

De export bevat jaarlijks terugkerende afspraken voor de hele dag; deze blokkeren geen tijd en voegen geen herinneringen toe. Het gekozen weergavejaar beperkt de herhaling niet. Alleen personen met een geldige dag én maand gaan mee. Bij een ontbrekend geboortejaar blijft dat in de beschrijving expliciet onbekend; het schrikkeljaar 2000 dient alleen als technisch startpunt van de herhaling. Op 29 februari volgt de afspraak alleen in schrikkeljaren. Overleden personen krijgen **Geboortedag van …** als titel. Leeftijden staan niet vast in een jaarlijks terugkerende titel.

Het bestand wordt lokaal in de browser gemaakt uit de gegevens die je al mag bekijken, zonder nieuwe openbare downloadroute of externe dienst. Alleen naam, geboortedatum en eventueel overlijden gaan mee; foto's, woonplaatsen en overige familiegegevens niet. De voorbeeldkalenders leveren herkenbare `voorbeeld-`-bestanden met uitsluitend fictieve inhoud. De export gebruikt [iCalendar / RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html), met stabiele afspraakcodes, veilige tekst en UTF-8-regelafbreking. Dit is een download voor import, geen automatisch bijgewerkte agenda-abonnering.

## Beheer, als je WordPress gewend bent

Payload is hier de beheeromgeving in dezelfde website. De onderdelen links zijn vergelijkbaar met aparte inhoudstypen in WordPress. Er zijn geen pagina's of berichten om bij te houden.

1. **Personen:** voeg een volledige naam toe. Je kunt daarnaast **Achternaam bij geboorte** invullen; dit optionele veld verschijnt bij de persoonsgegevens en wordt meegenomen bij zoeken. **Huidige woonplaats** is eveneens optioneel: noteer plaats en land om later onderscheid te kunnen maken tussen gelijknamige plaatsen. Een ingevulde woonplaats verschijnt bij de persoonsgegevens. De kaartweergave zoekt deze woonplaats op bij Mapbox en toont de persoon bij het plaatscentrum. Vul alleen bekende datumonderdelen in: alleen een jaar, een maand zonder jaar of geheel onbekend mag. Een leeftijd wordt alleen afgeleid bij voldoende volledige datums; je houdt die nergens handmatig bij.
2. **Overleden:** vink deze checkbox aan als bekend is dat de persoon overleden is. Alleen dan verschijnt de overlijdensdatum; die mag onbekend blijven. Plaats van overlijden is vervallen uit beheer, API en persoonsgegevens. De oude databasekolom blijft behouden om historische gegevens niet te verwijderen; deze heeft geen invloed meer op de validatie. Een leeg vakje bevestigt niet dat iemand nog leeft. Wil je het vinkje uitzetten bij bestaande overlijdensgegevens, wis dan eerst bewust die gegevens. Bestaande opslagwaarden blijven compatibel; je hoeft nergens meer te kiezen tussen ‘in leven’ en ‘onbekend’. De personenlijst toont uitsluitend of overlijden is vastgelegd.
3. **Partnerschappen:** de titel bestaat automatisch uit **naam eerste persoon & naam tweede persoon**. Een naamswijziging werkt ook de bijbehorende titels bij. Titels kun je doorzoeken en sorteren; ze worden niet handmatig ingevuld. Open of maak het paar aan en selecteer bij **Gezamenlijke kinderen** ieder kind één keer. Versleep namen in die lijst om de volgorde bij ontbrekende of gelijke geboortedatums te bepalen. De weergave sorteert gedateerde kinderen automatisch van oudste naar jongste en verandert de opgeslagen lijst niet. Het schema koppelt dit kind automatisch aan beide partners. Een persoon kan meerdere partnerschappen hebben; elk paar heeft een eigen kinderenlijst.
4. **Losse ouder-kindrelaties:** gebruik dit voor uitzonderingen, bijvoorbeeld één bekende ouder of afzonderlijk vastgelegd ouderschap. Deze koppelingen blijven zelfstandig bestaan, ook als een kind uit een kinderenlijst wordt gehaald.
5. **Bewaar** en open/ververs daarna de stamboom. De posities worden opnieuw uit de relaties berekend. Er is geen handmatige positionering of afzonderlijke publicatieknop.

Een kind uit de gezamenlijke lijst halen verwijdert de koppeling met beide partners, behalve eventuele losse ouder-kindrelaties die je afzonderlijk hebt vastgelegd. Een partnerschap met kinderen kan niet ineens worden verwijderd. De partners van een gevulde kinderenlijst kun je evenmin zomaar vervangen; maak voor een andere combinatie een nieuw partnerschap. De relatiestatus mag wel worden bijgewerkt.

Het vakje **Fictieve voorbeeldpersoon** markeert verzonnen proefgegevens. Vink het niet aan bij echte familieleden. In een gemengde database blijven de gemarkeerde personen in hun detailpaneel herkenbaar als fictief. Verwijder relaties eerst voordat je een verbonden persoon verwijdert. Zelfrelaties, dubbele relaties, ongeldige datums en vooroudercirkels worden geweigerd, ook via de API. Gelijktijdige relatiewijzigingen worden in PostgreSQL achter elkaar afgehandeld.

### Portretfoto en apart avatar-icoon

Bij **Personen** staan drie onafhankelijke velden:

- **Portretfoto:** upload een JPG, PNG of WebP van maximaal 10 MB, of kies een bestaande afbeelding. De grotere foto verschijnt bij de persoonsgegevens en vult het fotovak met `object-fit: cover`.
- **Avatarfoto:** kies of upload een aparte foto voor de ronde avatar. Deze verandert de portretfoto niet.
- **Avatar op kaartjes:** kies **Foto (avatarfoto, anders portretfoto)**, initialen of een icoon (persoon, boom, bloem, zon, ster of hart). Foto gebruikt eerst de aparte avatarfoto, daarna de portretfoto en anders initialen. Een gekozen icoon vervangt alleen de avatar; beide fotokeuzes blijven bewaard.

Dezelfde avatar verschijnt ook bij zoeken, gekoppelde familieleden, woonplaatslijsten en verjaardagen. Een ontbrekende of niet meer beschikbare afbeelding valt terug op initialen. Een nog gekoppelde afbeelding kan niet worden verwijderd: ontkoppel of vervang deze eerst bij de persoon.

**Afbeeldingen** is een afgeschermde bibliotheek. Alleen beheerders kunnen uploaden en wijzigen; actieve familieaccounts kunnen afbeeldingen bekijken. Ook de directe bestandslinks en vierkante avatarvarianten controleren de actuele toegang en krijgen `private, no-store`. De voorkant vraagt bestanden rechtstreeks bij de afgeschermde route op, zonder openbare afbeeldingscache. Zie [Payload: uploads en toegangscontrole](https://payloadcms.com/docs/upload/overview).

Bestanden staan lokaal in `uploads/family-media/`, buiten `public/` en buiten versiebeheer. Voor een andere opslagmap kun je `FAMILY_MEDIA_DIR` instellen. Uploads worden verkleind tot maximaal 1600 × 1600 binnen de oorspronkelijke verhouding, als WebP opgeslagen en van bronmetadata ontdaan. Er wordt een vierkante avatar van 160 × 160 gemaakt. De invoergrens voor beeldverwerking is 40 megapixels. Afbeeldingen gaan niet naar een externe fotodienst. Een databaseback-up bevat de verwijzingen; neem bij een volledige herstelkopie ook de uploadsmap mee.

## Bestaande ouder-kindkoppelingen omzetten

Bij deze uitbreiding is een databaseback-up gemaakt en zijn de duidelijk passende bestaande koppelingen naar de gezamenlijke kinderenlijst overgezet. De effectieve familieverbindingen zijn vóór en na de omzetting exact vergeleken. Personen, beheeraccounts en wachtwoorden worden door deze omzetting niet gewijzigd.

De omzetting is alleen eenduidig wanneer een kind precies twee afzonderlijk vastgelegde ouders heeft en die samen precies één bestaand partnerschap vormen. Eén bekende ouder, drie of meer vastgelegde ouders en kinderen die al expliciet aan een partnerschap gekoppeld zijn, blijven ongemoeid. Er wordt geen tweede ouder geraden of nieuw partnerschap verzonnen.

Voor een andere bestaande installatie kun je eerst het voorstel bekijken:

```sh
npm run migrate:children
```

Die opdracht verplaatst nog geen relaties. Na een eigen databaseback-up voer je de passende omzetting uit met:

```sh
npm run migrate:children -- --apply
```

De omzetting gebeurt in één transactie en wordt teruggedraaid als de familieverbindingen niet exact gelijk blijven. De oorspronkelijke relaties worden tevens privé opgeslagen onder `.local-migrations/`, buiten versiebeheer. Een tweede uitvoering verandert eerder omgezette kinderen niet opnieuw. De nieuwe schemamigratie voegt alleen de opslag voor de kinderenlijst toe; in de lokale ontwikkelmodus verzorgt Payload die schema-aanvulling automatisch.

## Schone installatie

Gebruik Node **24.22.3 of nieuwer** (Payload vereist minimaal een ondersteunde Node-versie). Met nvm:

```sh
nvm install
nvm use
npm ci
npm run dev
```

Het project bundelt ook Node 24.22.3 voor de npm-scripts. Bij installeren vanuit een oudere systeem-Node kan npm een enginewaarschuwing geven; gebruik bij voorkeur eerst `nvm use`.

Zonder database-instellingen opent `/` met uitsluitend de vaste fictieve voorbeelden. Een verbonden lege database toont dezelfde voorbeelden. `/admin` legt zo nodig uit dat beheer nog ingesteld moet worden. De voorbeelden slaan geen wijzigingen op en verdwijnen automatisch zodra er eigen personen zijn opgeslagen.

Voor echte lokale opslag:

```sh
npm run setup:local
npm run db:up
npm run admin:create
```

`setup:local` schrijft alleen wanneer `.env` nog niet bestaat. Het genereert een willekeurig databasewachtwoord en geheime Payload-sleutel zonder die te tonen. Het overschrijft geen instellingen of bestaande database. `.env.example` beschrijft de instellingen zonder geheimen. Kies met `admin:create` interactief je eigen naam, e-mail en wachtwoord van minimaal 14 tekens. Het wachtwoord wordt verborgen ingevoerd. Deze opdracht maakt uitsluitend de eerste beheerder aan; volgende beheerders voeg je ingelogd in het beheer toe. De eerste accountregistratie via een anonieme webaanvraag is expliciet geblokkeerd.

Herstart `npm run dev`. In ontwikkelmodus maakt Payload het databaseschema aan en past het schemawijzigingen toe. Een omschakelinstelling is niet nodig: de app controleert de inhoud van de database. Het voorbeeld van 16 personen kun je voor een aparte testinstallatie **optioneel in een lege familiedatabase** opslaan met:

```sh
npm run seed:demo -- --confirm-fictional
```

De opdracht weigert een gevulde familiedatabase en schrijft alles in één transactie. De voorbeelden zijn geen transcriptie van de papieren familieboom.

## Privacy en toegang

Opgeslagen personen, relaties en de familiekaart zijn uitsluitend zichtbaar voor ingelogde beheerders en actieve, uitgenodigde familieleden. Dit geldt ook voor de REST-API. Familieleden krijgen alleen kijkrechten; alleen beheerders mogen gegevens wijzigen. De oude instelling `PUBLIC_FAMILY_READ` wordt niet meer gebruikt en kan de gegevens niet openbaar maken. GraphQL blijft uitgeschakeld. De fictieve voorbeelden zijn uitsluitend beschikbaar zolang er geen opgeslagen personen zijn.

### Google Tag Manager

Container **GTM-T37ZTN97** is gekoppeld aan de gewone stamboom, kaart, verjaardagskalender en gebeurtenissen. De container wordt na de toegangscontrole geladen, via `next/script` met `afterInteractive`. De app voegt geen familienamen, geboortedatums, woonplaatsen, e-mailadressen of inloggegevens aan de meetlaag toe; de standaard containerstart bevat alleen een tijdstip en het opstartevent.

Het inlogscherm, de besloten toegangsmelding, accountbeheer en het CMS laden de container niet. Navigatie naar accountbeheer en terug vanaf het inlogscherm laadt een nieuwe pagina, zodat een eerder geladen container niet op die schermen achterblijft. De losse voorbeeldroutes laden de container evenmin; de gewone homepage bij een lege database wel.

Tags, triggers en eventuele toestemming worden in de eigen GTM-container ingericht. Deze code installeert de container, maar voegt geen GA4-meet-ID, automatische formuliermeting of extra gedragsmetingen toe. Laat tags geen persoonsgegevens of uitnodigingstokens uitlezen en gebruik zo nodig een History Change-trigger voor navigatie binnen de app. De installatie gebruikt de nog ondersteunde JavaScript-containersnippet uit de [Google-installatiehandleiding](https://support.google.com/tagmanager/answer/14847097). Er is geen noscript-iframe: de interactieve applicatie vereist JavaScript.

### Familieleden uitnodigen

1. Log in als beheerder en kies op het dashboard **Familieleden uitnodigen en toegang beheren**, of open `/toegang`.
2. Vul naam en e-mailadres in en kies **Uitnodiging versturen**. Het account krijgt uitsluitend kijkrechten.
3. De ontvanger accepteert de persoonlijke uitnodiging binnen zeven dagen. Daarna vraagt deze op `/inloggen` een eenmalige e-mailcode aan.
4. De code is tien minuten geldig en werkt één keer. Een eigen apparaat kan optioneel dertig dagen worden onthouden; anders duurt de sessie maximaal twaalf uur.
5. Met **Toegang intrekken** maak je alle sessies, openstaande codes en uitnodigingen van die persoon ongeldig. **Opnieuw uitnodigen** maakt een nieuwe uitnodiging; oude sessies worden daarmee niet hersteld.

Er is geen openbare registratie. Uitnodigingen werken alleen voor het vastgelegde account. Een onbekend of ingetrokken e-mailadres krijgt bij een codeaanvraag dezelfde algemene melding, maar geen inlogcode. Familieaccounts kunnen geen andere accounts, sessiegegevens of inloggeheimen opvragen. Op de stamboom en kaart krijgen zij een knop **Uitloggen**; beheerlinks worden verborgen.

### E-mail via Resend (SMTP)

Productie verstuurt uitnodigingen en inlogcodes via Resend met de bestaande SMTP-aansluiting. Lokaal zijn de verzendknoppen uitgeschakeld wanneer de mailinstellingen ontbreken. Er wordt geen succesvolle verzending voorgespiegeld en er worden geen codes in de console getoond.

Uitnodigingen en inlogcodes hebben een gedeelde HTML-opmaak in `src/lib/family-auth/email-templates.ts`, met daarnaast een gewone tekstversie. De opmaak volgt de actuele websitenaam, het logo, de kleuren en de lettertypekeuzes uit **Website-instellingen**. E-mail gebruikt Georgia/Arial als beschikbare vervangers voor de websitelettertypes. Zonder eigen logo verschijnt het stamboomicoon uit `public/email/`. De onderwerpen en de introductie van de uitnodiging blijven instelbaar onder **Inloggen → E-mailteksten**. De opmaak bevat geen trackingpixels, scripts of externe webfonts. De uitnodigingslink en de zescijferige code blijven ongewijzigd werken. Voor deze opmaak is geen apart Resend-template nodig.

Vul de instellingen van de gekozen maildienst privé in `.env` in en herstart de app:

```dotenv
FAMILY_APP_URL=https://familie.jouwdomein.nl
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=
```

`MAIL_FROM` is het afzenderadres dat bij de maildienst is toegestaan. Poort 587 gebruikt verplicht STARTTLS; poort 465 gebruikt directe TLS. Verbindings- en certificaatcontrole blijven aan. Alleen lokale ontwikkeling mag een lokaal HTTP-websiteadres gebruiken. Uitnodigingslinks gebruiken het ingestelde websiteadres, nooit een door een bezoeker opgegeven adres. De aansluiting werkt met een maildienst die SMTP aanbiedt; er wordt geen specifieke aanbieder of betaald abonnement geactiveerd.

### Toegangscontroles

Uitnodigingsgeheimen, codes en sessietokens worden alleen als hash opgeslagen. Een code vervalt na vijf verkeerde pogingen. Er is een minuut wachttijd tussen code-mails en een limiet van vijf nieuwe code-mails per uur per account. Verzoeken worden tevens begrensd per client; zonder vertrouwde proxy geldt die extra grens voor de hele website. Alleen als een eigen proxy het clientadres betrouwbaar overschrijft mag `FAMILY_TRUST_PROXY=true` worden ingesteld.

Accountwijzigingen vereisen een POST vanaf de eigen website. Sessies gebruiken een HttpOnly-cookie, SameSite=Lax en HTTPS in productie. Elke nieuwe gegevensaanvraag controleert de actuele toegang; de geopende familiepagina controleert de sessie daarnaast iedere dertig seconden en bij terugkeer naar het tabblad. Uitloggen herlaadt de pagina volledig. De gegevens-API en dynamische privépagina's mogen niet gedeeld worden gecachet.

`npm run test:accounts` gebruikt automatisch een nieuwe, afzonderlijke testdatabase en onderschept alle testmails in het geheugen: er worden geen echte mails verstuurd en de eigen familiegegevens worden niet gebruikt. De aanvullende HTTP- en browsercontroles zijn eveneens met een afzonderlijke database en fictieve adressen uitgevoerd. Achtergrond: [Payload-authenticatiestrategieën](https://payloadcms.com/docs/authentication/custom-strategies), [OWASP-sessiebeheer](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) en [eenmalige herstelcodes](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

Bewaar `.env`, `.local-admin.txt` en databaseback-ups privé. Ze staan in `.gitignore`. Bestaande beheerders blijven via hun bestaande beheerderslogin werken. Voor lokaal wachtwoordherstel:

```sh
npm run admin:password
```

Deze opdracht vraagt het e-mailadres van een bestaande beheerder en een nieuw verborgen wachtwoord. Zij gebruikt de lokale databasetoegang; bewaar daarom de projectmap en `.env` zorgvuldig.

## Back-up en export

Voor de Docker-database uit `compose.yaml`:

```sh
npm run backup
npm run export:family
```

De eerste opdracht maakt in `backups/` een PostgreSQL-dump met personen, relaties én beheeraccounts, geschikt voor volledig herstel. De tweede maakt een JSON-export van personen en relaties, zonder beheeraccounts. Deze export heeft nu `schemaVersion: 2`: de gezamenlijke kinderen staan bij het partnerschap; `parentages` bevat alleen de afzonderlijk vastgelegde ouder-kindrelaties. Er is geen automatische JSON-import in deze versie. Beide bestanden krijgen beperkte bestandsrechten en staan buiten versiebeheer. Bewaar regelmatig ook een private kopie buiten deze Mac, samen met een afzonderlijke veilige kopie van `.env`.

Herstel eerst naar een **andere** database zodat je de huidige behoudt:

```sh
docker compose exec -T db createdb -U familieboom familieboom_herstel
docker compose exec -T db pg_restore --exit-on-error --no-owner -U familieboom -d familieboom_herstel < backups/NAAM-VAN-DE-BACKUP.dump
```

Controleer de herstelde gegevens door de databasenaam in `DATABASE_URL` naar `familieboom_herstel` te wijzigen en de app te herstarten. `docker compose stop` behoudt de gegevens. Het verwijderen van het Docker-volume verwijdert de database; doe dat niet voor gewoon stoppen of herstarten.

Gebruik je een andere PostgreSQL-server, maak de dump dan met `pg_dump` tegen die server; `npm run backup` richt zich specifiek op de meegeleverde Docker-service.

## Techniek en controles

- Next.js 16.4.6, React 19.3.1, TypeScript 6.0.3.
- Payload en alle officiële Payload-pakketten 3.93.0, met PostgreSQL-adapter.
- React Flow (`@xyflow/react`) 12.12.1; eigen generatie-/partnerindeling, sleep- en toetsenbordbediening.
- PostgreSQL 17 via Docker; geen externe diensten of hosting.
- `package-lock.json` legt de concrete installatie vast. De versies zijn tegen de officiële installatie-instructies én de peer dependencies van de geïnstalleerde pakketten gecontroleerd.

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:database
npm run test:children
npm run test:titles
npm run test:photos
npm run check:layout
```

`test:database` maakt een aparte `familieboom_check_<tijdstip>`-database op dezelfde server. Zij wijzigt de familiedatabase niet en vermeldt de gebruikte testdatabasenaam na afloop. Voor deze controle heeft de databasegebruiker rechten nodig om een database aan te maken. Het meegeleverde lokale Docker-account heeft die. De testdatabase kan daarna apart met `dropdb` worden verwijderd.

`test:children` maakt eveneens automatisch een afzonderlijke testdatabase. Die controle behandelt de gezamenlijke kinderenlijst, behoud bij omzetting, losse uitzonderingen, wijzigen en verwijderen, toegangscontrole en gelijktijdige cirkelcontrole. De werkdatabase wordt niet gewijzigd.

`test:titles` gebruikt fictieve personen in een nieuwe afzonderlijke database voor titels, hernoemen, zoeken/sorteren, behoud van kinderen en toegang. `check:layout` leest de huidige relaties en geboortegegevens voor de indeling, gebruikt fictieve namen tijdens de controle en toont alleen aantallen. Het controleert kindposities, gezinsfocus en overlappende kaarten zonder persoonsgegevens uit te voeren of gegevens te schrijven.

De gezinsfocus wordt getest op meerdere partnerschappen, afzonderlijke ouders, gezamenlijke kinderen, het gezin van een kind, grote gezinnen op mobiel en behoud van alle bronposities. `check:layout` controleert daarnaast alle gezinsgroepen van de huidige familie zonder namen uit te voeren. De browsercontrole bevestigt gezinsfocus vanuit beide partners, terugkeer naar het overzicht, de minimap op desktop/mobiel en de bestaande muisinteractie.

`test:photos` gebruikt een nieuwe testdatabase en tijdelijke fictieve beeldbestanden voor upload, formaatconversie, metadata, afzonderlijke icoonkeuze, verwijderbeveiliging, uploadlimiet, toegang tot originelen en avatars en directe intrekking van toegang. Er worden geen echte foto's, accounts of e-mails gebruikt. De browserproef voor foto en icoon is eveneens met uitsluitend fictieve gegevens in een afzonderlijke omgeving uitgevoerd.

De migratie `20261116_180458_partnership_titles` voegt de doorzoekbare titel toe en vult bestaande titels vanuit de gekoppelde namen. Voor een bestaande ontwikkelomgeving met automatische schema-aanpassing kan na een back-up `npm run sync:titles` worden gebruikt. Die opdracht past uitsluitend afgeleide titels aan en controleert binnen dezelfde transactie dat alle overige partnerschapsvelden gelijk blijven.

In ontwikkelmodus is `/interaction-check` een browsercontrole die de echte homepage `/` in een frame opent. De controle test vier richtingen, vier bereikbare uitersten, stilstand, uitsluiten van touch, pauze, klikken, trackpad-onderbreking, bedieningsknoppen en de naamkaart. Zij verandert geen databasegegevens. De vaste controles gebruiken fictieve personen; voer ze daarom uit in een afzonderlijke lege testomgeving. Er is geen omschakeling naar voorbeelden voor een gevulde database. In een productiebuild geeft deze controlepagina 404. Een browserscript dat gebaren nabootst vervangt geen gebruikstest op een fysiek toestel.

De map `src/migrations/` bevat de initiële schemamigratie. De normale lokale ontwikkeling gebruikt Payloads automatische schema-aanpassing. Meng die niet met het alsnog uitvoeren van de initiële migratie op dezelfde al ingerichte database. Voor een nieuwe productieachtige database: voer migraties uit vóór `npm start`; publicatie is in deze opdracht niet ingericht.

De pakketcontrole had na het vastzetten van DOMPurify 3.4.18 geen hoge of kritieke meldingen meer. Er bleven meldingen met lage en matige ernst in onderliggende Payload-/ontwikkelpakketten, waaronder `deepmerge` en oude Drizzle-tooling. Gebruik geen blinde `npm audit fix --force`: de voorgestelde oplossing bevat incompatibele Payload-downgrades. Voor externe ingebruikname hoort opnieuw een actuele pakketcontrole plaats te vinden.

## Belangrijkste bestanden

| Bestand                                             | Doel                                                |
| --------------------------------------------------- | --------------------------------------------------- |
| `src/components/FamilyTree.tsx`                     | Schema, zoeken, details en bediening                |
| `src/app/(frontend)/globals.css`                    | Rustige vormgeving, desktop en telefoon             |
| `src/lib/layout.ts`                                 | Posities uit ouderschap en partnergroepen           |
| `src/lib/pan.ts`                                    | Beeldgrenzen en subtiele muisbeweging               |
| `src/lib/dates.ts`                                  | Onvolledige datums, weergave en afgeleide leeftijd  |
| `src/collections/collections.ts`                    | Datamodel, controles en transactiebeveiliging       |
| `src/collections/access.ts`                         | Lees- en schrijfrechten                             |
| `src/lib/load-family.ts`                            | Alleen toegestane gegevens doorgeven aan het schema |
| `src/payload.config.ts`                             | Payload, Nederlandstalig beheer en PostgreSQL       |
| `compose.yaml`, `.env.example`                      | Lokale database en instellingen                     |
| `tests/domain.test.ts`, `scripts/check-database.ts` | Gedrag- en databasecontroles                        |

Officiële referenties: [Payload installeren](https://payloadcms.com/docs/getting-started/installation), [PostgreSQL-adapter](https://payloadcms.com/docs/database/postgres), [toegangscontrole](https://payloadcms.com/docs/access-control/overview), [React Flow](https://reactflow.dev/api-reference/react-flow). Raadpleeg voor de Next-versie ook de meegeleverde documentatie in `node_modules/next/dist/docs/`.

De voorvertoning gebruikt daarnaast `src/lib/focus.ts` voor stamfocus en `src/lib/connections.ts` met `src/components/ParentageEdge.tsx` en `PartnershipEdge.tsx` voor de gebogen verbindingen. `tests/upward-layout.test.ts` controleert richting, takruimte, partners, losse personen en determinisme. Het gegevensmodel, de database en de bestaande `src/lib/pan.ts` zijn voor dit ontwerp niet gewijzigd.

De gezamenlijke kinderenlijst gebruikt `src/lib/relations.ts` voor de effectieve ouder-kindverbindingen en `scripts/lib/convert-children.ts` voor de gecontroleerde omzetting. Het beheer toont gezamenlijke kinderen bij Partnerschappen en afzonderlijk ouderschap bij Losse ouder-kindrelaties. De grafische indeling en muisbediening zijn daarbij niet aangepast.

## Gebeurtenissen en verhalen

**Gebeurtenissen** is het vierde familieoverzicht. De tijdlijn toont de nieuwste gebeurtenissen bovenaan; verhalen zonder jaartal staan onderaan. Zoek op titel, verhaal, plaats of een gekoppeld familielid, of filter op jaar en betrokken persoon. Een kaartje opent het volledige verhaal via `/gebeurtenissen?event=…`. Vanuit het verhaal open je de persoonsgegevens; daar staat een lijst met alle gekoppelde gebeurtenissen. Terugnavigeren in de browser blijft werken. Verhalen vallen onder dezelfde afscherming als de stamboom. Voorbeelden verschijnen uitsluitend wanneer zowel personen als gebeurtenissen ontbreken; een niet bereikbare database geeft geen vervangende voorbeelden.

In **CMS → Gebeurtenissen** maak je een titel, een eventueel onvolledige datum, een optionele plaats met de bestaande plaatszoekhulp, een optionele omslagfoto en betrokken personen aan. Er zijn geen soort- of deelnemersvelden. Familieleden hebben alleen leesrechten; beheerders beheren de verhalen.

Het veld **Verhaal** gebruikt de zelfstandige Gutenberg-editor, geladen bij het bewerken van gebeurtenissen. Beschikbare blokken: alinea, tussenkop (niveau 2–4), lijst, citaat, scheidingslijn, afbeelding en fotogalerij. Met de blokwerkbalk wijzig je de volgorde of verwijder je een blok. Eigen knoppen bieden ongedaan maken en opnieuw. Afbeeldingen hebben een bijschrift en optionele beschrijving; de mediakiezer ondersteunt bestaande foto’s en nieuwe JPG-, PNG- en WebP-uploads tot 10 MB. Een galerij bevat afbeeldingsblokken die je afzonderlijk kunt ordenen en van een bijschrift voorzien. Er is geen WordPress-installatie nodig.

De opslag is JSON met een expliciete formaatversie en verwijzingen naar Payload-media. De server controleert ondersteunde blokken, afmetingen van de blokstructuur en bestaande afbeeldingen. Alleen toegestane inline HTML wordt bewaard; scripts, willekeurige HTML, externe afbeeldings-URL’s en editoridentificaties worden verwijderd of geweigerd. Foto’s worden via de afgeschermde bestandsroute getoond, zonder openbare afbeeldingproxy. Het verwijderen van gekoppelde personen of afbeeldingen wordt geweigerd totdat hun koppelingen bewust zijn weggehaald. Ook wijzigingen in deze koppelingen gebruiken de bestaande transactievergrendeling.

De migratie `20261118_123225_gebeurtenissen` voegt uitsluitend de gebeurtenissentabellen, relaties en bijbehorende indexen toe. Voer bij een productie-update zoals gebruikelijk `npm run payload -- migrate` uit vóór het starten van de nieuwe applicatie. De migratie en het terugdraaien daarvan zijn in een geïsoleerde testdatabase gecontroleerd. De JSON-familie-export bevat nu ook gebeurtenissen (schemaVersion 3); een volledige databaseback-up bevat eveneens alle verhalen. Uploadbestanden blijven onderdeel van de afzonderlijke mediaback-up.


## Website-instellingen en CMS-huisstijl

**Website → Website-instellingen** bevat zes onderdelen:

- **Naam & logo:** websitenaam, familienaam, woordmerk, websitebeschrijving, logo en browsericoon.
- **Huisstijl:** kleuren met een kleurkiezer en codeveld, en lettertypen voor titels en tekst. Lora, DM Sans en het systeemlettertype zijn beschikbaar; de meegeleverde lettertypen worden lokaal geladen.
- **Pagina’s & modules:** Stamboom, Kaart, Verjaardagen en Gebeurtenissen aan- of uitzetten, menunamen, korte menunamen, browsertitels, overzichtstitels, boventitels, introducties en afzonderlijke voorbeeldtitels. Gedeelde titels, de stamboomnotitie en de bewaartekst zijn hier ook aanpasbaar.
- **Inloggen:** teksten voor inloggen, uitnodigen, codes en de afgeschermde toegangspagina; daarnaast de onderwerpen en introductie van uitnodigingsmails. De afzendernaam volgt de websitenaam. Codes, hun geldigheidsduur en de uitnodigingslink blijven automatisch beheerd.
- **Instellingen:** beginindeling van de stamboom, muisbeweging en sterkte, minimap, stamboomcijfers, kalenderexport, aanvankelijke kaartlagen en Google Tag Manager. Een persoonlijke keuze voor de stamboomindeling blijft behouden.
- **Beheer:** welkomstteksten op het dashboard en CMS-inlogscherm en titels/introductie van familietoegang.

Gebruik `{familienaam}` en `{websitenaam}` voor namen die automatisch moeten meeveranderen. Het code-inlogscherm ondersteunt ook `{email}`. Teksten worden als tekst weergegeven. Na opslaan zijn wijzigingen beschikbaar bij het volgende openen of verversen van een pagina; er is geen nieuwe build nodig. Een uitgeschakelde module verdwijnt uit het menu en de directe route is niet beschikbaar. Als de stamboom uit staat, gaat de startpagina naar de eerste actieve module. Ten minste één module moet aan blijven. Deze schakelaars beheren de websiteweergaven; bestaande CMS-inhoud blijft behouden en bewerkbaar.

**Huisstijlbestanden** is een aparte, openbare uploadcollectie voor logo’s en browsericonen. Zij accepteert PNG, JPG en WebP, verwijdert bronmetadata en begrenst de beeldafmetingen. Zet hier geen privéfoto’s in. Alleen beheerders kunnen bestanden of instellingen wijzigen; gekoppelde logo’s kunnen pas worden verwijderd nadat de koppeling bij de website-instellingen is weggehaald. Persoons- en gebeurtenisfoto’s blijven in de bestaande afgeschermde collectie **Afbeeldingen**. Huisstijlbestanden staan in `uploads/brand-assets/` (eventueel te wijzigen met `BRAND_ASSETS_DIR`). Neem bij een volledige back-up zowel de database als **beide** uploadmappen mee. De JSON-familie-export bevat familiegegevens; website-instellingen zitten in de volledige databaseback-up.

Het CMS gebruikt dezelfde instelbare kernkleuren en lettertypen als de website, met een eigen inlogscherm, logo, navigatie en dashboard. Database-instellingen, geheime sleutels, SMTP-inloggegevens en Mapbox-toegang blijven serverinstellingen. Deze worden niet via de openbare websiteconfiguratie gedeeld. De bestaande toegangscontrole voor familiegegevens blijft gelden, ongeacht welke modules of teksten zijn gekozen.

De migratie `20261118_205605_website_instellingen` voegt de instellingen en openbare huisstijlcollectie toe en vult de huidige waarden in. Zij wijzigt geen personen, familiebanden of verhalen. Voer bij een productie-update de migraties uit vóór het starten van de nieuwe applicatie. Zowel migreren als terugdraaien, opslag, deelwijzigingen, toegangsrechten, gekoppelde bestanden en invoervalidatie zijn in een aparte testdatabase gecontroleerd.

De gebeurteniskaartjes hebben geen knop-padding. Hun thumbnails hebben een vaste verhouding van 4:3 op brede schermen en 16:9 op mobiel, met `object-fit: cover`. De omslagfoto boven een geopend verhaal gebruikt 16:9. Foto’s in het verhaal zelf behouden hun oorspronkelijke verhouding.


## Deployen op Vercel

De applicatiefuncties draaien in Frankfurt (`fra1` in `vercel.json`), dicht bij de Neon-database in dezelfde regio. Houd die regio's bij elkaar om onnodige netwerkwachttijd te voorkomen. De familiepagina's blijven per verzoek afgeschermd en op de server gerenderd. Bij wisselen van weergave verschijnt direct een laadindicator; tijdens het ophalen blijft een lichte navigatieschil zichtbaar. Op mobiel staan extra weergaveopties achter een uitklapknop, zodat de inhoud meer schermruimte krijgt.

De repository bevat `vercel.json` met een eigen buildopdracht. Gebruik in Vercel **Framework: Next.js**, **Node.js: 24.x** en laat een eventueel handmatig ingestelde Build Command leeg zodat de opdracht uit de repository geldt. De toegestane Node-versie is begrensd op hoofdversie 24. De productiebuild controleert de vereiste variabelen en voert eerst Payload-migraties uit; daarna volgt de Next.js-build. Een mislukte migratie stopt de deployment. Voor een bestaande database die buiten de migraties om is ingericht, moeten migratiehistorie en schema eerst worden gecontroleerd; voer daar niet zomaar de initiële migratie op uit.

Variabelen voor **Production**:

| Variabele | Inhoud |
| --- | --- |
| `DATABASE_URL` | De door Neon toegevoegde gepoolde PostgreSQL-verbinding. |
| `DATABASE_URL_UNPOOLED` | Indien beschikbaar: de directe verbinding voor migraties. |
| `PAYLOAD_SECRET` | Een vaste, willekeurige geheime sleutel van minimaal 32 tekens. |
| `BLOB_READ_WRITE_TOKEN` | Token van de gekoppelde **Private** Blob-opslag. |
| `FAMILY_APP_URL` | Het exacte openbare HTTPS-websiteadres voor uitnodigingen en formulierverzoeken. |
| `NEXT_PUBLIC_SERVER_URL` | Hetzelfde openbare websiteadres. |
| `MAPBOX_ACCESS_TOKEN` | Een publiek `pk.`-token, met de online oorsprong toegestaan bij eventuele URL-beperkingen. |

`POSTGRES_PASSWORD` hoort bij de lokale Docker-database en hoeft niet naar Vercel. De bestaande SMTP-variabelen zijn nodig wanneer uitnodigingsmails en inlogcodes gebruikt gaan worden. Zet geheimen uitsluitend in de omgeving en nooit in Git of chatberichten. Nieuwe variabelen gelden na een nieuwe deployment.

### Privé-opslag van afbeeldingen

De officiële Blob-adapter voor de gebruikte Payload-versie 3.93.0 ondersteunt alleen publieke Blob-bestanden. De applicatie gebruikt daarom `src/lib/blob-storage.ts` met de officiële cloud-storage-plugin en `@vercel/blob`, expliciet met `access: 'private'`. Originelen en avatars staan onder `family-media/`; huisstijlbestanden onder `brand-assets/`. Er worden geen publieke Blob-URL’s aan het CMS of de website teruggegeven. De bestaande Payload-routes controleren de toegang tot familiefoto’s, ook bij directe links en ingetrokken accounts. De Blob wordt pas opgehaald nadat toegang en de bijbehorende databaseverwijzing zijn gecontroleerd. Antwoorden krijgen `private, no-store`. Logo’s blijven via hun eigen openbare Payload-route zichtbaar voor het inlogscherm, terwijl de achterliggende Blob eveneens privé is.

Op Vercel geldt **4 MB per upload**, met ruimte voor formuliergegevens onder de 4,5 MB-verzoeklimiet. Dit geldt voor de CMS-uploadroute, het persoonsformulier en de verhaleneditor. Verkleinen, metadata verwijderen en avatars genereren gebeurt nog steeds op de server. Lokaal blijft de grens 10 MB. Een rechtstreekse browserupload voor grotere bestanden is geen onderdeel van deze koppeling.

De plugin voegt in alle omgevingen dezelfde verborgen velden `prefix` en `_objectKey` toe. De migratie `20261124_155805_private_blob_storage` voegt hiervoor vier kolommen toe zonder bestaande bestandsnamen of fotokoppelingen te wijzigen. Zonder token blijft lokale opslag actief. Met een Blob-token wordt de lokale schijf niet gebruikt voor nieuwe uploads. Ontbreekt het token op Vercel, dan stopt de configuratie met een duidelijke foutmelding.

### Bestaande familiegegevens overzetten

Een nieuwe Neon-database en Blob store zijn leeg. Een Git-push of geslaagde build kopieert **geen** lokale familiegegevens of bestanden. Voor de eenmalige overdracht van de huidige lokale database is `scripts/transfer-production.ts` beschikbaar. Dit script leest `.env` uitsluitend als lokale bron en een apart, niet bijgehouden bestand `.env.overdracht.local` als doel:

```dotenv
TRANSFER_DATABASE_URL=postgresql://…@….neon.tech/…?sslmode=require
TRANSFER_BLOB_READ_WRITE_TOKEN=…
TRANSFER_SITE_URL=https://www.familiezuurbier.nl
```

Gebruik de **directe** Neon-verbinding, zonder `-pooler` in de hostnaam, en het token van dezelfde privé-Blob store als in Vercel. Laat de gewone `.env` ongewijzigd. Deel deze verbindingswaarden niet in Git of chat. Het overdrachtsbestand krijgt alleen lees- en schrijfrechten voor de lokale gebruiker.

```sh
npm run transfer:prepare
# Gebruik de mapnaam die de voorbereiding afdrukt:
npm run transfer:plan -- --snapshot backups/overdracht-…
npm run transfer:apply -- --snapshot backups/overdracht-…
npm run transfer:verify -- --snapshot backups/overdracht-…
```

De voorbereiding maakt onder `backups/` een privé-controlekopie van de over te zetten tabellen en alle originele afbeeldingen en avatars, met aantallen en SHA-256-controlesommen. Deze kopie bevat persoonsgegevens en wachtwoordhashes en blijft buiten Git. De bron wordt alleen gelezen. Plan en uitvoering controleren het actuele schema, de productiemigratie, de identiteit van de website via de aanmaakdatum van de website-instellingen, lege familietabellen, ongewijzigde standaardinstellingen en een lege Blob store. Bij bestaande online inhoud stopt de overdracht; het is geen synchronisatie- of overschrijfprogramma.

Vóór de import is een geslaagde, verse lokale databaseback-up verplicht. Afbeeldingen worden zonder overschrijven privé geplaatst en teruggelezen voor een bytecontrole. Daarna worden alle databasegegevens in één transactie geïmporteerd, met behoud van IDs, kindvolgorde, fotoverwijzingen, verhalen en CMS-instellingen. Bestaande beheerders kunnen hun wachtwoord blijven gebruiken. Sessies, inlogcodes, uitnodigingsgeheimen en wachtwoordhersteltokens worden niet gekopieerd; bij bestaande uitgenodigde familieaccounts is een nieuwe uitnodiging nodig. De productieomgeving behoudt haar eigen migratiehistorie. Media-URL’s verwijzen naar de eigen Payload-bestandsroutes.

Bij een fout vóór de databasebevestiging wordt de transactie teruggedraaid en worden uitsluitend de door deze overdracht succesvol geplaatste bestanden voor opruiming aangeboden. Bij een **onzekere databasebevestiging blijven bestanden staan**: voer eerst de nacontrole uit met dezelfde controlekopie, start geen nieuwe import en controleer het lokale voortgangsbestand. Ook wanneer opruimen mislukt, worden bestaande online bestanden nooit blind verwijderd. Bewaar de lokale herstelkopie totdat de online omgeving is gecontroleerd; verwijder daarna de online verbindingswaarden uit het tijdelijke overdrachtsbestand.

De databaseoverdracht is beproefd met fictieve gegevens op een wegwerpdatabase: echte migraties, foto- en verhaalverwijzingen, kindvolgorde, behoud van het bestaande beheerderswachtwoord en terugdraaien van zowel rijen als ID-volgordes. Voor die proef wordt alleen `TRANSFER_CHECK_DATABASE_URL` op `127.0.0.1:54330/transfer_check` geaccepteerd; de gewone `npm test` slaat de proef zonder die variabele over.

Gebruik voor Preview een aparte database en Blob store. Previewbuilds voeren bewust **geen** automatische migraties uit, zodat een gedeelde productiedatabase niet per ongeluk wordt gewijzigd. Bereid de previewdatabase afzonderlijk met dezelfde migraties voor en stel een passend, vast previewadres in voor de inlogformulieren. Productiegegevens en productietokens horen niet in ongecontroleerde previews.

De opslagkoppeling is gecontroleerd met geïsoleerde PostgreSQL en een fictieve Blob-backend: verwerkte foto plus avatar, geen bronmetadata, directe toegangscontrole, onmiddellijke intrekking, openbare logo-route, ontbrekende bestanden, verwijdering en de 4 MB-grens. Voor deze controle:

```sh
# Alleen een wegwerpdatabase op 127.0.0.1:54330/blob_check wordt geaccepteerd.
BLOB_CHECK_DATABASE_URL='postgresql://…@127.0.0.1:54330/blob_check' npx vitest run tests/blob-storage.integration.test.ts
```

Deze proef verstuurt geen familiefoto’s naar een echte Blob store. De werkelijke online upload/download moet na het koppelen en deployen nog worden gecontroleerd. De gewone `npm test` slaat deze databaseproef over wanneer de aparte testvariabele ontbreekt.
