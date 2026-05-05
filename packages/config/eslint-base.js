/*
 * @geshop/config — Configuración ESLint compartida (flat config)
 *
 * Apps individuales pueden importar: import baseConfig from "@geshop/config/eslint";
 * Por ahora apps/web usa eslint-config-next directamente; este es el placeholder
 * para cuando aparezca packages/ui o cualquier otro código TS compartido sin Next.
 */

export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
