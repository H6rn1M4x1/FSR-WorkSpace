package com.fsrworkspace.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.service.voice.VoiceInteractionSession;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
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

/**
 * La sesión real que Android muestra flotando sobre cualquier app cuando se invoca el gesto de
 * asistente (con Jarvis configurado como predeterminado). El contenido es un WebView chico
 * (tarjeta flotante, bordes redondeados, fondo semitransparente, ~1/3 de la pantalla) para poder
 * reusar el mismo lenguaje visual que el resto de la app (tipografía, color de acento, el "orbe"
 * animado) sin reimplementar esos estilos en vistas nativas. Escucha en loop continuo con
 * SpeechRecognizer (la ventana de una sesión de asistente tiene permiso especial para usar el
 * micrófono aunque otra app esté en primer plano) — nunca hace falta tocar nada para que arranque
 * o siga escuchando entre turnos — manda el texto reconocido al mismo endpoint de Gemini que ya
 * usa "Viernes" en Facultad (con búsqueda web habilitada), lee la respuesta con TextToSpeech y
 * retoma la escucha sola apenas termina de hablar.
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

    private static final String OVERLAY_HTML = """
        <!doctype html>
        <html>
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
        <style>
          :root {
            --accent: #71717a;
            --card-bg: rgba(13,13,13,0.88);
            --text-primary: #ffffff;
            --text-secondary: #a1a1aa;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            overflow: hidden;
            font-family: -apple-system, Roboto, "Segoe UI", sans-serif;
          }
          .card {
            box-sizing: border-box;
            width: 100%;
            height: 100%;
            background: var(--card-bg);
            border-radius: 28px;
            padding: 18px 22px 16px;
            display: flex;
            flex-direction: column;
            color: var(--text-primary);
          }
          .title {
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.16em;
            color: var(--accent);
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .title svg { width: 13px; height: 13px; }
          .status {
            margin-top: 3px;
            font-size: 11.5px;
            color: var(--text-secondary);
            min-height: 14px;
          }
          .orb-wrap {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 0;
          }
          canvas#orb {
            width: 92px;
            height: 92px;
          }
          .texts {
            overflow-y: auto;
            max-height: 42%;
          }
          .transcript {
            font-size: 14.5px;
            font-weight: 700;
            line-height: 1.3;
          }
          .response {
            margin-top: 6px;
            font-size: 12.5px;
            color: var(--text-secondary);
            line-height: 1.35;
          }
        </style>
        </head>
        <body>
          <div class="card">
            <div class="title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18 9l-4.1 1.4L12 15l-1.9-4.6L6 9l4.1-1.4L12 3z"/><circle cx="18.5" cy="17.5" r="1.4"/></svg>
              <span>JARVIS</span>
            </div>
            <div class="status" id="status">Preparando...</div>
            <div class="orb-wrap"><canvas id="orb" width="184" height="184"></canvas></div>
            <div class="texts">
              <div class="transcript" id="transcript"></div>
              <div class="response" id="response"></div>
            </div>
          </div>
        <script>
        (function () {
          var canvas = document.getElementById('orb');
          var ctx = canvas.getContext('2d');
          var W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
          var accent = '#71717a';
          var level = 0;
          var targetLevel = 0;
          var t = 0;

          function hexToRgb(hex) {
            var m = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex || '');
            return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 113, g: 113, b: 122 };
          }

          function draw() {
            t += 0.02;
            level += (targetLevel - level) * 0.15;
            ctx.clearRect(0, 0, W, H);
            var rgb = hexToRgb(accent);
            var rgbStr = rgb.r + ',' + rgb.g + ',' + rgb.b;
            var breathe = Math.sin(t) * 2;
            var r = 32 + level * 16 + breathe;
            var maxSafeRadius = Math.min(cx, cy) - 2;
            var haloR = Math.min(r * 1.55, maxSafeRadius);

            var halo = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, haloR);
            halo.addColorStop(0, 'rgba(' + rgbStr + ',' + (0.3 + level * 0.4) + ')');
            halo.addColorStop(1, 'rgba(' + rgbStr + ',0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
            ctx.fill();

            var core = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
            core.addColorStop(0, 'rgba(255,255,255,0.88)');
            core.addColorStop(0.38, 'rgba(' + rgbStr + ',0.92)');
            core.addColorStop(1, 'rgba(' + rgbStr + ',0.38)');
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.globalAlpha = 0.3 + level * 0.55;
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 1;
            var crackleCount = 5;
            for (var i = 0; i < crackleCount; i++) {
              var ang = (i / crackleCount) * Math.PI * 2 + t * 0.6;
              var jitter = Math.sin(t * 3 + i) * 0.16;
              var x1 = cx + Math.cos(ang) * r * 0.28;
              var y1 = cy + Math.sin(ang) * r * 0.28;
              var x2 = cx + Math.cos(ang + jitter) * r * 0.96;
              var y2 = cy + Math.sin(ang + jitter) * r * 0.96;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
            ctx.restore();

            var dustCount = 12;
            for (var d = 0; d < dustCount; d++) {
              var dir = d % 2 === 0 ? 1 : -1;
              var dAng = (d / dustCount) * Math.PI * 2 + t * (0.35 + level * 0.75) * dir;
              var dRad = r * (1.18 + 0.22 * Math.sin(t * 2 + d));
              var dx = cx + Math.cos(dAng) * dRad;
              var dy = cy + Math.sin(dAng) * dRad;
              var size = 1 + level * 1.4;
              ctx.beginPath();
              ctx.fillStyle = 'rgba(' + rgbStr + ',' + (0.45 + 0.45 * Math.sin(t * 3 + d)) + ')';
              ctx.arc(dx, dy, size, 0, Math.PI * 2);
              ctx.fill();
            }

            requestAnimationFrame(draw);
          }
          requestAnimationFrame(draw);

          window.JarvisUI = {
            init: function (accentColor, isDark) {
              accent = accentColor || accent;
              document.documentElement.style.setProperty('--accent', accent);
              document.documentElement.style.setProperty('--card-bg', isDark ? 'rgba(13,13,13,0.88)' : 'rgba(244,244,245,0.92)');
              document.documentElement.style.setProperty('--text-primary', isDark ? '#ffffff' : '#18181b');
              document.documentElement.style.setProperty('--text-secondary', isDark ? '#a1a1aa' : '#71717a');
            },
            setStatus: function (text) { document.getElementById('status').textContent = text || ''; },
            setTranscript: function (text) { document.getElementById('transcript').textContent = text || ''; },
            setResponse: function (text) { document.getElementById('response').textContent = text || ''; },
            setRms: function (normalized) { targetLevel = Math.max(0, Math.min(1, normalized)); }
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

    private SpeechRecognizer speechRecognizer;
    private TextToSpeech textToSpeech;
    private boolean ttsReady = false;

    public JarvisVoiceInteractionSession(Context context) {
        super(context);
        appContext = context.getApplicationContext();
    }

    @Override
    public View onCreateContentView() {
        DisplayMetrics dm = appContext.getResources().getDisplayMetrics();
        int width = Math.round(dm.widthPixels * 0.9f);
        int height = dm.heightPixels / 3;

        webView = new WebView(appContext);
        webView.setBackgroundColor(Color.TRANSPARENT);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                webViewReady = true;
                applyTheme();
            }
        });
        // Toda la tarjeta (tamaño, bordes redondeados, fondo semitransparente, tipografía, el
        // orbe) vive en este HTML embebido — así reusa el mismo lenguaje visual que la web/app en
        // vez de reimplementarlo en vistas nativas. loadDataWithBaseURL(null, ...) alcanza porque
        // la página es autocontenida (sin red ni recursos externos).
        webView.loadDataWithBaseURL(null, OVERLAY_HTML, "text/html", "UTF-8", null);
        // Mientras falte el permiso de micrófono, tocar la tarjeta abre la app para concederlo
        // (ver startListening/requestMicPermissionFromApp) — una sesión de asistente no puede
        // mostrar el diálogo de permiso ella misma.
        webView.setOnClickListener(v -> {
            if (!hasMicPermission()) requestMicPermissionFromApp();
        });

        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(width, height);
        webParams.gravity = Gravity.CENTER;

        FrameLayout root = new FrameLayout(appContext);
        root.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(webView, webParams);
        return root;
    }

    @Override
    public void onShow(Bundle args, int showFlags) {
        super.onShow(args, showFlags);
        sessionActive = true;
        if (textToSpeech == null) {
            textToSpeech = new TextToSpeech(appContext, status -> {
                ttsReady = status == TextToSpeech.SUCCESS;
                if (!ttsReady) return;
                textToSpeech.setLanguage(new Locale("es", "AR"));
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

    private void setTranscript(String text) {
        runJs("window.JarvisUI && window.JarvisUI.setTranscript(" + JSONObject.quote(text != null ? text : "") + ")");
    }

    private void setResponse(String text) {
        runJs("window.JarvisUI && window.JarvisUI.setResponse(" + JSONObject.quote(text != null ? text : "") + ")");
    }

    private void setRms(float normalized) {
        runJs("window.JarvisUI && window.JarvisUI.setRms(" + normalized + ")");
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
            }

            @Override
            public void onBeginningOfSpeech() {
            }

            @Override
            public void onRmsChanged(float rmsdB) {
                // SpeechRecognizer da dB, no un nivel 0..1 calibrado — esta normalización es una
                // aproximación razonable (silencio ~ -2dB, voz fuerte ~ 8-10dB) para que el orbe
                // reaccione de forma fluida, no un valor acústicamente exacto.
                float normalized = Math.max(0f, Math.min(1f, (rmsdB + 2f) / 10f));
                setRms(normalized);
            }

            @Override
            public void onBufferReceived(byte[] buffer) {
            }

            @Override
            public void onEndOfSpeech() {
                setStatus("Pensando...");
                setRms(0f);
            }

            @Override
            public void onError(int error) {
                setRms(0f);
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
                setRms(0f);
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty()) {
                    String heard = matches.get(0);
                    setTranscript(heard);
                    askJarvis(heard);
                } else {
                    mainHandler.postDelayed(() -> { if (sessionActive) startListening(); }, 400);
                }
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty()) {
                    setTranscript(matches.get(0));
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
        setTranscript("");
        setResponse("");
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
        setResponse("");
        new Thread(() -> {
            String answer;
            try {
                answer = callGeminiChat(heard);
            } catch (Exception e) {
                answer = "No pude conectarme para responderte. Probá de nuevo en un rato.";
            }
            setResponse(answer);
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
