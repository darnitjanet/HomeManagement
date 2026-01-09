# Raspberry Pi Setup Guide for Home Management App

This guide walks you through setting up a Raspberry Pi from scratch and deploying the Home Management app.

---

## Table of Contents
1. [What You'll Need](#what-youll-need)
2. [Initial Pi Setup](#initial-pi-setup)
3. [Connect to Your Pi](#connect-to-your-pi)
4. [Install Required Software](#install-required-software)
5. [Transfer the App](#transfer-the-app)
6. [Configure the App](#configure-the-app)
7. [Run the App](#run-the-app)
8. [Access from Your Devices](#access-from-your-devices)
9. [Auto-Start on Boot](#auto-start-on-boot)
10. [Future Updates](#future-updates)
11. [Troubleshooting](#troubleshooting)

---

## What You'll Need

### Hardware
- **Raspberry Pi 4** (recommended, 2GB+ RAM) or Pi 3B+
- **MicroSD Card** (32GB+ recommended)
- **Power Supply** (official Pi power supply recommended)
- **Ethernet Cable** OR WiFi (built into Pi 3/4)
- **Another computer** to set up the SD card

### Optional but Helpful
- Keyboard and monitor (for initial setup, or use headless)
- Case for the Pi
- Heat sinks

---

## Initial Pi Setup

### Step 1: Download Raspberry Pi Imager
On your Windows computer, download the official imager:
- Go to: https://www.raspberrypi.com/software/
- Download and install **Raspberry Pi Imager**

### Step 2: Flash the SD Card

1. Insert your MicroSD card into your computer
2. Open **Raspberry Pi Imager**
3. Click **"Choose OS"** → Select **"Raspberry Pi OS (64-bit)"** (under Raspberry Pi OS (other) if not visible)
4. Click **"Choose Storage"** → Select your SD card
5. Click the **gear icon (⚙️)** for advanced options:

   **Configure these settings:**
   - ✅ Set hostname: `homemanagement` (or your preference)
   - ✅ Enable SSH: **Use password authentication**
   - ✅ Set username and password:
     - Username: `pi` (or your choice)
     - Password: (choose a secure password - remember this!)
   - ✅ Configure WiFi (if not using ethernet):
     - SSID: Your WiFi network name
     - Password: Your WiFi password
     - Country: US (or your country)
   - ✅ Set locale settings:
     - Time zone: Your timezone
     - Keyboard layout: us

6. Click **"Save"**
7. Click **"Write"** and wait for it to complete (5-10 minutes)

### Step 3: Boot the Pi

1. Remove SD card from computer
2. Insert SD card into Raspberry Pi
3. Connect ethernet cable (if using wired connection)
4. Connect power supply
5. Wait 2-3 minutes for first boot

---

## Connect to Your Pi

### Find Your Pi's IP Address

**Option A: Check your router**
- Log into your router admin page (usually `192.168.1.1`)
- Look for connected devices
- Find `homemanagement` or the Pi's MAC address

**Option B: Use hostname (may not work on all networks)**
```
ping homemanagement.local
```

**Option C: Use network scanner app**
- "Fing" app on your phone can scan your network

### Connect via SSH

On Windows, open **PowerShell** or **Command Prompt**:

```bash
ssh pi@192.168.1.XXX
```
(Replace `192.168.1.XXX` with your Pi's actual IP address)

Or if hostname works:
```bash
ssh pi@homemanagement.local
```

Enter your password when prompted.

**First time connecting?** Type `yes` when asked about the fingerprint.

---

## Install Required Software

Run these commands on your Pi (via SSH):

### Update the System
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installation:
```bash
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### Install Git
```bash
sudo apt install -y git
```

### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

---

## Transfer the App

### Option A: Using GitHub (Recommended for Easy Updates)

**On your Windows computer:**

1. Create a GitHub repository (if you haven't already)
2. In the HomeManagement folder, run:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/HomeManagement.git
git push -u origin main
```

**On your Raspberry Pi:**
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/HomeManagement.git
cd HomeManagement
```

### Option B: Direct File Transfer (SCP)

**On your Windows computer (PowerShell):**

First, build the app for production:
```bash
cd C:\Users\mrsja\HomeManagement
npm run build
```

Then transfer the files:
```bash
scp -r C:\Users\mrsja\HomeManagement pi@192.168.1.XXX:~/HomeManagement
```

---

## Configure the App

### Navigate to App Directory
```bash
cd ~/HomeManagement
```

### Install Dependencies
```bash
npm install
```

### Create Environment File
```bash
nano .env
```

Paste your environment variables (copy from your Windows `.env` file):
```
# Session
SESSION_SECRET=your-secret-key-here

# Google OAuth (for calendar sync)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# TMDB (for movies)
TMDB_API_KEY=your-tmdb-key

# Anthropic AI (for smart features)
ANTHROPIC_API_KEY=your-anthropic-key

# Optional: Email notifications
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=your-email
# SMTP_PASS=your-app-password
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

### Build for Production
```bash
npm run build
```

### Run Database Migrations
```bash
npm run db:migrate:latest
```

### (Optional) Copy Existing Database
If you want to keep your existing data, copy the database file from Windows.

**On Windows (PowerShell):**
```bash
scp C:\Users\mrsja\HomeManagement\packages\backend\database\home_management.db pi@192.168.1.XXX:~/HomeManagement/packages/backend/database/
```

---

## Run the App

### Test Run (Foreground)
```bash
cd ~/HomeManagement
NODE_ENV=production node packages/backend/dist/index.js
```

You should see:
```
🚀 Server running on http://localhost:3000
```

Press `Ctrl+C` to stop.

### Run with PM2 (Background)
```bash
pm2 start packages/backend/dist/index.js --name home-management --env production
```

Check status:
```bash
pm2 status
```

View logs:
```bash
pm2 logs home-management
```

---

## Access from Your Devices

### Find Your Pi's IP
```bash
hostname -I
```

### Access the App
On any device on your home network, open a browser and go to:
```
http://192.168.1.XXX:3000
```

Replace `192.168.1.XXX` with your Pi's IP address.

### Bookmark It
- Add to your phone's home screen for app-like access
- Bookmark on tablets/computers

### (Optional) Set a Static IP
To prevent the IP from changing, set a static IP on your router (DHCP reservation) or on the Pi itself.

---

## Auto-Start on Boot

Make the app start automatically when the Pi boots:

```bash
pm2 startup
```

This will show a command - copy and run it. Example:
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u pi --hp /home/pi
```

Then save the current process list:
```bash
pm2 save
```

Now the app will automatically start when you power on the Pi!

---

## Future Updates

### If Using GitHub

**On your Raspberry Pi:**
```bash
cd ~/HomeManagement
git pull
npm install
npm run build
pm2 restart home-management
```

### If Using Manual Transfer

1. Make changes on Windows
2. Build: `npm run build`
3. Transfer changed files via SCP
4. On Pi: `pm2 restart home-management`

---

## Troubleshooting

### App Won't Start
```bash
# Check logs
pm2 logs home-management

# Check if port is in use
sudo lsof -i :3000
```

### Can't Connect to Pi
- Make sure Pi is powered on (steady red light, blinking green light)
- Check ethernet cable connection
- Verify Pi is on the same network
- Try pinging: `ping 192.168.1.XXX`

### Database Errors
```bash
# Re-run migrations
cd ~/HomeManagement
npm run db:migrate:latest
```

### Out of Memory
If building is slow or fails:
```bash
# Increase swap space
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=100 to CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### Permission Errors
```bash
# Fix npm permissions
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER ~/HomeManagement
```

### View App Status
```bash
pm2 status
pm2 monit  # Real-time monitoring
```

### Restart App
```bash
pm2 restart home-management
```

### Stop App
```bash
pm2 stop home-management
```

---

## Quick Reference Commands

| Action | Command |
|--------|---------|
| Start app | `pm2 start home-management` |
| Stop app | `pm2 stop home-management` |
| Restart app | `pm2 restart home-management` |
| View logs | `pm2 logs home-management` |
| Check status | `pm2 status` |
| Update app (git) | `git pull && npm run build && pm2 restart home-management` |
| Pi IP address | `hostname -I` |
| Reboot Pi | `sudo reboot` |
| Shutdown Pi | `sudo shutdown -h now` |

---

## Notes

- The app runs on port **3000** by default
- Database is stored at `~/HomeManagement/packages/backend/database/home_management.db`
- Back up your database periodically!
- The Pi should stay powered on for 24/7 access to your home management app

---

**Congratulations!** Your Home Management app is now running on your Raspberry Pi! 🎉
