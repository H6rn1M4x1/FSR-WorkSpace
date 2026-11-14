package com.fsrworkspace.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Bridge JS para la detección automática de pagos vía notificaciones (ver
 * PaymentListenerService). Expone: estado del permiso especial de "Acceso a notificaciones",
 * un atajo para abrir esos ajustes, la lista de apps instaladas (para que el usuario elija
 * cuáles monitorear, en vez de que la app adivine paquetes), y el evento "paymentDetected" con
 * el texto crudo de cada notificación relevante — el parseo en sí vive del lado de JS
 * (src/lib/paymentParsing.ts), así agregar o ajustar un banco no requiere tocar nada nativo.
 */
@CapacitorPlugin(name = "PaymentListener")
public class PaymentListenerPlugin extends Plugin implements PaymentListenerBridge.Listener {

    @Override
    public void load() {
        PaymentListenerBridge.addListener(this);
    }

    @Override
    protected void handleOnDestroy() {
        PaymentListenerBridge.removeListener(this);
        super.handleOnDestroy();
    }

    @Override
    public void onPaymentNotification(String packageName, String title, String text, String bigText, long postTime) {
        JSObject data = new JSObject();
        data.put("packageName", packageName);
        data.put("title", title);
        data.put("text", text);
        data.put("bigText", bigText);
        data.put("postTime", postTime);
        notifyListeners("paymentDetected", data);
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        Context ctx = getContext();
        Set<String> enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(ctx);
        boolean systemGranted = enabledPackages.contains(ctx.getPackageName());
        SharedPreferences prefs = ctx.getSharedPreferences(PaymentListenerService.PREFS_NAME, Context.MODE_PRIVATE);
        boolean userEnabled = prefs.getBoolean(PaymentListenerService.KEY_ENABLED, false);

        JSObject ret = new JSObject();
        ret.put("systemGranted", systemGranted);
        ret.put("enabled", systemGranted && userEnabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", false);
        SharedPreferences prefs = getContext().getSharedPreferences(PaymentListenerService.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(PaymentListenerService.KEY_ENABLED, Boolean.TRUE.equals(enabled)).apply();
        call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getMonitoredPackages(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PaymentListenerService.PREFS_NAME, Context.MODE_PRIVATE);
        Set<String> monitored = prefs.getStringSet(PaymentListenerService.KEY_MONITORED_PACKAGES, new HashSet<String>());

        JSArray arr = new JSArray();
        if (monitored != null) {
            for (String pkg : monitored) arr.put(pkg);
        }
        JSObject ret = new JSObject();
        ret.put("packages", arr);
        call.resolve(ret);
    }

    @PluginMethod
    public void setMonitoredPackages(PluginCall call) {
        JSArray arr = call.getArray("packages");
        Set<String> set = new HashSet<>();
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                try {
                    set.add(arr.getString(i));
                } catch (Exception ignored) {}
            }
        }
        SharedPreferences prefs = getContext().getSharedPreferences(PaymentListenerService.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putStringSet(PaymentListenerService.KEY_MONITORED_PACKAGES, set).apply();
        call.resolve();
    }

    @PluginMethod
    public void listInstalledApps(PluginCall call) {
        Context ctx = getContext();
        PackageManager pm = ctx.getPackageManager();
        Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> resolveInfos = pm.queryIntentActivities(mainIntent, 0);

        JSArray apps = new JSArray();
        Set<String> seen = new HashSet<>();
        for (ResolveInfo info : resolveInfos) {
            if (info.activityInfo == null) continue;
            String pkg = info.activityInfo.packageName;
            if (pkg == null || seen.contains(pkg) || pkg.equals(ctx.getPackageName())) continue;
            seen.add(pkg);

            JSObject app = new JSObject();
            app.put("packageName", pkg);
            app.put("label", info.loadLabel(pm).toString());
            apps.put(app);
        }
        JSObject ret = new JSObject();
        ret.put("apps", apps);
        call.resolve(ret);
    }
}
