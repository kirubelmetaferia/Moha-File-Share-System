import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, XCircle, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: { row: number; reason: string }[];
}

export default function ImportUsersModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/users/import-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError("Failed to download template. Ensure you have the required permissions.");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/users/bulk-import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setResult(response.data.data);
      if (response.data.data.successful > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to upload and import users.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[var(--brand)]" />
            Import Users
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 bg-muted/20 hover:bg-muted/30 transition-colors">
                <FileSpreadsheet className="w-10 h-10 text-muted-foreground mb-4" />
                <p className="text-sm text-foreground font-medium mb-1">Upload your Excel file</p>
                <p className="text-xs text-muted-foreground text-center mb-4 max-w-xs">
                  Only .xlsx and .xls files are supported. Ensure the data matches the template format.
                </p>
                
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  id="excel-upload"
                  className="hidden"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) {
                      setFile(selected);
                      setError("");
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById("excel-upload")?.click()}
                >
                  Browse Files
                </Button>
                
                {file && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-[var(--brand)] bg-[var(--brand)]/10 px-3 py-1.5 rounded-md font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    {file.name}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Need the template?</span>
                  <span className="text-xs text-blue-600/80 dark:text-blue-400/80">Download our formatted Excel template</span>
                </div>
                <Button size="sm" variant="outline" className="text-blue-600 border-blue-600/30 hover:bg-blue-600/10" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-foreground">{result.total}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Rows</div>
                </div>
                <div className="w-px h-10 bg-border"></div>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-green-600">{result.successful}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Success</div>
                </div>
                <div className="w-px h-10 bg-border"></div>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-destructive">{result.failed}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Failed</div>
                </div>
              </div>

              {result.failed > 0 && (
                <div className="border border-destructive/20 rounded-xl overflow-hidden">
                  <div className="bg-destructive/10 px-4 py-2 border-b border-destructive/20 font-medium text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Failed Rows Detail
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left sticky top-0">
                        <tr>
                          <th className="px-4 py-2 font-medium text-muted-foreground w-20">Row</th>
                          <th className="px-4 py-2 font-medium text-muted-foreground">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {result.errors.map((err, idx) => (
                          <tr key={idx} className="bg-background hover:bg-muted/30">
                            <td className="px-4 py-2 text-foreground font-medium">{err.row}</td>
                            <td className="px-4 py-2 text-muted-foreground">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-2 justify-end bg-muted/20">
          {!result ? (
            <>
              <Button type="button" onClick={onClose} variant="outline" className="bg-transparent">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !file}
                className="bg-[var(--brand)] hover:opacity-90 text-white"
              >
                {isUploading ? (
                  "Importing..."
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Users
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={onClose} className="bg-[var(--brand)] hover:opacity-90 text-white w-full">
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
