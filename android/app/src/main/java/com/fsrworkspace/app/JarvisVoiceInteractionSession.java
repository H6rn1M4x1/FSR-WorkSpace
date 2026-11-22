package com.fsrworkspace.app;

import android.Manifest;
import android.animation.ValueAnimator;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.SoundPool;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.service.voice.VoiceInteractionSession;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Locale;
import java.util.Set;

/**
 * La sesión real que Android muestra flotando sobre cualquier app cuando se invoca el gesto de
 * asistente (con Jarvis configurado como predeterminado). El contenido es un WebView (tarjeta
 * flotante anclada abajo pero sin pegarse al borde, con sombra, bordes redondeados en las 4
 * puntas, fondo semitransparente, expandible tocando o arrastrando el encabezado) para poder
 * reusar el mismo lenguaje visual que el resto de la app (tipografía, color de acento, el logo
 * animado de la marca, el estilo de burbujas de los mensajes internos) sin reimplementar esos
 * estilos en vistas nativas. Escucha en loop continuo con SpeechRecognizer (la ventana de una
 * sesión de asistente tiene permiso especial para usar el micrófono aunque otra app esté en
 * primer plano) — nunca hace falta tocar nada para que arranque o siga escuchando entre turnos —
 * manda el texto reconocido al mismo endpoint de Gemini que ya usa "Viernes" en Facultad (con
 * búsqueda web habilitada), lee la respuesta con TextToSpeech (prefiriendo, si el equipo tiene
 * una instalada, una voz masculina en español de mejor calidad) y retoma la escucha sola apenas
 * termina de hablar. Un sonido corto marca cuando empieza a escuchar y una vibración breve
 * confirma cuando te activás y cuando termina de entender lo que dijiste.
 *
 * v1: todavía NO puede agendar turnos/pagos/tareas directamente en la cuenta del usuario — eso
 * necesita acceso autenticado a los datos de la app desde un proceso del sistema, fuera del
 * WebView, y queda para una próxima vuelta (el system prompt se lo avisa al usuario en vez de
 * inventar que lo hizo). Por ahora responde preguntas generales y busca en internet.
 */
public class JarvisVoiceInteractionSession extends VoiceInteractionSession {

    private static final String GEMINI_CHAT_URL = "https://fsrworkspace.netlify.app/api/gemini/chat";
    private static final String SYSTEM_INSTRUCTION =
        "Sos JARVIS, el asistente de voz personal de la app FSR Workspace. Respondé siempre en " +
        "español, de forma breve y natural (1 a 3 oraciones), apta para leerse en voz alta. Si el " +
        "usuario te pide agendar, crear o anotar algo (un turno, un pago, una tarea, un " +
        "recordatorio), avisale con amabilidad que esa función todavía se está terminando de " +
        "conectar y que por ahora puede cargarlo desde la app. Para cualquier otra pregunta, " +
        "respondé normalmente con la información que tengas o la que encuentres buscando.";

    // Mismas claves que src/lib/storage.ts (AestheticStorageService) — se espejan ahí a
    // @capacitor/preferences (archivo "CapacitorStorage") para que este proceso nativo, fuera del
    // WebView principal, pueda leer el color de acento y el tema real que eligió el usuario.
    private static final String PREFS_FILE = "CapacitorStorage";
    private static final String PREF_THEME_COLOR = "theme_color";
    private static final String PREF_DARK_MODE = "dark_mode";
    private static final String DEFAULT_ACCENT = "#71717a";

    private static final float SHEET_WIDTH_RATIO = 0.92f;
    private static final float SHEET_COMPACT_HEIGHT_RATIO = 0.44f;
    private static final float SHEET_EXPANDED_HEIGHT_RATIO = 0.82f;
    // Margen transparente alrededor de la tarjeta visible (mismo valor que el padding del <body>
    // en el HTML de abajo, en css px ≈ dp a escala 1): separa la tarjeta del borde de la pantalla
    // (ventana flotante, no pegada — se ven las 4 puntas redondeadas) y además le da lugar a la
    // sombra para que no se recorte contra el borde del WebView.
    private static final int SHEET_BLEED_DP = 20;

