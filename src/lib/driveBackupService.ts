import * as XLSX from "xlsx";
import { StorageService } from "./storage";
import { getAccessToken, googleSignIn } from "./firebase";

export interface BackupLog {
  id: string;
  timestamp: string;
  status: "success" | "error" | "in_progress";
  message: string;
  createdFilesCount?: number;
  createdFoldersCount?: number;
}

export interface BackupStructureMenu {
  menuName: string;
  submenus: {
    submenuName: string;
    tables: {
      tableName: string;
      getData: () => any[];
    }[];
  }[];
}

// Map of all Menus -> Submenus -> Data Tables in the App
export const BACKUP_STRUCTURE: BackupStructureMenu[] = [
  {
    menuName: "Turnos",
    submenus: [
      {
        submenuName: "Mi Agenda",
        tables: [
          { tableName: "Turnos Agendados", getData: () => StorageService.getAppointments() }
        ]
      },
      {
        submenuName: "Agenda de Turnos",
        tables: [
          { tableName: "Turnos y Compromisos", getData: () => StorageService.getTurnosCompromisos() }
        ]
      }
    ]
  },
  {
    menuName: "Finanzas",
    submenus: [
      {
        submenuName: "Mis Finanzas",
        tables: [
          { tableName: "Facturas y Servicios", getData: () => StorageService.getInvoices() },
          { tableName: "Presupuestos Mensuales", getData: () => StorageService.getBudgets() }
        ]
      },
      {
        submenuName: "Gastos Mensuales",
        tables: [
          { tableName: "Historial de Pagos", getData: () => StorageService.getPayments() },
          { tableName: "Pagos Detallados", getData: () => StorageService.getDetailedPayments() }
        ]
      },
      {
        submenuName: "Gastos Varios",
        tables: [
          { tableName: "Gastos Varios", getData: () => StorageService.getGastosVarios() }
        ]
      },
      {
        submenuName: "Inversiones",
        tables: [
          { tableName: "Portafolio de Inversiones", getData: () => StorageService.getInversiones() }
        ]
      },
      {
        submenuName: "Cotización de Acciones",
        tables: [
          { tableName: "Cotizaciones de Acciones IOL", getData: () => StorageService.getCotizacionesAcciones() }
        ]
      }
    ]
  },
  {
    menuName: "Universidad",
    submenus: [
      {
        submenuName: "Facultad",
        tables: [
          { tableName: "Materias Académicas", getData: () => StorageService.getSubjects() }
        ]
      },
      {
        submenuName: "Plan de Estudio",
        tables: [
          { tableName: "Información Materias", getData: () => StorageService.getMateriasInfo() }
        ]
      },
      {
        submenuName: "Historia Académica",
        tables: [
          { tableName: "Notas e Ideas", getData: () => StorageService.getNotes() }
        ]
      },
      {
        submenuName: "Horario",
        tables: [
          { tableName: "Horarios de Clases", getData: () => StorageService.getHorarios() }
        ]
      },
      {
        submenuName: "Parciales, Finales y Trabajos",
        tables: [
          { tableName: "Tareas y Exámenes", getData: () => StorageService.getTasks() }
        ]
      }
    ]
  },
  {
    menuName: "Salud",
    submenus: [
      {
        submenuName: "Mi Salud",
        tables: [
          { tableName: "Doctores y Profesionales", getData: () => StorageService.getDoctors() },
          { tableName: "Rutinas de Salud", getData: () => StorageService.getRoutines() }
        ]
      },
      {
        submenuName: "Deportes y Actividades",
        tables: [
          { tableName: "Deportes y Actividades", getData: () => StorageService.getDeportesActividades() },
          { tableName: "Rutinas Gimnasio", getData: () => StorageService.getRutinasGimnasio() },
          { tableName: "Registros Entrenamiento", getData: () => StorageService.getRegistrosEntrenamiento() }
        ]
      },
      {
        submenuName: "Alimentación",
        tables: [
          { tableName: "Registro Alimentación", getData: () => StorageService.getAlimentacionLogs() }
        ]
      },
      {
        submenuName: "Medicamentos",
        tables: [
          { tableName: "Medicamentos (Dosis)", getData: () => StorageService.getMedications() },
          { tableName: "Medicamentos Detallados", getData: () => StorageService.getMedicamentosDetallados() }
        ]
      },
      {
        submenuName: "Disponibilidad Medicamentos",
        tables: [
          { tableName: "Disponibilidad Medicamentos", getData: () => StorageService.getDisponibilidadMedicamentos() }
        ]
      },
      {
        submenuName: "Datos de Presión",
        tables: [
          { tableName: "Datos de Presión Arterial", getData: () => StorageService.getBloodPressure() }
        ]
      },
      {
        submenuName: "Estudios e Informes",
        tables: [
          { tableName: "Estudios Médicos", getData: () => StorageService.getMedicalRecords() }
        ]
      }
    ]
  },
  {
    menuName: "Comidas",
    submenus: [
      {
        submenuName: "Mi Alimentación",
        tables: [
          { tableName: "Alacena e Inventario", getData: () => StorageService.getPantry() },
          { tableName: "Plan de Comidas", getData: () => StorageService.getMeals() }
        ]
      },
      {
        submenuName: "Mercadería (Base)",
        tables: [
          { tableName: "Mercadería Base", getData: () => StorageService.getMercaderia() }
        ]
      },
      {
        submenuName: "Alimentos (Base)",
        tables: [
          { tableName: "Alimentos Base", getData: () => StorageService.getAlimentos() }
        ]
      },
      {
        submenuName: "Platos (Base)",
        tables: [
          { tableName: "Platos Base", getData: () => StorageService.getPlatos() }
        ]
      },
      {
        submenuName: "Organización Semanal",
        tables: [
          { tableName: "Organización Semanal", getData: () => StorageService.getOrganizacionSemanal() }
        ]
      },
      {
        submenuName: "Lista de Compras",
        tables: [
          { tableName: "Lista de Compras", getData: () => StorageService.getShopping() }
        ]
      }
    ]
  }
];

