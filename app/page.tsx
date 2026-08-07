"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NeonLandscape from "@/components/NeonLandscape";
import ChannelMarquee from "@/components/ChannelMarquee";
import BlurText from "@/components/reactbits/BlurText";
import Magnet from "@/components/reactbits/Magnet";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import CountUp from "@/components/reactbits/CountUp";
import RotatingText from "@/components/reactbits/RotatingText";
import { createClient } from "@/lib/supabase-browser";
import { landing, getInitialLang, setLangCookie, landingText, landingItems, type Lang } from "@/lib/i18n";

export default function Home() {
  const [lang, setLang] = useState<Lang>(getInitialLang());
  const t = (key: string) => landingText(lang, key);
  const router = useRouter();

  const toggleLang = () => {
    const next: Lang = lang === "en" ? "id" : "en";
    setLangCookie(next);
    setLang(next);
  };

  async function handleUpgrade(plan: "starter" | "pro") {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?plan=${plan}`);
      return;
    }
    const res = await fetch("/api/payments/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? "Upgrade failed");
    }
  }

  const features = landingItems(lang, "features.items");
  const processSteps = landingItems(lang, "process.steps");
  const testimonials = landingItems(lang, "testimonials.items");
  const trustItems = landingItems(lang, "trust.items");
  const howSteps = landingItems(lang, "how.items");

  return (
    <main className="landing">
      <header className="site-header">
        <div className="site-shell header-inner">
          <Link href="#home" className="brand">
            Invo<span className="brand-accent">loop</span>
          </Link>
          <nav className="site-nav" aria-label="Main navigation">
            <a href="#why">{t("nav.why")}</a>
            <a href="#features">{t("nav.features")}</a>
            <a href="#process">{t("nav.process")}</a>
            <a href="#reward">{t("nav.reward")}</a>
            <a href="#pricing">{t("nav.pricing")}</a>
          </nav>
          <div className="header-actions">
            <button className="lang-switch" onClick={toggleLang}>
              {lang === "en" ? "ID" : "EN"}
            </button>
            <Link href="/signup" className="btn btn-primary">
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>
      </header>

      <section id="home" className="agency-hero">
        <NeonLandscape />
        <div className="hero-shade" />
        <div className="site-shell agency-hero-inner">
          <div className="agency-hero-copy">
            <span className="section-eyebrow">{t("hero.badge")}</span>
            <BlurText
              text={`${t("hero.h1a")} `}
              delay={120}
              stepDuration={0.32}
              className="hero-h1"
            />
            <div className="hero-h1" style={{ display: "flex", flexWrap: "wrap", gap: "0.18em" }}>
              <span>{t("hero.rotPrefix")} </span>
              <RotatingText
                texts={lang === "id" ? landing.hero.rotWordsId : landing.hero.rotWords}
                mainClassName="hero-h1-rotate"
                rotationInterval={2200}
                staggerDuration={0.02}
              />
            </div>
            <p>{t("hero.sub")}</p>
            <div className="hero-actions">
              <Magnet magnetStrength={4} padding={60}>
                <Link href="/signup" className="btn btn-primary btn-lg">
                  {t("hero.cta1")}
                </Link>
              </Magnet>
              <Link href="/invoice/484a9577f2" className="btn btn-ghost btn-lg">
                {t("hero.cta3")}
              </Link>
            </div>
            <div className="hero-points">
              <span>
                <b>{t("hero.p1")}</b>
              </span>
              <span>
                <b>{t("hero.p2")}</b>
              </span>
              <span>
                <b>{t("hero.p3")}</b>
              </span>
            </div>
            <p className="hero-note">{t("hero.note")}</p>
          </div>
        </div>
        <div className="trust-strip">
          <ChannelMarquee label={t("marquee.label")} />
        </div>
      </section>

      <section id="how" className="site-shell section-space">
        <div className="process-head">
          <p className="section-eyebrow">{t("how.eyebrow")}</p>
          <h2>{t("how.title")}</h2>
        </div>
        <div className="plain-steps">
          {howSteps.map(([num, title, text]) => (
            <div className="plain-step" key={num}>
              <span className="plain-num">{num}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="why" className="site-shell section-space split-section">
        <div className="section-image invoice-mock">
          <div className="mock-head">
            <span className="mono">INV-2026-009</span>
            <span className="mock-status">UNPAID</span>
          </div>
          <div className="mock-block">
            <span className="mock-label">FROM</span>
            <strong>Budi Santoso</strong>
          </div>
          <div className="mock-block">
            <span className="mock-label">TO</span>
            <strong>Acme Studio</strong>
          </div>
          <div className="mock-line">
            <span>Landing page design</span>
            <b className="money">$50.00</b>
          </div>
          <div className="mock-pay">
            <span className="btn btn-primary mock-btn">Pay securely</span>
            <span className="mock-test">Stripe Test Mode</span>
          </div>
          <div className="mock-cta">
            <span>Create an invoice like this · free →</span>
          </div>
        </div>
        <div>
          <p className="section-eyebrow">{t("why.eyebrow")}</p>
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
        </div>
      </section>

      <section id="features" className="section-space muted-band">
        <div className="site-shell">
          <div className="section-top">
            <div>
              <p className="section-eyebrow">{t("features.eyebrow")}</p>
              <h2>{t("features.title")}</h2>
            </div>
            <Link href="/signup" className="btn btn-ghost">{t("nav.getStarted")}</Link>
          </div>
          <div className="feature-grid">
            {features.map((f, index) => {
              const [num, title, text] = f;
              return (
                <SpotlightCard
                  className={`feature-card${index === 1 ? " feature-card-active" : ""}`}
                  key={num}
                >
                  <span className="feature-icon">{num}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <Link href="/signup">{t("features.tryCta")}</Link>
                </SpotlightCard>
              );
            })}
          </div>
        </div>
      </section>

      <section id="process" className="site-shell section-space">
        <div className="process-head">
          <p className="section-eyebrow">{t("process.eyebrow")}</p>
          <h2>{t("process.title")}</h2>
          <p className="body-copy">{t("process.sub")}</p>
        </div>
        <div className="process-grid">
          {processSteps.map((step) => {
            const [num, title, text] = step;
            return (
              <article className="p-step" key={num}>
                <span className="p-node">{num}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="reward" className="reward-band section-space">
        <div className="site-shell reward-inner">
          <p className="section-eyebrow">{t("reward.eyebrow")}</p>
          <h2>{t("reward.title")}</h2>
          <p className="reward-lead">{t("reward.lead")}</p>
          <div className="reward-grid">
            <article>
              <span>{t("reward.a")}</span><h3>{t("reward.at")}</h3>
              <strong>{t("reward.av")}</strong><p>{t("reward.ad")}</p>
            </article>
            <div className="reward-arrow">→</div>
            <article>
              <span>{t("reward.b")}</span><h3>{t("reward.bt")}</h3>
              <strong>{t("reward.bv")}</strong><p>{t("reward.bd")}</p>
            </article>
          </div>
          <Link href="/signup" className="btn btn-primary btn-lg">{t("reward.cta")}</Link>
        </div>
      </section>

      <section id="testimonials" className="site-shell section-space">
        <div className="process-head">
          <p className="section-eyebrow">{t("testimonials.eyebrow")}</p>
          <h2>{t("testimonials.title")}</h2>
          <p className="body-copy">{t("testimonials.sub")}</p>
        </div>
        <div className="testimonial-grid">
          {testimonials.map(([persona, context, useCase], index) => (
            <article className="testimonial" key={persona}>
              <div className="testimonial-author" style={{ paddingTop: 0, borderTop: 0 }}>
                <span className="t-avatar">0{index + 1}</span>
                <div>
                  <div className="t-name">{persona}</div>
                  <div className="t-role">{context}</div>
                </div>
              </div>
              <p>{useCase}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="site-shell section-space">
        <div className="process-head">
          <p className="section-eyebrow">{t("pricing.eyebrow")}</p>
          <h2>{t("pricing.title")}</h2>
          <p className="body-copy">{t("pricing.sub")}</p>
        </div>
        <div className="pricing-grid">
          <div className="plan">
            <h3 className="plan-name">{t("pricing.free")}</h3>
            <div className="plan-price">{t("pricing.freePrice")}</div>
            <p className="plan-desc">{t("pricing.freeDesc")}</p>
            <ul className="plan-features">
              <li>{t("pricing.f1")}</li><li>{t("pricing.f2")}</li><li>{t("pricing.f3")}</li>
            </ul>
            <Link href="/signup" className="btn btn-ghost" style={{ width: "100%" }}>{t("pricing.ctaStart")}</Link>
          </div>
          <div className="plan plan-featured">
            <h3 className="plan-name">{t("pricing.starter")}</h3>
            <div className="plan-price">{t("pricing.starterPrice")}<span>{t("pricing.starterWhen")}</span></div>
            <p className="plan-desc">{t("pricing.starterDesc")}</p>
            <ul className="plan-features">
              <li>{t("pricing.s1")}</li><li>{t("pricing.s2")}</li><li>{t("pricing.s3")}</li>
            </ul>
            <Magnet magnetStrength={4} padding={40}>
              <button onClick={() => handleUpgrade("starter")} className="btn btn-primary" style={{ width: "100%" }}>{t("pricing.ctaUpgrade")}</button>
            </Magnet>
          </div>
          <div className="plan">
            <h3 className="plan-name">{t("pricing.pro")}</h3>
            <div className="plan-price">{t("pricing.proPrice")}<span>{t("pricing.proWhen")}</span></div>
            <p className="plan-desc">{t("pricing.proDesc")}</p>
            <ul className="plan-features">
              <li>{t("pricing.p1")}</li><li>{t("pricing.p2")}</li><li>{t("pricing.p3")}</li>
            </ul>
            <button onClick={() => handleUpgrade("pro")} className="btn btn-ghost" style={{ width: "100%" }}>{t("pricing.ctaUpgrade")}</button>
          </div>
        </div>
        <p className="hint" style={{ textAlign: "center", marginTop: 28 }}>{t("pricing.note")}</p>
      </section>

      <section id="trust" className="section-space muted-band">
        <div className="site-shell">
          <div className="process-head" style={{ maxWidth: 640, marginBottom: 0 }}>
            <p className="section-eyebrow">{t("trust.eyebrow")}</p>
            <h2>{t("trust.title")}</h2>
            <p className="body-copy">{t("trust.sub")}</p>
          </div>
          <div className="trust-grid">
            {trustItems.map(([num, title, text]) => (
              <div className="trust-item" key={num}>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="site-shell section-space final-cta">
        <div>
          <p className="section-eyebrow">{t("finalCta.eyebrow")}</p>
          <h2>{t("finalCta.title")}</h2>
          <p>{t("finalCta.sub")}</p>
        </div>
        <Link href="/signup" className="btn btn-primary btn-lg">{t("finalCta.cta")}</Link>
      </section>

      <footer className="site-footer">
        <div className="site-shell footer-inner">
          <Link href="#home" className="brand">Invo<span className="brand-accent">loop</span></Link>
          <nav>
            <a href="#why">{t("nav.why")}</a><span>◆</span>
            <a href="#features">{t("nav.features")}</a><span>◆</span>
            <a href="#process">{t("nav.process")}</a><span>◆</span>
            <Link href="/login">{t("footer.login")}</Link>
          </nav>
          <nav className="footer-legal">
            <a href="#privacy">{t("footer.privacy")}</a><span>◆</span>
            <a href="#terms">{t("footer.terms")}</a><span>◆</span>
            <a href="#payments">{t("footer.payments")}</a><span>◆</span>
            <a href="https://github.com/dayyttt/involoop" target="_blank" rel="noreferrer">{t("footer.github")}</a><span>◆</span>
            <a href="mailto:hello@involoop.vercel.app">{t("footer.contact")}</a>
          </nav>
          <p className="footer-disclaimer" id="payments">
            Payments are processed by third-party providers. Involoop does not
            store full payment card details.
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
