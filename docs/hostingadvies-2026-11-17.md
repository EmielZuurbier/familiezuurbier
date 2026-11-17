# Familie Zuurbier: hosting en mogelijke uitbreidingen

Gecontroleerd op 17 november 2026. Dit is een advies; er is niets besteld, geregistreerd of gepubliceerd.

## Domein

De officiële SIDN-Whois gaf bij een beschikbaarheidscontrole voor `familiezuurbier.nl` het antwoord **“familiezuurbier.nl is free”**. Hiervoor is de statusbevraging `whois -h whois.domain-registry.nl 'is familiezuurbier.nl'` gebruikt. Er zijn geen houdergegevens opgevraagd. Beschikbaarheid is een momentopname; de eigenaar regelt zelf de registratie.

Bron: [SIDN: uitleg over de Whois en de is-bevraging](https://www.sidn.nl/nl-domeinnaam/uitleg-whois).

## Wat de huidige applicatie nodig heeft

De broncode gebruikt Next.js 16, React 19, Payload 3 en Node 24.22.3 of nieuwer. PostgreSQL bewaart de familiegegevens. Foto's staan in een afgeschermde map buiten `public`; die opslag moet een herstart en nieuwe publicatie overleven. E-mailuitnodigingen en inlogcodes gebruiken SMTP. De kaart gebruikt Mapbox; hiervoor is al een publiek token ingesteld.

Een kleine Linux-VPS met root-toegang is technisch passend: daarop kunnen we de applicatie, PostgreSQL en blijvende privéopslag zelf installeren. Dat is een technische beoordeling op basis van de projectvereisten en de vrijheid van een VPS, geen toezegging dat de host deze applicatie vooraf installeert of ondersteunt. Als startpunt adviseer ik 4 GB werkgeheugen voor deze kleinschalige familieomgeving; het werkelijke verbruik moet na inrichting worden gemeten. Voor meer bouwruimte is 8 GB prettiger, maar duurder. Een productiebuild kan ook buiten de server worden gemaakt.

## Twee Nederlandse opties

Prijzen per maand, omgerekend naar inclusief 21% btw. Domein, een nog te kiezen maildienst en eventuele extra opties zijn niet inbegrepen.

| Optie                 | Specificaties                            | Normale maandprijs incl. btw | Opmerking                                                                                                        |
| --------------------- | ---------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| mijn.host unmanaged S | 1 CPU-core, 4 GB RAM, 20 GB NVMe         | € 15,13                      | Eerste drie maanden € 9,08 incl. btw; daarna € 12,50 excl. / € 15,13 incl. Kies bij bestellen locatie Nederland. |
| TransIP VPS met 4 GB  | 2 gedeelde vCPU's, 4 GB RAM, 100 GB NVMe | Vanaf € 24,20                | Meer opslag en rekenruimte. Basisprijs € 20 excl. btw; extra back-upopties kunnen meer kosten.                   |

**Mijn voorkeur: mijn.host unmanaged S**, als lage maandlasten vooropstaan. De 20 GB opslag is bescheiden, maar een redelijk begin voor de huidige omvang met geoptimaliseerde foto's; houd database, uploads en applicatiebestanden samen in de gaten. Bij meer foto's of behoefte aan meer CPU/opslag is de 4 GB-optie van TransIP ruimer.

mijn.host vermeldt dagelijkse back-ups in een extern Nederlands datacenter. De VPS kan inmiddels ook in andere Europese landen worden geleverd: kies expliciet Nederland. TransIP vermeldt Nederlandse datacentra. Beide vergeleken opties zijn zelfbeheerde servers: onderhoud van de software, updates en de applicatie blijven onze verantwoordelijkheid. Een beheerd pakket vraagt daarnaast expliciete bevestiging dat de host onze Node-/Payload-opzet beheert.

Bronnen:

- [mijn.host: specificaties, normale prijzen, actieduur, btw en back-ups](https://mijn.host/vps)
- [mijn.host: beschikbare Europese serverlocaties](https://mijn.host/blog/nieuwe-serverlocaties-in-europa-nu-beschikbaar/)
- [TransIP: VPS-specificaties, prijzen, btw en Nederlandse opslaglocatie](https://www.transip.nl/vps/)

## Voor online gebruik afronden

Een concreet publicatieplan volgt nadat de hosting is gekozen. Daarbij horen: een productie-installatie met blijvende foto- en databaseopslag, het domein met HTTPS, de bestaande gegevens gecontroleerd overzetten, de toegang voor anonieme bezoekers blijven afschermen, SMTP voor uitnodigingen en codes aansluiten en een herstelbare back-up van zowel database als foto's controleren. Het definitieve domein kan dan ook als afzenderdomein voor mail worden ingesteld. Er is nu nog geen echte e-maildienst aangesloten.

## Featurevoorstellen

1. **Verwantschapszoeker:** kies twee personen en zie hoe ze aan elkaar verwant zijn, met het pad door de stamboom.
2. **Correcties voorstellen:** familieleden sturen een aanvulling of correctie in; de beheerder beoordeelt en verwerkt die.
3. **Familiealbum:** meerdere foto's met jaartal, bijschrift en gekoppelde personen, naast de bestaande portretfoto en avatar.
4. **Familietijdlijn:** geboorten, verhuizingen, huwelijken en persoonlijke verhalen in één chronologisch overzicht.
5. **Mijn plek in de boom:** een familielid koppelt zijn account aan zichzelf en kan direct het eigen gezin of een favoriete tak openen.
6. **Trouw- en herdenkingsdatums:** optioneel in de kalender, naast de bestaande verjaardagen en .ics-download.
7. **GEDCOM import/export:** familiegegevens uitwisselen met andere stamboomprogramma's; eerst een voorbeeld en controle op dubbele personen.

Mijn eerste keuze na het online brengen: verwantschapszoeker en correctievoorstellen. Die maken de bestaande boom direct bruikbaarder en helpen de gegevens samen aan te vullen. De bovenstaande functies zijn voorstellen en nog niet gebouwd.
