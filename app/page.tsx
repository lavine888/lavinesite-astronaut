"use client";

import { useEffect, useRef, useState } from "react";
import SceneCanvas from "./scene-canvas";
import styles from "./page.module.css";
import cinematic from "./cinematic.module.css";
import archiveFx from "./archive-transitions.module.css";
import archiveMaterial from "./archive-material.module.css";
import artifactFocus from "./artifact-focus.module.css";
import archiveDecode from "./archive-decode.module.css";
import heroSeal from "./hero-seal.module.css";
import exhibition from "./exhibition.module.css";
import handoff from "./handoff.module.css";

const MAIN_PROFILE = "https://lavine-site.vercel.app/profile";
const SCENE_LABELS = ["ORIGIN", "THRESHOLD", "LOGIC", "ARTIFACTS", "GATEWAY"];
const SCENE_META = [
  { code: "00-A", title: "ORIGIN", note: "Archive handshake / identity channel", coord: "22.3193°N 114.1694°E" },
  { code: "01-T", title: "THRESHOLD", note: "Mechanical seal / one-way passage", coord: "ACCESS VECTOR 024°" },
  { code: "02-L", title: "LOGIC", note: "Build · measure · ship", coord: "SYSTEM LAYER / ACTIVE" },
  { code: "03-A", title: "ARTIFACTS", note: "Objects with evidence attached", coord: "OBJECT FIELD / 04" },
  { code: "04-G", title: "GATEWAY", note: "Exit cinematic layer / enter record", coord: "PROFILE LINK / OPEN" },
];

