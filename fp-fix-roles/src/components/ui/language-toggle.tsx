import { useI18n, type Locale } from "../../lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <div style={{ display: "flex", gap: 2, background: "var(--bg-soft)", borderRadius: 6, padding: 2 }}>
      {(["en", "te"] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          style={{
            padding: "5px 12px",
            borderRadius: 4,
            border: "none",
            background: locale === l ? "var(--surface)" : "transparent",
            boxShadow: locale === l ? "var(--shadow-sm)" : "none",
            color: locale === l ? "var(--ink-1)" : "var(--ink-3)",
            fontWeight: locale === l ? 600 : 400,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
          }}
        >
          {l === "en" ? "English" : "తెలుగు"}
        </button>
      ))}
    </div>
  );
}
