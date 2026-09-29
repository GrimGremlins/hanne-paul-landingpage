/* fx-sections.js — Sektions-Effektpaket (Auftrag B). Lädt nach main.js.
   Progressive Enhancement: ohne GSAP/ScrollTrigger oder bei prefers-reduced-motion
   passiert nichts, die Seite bleibt unverändert und vollständig lesbar. */
(() => {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const EASE = "expo.out";
  const stacked = window.matchMedia("(max-width: 900px)").matches; // Ziffer im Fluss statt daneben

  // — 1) Leistungen: Kontur-Ziffer mit Parallax und Fill-Wipe —
  document.querySelectorAll(".leistung--step").forEach((block, i) => {
    const label = String(i + 1).padStart(2, "0");
    const wrap = document.createElement("span");
    wrap.className = "fx-numeral";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = `<span class="fx-numeral__outline">${label}</span><span class="fx-numeral__fill">${label}</span>`;
    block.insertBefore(wrap, block.firstChild);

    gsap.fromTo(
      wrap,
      { y: stacked ? -6 : -50 },
      {
        y: stacked ? 6 : 50,
        ease: "none",
        scrollTrigger: { trigger: block, start: "top bottom", end: "bottom top", scrub: 0.6 },
      }
    );
    gsap.to(wrap.querySelector(".fx-numeral__fill"), {
      clipPath: "inset(0% 0 0 0)",
      duration: 1.5,
      ease: EASE,
      scrollTrigger: { trigger: block, start: "top 75%", once: true },
    });
  });

  // — 2) Proof: Count-up nur für führende Ziffern —
  document.querySelectorAll(".proof__number").forEach((el) => {
    const original = el.textContent;
    const m = original.trim().match(/^(\d+)(.*)$/s);
    if (!m) return;
    const target = parseInt(m[1], 10);
    const rest = m[2];
    const state = { n: 0 };
    el.textContent = `0${rest}`;
    gsap.to(state, {
      n: target,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => { el.textContent = `${Math.round(state.n)}${rest}`; },
      onComplete: () => { el.textContent = original; },
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  // — 3) Prozess: Fortschrittslinie + aktive Nummer —
  const list = document.querySelector(".prozess__list");
  if (list) {
    const cards = Array.from(list.querySelectorAll(".prozess__card"));
    const line = document.createElement("span");
    line.className = "fx-prozess-line";
    line.setAttribute("aria-hidden", "true");
    line.innerHTML = '<span class="fx-prozess-line__fill"></span>';
    list.appendChild(line);

    const setActive = () => {
      const threshold = window.innerHeight * 0.6;
      let current = -1;
      cards.forEach((c, idx) => { if (c.getBoundingClientRect().top < threshold) current = idx; });
      cards.forEach((c, idx) => {
        c.classList.toggle("is-active", idx === current);
        c.classList.toggle("is-done", idx < current);
      });
    };

    gsap.to(line.firstChild, {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: list,
        start: "top 70%",
        end: "bottom 60%",
        scrub: 0.4,
        onUpdate: setActive,
        onRefresh: setActive,
      },
    });
    setActive();
  }

  // — 4) FAQ: weiches Öffnen/Schließen (Höhe + Opacity), Tastatur bleibt nativ —
  document.querySelectorAll("details.faq__item").forEach((item) => {
    const summary = item.querySelector("summary");
    const answer = item.querySelector(".faq__answer");
    if (!summary || !answer) return;

    summary.addEventListener("click", (e) => {
      e.preventDefault();
      gsap.killTweensOf(answer);

      if (!item.open) {
        item.classList.remove("is-closing");
        item.open = true;
        const pb = parseFloat(getComputedStyle(answer).paddingBottom) || 0;
        gsap.fromTo(
          answer,
          { height: 0, opacity: 0, paddingBottom: 0 },
          {
            height: "auto",
            opacity: 1,
            paddingBottom: pb,
            duration: 0.6,
            ease: EASE,
            onComplete: () => {
              gsap.set(answer, { clearProps: "height,opacity,paddingBottom" });
              ScrollTrigger.refresh();
            },
          }
        );
      } else {
        item.classList.add("is-closing");
        gsap.to(answer, {
          height: 0,
          opacity: 0,
          paddingBottom: 0,
          duration: 0.4,
          ease: "power3.inOut",
          onComplete: () => {
            item.open = false;
            item.classList.remove("is-closing");
            gsap.set(answer, { clearProps: "height,opacity,paddingBottom" });
            ScrollTrigger.refresh();
          },
        });
      }
    });
  });

  // — 6) Footer: Riesen-Wortmarke baut sich am Seitenende von unten auf —
  const foot = document.querySelector("footer.foot-letter");
  if (foot) {
    const wm = document.createElement("div");
    wm.className = "fx-wordmark";
    wm.setAttribute("aria-hidden", "true");
    wm.innerHTML = "<span>Hanne Paul</span>";
    foot.appendChild(wm);
    gsap.to(wm, {
      clipPath: "inset(0% 0 0 0)",
      ease: "none",
      scrollTrigger: { trigger: foot, start: "top 85%", end: "bottom bottom", scrub: 0.5 },
    });
  }

  ScrollTrigger.refresh();
})();
