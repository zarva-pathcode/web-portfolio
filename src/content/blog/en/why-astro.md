---
title: 'Why I built my portfolio in Astro instead of Next.js'
description: 'A portfolio is a content site, not an application. That distinction decides which framework you should reach for — and it is worth about 100 KB of JavaScript.'
pubDate: 2026-09-29
lang: en
tags:
  - Astro
  - Performance
  - Frontend
---

I rebuilt this site twice before landing on Astro. The first attempt was a React
single-page app, the second was Next.js. Both worked. Neither was the right tool,
and it took me longer than it should have to work out why.

## The wrong question

Most of the framework conversation is framed as "which is faster?" That is the
wrong axis. Both tools are fast when used correctly.

The useful question is: **is this site a document, or is it an application?**

A portfolio is a document. It is pages of content that change when I change them,
read by a few hundred people a month, with no accounts, no database, no real-time
anything. Meanwhile a React app renders `Application` as you read. You pay for the
runtime on every single page load, whether or not a given page needs it.

## What zero JavaScript actually buys you

Astro compiles to static HTML and sends no framework runtime unless a component
explicitly asks to be interactive. The homepage you are looking at now ships a
couple of small vanilla scripts — the mobile menu, a typewriter effect, a
scroll-progress bar. Everything else is HTML and CSS.

The concrete consequences:

- **Larger text-to-paint ratio.** A page that ships 120 KB of framework can never
  paint its real content until it has parsed and executed that framework.
- **A better performance ceiling by default.** I did not have to tune my way to a
  good score; the baseline was already there.
- **Cheap to host.** Static files off a CDN are effectively free at any traffic
  level, which is not true of server-rendered apps.

## The part I did not expect

The thing that made Astro stick was not performance. It was content collections.

A project case study is structured data: a year, a role, a stack, a problem, an
approach, a result. Astro lets me declare that as a typed schema, and every
project page is generated from it. Miss a required field and **the build fails**
rather than the page quietly rendering `undefined` in front of a recruiter.

That is a small thing that turned out to be the difference between a portfolio I
maintain and a portfolio I avoid touching.

## When I would reach for Next.js instead

If this site needed authenticated users, a live dashboard, or server actions doing
real work at request time — that is when a framework-first model earns its weight.
For "publish an article" it does not.
