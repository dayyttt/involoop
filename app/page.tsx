"use client";

import { useState } from "react";
import Link from "next/link";
import NeonLandscape from "@/components/NeonLandscape";
import { landing, getInitialLang, setLangCookie, landingText, landingItems, type Lang } from "@/lib/i18n";

export default function Home() {
  const [lang, setLang] = useState<Lang>(getInitialLang());
  const t = (key: string) => landingText(lang, key);

  const toggleLang = () => {
    const next: Lang = lang === "en" ? "id" : "en";
    setLangCookie(next);
    setLang(next);
  };

  const features = landingItems(lang, "features.items");
  const processSteps = landingItems(lang, "process.steps");
  const personas = lang === "en" ? landing.personas.en : landing.personas.id;

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
            <h1>
              {t("hero.h1a")}
              <br />
              <span className="gradient-text">{t("hero.h1b")}</span>
            </h1>
            <p>{t("hero.sub")}</p>
            <div className="hero-actions">
              <Link href="/signup" className="btn btn-primary btn-lg">
                {t("hero.cta1")}
              </Link>
              <Link href="/login" className="btn btn-ghost btn-lg">
                {t("hero.cta2")}
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
          </div>
        </div>
        <div className="trust-strip">
          <div className="marquee">
            <div className="marquee-track">
              {[...personas, ...personas].map((item, i) => (
                <span key={i}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="site-shell section-space split-section">
        <img src="/involoop-about.jpg" alt="Freelancer at work" className="section-image" />
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
            <div><strong>{t("why.m1")}</strong><span>{t("why.m1l")}</span></div>
            <div><strong>{t("why.m2")}</strong><span>{t("why.m2l")}</span></div>
            <div><strong>{t("why.m3")}</strong><span>{t("why.m3l")}</span></div>
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
                <article className={`feature-card${index === 1 ? " feature-card-active" : ""}`} key={num}>
                  <span className="feature-icon">{num}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <Link href="/signup">{t("features.tryCta")}</Link>
                </article>
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
            <Link href="/signup" className="btn btn-primary" style={{ width: "100%" }}>{t("pricing.ctaStart")}</Link>
          </div>
          <div className="plan">
            <h3 className="plan-name">{t("pricing.pro")}</h3>
            <div className="plan-price">{t("pricing.proPrice")}<span>{t("pricing.proWhen")}</span></div>
            <p className="plan-desc">{t("pricing.proDesc")}</p>
            <ul className="plan-features">
              <li>{t("pricing.p1")}</li><li>{t("pricing.p2")}</li><li>{t("pricing.p3")}</li>
            </ul>
            <Link href="/signup" className="btn btn-ghost" style={{ width: "100%" }}>{t("pricing.ctaContact")}</Link>
          </div>
        </div>
        <p className="hint" style={{ textAlign: "center", marginTop: 28 }}>{t("pricing.note")}</p>
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
          <div className="footer-bottom">
            <span>© 2026 Involoop.</span>
            <span>{t("footer.tag")}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
