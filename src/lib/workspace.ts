export class WorkspaceService {
  // Sync notes to Google Drive
  static async syncNotesToDrive(
    filename: string,
    content: string,
    accessToken: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    if (!accessToken) {
      return { success: false, error: "No se proporcionó token de Google Workspace." };
    }
    try {
      const res = await fetch("/api/workspace/sync-drive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ filename, content }),
      });

      if (!res.ok) {
        let errMessage = "Error al sincronizar con Google Drive.";
        try {
          const err = await res.json();
          errMessage = err.error || errMessage;
        } catch {
          // ignore non-json response
        }
        return { success: false, error: errMessage };
      }

      const data = await res.json();
      return { success: true, fileId: data.fileId };
    } catch (err: any) {
      console.warn("WorkspaceService.syncNotesToDrive:", err?.message || err);
      return { success: false, error: err?.message || "Error de conexión con el servidor." };
    }
  }

  // Export finance table to Google Sheets
  static async exportFinancesToSheets(
    title: string,
    headers: string[],
    rows: any[][],
    accessToken: string
  ): Promise<{ success: boolean; spreadsheetId?: string; spreadsheetUrl?: string; error?: string }> {
    if (!accessToken) {
      return { success: false, error: "No se proporcionó token de Google Workspace." };
    }
    try {
      const res = await fetch("/api/workspace/sync-sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title, headers, rows }),
      });

      if (!res.ok) {
        let errMessage = "Error al exportar a Google Sheets.";
        try {
          const err = await res.json();
          errMessage = err.error || errMessage;
        } catch {
          // ignore non-json response
        }
        return { success: false, error: errMessage };
      }

      const data = await res.json();
      const spreadsheetUrl = data.spreadsheetUrl || (data.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit` : undefined);
      return { success: true, spreadsheetId: data.spreadsheetId, spreadsheetUrl };
    } catch (err: any) {
      console.warn("WorkspaceService.exportFinancesToSheets:", err?.message || err);
      return { success: false, error: err?.message || "Error de conexión con el servidor." };
    }
  }

  // Send an email with report details using Gmail Send API proxy
  static async sendGmailReport(
    to: string,
    subject: string,
    body: string,
    accessToken: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!accessToken) {
      return { success: false, error: "No se proporcionó token de Google Workspace." };
    }
    try {
      const res = await fetch("/api/workspace/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ to, subject, body }),
      });

      if (!res.ok) {
        let errMessage = "Error al enviar correo por Gmail.";
        try {
          const err = await res.json();
          errMessage = err.error || errMessage;
        } catch {
          // ignore non-json response
        }
        return { success: false, error: errMessage };
      }

      return { success: true };
    } catch (err: any) {
      console.warn("WorkspaceService.sendGmailReport:", err?.message || err);
      return { success: false, error: err?.message || "Error de conexión con el servidor." };
    }
  }

  // Save structured backup file to Google Drive (upsert style)
  static async saveBackupToDrive(
    filename: string,
    content: any,
    accessToken: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    if (!accessToken) {
      return { success: false, error: "No se proporcionó token de Google Workspace." };
    }
    try {
      const res = await fetch("/api/workspace/sync-backup-drive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ filename, content }),
      });

      if (!res.ok) {
        let errMessage = "Error al sincronizar el respaldo con Google Drive.";
        try {
          const err = await res.json();
          errMessage = err.error || errMessage;
        } catch {
          // ignore non-json response
        }
        return { success: false, error: errMessage };
      }

      const data = await res.json();
      if (data && data.success === false) {
        return { success: false, error: data.error || "Error al sincronizar el respaldo con Google Drive." };
      }
      return { success: true, fileId: data?.fileId };
    } catch (err: any) {
      console.warn("WorkspaceService.saveBackupToDrive:", err?.message || err);
      return { success: false, error: err?.message || "Error de conexión al guardar en Google Drive." };
    }
  }

  // Load structured backup file from Google Drive
  static async loadBackupFromDrive(
    filename: string,
    accessToken: string
  ): Promise<{ success: boolean; content?: any; fileId?: string; notFound?: boolean; error?: string }> {
    if (!accessToken) {
      return { success: false, error: "No se proporcionó token de Google Workspace." };
    }
    try {
      const res = await fetch(`/api/workspace/get-backup-drive?filename=${encodeURIComponent(filename)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        try {
          const err = await res.json();
          return { 
            success: false, 
            notFound: !!err.notFound, 
            error: err.error || "Error al descargar el respaldo desde Google Drive." 
          };
        } catch {
          return {
            success: false,
            error: "Error al descargar el respaldo desde Google Drive."
          };
        }
      }

      const data = await res.json();
      if (data && data.success === false) {
        return {
          success: false,
          notFound: !!data.notFound,
          error: data.error || "Error al descargar el respaldo desde Google Drive."
        };
      }

      return { success: true, content: data.content, fileId: data.fileId };
    } catch (err: any) {
      console.warn("WorkspaceService.loadBackupFromDrive:", err?.message || err);
      return { success: false, error: err?.message || "Error de conexión al cargar de Google Drive." };
    }
  }

  // Upload file to Google Drive
  static async uploadFileToDrive(
    filename: string,
    mimeType: string,
    base64Data: string,
    accessToken: string
  ): Promise<{ success: boolean; fileId?: string; webViewLink?: string; error?: string }> {
    if (!accessToken) {
      return { success: false, error: "No se proporcionó token de Google Workspace." };
    }
    try {
      const res = await fetch("/api/workspace/upload-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ filename, mimeType, base64Data }),
      });

      if (!res.ok) {
        let errMessage = "Error al subir el archivo a Google Drive.";
        try {
          const err = await res.json();
          errMessage = err.error || errMessage;
        } catch {
          // ignore non-json response
        }
        return { success: false, error: errMessage };
      }

      const data = await res.json();
      if (data && data.success === false) {
        return { success: false, error: data.error || "Error al subir el archivo a Google Drive." };
      }
      return { success: true, fileId: data.fileId, webViewLink: data.webViewLink };
    } catch (err: any) {
      console.warn("WorkspaceService.uploadFileToDrive:", err?.message || err);
      return { success: false, error: err?.message || "Error de conexión al subir a Google Drive." };
    }
  }

  // Sync events to Google Calendar
  static async syncCalendarEvents(
    events: { id: string; title: string; description: string; date: string; time?: string; location?: string }[],
    accessToken: string
  ): Promise<{ success: boolean; syncedCount?: number; errors?: string[]; error?: string; eventIds?: Record<string, string> }> {
    if (!accessToken) {
      return { success: false, error: "No se proporcionó token de Google Workspace." };
    }
    try {
      const res = await fetch("/.netlify/functions/sync-calendar-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ events }),
      });

      if (!res.ok) {
        let errMessage = "Error al sincronizar con Google Calendar.";
        try {
          const err = await res.json();
          errMessage = err.error || errMessage;
        } catch {
          // ignore non-json response
        }
        return { success: false, error: errMessage };
      }

      const data = await res.json();
      return { success: true, syncedCount: data.syncedCount, errors: data.errors, eventIds: data.eventIds };
    } catch (err: any) {
      console.warn("WorkspaceService.syncCalendarEvents:", err?.message || err);
      return { success: false, error: err?.message || "Error de conexión al sincronizar calendario." };
    }
  }

  // Deletes a single Google Calendar event by its Google-assigned id.
  static async deleteCalendarEvent(
    googleEventId: string,
    accessToken: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!accessToken || !googleEventId) {
      return { success: false, error: "Falta el token o el id del evento." };
    }
    try {
      const res = await fetch("/.netlify/functions/delete-calendar-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ googleEventId }),
      });
      if (!res.ok) {
        let errMessage = "Error al borrar el evento de Google Calendar.";
        try {
          const err = await res.json();
          errMessage = err.error || errMessage;
        } catch {}
        return { success: false, error: errMessage };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Error de conexión al borrar el evento." };
    }
  }
}
