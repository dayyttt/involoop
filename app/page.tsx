"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChannelMarquee from "@/components/ChannelMarquee";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import AnimatedContent from "@/components/reactbits/AnimatedContent";
import CountUp from "@/components/reactbits/CountUp";
import RotatingWord from "@/components/RotatingWord";
import LoopFlow from "@/components/LoopFlow";
import TryDemo from "@/components/TryDemo";
import PaperScan from "@/components/PaperScan";
import RewardWeave from "@/components/RewardWeave";
import PayLoop from "@/components/PayLoop";
import { createClient } from "@/lib/supabase-browser";
import { landing, landingText, landingItems } from "@/lib/i18n";
import { useLang, useSetLang } from "@/components/LangProvider";

// The backdrop is an image first — it renders everywhere, including on phones
// and without JavaScript. The component layers a depth shader over it only
// where that is welcome, and loads three.js itself at that point.
const HeroCloth = dynamic(() => import("@/components/HeroCloth"), { ssr: false });

export default function Home() {
  const lang = useLang();
  const setLang = useSetLang();
  const t = (key: string) => landingText(lang, key);
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  async function handleUpgrade(plan: "starter" | "pro") {
    setUpgradeError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // A visitor clicking a price is almost always new: send them to signup,
      // carrying the plan so checkout opens right after the account exists.
      router.push(`/signup?plan=${plan}`);
      return;
    }
    const res = await fetch("/api/payments/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      setUpgradeError(data.error ?? "Upgrade failed");
    }
  }

  const features = landingItems(lang, "features.items");
  const processSteps = landingItems(lang, "process.steps");
  const testimonials = landingItems(lang, "testimonials.items");
  const trustItems = landingItems(lang, "trust.items");
  const howSteps = landingItems(lang, "how.items");
  const faqItems = landingItems(lang, "faq.items");

  const navLinks = [
    ["#how", t("nav.process")],
    ["#why", t("nav.why")],
    ["#features", t("nav.features")],
    ["#reward", t("nav.reward")],
    ["#pricing", t("nav.pricing")],
    ["#faq", t("nav.faq")],
  ];

  return (
    <main className="landing">
      <header className="site-header">
        <div className="site-shell header-inner">
          <Link href="#home" className="brand">
            Invo<span className="brand-accent">loop</span>
          </Link>
          <nav className="site-nav" aria-label="Main navigation">
            {navLinks.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="lang-switch"
              onClick={() => setLang(lang === "en" ? "id" : "en")}
              aria-label={lang === "en" ? "Ganti ke Bahasa Indonesia" : "Switch to English"}
              lang={lang === "en" ? "id" : "en"}
            >
              {lang === "en" ? "ID" : "EN"}
            </button>
            <Link href="/signup" className="btn btn-primary">
              {t("nav.getStarted")}
            </Link>
            <button
              type="button"
              className="menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className={menuOpen ? "menu-icon menu-icon-open" : "menu-icon"} aria-hidden />
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">
            <div className="site-shell">
              {navLinks.map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)}>
                  {label}
                </a>
              ))}
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                {t("footer.login")}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <section id="home" className="agency-hero">
        <HeroCloth />
        <div className="hero-shade" />
        <div className="site-shell agency-hero-inner">
          <div className="agency-hero-copy">
            <h1 className="hero-h1 hero-reveal">{t("hero.h1a")}</h1>
            <p className="hero-h1 hero-h1-rot hero-enter hero-enter-1">
              <span>{t("hero.rotPrefix")} </span>
              <RotatingWord
                words={lang === "id" ? [...landing.hero.rotWordsId] : [...landing.hero.rotWords]}
                wordClass="hero-word-gradient"
              />
            </p>
            <p className="hero-sub hero-enter hero-enter-2">{t("hero.sub")}</p>
            <div className="hero-actions hero-enter hero-enter-3">
              <Link href="/signup" className="btn btn-primary btn-lg">
                {t("hero.cta1")}
              </Link>
              <Link href="/invoice/484a9577f2" className="btn btn-ghost btn-lg">
                {t("hero.cta3")}
              </Link>
            </div>
            {/* One paragraph, not three spans: separators are text bound to the
                preceding word with a non-breaking space, so a wrap can never
                leave a dot stranded at the start of a line. */}
            <p className="hero-points hero-enter hero-enter-4">
              <b>{t("hero.p1s")}</b> {t("hero.p1r")}
              {"\u00a0· "}
              <b>{t("hero.p2s")}</b> {t("hero.p2r")}
              {"\u00a0· "}
              <b>{t("hero.p3s")}</b>
            </p>
          </div>
          <div className="agency-hero-demo hero-enter hero-enter-5">
            <TryDemo />
          </div>
        </div>
      </section>

      <section className="channel-band">
        <div className="site-shell">
          <ChannelMarquee label={t("marquee.label")} />
        </div>
      </section>

      <section id="how" className="site-shell section-space">
        <AnimatedContent className="process-head">
          <h2>{t("how.title")}</h2>
        </AnimatedContent>
        <div className="plain-steps">
          {howSteps.map(([num, title, text], index) => (
            <AnimatedContent className="reveal-item" key={num} delay={index * 0.07}>
              <div className="plain-step">
                <span className="plain-num">{num}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </AnimatedContent>
          ))}
        </div>
      </section>

      <section id="why" className="site-shell section-space split-section">
        <AnimatedContent className="section-image paper-shot">
          <PaperScan />
          <span className="paper-caption">{t("why.caption")}</span>
        </AnimatedContent>
        <AnimatedContent delay={0.08}>
          <h2>{t("why.title")}</h2>
          <div className="value-list">
            <span>{t("why.point1")}</span>
            <span>{t("why.point2")}</span>
            <span>{t("why.point3")}</span>
          </div>
          <p className="body-copy">{t("why.body1")}</p>
          <p className="body-copy">{t("why.body2")}</p>
          <div className="metric-row">
            <div><strong><CountUp to={3} duration={1.6} /></strong><span>{t("why.m1l")}</span></div>
            <div><strong>+<CountUp to={3} duration={1.6} /></strong><span>{t("why.m2l")}</span></div>
            <div><strong>+<CountUp to={2} duration={1.6} /></strong><span>{t("why.m3l")}</span></div>
          </div>
          <Link href="/signup" className="btn btn-primary">{t("why.cta")}</Link>
        </AnimatedContent>
      </section>

      <section id="features" className="section-space muted-band">
        <div className="site-shell">
          <AnimatedContent className="section-top">
            <div>
              <h2>{t("features.title")}</h2>
            </div>
            <Link href="/signup" className="btn btn-ghost">{t("nav.getStarted")}</Link>
          </AnimatedContent>
          <div className="feature-grid">
            {features.map((f, index) => {
              const [num, title, text] = f;
              return (
                <AnimatedContent className="reveal-item" key={num} delay={(index % 3) * 0.06}>
                  <SpotlightCard className="feature-card">
                    <span className="feature-icon">{num}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    {/* Opens on hover or keyboard focus, into space the card was
                        already reserving — so nothing below it shifts. */}
                    <div className="feature-more">
                      <span>{t(`features.d${index + 1}`)}</span>
                    </div>
                    <Link href="/signup">{t("features.tryCta")}</Link>
                  </SpotlightCard>
                </AnimatedContent>
              );
            })}
          </div>
        </div>
      </section>

      <section id="process" className="site-shell section-space">
        <AnimatedContent className="process-head">
          <h2>{t("process.title")}</h2>
          <p className="body-copy">{t("process.sub")}</p>
        </AnimatedContent>
        <div className="process-grid">
          {processSteps.map((step, index) => {
            const [num, title, text] = step;
            return (
              <AnimatedContent className="reveal-item" key={num} delay={index * 0.06}>
                <article className="p-step">
                  <span className="p-node">{num}</span>
                  <div className="p-body">
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              </AnimatedContent>
            );
          })}
        </div>
      </section>

      <section id="reward" className="reward-band section-space">
        <AnimatedContent className="site-shell reward-inner">
          <h2>{t("reward.title")}</h2>
          <p className="reward-lead">{t("reward.lead")}</p>
          <div className="reward-split">
            <div className="weave-col">
              <RewardWeave />
            </div>
            <div className="reward-parties">
              <article className="party party-you">
                <div className="party-top">
                  <span>{t("reward.a")}</span>
                  <h3>{t("reward.at")}</h3>
                </div>
                <strong>+3 {t("reward.creditsWord")}</strong>
                <p>{t("reward.ad")}</p>
              </article>
              <div className="reward-arrow"><LoopFlow vertical /></div>
              <article className="party party-client">
                <div className="party-top">
                  <span>{t("reward.b")}</span>
                  <h3>{t("reward.bt")}</h3>
                </div>
                <strong>+2 {t("reward.creditsWord")}</strong>
                <p>{t("reward.bd")}</p>
              </article>
            </div>
          </div>
          {/* Names the two colours, so the abstract picture becomes a diagram
              anyone can read at a glance instead of decoration. */}
          <p className="reward-legend">
            <span className="key key-you" /> {t("reward.keyYou")}
            <span className="key key-client" /> {t("reward.keyClient")}
          </p>
          <Link href="/signup" className="btn btn-primary btn-lg">{t("reward.cta")}</Link>
        </AnimatedContent>
      </section>

      <section id="testimonials" className="site-shell section-space">
        <AnimatedContent className="process-head">
          <h2>{t("testimonials.title")}</h2>
          <p className="body-copy">{t("testimonials.sub")}</p>
        </AnimatedContent>
        <div className="testimonial-grid">
          {testimonials.map(([persona, context, useCase], index) => (
            <AnimatedContent className="reveal-item" key={persona} delay={index * 0.07}>
              <article className="testimonial">
                <div className="testimonial-author" style={{ paddingTop: 0, borderTop: 0 }}>
                  <span className="t-avatar">0{index + 1}</span>
                  <div>
                    <div className="t-name">{persona}</div>
                    <div className="t-role">{context}</div>
                  </div>
                </div>
                <p>{useCase}</p>
              </article>
            </AnimatedContent>
          ))}
        </div>
      </section>

      <section id="pricing" className="site-shell section-space">
        <AnimatedContent className="process-head">
          <h2>{t("pricing.title")}</h2>
          <p className="body-copy">{t("pricing.sub")}</p>
          <p className="credit-line">{t("pricing.creditLine")}</p>
        </AnimatedContent>
        <div className="pricing-grid">
          <AnimatedContent className="reveal-item plan">
            <h3 className="plan-name">{t("pricing.free")}</h3>
            <div className="plan-price">{t("pricing.freePrice")}</div>
            <p className="plan-desc">{t("pricing.freeDesc")}</p>
            <ul className="plan-features">
              <li>{t("pricing.f1")}</li><li>{t("pricing.f2")}</li><li>{t("pricing.f3")}</li>
            </ul>
            <Link href="/signup" className="btn btn-ghost" style={{ width: "100%" }}>{t("pricing.ctaStart")}</Link>
          </AnimatedContent>
          <AnimatedContent className="reveal-item plan plan-featured" delay={0.06}>
            <h3 className="plan-name">{t("pricing.starter")}</h3>
            <div className="plan-price">{t("pricing.starterPrice")}<span>{t("pricing.starterWhen")}</span></div>
            {t("pricing.starterApprox") && <p className="plan-approx">{t("pricing.starterApprox")}</p>}
            <p className="plan-desc">{t("pricing.starterDesc")}</p>
            <ul className="plan-features">
              <li>{t("pricing.s1")}</li><li>{t("pricing.s2")}</li><li>{t("pricing.s3")}</li>
            </ul>
            <button onClick={() => handleUpgrade("starter")} className="btn btn-primary" style={{ width: "100%" }}>{t("pricing.ctaUpgrade")}</button>
          </AnimatedContent>
          <AnimatedContent className="reveal-item plan" delay={0.12}>
            <h3 className="plan-name">{t("pricing.pro")}</h3>
            <div className="plan-price">{t("pricing.proPrice")}<span>{t("pricing.proWhen")}</span></div>
            {t("pricing.proApprox") && <p className="plan-approx">{t("pricing.proApprox")}</p>}
            <p className="plan-desc">{t("pricing.proDesc")}</p>
            <ul className="plan-features">
              <li>{t("pricing.p1")}</li><li>{t("pricing.p2")}</li><li>{t("pricing.p3")}</li>
            </ul>
            <button onClick={() => handleUpgrade("pro")} className="btn btn-ghost" style={{ width: "100%" }}>{t("pricing.ctaUpgrade")}</button>
          </AnimatedContent>
        </div>
        {upgradeError && <p className="error" style={{ textAlign: "center" }}>{upgradeError}</p>}
        <p className="hint" style={{ textAlign: "center", marginTop: 28 }}>{t("pricing.note")}</p>
      </section>

      <section id="faq" className="site-shell section-space">
        <AnimatedContent className="process-head">
          <h2>{t("faq.title")}</h2>
        </AnimatedContent>
        <div className="faq-list">
          {faqItems.map(([num, question, answer], index) => (
            <AnimatedContent key={num} delay={Math.min(index, 3) * 0.05}>
              <details className="faq-item">
                <summary>
                  <span>{question}</span>
                  <span className="faq-mark" aria-hidden />
                </summary>
                <p>{answer}</p>
              </details>
            </AnimatedContent>
          ))}
        </div>
      </section>

      <section id="trust" className="section-space muted-band">
        <div className="site-shell">
          <AnimatedContent className="process-head" style={{ maxWidth: 640, marginBottom: 0 }}>
            <h2>{t("trust.title")}</h2>
            <p className="body-copy">{t("trust.sub")}</p>
          </AnimatedContent>
          <div className="trust-grid">
            {trustItems.map(([num, title, text], index) => (
              <AnimatedContent className="reveal-item" key={num} delay={index * 0.06}>
                <div className="trust-item">
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </AnimatedContent>
            ))}
          </div>
        </div>
      </section>

      <AnimatedContent as="section" className="site-shell section-space final-cta">
        <div className="final-cta-visual">
          <PayLoop />
        </div>
        <div className="final-cta-copy">
          <h2>{t("finalCta.title")}</h2>
          <p>{t("finalCta.sub")}</p>
        </div>
        <Link href="/signup" className="btn btn-primary btn-lg">{t("finalCta.cta")}</Link>
      </AnimatedContent>

      <footer className="site-footer">
        <div className="site-shell footer-inner">
          <Link href="#home" className="brand">Invo<span className="brand-accent">loop</span></Link>
          <nav>
            <a href="#why">{t("nav.why")}</a>
            <a href="#features">{t("nav.features")}</a>
            <a href="#how">{t("nav.process")}</a>
            <a href="#faq">{t("nav.faq")}</a>
            <Link href="/login">{t("footer.login")}</Link>
          </nav>
          <nav className="footer-legal">
            <Link href="/privacy">{t("footer.privacy")}</Link>
            <Link href="/terms">{t("footer.terms")}</Link>
            <a href="#payments">{t("footer.payments")}</a>
            <a href="https://github.com/dayyttt/involoop" target="_blank" rel="noreferrer">{t("footer.github")}</a>
            <a href="mailto:hello@involoop.vercel.app">{t("footer.contact")}</a>
          </nav>
          <p className="footer-disclaimer" id="payments">
            {lang === "id"
              ? "Pembayaran diproses oleh penyedia pihak ketiga (Stripe). Involoop tidak menyimpan data kartu."
              : "Payments are processed by third-party providers (Stripe). Involoop does not store full payment card details."}
          </p>
          <div className="footer-bottom">
            <span>© 2026 Involoop.</span>
            <span>{t("footer.tag")}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
