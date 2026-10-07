# kotlinx.serialization: os serializers das classes do pacote do guia.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class br.com.renova.guia.**$$serializer { *; }
-keepclassmembers class br.com.renova.guia.** { *** Companion; }
-keepclasseswithmembers class br.com.renova.guia.** { kotlinx.serialization.KSerializer serializer(...); }