    private static final String OVERLAY_HTML = """
        <!doctype html>
        <html>
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
        <style>
          :root {
            --accent: #71717a;
            --on-accent: #ffffff;
            --card-bg: rgba(13,13,13,0.88);
            --bubble-other-bg: #27272a;
            --text-primary: #ffffff;
            --text-secondary: #a1a1aa;
          }
          html, body {
            margin: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            overflow: hidden;
            font-family: -apple-system, Roboto, "Segoe UI", sans-serif;
          }
          body {
            box-sizing: border-box;
            padding: 20px;
          }
          .sheet {
            box-sizing: border-box;
            width: 100%;
            height: 100%;
            background: var(--card-bg);
            border-radius: 24px;
            display: flex;
            flex-direction: column;
            color: var(--text-primary);
            overflow: hidden;
            box-shadow: 0 14px 44px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.35);
            animation: sheet-in 0.32s cubic-bezier(0.16,1,0.3,1) both;
          }
          @keyframes sheet-in {
            0% { opacity: 0; transform: translateY(28px) scale(0.97); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .grab {
            flex-shrink: 0;
            cursor: pointer;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
          }
          .handle {
            width: 36px;
            height: 4px;
            border-radius: 2px;
            background: var(--text-secondary);
            opacity: 0.5;
            margin: 9px auto 2px;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 18px 4px;
          }
          .title {
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.16em;
            color: var(--accent);
            display: flex;
            align-items: center;
            gap: 7px;
          }
          .title svg { width: 14px; height: 14px; }
          .title svg rect { fill: var(--accent); }
          .chevron {
            width: 16px;
            height: 16px;
            color: var(--text-secondary);
            transition: transform 0.2s ease;
          }
          .sheet.expanded .chevron { transform: rotate(180deg); }
          .status {
            flex-shrink: 0;
            margin-top: 2px;
            padding: 0 18px;
            font-size: 11.5px;
            color: var(--text-secondary);
            min-height: 14px;
            transition: opacity 0.15s ease;
          }
          .logo-wrap {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px 0 2px;
          }
          .logo-wrap svg { width: 52px; height: 52px; }
          .logo-sq {
            fill: var(--accent);
            transform-box: fill-box;
            transform-origin: center;
            opacity: 0;
          }
          .logo-sq.sq1 { animation: logo-enter 0.45s cubic-bezier(0.34,1.56,0.64,1) 0s both, jarvis-pulse 1.35s ease-in-out 0.45s infinite; }
          .logo-sq.sq2 { animation: logo-enter 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.12s both, jarvis-pulse 1.35s ease-in-out 0.57s infinite; }
          .logo-sq.sq3 { animation: logo-enter 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.24s both, jarvis-pulse 1.35s ease-in-out 0.69s infinite; }
          @keyframes logo-enter {
            0% { transform: scale(0.4); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes jarvis-pulse {
            0%, 100% { transform: scale(0.75); opacity: 0.35; }
            50% { transform: scale(1); opacity: 1; }
          }
          .thread {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 6px 16px 4px;
          }
          .empty {
            margin: auto;
            font-size: 12px;
            color: var(--text-secondary);
            text-align: center;
          }
          .row { display: flex; }
          .row.user { justify-content: flex-end; }
          .row.jarvis { justify-content: flex-start; }
          .bubble {
            max-width: 78%;
            padding: 7px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
            line-height: 1.35;
            animation: bubble-in 0.25s cubic-bezier(0.16,1,0.3,1) both;
          }
          .bubble.user {
            background: var(--accent);
            color: var(--on-accent);
            border-bottom-right-radius: 6px;
          }
          .bubble.jarvis {
            background: var(--bubble-other-bg);
            color: var(--text-primary);
            border-bottom-left-radius: 6px;
          }
          .bubble .time {
            font-size: 9px;
            opacity: 0.8;
            margin-top: 3px;
          }
          @keyframes bubble-in {
            0% { opacity: 0; transform: translateY(14px) scale(0.96); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .partial {
            flex-shrink: 0;
            min-height: 16px;
            padding: 0 18px 10px;
            font-size: 11px;
            font-style: italic;
            color: var(--text-secondary);
          }
        </style>
        </head>
        <body>
          <div class="sheet" id="sheet">
            <div class="grab" id="grab">
              <div class="handle"></div>
              <div class="header">
                <div class="title">
                  <svg viewBox="0 0 256 256"><rect x="44" y="44" width="54" height="54" rx="12"/><rect x="82" y="82" width="54" height="54" rx="12"/><rect x="120" y="120" width="54" height="54" rx="12"/></svg>
                  <span>JARVIS</span>
                </div>
                <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              </div>
            </div>
            <div class="status" id="status">Preparando...</div>
            <div class="logo-wrap">
              <svg viewBox="0 0 256 256">
                <rect class="logo-sq sq1" x="44" y="44" width="76" height="76" rx="16"/>
                <rect class="logo-sq sq2" x="90" y="90" width="76" height="76" rx="16"/>
                <rect class="logo-sq sq3" x="136" y="136" width="76" height="76" rx="16"/>
              </svg>
            </div>
            <div class="thread" id="thread">
              <div class="empty" id="empty">Decime en qué te ayudo...</div>
            </div>
            <div class="partial" id="partial"></div>
          </div>
        <script>
        (function () {
          var sheet = document.getElementById('sheet');
          var statusEl = document.getElementById('status');
          var grab = document.getElementById('grab');

          // Expandir/contraer: tocar es un toggle, arrastrar sigue el dedo en vivo — el alto
          // real lo decide y lo anima Java (ver JarvisJsBridge/applyExpandedState), acá solo se
          // manda la posición del dedo para que el redimensionado nativo la siga 1:1.
          var dragging = false;
          var moved = false;
          var startY = 0;
          var pendingDelta = null;
          var rafScheduled = false;
          var DRAG_THRESHOLD = 6;

          function scheduleDragUpdate() {
            if (rafScheduled) return;
            rafScheduled = true;
            requestAnimationFrame(function () {
              rafScheduled = false;
              if (pendingDelta !== null && window.JarvisBridge && window.JarvisBridge.onDragMove) {
                window.JarvisBridge.onDragMove(pendingDelta);
                pendingDelta = null;
              }
            });
          }

          grab.addEventListener('pointerdown', function (e) {
            dragging = true;
            moved = false;
            startY = e.clientY;
            try { grab.setPointerCapture(e.pointerId); } catch (err) {}
            if (window.JarvisBridge && window.JarvisBridge.onDragStart) {
              window.JarvisBridge.onDragStart();
            }
          });
          grab.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var delta = startY - e.clientY;
            if (Math.abs(delta) > DRAG_THRESHOLD) moved = true;
            pendingDelta = delta;
            scheduleDragUpdate();
          });
          function endDrag() {
            if (!dragging) return;
            dragging = false;
            if (window.JarvisBridge && window.JarvisBridge.onDragEnd) {
              window.JarvisBridge.onDragEnd(moved);
            }
          }
          grab.addEventListener('pointerup', endDrag);
          grab.addEventListener('pointercancel', endDrag);

          function addMessage(role, text) {
            if (!text) return;
            var empty = document.getElementById('empty');
            if (empty) empty.style.display = 'none';
            document.getElementById('partial').textContent = '';
            var thread = document.getElementById('thread');
            var row = document.createElement('div');
            row.className = 'row ' + role;
            var bubble = document.createElement('div');
            bubble.className = 'bubble ' + role;
            var p = document.createElement('div');
            p.textContent = text;
            bubble.appendChild(p);
            var time = document.createElement('div');
            time.className = 'time';
            time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            bubble.appendChild(time);
            row.appendChild(bubble);
            thread.appendChild(row);
            thread.scrollTop = thread.scrollHeight;
          }

          var statusFadeTimer = null;
          function setStatusText(text) {
            statusEl.style.opacity = '0';
            clearTimeout(statusFadeTimer);
            statusFadeTimer = setTimeout(function () {
              statusEl.textContent = text || '';
              statusEl.style.opacity = '1';
            }, 150);
          }

          window.JarvisUI = {
            init: function (accentColor, isDark) {
              var root = document.documentElement.style;
              root.setProperty('--accent', accentColor || '#71717a');
              root.setProperty('--card-bg', isDark ? 'rgba(13,13,13,0.88)' : 'rgba(244,244,245,0.92)');
              root.setProperty('--text-primary', isDark ? '#ffffff' : '#18181b');
              root.setProperty('--text-secondary', isDark ? '#a1a1aa' : '#71717a');
              root.setProperty('--on-accent', isDark ? '#ffffff' : '#000000');
              root.setProperty('--bubble-other-bg', isDark ? '#27272a' : '#f4f4f5');
            },
            setStatus: function (text) { setStatusText(text); },
            setPartialTranscript: function (text) { document.getElementById('partial').textContent = text || ''; },
            addUserMessage: function (text) { addMessage('user', text); },
            addJarvisMessage: function (text) { addMessage('jarvis', text); },
            setExpanded: function (expanded) { sheet.classList.toggle('expanded', !!expanded); }
          };
        })();
        </script>
        </body>
        </html>
        """;

