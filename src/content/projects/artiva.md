---
title: Artiva
year: 2024
role: Fullstack Developer & UI/UX Designer
category: Web Platform
platform: Responsive Web
panelLabel: artiva.gallery.web
lqip: artiva
summary: A digital exhibition platform for local Indonesian art, built with native PHP and a custom MVC structure.
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
metrics: []
problem: >-
  Local artists had few places to present work online outside physical exhibitions, and
  existing art directories rarely wrote about Indonesian cultural events in Indonesian.
  Small teams maintaining the site also needed something light to host without heavy
  framework overhead.
approach: >-
  I built the backend in native PHP with a custom MVC structure so controllers stay thin,
  models handle SQL queries, and views stay free of business logic. On the frontend, I
  designed the layout like an exhibition room rather than a dense store catalog, using a
  warm neutral canvas, serif display headings, and generous spacing around each artwork.
result: >-
  A working web platform with artwork browsing, event schedules, and an artist submission
  flow. Another PHP developer can read the folder structure and maintain it without
  learning a framework first.
highlights:
  - 'Custom native PHP MVC architecture built for simple shared hosting and maintenance.'
  - 'Gallery-focused layout with serif display typography on a warm neutral canvas.'
  - 'Artwork directory, event listings, and dynamic event management.'
  - 'Indonesian-language curation for local art and cultural events.'
gallery:
  - '../../assets/project/artiva/Artiva Picture(1) 1.png'
links: []
---

The brief could have justified pulling in a full framework, an ORM, and a component kit.
Writing plain PHP with strict MVC boundaries took less setup, ran cleanly on basic
hosting, and gave me more time to focus on how the artwork actually sat on the page.