export class DriveBackupService {
  private static FOLDER_MIME = "application/vnd.google-apps.folder";
  private static EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  // Get or create a folder in Google Drive
  private static async getOrCreateFolder(
    accessToken: string,
    folderName: string,
    parentFolderId?: string
  ): Promise<string> {
    let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = '${this.FOLDER_MIME}' and trashed = false`;
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    }

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=10`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchRes.status === 401 || searchRes.status === 403) {
      throw new Error("UNAUTHENTICATED: Token de Google Drive expirado o inválido.");
    }

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Create folder if not found
    const createUrl = "https://www.googleapis.com/drive/v3/files";
    const body: any = {
      name: folderName,
      mimeType: this.FOLDER_MIME,
    };
    if (parentFolderId) {
      body.parents = [parentFolderId];
    }

    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (createRes.status === 401 || createRes.status === 403) {
      throw new Error("UNAUTHENTICATED: Token de Google Drive expirado o inválido.");
    }

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Error al crear carpeta '${folderName}' en Google Drive: ${errText}`);
    }

    const newFolder = await createRes.json();
    return newFolder.id;
  }

  // Upload or update Excel file in target folder
  private static async uploadExcelFile(
    accessToken: string,
    folderId: string,
    fileName: string,
    excelArrayBuffer: ArrayBuffer
  ): Promise<string> {
    // Check if file already exists in folder
    const query = `name = '${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=10`;

