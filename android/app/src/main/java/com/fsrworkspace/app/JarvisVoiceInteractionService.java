package com.fsrworkspace.app;

import android.service.voice.VoiceInteractionService;

/**
 * Habilita que esta app aparezca en Ajustes > Apps > Apps predeterminadas > App de asistente
 * digital. No hace falta sobreescribir nada acá: Jarvis no usa "Okey Jarvis" en segundo plano
 * (eso exigiría un servicio en primer plano permanente, con notificación fija, y un motor de
 * palabra de activación aparte — se dejó fuera de esta primera versión a pedido del usuario) —
 * por ahora se invoca con el gesto de asistente del propio Android (deslizar desde la esquina
 * inferior en navegación por gestos, o mantener presionado Home en navegación de 3 botones).
 * Toda la lógica real vive en JarvisVoiceInteractionSession, que es lo que el sistema muestra
 * flotando sobre cualquier app cuando se invoca ese gesto.
 */
public class JarvisVoiceInteractionService extends VoiceInteractionService {
}
