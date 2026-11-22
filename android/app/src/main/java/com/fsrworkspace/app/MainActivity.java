package com.fsrworkspace.app;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PaymentListenerPlugin.class);
        super.onCreate(savedInstanceState);

        // Edge-to-edge: el fondo real de la app se extiende detrás de la barra de estado y la de
        // gestos (en vez del scrim gris que dibuja Android por defecto ahí) en versiones de
        // Android anteriores a la 15, donde esto no viene forzado por el sistema.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
    }
}
