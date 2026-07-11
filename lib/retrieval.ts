import { getKnowledgeBase, type KnowledgeEntry } from "@/lib/knowledge-base";
import type { ChatResponse, RetrievedSource } from "@/lib/types";

const STOP_WORDS = new Set([
  "a",
  "about",
  "and",
  "are",
  "at",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "je",
  "kwa",
  "la",
  "my",
  "na",
  "ni",
  "of",
  "on",
  "or",
  "the",
  "to",
  "wa",
  "what",
  "when",
  "ya"
]);

const SYNONYMS: Record<string, string[]> = {
  biashara: ["business", "starting", "registration", "tin"],
  kampuni: ["company", "corporation", "corporate"],
  kodi: ["tax", "tra", "compliance"],
  lini: ["when", "deadline", "due"],
  mshahara: ["salary", "payroll", "paye", "employee"],
  mwajiri: ["employer", "paye", "withholding"],
  mwajiriwa: ["employee", "employment", "paye"],
  tarehe: ["deadline", "due", "return"],
  inalipwa: ["payment", "payable", "due"],
  malipo: ["payment", "payable", "due"],
  ongezeko: ["vat", "value", "added"],
  usajili: ["registration", "register", "certificate"],
  vyanzo: ["source", "sources", "acts", "library"],
  vat: ["value", "added", "tax"],
  tin: ["taxpayer", "identification", "registration"],
  paye: ["salary", "payroll", "withholding", "employee"],
  wht: ["withholding", "tax"],
  privacy: ["personal", "data", "pdpc"],
  data: ["privacy", "personal", "pdpc"]
};

