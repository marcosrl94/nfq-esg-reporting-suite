/*
 * Splash page · F0
 * Reemplazar por el dashboard real cuando F1 trasplante el código de
 * nfq-carbon-intelligence al monorepo.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-cream px-6 py-16">
      <Brandmark />

      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-medium text-forest md:text-4xl">
          GEShop está despertando.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-charcoal/70 md:text-base">
          Mega suite ESG bajo la marca{" "}
          <span className="font-medium text-forest">GSV — Green Strategic Value</span>.
          Estamos en F0 (bootstrap) del roadmap. El producto real llega cuando F1
          trasplante <span className="font-mono text-xs">nfq-carbon-intelligence</span> a este
          monorepo.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <PhaseBadges />
        <a
          href="https://github.com/gsv-tech/geshop"
          className="text-xs font-mono uppercase tracking-[3px] text-emerald-brand hover:text-forest"
        >
          repo →
        </a>
      </div>
    </main>
  );
}

function Brandmark() {
  return (
    <div className="flex items-center gap-6">
      <svg
        viewBox="0 0 120 120"
        className="h-24 w-24 md:h-28 md:w-28"
        role="img"
        aria-label="GEShop"
      >
        <defs>
          <linearGradient id="darkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F3D2E" />
            <stop offset="100%" stopColor="#062019" />
          </linearGradient>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="22" fill="url(#darkGrad)" />
        <path
          d="M 35 90 C 35 60, 60 35, 90 35 C 92 70, 70 92, 35 90 Z"
          fill="url(#leafGrad)"
        />
        <line
          x1="35"
          y1="90"
          x2="90"
          y2="35"
          stroke="#FAFAF7"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="90"
          y1="35"
          x2="78"
          y2="35"
          stroke="#FAFAF7"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="90"
          y1="35"
          x2="90"
          y2="47"
          stroke="#FAFAF7"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      <div>
        <div className="text-5xl font-medium tracking-tight text-forest md:text-6xl">
          GEShop
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[3.5px] text-emerald-brand md:text-xs">
          Green&nbsp;&nbsp;Strategic&nbsp;&nbsp;Value
        </div>
      </div>
    </div>
  );
}

function PhaseBadges() {
  const phases = [
    { id: "F0", label: "Bootstrap", state: "active" as const },
    { id: "F1", label: "Trasplante carbon", state: "next" as const },
    { id: "F2", label: "Cobertura ESG", state: "next" as const },
    { id: "F3", label: "IA cross", state: "next" as const },
    { id: "F4", label: "v1.5 esbelta", state: "next" as const },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {phases.map((p) => (
        <span
          key={p.id}
          className={
            p.state === "active"
              ? "rounded-md border border-emerald-brand/30 bg-emerald-brand/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-emerald-brand"
              : "rounded-md border border-charcoal/10 bg-charcoal/[0.03] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-charcoal/40"
          }
        >
          {p.id} · {p.label}
        </span>
      ))}
    </div>
  );
}
