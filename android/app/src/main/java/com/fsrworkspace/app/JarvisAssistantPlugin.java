package com.fsrworkspace.app;

import android.Manifest;
import android.app.Activity;
import android.app.role.RoleManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.annotation.RequiresApi;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Bridge JS para que el usuario pueda elegir esta app como "App de asistente digital"
 * predeterminada de Android (ver JarvisVoiceInteractionService/Session) desde los Ajustes de la
 * propia app, en vez de tener que buscarlo a mano en Ajustes del sistema. El rol de asistente
 * (RoleManager.ROLE_ASSISTANT) solo existe desde Android 10 (API 29) — en versiones anteriores,
 * o si el fabricante no lo soporta, se abre la pantalla genérica de Ajustes de asistente de voz,
 * donde el usuario lo elige a mano.
 */
@CapacitorPlugin(
    name = "JarvisAssistant",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
    }
)
public class JarvisAssistantPlugin extends Plugin {

    @PluginMethod
    public void getStatus(PluginCall call) {
        boolean roleSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;
        JSObject ret = new JSObject();
        ret.put("roleApiSupported", roleSupported);
        ret.put("isDefaultAssistant", roleSupported && isAssistantRoleHeld());
        ret.put("micPermissionGranted", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @RequiresApi(api = Build.VERSION_CODES.Q)
    private boolean isAssistantRoleHeld() {
        try {
            RoleManager roleManager = (RoleManager) getContext().getSystemService(Context.ROLE_SERVICE);
            return roleManager != null
                && roleManager.isRoleAvailable(RoleManager.ROLE_ASSISTANT)
                && roleManager.isRoleHeld(RoleManager.ROLE_ASSISTANT);
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void requestDefaultAssistant(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            RoleManager roleManager = (RoleManager) getContext().getSystemService(Context.ROLE_SERVICE);
            if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_ASSISTANT)) {
                if (roleManager.isRoleHeld(RoleManager.ROLE_ASSISTANT)) {
                    JSObject ret = new JSObject();
                    ret.put("isDefaultAssistant", true);
                    call.resolve(ret);
                    return;
                }
                Intent intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_ASSISTANT);
                startActivityForResult(call, intent, "onRoleRequestResult");
                return;
            }
        }
        // Fallback (Android < 10, o el fabricante no soporta el rol en este dispositivo): se abre
        // la pantalla genérica de Ajustes donde el usuario lo elige a mano.
        openAssistantSettings(call);
    }

    @ActivityCallback
    private void onRoleRequestResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        boolean granted = result.getResultCode() == Activity.RESULT_OK
            || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && isAssistantRoleHeld());
        JSObject ret = new JSObject();
        ret.put("isDefaultAssistant", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAssistantSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_VOICE_INPUT_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception e) {
            // Como último recurso, si ese atajo no existe en este fabricante: Ajustes general.
            Intent intent = new Intent(Settings.ACTION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void requestMicPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("microphone", call, "onMicPermissionResult");
    }

    @PermissionCallback
    private void onMicPermissionResult(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(ret);
    }
}