const SWAHILI_BULLETS: Record<string, string[]> = {
  "tra-starting-business-tin": [
    "Individual anaomba TIN kupitia TRA Taxpayer Portal na anahitaji kitambulisho rasmi kama National ID, Passport ID, au Voter ID.",
    "Kwa business TIN, TRA inaorodhesha introduction letter kutoka local government na lease agreement au title deed ya eneo la biashara.",
    "Company huanza kwa kusajiliwa BRELA, kisha husajiliwa kwenye taxpayer portal na kuendelea na assessment, returns, na tax clearance kupitia TRA.",
    "Partnership inahitaji BRELA registration, partnership deed, lease agreement au title deed, local government introduction letter, na TIN handling ya partners."
  ],
  "tra-vat-registration-threshold": [
    "VAT registration ni mandatory kama taxable turnover imefika TZS 200 million ndani ya miezi 12 au TZS 100 million ndani ya miezi 6 inayoishia mwezi uliopita.",
    "Mtu anayetakiwa kusajili VAT anatakiwa kuomba kwa Commissioner General ndani ya siku 30.",
    "Maombi hufanywa kupitia TRA Taxpayer Portal / IDRAS baada ya kuingia kwenye portal.",
    "Baada ya registration, taxpayer hupata VAT registration certificate na anatakiwa kuonyesha TIN na VAT registration number kwenye official VAT documents."
  ],
  "tra-vat-rates-returns": [
    "Kiwango cha kawaida cha VAT kwa taxable supplies na taxable imports Tanzania Mainland ni 18%.",
    "Exports of goods na baadhi ya services ni zero-rated kwa 0%.",
    "VAT registered traders hu-submit VAT returns online kupitia taxpayer portal.",
    "VAT inalipwa tarehe 20 ya mwezi unaofuata; tarehe hiyo pia ndiyo deadline ya ku-submit VAT return."
  ],
  "tra-corporation-tax-basics": [
    "Corporation tax hutozwa kwenye taxable income au profits za entities kama limited companies, institutions, clubs, societies, associations, co-operatives, charities, na unincorporated bodies nyingine.",
    "TRA inaorodhesha limited companies, trusts, clubs, non-governmental associations, co-operative societies, charitable organizations, domestic permanent establishments, political parties, na government agencies kama persons required to pay corporation tax.",
    "TRA inasema partnership hailipi income tax moja kwa moja; partners hutozwa income tax kwenye distributed partnership profits kulingana na agreed sharing ratio."
  ],
  "tra-corporation-tax-returns": [
    "Registered companies na individuals wanaotakiwa kuandaa audited accounts hu-file statement of estimated tax payable.",
    "TRA inaonyesha due dates zinazohusiana na accounting period: 31 March, 30 June, 30 September, na 31 December.",
    "First instalment inalipwa wakati estimated tax statement ina-submitiwa, na instalments zinazofuata hufuata due dates zilizoainishwa.",
    "Final returns hu-submitiwa ndani ya miezi sita baada ya mwisho wa accounting period; self-assessed final tax inalipwa siku ya ku-submit final return."
  ],
  "tra-paye-basics": [
    "PAYE maana yake ni Pay-As-You-Earn na ni withholding tax kwenye taxable incomes za employees.",
    "Employer anatakiwa kisheria kukata income tax kutoka kwenye taxable income ya employee.",
    "TRA inaeleza employee kwa upana, ikijumuisha permanent, part-time, manager, director, na casual employees.",
    "Employment income inaweza kujumuisha wages, salary, leave pay, fees, commissions, bonuses, gratuity, allowances, reimbursements, retirement contributions/payments, termination payments, na benefits in kind pale inapohusika."
  ],
  "pdpc-establishment": [
    "PDPC ilianzishwa rasmi tarehe May 1, 2023.",
    "Uanzishwaji huo ulifuata kutungwa kwa Personal Data Protection Act No. 11, 2022.",
    "Tax chatbot inatakiwa kuepuka kukusanya TIN, NIDA, payroll, bank, na tax assessment data bila sababu, na iwe na retention na access controls kabla ya production."
  ],
  "pdpc-controller-processor": [
    "Data controller huamua purpose na means za processing ya personal data.",
    "Data processor huchakata personal data kwa niaba ya controller na kwa instructions za controller.",
    "PDPC inaeleza controller responsibilities kama kusimamia matumizi ya data, kusimamia processors, na kuhakikisha data inatumika, inahifadhiwa, na inachakatwa kwa mujibu wa guidelines.",
    "Kwa chatbot hii, business inayoiendesha kwa kawaida itakuwa data controller wa chat data, wakati hosting, analytics, au AI API providers wanaweza kuwa data processors kutegemea setup."
  ],
  "tra-official-source-library": [
    "Source library inatakiwa ku-prioritize TRA Acts, Finance Acts, Regulations, Practice Notices, Tax Tables, Forms, User Manuals, Public Notices, na Tax Calendar content.",
    "Official sources zinatakiwa ziwe versioned na reviewed kabla hazijaruhusiwa kwenye production answers.",
    "Kama sources zinapingana au zimepitwa na wakati, chatbot itengeneze human review badala ya kutoa final advice."
  ]
};

export async function retrieveSources(query: string, limit = 4): Promise<RetrievedSource[]> {
  const knowledgeBase = await getKnowledgeBase();
  const queryTerms = expandTerms(tokenize(query));
  const preferredCategories = inferPreferredCategories(queryTerms);

  const scored = knowledgeBase
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, queryTerms, preferredCategories)
    }))
    .filter((result) => result.score > 0);

  const categoryMatches =
    preferredCategories.length > 0
      ? scored.filter((result) => preferredCategories.includes(result.entry.category))
      : scored;

  return categoryMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry, score }) => toRetrievedSource(entry, score));
}