const artifacts = [
  {
    index: "01",
    name: "Wozai · 我在",
    tag: "Human AI",
    outcome: "2nd Place in Track · Hong Kong Physical AI Hackathon",
    href: "https://www.wozai.space/",
  },
  {
    index: "02",
    name: "Agent JAM",
    tag: "AI Collab",
    outcome: "First Prize · Agent Builder Hackathon, Shenzhen",
    href: "https://lavine888.github.io/AgentJAM-showcase/",
  },
  {
    index: "03",
    name: "PandaAI Quant",
    tag: "Signals",
    outcome: "National Runner-up · Top 1%",
    href: MAIN_PROFILE,
  },
  {
    index: "04",
    name: "LiveLink",
    tag: "AI Network",
    outcome: "30-hour Hackathon Prototype",
    href: "https://livelink-delta.vercel.app/",
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const pulse = (value: number, center: number, radius: number) => Math.max(0, 1 - Math.abs(value - center) / radius);
const smoothstep = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / Math.max(0.0001, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function sceneOpacity(position: number, center: number, radius = 0.54) {
  return clamp(1 - Math.abs(position - center) / radius, 0, 1);
}

export default function LavineArchive() {
  const stageRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);
  const activeSceneRef = useRef(0);
  const activeArtifactRef = useRef(0);
  const [activeScene, setActiveScene] = useState(0);
  const [activeArtifact, setActiveArtifact] = useState(0);
  const [focusedArtifact, setFocusedArtifact] = useState<number | null>(null);
  const [showBoot, setShowBoot] = useState(true);
  const [gatewayExit, setGatewayExit] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("lavine-archive-boot-seen")) {
        setShowBoot(false);
      } else {
        window.sessionStorage.setItem("lavine-archive-boot-seen", "1");
      }
    } catch {
      // Keep the full boot when session storage is unavailable.
    }

    const prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.href = MAIN_PROFILE;
    document.head.appendChild(prefetch);
    return () => prefetch.remove();
  }, []);

  useEffect(() => {
    const index = activeScene === 3 ? (focusedArtifact ?? activeArtifact) : (focusedArtifact ?? -1);
    window.dispatchEvent(new CustomEvent("artifact-focus", { detail: index }));
  }, [activeArtifact, activeScene, focusedArtifact]);

  useEffect(() => {
    const stage = stageRef.current;
    const progressBar = progressRef.current;
    if (!stage || !progressBar) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const settleAnchors = [0.235, 0.447, 0.61, 0.665, 0.72, 0.91];
    let target = 0;
    let current = 0;
    let raf = 0;
    let last = performance.now();
    let lastScrollAt = performance.now();

    const readScroll = () => {
      const travel = document.documentElement.scrollHeight - window.innerHeight;
      target = travel > 0 ? clamp(window.scrollY / travel, 0, 1) : 0;
      lastScrollAt = performance.now();
    };

    const paint = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const smoothing = reducedMotion ? 1 : 1 - Math.pow(0.0008, dt);
      let visualTarget = target;

      if (!reducedMotion && now - lastScrollAt > 130) {
        let nearest = settleAnchors[0];
        let nearestDistance = Math.abs(target - nearest);
        settleAnchors.forEach((anchor) => {
          const distance = Math.abs(target - anchor);
          if (distance < nearestDistance) {
            nearest = anchor;
            nearestDistance = distance;
          }
        });
        if (nearestDistance < 0.038) {
          const pull = 1 - nearestDistance / 0.038;
          const strength = pull * pull * 0.82;
          visualTarget = target + (nearest - target) * strength;
        }
      }

      current += (visualTarget - current) * smoothing;

      progressBar.style.transform = `scaleX(${current})`;
      const hatchImpact = pulse(current, 0.235, 0.075);
      const gatewayImpact = pulse(current, 0.91, 0.12);
      const impact = Math.max(hatchImpact, gatewayImpact * 0.58);
      const breach = pulse(current, 0.235, 0.052);
      const logicCut = pulse(current, 0.505, 0.048);
      const vaultCut = pulse(current, 0.705, 0.055);
      const sealTravel = smoothstep(0.018, 0.14, current);
      const sealBreak = smoothstep(0.085, 0.182, current);
      stage.style.setProperty("--impact", impact.toFixed(4));
      stage.style.setProperty("--story-progress", current.toFixed(4));
      stage.style.setProperty("--gateway", clamp((current - 0.78) / 0.22, 0, 1).toFixed(4));
      stage.style.setProperty("--scan", `${((current * 112) % 100).toFixed(3)}%`);
      stage.style.setProperty("--breach", breach.toFixed(4));
      stage.style.setProperty("--logic-cut", logicCut.toFixed(4));
      stage.style.setProperty("--vault-cut", vaultCut.toFixed(4));
      stage.style.setProperty("--seal-travel", sealTravel.toFixed(4));
      stage.style.setProperty("--seal-break", sealBreak.toFixed(4));

      const position = current * (SCENE_LABELS.length - 1);
      const nextScene = clamp(Math.round(position), 0, SCENE_LABELS.length - 1);
      if (nextScene !== activeSceneRef.current) {
        activeSceneRef.current = nextScene;
        setActiveScene(nextScene);
      }

      if (current > 0.555 && current < 0.815) {
        const exhibit = clamp((current - 0.565) / 0.205, 0, 0.999);
        const nextArtifact = clamp(Math.floor(exhibit * artifacts.length), 0, artifacts.length - 1);
        if (nextArtifact !== activeArtifactRef.current) {
          activeArtifactRef.current = nextArtifact;
          setActiveArtifact(nextArtifact);
        }
      }

      chapterRefs.current.forEach((node, index) => {
        if (!node) return;
        const opacity = sceneOpacity(position, index, index === 0 ? 0.62 : 0.54);
        const offset = clamp((position - index) * -64, -50, 50);
        const scale = 0.988 + opacity * 0.012;
        node.style.opacity = opacity.toFixed(3);
        node.style.transform = `translate3d(0, ${offset}px, 0) scale(${scale})`;
        node.style.pointerEvents = opacity > 0.66 ? "auto" : "none";
      });

      raf = requestAnimationFrame(paint);
    };

    readScroll();
    window.addEventListener("scroll", readScroll, { passive: true });
    raf = requestAnimationFrame(paint);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", readScroll);
    };
  }, []);

  const sceneMeta = SCENE_META[activeScene];
  const focusArtifact = (index: number | null) => setFocusedArtifact(index);
  const handleGatewayEnter = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (gatewayExit) return;
    setGatewayExit(true);
    window.setTimeout(() => {
      window.location.href = MAIN_PROFILE;
    }, 650);
  };

  return (
    <main ref={stageRef} data-scene={activeScene} className={`${styles.stage} ${cinematic.stageBoost}`}>
      <SceneCanvas />

      <div className={`${archiveFx.archiveBackdrop} ${archiveMaterial.backdropRefined}`} aria-hidden="true">
        <div className={`${archiveFx.vaultPerspective} ${archiveMaterial.perspectiveRefined}`} />
        <div className={`${archiveFx.goldAtmosphere} ${archiveMaterial.atmosphereRefined}`} />
        <div className={`${archiveFx.depthSlabs} ${archiveMaterial.slabsRefined}`} />
      </div>

      <div className={heroSeal.sceneLight} aria-hidden="true" />
      <div className={heroSeal.seal} aria-hidden="true">
        <div className={heroSeal.spokes}><i /><i /><i /><i /><i /><i /><i /><i /></div>
        <div className={heroSeal.core}>
          <div className={heroSeal.mark}>
            <b>LX</b>
            <span>888 / ARCHIVE SEAL</span>
            <small>IDENTITY CORE / VERIFIED</small>
          </div>
        </div>
      </div>

      {showBoot && (
        <div className={archiveFx.bootSequence} aria-hidden="true">
          <div className={archiveFx.bootCore}>
            <span>PERSONAL SYSTEM / LX-888</span>
            <b>LAVINE / ARCHIVE</b>
            <small>INDEXING SELECTED OBJECTS · SIGNAL VERIFIED</small>
            <div className={archiveFx.bootStatus}><i /></div>
          </div>
        </div>
      )}

      <div className={archiveFx.transitionVeil} aria-hidden="true">
        <div className={archiveFx.alloyGrade} />
        <div className={archiveFx.breachCut} />
        <div className={archiveFx.logicCut} />
        <div className={archiveFx.vaultCut} />
      </div>

      <div className={styles.fx} aria-hidden="true">
        <div className={styles.lightBloom} />
        <div className={styles.vignette} />
        <div className={styles.scanlines} />
        <div className={styles.grain} />
        <div className={styles.reticle} />
        <div className={styles.transitionFlash} />
        <div className={cinematic.scanBeam} />
        <div className={cinematic.edgeGlow} />
      </div>

      <div className={cinematic.frameCorners} aria-hidden="true"><i /><i /><i /><i /></div>

      <div className={cinematic.sceneGhost} aria-hidden="true">
        <span>0{activeScene + 1}</span>
        <b>{sceneMeta.title}</b>
      </div>

      <div className={cinematic.sceneCaption} aria-hidden="true">
        <span>{sceneMeta.code}</span>
        <strong>{sceneMeta.note}</strong>
        <small>{sceneMeta.coord}</small>
      </div>

      <header className={styles.header}>
        <a href="#top" className={styles.brand} aria-label="Lavine archive home">
          <span className={styles.mark}>LX</span>
          <span className={styles.brandCopy}>
            <b>LAVINE / ARCHIVE</b>
            <small>PERSONAL SYSTEMS / SELECTED OBJECTS</small>
          </span>
        </a>
        <div className={styles.headerMeta}>
          <span>SECTOR 09 / 2026</span>
          <span>22.3°N / 114.2°E</span>
          <span className={styles.live}><i /> SIGNAL 98.4</span>
        </div>
        <a href={MAIN_PROFILE} className={styles.skip}>Enter profile ↗</a>
      </header>

      <aside className={styles.sceneRail} aria-label={`Scene ${activeScene + 1}: ${SCENE_LABELS[activeScene]}`}>
        <span className={styles.sceneNumber}>0{activeScene + 1}</span>
        <div className={styles.sceneTicks} aria-hidden="true">
          {SCENE_LABELS.map((label, index) => (
            <i key={label} className={index === activeScene ? styles.sceneTickActive : ""} />
          ))}
        </div>
        <span className={styles.sceneLabel}>{SCENE_LABELS[activeScene]}</span>
      </aside>

      <section id="top" ref={(node) => { chapterRefs.current[0] = node; }} className={`${styles.chapter} ${styles.hero}`}>
        <div className={styles.heroTopline}>
          <span>PERSONAL ARCHIVE / ACCESS CHANNEL</span>
          <span>EST. 2026</span>
        </div>
        <h1>
          <span className={`${archiveDecode.decode} ${archiveDecode.heroDecode}`} data-text="LAVINE" data-decode="LAVINE">LAVINE</span>
          <span className={`${archiveDecode.decode} ${archiveDecode.heroDecodeSecondary}`} data-text="ARCHIVE" data-decode="ARCHIVE">ARCHIVE</span>
        </h1>
        <div className={styles.heroFooter}>
          <p>AI PRODUCT BUILDER / QUANTITATIVE SYSTEMS</p>
          <p className={styles.hint}><i /> Scroll to enter</p>
        </div>
      </section>

      <section ref={(node) => { chapterRefs.current[1] = node; }} className={`${styles.chapter} ${styles.threshold}`}>
        <p className={styles.eyebrow}>ARCHIVE 00 / THRESHOLD</p>
        <h2>ENTER<br />THE HATCH</h2>
        <div className={styles.copyRow}>
          <p>The door only opens one way: forward. Beyond it sits a record of products, systems and experiments that survived contact with reality.</p>
          <div className={styles.accessCard}>
            <span>ACCESS</span><b>GRANTED</b><small>CHANNEL / LX-888</small>
          </div>
        </div>
      </section>

      <section ref={(node) => { chapterRefs.current[2] = node; }} className={`${styles.chapter} ${styles.identity}`}>
        <p className={`${styles.eyebrow} ${archiveDecode.decode} ${archiveDecode.logicDecode}`} data-decode="ARCHIVE 01 / OPERATING LOGIC">ARCHIVE 01 / OPERATING LOGIC</p>
        <div className={styles.identityGrid}>
          <div><span>01</span><b>BUILD</b><small>Turn vague ambition into a working product.</small></div>
          <div><span>02</span><b>MEASURE</b><small>Replace demo confidence with evidence.</small></div>
          <div><span>03</span><b>SHIP</b><small>Keep the loop moving in the real world.</small></div>
        </div>
        <p className={styles.identityStatement}>Small credible systems.<br />Fast feedback. Real artifacts.</p>
      </section>

      <section ref={(node) => { chapterRefs.current[3] = node; }} className={`${styles.chapter} ${styles.artifacts}`}>
        <div className={styles.artifactHeader}>
          <div>
            <p className={styles.eyebrow}>ARCHIVE 02 / SELECTED OBJECTS</p>
            <h2 className={`${archiveDecode.decode} ${archiveDecode.artifactDecode}`} data-decode="ARTIFACTS">ARTIFACTS</h2>
          </div>
          <p>Four objects from the archive. Scroll through the field; each object gets one frame to speak for itself.</p>
        </div>

        <div
          className={exhibition.exhibition}
          onPointerMove={(event) => {
            stageRef.current?.style.setProperty("--focus-x", `${event.clientX}px`);
            stageRef.current?.style.setProperty("--focus-y", `${event.clientY}px`);
          }}
        >
          <div className={exhibition.stack}>
            {artifacts.map((artifact, index) => (
              <a
                key={artifact.index}
                className={`${exhibition.item} ${activeArtifact === index ? exhibition.active : ""}`}
                href={artifact.href}
                target="_blank"
                rel="noreferrer"
                aria-hidden={activeArtifact !== index}
                tabIndex={activeArtifact === index ? 0 : -1}
                onMouseEnter={() => focusArtifact(index)}
                onMouseLeave={() => focusArtifact(null)}
                onFocus={() => focusArtifact(index)}
                onBlur={() => focusArtifact(null)}
              >
                <span className={exhibition.index}>A-{artifact.index}</span>
                <b className={exhibition.name}>{artifact.name}</b>
                <small className={exhibition.tag}>{artifact.tag}</small>
                <em className={exhibition.outcome}>{artifact.outcome}</em>
                <i className={exhibition.arrow}>↗</i>
              </a>
            ))}
          </div>
          <div className={exhibition.rail} aria-hidden="true">
            {artifacts.map((artifact, index) => (
              <i key={artifact.index} className={activeArtifact === index ? exhibition.current : ""} />
            ))}
          </div>
          <span className={exhibition.counter} aria-hidden="true">0{activeArtifact + 1} / 04</span>
        </div>
      </section>

      <div className={`${artifactFocus.focusHud} ${focusedArtifact === null ? artifactFocus.hidden : ""}`} aria-hidden="true">
        <i />
        <span>{focusedArtifact === null ? "A-00" : `A-${artifacts[focusedArtifact].index}`}</span>
        <b>{focusedArtifact === null ? "ARCHIVE OBJECT" : artifacts[focusedArtifact].name}</b>
        <small>{focusedArtifact === null ? "FOCUS CHANNEL" : `${artifacts[focusedArtifact].tag} / FOCUS`}</small>
      </div>

      <section ref={(node) => { chapterRefs.current[4] = node; }} className={`${styles.chapter} ${styles.final}`}>
        <p className={styles.eyebrow}>ARCHIVE 03 / GATEWAY</p>
        <h2>THE ARCHIVE<br />IS OPEN</h2>
        <p className={styles.finalCopy}>The cinematic layer ends here. The actual work, context and details continue on the other side.</p>
        <div className={styles.finalActions}>
          <a href={MAIN_PROFILE} onClick={handleGatewayEnter} className={styles.enter}>Enter profile <span>↗</span></a>
          <a href="https://github.com/lavine888" target="_blank" rel="noreferrer" className={styles.secondary}>GitHub / source</a>
        </div>
      </section>

      <div className={`${handoff.handoff} ${gatewayExit ? handoff.active : ""}`} aria-hidden="true" />

      <div className={styles.progressTrack} aria-hidden="true">
        <div ref={progressRef} className={styles.progress} />
      </div>
      <div className={styles.cornerCode} aria-hidden="true">LX / ARCHIVE / 888</div>
    </main>
  );
}
