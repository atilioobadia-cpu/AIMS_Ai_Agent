export const dashboardMetrics = [
  {
    label: "Active clients",
    value: "12",
    detail: "Profiles ready for tax obligation mapping"
  },
  {
    label: "Open reviews",
    value: "4",
    detail: "Draft answers waiting for human approval"
  },
  {
    label: "Approved sources",
    value: "9",
    detail: "TRA and PDPC source chunks"
  },
  {
    label: "Due this month",
    value: "9",
    detail: "VAT, PAYE, SDL, WHT, and annual tasks"
  }
];

export const complianceItems = [
  {
    title: "VAT return",
    client: "Retail client",
    due: "20th"
  },
  {
    title: "PAYE and SDL",
    client: "Service company",
    due: "7th"
  },
  {
    title: "WHT summary",
    client: "Construction client",
    due: "Monthly"
  }
];

export const taxWorkflows = ["PAYE", "SDL", "VAT", "WHT", "Corporate Tax", "Provisional Tax"];

export const sourceHealth = [
  {
    label: "Approved",
    count: "9",
    detail: "Available for citations"
  },
  {
    label: "Needs review",
    count: "0",
    detail: "Source upload is next"
  },
  {
    label: "Outdated",
    count: "0",
    detail: "Blocked from tax answers"
  }
];
