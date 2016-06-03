So `systemd` such production
========

### Install
```shell
sudo cp kumabot.service /etc/systemd/system/
sudo systemctl daemon-reload

sudo systemctl enable kumabot
sudo systemctl start kumabot
```
### Uninstall
```shell
sudo systemctl stop kumabot
sudo systemctl disable kumabot

sudo rm /etc/systemd/system/kumabot.service
```
