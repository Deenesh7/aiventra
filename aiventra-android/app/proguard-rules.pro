# Keep Moshi-generated adapters
-keep class com.aiventra.app.data.model.** { *; }
-keep @com.squareup.moshi.JsonClass class * { *; }
-keepclassmembers class * {
    @com.squareup.moshi.Json *;
}

# Retrofit
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepattributes AnnotationDefault

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Hilt
-keep class * extends dagger.hilt.android.HiltAndroidApp
