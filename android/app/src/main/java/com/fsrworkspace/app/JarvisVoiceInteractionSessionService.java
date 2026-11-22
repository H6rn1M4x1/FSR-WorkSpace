package com.fsrworkspace.app;

import android.os.Bundle;
import android.service.voice.VoiceInteractionSession;
import android.service.voice.VoiceInteractionSessionService;

/**
 * El sistema crea una instancia nueva de JarvisVoiceInteractionSession cada vez que se invoca el
 * gesto de asistente con Jarvis configurado como predeterminado.
 */
public class JarvisVoiceInteractionSessionService extends VoiceInteractionSessionService {
    @Override
    public VoiceInteractionSession onNewSession(Bundle args) {
        return new JarvisVoiceInteractionSession(this);
    }
}
