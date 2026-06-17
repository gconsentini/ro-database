export const config = {
  databaseUrl:
    process.env.DATABASE_URL ?? "postgres://rodb:rodb@localhost:5432/rodb",
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  defaultLocale: process.env.DEFAULT_LOCALE ?? "pt-BR",
};

export const SUPPORTED_LOCALES = ["pt-BR", "es", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Normaliza o ?locale= da query, caindo no default quando invalido. */
export function resolveLocale(input: unknown): Locale {
  if (typeof input === "string") {
    const found = SUPPORTED_LOCALES.find(
      (l) => l.toLowerCase() === input.toLowerCase(),
    );
    if (found) return found;
  }
  return config.defaultLocale as Locale;
}
