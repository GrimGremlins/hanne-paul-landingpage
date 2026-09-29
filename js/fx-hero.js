/* fx-hero.js · Hero-Effektpaket: Intro-Vorhang, Marquee-Band, Kreis-Badge, Spotlight.
 * Läuft nach main.js. Alles JS-erzeugt, dekorativ = aria-hidden (außer dem Badge-Link).
 * Ohne JS oder bei prefers-reduced-motion bleibt die Seite unverändert lesbar.
 */
(() => {
  "use strict";

  const doc = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGsap = Boolean(window.gsap);
  const hero = document.querySelector("section.hero");
  const SVG_NS = "http://www.w3.org/2000/svg";

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const makeSvg = (tag, attrs) => {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  };

  const whenParsed = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      window.setTimeout(fn, 0);
    }
  };

  // — Gemeinsamer Takt: gsap.ticker, sonst eigenes rAF. Callback: (timeMs, deltaMs). —
  const tickers = [];
  const addTick = (fn) => {
    if (hasGsap) {
      window.gsap.ticker.add((time, deltaTime) => fn(time * 1000, deltaTime));
      return;
    }
    tickers.push(fn);
    if (tickers.length === 1) {
      let last = performance.now();
      const loop = (now) => {
        const delta = now - last;
        last = now;
        tickers.forEach((cb) => cb(now, delta));
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  };

  // ————————————————————— 1 · Intro-Vorhang —————————————————————
  const SEEN_KEY = "hp-intro-seen";
  let introFinished = false;

  const introSeen = () => {
    try { return window.sessionStorage.getItem(SEEN_KEY) === "1"; } catch (e) { return true; } // Storage gesperrt: Intro überspringen
  };
  const markIntroSeen = () => {
    try { window.sessionStorage.setItem(SEEN_KEY, "1"); } catch (e) { /* ignorieren */ }
  };

  const finishIntro = (overlay) => {
    if (introFinished) return;
    introFinished = true;
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    doc.classList.remove("has-intro");
    doc.classList.remove("hp-intro-pending");
    window.__hpIntroDone = true;
    window.dispatchEvent(new Event("hp:intro-done"));
    // Layout hat sich durch das Ende des Intros geändert: alle Trigger neu messen.
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  };

  const initIntro = () => {
    const skip = reduceMotion || !hasGsap || introSeen() || Boolean(window.location.hash);
    if (skip) {
      doc.classList.remove("hp-intro-pending");
      // Später feuern, damit auch nachfolgende Skripte (fx-sections.js) den Listener schon haben.
      whenParsed(() => finishIntro(null));
      return;
    }

    markIntroSeen();

    const overlay = make("div", "fx-intro");
    overlay.setAttribute("aria-hidden", "true");
    const inner = make("div", "fx-intro__inner");
    const mark = make("div", "fx-intro__mark", "Hanne Paul");
    const rule = make("div", "fx-intro__rule");
    inner.append(mark, rule);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);
    doc.classList.add("has-intro");
    doc.classList.remove("hp-intro-pending"); // echtes Overlay steht, gleiche Farbe, nahtlos

    // Sicherheitsnetz: Egal was passiert, das Overlay verschwindet.
    window.setTimeout(() => finishIntro(overlay), 3500);

    const run = () => {
      if (introFinished) return;
      const tl = window.gsap.timeline({ onComplete: () => finishIntro(overlay) });
      tl.fromTo(mark, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, 0)
        .fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power2.inOut" }, 0.1)
        .add(() => { overlay.style.pointerEvents = "none"; }, 0.65)
        .to(mark, { opacity: 0, y: -18, duration: 0.3, ease: "power2.in" }, 0.65)
        .to(rule, { opacity: 0, duration: 0.2, ease: "none" }, 0.65)
        .to(overlay, { clipPath: "inset(0 0 100% 0)", duration: 0.5, ease: "power3.inOut" }, 0.65);
    };

    // Auf die Schrift warten, aber höchstens 250 ms (Gesamtdauer bleibt ≤ 1,4 s).
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((resolve) => window.setTimeout(resolve, 250))]).then(run, run);
  };

  // ————————————————————— Scroll-Geschwindigkeit (geteilt) —————————————————————
  const motion = { v: 0, lastY: window.scrollY, primed: false };

  const updateVelocity = (deltaMs) => {
    const dt = deltaMs / 1000;
    const y = window.scrollY;
    if (!motion.primed) {
      motion.primed = true;
      motion.lastY = y;
      return;
    }
    if (dt > 0) {
      const raw = (y - motion.lastY) / dt; // px/s, positiv = nach unten
      motion.v += (clamp(raw, -4000, 4000) - motion.v) * 0.12;
    }
    motion.lastY = y;
  };

  // ————————————————————— 2 · Marquee-Band —————————————————————
  const WORDS = ["Beratung", "Vermittlung", "Projektentwicklung", "Gewerbeimmobilien", "Handelsimmobilien", "Standortanalyse"];
  const BASE_SPEED = 55; // px/s, Richtung links

  const buildSet = () => {
    const frag = document.createDocumentFragment();
    WORDS.forEach((word, i) => {
      frag.appendChild(make("span", "fx-marquee__word" + (i % 2 ? " is-outline" : ""), word));
      frag.appendChild(make("span", "fx-marquee__star", "✦"));
    });
    return frag;
  };

  const initMarquee = () => {
    if (!hero) return null;

    const isStatic = reduceMotion || !hasGsap;
    const band = make("div", "fx-marquee" + (isStatic ? " is-static" : ""));
    band.setAttribute("aria-hidden", "true");
    const track = make("div", "fx-marquee__track");
    band.appendChild(track);
    hero.insertAdjacentElement("afterend", band);

    const state = { x: 0, groupW: 0, visible: true };

    const build = () => {
      track.textContent = "";
      state.x = 0;

      const probe = make("div", "fx-marquee__group");
      probe.appendChild(buildSet());
      track.appendChild(probe);

      if (isStatic) return; // Statisch: genau ein Satz, umbrechend

      const setW = probe.getBoundingClientRect().width;
      const repeats = setW > 0 ? Math.max(1, Math.ceil(window.innerWidth / setW)) : 2;
      for (let i = 1; i < repeats; i += 1) probe.appendChild(buildSet());

      track.appendChild(probe.cloneNode(true)); // zweite Gruppe für die Endlosschleife
      state.groupW = probe.getBoundingClientRect().width;
    };

    build();

    if (isStatic) return null;

    // Nach dem Laden der Schrift neu messen; danach bei Breitenänderung (entprellt).
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(build, () => {});
    let lastW = window.innerWidth;
    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (window.innerWidth !== lastW) {
          lastW = window.innerWidth;
          build();
        }
      }, 200);
    }, { passive: true });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        state.visible = entries[entries.length - 1].isIntersecting;
      }, { rootMargin: "100px 0px" }).observe(band);
    }

    return (deltaMs) => {
      if (!state.visible || state.groupW <= 0) return;
      const dt = Math.min(deltaMs, 50) / 1000;
      // Scrollen nach unten beschleunigt die Bewegung nach links, Scrollen nach oben bremst/kehrt um.
      const speed = BASE_SPEED + clamp(motion.v, -2500, 2500) * 0.35;
      state.x -= speed * dt;
      if (state.x <= -state.groupW) state.x += state.groupW;
      else if (state.x > 0) state.x -= state.groupW;
      track.style.transform = "translate3d(" + state.x.toFixed(2) + "px,0,0)";
    };
  };

  // ————————————————————— 3 · Rotierendes Kreis-Badge —————————————————————
  const initBadge = () => {
    if (!hero) return null;

    const link = make("a", "fx-badge");
    link.setAttribute("href", "#kontakt");
    link.setAttribute("aria-label", "Erstgespräch anfragen");

    const ring = makeSvg("svg", { class: "fx-badge__ring", viewBox: "0 0 140 140", "aria-hidden": "true", focusable: "false" });
    ring.appendChild(makeSvg("circle", { class: "fx-badge__disc", cx: "70", cy: "70", r: "68" }));
    const path = makeSvg("path", {
      id: "fx-badge-path",
      d: "M70 70 m-50 0 a50 50 0 1 1 100 0 a50 50 0 1 1 -100 0",
      fill: "none",
    });
    ring.appendChild(path);
    const text = makeSvg("text", { class: "fx-badge__text" });
    const textPath = makeSvg("textPath", { textLength: "308", lengthAdjust: "spacing" });
    textPath.setAttribute("href", "#fx-badge-path");
    textPath.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#fx-badge-path");
    textPath.textContent = "ERSTGESPRÄCH · UNVERBINDLICH · KOSTENFREI ·";
    text.appendChild(textPath);
    ring.appendChild(text);

    const arrow = makeSvg("svg", { class: "fx-badge__arrow", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" });
    arrow.appendChild(makeSvg("path", { d: "M5 12h13M13 6.5l5.5 5.5-5.5 5.5" }));

    link.append(ring, arrow);
    hero.appendChild(link);

    if (reduceMotion || typeof ring.getAnimations !== "function") return null;

    const spin = ring.getAnimations()[0];
    if (!spin) return null;

    let visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries[entries.length - 1].isIntersecting;
      }).observe(hero);
    }

    let rate = 1;
    return () => {
      if (!visible) return;
      const target = 1 + Math.min(Math.abs(motion.v) / 220, 9); // schneller drehen beim Scrollen
      rate += (target - rate) * 0.1;
      if (Math.abs(spin.playbackRate - rate) > 0.02) spin.playbackRate = rate;
    };
  };

  // ————————————————————— 4 · Hero-Spotlight —————————————————————
  const initSpotlight = () => {
    if (!hero || reduceMotion || !fineHover) return;

    const wrap = make("div", "fx-spot");
    wrap.setAttribute("aria-hidden", "true");
    wrap.appendChild(make("div", "fx-spot__glow"));
    const content = hero.querySelector(".hero__content");
    hero.insertBefore(wrap, content || null);

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    let active = false;

    const frame = () => {
      x += (targetX - x) * 0.14;
      y += (targetY - y) * 0.14;
      wrap.style.setProperty("--fx-x", x.toFixed(1) + "px");
      wrap.style.setProperty("--fx-y", y.toFixed(1) + "px");
      if (Math.abs(targetX - x) > 0.3 || Math.abs(targetY - y) > 0.3) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0;
      }
    };

    hero.addEventListener("pointermove", (e) => {
      const rect = hero.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      if (!active) {
        active = true;
        x = targetX;
        y = targetY;
        wrap.classList.add("is-on");
      }
      if (!raf) raf = requestAnimationFrame(frame);
    }, { passive: true });

    hero.addEventListener("pointerleave", () => {
      active = false;
      wrap.classList.remove("is-on");
    });
  };

  // ————————————————————— 5 · Mobiler Sticky-CTA (≤ 600 px, per CSS) —————————————————————
  const initStickyCta = () => {
    const heroCta = document.querySelector(".hero__cta");
    if (!heroCta || !("IntersectionObserver" in window)) return null;

    const pill = make("a", "fx-sticky-cta");
    pill.setAttribute("href", "#kontakt");
    pill.append(make("span", "fx-sticky-cta__label", "Erstgespräch anfragen"));
    const arrow = makeSvg("svg", { class: "fx-sticky-cta__arrow", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" });
    arrow.appendChild(makeSvg("path", { d: "M5 12h13M13 6.5l5.5 5.5-5.5 5.5" }));
    pill.appendChild(arrow);
    document.body.appendChild(pill);

    // Sichtbar = Hero-CTA nach oben aus dem Viewport gelaufen UND weder #kontakt noch Footer im Blick.
    const seen = { ctaPassed: false, kontakt: false, footer: false };
    const apply = () => {
      pill.classList.toggle("is-visible", seen.ctaPassed && !seen.kontakt && !seen.footer);
    };

    new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      seen.ctaPassed = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
      apply();
    }).observe(heroCta);

    // Ziel-Bereiche etwas früher melden (Puffer nach unten), damit die Pille nie über dem Text liegt.
    const watch = (target, key) => {
      if (!target) return;
      new IntersectionObserver((entries) => {
        seen[key] = entries[entries.length - 1].isIntersecting;
        apply();
      }, { rootMargin: "0px 0px 96px 0px" }).observe(target);
    };
    watch(document.getElementById("kontakt"), "kontakt");
    watch(document.querySelector("footer"), "footer");

    if (reduceMotion) return null;

    // Optional: beim Abwärtsscrollen etwas kleiner, beim Aufwärtsscrollen wieder normal (mit Hysterese).
    let compact = false;
    return () => {
      if (!compact && motion.v > 200) {
        compact = true;
        pill.classList.add("is-compact");
      } else if (compact && motion.v < -120) {
        compact = false;
        pill.classList.remove("is-compact");
      }
    };
  };

  // ————————————————————— Start —————————————————————
  initIntro();
  initSpotlight();
  const stepMarquee = initMarquee();
  const stepBadge = initBadge();
  const stepCta = initStickyCta();

  if (stepMarquee || stepBadge || stepCta) {
    addTick((time, deltaMs) => {
      updateVelocity(deltaMs);
      if (stepMarquee) stepMarquee(deltaMs);
      if (stepBadge) stepBadge();
      if (stepCta) stepCta();
    });
  }
})();