    private final Context appContext;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private WebView webView;
    private boolean webViewReady = false;
    private boolean sessionActive = false;
    private boolean isExpanded = false;
    private int dragStartHeightPx = 0;

    private SpeechRecognizer speechRecognizer;
    private TextToSpeech textToSpeech;
    private boolean ttsReady = false;

    private SoundPool soundPool;
    private int listenSoundId = 0;
    private boolean listenSoundLoaded = false;

    public JarvisVoiceInteractionSession(Context context) {
        super(context);
        appContext = context.getApplicationContext();
    }

    private class JarvisJsBridge {
        // Los callbacks de un @JavascriptInterface llegan en un hilo aparte, nunca el principal,
        // por eso el post() en los tres. onDragStart/onDragMove siguen el dedo en vivo (sin
        // animación, 1:1); onDragEnd decide el estado final: si no hubo arrastre real, es un tap
        // (toggle); si lo hubo, encaja al extremo más cercano (applyExpandedState anima ahí).
        @JavascriptInterface
        public void onDragStart() {
            mainHandler.post(() -> {
                if (webView == null) return;
                FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) webView.getLayoutParams();
                dragStartHeightPx = params.height;
            });
        }

        @JavascriptInterface
        public void onDragMove(float deltaCssPx) {
            mainHandler.post(() -> {
                if (webView == null) return;
                DisplayMetrics dm = appContext.getResources().getDisplayMetrics();
                int deltaPx = Math.round(deltaCssPx * dm.density);
                int newHeight = clamp(dragStartHeightPx + deltaPx, minContainerHeightPx(dm), maxContainerHeightPx(dm));
                FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) webView.getLayoutParams();
                params.height = newHeight;
                webView.setLayoutParams(params);
            });
        }

        @JavascriptInterface
        public void onDragEnd(boolean wasDrag) {
            mainHandler.post(() -> {
                if (!wasDrag) {
                    applyExpandedState(!isExpanded);
                } else {
                    snapToNearest();
                }
            });
        }
    }

    @Override
    public View onCreateContentView() {
        DisplayMetrics dm = appContext.getResources().getDisplayMetrics();
        int width = Math.round(dm.widthPixels * SHEET_WIDTH_RATIO) + 2 * bleedPx(dm);
        int height = minContainerHeightPx(dm);

        webView = new WebView(appContext);
        webView.setBackgroundColor(Color.TRANSPARENT);
        webView.getSettings().setJavaScriptEnabled(true);
        // Solo carga el HTML de acá abajo (nunca navega a una URL externa), por eso exponer este
        // bridge no abre una superficie de ataque: no hay contenido no confiable corriendo en el
        // mismo WebView.
        webView.addJavascriptInterface(new JarvisJsBridge(), "JarvisBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                webViewReady = true;
                applyTheme();
            }
        });
        // Toda la tarjeta (tamaño, bordes redondeados, sombra, fondo semitransparente,
        // tipografía, el logo animado, el chat) vive en este HTML embebido — así reusa el mismo
        // lenguaje visual que la web/app en vez de reimplementarlo en vistas nativas.
        // loadDataWithBaseURL(null, ...) alcanza porque la página es autocontenida (sin red ni
        // recursos externos).
        webView.loadDataWithBaseURL(null, OVERLAY_HTML, "text/html", "UTF-8", null);
        // Mientras falte el permiso de micrófono, tocar la tarjeta abre la app para concederlo
        // (ver startListening/requestMicPermissionFromApp) — una sesión de asistente no puede
        // mostrar el diálogo de permiso ella misma.
        webView.setOnClickListener(v -> {
            if (!hasMicPermission()) requestMicPermissionFromApp();
        });

        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(width, height);
        webParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        // Sin bottomMargin: el padding del <body> (SHEET_BLEED_DP) ya separa la tarjeta visible
        // del borde de la pantalla — ventana flotante, no pegada, con las 4 puntas redondeadas
        // visibles y lugar para que la sombra no se recorte.

        FrameLayout root = new FrameLayout(appContext);
        root.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(webView, webParams);
        return root;
    }

    @Override
    public void onShow(Bundle args, int showFlags) {
        super.onShow(args, showFlags);
        sessionActive = true;
        vibrate(30);
        if (textToSpeech == null) {
            textToSpeech = new TextToSpeech(appContext, status -> {
                ttsReady = status == TextToSpeech.SUCCESS;
                if (!ttsReady) return;
                textToSpeech.setLanguage(new Locale("es", "AR"));
                selectBestSpanishVoice();
                // Apenas termina de hablar la respuesta, retoma la escucha sola — así la
                // conversación sigue sin que el usuario tenga que tocar nada entre turnos.
                textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String utteranceId) {}
                    @Override public void onDone(String utteranceId) {
                        if ("jarvis_response".equals(utteranceId)) {
                            mainHandler.post(() -> { if (sessionActive) startListening(); });
                        }
                    }
                    @Override public void onError(String utteranceId) {
                        if ("jarvis_response".equals(utteranceId)) {
                            mainHandler.post(() -> { if (sessionActive) startListening(); });
                        }
                    }
                });
            });
        }
        if (soundPool == null) {
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            soundPool = new SoundPool.Builder().setMaxStreams(2).setAudioAttributes(attrs).build();
            soundPool.setOnLoadCompleteListener((sp, sampleId, status) -> {
                if (status == 0) listenSoundLoaded = true;
            });
            listenSoundId = soundPool.load(appContext, R.raw.jarvis_listen, 1);
        }
        mainHandler.post(this::startListening);
    }

    @Override
    public void onHide() {
        super.onHide();
        sessionActive = false;
        if (speechRecognizer != null) {
            speechRecognizer.cancel();
        }
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
    }

    @Override
    public void onDestroy() {
        sessionActive = false;
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
            speechRecognizer = null;
        }
        if (textToSpeech != null) {
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        if (soundPool != null) {
            soundPool.release();
            soundPool = null;
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        hide();
    }

    private boolean hasMicPermission() {
        return ContextCompat.checkSelfPermission(appContext, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED;
    }

    // Entre las voces en español ya instaladas en el equipo (ninguna cuenta nueva, ningún
    // servicio pago), preferimos una masculina de la mejor calidad disponible en vez de dejar la
    // que el motor elija por default. Es "mejor esfuerzo": el API de Android no expone un campo
    // de género formal, así que se infiere del nombre de la voz — varía según el motor/fabricante
    // y puede no encontrar ninguna que matchee, en cuyo caso se deja la voz default del idioma.
    private void selectBestSpanishVoice() {
        if (textToSpeech == null) return;
        try {
            Set<Voice> voices = textToSpeech.getVoices();
            if (voices == null) return;
            Voice best = null;
            for (Voice v : voices) {
                Locale locale = v.getLocale();
                if (locale == null || !"spa".equals(locale.getISO3Language())) continue;
                if (v.getFeatures() != null && v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                if (best == null || isBetterVoice(v, best)) {
                    best = v;
                }
            }
            if (best != null) {
                textToSpeech.setVoice(best);
            }
        } catch (Exception ignored) {
            // Si el motor no expone bien getVoices()/getName(), seguimos con la voz default del
            // Locale — no es crítico para que Jarvis funcione.
        }
    }

    private boolean isBetterVoice(Voice candidate, Voice current) {
        boolean candidateMale = looksMale(candidate);
        boolean currentMale = looksMale(current);
        if (candidateMale != currentMale) return candidateMale;
        return candidate.getQuality() > current.getQuality();
    }

    private boolean looksMale(Voice v) {
        String name = v.getName() != null ? v.getName().toLowerCase(Locale.ROOT) : "";
        return name.contains("male") && !name.contains("female");
    }

    private int bleedPx(DisplayMetrics dm) {
        return Math.round(SHEET_BLEED_DP * dm.density);
    }

    private int minContainerHeightPx(DisplayMetrics dm) {
        return Math.round(dm.heightPixels * SHEET_COMPACT_HEIGHT_RATIO) + 2 * bleedPx(dm);
    }

    private int maxContainerHeightPx(DisplayMetrics dm) {
        return Math.round(dm.heightPixels * SHEET_EXPANDED_HEIGHT_RATIO) + 2 * bleedPx(dm);
    }

    private int clamp(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }

    // Encaja al extremo (compacto/expandido) más cercano al alto actual — se usa al soltar el
    // dedo después de un arrastre real (ver JarvisJsBridge.onDragEnd).
    private void snapToNearest() {
        if (webView == null) return;
        DisplayMetrics dm = appContext.getResources().getDisplayMetrics();
        FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) webView.getLayoutParams();
        int midpoint = (minContainerHeightPx(dm) + maxContainerHeightPx(dm)) / 2;
        applyExpandedState(params.height > midpoint);
    }

    // Anima el alto nativo del WebView entre el tamaño compacto y el expandido (toque = toggle,
    // o el encaje final de un arrastre) y le avisa al HTML para que rote la flecha.
    private void applyExpandedState(boolean expanded) {
        if (webView == null) return;
        isExpanded = expanded;
        DisplayMetrics dm = appContext.getResources().getDisplayMetrics();
        final FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) webView.getLayoutParams();
        final int from = params.height;
        final int to = expanded ? maxContainerHeightPx(dm) : minContainerHeightPx(dm);
        ValueAnimator animator = ValueAnimator.ofInt(from, to);
        animator.setDuration(220);
        animator.setInterpolator(new DecelerateInterpolator());
        animator.addUpdateListener(a -> {
            params.height = (int) a.getAnimatedValue();
            webView.setLayoutParams(params);
        });
        animator.start();
        runJs("window.JarvisUI && window.JarvisUI.setExpanded(" + expanded + ")");
    }

    private void applyTheme() {
        if (!webViewReady) return;
        SharedPreferences prefs = appContext.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
        String accent = prefs.getString(PREF_THEME_COLOR, DEFAULT_ACCENT);
        boolean isDark = !"false".equals(prefs.getString(PREF_DARK_MODE, "true"));
        runJs("window.JarvisUI && window.JarvisUI.init(" + JSONObject.quote(accent) + "," + isDark + ")");
    }

    private void runJs(String script) {
        mainHandler.post(() -> {
            if (webView != null) webView.evaluateJavascript(script, null);
        });
    }

    private void setStatus(String text) {
        runJs("window.JarvisUI && window.JarvisUI.setStatus(" + JSONObject.quote(text != null ? text : "") + ")");
    }

    private void setPartialTranscript(String text) {
        runJs("window.JarvisUI && window.JarvisUI.setPartialTranscript(" + JSONObject.quote(text != null ? text : "") + ")");
    }

    private void addUserMessage(String text) {
        runJs("window.JarvisUI && window.JarvisUI.addUserMessage(" + JSONObject.quote(text != null ? text : "") + ")");
    }

    private void addJarvisMessage(String text) {
        runJs("window.JarvisUI && window.JarvisUI.addJarvisMessage(" + JSONObject.quote(text != null ? text : "") + ")");
    }

    // Vibración breve (no crítica: si el equipo no tiene motor de vibración o algo falla, se
    // ignora en silencio) para confirmar, sin que haga falta mirar la pantalla, que Jarvis se
    // activó o que terminó de entender lo que dijiste.
    private void vibrate(long ms) {
        try {
            Vibrator vibrator;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) appContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = vm != null ? vm.getDefaultVibrator() : null;
            } else {
                vibrator = (Vibrator) appContext.getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (vibrator != null && vibrator.hasVibrator()) {
                vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
            }
        } catch (Exception ignored) {
        }
    }

    // Jarvis escucha en loop continuo: arranca solo al abrirse y, entre turnos (después de un
    // error de reconocimiento, un silencio sin resultados, o de terminar de hablar su propia
    // respuesta), vuelve a escuchar sin que el usuario tenga que tocar nada.
    private void startListening() {
        if (!sessionActive) return;

        if (!hasMicPermission()) {
            setStatus("Pidiendo permiso de micrófono...");
            requestMicPermissionFromApp();
            return;
        }

        if (!SpeechRecognizer.isRecognitionAvailable(appContext)) {
            setStatus("Este dispositivo no tiene reconocimiento de voz disponible.");
            return;
        }

        if (speechRecognizer != null) {
            speechRecognizer.destroy();
        }
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(appContext);
        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                setStatus("Escuchando...");
                if (listenSoundLoaded && soundPool != null) {
                    soundPool.play(listenSoundId, 0.5f, 0.5f, 0, 0, 1f);
                }
            }

            @Override
            public void onBeginningOfSpeech() {
            }

            @Override
            public void onRmsChanged(float rmsdB) {
            }

            @Override
            public void onBufferReceived(byte[] buffer) {
            }

            @Override
            public void onEndOfSpeech() {
                setStatus("Pensando...");
            }

            @Override
            public void onError(int error) {
                if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                    setStatus("Falta el permiso de micrófono.");
                    return;
                }
                // Un silencio/timeout no es un error real para el usuario acá — Jarvis solo
                // vuelve a escuchar, sin pedirle que toque nada.
                mainHandler.postDelayed(() -> { if (sessionActive) startListening(); }, 400);
            }

            @Override
            public void onResults(Bundle results) {
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty()) {
                    String heard = matches.get(0);
                    vibrate(20);
                    addUserMessage(heard);
                    askJarvis(heard);
                } else {
                    mainHandler.postDelayed(() -> { if (sessionActive) startListening(); }, 400);
                }
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty()) {
                    setPartialTranscript(matches.get(0));
                }
            }

            @Override
            public void onEvent(int eventType, Bundle params) {
            }
        });

        Intent recognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-AR");
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        setStatus("Escuchando...");
        setPartialTranscript("");
        speechRecognizer.startListening(recognizerIntent);
    }

    // Una sesión de asistente no es una Activity y no puede pedir permisos en tiempo de ejecución
    // ella misma — startAssistantActivity() es el mecanismo oficial para que una sesión delegue en
    // una Activity normal (acá, MainActivity, que sí puede pedirlo).
    private void requestMicPermissionFromApp() {
        Intent intent = new Intent(appContext, MainActivity.class);
        intent.putExtra("jarvis_request_mic_permission", true);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startAssistantActivity(intent);
        hide();
    }

    private void askJarvis(String heard) {
        setStatus("Pensando...");
        new Thread(() -> {
            String answer;
            try {
                answer = callGeminiChat(heard);
            } catch (Exception e) {
                answer = "No pude conectarme para responderte. Probá de nuevo en un rato.";
            }
            addJarvisMessage(answer);
            setStatus("Respondiendo...");
            speak(answer);
        }).start();
    }

    private String callGeminiChat(String message) throws Exception {
        JSONObject body = new JSONObject();
        body.put("message", message);
        body.put("systemInstruction", SYSTEM_INSTRUCTION);
        body.put("enableSearch", true);

        URL url = new URL(GEMINI_CHAT_URL);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(25000);
            conn.setDoOutput(true);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }

            int status = conn.getResponseCode();
            InputStream is = (status >= 200 && status < 300) ? conn.getInputStream() : conn.getErrorStream();
            String raw = readStream(is);
            JSONObject json = new JSONObject(raw);
            if (status >= 200 && status < 300) {
                return json.optString("text", "No obtuve respuesta.");
            }
            // El servidor ya devuelve un mensaje legible y hablable (ver isQuotaExhaustedError/
            // friendlyErrorMessage en server.ts y netlify/functions/gemini-chat.ts) — se pasa tal
            // cual, sin prefijo técnico, porque esto también se lee en voz alta.
            return json.optString("error", "No pude comunicarme con el servidor. Probá de nuevo en un rato.");
        } finally {
            conn.disconnect();
        }
    }

    private String readStream(InputStream is) throws Exception {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[1024];
        int n;
        while ((n = is.read(buf)) != -1) {
            bos.write(buf, 0, n);
        }
        return bos.toString("UTF-8");
    }

    private void speak(String text) {
        mainHandler.post(() -> {
            if (textToSpeech != null && ttsReady && text != null && !text.isEmpty()) {
                textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "jarvis_response");
            } else if (sessionActive) {
                // Sin TTS disponible, igual hay que retomar la escucha solo.
                startListening();
            }
        });
    }
}
