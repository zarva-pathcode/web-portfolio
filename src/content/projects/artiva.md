---
title: Artiva
year: 2024
role: Fullstack Developer & UI/UX Designer
category: Web Platform
platform: Responsive Web
panelLabel: artiva.gallery.web
lqip: artiva
summary: A digital exhibition platform for local Indonesian art, built on native PHP with a hand-rolled MVC architecture.
cover: '../../assets/project/artiva/MacBook Air (15 inch).png'
coverAlt: The Artiva website displayed inside a laptop mockup, showing the hero section for discovering local art and culture
coverPosition: center
featured: true
order: 3
stack:
  - PHP
  - MVC
  - MySQL
  - Vanilla JS
  - CSS
# TODO: replace with real figures
metrics:
  - { value: '3', label: 'Core modules' }
  - { value: 'MVC', label: 'Hand-rolled architecture' }
  - { value: '0', label: 'Framework dependencies' }
problem: >-
  Local artists had no way to be seen outside physical exhibitions, and Indonesian
  cultural content was mostly described in English on the few platforms that existed.
  Any fix that depended on a heavy framework would have been too heavy to host and too
  unfamiliar for the small teams maintaining it.
approach: >-
  I built the platform in native PHP on a clean MVC architecture, so the codebase stays
  readable and maintainable well past launch rather than depending on a framework's
  lifecycle. Structurally, controllers stay thin, models own all data access, and views
  carry no business logic. Visually, I designed it as a gallery rather than a
  catalogue: warm neutral canvas, generous whitespace, editorial serif display type and a
  scroll-led home that invites browsing instead of searching.
result: >-
  A working platform for discovering local art and culture, with gallery browsing,
  event listings and an artist submission flow. The architecture is one another
  maintainer could pick up without a framework in the way, and the interface was
  received well enough to become a personal reference project.
highlights:
  - 'Native PHP MVC architecture, chosen for long-term maintainability over framework convenience.'
  - 'Gallery-first interface design: editorial serif typography on a warm neutral canvas.'
  - 'Gallery browsing, event listings and a dynamic event management flow.'
  - 'Indonesian-language art and culture discovery, positioning local work for a wider audience.'
gallery:
  - '../../assets/project/artiva/Artiva Picture(1) 1.png'
links:
  - { label: 'Live Site', href: '#' }
---

Artiva was a lesson in restraint. The brief could have justified a framework, a
database abstraction layer and a component library. Instead I wrote plain PHP, kept the
MVC boundaries honest, and spent the time saved on making the gallery actually feel like
a gallery.

