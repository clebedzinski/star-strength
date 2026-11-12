# WebView JavaScript interface and the asset loader must survive R8.
-keep class app.sic.strength.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class androidx.webkit.** { *; }
-keep class android.webkit.** { *; }
-dontwarn androidx.webkit.**
