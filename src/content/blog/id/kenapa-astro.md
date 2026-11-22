---
title: 'Kenapa portofolio saya dibangun dengan Astro, bukan Next.js'
description: 'Memulai dari halaman berbasis HTML lalu menambahkan SSR dan CMS SQLite ringan tanpa membebani pengunjung dengan runtime framework besar.'
pubDate: 2026-09-29
lang: id
tags:
  - Astro
  - Performa
  - Frontend
---

Saya membangun ulang portofolio ini dua kali sebelum akhirnya bertahan di Astro. Versi
pertama memakai React SPA, lalu versi kedua memakai Next.js. Keduanya berjalan dengan
baik, tetapi terasa terlalu berat untuk kebutuhan situs personal.

## Menentukan baseline yang tepat

Banyak perbandingan framework hanya menanyakan mana yang lebih cepat. Kalau dikonfigurasi
dengan rapi, Astro maupun Next.js sama-sama bisa cepat. Pertanyaan yang lebih relevan
bagi saya adalah seberapa banyak JavaScript yang perlu diunduh pengunjung hanya untuk
membaca studi kasus dan CV.

Bahkan setelah saya menambahkan database dan halaman admin untuk mengedit konten
sendiri, hampir semua pengunjung hanya membaca halaman publik. Pada framework berbasis
React, browser tetap harus mengunduh runtime dan menjalankan hidrasi di setiap halaman.
Di Astro, server merender HTML bersih sebagai standar, sementara skrip sisi klien hanya
dimuat untuk interaksi yang memang dibutuhkan.

## Dampak nyatanya saat dikembangkan

Mengirim HTML sejak awal dan menjaga skrip klien tetap ringkas memberi tiga keuntungan
langsung. Teks dan tata letak tampil cepat karena browser tidak menunggu bundle
framework besar selesai diproses. Performa juga lebih stabil tanpa harus sering
mengejar bug hidrasi. Selain itu, saat kebutuhan berkembang ke data dinamis, perpindahan
ke mode server rendering dengan `@astrojs/vercel` bisa dilakukan tanpa merombak seluruh
frontend.

## Menambah CMS tanpa membebani halaman publik

Awalnya situs ini hanya memakai file Markdown statis dengan skema bertipe. Seiring
waktu, saya butuh cara untuk memperbarui teks section, proyek, dan draf blog langsung
dari browser tanpa harus membuat commit baru setiap kali memperbaiki satu kalimat.

Saya menambahkan LibSQL (SQLite di lokal dan Turso di produksi) dengan Drizzle ORM
serta studio `/admin` yang dilindungi middleware. Karena seluruh pengecekan sesi terjadi
di server, pengunjung publik sama sekali tidak menerima markup admin, skrip editor, atau
overlay Quick Edit. Mereka hanya menerima halaman portofolio yang sudah dirender bersih.

## Kapan saya tetap memilih React atau Next.js

Kalau sisi publik sebuah produk memang berupa aplikasi web dengan login, state klien
yang padat, atau form interaktif di setiap halaman, React dan Next.js jauh lebih cocok.
Untuk portofolio yang memiliki studio edit privat di belakangnya, Astro menjaga halaman
publik tetap ringan sambil tetap memberi kendali server penuh saat dibutuhkan.
