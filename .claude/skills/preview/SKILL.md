---
name: preview
description: Start the savings-tracker app so the user can view the current progress on their phone (Expo Go) and in the browser. Use when the user asks to see the app, run it, "תראה לי", "איך זה נראה", or runs /preview.
---

# Preview the app

The user wants to look at the app themselves, so don't take screenshots. Get the dev server running and hand them the links.

## Steps

1. **Is a dev server already running?**
   Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/status`. If it prints `200`, reuse the server, skip to step 4, and use the log from the earlier run (`.expo/preview.log`).

2. **Start the server in the background** (Bash tool with `run_in_background: true`):
   ```bash
   npx expo start --lan > .expo/preview.log 2>&1
   ```
   Create `.expo/` first if it doesn't exist.

3. **Wait until it's ready.** Use Monitor or an until-loop on `grep -m1 -o "exp://[^ ]*" .expo/preview.log`, with a timeout of about 90 s. If the log shows an error instead, show it to the user and stop.

4. **Make a QR code** for the `exp://` URL and open it:
   ```bash
   npx --yes qrcode -o .expo/preview-qr.png "<exp url>"
   start "" .expo/preview-qr.png
   ```
   On non-Windows systems, use `open` or `xdg-open`.

5. **Tell the user, in Hebrew:**
   - **בטלפון:** open Expo Go and scan the QR code that just opened on the screen, or choose "Enter URL manually" and type `<exp url>`. The phone and the computer must be on the same Wi-Fi.
   - **בדפדפן:** http://localhost:8081 (press `w` is not needed, opening the link builds the web version).
   - Changes update automatically (hot reload). There's no need to scan again after every change.
   - **If the phone can't connect** (another network or a firewall): stop the server and restart it with `npx expo start --tunnel`. It may ask to install `@expo/ngrok`, so approve it.

## Notes

- Don't kill a running server unless the user asks for it or a tunnel restart is needed.
- If `.env` is missing, the app shows a configuration error. Tell the user to follow `docs/supabase-setup.md`.
