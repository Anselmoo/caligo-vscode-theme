#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME=caligo-vscode-playwright:local
DOCKERFILE=tools/docker/vscode-playwright.Dockerfile
CONTAINER_WORKDIR=/work

echo "🔧 Building local image ${IMAGE_NAME}..."
docker build -t ${IMAGE_NAME} -f ${DOCKERFILE} .

echo "🧪 Skipping VS Code --version diagnostic (can hang in headless)."

echo "🧪 Installing dependencies, building extension, and running headless per-theme smoke capture (this may take several minutes)..."
# Install deps as pwuser, build extension, then run a per-theme capture (no-reuse-window) headless under xvfb; capture logs and report
# Avoid chown of the whole repo — only own the output folder we need.
docker run --rm --cap-add=SYS_ADMIN --ipc=host \
  -v "$(pwd):${CONTAINER_WORKDIR}" \
  -w "${CONTAINER_WORKDIR}" \
  ${IMAGE_NAME} /bin/bash -lc '
    mkdir -p /work/tmp-screenshots-reuse /work/build /work/node_modules /tmp/vscode-user-data
    chown -R pwuser:pwuser /work/tmp-screenshots-reuse /work/build /work/node_modules /tmp/vscode-user-data || true
    
    # Install deps
    su -s /bin/bash pwuser -c "npm ci --silent || true"
    
    # Build extension (required for caligo-test.applyTheme command to exist)
    echo "🔨 Building extension..."
    su -s /bin/bash pwuser -c "npm run build"
    
    # Run screenshot capture
    echo "📸 Running screenshot capture..."
    su -s /bin/bash pwuser -c "CODE_EXECUTABLE=/usr/share/code/code CODE_ARGS=\"--disable-workspace-trust --no-sandbox --disable-gpu --disable-dev-shm-usage\" xvfb-run --auto-servernum --server-args=\" -screen 0 1920x1080x24\" npx tsx scripts/capture-vscode-screenshots-reuse.ts --aurora-demo --lang typescript --no-reuse-window --output ./tmp-screenshots-reuse > /tmp/vscode-screenshots.log 2>&1 || true"
    
    echo "--- smoke run log (first 300 lines) ---"
    sed -n "1,300p" /tmp/vscode-screenshots.log || true
    echo "--- output files (tmp-screenshots-reuse) ---"
    ls -la tmp-screenshots-reuse || true
    echo "--- SHA256 sums of screenshots (should differ between themes) ---"
    sha256sum tmp-screenshots-reuse/*.png 2>/dev/null || true
    echo "--- instrumentation (build/screenshots-report.json) ---"
    sed -n "1,200p" build/screenshots-report.json || true
  '

echo "✅ Docker smoke run finished. Review the logs above. If the images were generated they will be in ./tmp-screenshots-reuse and the instrumentation in build/screenshots-report.json"
