# themonns.no

Monns arbeidsrom for ansatte og kunder. Ett Next.js prosjekt på Vercel, der første mappe i adressen er kunden og andre mappe er prosjektet.

```
themonns.no
├── intern/                    passord for ansatte
│   └── hyttebooking
├── thon/                      passord Thon
│   └── osloairport
├── eiendomsspar/              passord Eiendomsspar
│   └── tryvannstarnet
└── vikaeiendomsforvaltning/   passord Vika
    └── kirkegata
```

Forsiden er innloggingen. Passordet avgjør hvem du er, så ett felt holder. Hver kunde ser bare sin mappe. Søkemotorer er stengt ute.

## Slik kommer det i drift

### 1. Vercel

1. Importer dette repoet som nytt prosjekt i Vercel.
2. Under Settings, Environment Variables, legg inn verdiene fra `.env.example` med ekte passord. Alle passordene må være forskjellige.
3. Sett `TILGANG_HEMMELIGHET` til en lang, tilfeldig tekst. Bytter du den senere, logges alle ut.
4. Deploy. Du får en vercel.app adresse du kan teste på før domenet kobles.

### 2. Domeneshop

Under DNS for themonns.no, legg til to poster:

| Type  | Navn | Verdi                  |
|-------|------|------------------------|
| A     | @    | 76.76.21.21            |
| CNAME | www  | cname.vercel-dns.com   |

Vercel viser de nøyaktige verdiene under Settings, Domains når du legger til `themonns.no` der. Bruk det Vercel viser hvis det avviker fra tabellen. Det tar fra noen minutter til en time før det virker, og Vercel ordner HTTPS selv.

### 3. Test

Åpne `themonns.no/thon` uten å være logget inn. Du skal bli sendt til forsiden. Skriv Thons passord og du skal havne tilbake på `/thon`. Skriv internpassordet i en annen nettleser og prøv `/thon`. Du skal bli stoppet.

## Daglig bruk

**Ny kunde.** Legg til en linje i `lib/kunder.ts` og et passord som miljøvariabel i Vercel. Push, og kunden har sin side.

**Nytt prosjekt.** Legg til prosjektet i kundens liste i `lib/kunder.ts`. Trenger prosjektet egen kode, lag mappen `app/[kunde]/<prosjektslug>/` med en `page.tsx`. Den vinner over standardsiden.

**Bytte passord.** Endre miljøvariabelen i Vercel og deploy på nytt. Kunden skriver det nye passordet neste gang.

**Logge ut.** `themonns.no/logg-ut` fjerner all tilgang i den nettleseren. `/logg-ut?kunde=thon` fjerner bare Thon.

## Fonter

Legg Monns fontfiler i `public/fonts/` med navnene `NyghtSerif-Light.woff2`, `NyghtSerif-Regular.woff2` og `Felix.woff2`. De tas i bruk uten andre endringer. Mangler filene, brukes en lignende serif.

## Lokalt

```
cp .env.example .env.local
npm install
npm run dev
```

## Hvordan tilgangen virker

`proxy.ts` kjører før hver side. Den leser første mappe i adressen, slår opp kunden, og sjekker om nettleseren har en gyldig informasjonskapsel for akkurat den kunden. Kapselen er en signatur av kundens navn, laget med `TILGANG_HEMMELIGHET`, så den kan ikke lages uten å kjenne hemmeligheten. Ingen database, ingen brukerkontoer.
