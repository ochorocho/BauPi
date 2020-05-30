# BauPi 

## Requirements

* Node >10
* yarn
* ffmpeg
* raspistill
* (optional) [RaspAP](https://github.com/billz/raspap-webgui#quick-installer) to use it as access point (wifi)

## Setup

```
git clone https://github.com/ochorocho/BauPi.git /home/pi/BauPi
cd /home/pi/BauPi
yarn install
```

Copy service file to `/etc/systemd/system/` and enable autostart

```
sudo systemctl enable baupi
sudo systemctl start baupi
```

GUI is available on port 3000

To change config edit /home/pi/BauPi/config/default.json
