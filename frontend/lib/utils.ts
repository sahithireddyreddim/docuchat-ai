import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/** Export chat messages as a PDF using the browser print dialog */
export function exportChatToPDF(title: string, messages: any[]): void {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #111; }
        h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
        .message { margin: 16px 0; padding: 12px 16px; border-radius: 8px; }
        .user { background: #eff6ff; border-left: 4px solid #3b82f6; }
        .assistant { background: #f9fafb; border-left: 4px solid #10b981; }
        .role { font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; color: #555; }
        pre { background: #f0f0f0; padding: 8px; border-radius: 4px; overflow-wrap: break-word; }
      </style>
    </head>
    <body>
      <h1>DocuChat AI — ${title}</h1>
      <p class="meta">Exported on ${new Date().toLocaleString()}</p>
      ${messages
        .map(
          (m) => `
        <div class="message ${m.role}">
          <div class="role">${m.role}</div>
          <div>${m.content.replace(/\n/g, "<br>")}</div>
        </div>
      `
        )
        .join("")}
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.print();
}
