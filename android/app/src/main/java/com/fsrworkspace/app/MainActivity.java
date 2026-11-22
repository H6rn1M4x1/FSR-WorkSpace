package com.fsrworkspace.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int JARVIS_MIC_PERMISSION_REQUEST = 9301;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PaymentListenerPlugin.class);
        registerPlugin(JarvisAssistantPlugin.class);
        super.onCreate(savedInstanceState);

        // Edge-to-edge: el fondo real de la app se extiende detrás de la barra de estado y la de
        // gestos (en vez del scrim gris que dibuja Android por defecto ahí) en versiones de
        // Android anteriores a la 15, donde esto no viene forzado por el sistema.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        handleJarvisMicPermissionIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleJarvisMicPermissionIntent(intent);
    }

    // JarvisVoiceInteractionSession no es una Activity y no puede pedir permisos en tiempo de
    // ejecución ella misma — cuando el usuario toca el micrófono sin haber otorgado el permiso
    // todavía, la sesión abre esta Activity con este extra (ver
    // JarvisVoiceInteractionSession.requestMicPermissionFromApp()) para que sea la app, que sí
    // puede, la que lo pida.
    private void handleJarvisMicPermissionIntent(Intent intent) {
        if (intent == null || !intent.getBooleanExtra("jarvis_request_mic_permission", false)) return;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                new String[] { Manifest.permission.RECORD_AUDIO },
                JARVIS_MIC_PERMISSION_REQUEST
            );
        }
    }
}
