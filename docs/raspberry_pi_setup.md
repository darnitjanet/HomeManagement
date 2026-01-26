# Raspberry Pi Kiosk Setup Guide

## Hardware
- Raspberry Pi 4 (4GB recommended)
- MicroSD card (32GB or larger)
- Touchscreen display
- Power supply
- USB barcode scanner (optional)

## 1. Flash Raspberry Pi OS

1. Download **Raspberry Pi OS (64-bit)** with desktop from: https://www.raspberrypi.com/software/operating-systems/
2. Use **balenaEtcher** to flash the image to your SD card
3. Insert SD card into Pi and boot

## 2. Initial Pi Setup

On first boot, complete the setup wizard:
- Set locale, timezone, keyboard
- Connect to WiFi
- Update software when prompted

## 3. Enable SSH (Optional - for remote access)

```bash
sudo raspi-config
# Navigate to: Interface Options > SSH > Enable
```

## 4. Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## 5. Clone the Project

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/HomeManagement.git
cd HomeManagement
```

## 6. Install Dependencies

```bash
npm install
```

## 7. Configure Environment

```bash
# Copy example env file
cp packages/backend/.env.example packages/backend/.env

# Edit with your settings
nano packages/backend/.env
```

Add your Google OAuth credentials and other settings.

## 8. Run Database Migrations

```bash
npm run db:migrate:latest
```

## 9. Build the Frontend

```bash
npm run build
```

## 10. Set Up Auto-Start Kiosk

Create a startup script:

```bash
nano ~/start-kiosk.sh
```

Add:
```bash
#!/bin/bash

# Wait for network
sleep 10

# Start backend
cd ~/HomeManagement
npm run start:backend &

# Wait for backend to start
sleep 5

# Start Chromium in kiosk mode
chromium-browser --start-fullscreen --noerrdialogs --disable-infobars --disable-session-crashed-bubble http://localhost:3000/kiosk
```

Make executable:
```bash
chmod +x ~/start-kiosk.sh
```

## 11. Configure Autostart

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/kiosk.desktop
```

Add:
```ini
[Desktop Entry]
Type=Application
Name=Home Kiosk
Exec=/home/pi/start-kiosk.sh
```

## 12. Disable Screen Blanking

```bash
sudo nano /etc/lightdm/lightdm.conf
```

Find `[Seat:*]` section and add:
```ini
xserver-command=X -s 0 -dpms
```

## 13. Hide Mouse Cursor (Optional)

```bash
sudo apt-get install unclutter
```

Add to start-kiosk.sh before chromium line:
```bash
unclutter -idle 0.5 -root &
```

## 14. Reboot and Test

```bash
sudo reboot
```

The Pi should boot directly into the kiosk dashboard.

## Troubleshooting

### Backend not starting
Check logs: `journalctl -xe`

### Chromium crashes
Try with less memory-intensive flags:
```bash
chromium-browser --start-fullscreen --disable-gpu --disable-software-rasterizer http://localhost:3000/kiosk
```

### Touch calibration issues
```bash
sudo apt-get install xinput-calibrator
xinput_calibrator
```

### Check if services are running
```bash
ps aux | grep node
ps aux | grep chromium
```

## Useful Commands

```bash
# Restart kiosk manually
pkill chromium
~/start-kiosk.sh

# Check backend logs
cd ~/HomeManagement && npm run start:backend

# Update the app
cd ~/HomeManagement
git pull
npm install
npm run build
sudo reboot
```
