#!/usr/bin/env bash

# Install ffmpeg
apt-get update && apt-get install -y ffmpeg

# Continue with Python setup
pip install -r requirements.txt
