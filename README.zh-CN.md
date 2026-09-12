<div align="center">

# LAVINE / ARCHIVE

### 一个把个人作品集变成「可进入空间」的交互式电影化序章

不是普通 Landing Page，也不是单纯的 Three.js Demo。  
这是一个由滚动驱动、持续存在于同一 WebGL 世界中的个人档案馆。

[![Live Archive](https://img.shields.io/badge/LIVE_ARCHIVE-ENTER-c6a66b?style=for-the-badge&labelColor=090806)](https://lavinesite-astronaut-lavine.vercel.app)
[![Main Portfolio](https://img.shields.io/badge/MAIN_PORTFOLIO-OPEN-d9ddd7?style=for-the-badge&labelColor=090806)](https://lavine-site.vercel.app/profile)
[![Build](https://github.com/lavine888/lavinesite-astronaut/actions/workflows/build.yml/badge.svg)](https://github.com/lavine888/lavinesite-astronaut/actions/workflows/build.yml)

**[English](./README.md) · 简体中文**

</div>

---

## 这是什么

`lavinesite-astronaut` 是 Lavine 个人网站的 **cinematic entry layer / 电影化入口层**。

主站负责承载完整经历、项目与信息；这个仓库负责另一件事：在进入资料之前，先让访问者真正“走进”一个世界。

整个体验围绕一个持续存在的 3D 场景展开。滚动不是在切换传统网页 section，而是在推进镜头、光线、空间、材质与物体状态。

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

> 目标不是堆叠视觉特效，而是让每一幕都像同一个世界中的下一段叙事。

---

## 体验亮点

### 01 · Persistent WebGL World

整个电影化流程只使用 **一个持续存在的 WebGL renderer / camera / world**。

没有为不同章节反复创建独立 3D Canvas，而是让 Hatch、Logic specimen、Artifacts、Gateway 等对象共同生活在同一空间里，保证镜头、光照与纵深是连续的。

### 02 · Scroll as a Camera Director

滚动值直接驱动镜头路径、FOV、曝光、Bloom、场景状态以及对象动画。

同时加入了轻量的 **Soft Scene Magnet**：当滚动速度停下来并接近关键 Hero Frame 时，视觉进度会轻微吸附到导演好的构图位置，而不是粗暴使用 CSS `scroll-snap`。

### 03 · Archive Seal → Hatch

首页拥有独立的 `LX / 888 Archive Seal` 视觉母题。

随着滚动，它逐渐位移、倾斜、放大并解构，把第一幕自然交给后面的八叶机械 Hatch，而不是让“首页”和“下一幕”像两个互不相关的组件。

### 04 · Build / Measure / Ship Logic Specimen

Logic 不是静态装饰物，而是一个会随滚动改变状态的暗金 Archive Specimen：

- `BUILD`：碎片聚合并形成主体
- `MEASURE`：扫描环、内部结构与数据点出现
- `SHIP`：结构重新释放，并把视觉动势交给 Artifacts

### 05 · Project-specific Artifacts

四个项目不再使用随机的 Three.js primitive，而是拥有各自的馆藏结构语言：

| Archive | 项目 | 视觉语义 |
| --- | --- | --- |
| A-01 | **Wozai · 我在** | 双体关系结构 / Human AI |
| A-02 | **Agent JAM** | 中央 Hub + 多节点协作 |
| A-03 | **PandaAI Quant** | 信号柱 / 量化切片 |
| A-04 | **LiveLink** | 网络节点 / Constellation |

滚动会逐件展示项目；鼠标进入时，DOM 展签与对应 3D specimen 会同步进入 focus 状态。

### 06 · Pointer-reactive World

鼠标不是只负责普通 hover。

同一个 pointer movement 会同时影响：

```text
背景局部反光
    +
Archive Seal 微视差
    +
场景光线偏移
    +
Artifact 展签金属高光 / tilt
    +
3D specimen 朝向与灯光
```

幅度刻意保持克制，让空间“活着”，但不变成追着鼠标跑的特效页面。

### 07 · Dark-Gold Archive Material System

前四幕统一使用一套 Archive Alloy 语言：

**Smoke Black · Graphite · Old Gold · Cold Silver**

背景由近景黑金属实体、中景暗金结构、远景雾层与 precision detail 共同组成，并针对每一幕调整光线节奏：

- `ORIGIN`：侧向冷银光
- `THRESHOLD`：中心冷白 breach
- `LOGIC`：内部暗金发光
- `ARTIFACTS`：博物馆式局部 spotlight
- `GATEWAY`：释放独立的青绿 + 金签名画面

### 08 · Gateway Handoff

最后的 Gateway 不只是 CTA 背景。

粒子、Portal shader、Bloom 与镜头会共同形成最终 Hero Shot；点击 `Enter profile` 后再由过渡层接管屏幕，把 cinematic layer 交给信息完整的主站。

---

## 视觉与交互系统

| 系统 | 作用 |
| --- | --- |
| `Archive Boot` | 首次 session 的启动序列 |
| `Archive Seal` | 首页 signature object |
| `Iris Hatch` | 八叶机械阈值与 breach 事件 |
| `Early Cinematic Rig` | Sweep、Latch、Logic specimen 与阶段动画 |
| `Artifact Specimens` | 四个项目对应的独立 3D 馆藏 |
| `Archive Material` | 黑金属、暗金结构、环境反光与雾层 |
| `Precision Detail` | 刻线、节点、断续灯带、远景轨迹 |
| `Decode Titles` | 关键标题的 Archive scan / decode reveal |
| `Focus Interaction` | Pointer、展签与 3D specimen 联动 |
| `Gateway` | Portal、粒子 morph 与主站交接 |

---

## 技术架构

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
   ├─ archive material + background depth
   ├─ precision detail
   ├─ decode / transition language
   ├─ artifact exhibition
   └─ pointer micro-interactions
```

这里有一个明确原则：**不为了一个效果再创建第二个 WebGL renderer。**

前景、背景、粒子、Hatch、Logic、Artifacts 与 Gateway 尽量共用同一个实时世界；适合用 CSS 合成完成的界面与材质细节则留在 DOM 层。

---

## Performance

这是一个视觉优先的网站，但不是“不计成本”的视觉实验。

当前策略包括：

- Desktop DPR 上限控制
- Mobile 使用更轻的粒子与几何数量
- `InstancedMesh` 复用重复几何
- Desktop 使用 Bloom / RGB Shift 等后处理
- Mobile 优先直接 renderer
- CSS 与 WebGL 分工，避免重复绘制昂贵效果
- 页面隐藏时暂停 animation frame
- 支持 `prefers-reduced-motion`
- Boot Sequence 在同一 session 内只完整播放一次

---

## 技术栈

<p>
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18.3-20232a?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Three.js-r180-111111?style=flat-square&logo=threedotjs" alt="Three.js" />
  <img src="https://img.shields.io/badge/Vercel-Production-000000?style=flat-square&logo=vercel" alt="Vercel" />
</p>

核心依赖：

- **Next.js 14.2**
- **React 18.3**
- **TypeScript 5.7**
- **Three.js r180**
- Three.js `EffectComposer`
- `UnrealBloomPass`
- Custom GLSL shaders
- CSS Modules

---

## 项目结构

```text
app/
├─ page.tsx                     # 页面状态、滚动叙事与交互入口
├─ scene-canvas.tsx             # Three.js 世界 / camera / Gateway
├─ early-cinematic-rig.ts       # 开场、Hatch、Logic 3D rig
├─ artifact-specimens.ts        # 四个项目馆藏对象
│
├─ archive-material.module.css  # Archive Alloy 与空间背景
├─ archive-detail.module.css    # 背景 precision detail
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

## 本地运行

要求：Node.js 18+（建议使用当前 LTS）。

```bash
git clone https://github.com/lavine888/lavinesite-astronaut.git
cd lavinesite-astronaut
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

生产构建：

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

Push 到 `main` 后会触发自动构建与部署。

---

## Design Principles

这个项目目前遵循四条简单原则：

> **One world, not a pile of sections.**  
> 一个连续世界，而不是一堆 section。

> **Fewer objects, stronger frames.**  
> 少一点元素，多一点记忆点。

> **Interaction should change the world.**  
> 交互应该改变世界，而不仅是改变按钮颜色。

> **The cinematic layer should know when to end.**  
> 最终目标仍然是把用户交给内容，而不是永远困在特效里。

---

## Related

- **Main Personal Website** — [lavine-site.vercel.app/profile](https://lavine-site.vercel.app/profile)
- **GitHub Profile** — [github.com/lavine888](https://github.com/lavine888)

---

<div align="center">

`LAVINE / ARCHIVE · LX-888`

Built as an entrance, not a destination.

</div>
