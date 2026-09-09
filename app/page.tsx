"use client";

import { useEffect, useRef, useState } from "react";
import SceneCanvas from "./scene-canvas";
import styles from "./page.module.css";

const MAIN_PROFILE = "https://lavine-site.vercel.app/profile";
const SCENE_LABELS = ["INITIALIZE", "THRESHOLD", "IDENTITY", "ARTIFACTS", "ARCHIVE"];

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

function sceneOpacity(position: number, center: number, radius = 0.7) {
  return clamp(1 - Math.abs(position - center) / radius, 0, 1);
}

export default function LavineArchive() {
  const progressRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);
  const activeSceneRef = useRef(0);
  const [activeScene, setActiveScene] = useState(0);

  useEffect(() => {
    const progressBar = progressRef.current;
    if (!progressBar) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let target = 0;
    let current = 0;
    let raf = 0;
    let last = performance.now();

    const readScroll = () => {
      const travel = document.documentElement.scrollHeight - window.innerHeight;
      target = travel > 0 ? clamp(window.scrollY / travel, 0, 1) : 0;
    };

    const paint = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const smoothing = reducedMotion ? 1 : 1 - Math.pow(0.0008, dt);
      current += (target - current) * smoothing;

      progressBar.style.transform = `scaleX(${current})`;
      const position = current * (SCENE_LABELS.length - 1);
      const nextScene = clamp(Math.round(position), 0, SCENE_LABELS.length - 1);
      if (nextScene !== activeSceneRef.current) {
        activeSceneRef.current = nextScene;
        setActiveScene(nextScene);
      }

      chapterRefs.current.forEach((node, index) => {
        if (!node) return;
        const opacity = sceneOpacity(position, index, index === 0 ? 0.8 : 0.72);
        const offset = clamp((position - index) * -58, -46, 46);
        const scale = 0.986 + opacity * 0.014;
        node.style.opacity = opacity.toFixed(3);
        node.style.transform = `translate3d(0, ${offset}px, 0) scale(${scale})`;
        node.style.pointerEvents = opacity > 0.58 ? "auto" : "none";
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

  return (
    <main className={styles.stage}>
      <SceneCanvas />

      <div className={styles.fx} aria-hidden="true">
        <div className={styles.lightBloom} />
        <div className={styles.vignette} />
        <div className={styles.scanlines} />
        <div className={styles.grain} />
        <div className={styles.reticle} />
      </div>

      <header className={styles.header}>
        <a href="#top" className={styles.brand} aria-label="Lavine archive home">
          <span className={styles.mark}>LX</span>
          <span className={styles.brandCopy}>
            <b>LAVINE / ARCHIVE</b>
            <small>REALTIME WEBGL PROLOGUE</small>
          </span>
        </a>
        <div className={styles.headerMeta}>
          <span>SESSION 09.2026</span>
          <span>HK / SZ</span>
          <span className={styles.live}><i /> RENDER ONLINE</span>
        </div>
        <a href={MAIN_PROFILE} className={styles.skip}>Skip to profile ↗</a>
      </header>

      <aside className={styles.telemetry} aria-hidden="true">
        <div><span>ENGINE</span><b>WEBGL / THREE</b></div>
        <div><span>MODE</span><b>CAMERA DOLLY</b></div>
        <div><span>STATUS</span><b>BUILDING</b></div>
        <div><span>NODE</span><b>LX-888</b></div>
      </aside>

      <aside className={styles.sceneRail} aria-label={`Scene ${activeScene + 1}: ${SCENE_LABELS[activeScene]}`}>
        <span className={styles.sceneNumber}>0{activeScene + 1}</span>
        <div className={styles.sceneTicks} aria-hidden="true">
          {SCENE_LABELS.map((label, index) => (
            <i key={label} className={index === activeScene ? styles.sceneTickActive : ""} />
          ))}
        </div>
        <span className={styles.sceneLabel}>{SCENE_LABELS[activeScene]}</span>
      </aside>

      <section
        id="top"
        ref={(node) => { chapterRefs.current[0] = node; }}
        className={`${styles.chapter} ${styles.hero}`}
      >
        <div className={styles.heroTopline}>
          <span>INITIALIZING PERSONAL ARCHIVE</span>
          <span>REALTIME / 60FPS TARGET</span>
        </div>
        <h1><span>LAVINE</span><span>ARCHIVE</span></h1>
        <div className={styles.heroFooter}>
          <p>AI PRODUCT BUILDER / QUANTITATIVE SYSTEMS</p>
          <p className={styles.hint}><i /> Scroll to enter</p>
        </div>
      </section>

      <section
        ref={(node) => { chapterRefs.current[1] = node; }}
        className={`${styles.chapter} ${styles.threshold}`}
      >
        <p className={styles.eyebrow}>ARCHIVE 00 / THRESHOLD</p>
        <h2>ENTER<br />THE HATCH</h2>
        <div className={styles.copyRow}>
          <p>The page is no longer scrubbing a film. Scroll now moves a camera through one persistent world.</p>
          <div className={styles.accessCard}>
            <span>RENDER PATH</span>
            <b>GPU</b>
            <small>PERSISTENT SCENE / ACTIVE</small>
          </div>
        </div>
      </section>

      <section
        ref={(node) => { chapterRefs.current[2] = node; }}
        className={`${styles.chapter} ${styles.identity}`}
      >
        <p className={styles.eyebrow}>ARCHIVE 01 / OPERATING LOGIC</p>
        <div className={styles.identityGrid}>
          <div><span>01</span><b>BUILD</b><small>Turn vague ambition into a working product.</small></div>
          <div><span>02</span><b>MEASURE</b><small>Replace demo confidence with evidence.</small></div>
          <div><span>03</span><b>SHIP</b><small>Keep the loop moving in the real world.</small></div>
        </div>
        <p className={styles.identityStatement}>One world. One camera.<br />Objects become the navigation.</p>
      </section>

      <section
        ref={(node) => { chapterRefs.current[3] = node; }}
        className={`${styles.chapter} ${styles.artifacts}`}
      >
        <div className={styles.artifactHeader}>
          <div>
            <p className={styles.eyebrow}>ARCHIVE 02 / SELECTED OBJECTS</p>
            <h2>ARTIFACTS</h2>
          </div>
          <p>The physical objects behind this interface now exist inside the WebGL scene instead of being implied by a background film.</p>
        </div>
        <div className={styles.artifactGrid}>
          {artifacts.map((artifact) => (
            <a key={artifact.index} className={styles.artifact} href={artifact.href} target="_blank" rel="noreferrer">
              <span className={styles.artifactIndex}>A-{artifact.index}</span>
              <b>{artifact.name}</b>
              <small>{artifact.tag}</small>
              <em>{artifact.outcome}</em>
              <i>↗</i>
            </a>
          ))}
        </div>
      </section>

      <section
        ref={(node) => { chapterRefs.current[4] = node; }}
        className={`${styles.chapter} ${styles.final}`}
      >
        <p className={styles.eyebrow}>ARCHIVE 03 / GATEWAY</p>
        <h2>THE ARCHIVE<br />IS OPEN</h2>
        <p className={styles.finalCopy}>The realtime prologue ends here. The useful details start on the other side.</p>
        <div className={styles.finalActions}>
          <a href={MAIN_PROFILE} className={styles.enter}>Enter profile <span>↗</span></a>
          <a href="https://github.com/lavine888" target="_blank" rel="noreferrer" className={styles.secondary}>GitHub / source</a>
        </div>
      </section>

      <div className={styles.progressTrack} aria-hidden="true">
        <div ref={progressRef} className={styles.progress} />
      </div>
      <div className={styles.cornerCode} aria-hidden="true">LX / WEBGL / 888</div>
    </main>
  );
}
