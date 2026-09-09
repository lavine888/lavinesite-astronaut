"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260709_080129_da34b00e-a5db-47dd-81a1-cccad79ac1ac.mp4";
const MAIN_PROFILE = "https://lavine-site.vercel.app/profile";
const SOURCE_CUES = [0, 3.9, 7.8, 11.8, 15.0267];
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function mapStoryTime(position: number) {
  const max = SOURCE_CUES.length - 1;
  const safe = clamp(Number.isFinite(position) ? position : 0, 0, max);
  const chapter = Math.min(max - 1, Math.floor(safe));
  const local = safe - chapter;
  return SOURCE_CUES[chapter] +
    (SOURCE_CUES[chapter + 1] - SOURCE_CUES[chapter]) * local;
}

function chapterOpacity(position: number, center: number, radius = 0.62) {
  return clamp(1 - Math.abs(position - center) / radius, 0, 1);
}

export default function LavineArchive() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);
  const activeSceneRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activeScene, setActiveScene] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    const media = mediaRef.current;
    const progressBar = progressRef.current;
    if (!video || !media || !progressBar) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let targetTime = 0.001;
    let raf = 0;
    let settleTimer = 0;
    let latestPosition = 0;

    const seekLatest = () => {
      if (video.readyState < 1 || video.seeking || !Number.isFinite(video.duration)) return;
      const sourceEnd = SOURCE_CUES[SOURCE_CUES.length - 1];
      const upper = Math.max(0.001, Math.min(video.duration - 0.04, sourceEnd));
      const wanted = clamp(targetTime, 0.001, upper);
      if (Math.abs(video.currentTime - wanted) > 1 / 30) video.currentTime = wanted;
    };

    const paintStory = (position: number, progress: number) => {
      latestPosition = position;
      progressBar.style.transform = `scaleX(${progress})`;
      media.style.setProperty("--story-progress", progress.toFixed(4));

      const nextScene = clamp(Math.round(position), 0, SCENE_LABELS.length - 1);
      if (nextScene !== activeSceneRef.current) {
        activeSceneRef.current = nextScene;
        setActiveScene(nextScene);
      }

      chapterRefs.current.forEach((node, index) => {
        if (!node) return;
        const opacity = chapterOpacity(position, index, index === 0 ? 0.76 : 0.66);
        const direction = position - index;
        const y = clamp(direction * -76, -58, 58);
        const scale = 0.982 + opacity * 0.018;
        node.style.opacity = opacity.toFixed(3);
        node.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
        node.style.pointerEvents = opacity > 0.58 ? "auto" : "none";
      });
    };

    const update = () => {
      const travel = document.documentElement.scrollHeight - window.innerHeight;
      const progress = travel > 0 ? clamp(window.scrollY / travel, 0, 1) : 0;
      const position = progress * (SOURCE_CUES.length - 1);
      targetTime = mapStoryTime(position);
      paintStory(position, progress);
      if (!reducedMotion) seekLatest();
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(seekLatest, 110);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    const onMove = (event: MouseEvent) => {
      if (reducedMotion) return;
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      media.style.setProperty("--mx", `${(nx * 22).toFixed(2)}px`);
      media.style.setProperty("--my", `${(ny * 14).toFixed(2)}px`);
      media.style.setProperty("--cursor-x", `${event.clientX}px`);
      media.style.setProperty("--cursor-y", `${event.clientY}px`);
    };

    const onMetadata = () => {
      setFailed(false);
      setReady(true);
      targetTime = reducedMotion ? SOURCE_CUES[0] + 0.001 : mapStoryTime(latestPosition);
      seekLatest();
    };

    const onError = () => {
      setReady(false);
      setFailed(true);
    };

    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("seeked", seekLatest);
    video.addEventListener("error", onError);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });

    update();
    if (video.readyState >= 1) onMetadata();
    else video.load();

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settleTimer);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("seeked", seekLatest);
      video.removeEventListener("error", onError);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={mediaRef} className={styles.media} aria-hidden="true">
        <div className={styles.fallback} />
        <video
          ref={videoRef}
          className={`${styles.video} ${ready && !failed ? styles.videoReady : ""}`}
          src={VIDEO_URL}
          muted
          playsInline
          preload="auto"
        />
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
            <small>INTERACTIVE PROLOGUE</small>
          </span>
        </a>
        <div className={styles.headerMeta}>
          <span>SESSION 09.2026</span>
          <span>HK / SZ</span>
          <span className={styles.live}><i /> SYSTEM ONLINE</span>
        </div>
        <a href={MAIN_PROFILE} className={styles.skip}>Skip to profile ↗</a>
      </header>

      <aside className={styles.telemetry} aria-hidden="true">
        <div><span>MODE</span><b>AI PRODUCT</b></div>
        <div><span>SIGNAL</span><b>98.4%</b></div>
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
          <span>EST. 2026</span>
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
          <p>This is not a résumé wall. It is a short passage into the systems, products and experiments I choose to build.</p>
          <div className={styles.accessCard}>
            <span>ACCESS</span>
            <b>GRANTED</b>
            <small>SCROLL CONTROL / ENABLED</small>
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
        <p className={styles.identityStatement}>Small credible systems.<br />Fast feedback. Real artifacts.</p>
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
          <p>Projects are treated as objects with evidence, not decorative cards.</p>
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
        <p className={styles.finalCopy}>The prologue ends here. The useful details start on the other side.</p>
        <div className={styles.finalActions}>
          <a href={MAIN_PROFILE} className={styles.enter}>Enter profile <span>↗</span></a>
          <a href="https://github.com/lavine888" target="_blank" rel="noreferrer" className={styles.secondary}>GitHub / source</a>
        </div>
      </section>

      {!ready && !failed && <div className={styles.status}>Loading archive film…</div>}
      {failed && <div className={`${styles.status} ${styles.error}`}>Film layer unavailable. Interface fallback active.</div>}

      <div className={styles.progressTrack} aria-hidden="true">
        <div ref={progressRef} className={styles.progress} />
      </div>
      <div className={styles.cornerCode} aria-hidden="true">LX / 19.54 / 888</div>
    </main>
  );
}
