# Clickable Projects with Modal — Design

**Date:** 2026-06-30
**Status:** Approved (design)

## Goal

Make each project in the "Selected Work" section clickable. Clicking a card opens
a modal that shows the same project data at a larger size, plus an optional video
snippet for projects that have one.

## Approach

**Option A — Full React grid.** Convert the Projects grid into a single React
island (`src/components/Projects.tsx`) that renders the cards and owns the modal
open/close state. `Projects.astro` becomes a thin wrapper that imports the React
component with `client:visible`, mirroring the existing `AiChat.astro` pattern.

Rationale: for a 4-card section the extra hydrated JS is negligible, and keeping
the cards and modal state in one component is meaningfully simpler than splitting
a static Astro grid from a separate React modal island.

## Data model

`src/constants/projects.ts` — add one optional field per project:

```ts
video?: { type: "file" | "embed"; src: string };
```

- `type: "file"` → self-hosted clip in `/public` (e.g. `/uploads/foo.mp4`),
  rendered with a native `<video>` tag.
- `type: "embed"` → YouTube/Vimeo URL, rendered in an `<iframe>`.

Existing fields (`cat`, `title`, `desc`, `image`, `delay`) are unchanged. The
card thumbnail continues to use `image`.

## Components

### `src/components/Projects.tsx`

- Imports `projects` from `../constants/projects`.
- Renders the same grid markup that exists today, reusing the existing class
  names (`project-item`, `project-thumb`, `project-meta`, etc.) so
  `projects.css` is reused without changes to card styling.
- Each card is a `<button class="project-item ...">` (focusable, keyboard
  operable) that sets the active project on click.
- Modal state: `activeIndex: number | null`. `null` = closed.

### Modal behavior

- **Media priority inside the modal:** video → image → category placeholder.
  - `video.type === "file"` → `<video controls muted playsInline>` with `src`.
  - `video.type === "embed"` → `<iframe>` with `src`, allow fullscreen.
  - else if `image` → large `<img>`.
  - else → the same category placeholder label used on the card.
- Shows: media, category, title, description.
- **Close** via: X button, backdrop click, and `Escape` key.
- **Body scroll lock** while the modal is open.
- **Focus management:** focus moves into the modal on open and returns to the
  triggering card on close. Modal has `role="dialog"` + `aria-modal="true"` and
  an accessible label (the project title).

### `src/sections/Projects.astro`

Thin wrapper:

```astro
---
import Projects from "../components/Projects.tsx";
import { projects } from "../constants/projects";
---
<Projects client:visible projects={projects} />
```

(Section `<section id="projects">` and heading may live in the wrapper or the
component — keep `id="projects"` so the floating-menu anchor still works.)

## Styling

- Card styles in `src/styles/sections/projects.css` are untouched.
- Add modal styles to the same file: backdrop overlay, centered dialog,
  close button, responsive sizing, and media (image/video/iframe) fit.
- Respect `prefers-reduced-motion` for any open/close transition.

## Out of scope

- Rich case-study content, image galleries, multi-image carousels.
- External "view live" link buttons (not requested).
- Routing / deep-linking to a specific project modal.

## Dependencies

None. Plain React + existing CSS.
