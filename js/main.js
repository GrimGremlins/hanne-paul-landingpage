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
          onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }),
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
})();
