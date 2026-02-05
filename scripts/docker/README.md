Local image for reproducing VS Code + Playwright launch issues

Quick local verification steps (requires Docker Desktop):

1. Build the image

   ```bash
   bash scripts/docker/build-and-run-local-image.sh
   ```

   The script builds `caligo-vscode-playwright:local` and runs a short diagnostic (runs `code --version` and a verbose `xvfb-run` invocation as `pwuser`) and prints the first ~200 lines of `/tmp/vscode-launch/log.txt` for quick inspection.

2. Run the smoke capture inside the container (full run)

   ```bash
   docker run --rm -it --cap-add=SYS_ADMIN --ipc=host -v "$(pwd):/work" -w "/work" caligo-vscode-playwright:local /bin/bash -lc "su -s /bin/bash pwuser -c 'xvfb-run --auto-servernum --server-args=\"-screen 0 1920x1080x24\" npm run screenshots:vscode:smoke-local'"
   ```

Notes & tips

- Use `--cap-add=SYS_ADMIN` and `--ipc=host` to mirror the CI run environment better — it helps with Chromium sandboxing in a container during development.
- If the local run succeeds, update the CI container step to use the same image or the same apt install list; if it fails, capture `/tmp/vscode-launch/log.txt` and attach it to the failing run for diagnosis.
- The Dockerfile is intentionally minimal: it installs VS Code and the runtime dependencies on top of Playwright's `v1.58.0-noble` image.
