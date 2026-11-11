package app.sic.strength;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebView;

import androidx.documentfile.provider.DocumentFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int REQ_TREE = 41;
    private static final int REQ_OPEN = 42;
    private WebView web;
    private SicBridge bridge;
    private String pendingKind = "routines";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7);
        }
        bridge = new SicBridge(this);
        web = SicWeb.create(this, bridge);
        setContentView(web);
        web.loadUrl(SicWeb.START);
    }

    void eval(String js) { SicWeb.eval(web, js); }

    void pickDirectory(String kind) {
        pendingKind = kind;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(intent, REQ_TREE);
    }

    void importXml(String kind) {
        pendingKind = kind;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(intent, REQ_OPEN);
    }

    boolean writeGrantedFile(String kind, String name, String text) throws Exception {
        String saved = getSharedPreferences("sic", MODE_PRIVATE).getString("tree_" + kind, "");
        if (saved == null || saved.isEmpty()) return false;
        DocumentFile dir = DocumentFile.fromTreeUri(this, Uri.parse(saved));
        if (dir == null || !dir.canWrite()) return false;
        DocumentFile file = dir.findFile(name);
        if (file == null) file = dir.createFile("application/xml", name);
        if (file == null) return false;
        byte[] data = text.getBytes(StandardCharsets.UTF_8);
        try (OutputStream os = getContentResolver().openOutputStream(file.getUri(), "wt")) {
            if (os == null) return false;
            os.write(data);
        }
        byte[] back;
        try (InputStream in = getContentResolver().openInputStream(file.getUri())) {
            back = readAll(in);
        }
        String round = new String(back, StandardCharsets.UTF_8);
        return text.equals(round);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            bridge.emit("folder", false, "cancelled");
            return;
        }
        Uri uri = data.getData();
        if (requestCode == REQ_TREE) {
            int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            getContentResolver().takePersistableUriPermission(uri, flags);
            getSharedPreferences("sic", MODE_PRIVATE).edit().putString("tree_" + pendingKind, uri.toString()).apply();
            bridge.emit("folder", true, pendingKind);
        } else if (requestCode == REQ_OPEN) {
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                bridge.emitImport(new String(readAll(in), StandardCharsets.UTF_8));
            } catch (Exception e) {
                bridge.emit("folder", false, "read");
            }
        }
    }

    private static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) >= 0) bos.write(buf, 0, n);
        return bos.toByteArray();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int code = event.getKeyCode();
        boolean controller = code == KeyEvent.KEYCODE_BUTTON_A || code == KeyEvent.KEYCODE_BUTTON_B
                || code == KeyEvent.KEYCODE_BUTTON_X || code == KeyEvent.KEYCODE_BUTTON_Y
                || code == KeyEvent.KEYCODE_BUTTON_L1 || code == KeyEvent.KEYCODE_BUTTON_R1
                || code == KeyEvent.KEYCODE_BUTTON_L2 || code == KeyEvent.KEYCODE_BUTTON_R2
                || code == KeyEvent.KEYCODE_BUTTON_START || code == KeyEvent.KEYCODE_BUTTON_SELECT
                || code == KeyEvent.KEYCODE_DPAD_UP || code == KeyEvent.KEYCODE_DPAD_DOWN
                || code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_DPAD_RIGHT;
        if (controller && web != null) return web.dispatchKeyEvent(event);
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        if (web != null) {
            web.evaluateJavascript("window.SICApp&&SICApp.onHardwareBack&&SICApp.onHardwareBack()", null);
            return;
        }
        super.onBackPressed();
    }
}
