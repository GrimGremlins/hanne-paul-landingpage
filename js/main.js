(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // — Liquid glass tier: mobile ≤600px (blur only, no SVG refraction — too GPU-heavy
  //   on mobile Safari), tablet 601–1024px (blur, optional light refraction),
  //   desktop >1024px (full blur + SVG feDisplacementMap refraction). —
  const setGlassTier = () => {
    const w = window.innerWidth;
    const tier = w <= 600 ? "mobile" : w <= 1024 ? "tablet" : "desktop";
    document.documentElement.setAttribute("data-glass-tier", tier);
  };
  setGlassTier();
  window.addEventListener("resize", setGlassTier, { passive: true });

  // — Nav: solid once scrolled, so the glass reads as an intentional bar, not a wash. —
  const nav = document.querySelector(".nav-edge");
  if (nav) {
    const toggle = () => nav.classList.toggle("glass", window.scrollY > 4);
    toggle();
    window.addEventListener("scroll", toggle, { passive: true });
  }

  // — Smooth inertial scroll (Lenis). Off for reduced-motion users. —
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3) });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // — ONE reveal pattern: opacity + translateY(20px→0), once per element, on first view. —
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    const items = document.querySelectorAll(".reveal");
    if (reduceMotion) {
      items.forEach((el) => el.classList.add("is-inview"));
    } else {
      items.forEach((el) => {
        gsap.set(el, { opacity: 0, y: 20 });
        ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          once: true,
          onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" }),
        });
      });
    }
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-inview"));
  }

  // — Magnetic hover: primary buttons only, desktop fine-pointer only, max ~7px pull. —
  if (fineHover && !reduceMotion) {
    document.querySelectorAll(".magnetic").forEach((el) => {
      const strength = 7;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * strength;
        const y = ((e.clientY - r.top) / r.height - 0.5) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  // — Liquid glass "flow": slow breathing of the SVG displacement, desktop + motion-ok only.
  //   Reference implementations (liquid-glass-effect-macos) don't animate this themselves;
  //   the flow is our own addition, kept cheap (a plain interval, not per-frame rAF work). —
  if (!reduceMotion && document.documentElement.getAttribute("data-glass-tier") === "desktop") {
    const turbulence = document.getElementById("glass-turbulence");
    const displace = document.getElementById("glass-displace");
    if (turbulence && displace) {
      let t = 0;
      setInterval(() => {
        if (document.documentElement.getAttribute("data-glass-tier") !== "desktop") return;
        t += 0.05;
        const bf = 0.008 + Math.sin(t) * 0.002;
        turbulence.setAttribute("baseFrequency", `${bf.toFixed(4)} 0.03`);
        displace.setAttribute("scale", String(30 + Math.sin(t * 0.7) * 6));
      }, 90);
    }
  }

  // — Mission side-quote: opt-in enhancement, motion-ok + GSAP only, on every
  //   viewport now. Default markup (see index.html/style.css) is a plain,
  //   fully visible, centered quote — this only upgrades it; every fallback
  //   path leaves the plain version.
  //   Desktop (>1024px) gets the full pin+side-inset treatment. Mobile/tablet
  //   get the same word-by-word scrub WITHOUT `pin` — `pin` relies on
  //   position:sticky-style layout locking that fights iOS Safari's dynamic
  //   toolbar (the viewport height changes as you scroll, which can make a
  //   pinned section jump or double-trigger) — scrubbing without pinning
  //   gives every viewport a real scroll-linked effect without that risk. —
  const missionSection = document.getElementById("mission-quote");
  const quoteEl = missionSection && missionSection.querySelector("[data-scroll-quote]");
  if (
    missionSection && quoteEl && !reduceMotion &&
    window.gsap && window.ScrollTrigger
  ) {
    const text = quoteEl.textContent.trim();
    quoteEl.innerHTML = text
      .split(" ")
      .map((w) => `<span class="word">${w}</span>`)
      .join(" ");
    const words = quoteEl.querySelectorAll(".word");

    if (window.innerWidth > 1024) {
      const pinWrap = document.createElement("div");
      pinWrap.className = "mission__pin";
      missionSection.classList.add("mission--pinned");
      while (missionSection.firstChild) pinWrap.appendChild(missionSection.firstChild);
      missionSection.appendChild(pinWrap);

      gsap.timeline({
        scrollTrigger: {
          trigger: missionSection,
          start: "top top",
          end: "+=120%",
          scrub: 0.6,
          pin: pinWrap,
        },
      }).to(words, { opacity: 1, duration: words.length, stagger: 1, ease: "none" });
    } else {
      gsap.set(words, { opacity: 0.28 });
      gsap.timeline({
        scrollTrigger: {
          trigger: missionSection,
          start: "top 80%",
          end: "bottom 45%",
          scrub: 0.4,
        },
      }).to(words, { opacity: 1, duration: words.length, stagger: 1, ease: "none" });
    }

    // The eyebrow/quote were already wired into the generic .reveal pass above,
    // then just got moved/restyled — recompute all trigger positions.
    ScrollTrigger.refresh();
  }

  // — Split-Text animation on Hero headline —
  const splitHeadlines = document.querySelectorAll("[data-split-headline]");
  if (splitHeadlines.length > 0) {
    splitHeadlines.forEach((headline) => {
      const inners = headline.querySelectorAll(".split-inner");
      if (reduceMotion || !window.gsap) {
        headline.classList.add("is-inview");
      } else {
        // Läuft das Intro (fx-hero.js), startet die Headline erst, wenn der Vorhang hochgeht.
        const intro = document.documentElement.classList.contains("hp-intro-pending") && !window.__hpIntroDone;
        const tween = gsap.fromTo(
          inners,
          { opacity: 0, y: "115%" },
          {
            opacity: 1,
            y: "0%",
            duration: 1.05,
            stagger: 0.14,
            ease: "power3.out",
            delay: 0.12,
            paused: intro,
            onComplete: () => headline.classList.add("is-inview"),
          }
        );
        if (intro) {
          const go = () => tween.play();
          window.addEventListener("hp:intro-done", go, { once: true });
          setTimeout(go, 4000); // Failsafe
        }
      }
    });
  }

  // — 3D Card Tilt + Hover Glow Reveal for Social Proof Cards —
  if (fineHover && !reduceMotion) {
    const tiltCards = document.querySelectorAll("[data-tilt]");
    tiltCards.forEach((card) => {
      let rect = null;
      let rafId = null;

      const updateTransform = (x, y) => {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -7;
        const rotateY = ((x - centerX) / centerX) * 7;

        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
        card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px)`;
      };

      card.addEventListener("mouseenter", () => {
        rect = card.getBoundingClientRect();
      });

      card.addEventListener("mousemove", (e) => {
        if (!rect) rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => updateTransform(x, y));
      });

      card.addEventListener("mouseleave", () => {
        rect = null;
        if (rafId) cancelAnimationFrame(rafId);
        card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)";
      });
    });
  }
  // — Design-Update 29.09.2026 (design-xray typetypehype.de): Parallax (Baustein 11), Text-Mask-Reveal (24),
  //   handgezeichnete Linie (32), Scroll-Fortschritt. Alles JS-erzeugt und nur bei erlaubter Bewegung;
  //   ohne JS/GSAP oder bei reduced-motion bleibt die Seite unverändert vollständig lesbar. —
  if (!reduceMotion && window.gsap && window.ScrollTrigger) {
    const easeOut = "expo.out";
    const small = window.innerWidth <= 1024;

    // Parallax: Aurora läuft mit halber Scroll-Rate (Rate 2, Drift max ~167px), mobil reduziert.
    const hero = document.querySelector(".hero");
    const aurora = document.querySelector(".hero__aurora");
    if (hero && aurora) {
      gsap.to(aurora, {
        y: small ? 70 : 167,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
      });
      const heroContent = hero.querySelector(".hero__content");
      if (heroContent && !small) {
        gsap.to(heroContent, {
          y: -40,
          opacity: 0.35,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "40% top", end: "bottom top", scrub: true },
        });
      }
    }

    // Text-Mask-Reveal + Brass-Regel unter ausgewählten Überschriften.
    // Opus-Runde: die frühere SVG-„Handlinie“ (preserveAspectRatio=none) wurde
    // verzerrt gestrichen und wirkte wellig — ersetzt durch eine exakte 2-px-Regel
    // mit Endpunkt, die per scaleX von links einzeichnet.
    document.querySelectorAll("[data-mask]").forEach((h) => {
      const rule = document.createElement("span");
      rule.className = "hand-line";
      rule.setAttribute("aria-hidden", "true");
      h.insertAdjacentElement("afterend", rule);

      gsap.set(h, { clipPath: "inset(0 0 100% 0)", y: 28 });
      gsap.set(rule, { scaleX: 0 });
      ScrollTrigger.create({
        trigger: h,
        start: "top 88%",
        once: true,
        onEnter: () => {
          gsap.to(h, { clipPath: "inset(-0.2em -0.1em -0.3em -0.1em)", y: 0, duration: 1.1, ease: easeOut });
          gsap.to(rule, { scaleX: 1, duration: 1.2, ease: "expo.inOut", delay: 0.35 });
        },
      });
    });

    // Nav über dunklen Flächen (Mission): dunkle Glasvariante statt grauem Schleier.
    const navEl = document.querySelector(".nav-edge");
    document.querySelectorAll(".mission").forEach((dark) => {
      if (!navEl) return;
      ScrollTrigger.create({
        trigger: dark,
        start: "top 60px",
        end: "bottom 60px",
        toggleClass: { targets: navEl, className: "nav-edge--dark" },
      });
    });

    // Scroll-Fortschritt: feine Brass-Linie am oberen Rand.
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    gsap.to(bar, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: 0.3 },
    });

    ScrollTrigger.refresh();
  }
})();
