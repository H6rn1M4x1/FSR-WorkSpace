package com.fsrworkspace.app;

import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Desacopla PaymentListenerService (el NotificationListenerService, que Android puede crear
 * en cualquier momento, incluso antes de que exista el plugin) del PaymentListenerPlugin (que
 * vive mientras la app está abierta). El servicio solo publica acá; quien esté escuchando
 * (normalmente el plugin) se entera sin que ninguno conozca al otro directamente.
 */
public class PaymentListenerBridge {

    public interface Listener {
        void onPaymentNotification(String packageName, String title, String text, String bigText, long postTime);
    }

    private static final CopyOnWriteArrayList<Listener> listeners = new CopyOnWriteArrayList<>();

    public static void addListener(Listener l) {
        listeners.add(l);
    }

    public static void removeListener(Listener l) {
        listeners.remove(l);
    }

    public static void dispatch(String packageName, String title, String text, String bigText, long postTime) {
        for (Listener l : listeners) {
            l.onPaymentNotification(packageName, title, text, bigText, postTime);
        }
    }
}
