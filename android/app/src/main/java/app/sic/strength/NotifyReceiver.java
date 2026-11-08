package app.sic.strength;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Shows a workout reminder. Delivery depends on the OS and was not hardware-tested. */
public class NotifyReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel channel = new NotificationChannel("sic-pump", context.getString(R.string.pump_channel), NotificationManager.IMPORTANCE_DEFAULT);
        nm.createNotificationChannel(channel);
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        Notification note = new Notification.Builder(context, "sic-pump")
                .setContentTitle(title == null ? "SIC" : title)
                .setContentText(body == null ? "" : body)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .build();
        nm.notify((int) (System.currentTimeMillis() % 100000), note);
    }
}
