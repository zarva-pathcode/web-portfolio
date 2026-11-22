---
title: Coacivo
year: 2026
role: Flutter Developer
category: Mobile & AI
platform: Android
panelLabel: coacivo.live.stats
lqip: coacivo
summary: A Flutter football club management app used by 300+ users, turning spoken match events into structured player statistics in real time.
cover: '../../assets/project/coacivo/Group 54.png'
coverAlt: Three Coacivo mobile screens showing player ranking, a club performance dashboard, and the live match screen with voice chat
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
metrics:
  - { value: '300+', label: 'Users' }
problem: >-
  Coaches tracked live match events by shouting notes from the touchline and writing
  them down after full time. During the match, goals, substitutions, and cards stayed in
  memory, so player stats were often incomplete by the time someone entered them into a
  spreadsheet.
approach: >-
  I built the Flutter app with Clean Architecture and BLoC so match state lives in one
  predictable store while the UI updates immediately and reconciles with the server. The
  main feature is a voice-to-stat pipeline: a coach speaks a match event, the device
  captures speech, parses it into a structured record, and pushes it straight to the live
  match screen while play continues.
result: >-
  Over 300 users now use Coacivo to record match events as they happen instead of
  reconstructing them later. Player rankings, win rates, and per-match breakdowns update
  live while coaches stay focused on the pitch.
highlights:
  - 'Voice-to-stat pipeline that parses spoken match events into structured player records in real time.'
  - 'Clean Architecture with BLoC keeping live match state consistent across screens.'
  - 'Player rankings, win-rate comparisons, and match timelines fed from one shared data source.'
  - 'In-match voice channel layered into the same flow as event capture.'
links: []
---

Coacivo shows why interface choices matter as much as backend logic. Dashboards,
rankings, and match views are standard mobile features. What made the app practical on
the touchline was letting a coach speak an event out loud and see the stats update on
screen right away.
