# KelNara AI Discord Bot

Bot Discord AI sederhana untuk Termux / VSPhone menggunakan **Xiaomi MiMo** sebagai personal agent.

## File utama

- `index.js` = kode utama bot Discord
- `package.json` = dependency Node.js
- `.gitignore` = mencegah file rahasia ikut terupload

## Setup cepat di Termux / VSPhone

```bash
pkg update -y
pkg install -y nodejs git nano

git clone https://github.com/JooNeedToLearn/Discord-Bot-AI.git
cd Discord-Bot-AI
npm install
nano .env
```

Isi file `.env`:

```txt
DISCORD_TOKEN=isi_dengan_token_bot_discord
MIMO_API_KEY=isi_dengan_api_key_xiaomi_mimo
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5-pro
BOT_PREFIX=!
```

Kalau API key Xiaomi MiMo kamu memakai Token Plan `tp-...`, ganti `MIMO_BASE_URL` sesuai URL yang muncul di dashboard Token Plan MiMo.

## Jalankan test

```bash
node index.js
```

Kalau berhasil, terminal akan menampilkan:

```txt
KelNara AI aktif sebagai nama_bot
Mode: Xiaomi MiMo personal agent
Model: mimo-v2.5-pro
Base URL: https://api.xiaomimimo.com/v1
```

## Jalankan 24 jam

```bash
npm install -g pm2
pm2 start index.js --name kelnara-ai-bot
pm2 save
pm2 status
```

Lihat log:

```bash
pm2 logs kelnara-ai-bot
```

Restart setelah edit `.env`:

```bash
pm2 restart kelnara-ai-bot
```

Stop:

```bash
pm2 stop kelnara-ai-bot
```

## Cara pakai di Discord

Mention bot atau pakai command:

```txt
@Bot kamu tanya apa
!ai tanya apa
!ask tanya apa
```

Contoh:

```txt
!ai halo
!ai buatkan website portofolio keperawatan
!ai error ini kenapa: Cannot find module discord.js
```

## Penting

Aktifkan **Message Content Intent** di Discord Developer Portal.

Jangan upload file `.env` ke GitHub. Kalau token Discord atau API key MiMo pernah bocor, segera reset/revoke dan buat yang baru.
