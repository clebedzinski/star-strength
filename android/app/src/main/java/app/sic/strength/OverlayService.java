package app.sic.strength;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.IBinder;
import android.view.Gravity;
import android.view.WindowManager;
import android.webkit.WebView;

/**
 * Rectangular overlay. Touches outside this window pass to other apps
 * (FLAG_NOT_TOUCH_MODAL). Touches inside the rectangle hit the mini WebView,
 * including padding around a non-rectangular skin. That pass-through was not
 * measured on a physical device in this build.
 */
public class OverlayService extends Service {
    private WindowManager windows;
    private WebView web;

    @Override
    public void onCreate() {
        super.onCreate();
        channel();
        startForeground(7, notice());
        windows = (WindowManager) getSystemService(WINDOW_SERVICE);
        web = SicWeb.create(this, new OverlayBridge());
        int size = (int) (240 * getResources().getDisplayMetrics().density);
        int height = (int) (360 * getResources().getDisplayMetrics().density);
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                size, height,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = 24;
        lp.y = 120;
        windows.addView(web, lp);
        web.loadUrl(SicWeb.START + "?overlay=1");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }

    @Override
    public void onDestroy() {
        if (web != null && windows != null) windows.removeView(web);
        if (web != null) web.destroy();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    private void channel() {
        NotificationChannel channel = new NotificationChannel("sic-mini", getString(R.string.overlay_channel), NotificationManager.IMPORTANCE_LOW);
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.createNotificationChannel(channel);
    }

    private Notification notice() {
        return new Notification.Builder(this, "sic-mini")
                .setContentTitle("SIC mini")
                .setContentText(getString(R.string.overlay_notice))
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .build();
    }

    /** Bridge that does not need the activity. Folder and exit stay on the main activity. */
    private final class OverlayBridge {
        @android.webkit.JavascriptInterface public String getPlatform() { return "android"; }
        @android.webkit.JavascriptInterface public String getAppVersion() { return "1.0.1-sic-debug"; }
        @android.webkit.JavascriptInterface public boolean canOverlay() { return true; }
        @android.webkit.JavascriptInterface public void hideOverlay() { stopSelf(); }
        @android.webkit.JavascriptInterface public void writeSharedState(String json) {
            getSharedPreferences("sic", MODE_PRIVATE).edit().putString("shared", json == null ? "" : json).apply();
        }
        @android.webkit.JavascriptInterface public String readSharedState() {
            return getSharedPreferences("sic", MODE_PRIVATE).getString("shared", "");
        }
    }
}
