"use client"

import { useState, useCallback } from "react"
import { Upload, FileSpreadsheet, Send, X, CheckCircle, AlertCircle, FileText, Download } from "lucide-react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface Template {
  id: number
  hsmId: string
  name: string
  category: string
  language: string
  preview: string
  templateType: string
  status: string
}

interface CSVData {
  headers: string[]
  rows: string[][]
}

export default function CSVUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVData | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  
  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  const detectDelimiter = (text: string): string => {
    const firstLine = text.split("\n")[0]
    const delimiters = [";", ",", "\t", "|"]
    let bestDelimiter = ","
    let maxCount = 0

    for (const delimiter of delimiters) {
      const count = (firstLine.match(new RegExp(`\\${delimiter}`, "g")) || []).length
      if (count > maxCount) {
        maxCount = count
        bestDelimiter = delimiter
      }
    }

    return bestDelimiter
  }

  const parseCSV = (text: string): CSVData => {
    const delimiter = detectDelimiter(text)
    const lines = text.trim().split(/\r?\n/)
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""))
    const rows = lines.slice(1).filter((line) => line.trim()).map((line) =>
      line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""))
    )
    return { headers, rows }
  }

  const handleFile = useCallback(async (selectedFile: File) => {
    const extension = selectedFile.name.split(".").pop()?.toLowerCase()
    
    if (!["csv", "xls", "xlsx"].includes(extension || "")) {
      setErrorMessage("Por favor, selecione um arquivo válido (.csv, .xls, .xlsx).")
      setSendStatus("error")
      return
    }

    setFile(selectedFile)
    setSendStatus("idle")
    setErrorMessage("")

    try {
      let data: CSVData

      if (extension === "csv") {
        const text = await selectedFile.text()
        data = parseCSV(text)
      } else {
        const arrayBuffer = await selectedFile.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer)
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        const headers = jsonData[0].map((h) => String(h || "").trim())
        const rows = jsonData.slice(1).map((row) => 
          row.map((cell) => String(cell === null || cell === undefined ? "" : cell).trim())
        )
        data = { headers, rows }
      }

      // Validação de Colunas Obrigatórias
      const requiredCols = ["VENDEDOR", "CLIENTE", "TELEFONE"]
      const missingCols = requiredCols.filter(
        (col) => !data.headers.some((h) => h.toUpperCase() === col)
      )

      if (missingCols.length > 0) {
        setErrorMessage(`Colunas obrigatórias ausentes: ${missingCols.join(", ")}`)
        setSendStatus("error")
        // No need to clear the file, let them see what they uploaded
      }

      setCsvData(data)
    } catch (error) {
      console.error("Error parsing file:", error)
      setErrorMessage("Erro ao processar o arquivo. Verifique se o formato está correto.")
      setSendStatus("error")
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFile(droppedFile)
      }
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        handleFile(selectedFile)
      }
    },
    [handleFile]
  )

  const clearFile = () => {
    setFile(null)
    setCsvData(null)
    setSendStatus("idle")
    setErrorMessage("")
    setSelectedTemplate(null)
  }

  const downloadTemplate = () => {
    const headers = [["VENDEDOR", "CLIENTE", "TELEFONE"]]
    const data = [["João Silva", "Maria Oliveira", "11999999999"]]
    const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...data])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo")
    XLSX.writeFile(workbook, "modelo_planilha.xlsx")
  }

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const response = await fetch("https://chat-55api.jetsalesbrasil.com/templates", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6MSwicHJvZmlsZSI6ImFkbWluIiwic2Vzc2lvbklkIjo4NywiY2hhbm5lbFR5cGUiOiJ3YWJhIiwiaWF0IjoxNzc0NDc0NzA2LCJleHAiOjE4Mzc1NDY3MDZ9.GiX5qe_J75ZIuJeFpSoRjR3lg54RLI8wtHzLMVlhGzI",
        },
      })
      const data = await response.json()
      // Filter for approved templates or all based on requirement? 
      // User example shows some FAILED/PENDING, let's keep all first but usually only approved are useful.
      setTemplates(data.templates || [])
    } catch (error) {
      console.error("Error fetching templates:", error)
      setErrorMessage("Erro ao buscar templates.")
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const openTemplateModal = () => {
    if (!csvData) return
    setIsTemplateModalOpen(true)
    fetchTemplates()
  }

  const sendToWebhook = async () => {
    if (!csvData || !selectedTemplate) return

    setIsSending(true)
    setSendStatus("idle")
    setIsTemplateModalOpen(false) // Close modal before sending

    try {
      const payload = {
        templateName: selectedTemplate.name,
        templateHsmId: selectedTemplate.hsmId,
        headers: csvData.headers,
        data: csvData.rows.map((row) => {
          const obj: Record<string, string> = {}
          csvData.headers.forEach((header, index) => {
            obj[header] = row[index] || ""
          })
          return obj
        }),
        fileName: file?.name,
        totalRows: csvData.rows.length,
        uploadedAt: new Date().toISOString(),
      }

      const response = await fetch(
        "https://n8n.jetsalesbrasil.com/webhook/a85d8939-dba6-4750-8ad7-0a7f1952a3e1",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )

      if (response.ok) {
        setSendStatus("success")
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      setSendStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Erro ao enviar dados")
    } finally {
      setIsSending(false)
    }
  }

  const previewRows = csvData?.rows.slice(0, 5) || []
  const totalRows = csvData?.rows.length || 0

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Upload de CSV
          </h1>
          <p className="mt-2 text-muted-foreground">
            Faça upload do seu arquivo CSV ou Excel para enviar os dados ao webhook
          </p>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Selecionar Arquivo
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadTemplate}
                className="text-xs gap-2"
              >
                <Download className="h-3 w-3" />
                Baixar Modelo
              </Button>
            </CardTitle>
            <CardDescription className="flex flex-col gap-1">
              <span>Arraste e solte seu arquivo CSV ou Excel ou clique para selecionar</span>
              <span className="text-xs font-semibold text-primary/80 uppercase">Padrão solicitado: VENDEDOR, CLIENTE, TELEFONE</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input
                type="file"
                accept=".csv, .xls, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileInput}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground text-center px-4">
                {isDragging ? "Solte o arquivo aqui" : "Clique ou arraste seu arquivo CSV ou Excel"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Formatos aceitos: .csv, .xls, .xlsx
              </p>
            </div>
          </CardContent>
        </Card>

        {/* File Info & Preview */}
        {file && csvData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    {file.name}
                  </CardTitle>
                  <CardDescription>
                    {totalRows} linha{totalRows !== 1 ? "s" : ""} • {csvData.headers.length}{" "}
                    coluna{csvData.headers.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">
                  Prévia das primeiras {Math.min(5, totalRows)} linhas:
                </h3>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {csvData.headers.map((header, index) => (
                          <TableHead key={index} className="whitespace-nowrap font-semibold">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="whitespace-nowrap">
                              {cell || "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalRows > 5 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    ... e mais {totalRows - 5} linha{totalRows - 5 !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Status Messages */}
              {sendStatus === "success" && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-700 dark:bg-green-950 dark:text-green-300">
                  <CheckCircle className="h-5 w-5" />
                  <span>Dados enviados com sucesso!</span>
                </div>
              )}

              {sendStatus === "error" && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-700 dark:bg-red-950 dark:text-red-300">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errorMessage || "Erro ao enviar dados"}</span>
                </div>
              )}

              {/* Send Button */}
              <Button
                onClick={openTemplateModal}
                disabled={isSending || sendStatus === "success"}
                className="w-full"
                size="lg"
              >
                {isSending ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Enviando...
                  </>
                ) : sendStatus === "success" ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Enviado!
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar para Webhook
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Template Selection Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Template</DialogTitle>
            <DialogDescription>
              Selecione o template que será disparado para os contatos desta planilha.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-select">Template</Label>
              <Select
                onValueChange={(value) => {
                  const template = templates.find((t) => t.name === value)
                  setSelectedTemplate(template || null)
                }}
                value={selectedTemplate?.name}
              >
                <SelectTrigger id="template-select">
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTemplates ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2 text-sm">Carregando...</span>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum template encontrado.
                    </div>
                  ) : (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.name}>
                        {template.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label>Prévia do Conteúdo</Label>
                <div className="rounded-lg border bg-muted/50 p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedTemplate.preview}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {selectedTemplate.category}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {selectedTemplate.language}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsTemplateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={sendToWebhook}
              disabled={!selectedTemplate || isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Confirmar e Enviar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
