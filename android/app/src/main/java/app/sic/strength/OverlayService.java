package app.sic.strength;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.IBinder;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.graphics.Color;

/**
 * Rectangular overlay. Touches outside this window pass to other apps
 * (FLAG_NOT_TOUCH_MODAL). Touches inside the rectangle hit the mini WebView,
 * including padding around a non-rectangular skin. That pass-through was not
 * measured on a physical device in this build.
 */
public class OverlayService extends Service {
    private WindowManager windows;
    private WebView web;
    private View root;
    private WindowManager.LayoutParams lp;
    private float downX, downY;
    private int startX, startY;

    @Override
    public void onCreate() {
        super.onCreate();
        channel();
        startForeground(7, notice());
        windows = (WindowManager) getSystemService(WINDOW_SERVICE);
        float d = getResources().getDisplayMetrics().density;
        web = SicWeb.create(this, new OverlayBridge());
        TextView handle = new TextView(this);
        handle.setText("Drag  ·  Strength in Character");
        handle.setTextColor(Color.WHITE);
        handle.setBackgroundColor(0xF0111827);
        handle.setPadding((int) (12 * d), (int) (10 * d), (int) (12 * d), (int) (10 * d));
        handle.setOnTouchListener((v, event) -> drag(event));
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.addView(handle, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (int) (44 * d)));
        box.addView(web, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        root = box;
        int size = (int) (168 * d);
        int height = (int) (230 * d);
        lp = new WindowManager.LayoutParams(
                size, height,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = 24;
        lp.y = 120;
        windows.addView(root, lp);
        web.loadUrl(SicWeb.START + "?overlay=1&mini=1");
    }

    private boolean drag(MotionEvent event) {
        if (lp == null || root == null || windows == null) return false;
        if (event.getAction() == MotionEvent.ACTION_DOWN) {
            downX = event.getRawX();
            downY = event.getRawY();
            startX = lp.x;
            startY = lp.y;
            return true;
        }
        if (event.getAction() == MotionEvent.ACTION_MOVE) {
            lp.x = startX + (int) (event.getRawX() - downX);
            lp.y = startY + (int) (event.getRawY() - downY);
            windows.updateViewLayout(root, lp);
            return true;
        }
        if (event.getAction() == MotionEvent.ACTION_UP) {
            int screen = getResources().getDisplayMetrics().widthPixels;
            lp.x = (lp.x + lp.width / 2 < screen / 2) ? 0 : Math.max(0, screen - lp.width);
            windows.updateViewLayout(root, lp);
            return true;
        }
        return false;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }

    @Override
    public void onDestroy() {
        if (root != null && windows != null) windows.removeView(root);
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
                .setContentTitle("Strength in Character")
                .setContentText(getString(R.string.overlay_notice))
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .build();
    }

    /** Bridge that does not need the activity. Folder and exit stay on the main activity. */
    private final class OverlayBridge {
        @android.webkit.JavascriptInterface public String getPlatform() { return "android"; }
        @android.webkit.JavascriptInterface public String getAppVersion() { return "1.1.0"; }
        @android.webkit.JavascriptInterface public boolean canOverlay() { return true; }
        @android.webkit.JavascriptInterface public void hideOverlay() { stopSelf(); }
        @android.webkit.JavascriptInterface public void openApp() {
            Intent intent = new Intent(OverlayService.this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
            stopSelf();
        }
        @android.webkit.JavascriptInterface public void writeSharedState(String json) {
            getSharedPreferences("sic", MODE_PRIVATE).edit().putString("shared", json == null ? "" : json).apply();
        }
        @android.webkit.JavascriptInterface public String readSharedState() {
            return getSharedPreferences("sic", MODE_PRIVATE).getString("shared", "");
        }
    }
}
