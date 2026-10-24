import type { LegalText } from "../types";

export default {
  title: "Vilkår for bruk",
  description:
    "Avtalen mellom deg og CoinsLite: abonnementene, betaling og oppsigelse, innholdet ditt, katalogen, verdier og vårt ansvar.",
  sections: [
    {
      id: "agreement",
      heading: "Avtalen",
      blocks: [
        "Disse vilkårene er en avtale mellom deg og {operator}, {address} («vi»), som driver CoinsLite. Når du oppretter en konto, godtar du dem sammen med personvernerklæringen. Du må være minst 16 år.",
      ],
    },
    {
      id: "service",
      heading: "Tjenesten og abonnementene",
      blocks: [
        "Med CoinsLite kan du registrere myntene, sedlene og frimerkene du eier, organisere dem og holde oversikt over hva du betalte og hva de er verdt.",
        [
          "Gratisplan: opptil {limit} objekter, telt som objekter uansett antall.",
          "Premium: ubegrenset antall objekter, pluss forsikringsrapporten og eksport til PDF og CSV. Selges per måned eller per år, til prisene som vises på nettstedet vårt og i appen når du oppgraderer.",
        ],
        "Premium selges gjennom Polar, som er forhandler (merchant of record): Polar er selgeren du betaler, håndterer betaling og avgifter, og Polars egne vilkår gjelder for kjøpet.",
      ],
    },
    {
      id: "billing",
      heading: "Fornyelse og oppsigelse",
      blocks: [
        [
          "Premium fornyes automatisk ved slutten av hver måned eller hvert år til du sier det opp.",
          "Du kan si opp når som helst fra kontosiden. Premium fortsetter da til slutten av perioden du har betalt for, og fornyes ikke.",
          "Refusjon og angrerett håndteres av Polar som selger, etter Polars vilkår og forbrukerlovgivningen som gjelder for deg.",
          "Hvis vi endrer prisen på Premium, gir vi deg beskjed før den nye prisen gjelder for abonnementet ditt, så du kan si opp først.",
          "Når Premium tar slutt, går du tilbake til gratisplanen. Ingenting går tapt: alle objekter forblir synlige og kan redigeres, også over {limit} objekter. Du kan bare ikke legge til nye objekter så lenge du har mer enn {limit}.",
        ],
      ],
    },
    {
      id: "use",
      heading: "Akseptabel bruk",
      blocks: [
        "Bruk CoinsLite lovlig og til din egen samling. Du skal ikke:",
        [
          "laste opp innhold du ikke har rett til å bruke, eller som er ulovlig eller støtende;",
          "prøve å få tilgang til andres opplysninger eller omgå grenser, abonnement eller sikkerhet;",
          "overbelaste tjenesten eller kopiere katalogen i stort omfang med automatiserte midler;",
          "videreselge eller dele tilgang til tjenesten.",
        ],
        "Bryter en konto disse reglene, kan vi sperre eller stenge den. Med mindre loven eller en akutt risiko er til hinder for det, gir vi deg beskjed først og en mulighet til å svare.",
      ],
    },
    {
      id: "content",
      heading: "Innholdet ditt",
      blocks: [
        "Det du legger inn og bildene du legger til, er fortsatt ditt. Du gir oss lov til å lagre, behandle og vise det til deg bare i den grad det trengs for å drive CoinsLite, for eksempel for å regne ut summene dine, lage rapportene du ber om og, når du bruker skanneren, få bildene dine analysert. Vi publiserer ikke innholdet ditt og bruker det ikke til noe annet.",
        "Deler du et album eller et sett med en lenke, velger du å vise den delen av samlingen din til alle som har lenken, slik personvernerklæringen beskriver, og du er ansvarlig for hva du deler og hvem du gir lenken til. Du kan slutte å dele når som helst.",
      ],
    },
    {
      id: "catalog",
      heading: "Katalogen",
      blocks: [
        "Katalogen bygges av CoinsLite fra kilder med lisenser som tillater det, for eksempel offentlig eide data og offisielle lister, pluss vår egen redigering. Kilde, opphav og lisens krediteres der lisensen krever det. Du kan bruke katalogen til å registrere din egen samling; tekstene og bildene i den tilhører oss og de krediterte eierne. Fakta i katalogen kan inneholde feil: si fra når du finner en.",
      ],
    },
    {
      id: "values",
      heading: "Verdier og rapporter",
      blocks: [
        [
          "Innkjøpspriser og markedsverdier er dine egne tall. Vi kontrollerer dem ikke.",
          "Spotpriser kommer fra en ekstern leverandør, oppdateres jevnlig og er bare veiledende. De kan være forsinket eller feil, og metallverdien er bare en beregning ut fra dem: vekt × finhet × spotpris × antall.",
          "Forsikringsrapporten og eksportene viser verdiene du har valgt. De er ingen takst eller verdivurdering og ingen finansiell rådgivning. Forsikringsselskapet ditt avgjør hva det godtar.",
        ],
      ],
    },
    {
      id: "scanner",
      heading: "Skanneren",
      blocks: [
        "Skanneren, en betaversjon i Premium, foreslår hvilken mynt eller seddel bildene dine viser, og kvaliteten. Forslagene kan være feil, så de vises alltid slik at du kan kontrollere og rette dem før noe lagres.",
      ],
    },
    {
      id: "availability",
      heading: "Tilgjengelighet",
      blocks: [
        "Vi jobber for at CoinsLite skal være tilgjengelig og opplysningene dine trygge, men vi kan ikke love at tjenesten alltid er tilgjengelig eller feilfri. Vi kan endre, legge til eller fjerne funksjoner. Hvis vi noen gang legger ned tjenesten, gir vi deg beskjed minst 30 dager før, så du kan be om en kopi av opplysningene dine.",
      ],
    },
    {
      id: "liability",
      heading: "Ansvar",
      blocks: [
        "Vi er ansvarlige for skade vi volder med forsett eller grov uaktsomhet, og for alt annet loven ikke lar oss fraskrive oss. Ellers er vi ikke ansvarlige for indirekte tap, og vårt samlede ansvar er begrenset til det du har betalt oss de siste 12 månedene før kravet. Ingenting i disse vilkårene begrenser rettighetene dine som forbruker.",
      ],
    },
    {
      id: "ending",
      heading: "Når avtalen opphører",
      blocks: [
        "Du kan slutte når som helst ved å slette kontoen din på kontosiden. Da avsluttes et abonnement som ellers ville blitt fornyet, og opplysningene dine slettes slik personvernerklæringen beskriver.",
      ],
    },
    {
      id: "changes",
      heading: "Endringer i vilkårene",
      blocks: [
        "Vi kan oppdatere disse vilkårene. Vi gir deg beskjed om viktige endringer på e-post eller i appen før de trer i kraft. Er du ikke enig, kan du slette kontoen før det.",
      ],
    },
    {
      id: "law",
      heading: "Lovvalg",
      blocks: [
        "Disse vilkårene er underlagt lovgivningen i {law}. Er du forbruker, beholder du vernet i de ufravikelige reglene i landet der du bor, og du kan reise krav der.",
      ],
    },
    {
      id: "contact",
      heading: "Kontakt",
      blocks: ["{operator}, {address}. E-post: {email}."],
    },
  ],
} satisfies LegalText;
