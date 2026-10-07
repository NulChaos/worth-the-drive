# Worth the Drive

An Android and iPhone app that ranks Las Vegas–area restaurants by how good they are *for how far away they are*. It includes a rating-vs-distance dial, budget per person, drive-thru and grab-and-go filters, a live map, and a Surprise Me wheel.

## How it's put together

| Folder | What it is | How changes reach your phone |
|---|---|---|
| `web/` | The app itself: `index.html`, plus `data.json` with the built-in list of about 400 restaurants and their review summaries | **Automatically.** On launch the app checks the latest commit on `main` and downloads `web/` if it changed. You get a "Reload" banner, with no reinstall. |
| `android/` | The small Android shell around the web app: location, a native network bridge, and the update checks | **New APK.** Any push that touches `android/` makes GitHub Actions build a signed APK and publish it as a Release. The app shows "App update available → Download". |

The repo must stay **public**, because the app reads updates from GitHub without logging in. Your Google key is never stored in the repo.

## One-time setup

### 1. Signing secrets (so updates install over the old version)

In the repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add:

- `ANDROID_KEYSTORE_B64`: the long text from `keystore_b64.txt`
- `ANDROID_KEYSTORE_PASSWORD`: the text from `keystore_password.txt`

Keep those two files somewhere safe. If they're lost, the next APK won't install over the old one until you uninstall it first.

Then open **Actions → Build APK → Run workflow** to build with the real key.

### 2. Install on your phone

**iPhone / iPad:** in **Safari**, open <https://nulchaos.github.io/worth-the-drive/>. Tap **Share**, then **Add to Home Screen**. It opens full-screen like an app and updates itself every time it opens. Every push to `web/` republishes it automatically.

**Android:**

Open **Releases** on your phone, download `WorthTheDrive.apk`, and open it. Android will ask you to allow installs from your browser. Allow it once.

### 3. Google key for live data (optional but recommended)

Without a key the app uses the built-in list. With one, **Refresh** and **Search** pull live ratings, hours, per-person prices, newly opened places, and closures.

1. Go to <https://console.cloud.google.com/>, create a project, and turn on billing. Google requires billing even for the free allowance.
2. Open **APIs & Services → Library**, search **Places API (New)**, and click **Enable**.
3. Open **APIs & Services → Credentials → Create credentials → API key**.
4. Click the new key and choose **Restrict key → API restrictions → Places API (New)**. Save.
5. Optional: under **Billing → Budgets & alerts**, add a $1 budget alert for peace of mind.
6. In the app, tap the gear icon, paste the key, then tap **Test key** and **Save key**.

Each Refresh or Search uses one lookup, and picking several cuisines uses up to three. The app caches results for 30 minutes and stops at 900 lookups a month. That stays inside Google's free monthly allowance for these requests (about 1,000 at the field level this app uses).

## Updating the restaurant list

Edit `web/data.json`, or ask Claude to refresh it, and push to `main`. Phones pick it up the next time the app opens.

Each entry looks like this:

```json
{"n":"Name","c":"Cuisine · Style","a":"Address","lat":36.1,"lng":-115.2,"r":4.6,"v":1200,"pr":2,
 "h":["Monday: 11:00 AM – 9:00 PM", "... 7 days, Monday first"],"id":"Google place id",
 "s":"One-line take","o":"What to order","w":"Recurring complaint","m":"sit|counter","dt":0}
```

`dt` is the drive-thru flag: 0 means no, 1 means likely, 2 means confirmed. `pr` is the price level, 1 to 4.

If you add a new file under `web/`, also list it in `web/files.json` so the app knows to download it.
