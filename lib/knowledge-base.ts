export type KnowledgeEntry = {
  id: string;
  title: string;
  sourceOrg: "TRA" | "PDPC";
  sourceUrl: string;
  category:
    | "starting-business"
    | "vat"
    | "corporation-tax"
    | "paye"
    | "data-protection"
    | "source-library"
    | "uploaded-document";
  jurisdiction: "Tanzania Mainland" | "United Republic of Tanzania";
  effectiveDate?: string;
  lastReviewed: string;
  tags: string[];
  summary: string;
  bullets: string[];
  content: string;
};

export const staticKnowledgeBase: KnowledgeEntry[] = [
  {
    id: "tra-starting-business-tin",
    title: "Starting Business and TIN registration",
    sourceOrg: "TRA",
    sourceUrl: "https://www.tra.go.tz/page/starting-business-income-for-individuals-and-paying-taxes",
    category: "starting-business",
    jurisdiction: "United Republic of Tanzania",
    lastReviewed: "2026-07-07",
    tags: [
      "tin",
      "taxpayer identification number",
      "business registration",
      "brela",
      "starting business",
      "kuanza biashara",
      "namba ya mlipakodi",
      "tax clearance",
      "local government letter",
      "lease agreement",
      "title deed"
    ],
    summary:
      "TRA guidance for individuals, companies, partnerships, trusts, organizations, and groups starting business and applying for TIN.",
    bullets: [
      "Individuals apply for TIN through the TRA Taxpayer Portal and need official identification such as National ID, Passport ID, or Voter ID.",
      "For business TIN, TRA lists local government introduction letter and lease agreement or title deed for the business location.",
      "Companies register with BRELA first, then register on the taxpayer portal and handle assessment, returns, and tax clearance through TRA processes.",
      "Partnerships need BRELA registration, partnership deed, lease agreement or title deed, local government introduction letter, and partner TIN handling."
    ],
    content:
      "TIN taxpayer identification number starting business individual company corporation partnership trust BRELA TRA taxpayer portal tax clearance local government authority letter lease agreement title deed business license tax assessment registration kuanza biashara mlipakodi kampuni ubia."
  },
  {
    id: "tra-vat-registration-threshold",
    title: "VAT registration threshold and process",
    sourceOrg: "TRA",
    sourceUrl: "https://www.tra.go.tz/page/value-added-tax-vat",
    category: "vat",
    jurisdiction: "Tanzania Mainland",
    lastReviewed: "2026-07-07",
    tags: [
      "vat",
      "value added tax",
      "registration",
      "threshold",
      "200 million",
      "100 million",
      "taxpayer portal",
      "idras",
      "professional service providers",
      "vat certificate"
    ],
    summary:
      "TRA VAT guidance states who should register, the turnover thresholds, application timing, and certificate obligations.",
    bullets: [
      "VAT registration is mandatory after taxable turnover reaches TZS 200 million in twelve months or TZS 100 million in six months ending at the previous month.",
      "A person required to register should apply to the Commissioner General within 30 days.",
      "Applications are made through the TRA Taxpayer Portal / IDRAS after logging in.",
      "After registration, the taxpayer receives a VAT registration certificate and should show TIN and VAT registration number in official VAT documents."
    ],
    content:
      "VAT value added tax registration threshold taxable turnover 200 million twelve months 100 million six months professional services government entity intending trader application Commissioner General thirty days Taxpayer Portal IDRAS VAT certificate VRN."
  },
  {
    id: "tra-vat-rates-returns",
    title: "VAT rates, returns, and payment deadline",
    sourceOrg: "TRA",
    sourceUrl: "https://www.tra.go.tz/page/value-added-tax-vat",
    category: "vat",
    jurisdiction: "Tanzania Mainland",
    lastReviewed: "2026-07-07",
    tags: [
      "vat return",
      "return",
      "returns",
      "vat rate",
      "18%",
      "0%",
      "exports",
      "20th",
      "monthly return",
      "input tax",
      "output tax",
      "deadline",
      "due date",
      "due",
      "payment",
      "payable",
      "lini",
      "inalipwa"
    ],
    summary:
      "TRA VAT guidance covers the standard rate, zero rating for exports, input/output VAT treatment, and monthly return deadline.",
    bullets: [
      "TRA states the standard VAT rate for taxable supplies and taxable imports in Mainland Tanzania is 18%.",
      "Exports of goods and certain services are zero-rated at 0%.",
      "VAT registered traders submit VAT returns online through the taxpayer portal.",
      "VAT is payable on the 20th day of the following month, which is also the due date for submitting the VAT return."
    ],
    content:
      "VAT returns payment due date 20th following month monthly return standard rate 18 percent taxable supplies imports export goods services zero rated 0 percent input tax output tax taxpayer portal compliance deadline tarehe ishirini."
  },
  {
    id: "tra-corporation-tax-basics",
    title: "Corporation tax basics",
    sourceOrg: "TRA",
    sourceUrl: "https://www.tra.go.tz/page/corporation-tax",
    category: "corporation-tax",
    jurisdiction: "United Republic of Tanzania",
    lastReviewed: "2026-07-07",
    tags: [
      "corporation tax",
      "corporate tax",
      "company tax",
      "taxable income",
      "profits",
      "limited company",
      "trust",
      "cooperative",
      "ngo",
      "partnership"
    ],
    summary:
      "TRA explains corporation tax as tax on taxable income or profits of entities and lists entities required to pay.",
    bullets: [
      "Corporation tax is charged on taxable income or profits of entities such as limited companies, institutions, clubs, societies, associations, co-operatives, charities, and other unincorporated bodies.",
      "TRA lists limited companies, trusts, clubs, non-governmental associations, co-operative societies, charitable organizations, domestic permanent establishments, political parties, and government agencies as persons required to pay corporation tax.",
      "TRA states partnerships are not liable to pay income tax directly; partners are charged income tax on distributed partnership profits based on the agreed sharing ratio."
    ],
    content:
      "corporation tax corporate tax company tax limited company taxable income profits business undertaking investments trusts clubs NGOs cooperative societies charitable organization permanent establishment branch political party government agency partnership partners profit sharing ratio kampuni kodi ya mapato."
  },
  {
    id: "tra-corporation-tax-returns",
    title: "Corporation tax returns and due dates",
    sourceOrg: "TRA",
    sourceUrl: "https://www.tra.go.tz/page/corporation-tax",
    category: "corporation-tax",
    jurisdiction: "United Republic of Tanzania",
    lastReviewed: "2026-07-07",
    tags: [
      "corporation tax return",
      "estimated tax",
      "provisional return",
      "final return",
      "31 march",
      "30 june",
      "30 september",
      "31 december",
      "six months",
      "accounting period"
    ],
    summary:
      "TRA guidance gives provisional estimated tax dates and the final return timing for corporation tax.",
    bullets: [
      "Registered companies and individuals required to prepare audited accounts file a statement of estimated tax payable.",
      "TRA lists due dates linked to the accounting period: 31 March, 30 June, 30 September, and 31 December.",
      "The first instalment is due when the estimated tax statement is submitted, and later instalments follow the listed due dates.",
      "Final returns are submitted within six months from the end of the accounting period; self-assessed final tax is due on the final return submission date."
    ],
    content:
      "corporation tax estimated tax payable provisional returns final return of income due dates 31 March 30 June 30 September 31 December accounting period six months self assessment instalment tax audited accounts kampuni return tarehe."
  },
  {
    id: "tra-paye-basics",
    title: "PAYE employer withholding obligations",
    sourceOrg: "TRA",
    sourceUrl: "https://www.tra.go.tz/page/pay-as-you-earn",
    category: "paye",
    jurisdiction: "United Republic of Tanzania",
    lastReviewed: "2026-07-07",
    tags: [
      "paye",
      "pay as you earn",
      "employment income",
      "employee",
      "employer",
      "withholding",
      "salary",
      "wages",
      "payroll",
      "mshahara"
    ],
    summary:
      "TRA explains PAYE as withholding tax on taxable incomes of employees and employer deduction obligations.",
    bullets: [
      "PAYE means Pay-As-You-Earn and is a withholding tax on taxable incomes of employees.",
      "An employer is required by law to deduct income tax from an employee's taxable income.",
      "TRA describes employees broadly, including permanent, part-time, manager, director, and casual employees.",
      "Employment income includes wages, salary, payment in lieu of leave, fees, commissions, bonuses, gratuity, allowances, reimbursements, retirement contributions and payments, redundancy or termination payments, and benefits in kind where applicable."
    ],
    content:
      "PAYE pay as you earn withholding tax employment income employee employer salary wages payroll director manager casual part time bonuses gratuity commissions allowance reimbursement benefits in kind taxable income mshahara mwajiri mfanyakazi."
  },
  {
    id: "pdpc-establishment",
    title: "Personal Data Protection Commission establishment",
    sourceOrg: "PDPC",
    sourceUrl: "https://www.pdpc.go.tz/en/about-pdpc/establishment/",
    category: "data-protection",
    jurisdiction: "United Republic of Tanzania",
    effectiveDate: "2023-05-01",
    lastReviewed: "2026-07-07",
    tags: [
      "personal data protection",
      "pdpc",
      "privacy",
      "data protection act",
      "act no 11 2022",
      "data controller",
      "data processor"
    ],
    summary:
      "PDPC states the Commission was officially established on May 1, 2023 after enactment of the Personal Data Protection Act No. 11, 2022.",
    bullets: [
      "PDPC was officially established on May 1, 2023.",
      "The establishment followed enactment of the Personal Data Protection Act No. 11, 2022.",
      "A tax chatbot should avoid unnecessary collection of TIN, NIDA, payroll, bank, and tax assessment data and should define retention and access controls before production use."
    ],
    content:
      "PDPC personal data protection commission Tanzania privacy Personal Data Protection Act No 11 2022 established May 1 2023 data protection chatbot personal information retention consent security taarifa binafsi ulinzi wa data."
  },
  {
    id: "pdpc-controller-processor",
    title: "Data controller and data processor roles",
    sourceOrg: "PDPC",
    sourceUrl: "https://www.pdpc.go.tz/en/protection/data-controller-data-processor/",
    category: "data-protection",
    jurisdiction: "United Republic of Tanzania",
    lastReviewed: "2026-07-07",
    tags: [
      "data controller",
      "data processor",
      "personal data",
      "registration",
      "consent",
      "privacy",
      "security",
      "pdpc"
    ],
    summary:
      "PDPC describes data controllers, data processors, and responsibilities over how personal data is used, stored, and processed.",
    bullets: [
      "A data controller determines the purpose and means of processing personal data.",
      "A data processor processes personal data for and on behalf of the controller under the controller's instructions.",
      "PDPC describes controller responsibilities as overseeing how data is used, supervising processors, and ensuring data is used, stored, and processed according to Commission guidelines.",
      "For this chatbot, the business operating it will usually be the data controller for user chat data, while hosting, analytics, or AI API providers may be data processors depending on the setup."
    ],
    content:
      "data controller determines purpose means processing personal data data processor processes data for controller instructions roles responsibilities consent storing processing PDPC registration privacy security chatbot provider controller processor."
  },
  {
    id: "tra-official-source-library",
    title: "TRA official source library and Acts",
    sourceOrg: "TRA",
    sourceUrl: "https://www.tra.go.tz/resource-center/8",
    category: "source-library",
    jurisdiction: "United Republic of Tanzania",
    lastReviewed: "2026-07-07",
    tags: [
      "acts",
      "finance act",
      "income tax act",
      "vat act",
      "tax administration act",
      "regulations",
      "official sources",
      "source library"
    ],
    summary:
      "TRA resource center lists official tax Acts including Finance Act 2026, Income Tax Act, VAT Act, and Tax Administration Act.",
    bullets: [
      "The source library should prioritize TRA Acts, Finance Acts, Regulations, Practice Notices, Tax Tables, Forms, User Manuals, Public Notices, and Tax Calendar content.",
      "Official sources should be versioned and reviewed before being allowed into production answers.",
      "When sources conflict or are outdated, the chatbot should mark the answer for human tax review instead of giving final advice."
    ],
    content:
      "TRA resource center acts finance act 2026 income tax act value added tax act tax administration act tax revenue appeals regulations tax table public notice official sources approved sources source library knowledge base."
  }
];

export async function getKnowledgeBase(): Promise<KnowledgeEntry[]> {
  try {
    const { getUploadedKnowledgeEntries } = await import("@/lib/document-store");
    const uploaded = await getUploadedKnowledgeEntries();
    return [...uploaded, ...staticKnowledgeBase];
  } catch {
    return staticKnowledgeBase;
  }
}

export const knowledgeBase = staticKnowledgeBase;