export async function buildChatResponse(message: string): Promise<ChatResponse> {
  const retrievedSources = await retrieveSources(message);
  const highRisk = isHighRiskQuestion(message);
  const swahili = looksLikeSwahili(message);

  if (retrievedSources.length === 0) {
    return {
      answer: swahili
        ? "Sijapata chanzo rasmi kwenye knowledge base ya sasa kinachotosha kujibu swali hili. Tafadhali uliza kuhusu TIN, VAT, PAYE, corporation tax, au data protection, au ongeza source rasmi kwenye admin source library."
        : "I did not find enough official source support in the current knowledge base. Ask about TIN, VAT, PAYE, corporation tax, or data protection, or add an official source to the admin source library.",
      confidence: "low",
      citations: [],
      retrievedSources: [],
      needsHumanReview: true,
      followUps: defaultFollowUps(swahili)
    };
  }

  const confidence =
    retrievedSources[0]?.score >= 10 && !highRisk
      ? "high"
      : retrievedSources[0]?.score >= 5
        ? "medium"
        : "low";
  const answer = swahili
    ? buildSwahiliAnswer(message, retrievedSources, highRisk)
    : buildEnglishAnswer(message, retrievedSources, highRisk);

  return {
    answer,
    confidence,
    citations: retrievedSources.slice(0, 3).map(({ title, sourceUrl, sourceOrg, effectiveDate, lastReviewed }) => ({
      title,
      sourceUrl,
      sourceOrg,
      effectiveDate,
      lastReviewed
    })),
    retrievedSources,
    needsHumanReview: highRisk || confidence !== "high",
    followUps: followUpsForSources(retrievedSources, swahili)
  };
}

function buildSwahiliAnswer(message: string, sources: RetrievedSource[], highRisk: boolean) {
  const intro = "Nimejibu kwa kutumia source rasmi zilizopo kwenye knowledge base ya MVP.";
  const bullets = sources
    .slice(0, 3)
    .flatMap((source) => SWAHILI_BULLETS[source.id] ?? source.summary.split(" | "))
    .slice(0, 6)
    .map((item) => `- ${item}`)
    .join("\n");
  const assumptions = [
    "- Nimechukulia swali linahusu Tanzania Mainland isipokuwa source imesema United Republic of Tanzania.",
    "- Hili ni jibu la compliance guidance, si final tax opinion kwa dispute, audit, objection, au exposure kubwa.",
    "- Usitume TIN, NIDA, salary details, bank records, au assessment notice kwenye chat mpaka privacy controls ziwekwe kikamilifu."
  ].join("\n");
  const riskNote = highRisk
    ? "\n\nHuman review inapendekezwa kwa sababu swali linaonekana kuwa na risk ya objection, penalty, audit, appeal, au tax exposure."
    : "";

  return `${intro}\n\nMambo muhimu:\n${bullets}\n\nAssumptions na tahadhari:\n${assumptions}${riskNote}\n\nSwali lako: "${message.trim()}"`;
}

