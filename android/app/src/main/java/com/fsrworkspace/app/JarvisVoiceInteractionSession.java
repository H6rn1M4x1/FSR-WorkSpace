package com.fsrworkspace.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.service.voice.VoiceInteractionSession;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.TextView;

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
 * asistente (con Jarvis configurado como predeterminado). Graba voz con SpeechRecognizer (la
 * ventana de una sesión de asistente tiene permiso especial para usar el micrófono aunque otra
 * app esté en primer plano), manda el texto reconocido al mismo endpoint de Gemini que ya usa
 * "Viernes" en Facultad (con búsqueda web habilitada), y lee la respuesta en voz alta con
 * TextToSpeech.
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

    private final Context appContext;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private TextView statusView;
    private TextView transcriptView;
    private TextView responseView;
    private View micView;

    private SpeechRecognizer speechRecognizer;
    private TextToSpeech textToSpeech;
    private boolean ttsReady = false;

    public JarvisVoiceInteractionSession(Context context) {
        super(context);
        appContext = context.getApplicationContext();
    }

    @Override
    public View onCreateContentView() {
        View view = LayoutInflater.from(appContext).inflate(R.layout.jarvis_session_overlay, null);
        statusView = view.findViewById(R.id.jarvis_status);
        transcriptView = view.findViewById(R.id.jarvis_transcript);
        responseView = view.findViewById(R.id.jarvis_response);
        micView = view.findViewById(R.id.jarvis_mic);
        micView.setOnClickListener(v -> startListening());
        return view;
    }

    @Override
    public void onShow(Bundle args, int showFlags) {
        super.onShow(args, showFlags);
        if (textToSpeech == null) {
            textToSpeech = new TextToSpeech(appContext, status -> {
                ttsReady = status == TextToSpeech.SUCCESS;
                if (ttsReady) {
                    textToSpeech.setLanguage(new Locale("es", "AR"));
                }
            });
        }
        mainHandler.post(this::startListening);
    }

    @Override
    public void onHide() {
        super.onHide();
        if (speechRecognizer != null) {
            speechRecognizer.cancel();
        }
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
    }

    @Override
    public void onDestroy() {
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

    private void startListening() {
        if (ContextCompat.checkSelfPermission(appContext, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            setStatus("Jarvis necesita permiso de micrófono. Tocá el círculo para abrir la app y concederlo.");
            if (micView != null) {
                micView.setOnClickListener(v -> requestMicPermissionFromApp());
            }
            return;
        }

        if (!SpeechRecognizer.isRecognitionAvailable(appContext)) {
            setStatus("Este dispositivo no tiene reconocimiento de voz disponible.");
            return;
        }

        if (micView != null) {
            micView.setOnClickListener(v -> startListening());
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
                setStatus("No te escuché bien. Tocá el micrófono para intentar de nuevo.");
            }

            @Override
            public void onResults(Bundle results) {
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty()) {
                    String heard = matches.get(0);
                    setTranscript(heard);
                    askJarvis(heard);
                } else {
                    setStatus("No entendí nada. Tocá el micrófono para intentar de nuevo.");
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
        setStatus("Preparando el micrófono...");
        setTranscript("");
        setResponse("");
        speechRecognizer.startListening(recognizerIntent);
    }

    // Una sesión de asistente no es una Activity, así que no puede pedir el permiso de micrófono
    // ella misma (no hay requestPermissions() acá) — startAssistantActivity() es el mecanismo
    // oficial para que una sesión delegue en una Activity normal (acá, MainActivity, que sí puede
    // pedirlo) y que esa Activity atienda lo que haga falta.
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
            setStatus("Tocá el micrófono para hablar de nuevo.");
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
            return "Hubo un error: " + json.optString("error", "desconocido");
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
            }
        });
    }

    private void setStatus(String text) {
        mainHandler.post(() -> {
            if (statusView != null) statusView.setText(text);
        });
    }

    private void setTranscript(String text) {
        mainHandler.post(() -> {
            if (transcriptView != null) transcriptView.setText(text);
        });
    }

    private void setResponse(String text) {
        mainHandler.post(() -> {
            if (responseView != null) responseView.setText(text);
        });
    }
}
