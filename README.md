# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).


## Pinned Selected Work

The Selected Work section is a pinned stage on desktop (`lg` and up): the
content sticks for a 280vh track and the active case steps as you scroll.

- Progress is computed from the track rect in `src/components/sections/WorkSection.astro`.
- Step boundaries are even thirds; the counter in the pinned header shows `02 / 03`.
- Hover and keyboard focus still override the scroll step.
- Mobile, and anyone with `prefers-reduced-motion: reduce`, get the plain stacked
  layout: the CSS in `src/styles/global.css` removes the track height and the
  sticky positioning.

### Hover video (optional)

Add a loop and point the project at it:

```yaml
video: '/media/artiva.mp4'
```

`video` is optional in `src/content.config.ts`. The clip crossfades in over the
still when its case is active, plays muted and pauses when it is not. Keep it a
6–8 s loop at the same aspect ratio as the cover; without one, the still is used.