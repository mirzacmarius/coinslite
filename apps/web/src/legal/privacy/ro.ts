import type { LegalText } from "../types";

export default {
  title: "Politica de confidențialitate",
  description:
    "Ce păstrează CoinsLite despre tine și colecția ta, de ce, cine prelucrează datele, cât timp sunt păstrate și ce drepturi ai.",
  sections: [
    {
      id: "who",
      heading: "Cine suntem",
      blocks: [
        "CoinsLite este o aplicație web în care îți înregistrezi monedele, bancnotele și timbrele pe care le ai. Este administrată de {operator}, {address} („noi”). Suntem operatorul datelor cu caracter personal descrise aici. Pentru orice întrebare despre această politică sau despre datele tale, scrie la {email}.",
      ],
    },
    {
      id: "data",
      heading: "Ce păstrăm",
      blocks: [
        [
          "Contul tău: adresa de e-mail, numele afișat, limba și moneda de bază pe care le alegi, momentul în care ai acceptat acești termeni, ultima conectare, notele de versiune pe care le-ai văzut și, dacă le adaugi pentru raportul de asigurare, numele complet, adresa, codul poștal, localitatea, țara și numărul de telefon.",
          "Colecția ta: obiectele tale cu tot ce introduci despre ele (date descriptive, stare, cantitate, preț de achiziție, valoare de piață, data și sursa achiziției, note), albumele tale și fotografiile pe care le adaugi.",
          "Date de conectare: un hash al parolei, dacă folosești una, sesiunile tale, codurile și linkurile de scurtă durată pe care ți le trimitem prin e-mail și numărul încercărilor de conectare eșuate. Dacă te conectezi cu Google, primim adresa ta de e-mail, faptul că Google a verificat-o sau nu, numele tău și adresa fotografiei tale de profil.",
          "Planul tău: dacă ai planul gratuit sau Premium și, pentru Premium, perioada, prețul, moneda și sfârșitul perioadei curente a abonamentului, așa cum le raportează Polar.",
          "Mesajele tale: mesajele pe care ni le trimiți din pagina contului, cu adresa ta de e-mail și ID-ul contului.",
          "Date tehnice: adresa ta IP și informații despre browser ajung la furnizorii noștri de găzduire la fiecare cerere și pot apărea în jurnalele lor.",
          "Statistici de utilizare: ce pagini ale aplicației și ale acestui site sunt deschise, site-ul care a trimis spre ele, browserul, sistemul de operare și tipul de dispozitiv, precum și locația ta aproximativă (țară, regiune și oraș), dedusă din adresa ta IP. Sunt numărate fără cookie-uri și fără contul tău, iar adresele paginilor omit identificatorii obiectelor și albumelor tale, termenii de căutare și codurile de conectare.",
        ],
        "Nu cerem și nu dorim date sensibile, cum ar fi cele despre sănătate sau religie. Te rugăm ca notele despre obiecte să se refere doar la obiecte.",
      ],
    },
    {
      id: "purposes",
      heading: "De ce le folosim și pe ce temei legal",
      blocks: [
        [
          "Pentru a-ți oferi CoinsLite conform acordului nostru (executarea unui contract): contul tău, colecția ta și totalurile ei, rapoartele și exporturile pe care le ceri, e-mailurile care te conectează sau confirmă o modificare și Premium, dacă îl cumperi.",
          "Pentru ca CoinsLite să rămână sigur și funcțional (interesul nostru legitim): limităm conectările eșuate și cât de repede pot fi trimise fișiere și mesaje, găsim și corectăm erori și prevenim abuzurile.",
          "Pentru a afla ce părți din CoinsLite sunt folosite, ca să le putem îmbunătăți (interesul nostru legitim): statistici de utilizare, numărate prin OpenPanel fără cookie-uri și fără să știm cine ești. Un blocator de conținut din browser le oprește.",
          "Pentru a-ți răspunde (interesul nostru legitim): răspunsuri la mesaje și solicitări.",
          "Pentru a ne îndeplini obligațiile legale (obligație legală): de exemplu, păstrarea documentelor pe care suntem obligați să le păstrăm.",
        ],
        "Nu îți vindem datele, nu afișăm reclame și nu folosim datele tale pentru profilare sau marketing. Statisticile noastre de utilizare nu te identifică și nimic nu te urmărește pe alte site-uri.",
      ],
    },
    {
      id: "processors",
      heading: "Cine le prelucrează pentru noi",
      blocks: [
        "Folosim acești furnizori. Fiecare primește doar ce îi trebuie pentru sarcina lui:",
        [
          "Convex: găzduiește backendul, baza de date și fișierele stocate, inclusiv fotografiile tale. Deține toate datele de mai sus.",
          "Vercel: găzduiește aplicația și acest site. Gestionează fiecare cerere de pagină, cu adresa ta IP și informații despre browser.",
          "Resend: trimite e-mailurile noastre. Primește adresa ta de e-mail și mesajul, de exemplu un cod de conectare sau un link de confirmare.",
          "Google: doar dacă alegi să te conectezi cu Google, conform propriei politici de confidențialitate a Google.",
          "Polar: vinde Premium ca vânzător înregistrat (merchant of record). Când treci la Premium, Polar primește adresa ta de e-mail, ID-ul contului și adresa IP (pentru a alege moneda și taxele) și colectează direct datele tale de plată. Polar acționează ca operator independent pentru plată, conform propriei politici de confidențialitate.",
          "Anthropic: doar când folosești scanerul de monede (o versiune beta în Premium), Anthropic primește cele două fotografii pe care le faci și intrările de catalog posibile, pentru a sugera ce monedă este. Nu se trimite nimic care să te identifice.",
          "Sentry: înregistrează erorile din aplicație și, pentru un eșantion de pagini, cât durează încărcarea lor, ca să putem găsi și corecta problemele. Cu fiecare raport primește adresa paginii (fără parametrii de interogare), informații despre browser și dispozitiv și locația ta aproximativă. Nu păstrează adresa ta IP, rapoartele nu te numesc niciodată, iar datele rămân în Germania.",
          "OpenPanel: numără cum sunt folosite aplicația și acest site. La fiecare pagină vizualizată primește titlul și adresa paginii (fără identificatorii obiectelor și albumelor tale, termeni de căutare sau coduri de conectare), site-ul de proveniență, informații despre browser și dispozitiv și adresa ta IP. Deduce din ele locația ta aproximativă și un identificator de vizitator care se schimbă zilnic, apoi șterge adresa IP. Nu setează cookie-uri și păstrează datele în Germania.",
          "MetalpriceAPI: furnizează prețurile spot și cursurile de schimb. Cererile noastre nu conțin date cu caracter personal.",
        ],
      ],
    },
    {
      id: "transfers",
      heading: "Transferuri internaționale",
      blocks: [
        "Unii dintre acești furnizori au sediul sau stochează date în Statele Unite ori în alte țări din afara Spațiului Economic European. Când datele părăsesc SEE, transferul este protejat prin garanții acceptate de GDPR, cum ar fi o decizie privind caracterul adecvat sau clauzele contractuale standard ale Comisiei Europene. Scrie la {email} pentru o copie.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookie-uri și stocare locală",
      blocks: [
        "CoinsLite păstrează doar ce îi trebuie ca să funcționeze. Nimic nu este folosit pentru reclame sau urmărire, iar statisticile noastre de utilizare nu setează cookie-uri, așa că nu cerem consimțământ pentru cookie-uri.",
        [
          "Conectare: cookie-urile __convexAuthJWT și __convexAuthRefreshToken te mențin conectat, iar __convexAuthOAuthVerifier există cât timp te conectezi cu Google. Intrări corespunzătoare care încep cu __convexAuth sunt păstrate în stocarea locală a browserului.",
          "coinslite-signed-in (cookie, un an): îi spune acestui site că ești conectat, ca să deschidă aplicația în locul paginii principale.",
          "coinslite-language (cookie, un an): limba pe care ai ales-o, în aplicație și pe acest site.",
          "Next-Locale (cookie, până închizi browserul): limba paginii afișate.",
          "theme (stocare locală): aspect luminos, întunecat sau cel al sistemului.",
          "collection.display (stocare locală): listă sau grilă și câte obiecte afișează o pagină.",
          "coinslite:catalog-recent (stocare locală): ultimele intrări de catalog alese, până la șase pentru fiecare tip de obiect.",
          "coinslite-email-change (stocare locală): o schimbare a adresei de e-mail care așteaptă confirmarea ta; se șterge după ce e finalizată.",
        ],
        "Stocarea locală rămâne pe dispozitivul tău. O poți șterge, împreună cu cookie-urile, oricând din browser; vei fi apoi deconectat, iar preferințele vor fi resetate.",
      ],
    },
    {
      id: "retention",
      heading: "Cât timp le păstrăm",
      blocks: [
        "Îți păstrăm datele cât timp ai un cont.",
        [
          "Ștergerea contului (Cont, apoi Șterge contul) elimină definitiv profilul, metodele de conectare și sesiunile, obiectele, albumele și fotografiile tale, precum și legătura cu abonamentul. Cea mai mare parte dispare imediat; restul unei colecții mari urmează la scurt timp, în fundal.",
          "Rămâne doar mențiunea că un ID de cont a fost șters, fără a numi pe cineva, pentru ca un mesaj întârziat de la Polar despre el să încheie abonamentul la care se referă.",
          "Fotografiile încărcate, dar niciodată salvate, de exemplu dintr-o scanare pe care nu o păstrezi, se șterg în câteva ore.",
          "Datele șterse pot rămâne până la {backupDays} zile în copiile de siguranță ale backendului nostru și până la {logDays} zile în jurnalele furnizorilor de găzduire, după care dispar.",
          "E-mailurile cu mesajele tale rămân în căsuța noastră până le ștergem. Polar păstrează evidențele plăților atât cât cere legea.",
        ],
      ],
    },
    {
      id: "rights",
      heading: "Drepturile tale",
      blocks: [
        "Conform GDPR și legilor similare, ai aceste drepturi. Pe cele mai multe le poți exercita singur în aplicație; pentru restul, scrie la {email} și îți răspundem în cel mult o lună.",
        [
          "Acces: află ce date avem despre tine. Pagina contului și colecția ta le arată, iar la cerere îți trimitem o copie completă.",
          "Rectificare: modifică-ți datele în pagina contului și obiectele în aplicație.",
          "Ștergere: șterge-ți contul și tot ce conține din pagina contului.",
          "Portabilitate: cere o copie a datelor tale într-un format care poate fi citit automat. Este gratuită în orice plan. Cu Premium îți poți exporta și singur colecția în format CSV.",
          "Opoziție: opune-te prelucrărilor pe care le facem pe baza intereselor noastre legitime.",
          "Retragerea consimțământului: acolo unde ne bazăm pe consimțământul tău, îl poți retrage oricând, fără a afecta ce s-a făcut înainte.",
          "Plângere: depune o plângere la autoritatea de supraveghere, {authority}, sau la cea din locul în care locuiești sau lucrezi.",
        ],
      ],
    },
    {
      id: "security",
      heading: "Securitate",
      blocks: [
        "Datele circulă criptat. Parolele sunt păstrate doar ca hash-uri. Fotografiile tale sunt private: sunt afișate doar ție, prin linkuri care nu mai funcționează după cel mult o zi. Doar câțiva administratori pot vedea date de cont precum nume, adrese de e-mail, planuri și câte obiecte are un cont, și doar pentru a administra serviciul.",
      ],
    },
    {
      id: "children",
      heading: "Copii",
      blocks: [
        "CoinsLite nu este destinat copiilor. Trebuie să ai cel puțin 16 ani ca să creezi un cont. Dacă afli că un copil ne-a transmis date, scrie la {email} și le vom șterge.",
      ],
    },
    {
      id: "changes",
      heading: "Modificări ale acestei politici",
      blocks: [
        "Când modificăm această politică, actualizăm data de sus. Dacă o modificare contează pentru modul în care îți folosim datele, te anunțăm prin e-mail sau în aplicație înainte să se aplice.",
      ],
    },
  ],
} satisfies LegalText;
