import type { LegalText } from "../types";

export default {
  title: "Personvernerklæring",
  description:
    "Hva CoinsLite lagrer om deg og samlingen din, hvorfor, hvem som behandler det, hvor lenge det lagres, og hvilke rettigheter du har.",
  sections: [
    {
      id: "who",
      heading: "Hvem vi er",
      blocks: [
        "CoinsLite er en nettapp for å registrere myntene, sedlene og frimerkene du eier. Den drives av {operator}, {address} («vi»). Vi er behandlingsansvarlig for personopplysningene som beskrives her. Skriv til {email} om alt som gjelder denne erklæringen eller opplysningene dine.",
      ],
    },
    {
      id: "data",
      heading: "Hva vi lagrer",
      blocks: [
        [
          "Kontoen din: e-postadressen din, visningsnavnet ditt, språket og hjemmevalutaen du velger, når du godtok vilkårene, når du sist logget inn, hvilke versjonsnotater du har sett, og, hvis du legger dem inn for forsikringsrapporten, fullt navn, adresse, postnummer, poststed, land og telefonnummer.",
          "Samlingen din: objektene dine med alt du legger inn om dem (beskrivende fakta, kvalitet, antall, innkjøpspris, markedsverdi, kjøpsdato og kilde, notater), albumene dine og bildene du legger til.",
          "Innloggingsdata: en hash av passordet ditt hvis du bruker et, innloggingsøktene dine, kortvarige koder og lenker vi sender deg på e-post, og en telling av mislykkede innloggingsforsøk. Logger du inn med Google, mottar vi e-postadressen din, om Google har bekreftet den, navnet ditt og adressen til profilbildet ditt.",
          "Abonnementet ditt: om du har gratisplanen eller Premium, og for Premium abonnementets periode, pris, valuta og slutten av gjeldende periode, slik Polar rapporterer dem.",
          "Tilbakemeldinger: meldingene du sender oss fra kontosiden, med e-postadressen og konto-ID-en din.",
          "Tekniske data: IP-adressen din og opplysninger om nettleseren når våre driftsleverandører med hver forespørsel og kan havne i loggene deres.",
          "Bruksstatistikk: hvilke sider i appen og på dette nettstedet som åpnes, nettstedet som lenket dit, nettleseren, operativsystemet og typen enhet du bruker, og omtrent hvor du er (land, region og by), utledet fra IP-adressen din. Den telles uten informasjonskapsler og uten kontoen din, og sideadressene utelater ID-ene til objektene og albumene dine, søkeord og innloggingskoder.",
        ],
        "Vi ber ikke om og ønsker ikke sensitive opplysninger, for eksempel om helse eller religion. Hold notatene om objektene dine til objektene.",
      ],
    },
    {
      id: "purposes",
      heading: "Hvorfor vi bruker dem, og på hvilket rettslig grunnlag",
      blocks: [
        [
          "For å levere CoinsLite etter avtalen med deg (oppfyllelse av en avtale): kontoen din, samlingen din og summene i den, rapportene og eksportene du ber om, e-postene som logger deg inn eller bekrefter en endring, og Premium hvis du kjøper det.",
          "For å holde CoinsLite trygt og i drift (vår berettigede interesse): begrense mislykkede innlogginger og hvor raskt opplastinger og meldinger kan sendes, finne og rette feil, og hindre misbruk.",
          "For å se hvilke deler av CoinsLite som brukes, slik at vi kan forbedre dem (vår berettigede interesse): bruksstatistikk, talt via OpenPanel uten informasjonskapsler og uten at vi vet hvem du er. En innholdsblokkerer i nettleseren stopper den.",
          "For å svare deg (vår berettigede interesse): svar på tilbakemeldinger og henvendelser.",
          "For å oppfylle rettslige plikter (rettslig forpliktelse): for eksempel å oppbevare opplysninger vi er pålagt å oppbevare.",
        ],
        "Vi selger ikke opplysningene dine, viser ikke reklame og bruker ikke opplysningene dine til profilering eller markedsføring. Bruksstatistikken vår identifiserer deg ikke, og ingenting følger deg til andre nettsteder.",
      ],
    },
    {
      id: "processors",
      heading: "Hvem som behandler dem for oss",
      blocks: [
        "Vi bruker disse leverandørene. Hver av dem mottar bare det den trenger til sin oppgave:",
        [
          "Convex: drifter backend, database og lagrede filer, også bildene dine. Den har alle opplysningene ovenfor.",
          "Vercel: drifter appen og dette nettstedet. Den håndterer hver sideforespørsel, med IP-adressen din og opplysninger om nettleseren.",
          "Resend: sender e-postene våre. Den mottar e-postadressen din og meldingen, for eksempel en innloggingskode eller en bekreftelseslenke.",
          "Google: bare hvis du velger å logge inn med Google, etter Googles egen personvernerklæring.",
          "Polar: selger Premium som forhandler (merchant of record). Når du oppgraderer, mottar Polar e-postadressen din, konto-ID-en din og IP-adressen din (for å velge valuta og avgift), og samler inn betalingsopplysningene dine direkte. Polar er selvstendig behandlingsansvarlig for betalingen, etter sin egen personvernerklæring.",
          "Anthropic: bare når du bruker myntskanneren (en betaversjon i Premium), mottar Anthropic de to bildene du tar og de mulige katalogoppføringene, for å foreslå hvilken mynt det er. Ingenting som identifiserer deg, sendes.",
          "Sentry: registrerer feil i appen, og hvor lang tid et utvalg av sidene bruker på å laste, slik at vi kan finne og rette problemer. Med hver rapport mottar den sideadressen (uten spørrestrengen), opplysninger om nettleseren og enheten og din omtrentlige plassering. Den lagrer ikke IP-adressen din, rapportene navngir deg aldri, og dataene lagres i Tyskland.",
          "OpenPanel: teller hvordan appen og dette nettstedet brukes. Ved hver sidevisning mottar den sidetittelen og sideadressen (uten ID-ene til objektene og albumene dine, søkeord eller innloggingskoder), nettstedet som lenket dit, opplysninger om nettleseren og enheten og IP-adressen din. Den utleder din omtrentlige plassering og en besøkende-ID som endres hver dag, og forkaster deretter IP-adressen. Den setter ingen informasjonskapsler og lagrer dataene i Tyskland.",
          "MetalpriceAPI: leverer spotpriser og valutakurser. Forespørslene våre inneholder ingen personopplysninger.",
        ],
      ],
    },
    {
      id: "transfers",
      heading: "Overføring til andre land",
      blocks: [
        "Noen av disse leverandørene holder til i, eller lagrer data i, USA eller andre land utenfor EØS. Når opplysninger forlater EØS, er overføringen sikret med garantier som personvernforordningen godtar, for eksempel en beslutning om tilstrekkelig beskyttelsesnivå eller EU-kommisjonens standardkontraktsbestemmelser. Skriv til {email} for å få en kopi.",
      ],
    },
    {
      id: "cookies",
      heading: "Informasjonskapsler og lokal lagring",
      blocks: [
        "CoinsLite lagrer bare det den trenger for å fungere. Ingenting brukes til reklame eller sporing, og bruksstatistikken vår setter ingen informasjonskapsler, så vi ber ikke om samtykke til informasjonskapsler.",
        [
          "Innlogging: informasjonskapslene __convexAuthJWT og __convexAuthRefreshToken holder deg innlogget, og __convexAuthOAuthVerifier finnes mens du logger inn med Google. Tilsvarende oppføringer som begynner med __convexAuth, ligger i nettleserens lokale lagring.",
          "coinslite-signed-in (informasjonskapsel, ett år): forteller dette nettstedet at du er innlogget, så det åpner appen i stedet for forsiden.",
          "coinslite-language (informasjonskapsel, ett år): språket du valgte, i appen og på dette nettstedet.",
          "Next-Locale (informasjonskapsel, til du lukker nettleseren): språket på siden som vises.",
          "theme (lokal lagring): lyst, mørkt eller systemets utseende.",
          "collection.display (lokal lagring): liste eller rutenett, og hvor mange objekter en side viser.",
          "coinslite:catalog-recent (lokal lagring): de siste katalogoppføringene du valgte, opptil seks per objekttype.",
          "coinslite-email-change (lokal lagring): en endring av e-postadresse som venter på at du bekrefter den; fjernes når den er gjennomført.",
        ],
        "Lokal lagring blir værende på enheten din. Du kan når som helst tømme den og informasjonskapslene i nettleseren; da blir du logget ut, og innstillingene tilbakestilles.",
      ],
    },
    {
      id: "retention",
      heading: "Hvor lenge vi lagrer dem",
      blocks: [
        "Vi lagrer opplysningene dine så lenge du har en konto.",
        [
          "Sletter du kontoen (Konto, deretter Slett kontoen), fjernes profilen, innloggingsmetodene og øktene dine, objektene, albumene og bildene dine og koblingen til abonnementet ditt for godt. Det meste forsvinner med en gang; resten av en stor samling følger kort tid etter i bakgrunnen.",
          "Det som blir igjen, er en opplysning om at en konto-ID er slettet, som ikke navngir noen, slik at en sen melding fra Polar om den avslutter abonnementet den gjelder.",
          "Bilder du laster opp, men aldri lagrer, for eksempel fra en skanning du ikke beholder, slettes innen noen timer.",
          "Slettede opplysninger kan ligge igjen i sikkerhetskopiene til backenden vår i opptil {backupDays} dager og i driftsleverandørenes logger i opptil {logDays} dager, deretter er de borte.",
          "E-poster med tilbakemeldinger blir liggende i innboksen vår til vi sletter dem. Polar oppbevarer betalingsopplysninger så lenge loven krever det.",
        ],
      ],
    },
    {
      id: "rights",
      heading: "Rettighetene dine",
      blocks: [
        "Etter personvernforordningen og lignende lover har du disse rettighetene. De fleste kan du bruke selv i appen; for resten kan du skrive til {email}, så svarer vi innen en måned.",
        [
          "Innsyn: se hva vi har om deg. Kontosiden og samlingen viser det, og vi sender en fullstendig kopi på forespørsel.",
          "Retting: endre opplysningene dine på kontosiden og objektene dine i appen.",
          "Sletting: slett kontoen din og alt i den fra kontosiden.",
          "Dataportabilitet: be om en kopi av opplysningene dine i et maskinlesbart format. Det er gratis i alle abonnement. Med Premium kan du også eksportere samlingen som CSV selv.",
          "Protest: protester mot det vi gjør på grunnlag av våre berettigede interesser.",
          "Tilbaketrekking av samtykke: der vi bygger på samtykket ditt, kan du trekke det tilbake når som helst, uten at det påvirker det som er gjort før.",
          "Klage: klag til tilsynsmyndigheten, {authority}, eller til den der du bor eller arbeider.",
        ],
      ],
    },
    {
      id: "security",
      heading: "Sikkerhet",
      blocks: [
        "Data overføres kryptert. Passord lagres bare som hasher. Bildene dine er private: de vises bare for deg, gjennom lenker som slutter å virke innen en time. Bare noen få administratorer kan se kontoopplysninger som navn, e-postadresser, abonnement og hvor mange objekter en konto har, og bare for å drive tjenesten.",
      ],
    },
    {
      id: "children",
      heading: "Barn",
      blocks: [
        "CoinsLite er ikke ment for barn. Du må være minst 16 år for å opprette en konto. Tror du at et barn har gitt oss opplysninger, kan du skrive til {email}, så sletter vi dem.",
      ],
    },
    {
      id: "changes",
      heading: "Endringer i denne erklæringen",
      blocks: [
        "Når vi endrer erklæringen, oppdaterer vi datoen øverst. Har endringen betydning for hvordan vi bruker opplysningene dine, gir vi deg beskjed på e-post eller i appen før den trer i kraft.",
      ],
    },
  ],
} satisfies LegalText;