function buildEnglishAnswer(message: string, sources: RetrievedSource[], highRisk: boolean) {
  const intro = "I answered using the official sources currently approved in the MVP knowledge base.";
  const bullets = sources
    .slice(0, 3)
    .flatMap((source) => source.summary.split(" | "))
    .slice(0, 6)
    .map((item) => `- ${item}`)
    .join("\n");
  const assumptions = [
    "- I assumed the question is about Tanzania Mainland unless the source says United Republic of Tanzania.",
    "- This is compliance guidance, not a final tax opinion for a dispute, audit, objection, or material exposure.",
    "- Do not submit TIN, NIDA, salary details, bank records, or assessment notices until privacy controls are fully configured."
  ].join("\n");
  const riskNote = highRisk
    ? "\n\nHuman review is recommended because the question appears to involve objection, penalty, audit, appeal, or material tax exposure."
    : "";

  return `${intro}\n\nKey points:\n${bullets}\n\nAssumptions and cautions:\n${assumptions}${riskNote}\n\nYour question: "${message.trim()}"`;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

function expandTerms(terms: string[]) {
  const expanded = new Set(terms);
  for (const term of terms) {
    for (const synonym of SYNONYMS[term] ?? []) {
      expanded.add(synonym);
    }
  }
  return [...expanded];
}

function scoreEntry(entry: KnowledgeEntry, queryTerms: string[], preferredCategories: KnowledgeEntry["category"][]) {
  const haystack = `${entry.title} ${entry.category} ${entry.tags.join(" ")} ${entry.summary} ${entry.content}`.toLowerCase();
  let score = 0;

  for (const term of queryTerms) {
    if (entry.tags.includes(term)) score += 5;
    if (entry.title.toLowerCase().includes(term)) score += 4;
    if (entry.category.includes(term)) score += 3;
    if (haystack.includes(term)) score += 1;
  }

  if (preferredCategories.includes(entry.category)) {
    score += 8;
  }

  return score;
}

function toRetrievedSource(entry: KnowledgeEntry, score: number): RetrievedSource {
  return {
    id: entry.id,
    title: entry.title,
    sourceUrl: entry.sourceUrl,
    sourceOrg: entry.sourceOrg,
    category: entry.category,
    effectiveDate: entry.effectiveDate,
    lastReviewed: entry.lastReviewed,
    score,
    summary: entry.bullets.join(" | ")
  };
}

function looksLikeSwahili(message: string) {
  const lower = message.toLowerCase();
  return /\b(nataka|nini|je|kwa|kodi|biashara|kampuni|mshahara|tarehe|malipo|lini|inalipwa|ipi|kuhusu|usajili|mlipakodi)\b/.test(
    lower
  );
}

function inferPreferredCategories(queryTerms: string[]): KnowledgeEntry["category"][] {
  const terms = new Set(queryTerms);

  if (terms.has("vat") || terms.has("value")) return ["vat"];
  if (terms.has("paye") || terms.has("payroll") || terms.has("salary")) return ["paye"];
  if (terms.has("tin") || terms.has("brela") || terms.has("business")) return ["starting-business"];
  if (terms.has("corporation") || terms.has("corporate") || terms.has("company")) return ["corporation-tax"];
  if (terms.has("privacy") || terms.has("pdpc") || terms.has("personal")) return ["data-protection"];
  if (terms.has("source") || terms.has("sources") || terms.has("acts")) return ["source-library"];
  if (terms.has("upload") || terms.has("uploaded") || terms.has("document") || terms.has("pdf")) {
    return ["uploaded-document"];
  }

  return [];
}

function isHighRiskQuestion(message: string) {
  const lower = message.toLowerCase();
  return /\b(audit|objection|appeal|penalty|fine|dispute|assessment|investigation|court|tribunal|riba|adhabu|pingamizi|rufaa|ukaguzi)\b/.test(
    lower
  );
}

function followUpsForSources(sources: RetrievedSource[], swahili: boolean) {
  const categories = new Set(sources.map((source) => source.category));

  if (swahili) {
    if (categories.has("vat")) {
      return ["VAT threshold ni ipi?", "VAT return inalipwa lini?", "Nahitaji nini kusajili VAT?"];
    }
    if (categories.has("paye")) {
      return ["PAYE ni nini?", "Employer anatakiwa kufanya nini?", "Ni income gani inaingia PAYE?"];
    }
    if (categories.has("starting-business")) {
      return ["TIN ya biashara inahitaji nini?", "Company inaanzia wapi?", "Partnership inahitaji documents gani?"];
    }
    if (categories.has("corporation-tax")) {
      return ["Final return ya kampuni ni lini?", "Estimated tax inalipwa lini?", "Partnership inalipa corporation tax?"];
    }
    return ["Ni sources gani zimekubaliwa?", "Data privacy inahitaji nini?", "Nawezaje kuongeza source mpya?"];
  }

  if (categories.has("vat")) {
    return ["What is the VAT threshold?", "When is a VAT return due?", "What do I need for VAT registration?"];
  }
  if (categories.has("paye")) {
    return ["What is PAYE?", "What must an employer deduct?", "What counts as employment income?"];
  }
  if (categories.has("starting-business")) {
    return ["What do I need for business TIN?", "Where does a company start?", "What documents does a partnership need?"];
  }
  if (categories.has("corporation-tax")) {
    return ["When is a final company return due?", "When are estimated tax instalments due?", "Does a partnership pay corporation tax?"];
  }
  return ["Which sources are approved?", "What does data privacy require?", "How do I add a new official source?"];
}

function defaultFollowUps(swahili: boolean) {
  return swahili
    ? ["VAT return inalipwa lini?", "TIN ya biashara inahitaji nini?", "PAYE ni nini?"]
    : ["When is a VAT return due?", "What do I need for business TIN?", "What is PAYE?"];
}
