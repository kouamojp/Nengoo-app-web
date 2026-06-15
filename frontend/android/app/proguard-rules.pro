# Capacitor bridge — ne jamais obfusquer
-keep class com.getcapacitor.** { *; }
-keep class com.nengoo.cameroon.** { *; }
-dontwarn com.getcapacitor.**

# WebView JS interface (Capacitor en a besoin)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase / Google Services
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# OkHttp (réseau)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Facebook SDK (référencé par capacitor-firebase/authentication mais non bundlé)
-dontwarn com.facebook.CallbackManager$Factory
-dontwarn com.facebook.CallbackManager
-dontwarn com.facebook.FacebookCallback
-dontwarn com.facebook.login.LoginManager
-dontwarn com.facebook.login.widget.LoginButton

# Préserver les traces de pile pour le débogage en production
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
