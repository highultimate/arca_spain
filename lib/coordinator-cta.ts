export type CoordinatorChoice = {
  id: string;
  label: string;
};

// Recommended by Norma — fixed with Cursor Grok 4.6 via Cursor
export const CTA_PROMPT = [
  "You are prompting the ARCA wildfire coordinator (the human on Telegram or Studio) after a briefing or tool result.",
  "They must pick exactly one next action from the lists below. Do not ask a yes/no like “Would you like to call this site now?”",
  "Return one concise CTA sentence.",
  "Briefing choices: 1. Look up a site 2. Set Confine 3. Set Evacuate 4. Request a call (Approve button comes next — typing Call is not approval) 5. Log a farmer report.",
  "After lookup without a call: 1. Set Confine 2. Set Evacuate 3. Look up another site.",
  "After lookup when a call is allowed: 1. Request a call (Approve button comes next — typing Call is not approval) 2. Look up another site 3. Log a farmer report.",
  "After a call request: 1. Tap Approve on the approval card (Telegram Approve/Deny or Studio Approve) 2. Deny / cancel.",
].join(" ");

export function briefingChoices(): CoordinatorChoice[] {
  return [
    { id: "lookup_site", label: "Look up a site" },
    { id: "set_confine", label: "Set Confine" },
    { id: "set_evacuate", label: "Set Evacuate" },
    {
      id: "request_call",
      label: "Request a call (Approve button comes next — typing Call is not approval)",
    },
    { id: "log_report", label: "Log a farmer report" },
  ];
}

export function afterLookupChoices(mayCall: boolean): CoordinatorChoice[] {
  if (!mayCall) {
    return [
      { id: "set_confine", label: "Set Confine" },
      { id: "set_evacuate", label: "Set Evacuate" },
      { id: "lookup_site", label: "Look up another site" },
    ];
  }
  return [
    {
      id: "request_call",
      label: "Request a call (Approve button comes next — typing Call is not approval)",
    },
    { id: "lookup_site", label: "Look up another site" },
    { id: "log_report", label: "Log a farmer report" },
  ];
}

export function afterRequestChoices(): CoordinatorChoice[] {
  return [
    {
      id: "wait_approve",
      label: "Tap Approve on the approval card (Telegram Approve/Deny or Studio Approve)",
    },
    { id: "deny", label: "Deny / cancel" },
  ];
}

export function formatCta(choices: CoordinatorChoice[]): {
  prompt: string;
  choices: CoordinatorChoice[];
  choiceList: string;
} {
  return {
    prompt: CTA_PROMPT,
    choices,
    choiceList: [CTA_PROMPT, ...choices.map((choice, index) => `${index + 1}. ${choice.label}`)].join(
      "\n",
    ),
  };
}
