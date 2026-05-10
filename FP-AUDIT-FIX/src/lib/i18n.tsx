import { createContext, useContext, useState, type ReactNode } from "react";

export type Locale = "en" | "te";

const strings = {
  // ── Common ──
  "app.name": { en: "Friday Pictures", te: "ఫ్రైడే పిక్చర్స్" },
  "app.subtitle": { en: "Theatre Collection", te: "థియేటర్ కలెక్షన్" },
  "common.today": { en: "Today", te: "ఈ రోజు" },
  "common.submit": { en: "Submit", te: "సబ్మిట్ చేయండి" },
  "common.save": { en: "Save", te: "సేవ్ చేయండి" },
  "common.cancel": { en: "Cancel", te: "రద్దు చేయండి" },
  "common.approve": { en: "Approve", te: "ఆమోదించండి" },
  "common.reject": { en: "Reject", te: "తిరస్కరించండి" },
  "common.back": { en: "Back", te: "వెనుకకు" },
  "common.export": { en: "Export", te: "ఎక్స్‌పోర్ట్" },
  "common.filter": { en: "Filter", te: "ఫిల్టర్" },
  "common.search": { en: "Search", te: "వెతకండి" },
  "common.loading": { en: "Loading…", te: "లోడ్ అవుతోంది…" },
  "common.all": { en: "All", te: "అన్నీ" },

  // ── Auth ──
  "auth.signin": { en: "Sign in", te: "సైన్ ఇన్" },
  "auth.verify": { en: "Verify", te: "ధృవీకరించండి" },
  "auth.phone": { en: "Phone number", te: "ఫోన్ నంబర్" },
  "auth.otp": { en: "One-time code", te: "OTP కోడ్" },
  "auth.send_code": { en: "Send code", te: "కోడ్ పంపండి" },
  "auth.change_number": { en: "Change number", te: "నంబర్ మార్చండి" },
  "auth.not_registered": { en: "Phone not registered? Contact your theatre admin.", te: "ఫోన్ రిజిస్టర్ కాలేదా? థియేటర్ అడ్మిన్‌ని సంప్రదించండి." },
  "auth.session_valid": { en: "Session valid for 30 days", te: "సెషన్ 30 రోజులు చెల్లుబాటు" },
  "auth.otp_sent": { en: "Enter the 4-digit code sent to", te: "పంపిన 4-అంకెల కోడ్ ఎంటర్ చేయండి" },
  "auth.resend": { en: "Resend in", te: "మళ్ళీ పంపండి" },

  // ── Rep ──
  "rep.home": { en: "Home", te: "హోమ్" },
  "rep.new_cdr": { en: "New CDR", te: "కొత్త CDR" },
  "rep.history": { en: "History", te: "చరిత్ర" },
  "rep.profile": { en: "Profile", te: "ప్రొఫైల్" },
  "rep.todays_shows": { en: "Today's shows", te: "ఈ రోజు షోలు" },
  "rep.todays_gross": { en: "Today's gross", te: "ఈ రోజు గ్రాస్" },
  "rep.tickets_sold": { en: "Tickets sold", te: "టిక్కెట్లు అమ్మారు" },
  "rep.submission_progress": { en: "Submission progress", te: "సబ్మిషన్ ప్రోగ్రెస్" },
  "rep.awaiting_submission": { en: "Awaiting submission", te: "సబ్మిషన్ కోసం వేచి" },
  "rep.hasnt_started": { en: "Hasn't started", te: "ఇంకా మొదలు కాలేదు" },

  // ── CDR Entry ──
  "cdr.class_sales": { en: "Class-wise sales", te: "క్లాస్ వారీ అమ్మకాలు" },
  "cdr.channel_split": { en: "Channel split", te: "ఛానల్ విభజన" },
  "cdr.summary": { en: "Summary", te: "సారాంశం" },
  "cdr.proof": { en: "Proof", te: "రుజువు" },
  "cdr.class": { en: "Class", te: "క్లాస్" },
  "cdr.price": { en: "Price", te: "ధర" },
  "cdr.qty": { en: "Qty", te: "సంఖ్య" },
  "cdr.total": { en: "Total", te: "మొత్తం" },
  "cdr.gross_collection": { en: "Gross collection", te: "గ్రాస్ కలెక్షన్" },
  "cdr.gst_inclusive": { en: "GST (inclusive)", te: "GST (కలుపుకొని)" },
  "cdr.bms_commission": { en: "BMS commission", te: "BMS కమీషన్" },
  "cdr.district_commission": { en: "District commission", te: "డిస్ట్రిక్ట్ కమీషన్" },
  "cdr.net_collection": { en: "Net collection", te: "నెట్ కలెక్షన్" },
  "cdr.save_draft": { en: "Save draft", te: "డ్రాఫ్ట్ సేవ్" },
  "cdr.submit_cdr": { en: "Submit CDR", te: "CDR సబ్మిట్" },
  "cdr.upload_photo": { en: "Upload photo", te: "ఫోటో అప్‌లోడ్" },
  "cdr.replace_photo": { en: "Replace photo", te: "ఫోటో మార్చండి" },
  "cdr.matches": { en: "Matches", te: "సరిపోతోంది" },
  "cdr.mismatch": { en: "Mismatch", te: "సరిపోవడం లేదు" },
  "cdr.tickets": { en: "tickets", te: "టిక్కెట్లు" },
  "cdr.channels": { en: "channels", te: "ఛానల్స్" },
  "cdr.mandatory_photo": { en: "Mandatory. Signed paper CDR.", te: "తప్పనిసరి. సంతకం చేసిన CDR." },
  "cdr.sum_must_match": { en: "Sum must match total tickets.", te: "మొత్తం టిక్కెట్లతో సమానం అవ్వాలి." },
  "cdr.qty_drives_sno": { en: "Qty drives Sno range and total.", te: "Qty Sno పరిధిని నిర్ణయిస్తుంది." },
  "cdr.auto_calculated": { en: "Auto-calculated. GST inclusive of ticket price.", te: "ఆటోమేటిక్ లెక్కింపు. GST టిక్కెట్ ధరలో కలిసి ఉంది." },

  // ── Manager ──
  "mgr.dashboard": { en: "Dashboard", te: "డాష్‌బోర్డ్" },
  "mgr.daily_sheet": { en: "Daily Sheet", te: "డైలీ షీట్" },
  "mgr.expenses": { en: "Expenses", te: "ఖర్చులు" },
  "mgr.settlements": { en: "Settlements", te: "సెటిల్‌మెంట్లు" },
  "mgr.reports": { en: "Reports", te: "రిపోర్ట్‌లు" },
  "mgr.show_wise": { en: "Show-wise breakdown", te: "షో వారీ వివరాలు" },
  "mgr.channel_recon": { en: "Channel reconciliation", te: "ఛానల్ రీకన్సిలేషన్" },
  "mgr.approve_all": { en: "Approve all", te: "అన్నీ ఆమోదించండి" },
  "mgr.export_pdf": { en: "Export PDF", te: "PDF ఎక్స్‌పోర్ట్" },
  "mgr.submit_daily_sheet": { en: "Submit Daily Sheet to distributor", te: "డిస్ట్రిబ్యూటర్‌కు డైలీ షీట్ సబ్మిట్" },
  "mgr.submit_lock": { en: "Submit & lock day", te: "సబ్మిట్ & లాక్ చేయండి" },
  "mgr.month_to_date": { en: "Month-to-date", te: "నెల మొత్తం" },
  "mgr.add_expense": { en: "Add expense", te: "ఖర్చు జోడించండి" },

  // ── Distributor ──
  "dist.todays_gross": { en: "Today's gross", te: "ఈ రోజు గ్రాస్" },
  "dist.cumulative": { en: "Cumulative gross", te: "మొత్తం గ్రాస్" },
  "dist.mg_recovery": { en: "MG recovery", te: "MG రికవరీ" },
  "dist.pending_settlements": { en: "Pending settlements", te: "పెండింగ్ సెటిల్‌మెంట్లు" },
  "dist.generate_settlements": { en: "Generate settlements", te: "సెటిల్‌మెంట్లు జనరేట్" },
  "dist.send_reminder": { en: "Send reminder", te: "రిమైండర్ పంపండి" },
  "dist.defaulter_alert": { en: "theatre hasn't submitted today's CDR", te: "థియేటర్ ఈ రోజు CDR సబ్మిట్ చేయలేదు" },

  // ── Settlement ──
  "sett.statement": { en: "Settlement Statement", te: "సెటిల్‌మెంట్ స్టేట్‌మెంట్" },
  "sett.day_wise": { en: "Day-wise collection", te: "రోజు వారీ కలెక్షన్" },
  "sett.deductions": { en: "Deductions", te: "కోతలు" },
  "sett.adjustments": { en: "Adjustments", te: "సర్దుబాట్లు" },
  "sett.final_payable": { en: "Final amount payable", te: "చెల్లించాల్సిన మొత్తం" },
  "sett.payment_due": { en: "Payment due", te: "చెల్లింపు తేదీ" },
  "sett.maintenance": { en: "Maintenance", te: "నిర్వహణ" },
  "sett.publicity": { en: "Publicity contribution", te: "ప్రచార సహకారం" },
  "sett.prev_balance": { en: "Previous week balance", te: "గత వారం బ్యాలెన్స్" },

  // ── Status ──
  "status.pending": { en: "Pending", te: "పెండింగ్" },
  "status.draft": { en: "Draft", te: "డ్రాఫ్ట్" },
  "status.submitted": { en: "Submitted", te: "సబ్మిట్ అయింది" },
  "status.approved": { en: "Approved", te: "ఆమోదించబడింది" },
  "status.rejected": { en: "Rejected", te: "తిరస్కరించబడింది" },
  "status.paid": { en: "Paid", te: "చెల్లించబడింది" },
  "status.locked": { en: "Locked", te: "లాక్ అయింది" },
  "status.defaulter": { en: "Defaulter", te: "డిఫాల్టర్" },
  "status.up_to_date": { en: "Up to date", te: "అప్ టు డేట్" },
  "status.late": { en: "Late", te: "ఆలస్యం" },
  "status.overdue": { en: "Overdue", te: "గడువు దాటింది" },

  // ── Reports ──
  "report.film_pl": { en: "Film P&L", te: "ఫిల్మ్ P&L" },
  "report.gst_summary": { en: "GST summary", te: "GST సారాంశం" },
  "report.channel_split": { en: "Channel split", te: "ఛానల్ విభజన" },
  "report.theatre_ranking": { en: "Theatre ranking", te: "థియేటర్ ర్యాంకింగ్" },
  "report.audit_log": { en: "Audit log", te: "ఆడిట్ లాగ్" },
  "report.defaulter": { en: "Defaulter report", te: "డిఫాల్టర్ రిపోర్ట్" },
  "report.settlement_aging": { en: "Settlement aging", te: "సెటిల్‌మెంట్ ఏజింగ్" },
  "report.expense_register": { en: "Expense register", te: "ఖర్చుల రిజిస్టర్" },
} as const;

type StringKey = keyof typeof strings;

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: StringKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("fp_locale") as Locale) || "en";
    }
    return "en";
  });

  function handleSetLocale(l: Locale) {
    setLocale(l);
    localStorage.setItem("fp_locale", l);
  }

  function t(key: StringKey): string {
    const entry = strings[key];
    if (!entry) return key;
    return entry[locale] || entry.en;
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}
