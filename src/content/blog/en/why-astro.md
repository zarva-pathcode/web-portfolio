---
title: 'Why I built my portfolio in Astro instead of Next.js'
description: 'Starting with HTML-first pages and adding SSR plus a small SQLite CMS only where needed, without shipping a heavy framework runtime to visitors.'
pubDate: 2026-09-29
lang: en
tags:
  - Astro
  - Performance
  - Frontend
---

I rebuilt this portfolio twice before settling on Astro. The first version was a React
single-page app, and the second used Next.js. Both worked fine, but both felt heavier
than a personal site needed to be.

## Picking the right baseline

Most framework comparisons ask which tool is faster. When configured well, both Astro
and Next.js can load quickly. The more practical question for me was how much
JavaScript a public visitor should download just to read case studies and a CV.

Even after I added a database and an admin dashboard to edit content myself, almost every
visitor only reads public pages. With a React-first framework, every page still ships a
client runtime and hydration overhead. Astro lets the server render clean HTML by
default and keeps interactive scripts scoped to small, deliberate modules.

## What changed in practice

Shipping HTML first and keeping client scripts small paid off in three ways. First,
pages paint text and layout right away because the browser does not wait to parse a
large framework bundle before rendering content. Second, performance stays predictable
without spending hours chasing hydration bugs. Third, when I needed dynamic data, Astro
made it straightforward to switch to server rendering with `@astrojs/vercel` without
rewriting the frontend.

## Adding a CMS without bloating public pages

The site started with static Markdown files and typed content schemas. Later, I wanted
to update sections, projects, and blog drafts from a browser instead of pushing a
commit for every typo.

I added LibSQL (SQLite locally and Turso in production) with Drizzle ORM and a small
`/admin` studio protected by middleware. Because Astro runs that logic on the server,
an anonymous visitor never receives the admin UI, editor scripts, or Quick Edit
overlay. They only get the rendered portfolio page.

## When I still pick React or Next.js

If the public side of a product is an authenticated web app with dense client state,
live collaborative views, or complex forms on every screen, React or Next.js fits much
better. For a portfolio with a private editing studio behind it, Astro keeps the public
experience light while giving me full server control when I need it.
