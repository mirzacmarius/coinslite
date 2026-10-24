import type { LegalText } from "../types";

export default {
  title: "Termeni de utilizare",
  description:
    "Acordul dintre tine și CoinsLite: planurile, plata și anularea, conținutul tău, catalogul, valorile și responsabilitățile noastre.",
  sections: [
    {
      id: "agreement",
      heading: "Acordul",
      blocks: [
        "Acești termeni sunt un acord între tine și {operator}, {address} („noi”), care administrează CoinsLite. Când îți creezi un cont, îi accepți, împreună cu politica de confidențialitate. Trebuie să ai cel puțin 16 ani.",
      ],
    },
    {
      id: "service",
      heading: "Serviciul și planurile lui",
      blocks: [
        "CoinsLite te ajută să înregistrezi monedele, bancnotele și timbrele pe care le ai, să le organizezi și să știi cât ai plătit pe ele și cât valorează.",
        [
          "Plan gratuit: până la {limit} de obiecte, numărate ca obiecte indiferent de cantitate, și exportul CSV.",
          "Premium: obiecte nelimitate, plus raportul de asigurare, exportul PDF și etichete de tipărit. Se vinde lunar sau anual, la prețurile afișate pe site-ul nostru și în aplicație când treci la Premium.",
        ],
        "Premium se vinde prin Polar, care acționează ca vânzător înregistrat (merchant of record): Polar este vânzătorul căruia îi plătești, gestionează plata și taxele, iar pentru cumpărare se aplică propriii lui termeni.",
      ],
    },
    {
      id: "billing",
      heading: "Reînnoire și anulare",
      blocks: [
        [
          "Premium se reînnoiește automat la sfârșitul fiecărei luni sau al fiecărui an, până îl anulezi.",
          "Poți anula oricând din pagina contului. Premium rămâne apoi activ până la sfârșitul perioadei plătite și nu se mai reînnoiește.",
          "Rambursările și dreptul tău de retragere sunt gestionate de Polar, ca vânzător, conform termenilor lui și legislației privind protecția consumatorilor care ți se aplică.",
          "Dacă schimbăm prețul Premium, te anunțăm înainte ca noul preț să se aplice abonamentului tău, ca să poți anula mai întâi.",
          "Când Premium se încheie, revii la planul gratuit. Nu se pierde nimic: toate obiectele rămân vizibile și pot fi editate, chiar și peste {limit} de obiecte. Doar nu poți adăuga obiecte noi cât timp ai mai mult de {limit}.",
        ],
      ],
    },
    {
      id: "use",
      heading: "Utilizare acceptabilă",
      blocks: [
        "Folosește CoinsLite legal și pentru propria colecție. Nu ai voie:",
        [
          "să încarci conținut pe care nu ai dreptul să îl folosești sau care este ilegal ori jignitor;",
          "să încerci să accesezi datele altora sau să ocolești limitele, planurile ori securitatea;",
          "să suprasolicitezi serviciul sau să copiezi catalogul în masă prin mijloace automate;",
          "să revinzi sau să împarți accesul la serviciu.",
        ],
        "Dacă un cont încalcă aceste reguli, îl putem suspenda sau închide. Dacă legea sau un risc urgent nu ne împiedică, te anunțăm mai întâi și îți dăm ocazia să răspunzi.",
      ],
    },
    {
      id: "content",
      heading: "Conținutul tău",
      blocks: [
        "Ce introduci și fotografiile pe care le adaugi rămân ale tale. Ne permiți să le stocăm, să le prelucrăm și să ți le afișăm doar în măsura în care e nevoie pentru funcționarea CoinsLite, de exemplu pentru a-ți calcula totalurile, a genera rapoartele pe care le ceri și, când folosești scanerul, a-ți analiza fotografiile. Nu îți publicăm conținutul și nu îl folosim în niciun alt scop.",
        "Dacă partajezi un album sau un set printr-un link, alegi să arăți acea parte a colecției tale oricui are linkul, așa cum descrie politica de confidențialitate, și ești responsabil pentru ce partajezi și cui dai linkul. Poți opri partajarea oricând.",
      ],
    },
    {
      id: "catalog",
      heading: "Catalogul",
      blocks: [
        "Catalogul este alcătuit de CoinsLite din surse ale căror licențe permit acest lucru, cum ar fi date din domeniul public și liste oficiale, plus propria noastră redactare. Sursa, autorul și licența sunt menționate acolo unde licența o cere. Poți folosi catalogul ca să îți înregistrezi propria colecție; textele și imaginile lui rămân ale noastre și ale titularilor menționați. Datele din catalog pot conține greșeli: spune-ne când găsești una.",
      ],
    },
    {
      id: "values",
      heading: "Valori și rapoarte",
      blocks: [
        [
          "Prețurile de achiziție și valorile de piață sunt cifrele tale. Nu le verificăm.",
          "Prețurile spot provin de la un furnizor extern, se actualizează regulat și sunt doar orientative. Pot fi întârziate sau greșite, iar valoarea metalului este doar un calcul pe baza lor: greutate × titlu × preț spot × cantitate.",
          "Raportul de asigurare și exporturile cuprind valorile pe care le-ai ales. Nu sunt o expertiză, o evaluare sau un sfat financiar. Asigurătorul tău decide ce acceptă.",
        ],
      ],
    },
    {
      id: "scanner",
      heading: "Scanerul",
      blocks: [
        "Scanerul, o versiune beta în Premium, sugerează ce monedă sau bancnotă arată fotografiile tale și în ce stare e. Sugestiile pot fi greșite, de aceea îți sunt mereu afișate ca să le verifici și să le corectezi înainte să se salveze ceva.",
      ],
    },
    {
      id: "availability",
      heading: "Disponibilitate",
      blocks: [
        "Ne străduim ca CoinsLite să fie disponibil și datele tale în siguranță, dar nu putem promite că serviciul va fi mereu disponibil sau fără erori. Putem modifica, adăuga sau elimina funcții. Dacă vom închide vreodată serviciul, te anunțăm cu cel puțin 30 de zile înainte, ca să poți cere o copie a datelor tale.",
      ],
    },
    {
      id: "liability",
      heading: "Răspundere",
      blocks: [
        "Răspundem pentru daunele pe care le cauzăm intenționat sau din culpă gravă și pentru orice altceva legea nu ne permite să excludem. În rest, nu răspundem pentru pierderi indirecte, iar răspunderea noastră totală este limitată la cât ne-ai plătit în cele 12 luni dinaintea pretenției. Nimic din acești termeni nu îți limitează drepturile de consumator.",
      ],
    },
    {
      id: "ending",
      heading: "Încetarea acordului",
      blocks: [
        "Poți renunța oricând ștergându-ți contul din pagina contului. Astfel se încheie orice abonament care s-ar reînnoi, iar datele tale se șterg așa cum descrie politica de confidențialitate.",
      ],
    },
    {
      id: "changes",
      heading: "Modificări ale acestor termeni",
      blocks: [
        "Putem actualiza acești termeni. Te anunțăm despre modificările importante prin e-mail sau în aplicație înainte să se aplice. Dacă nu ești de acord, îți poți șterge contul înainte de acel moment.",
      ],
    },
    {
      id: "law",
      heading: "Legea aplicabilă",
      blocks: [
        "Acești termeni sunt guvernați de legea din {law}. Dacă ești consumator, păstrezi protecția regulilor obligatorii din țara în care locuiești și poți formula o pretenție acolo.",
      ],
    },
    {
      id: "contact",
      heading: "Date de contact",
      blocks: ["{operator}, {address}. E-mail: {email}."],
    },
  ],
} satisfies LegalText;
