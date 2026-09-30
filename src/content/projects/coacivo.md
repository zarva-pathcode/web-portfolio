---
title: Coacivo
year: 2026
role: Flutter Developer
category: Mobile & AI
platform: Android
panelLabel: coacivo.live.stats
lqip: coacivo
summary: A Flutter football club management app that turns spoken match events into structured player statistics in real time.
cover: '../../assets/project/coacivo/Group 54.png'
coverAlt: Three Coacivo mobile screens showing player ranking, a club performance dashboard and the live match screen with voice chat
coverPosition: center
featured: true
order: 1
stack:
  - Flutter
  - Dart
  - BLoC
  - Clean Architecture
  - Speech-to-Text
  - REST API
# TODO: replace with real figures
metrics:
  - { value: '1', label: 'Voice-to-Stat pipeline' }
  - { value: '3', label: 'Live match surfaces' }
  - { value: '0', label: 'Manual stat entry' }
problem: >-
  Coaches were tracking live match events by shouting them across the touchline and
  then writing them down afterwards. Between the whistle and the final whistle, every
  goal, substitution and card existed only in someone's head, and the resulting
  player statistics were incomplete by the time anyone typed them in.
approach: >-
  I built the Flutter client on Clean Architecture with BLoC state management, so the
  match state stays a single source of truth while the UI is free to render optimistically
  and reconcile as data arrives. The centrepiece is a Live Voice-to-Stat pipeline: the
  coach simply speaks a match event, speech is captured on-device, parsed into a structured
  event, and pushed straight into the live match screen â€” so the statistics update while
  the match is still being played.
result: >-
  Match events reach the statistics layer in real time instead of after the fact. Player
  rankings, win-rate breakdowns and per-match performance all update live, and the coach
  never has to break rhythm to fill in a form.
highlights:
  - 'Live Voice-to-Stat: spoken match events parsed into structured player statistics in real time.'
  - 'Clean Architecture with BLoC, keeping live match state a single source of truth across the app.'
  - 'Player ranking, win-rate comparison and match progression surfaced from one live data source.'
  - 'In-match voice channel layered on top of the event pipeline so communication and stat capture share one flow.'
links: []
---

Coacivo is the clearest example of what I like building: a feature where the
interface itself is the innovation. Everything else â€” the dashboards, the rankings,
the match view â€” is conventional mobile work. The part that is not is that a coach
should be able to talk, and have the data simply appear.

