package com.fsrworkspace.app;

import android.content.Intent;
import android.speech.RecognitionService;
import android.speech.SpeechRecognizer;

/**
 * Stub obligatorio: Android exige declarar un recognitionService válido en el XML del
 * VoiceInteractionService (ver res/xml/jarvis_interaction_service.xml) para aceptar esta app
 * como asistente predeterminado, pero Jarvis no lo usa para transcribir — eso lo hace
 * JarvisVoiceInteractionSession directamente con android.speech.SpeechRecognizer, porque la
 * ventana de la sesión de asistente tiene permiso especial para tomar el micrófono aunque otra
 * app esté en primer plano. Esta clase nunca debería recibir una llamada real en el flujo actual.
 */
public class JarvisRecognitionService extends RecognitionService {
    @Override
    protected void onStartListening(Intent recognizerIntent, Callback listener) {
        try {
            listener.error(SpeechRecognizer.ERROR_CLIENT);
        } catch (Exception ignored) {
        }
    }

    @Override
    protected void onCancel(Callback listener) {
    }

    @Override
    protected void onStopListening(Callback listener) {
    }
}
