<div align="center">

# 🐔 HÜHNERJAGD

**Ein Browser-Cursor-Shooter im Stil des klassischen 90er-Arcade-Genres — 3 Level, komplett KI-generiert, gebaut als Showcase für Claude Opus 5.5.**

[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-blue.svg)](LICENSE)
[![Stack](https://img.shields.io/badge/Stack-Vanilla%20HTML%2FCSS%2FJS-informational.svg)](#-tech-stack)
[![Grafik](https://img.shields.io/badge/Grafik-KI--generiert%20(Nano%20Banana%202)-black.svg)](#-die-ki-pipeline)
[![Gebaut mit](https://img.shields.io/badge/Gebaut%20mit-Claude%20Opus%205.5-purple.svg)](https://claude.ai)
[![Community](https://img.shields.io/badge/Community-AIIANER-black.svg)](https://aiianer.de)

*Kein Build-Tool, kein Framework, kein Server nötig — Datei öffnen, spielen. Kein einziges Pixel ist kopiert: Hintergründe, Hühner, Fliegen, Schafe und Sonderziele sind alle von Grund auf KI-generiert.*

[Spielen](#-spielen) · [Was drinsteckt](#-was-drinsteckt) · [Level](#-die-3-level) · [Tech-Stack](#-tech-stack) · [Die KI-Pipeline](#-die-ki-pipeline) · [Warum das hier existiert](#-warum-das-hier-existiert) · [Lizenz](#-lizenz) · [Marken](#️-marken)

</div>

---

## 🎮 Spielen

```bash
git clone https://github.com/oliverhees/huehnerjagd.git
cd huehnerjagd
open index.html   # oder: Doppelklick im Dateimanager
```

Kein `npm install`, kein Server, keine Abhängigkeiten. Die Datei läuft direkt im Browser (`file://`).

## 🕹️ Was drinsteckt

- **3 Level** mit steigendem Schwierigkeitsgrad und jeweils eigener Szene
- **Dynamisches Spawn-Tempo**: startet ruhig, wird mit jedem Treffer dichter — mit fester Obergrenze, damit es nie unübersichtlich wird
- **Munitions-Magazin**: leert sich mit der Zeit, wird durch Sonderziele wieder aufgeladen
- **Sonderziele**: ein UFO und ein Zombie-Huhn geben Bonuspunkte und laden das Magazin auf
- **Lokales Leaderboard**: Top 5, im Browser gespeichert, mit Namensfeld
- **Web-Audio-Sounddesign**: Schuss-Sound und je Kreatur ein eigener Treffer-Ton — alles synthetisiert, keine Audiodateien
- **Level-spezifische Interaktion**: Level 2 hat einen eigenen Fliegenklatschen-Cursor mit Smash-Effekt

## 🗺️ Die 3 Level

| # | Szene | Ziel | Verhalten |
|---|-------|------|-----------|
| 1 | Wiese mit Baum & Scheune | Hühner (normal + golden) | Fliegen durch den Himmel |
| 2 | Küche | Fliegen (normal + golden) | Erratisches Zick-Zack-Fliegen, eigener Klatschen-Cursor |
| 3 | Weide | Schafe (normal + Regenbogen-Bonus) | Hüpfen am Boden entlang |

## 🛠️ Tech-Stack

Reines **HTML5 + CSS3 + Vanilla JavaScript (ES6+)**. Keine Frameworks, kein Bundler, keine externen Laufzeit-Abhängigkeiten. Sound läuft komplett über die **Web Audio API** (synthetisiert, keine Audiodateien). Persistenz (Highscore, Spielername) über `localStorage`.

## 🎨 Die KI-Pipeline

Jedes Grafik-Asset in `assets/` ist eigenständig KI-generiert, nicht aus bestehendem Bildmaterial kopiert:

1. **Bildgenerierung**: [Google Nano Banana 2](https://kie.ai) für Hintergründe und Charaktere im stilisierten 3D-Look
2. **Freistellung**: Recraft Background-Removal für transparente Charakter-Sprites
3. **Integration**: Alles von Hand in CSS/JS verdrahtet — Positionierung, Animation, Physik

Der komplette Code (Spiellogik, Level-System, Leaderboard, Soundsynthese) wurde in einer einzigen Konversation mit **Claude Opus 5.5** geschrieben, live im echten Chrome-Browser getestet und nach Feedback mehrfach iteriert.

## 💡 Warum das hier existiert

Kein kommerzielles Projekt, keine Roadmap — ein Wochenend-Showcase, um zu zeigen, wie weit man mit einem einzigen KI-Modell in einer einzigen Sitzung kommt: von "baue mir einen Browser-Shooter" bis zu einem 3-Level-Spiel mit Leaderboard, dynamischer Schwierigkeit und komplett eigenem Artwork.

## 📜 Lizenz

**[MIT](LICENSE)** — Code und KI-generierte Assets frei nutzbar, veränderbar, weitergebbar.

## ™️ Marken

Dieses Projekt ist **keine** Kopie oder Neuauflage von "Moorhuhn"® (einer eingetragenen Marke von Phenomedia / den jeweiligen aktuellen Rechteinhabern). Es trägt bewusst einen anderen Namen ("Hühnerjagd"), verwendet ausschließlich eigenständig KI-generierte Grafik ohne jegliches Original-Bildmaterial und steht in **keiner** Verbindung zu, Zusammenarbeit mit oder Billigung durch die Rechteinhaber der Marke "Moorhuhn". Es handelt sich um eine unabhängige, nicht-kommerzielle Hommage an das Cursor-Shooter-Genre der späten 1990er.

„AIIANER" ist ein Kennzeichen von Oliver Hees aka Aiianer. Die Lizenz des Quellcodes gewährt keine Rechte an diesem Namen.

---

<div align="center">

Made for fun mit 🐔 · [MIT](LICENSE)

Mit ❤️ von **Oliver Hees – Der Aiianer**, gebaut mit **Claude Opus 5.5**
Community: **[aiianer.de](https://aiianer.de)**

</div>
