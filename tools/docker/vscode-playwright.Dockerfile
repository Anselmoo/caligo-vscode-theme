# Derived from Playwright Noble image, add VS Code and common deps for Electron/Chromium
FROM mcr.microsoft.com/playwright:v1.58.2-noble

USER root

RUN bash -lc "set -euo pipefail && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    wget ca-certificates gnupg apt-transport-https \
    libasound2t64 alsa-utils xvfb \
    libgtk-3-0 libx11-xcb1 libxss1 libnss3 libxkbfile1 libsecret-1-0 \
    libxrandr2 libgbm1 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libxcomposite1 libxdamage1 libpango-1.0-0 libgconf-2-4 libxshmfence1 \
    libxtst6 libxcb-dri3-0 fonts-liberation && \
    rm -rf /var/lib/apt/lists/* || true"

# Install VS Code stable .deb (robust: detect arch and verify download)
# Install VS Code from Microsoft apt repo (works for amd64 and arm64)
RUN bash -lc "set -euo pipefail && \
    echo 'Adding Microsoft apt repository for VS Code' && \
    wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /usr/share/keyrings/microsoft-archive-keyring.gpg && \
    echo 'deb [arch=amd64,arm64,armhf signed-by=/usr/share/keyrings/microsoft-archive-keyring.gpg] https://packages.microsoft.com/repos/code stable main' > /etc/apt/sources.list.d/vscode.list && \
    apt-get update && apt-get install -y --no-install-recommends code || (apt-cache policy code; false) && \
    echo 'VS Code installed:' && which code && dpkg -l code || true"

# Provide a convenient user-data location and entrypoint for diagnostics
RUN mkdir -p /tmp/vscode-user-data && chown -R pwuser:pwuser /tmp/vscode-user-data || true

# Make sure pwuser owns workspace when mounted
VOLUME ["/work"]
WORKDIR /work

# No default CMD; this image is for local debugging and CI parity
CMD ["/bin/bash"]
