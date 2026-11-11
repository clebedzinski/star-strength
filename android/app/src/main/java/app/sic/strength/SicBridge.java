package app.sic.strength;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Vibrator;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;

/** Methods the page calls. No secrets. Folder access is only what the person grants. */
public final class SicBridge {
    private final Context app;
    private final MainActivity activity;

    SicBridge(MainActivity activity) {
        this.activity = activity;
        this.app = activity.getApplicationContext();
    }

    @JavascriptInterface
    public String getPlatform() { return "android"; }

    @JavascriptInterface
    public String getAppVersion() { return "1.0.7-sic-debug"; }

    @JavascriptInterface
    public String storageInfo() {
        return "App-private WebView storage, plus any folder you grant with the system picker. Typed paths are not accepted.";
    }

    @JavascriptInterface
    public void exitApp() { activity.runOnUiThread(activity::finish); }

    @JavascriptInterface
    public boolean canOverlay() { return Settings.canDrawOverlays(app); }

    @JavascriptInterface
    public void requestOverlay() {
        activity.runOnUiThread(() -> {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + app.getPackageName()));
            activity.startActivity(intent);
        });
    }

    @JavascriptInterface
    public void showOverlay() {
        activity.runOnUiThread(() -> {
            if (!Settings.canDrawOverlays(app)) {
                requestOverlay();
                emit("overlay", false, "permission");
                return;
            }
            Intent intent = new Intent(app, OverlayService.class);
            app.startForegroundService(intent);
            emit("overlay", true, "started");
        });
    }

    @JavascriptInterface
    public void hideOverlay() {
        activity.runOnUiThread(() -> app.stopService(new Intent(app, OverlayService.class)));
    }

    @JavascriptInterface
    public void pickDirectory(String kind) {
        activity.runOnUiThread(() -> activity.pickDirectory(kind == null ? "routines" : kind));
    }

    @JavascriptInterface
    public void importXml(String kind) {
        activity.runOnUiThread(() -> activity.importXml(kind == null ? "bundle" : kind));
    }

    @JavascriptInterface
    public boolean writeTextFile(String kind, String name, String text) {
        try {
            return activity.writeGrantedFile(kind, name, text == null ? "" : text);
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public void writeSharedState(String json) {
        app.getSharedPreferences("sic", Context.MODE_PRIVATE)
                .edit().putString("shared", json == null ? "" : json).apply();
    }

    @JavascriptInterface
    public String readSharedState() {
        return app.getSharedPreferences("sic", Context.MODE_PRIVATE).getString("shared", "");
    }

    @JavascriptInterface
    public void haptic(int ms) {
        Vibrator vibrator = (Vibrator) app.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) vibrator.vibrate(Math.max(1, Math.min(ms, 200)));
    }

    @JavascriptInterface
    public void scheduleNotification(String title, String body, double whenMs) {
        long when = (long) whenMs;
        if (when < System.currentTimeMillis()) return;
        Intent intent = new Intent(app, NotifyReceiver.class);
        intent.putExtra("title", title == null ? "SIC" : title);
        intent.putExtra("body", body == null ? "" : body);
        int id = (int) (when % 100000);
        PendingIntent pi = PendingIntent.getBroadcast(app, id, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarms = (AlarmManager) app.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
    }

    void emit(String type, boolean ok, String detail) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("type", type);
            obj.put("ok", ok);
            obj.put("detail", detail == null ? "" : detail);
            String js = "window.SICApp&&SICApp.onNativeResult(" + JSONObject.quote(obj.toString()) + ")";
            activity.eval(js);
        } catch (Exception ignored) {}
    }

    void emitImport(String text) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("type", "import");
            obj.put("text", text == null ? "" : text);
            String js = "window.SICApp&&SICApp.onNativeResult(" + JSONObject.quote(obj.toString()) + ")";
            activity.eval(js);
        } catch (Exception ignored) {}
    }

    static byte[] bytes(String text) { return text.getBytes(StandardCharsets.UTF_8); }
}
