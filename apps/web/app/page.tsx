import { getGym } from "@/lib/gym/getGym";
import { redirect } from "next/navigation";

const features = [
  {
    number: "01",
    title: "Workout Logging",
    description:
      "Per-set tracking with weight, reps, and RPE. Search 1000+ exercises with GIF demonstrations.",
  },
  {
    number: "02",
    title: "AI Performance Reports",
    description:
      "GPT-4o mini analyzes your training. Detects plateaus, fatigue risk, and suggests progression.",
  },
  {
    number: "03",
    title: "Progress Analytics",
    description:
      "Volume trends, strength curves, best lifts. All rendered from your real data.",
  },
  {
    number: "04",
    title: "Leaderboards",
    description:
      "Volume and consistency rankings across gym members. Compete, or just see where you stand.",
  },
  {
    number: "05",
    title: "Multi-Tenant Architecture",
    description:
      "Each gym runs on its own subdomain with full data isolation. White-label ready.",
  },
  {
    number: "06",
    title: "AI Demo Chat",
    description:
      "Three modes: workout coach, nutrition specialist, gym admin analyst. All answering in Albanian.",
  },
];

const steps = [
  {
    number: "01",
    title: "Register Your Gym",
    description:
      "Launch your own branded tenant and isolate every member's data from day one.",
  },
  {
    number: "02",
    title: "Log Your Workouts",
    description:
      "Capture weight, reps, RPE, and exercise context for every set you complete.",
  },
  {
    number: "03",
    title: "Let AI Analyze",
    description:
      "Turn raw sessions into fatigue warnings, progression cues, and report-ready insights.",
  },
];

const stats = [
  { number: "1000+", label: "Exercises in database" },
  { number: "GPT-4o mini", label: "AI Engine" },
  { number: "∞", label: "Gyms supported" },
  { number: "100%", label: "Data isolated" },
];

export default async function HomePage() {
  const gym = await getGym();

  if (gym) {
    redirect("/login");
  }

  return (
    <main className="landing-shell">
      <section className="landing-section landing-section--hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <ul className="hero-lines">
              <li
                className="hero-line"
                style={{ ["--line-index" as string]: 0 }}
              >
                TRAIN
              </li>
              <li
                className="hero-line"
                style={{ ["--line-index" as string]: 1 }}
              >
                SMARTER.
              </li>
              <li
                className="hero-line"
                style={{ ["--line-index" as string]: 2 }}
              >
                TRACK
              </li>
              <li
                className="hero-line"
                style={{ ["--line-index" as string]: 3 }}
              >
                EVERYTHING.
              </li>
            </ul>

            <div className="hero-kicker">
              AI-POWERED GYM PERFORMANCE PLATFORM
            </div>
            <p className="hero-body">
              Multi-tenant performance tracking for serious gyms. Log every set.
              Analyze every rep. Let AI do the rest.
            </p>

            <div className="hero-actions">
              <a className="button-link button-link--primary" href="/register">
                Get Started
              </a>
              <a className="button-link button-link--secondary" href="#demo">
                See the Demo
              </a>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="hero-art-number">01</div>
          </div>

          <div className="marquee" aria-hidden="true">
            <div className="marquee-track">
              <span>
                WORKOUT LOGGING · PER-SET TRACKING · WEIGHT · REPS · RPE · AI
                PERFORMANCE REPORTS · LEADERBOARDS · MULTI-TENANT · SUBDOMAIN
                ISOLATION · PLATEAU DETECTION · PROGRESS ANALYTICS ·
              </span>
              <span>
                WORKOUT LOGGING · PER-SET TRACKING · WEIGHT · REPS · RPE · AI
                PERFORMANCE REPORTS · LEADERBOARDS · MULTI-TENANT · SUBDOMAIN
                ISOLATION · PLATEAU DETECTION · PROGRESS ANALYTICS ·
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section section-band">
        <div className="section-label">02 / FEATURES</div>
        <div className="features-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-number">{feature.number}</div>
              <h2 className="feature-title">{feature.title}</h2>
              <p className="feature-description">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section section-band">
        <div className="section-label">03 / FLOW</div>
        <div className="flow-layout">
          {steps.map((step) => (
            <article className="flow-step" key={step.title}>
              <div className="flow-number">{step.number}</div>
              <h2 className="flow-title">{step.title}</h2>
              <p className="flow-description">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section section-band" id="demo">
        <div className="section-label">04 / AI REPORT</div>
        <div className="callout-layout">
          <div className="callout-copy">
            <h2 className="callout-headline">
              YOUR COACH
              <br />
              NEVER
              <br />
              SLEEPS.
            </h2>
            <p className="callout-body">
              AI reports turn workouts into signals you can act on immediately.
              Catch fatigue before it compounds, spot stalled lifts, and keep
              progress moving with recommendations grounded in your actual
              training history.
            </p>
          </div>

          <aside className="terminal-card" aria-label="AI report preview">
            <p className="terminal-line">
              <span className="terminal-prompt">&gt; </span>WEEKLY ANALYSIS —
              WEEK 22
            </p>
            <p className="terminal-line">
              <span className="terminal-key">fatigue_status : </span>
              <span className="terminal-value">AT_RISK</span>
            </p>
            <p className="terminal-line">
              <span className="terminal-key">avg_rpe_3day : </span>
              <span className="terminal-value">8.7</span>
            </p>
            <br />
            <p className="terminal-line">
              <span className="terminal-key">plateau_detected : </span>
              <span className="terminal-value">true</span>
            </p>
            <p className="terminal-line">
              <span className="terminal-key">exercise : </span>
              <span className="terminal-value">bench press</span>
            </p>
            <p className="terminal-line">
              <span className="terminal-key">weeks_stalled : </span>
              <span className="terminal-value">3</span>
            </p>
            <br />
            <p className="terminal-line">
              <span className="terminal-key">suggestion : </span>
              <span className="terminal-value">Deload 15%. Switch to</span>
            </p>
            <p className="terminal-line">
              <span className="terminal-key"> </span>
              <span className="terminal-value">5×5 @ 72.5kg next session.</span>
            </p>
            <br />
            <p className="terminal-line">
              <span className="terminal-key">volume_vs_last : </span>
              <span className="terminal-value">+12%</span>
            </p>
            <p className="terminal-line">
              <span className="terminal-key">sessions : </span>
              <span className="terminal-value">4</span>
            </p>
            <p className="terminal-line">
              <span className="terminal-key">highlight : </span>
              <span className="terminal-value">Squat PR this week ↑</span>
            </p>
          </aside>
        </div>
      </section>

      <section className="landing-section">
        <div className="stats-bar">
          {stats.map((stat) => (
            <article className="stat-item" key={stat.label}>
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label">{stat.label}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section footer-cta">
        <div className="footer-inner">
          <h2 className="footer-headline">
            READY TO
            <br />
            PERFORM?
          </h2>

          <div className="hero-actions">
            <a className="button-link button-link--primary" href="/register">
              Get Started
            </a>
            <a className="button-link button-link--secondary" href="#demo">
              See the Demo
            </a>
          </div>

          <div className="footer-legal">
            Built with Next.js · Supabase · OpenAI · Deployed on Vercel
          </div>
        </div>
      </section>
    </main>
  );
}
