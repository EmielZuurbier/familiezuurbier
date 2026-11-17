# Controle van de opwaartse voorvertoning

De nieuwe indeling is uitsluitend actief op `/voorvertoning`, met de vaste fictieve voorbeeldpersonen. `/` en `/voorbeeld` blijven de eerdere indeling gebruiken. Het beheer, het gegevensmodel, bestaande accounts en opgeslagen familiegegevens zijn voor dit ontwerp niet gewijzigd. De bronfoto en transcriptie zijn niet in de website opgenomen.

## Wat is gecontroleerd

- 28 logische tests slagen. De nieuwe tests behandelen generaties van onder naar boven, ruimte tussen kaarten, partnergroepen en meerdere partners, losse personen, gedeelde voorouders, verschillende oudergeneraties, stabiele uitkomsten bij omgekeerde invoervolgorde en 30 extra vertakkingsvarianten.
- De primaire indeling reserveert per tak ruimte; alle echte ouder-kindverbindingen blijven zichtbaar. De keuze van een hoofdtak voor de ruimteverdeling wijzigt geen gegevens of relaties.
- Gedeelde verbindingspunten worden uitsluitend afgeleid van dezelfde daadwerkelijk vastgelegde verzameling ouders. Een gezamenlijk punt introduceert geen partnerschap of extra ouder.
- De nieuwe indeling en de bestaande fictieve indeling doorlopen ieder dezelfde 16 browsercontroles: vier tegengestelde muisrichtingen, vier bereikbare uitersten, stilstand, uitsluiten van touch voor muisnavigatie, pauze, klikken, trackpad-onderbreking, bediening, naamkaart en persoonsfocus.
- In de werkelijk gerenderde desktopvoorvertoning staan ouders onder kinderen, overlappen de kaarten niet en zijn 18 gebogen ouder-kindverbindingen aanwezig.
- Op 390 × 844 zijn de stamkaarten volledig zichtbaar boven de onderbediening. Zoeken naar een voorbeeldpersoon opent het detailpaneel en brengt die kaart op 100% in beeld boven het paneel. Naar de stam sluit het paneel en toont de stam opnieuw.
- De eerste focus kiest de onderste generatie van de grootste verbonden familie. Losse personen blijven via zoeken en overzicht bereikbaar. Het overzichtspictogram behoudt zijn bestaande betekenis; de afzonderlijke knop Naar de stam brengt de stam terug.
- `npm run typecheck`, `npm run lint` en `npm run build` slagen.
- Leesverzoeken bevestigen dat `/voorvertoning` de nieuwe variant toont, `/voorbeeld` de bestaande variant behoudt en de opgeslagen homepage en personen-API afgeschermd blijven.
- De privétranscriptie, controlelijst en bronuitsneden onder `.local-import/` geven via de website 404. De geselecteerde bronlabels zijn ook niet in de browserbestanden van de productiebuild aanwezig.

De muisberekening in `src/lib/pan.ts` is voor deze opdracht niet gewijzigd. De eerdere mobiele focusoplossing met `focusPending` is behouden. React Flow blijft éénvinger-pannen en tweevinger-pinch verzorgen; echte gebaren op een fysiek toestel zijn in deze controle niet handmatig uitgevoerd.

## Relevante bestanden

- `src/lib/layout.ts`: bestaande indeling plus afzonderlijke `layoutBranchingFamily`.
- `src/lib/focus.ts`: stamselectie en zinvolle eerste focus.
- `src/lib/connections.ts`: gedeelde ouder-kindpunten en omwegen voor lange partnerlijnen.
- `src/components/ParentageEdge.tsx`, `PartnershipEdge.tsx`: de gebogen lijnen.
- `src/components/FamilyTree.tsx`: de expliciete ontwerpvariant, stamknop en ongewijzigde bedieningswijze.
- `tests/upward-layout.test.ts`: gerichte controles voor dit ontwerp.
- `docs/voorvertoning-opwaarts.jpg`: het volledige nieuwe overzicht, alleen fictieve personen.

De privébestanden voor de foto staan apart in `.local-import/controlelijst.md` en `.local-import/kandidaten.json`. Ook goed leesbare kandidaatnamen wachten op familiebevestiging; er is geen foto-import uitgevoerd en geen uitvoerbaar importschema toegevoegd.
