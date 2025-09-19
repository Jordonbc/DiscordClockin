#!/bin/bash

cd ../../../root/Clockin/

exec &>> ../../../root/Clockin/deploy.log

echo "Script started at $(date)"

pwd

git pull

basename "$(git rev-parse --show-toplevel)"

pm2 restart 0

echo "Script finished at $(date)"