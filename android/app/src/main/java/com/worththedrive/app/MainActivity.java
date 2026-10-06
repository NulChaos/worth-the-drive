package com.worththedrive.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Worth the Drive: a WebView shell around the web app in /web.
 *
 * - The web app ships inside the APK (assets) so it works offline.
 * - On launch it asks GitHub for the latest commit on main; if web/ changed, it downloads the
 *   new files into internal storage and tells the page, so content updates need no reinstall.
 * - The page calls Google Places and the GitHub API through the "Native" bridge (no CORS limits).
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int REQ_LOCATION = 1;

    private WebView web;
    private SharedPreferences prefs;
    private File webDir;
    private final Handler main = new Handler(Looper.getMainLooper());
    private WebViewAssetLoader loader;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;
    private volatile boolean updating = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("wtd", MODE_PRIVATE);
        webDir = new File(getFilesDir(), "web");

        // A newly installed APK carries newer bundled files; drop any older downloaded copy.
        if (!BuildConfig.GIT_SHA.equals(prefs.getString("apkSha", ""))) {
            deleteRecursive(webDir);
            prefs.edit().putString("apkSha", BuildConfig.GIT_SHA).remove("webSha").apply();
        }

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);

        loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/", new LocalHandler())
                .build();

        web.addJavascriptInterface(new Bridge(), "Native");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                openExternal(u.toString());
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasLocation()) {
                    callback.invoke(origin, true, false);
                } else {
                    geoCallback = callback;
                    geoOrigin = origin;
                    requestPermissions(new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
                }
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl("https://" + HOST + "/index.html");
        }
        checkWebUpdate();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQ_LOCATION && geoCallback != null) {
            geoCallback.invoke(geoOrigin, hasLocation(), false);
            geoCallback = null;
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private boolean hasLocation() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
        }
    }

    /** Serves downloaded web files when present, otherwise the copy bundled in the APK. */
    private class LocalHandler implements WebViewAssetLoader.PathHandler {
        @Override
        public WebResourceResponse handle(String path) {
            if (path == null || path.isEmpty()) path = "index.html";
            if (path.contains("..")) return null;
            try {
                InputStream in;
                File f = new File(webDir, path);
                if (f.isFile()) in = new FileInputStream(f);
                else in = getAssets().open(path);
                WebResourceResponse r = new WebResourceResponse(mime(path), "utf-8", in);
                Map<String, String> h = new HashMap<>();
                h.put("Cache-Control", "no-cache");
                r.setResponseHeaders(h);
                return r;
            } catch (IOException e) {
                return null;
            }
        }
    }

    private static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    /** Methods the page can call as window.Native.* */
    private class Bridge {
        @JavascriptInterface
        public void request(String id, String method, String url, String headersJson, String body) {
            new Thread(() -> {
                int status = 0;
                String text;
                try {
                    URL u = new URL(url);
                    String host = u.getHost();
                    if (!"https".equals(u.getProtocol())
                            || !(host.equals("places.googleapis.com") || host.equals("api.github.com"))) {
                        throw new IOException("Blocked host " + host);
                    }
                    HttpURLConnection c = (HttpURLConnection) u.openConnection();
                    c.setRequestMethod(method);
                    c.setConnectTimeout(15000);
                    c.setReadTimeout(20000);
                    c.setRequestProperty("User-Agent", "WorthTheDrive/" + BuildConfig.VERSION_NAME);
                    JSONObject h = new JSONObject(headersJson == null || headersJson.isEmpty() ? "{}" : headersJson);
                    Iterator<String> keys = h.keys();
                    while (keys.hasNext()) {
                        String k = keys.next();
                        c.setRequestProperty(k, h.getString(k));
                    }
                    if (body != null && !body.isEmpty()) {
                        c.setDoOutput(true);
                        try (OutputStream o = c.getOutputStream()) {
                            o.write(body.getBytes(StandardCharsets.UTF_8));
                        }
                    }
                    status = c.getResponseCode();
                    InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
                    text = in == null ? "" : readAll(in);
                } catch (Exception e) {
                    text = String.valueOf(e.getMessage());
                }
                final String js = "window.__nativeResp&&window.__nativeResp(" + JSONObject.quote(id) + ","
                        + status + "," + JSONObject.quote(text) + ")";
                main.post(() -> web.evaluateJavascript(js, null));
            }).start();
        }

        @JavascriptInterface
        public int versionCode() {
            return BuildConfig.VERSION_CODE;
        }

        @JavascriptInterface
        public String versionName() {
            return BuildConfig.VERSION_NAME;
        }

        @JavascriptInterface
        public String repo() {
            return BuildConfig.REPO;
        }

        @JavascriptInterface
        public String webSha() {
            return prefs.getString("webSha", BuildConfig.GIT_SHA);
        }

        @JavascriptInterface
        public void openExternal(String url) {
            main.post(() -> MainActivity.this.openExternal(url));
        }

        @JavascriptInterface
        public void checkWebUpdate() {
            MainActivity.this.checkWebUpdate();
        }
    }

    /** Downloads web/ from the latest commit on main if it differs from what we have. */
    private void checkWebUpdate() {
        if (BuildConfig.REPO.isEmpty() || updating) return;
        updating = true;
        new Thread(() -> {
            try {
                String current = prefs.getString("webSha", BuildConfig.GIT_SHA);
                String sha = get("https://api.github.com/repos/" + BuildConfig.REPO + "/commits/main",
                        "application/vnd.github.sha").trim();
                if (sha.length() < 40 || sha.equals(current)) return;

                String base = "https://raw.githubusercontent.com/" + BuildConfig.REPO + "/" + sha + "/web/";
                JSONArray files = new JSONArray(get(base + "files.json", null));
                File tmp = new File(getFilesDir(), "web_tmp");
                deleteRecursive(tmp);
                if (!tmp.mkdirs()) return;
                for (int i = 0; i < files.length(); i++) {
                    String name = files.getString(i);
                    if (name.contains("..")) continue;
                    File f = new File(tmp, name);
                    File parent = f.getParentFile();
                    if (parent != null) parent.mkdirs();
                    download(base + name, f);
                }
                File old = new File(getFilesDir(), "web_old");
                deleteRecursive(old);
                if (webDir.exists() && !webDir.renameTo(old)) return;
                if (!tmp.renameTo(webDir)) return;
                deleteRecursive(old);
                prefs.edit().putString("webSha", sha).apply();
                main.post(() -> web.evaluateJavascript("window.onWebUpdated&&window.onWebUpdated()", null));
            } catch (Exception ignored) {
                // Offline or GitHub unreachable: keep using what we have.
            } finally {
                updating = false;
            }
        }).start();
    }

    private static HttpURLConnection open(String url, String accept) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setRequestProperty("User-Agent", "WorthTheDrive/" + BuildConfig.VERSION_NAME);
        if (accept != null) c.setRequestProperty("Accept", accept);
        if (c.getResponseCode() != 200) throw new IOException("HTTP " + c.getResponseCode() + " for " + url);
        return c;
    }

    private static String get(String url, String accept) throws IOException {
        return readAll(open(url, accept).getInputStream());
    }

    private static void download(String url, File dest) throws IOException {
        try (InputStream in = open(url, null).getInputStream(); OutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
    }

    private static String readAll(InputStream in) throws IOException {
        try (InputStream i = in; ByteArrayOutputStream b = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = i.read(buf)) > 0) b.write(buf, 0, n);
            return b.toString("UTF-8");
        }
    }

    private static void deleteRecursive(File f) {
        if (f == null || !f.exists()) return;
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteRecursive(k);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }
}
