---
title: 'Kenapa portofolio saya dibangun dengan Astro, bukan Next.js'
description: 'Portofolio itu situs konten, bukan aplikasi. Pembedaan itu menentukan framework mana yang sebaiknya dipakai — dan menghemat sekitar 100 KB JavaScript.'
pubDate: 2026-09-29
lang: id
tags:
  - Astro
  - Performa
  - Frontend
---

Saya membangun ulang situs ini dua kali sebelum akhirnya memakai Astro. Percobaan
pertama berupa React single-page app, yang kedua Next.js. Keduanya jalan. Tapi tidak
satu pun merupakan alat yang tepat, dan saya butuh waktu yang terlalu lama untuk
memahami alasannya.

## Pertanyaan yang salah

Banyak perdebatan framework berputar di sekitar "mana yang lebih cepat?" Itu sumbu
yang salah. Dua-duanya cepat kalau dipakai dengan benar.

Pertanyaan yang berguna: **apakah situs ini dokumen, atau aplikasi?**

Portofolio adalah dokumen. Kumpulan halaman konten yang berubah ketika saya
mengubahnya, dibaca ratusan orang sebulan, tanpa akun, tanpa database, tanpa
anything real-time. Sementara aplikasi React selalu mengirim runtime-nya ke browser di
setiap halaman — mau halaman itu membutuhkannya atau tidak.

## Vanity nol JavaScript itu memang berarti apa

Astro mengompilasi menjadi HTML statis dan tidak mengirim runtime framework kecuali
sebuah komponen secara eksplisit meminta interaktif. Halaman depan yang sedang kamu
baca hanya mengirim beberapa skrip vanilla kecil — menu mobile, efek typewriter, dan
scroll-progress bar. Sisanya HTML dan CSS.

Konsekuensi konkretnya:

- **Rasio teks terhadap paint lebih besar.** Halaman yang mengirim 120 KB framework
  tidak mungkin menampilkan konten aslinya sebelum framework itu selesai di-parse dan
  dieksekusi.
- **Plafon performa lebih tinggi secara default.** Saya tidak perlu melakukan tuning
  untuk mendapat skor bagus; baseline-nya sudah ada sejak awal.
- **Murah di-host.** Berkas statis dari CDN praktis gratis di semua level trafik —
  dan itu tidak berlaku untuk aplikasi yang dirender di server.

## Bagian yang tidak saya sangka

Yang membuat Astro melekat bukan performa, tapi **content collections**.

Sebuah studi kasus proyek adalah data terstruktur: tahun, peran, stack, masalah,
pendekatan, hasil. Astro membiarkan saya mendeklarasikannya sebagai skema bertipe, dan
setiap halaman proyek dibangkitkan dari skema itu. Kalau ada field wajib yang hilang,
**build-nya gagal** — bukan halaman diam-diam menampilkan `undefined` di depan
seorang rekruter.

Hal kecil itu ternyata yang membedakan portofolio yang bisa saya rawat dengan
portofolio yang saya menghindari untuk disentuh.

## Kapan saya akan memilih Next.js

Kalau situs ini butuh pengguna terautentikasi, dashboard langsung, atau server actions
yang melakukan pekerjaan nyata per request — di situ model framework-first memang
sepadan. Untuk sekadar "menerbitkan artikel", tidak.