    let existingFileId: string | null = null;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchRes.status === 401 || searchRes.status === 403) {
      throw new Error("UNAUTHENTICATED: Token de Google Drive expirado o inválido.");
    }

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        existingFileId = searchData.files[0].id;
      }
    }

    const metadata = {
      name: fileName,
      mimeType: this.EXCEL_MIME,
      ...(existingFileId ? {} : { parents: [folderId] }),
    };

    const boundary = "------BackupBoundary" + Math.random().toString(36).substring(2);
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";

    const metadataPart =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata);

    const filePartHeader =
      delimiter +
      `Content-Type: ${this.EXCEL_MIME}\r\n` +
      "Content-Transfer-Encoding: base64\r\n\r\n";

    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(excelArrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);

    const multipartRequestBody =
      metadataPart + filePartHeader + base64Data + closeDelimiter;

    let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    let method = "POST";

    if (existingFileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
      method = "PATCH";
    }

    const uploadRes = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (uploadRes.status === 401 || uploadRes.status === 403) {
      throw new Error("UNAUTHENTICATED: Token de Google Drive expirado o inválido.");
    }

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Error al subir archivo '${fileName}': ${errText}`);
    }

    const fileData = await uploadRes.json();
    return fileData.id;
  }

  // Generate an Excel workbook (.xlsx ArrayBuffer) from a submenu's tables
  private static generateSubmenuExcel(
    submenuName: string,
    tables: { tableName: string; getData: () => any[] }[]
  ): ArrayBuffer {
    const wb = XLSX.utils.book_new();

    for (const table of tables) {
      const rawData = table.getData() || [];
      const cleanData = rawData.map((row) => {
        const obj: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (value !== null && typeof value === "object") {
            obj[key] = JSON.stringify(value);
          } else {
            obj[key] = value ?? "";
          }
        }
        return obj;
      });

      // Sheet name (max 31 chars allowed in Excel)
      let sheetName = table.tableName.replace(/[\\/*?:[\]]/g, "").substring(0, 31);
      if (!sheetName) sheetName = "Datos";

      const ws = XLSX.utils.json_to_sheet(
        cleanData.length > 0 ? cleanData : [{ Estado: "Sin datos registrados" }]
      );

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    return excelBuffer;
  }

  // Perform a full backup of all Menus and Submenus to Google Drive
  static async runFullBackup(
    onProgress?: (statusText: string, percentage: number) => void
  ): Promise<{ success: boolean; filesCount: number; message: string }> {
    let token = await getAccessToken();

    if (!token) {
      try {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      } catch (err: any) {
        throw new Error("Se requiere iniciar sesión con Google para acceder a Google Drive.");
      }
    }

    if (!token) {
      throw new Error("Token de Google Drive no disponible. Por favor conecta tu cuenta de Google.");
    }

    try {
      if (onProgress) onProgress("Iniciando conexión con Google Drive...", 5);

      // 1. Root Backup Folder
      const rootFolderName = "Mi App - Backup Tablas";
      const rootFolderId = await this.getOrCreateFolder(token, rootFolderName);

      if (onProgress) onProgress("Carpeta principal lista. Creando estructura de Menús y Submenús...", 15);

      let totalFilesCreated = 0;
      let totalSubmenus = 0;
      BACKUP_STRUCTURE.forEach((m) => (totalSubmenus += m.submenus.length));

      let completedSubmenus = 0;

      // 2. Iterate through each Menu
      for (const menu of BACKUP_STRUCTURE) {
        if (onProgress) {
          const currentPct = 15 + Math.round((completedSubmenus / totalSubmenus) * 75);
          onProgress(`Procesando Menú: '${menu.menuName}'...`, currentPct);
        }

        const menuFolderId = await this.getOrCreateFolder(token, menu.menuName, rootFolderId);

        // 3. Iterate through each Submenu
        for (const submenu of menu.submenus) {
          const submenuFolderId = await this.getOrCreateFolder(
            token,
            submenu.submenuName,
            menuFolderId
          );

          // Generate Excel file
          const excelBuffer = this.generateSubmenuExcel(submenu.submenuName, submenu.tables);

          // Standard filename format e.g. "Tablas_Agenda_de_Turnos.xlsx"
          const cleanSubmenuName = submenu.submenuName.replace(/[/\\?%*:|"<>]/g, "_");
          const fileName = `${cleanSubmenuName}_Tablas.xlsx`;

          await this.uploadExcelFile(token, submenuFolderId, fileName, excelBuffer);

          totalFilesCreated++;
          completedSubmenus++;

          if (onProgress) {
            const currentPct = 15 + Math.round((completedSubmenus / totalSubmenus) * 75);
            onProgress(`Guardado '${submenu.submenuName}' en '${menu.menuName}'`, currentPct);
          }
        }
      }

      if (onProgress) onProgress("Finalizando copia de seguridad...", 98);

      const nowStr = new Date().toISOString();
      localStorage.setItem("drive_last_backup_date", nowStr);

      // Log success
      const logs = this.getBackupLogs();
      logs.unshift({
        id: "log-" + Date.now(),
        timestamp: nowStr,
        status: "success",
        message: `Backup mensual/manual completado con éxito. Se actualizaron ${totalFilesCreated} archivos Excel en Google Drive.`,
        createdFilesCount: totalFilesCreated,
      });
      localStorage.setItem("drive_backup_logs", JSON.stringify(logs.slice(0, 15)));

      if (onProgress) onProgress("¡Copia de seguridad completada con éxito!", 100);

      return {
        success: true,
        filesCount: totalFilesCreated,
        message: `Backup realizado correctamente: ${totalFilesCreated} archivos Excel organizados por Menú y Submenú en la carpeta '${rootFolderName}' de Google Drive.`,
      };
    } catch (err: any) {
      const isUnauth = err?.message?.includes("UNAUTHENTICATED") || err?.message?.includes("401") || err?.message?.includes("403");
      const nowStr = new Date().toISOString();
      const logs = this.getBackupLogs();
      logs.unshift({
        id: "log-" + Date.now(),
        timestamp: nowStr,
        status: "error",
        message: isUnauth
          ? "Error de autenticación en Google Drive. Por favor vuelve a conectar tu cuenta."
          : `Error al realizar backup: ${err.message || err}`,
      });
      localStorage.setItem("drive_backup_logs", JSON.stringify(logs.slice(0, 15)));

      return {
        success: false,
        filesCount: 0,
        message: isUnauth
          ? "Error de autenticación con Google Drive. Se requiere iniciar sesión con Google para refrescar tus credenciales."
          : `Error al realizar la copia de seguridad: ${err.message || err}`,
      };
    }
  }

  // Check if monthly backup is due (runs once per calendar month)
  static async checkAndRunMonthlyBackupIfNeeded(): Promise<boolean> {
    const isAutoEnabled = localStorage.getItem("drive_auto_backup_enabled") !== "false";
    if (!isAutoEnabled) return false;

    const lastBackupStr = localStorage.getItem("drive_last_backup_date");
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

    if (lastBackupStr) {
      const lastDate = new Date(lastBackupStr);
      const lastMonthKey = `${lastDate.getFullYear()}-${lastDate.getMonth() + 1}`;
      if (currentMonthKey === lastMonthKey) {
        // Already backed up this month
        return false;
      }
    }

    // Attempt silent background monthly backup if token is present
    const token = await getAccessToken();
    if (!token) return false;

    try {
      console.log("Iniciando backup automático mensual de tablas a Google Drive...");
      await this.runFullBackup();
      return true;
    } catch (err) {
      console.warn("No se pudo completar el backup automático mensual:", err);
      return false;
    }
  }

  // Helper getters for UI
  static getLastBackupDate(): string | null {
    return localStorage.getItem("drive_last_backup_date");
  }

  static isAutoBackupEnabled(): boolean {
    return localStorage.getItem("drive_auto_backup_enabled") !== "false";
  }

  static setAutoBackupEnabled(enabled: boolean): void {
    localStorage.setItem("drive_auto_backup_enabled", enabled ? "true" : "false");
  }

  static getBackupLogs(): BackupLog[] {
    try {
      const raw = localStorage.getItem("drive_backup_logs");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
