package com.fsrworkspace.app;

import android.app.Notification;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import java.util.HashSet;
import java.util.Set;

/**
 * Escucha TODAS las notificaciones del sistema — requiere el permiso especial "Acceso a
 * notificaciones" (ACTION_NOTIFICATION_LISTENER_SETTINGS), que el usuario otorga a mano desde
 * Ajustes, no hay diálogo de permiso estándar para esto. Para no procesar notificaciones ajenas
 * a esta función, solo reenvía las que vienen de un paquete que está en la lista de apps
 * monitoreadas (configurada desde la propia app, ver PaymentListenerPlugin) y mientras el
 * usuario tenga la detección activada.
 */
public class PaymentListenerService extends NotificationListenerService {

    public static final String PREFS_NAME = "payment_listener_prefs";
    public static final String KEY_MONITORED_PACKAGES = "monitored_packages";
    public static final String KEY_ENABLED = "listener_enabled";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_ENABLED, false)) return;

        String packageName = sbn.getPackageName();
        Set<String> monitored = prefs.getStringSet(KEY_MONITORED_PACKAGES, new HashSet<String>());
        if (monitored == null || !monitored.contains(packageName)) return;

        Bundle extras = sbn.getNotification().extras;
        if (extras == null) return;

        CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        PaymentListenerBridge.dispatch(
            packageName,
            title != null ? title.toString() : "",
            text != null ? text.toString() : "",
            bigText != null ? bigText.toString() : "",
            sbn.getPostTime()
        );
    }
}
