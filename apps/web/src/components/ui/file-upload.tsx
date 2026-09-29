import * as React from "react"
import { UploadCloud, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFilesChange?: (files: FileList | null) => void
  maxSizeMB?: number
  maxFiles?: number
}

export function FileUpload({ 
  className, 
  onFilesChange,
  maxSizeMB = 5,
  maxFiles = 5,
  multiple = false,
  accept,
  ...props 
}: FileUploadProps) {
  const [dragActive, setDragActive] = React.useState(false)
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (filesList: FileList) => {
    const newFiles = Array.from(filesList)
    const validFiles = newFiles.filter(f => f.size <= maxSizeMB * 1024 * 1024)
    if (validFiles.length < newFiles.length) {
      alert(`Beberapa file ditolak karena melebihi ${maxSizeMB}MB`)
    }
    
    let updatedFiles = multiple ? [...selectedFiles, ...validFiles] : [...validFiles]
    if (updatedFiles.length > maxFiles) {
      alert(`Maksimal ${maxFiles} file diizinkan`)
      updatedFiles = updatedFiles.slice(0, maxFiles)
    }

    setSelectedFiles(updatedFiles)
    
    // update the hidden input
    if (inputRef.current) {
      const dt = new DataTransfer()
      updatedFiles.forEach(f => dt.items.add(f))
      inputRef.current.files = dt.files
      if (onFilesChange) onFilesChange(dt.files)
    }
  }

  const removeFile = (index: number) => {
    const updatedFiles = [...selectedFiles]
    updatedFiles.splice(index, 1)
    setSelectedFiles(updatedFiles)
    
    if (inputRef.current) {
      const dt = new DataTransfer()
      updatedFiles.forEach(f => dt.items.add(f))
      inputRef.current.files = dt.files
      if (onFilesChange) onFilesChange(dt.files)
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/20 hover:bg-muted/50 transition-colors",
          dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/20"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-sm font-medium text-center">
          Tarik & letakkan file di sini, atau klik untuk memilih
        </p>
        <p className="text-xs text-muted-foreground text-center mt-1">
          {accept ? `Format: ${accept}` : 'Semua format didukung'} (Maks: {maxSizeMB}MB)
        </p>
        
        <input
          ref={inputRef}
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          multiple={multiple}
          accept={accept}
          {...props}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-2 text-sm border rounded-md">
              <span className="truncate max-w-[200px]">{file.name}</span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
