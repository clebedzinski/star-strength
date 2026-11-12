package app.sic.strength;

import android.annotation.SuppressLint;
import android.content.Context;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/** Shared WebView setup. Pages load from an https asset origin so storage is shared. */
final class SicWeb {
    static final String START = "https://appassets.androidplatform.net/assets/www/index.html";

    private SicWeb() {}

    @SuppressLint("SetJavaScriptEnabled")
    static WebView create(Context context, Object bridge) {
        WebView web = new WebView(context);
        web.setBackgroundColor(0xFF0B0F17);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(context))
                .build();
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
        });
        if (bridge != null) web.addJavascriptInterface(bridge, "SicNative");
        return web;
    }

    static void eval(WebView web, String script) {
        if (web == null) return;
        web.post(() -> web.evaluateJavascript(script, null));
    }
}
