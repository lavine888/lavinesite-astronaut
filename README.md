<div align="center">

# LAVINE / ARCHIVE

### A cinematic interactive prologue for a personal portfolio

Not a conventional landing page. Not a standalone Three.js demo.  
It is a scroll-directed archive world designed to be entered before the portfolio is read.

[![Live Archive](https://img.shields.io/badge/LIVE_ARCHIVE-ENTER-c6a66b?style=for-the-badge&labelColor=090806)](https://lavinesite-astronaut-lavine.vercel.app)
[![Main Portfolio](https://img.shields.io/badge/MAIN_PORTFOLIO-OPEN-d9ddd7?style=for-the-badge&labelColor=090806)](https://lavine-site.vercel.app/profile)
[![Build](https://github.com/lavine888/lavinesite-astronaut/actions/workflows/build.yml/badge.svg)](https://github.com/lavine888/lavinesite-astronaut/actions/workflows/build.yml)

**English · [简体中文](./README.zh-CN.md)**

</div>

---

## What is this?

`lavinesite-astronaut` is the **cinematic entry layer** of Lavine's personal website.

The main portfolio carries the information: projects, experience, context, and details. This repository does something different — it turns the few seconds before that information into an authored spatial experience.

The entire journey lives inside one continuous realtime world. Scrolling does not merely switch sections; it advances the camera, lighting, material state, object state, and scene choreography.

```text
ARCHIVE BOOT
    ↓
ORIGIN / Archive Seal
    ↓
THRESHOLD / Iris Hatch
    ↓
LOGIC / Build · Measure · Ship
    ↓
ARTIFACTS / Selected Objects
    ↓
GATEWAY / Main Portfolio
```

> The goal is not to stack effects. The goal is to make every scene feel like the next moment inside the same world.

---

## Experience Highlights

### 01 · Persistent WebGL World

The cinematic sequence runs inside **one persistent WebGL renderer, camera, and world**.

The Hatch, Logic specimen, Artifacts, particles, and Gateway are not isolated 3D canvases. They share one spatial system, so camera movement, lighting, depth, and transitions remain coherent from beginning to end.

### 02 · Scroll as a Camera Director

Scroll progress drives camera position, FOV, exposure, bloom, object state, and scene timing.

A lightweight **Soft Scene Magnet** gently settles the experience toward authored hero frames when the user stops scrolling near one — without the hard snap of CSS `scroll-snap`.

### 03 · Archive Seal → Hatch

The opening scene has its own signature object: the `LX / 888 Archive Seal`.

As the user moves forward, the seal shifts, tilts, enlarges, and breaks apart, handing the visual focus into the eight-blade mechanical Hatch instead of treating the hero and the next scene as unrelated components.

### 04 · Build / Measure / Ship Logic Specimen

The Logic scene is not a static sculpture. It evolves with the scroll state:

- `BUILD` — fragments assemble into the specimen
- `MEASURE` — scan rings, data points, and internal structure become visible
- `SHIP` — the object releases outward and carries momentum into the artifact field

### 05 · Project-specific Artifacts

The archive objects are no longer generic Three.js primitives. Each project has a visual structure tied to its meaning:

| Archive | Project | Visual language |
| --- | --- | --- |
| A-01 | **Wozai · 我在** | Paired relational bodies / Human AI |
| A-02 | **Agent JAM** | Central hub + collaborative nodes |
| A-03 | **PandaAI Quant** | Signal tower / quantitative slices |
| A-04 | **LiveLink** | Network nodes / constellation |

The projects are revealed one at a time. Pointer focus synchronizes the DOM exhibition label with the matching 3D specimen.

### 06 · Pointer-reactive World

Pointer movement is treated as an observation signal, not just a hover trigger.

One pointer movement can influence:

```text
background material reflection
        +
Archive Seal micro-parallax
        +
scene lighting offset
        +
artifact plaque highlight / tilt
        +
3D specimen orientation and light
```

The motion range is intentionally restrained: enough to make the space feel alive, not enough to turn the page into a cursor-chasing effect demo.

### 07 · Dark-Gold Archive Material System

The first four chapters share one visual language:

**Smoke Black · Graphite · Old Gold · Cold Silver**

Foreground metal masses, mid-depth archive frames, distant haze, precision linework, and local glints build the archive space. Each chapter gets a different lighting beat:

- `ORIGIN` — restrained silver side light
- `THRESHOLD` — cold frontal breach light
- `LOGIC` — internal dark-gold illumination
- `ARTIFACTS` — museum-like local spotlights
- `GATEWAY` — a separate teal + gold signature frame

### 08 · Gateway Handoff

The final Gateway is more than a CTA background.

Portal shader, particles, bloom, and camera choreography converge into the final hero shot. When `Enter profile` is clicked, a handoff layer takes over the viewport and passes the experience into the information-rich main portfolio.

---

## Visual & Interaction Systems

| System | Purpose |
| --- | --- |
| `Archive Boot` | First-session initialization sequence |
| `Archive Seal` | Signature hero object |
| `Iris Hatch` | Eight-blade threshold and breach event |
| `Early Cinematic Rig` | Opening sweep, latch sequence, Logic specimen |
| `Artifact Specimens` | Project-specific 3D archive objects |
| `Archive Material` | Dark metal, old-gold architecture, haze and depth |
| `Precision Detail` | Fine engravings, nodes, broken light bands, distant tracks |
| `Decode Titles` | Archive scan / decode language for key headings |
| `Focus Interaction` | Pointer, exhibition plaque, and 3D object synchronization |
| `Gateway` | Portal, particle morph, and portfolio handoff |

---

## Architecture

```text
Next.js / React
│
├─ page.tsx
│  ├─ scroll progress
│  ├─ scene state
│  ├─ soft settling
│  ├─ artifact exhibition
│  └─ gateway handoff
│
├─ scene-canvas.tsx
│  ├─ one WebGLRenderer
│  ├─ one PerspectiveCamera
│  ├─ shared Three.js world
│  ├─ camera choreography
│  ├─ lighting / exposure
│  └─ post-processing
│
├─ early-cinematic-rig.ts
│  ├─ opening sweep
│  ├─ hatch interaction
│  └─ logic specimen
│
├─ artifact-specimens.ts
│  └─ project-specific 3D objects
│
└─ CSS Modules
   ├─ archive material + spatial depth
   ├─ precision detail
   ├─ decode / transition language
   ├─ artifact exhibition
   └─ pointer micro-interactions
```

One rule matters throughout the implementation:

> **Do not create a second WebGL renderer just to add another effect.**

The expensive spatial work stays inside the shared realtime world. UI, material accents, and low-cost cinematic overlays remain in the DOM/CSS layer where that is the better tool.

---

## Performance

This is a visual-first site, but not a visual-at-any-cost experiment.

Current performance decisions include:

- capped desktop device pixel ratio
- lighter particle and geometry counts on mobile
- `InstancedMesh` for repeated geometry
- desktop-only bloom / RGB shift post-processing
- direct renderer path on mobile
- CSS/WebGL separation to avoid duplicated expensive effects
- animation frame pausing while the page is hidden
- `prefers-reduced-motion` support
- full Boot Sequence only once per browser session

---

## Tech Stack

<p>
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18.3-20232a?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Three.js-r180-111111?style=flat-square&logo=threedotjs" alt="Three.js" />
  <img src="https://img.shields.io/badge/Vercel-Production-000000?style=flat-square&logo=vercel" alt="Vercel" />
</p>

Core stack:

- **Next.js 14.2**
- **React 18.3**
- **TypeScript 5.7**
- **Three.js r180**
- Three.js `EffectComposer`
- `UnrealBloomPass`
- Custom GLSL shaders
- CSS Modules

---

## Project Structure

```text
app/
├─ page.tsx                     # page state, scroll narrative, interactions
├─ scene-canvas.tsx             # Three.js world / camera / Gateway
├─ early-cinematic-rig.ts       # opening, Hatch, Logic 3D rig
├─ artifact-specimens.ts        # project-specific archive objects
│
├─ archive-material.module.css  # Archive Alloy + spatial background
├─ archive-detail.module.css    # precision background detail
├─ archive-transitions.module.css
├─ archive-decode.module.css
├─ hero-seal.module.css
├─ exhibition.module.css
├─ artifact-focus.module.css
├─ handoff.module.css
├─ cinematic.module.css
└─ page.module.css
```

---

## Run Locally

Node.js 18+ is recommended; current LTS is preferred.

```bash
git clone https://github.com/lavine888/lavinesite-astronaut.git
cd lavinesite-astronaut
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

---

## Deployment

- **Production** — https://lavinesite-astronaut-lavine.vercel.app
- **Main Portfolio** — https://lavine-site.vercel.app/profile
- **Repository** — https://github.com/lavine888/lavinesite-astronaut
- **Production Branch** — `main`
- **Hosting** — Vercel

Pushes to `main` trigger the production build and deployment flow.

---

## Design Principles

Four principles currently guide the project:

> **One world, not a pile of sections.**  
> Continuity matters more than the number of effects.

> **Fewer objects, stronger frames.**  
> A memorable hero shot is worth more than ten decorative systems.

> **Interaction should change the world.**  
> Hover should do more than change a button color.

> **The cinematic layer should know when to end.**  
> The destination is still the work itself, not an endless intro.

---

## Related

- **Main Personal Website** — [lavine-site.vercel.app/profile](https://lavine-site.vercel.app/profile)
- **GitHub Profile** — [github.com/lavine888](https://github.com/lavine888)

---

<div align="center">

`LAVINE / ARCHIVE · LX-888`

Built as an entrance, not a destination.

</div>
