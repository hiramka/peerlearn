# PeerLearn: Offline Local School Server Setup Guide

For rural or low-connectivity secondary schools in Kenya with intermittent or zero internet access, PeerLearn can be deployed as a **local edge appliance** running on school premises.

---

## 1. Hardware Options

- **Option A: Low-Cost Mini PC / NUC / Desktop:** Any basic Core i3 / Celeron PC with 4GB RAM running Ubuntu Server or Windows 10/11.
- **Option B: Raspberry Pi 4 / 5:** 4GB+ RAM model running Raspberry Pi OS (64-bit).
- **Option C: School Wi-Fi Router or Hotspot:** TP-Link / Mikrotik router providing local Wi-Fi without needing external cellular bundle.

---

## 2. Quick Setup via Docker

1. **Clone repository on the local machine:**
   ```bash
   git clone https://github.com/hiramka/peerlearn.git
   cd peerlearn
   ```

2. **Launch with Docker Compose:**
   ```bash
   docker compose up -d
   ```

3. **Configure Local Static IP or mDNS:**
   - Assign the server a static LAN IP (e.g., `192.168.1.50`).
   - Or set hostname to `peerlearn.local`.

4. **Connect Students & Tutors:**
   - Students connect their phones, tablets, or school lab computers to the school Wi-Fi SSID (e.g. `PeerLearn-School-Lab`).
   - Open browser to `http://peerlearn.local:5173` or `http://192.168.1.50:5173`.
   - The PWA automatically installs to the home screen and caches all lesson packs locally.

---

## 3. Data Synchronization Workflow

1. **Intra-Day (Zero Internet):**
   - Students take diagnostic pre-quizzes, run 20-minute peer sessions, and take post-quizzes.
   - All session telemetry is stored in the local server and student IndexedDB outbox.
   - If Wi-Fi is down completely, students transfer results to the teacher via the **Zero-Data QR Code Handoff**.

2. **End-of-Term / Evening Sync (When Internet is Available):**
   - When the teacher connects their mobile hotspot or campus modem, the local server automatically synchronizes all queued session rows to the central Supabase cloud database.
   - Idempotency guarantees (`client_id`) ensure zero duplicated sessions even if the connection drops mid-upload.
