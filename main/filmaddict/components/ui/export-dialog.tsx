"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button-1";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { ChevronDown, Download, Loader2 } from "lucide-react";

export type ExportFormat =
  | "mp4"
  | "mov_prores422"
  | "mov_prores4444"
  | "webm"
  | "xml"
  | "edl"
  | "aaf";

export interface ExportFormatOption {
  value: ExportFormat;
  label: string;
  description: string;
}

const EXPORT_FORMATS: ExportFormatOption[] = [
  {
    value: "mp4",
    label: "MP4 (H.264)",
    description: "Default delivery",
  },
  {
    value: "mov_prores422",
    label: "MOV (ProRes 422)",
    description: "For real editors & post houses",
  },
  {
    value: "mov_prores4444",
    label: "MOV (ProRes 4444)",
    description: "For real editors & post houses",
  },
  {
    value: "webm",
    label: "WebM (VP9)",
    description: "YouTube optimization / modern web",
  },
  {
    value: "xml",
    label: "XML",
    description: "Final Cut Pro",
  },
  {
    value: "edl",
    label: "EDL",
    description: "Premiere / Resolve",
  },
  {
    value: "aaf",
    label: "AAF",
    description: "Avid / Pro pipelines",
  },
];

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: ExportFormat) => Promise<void>;
  pendingCutsCount?: number;
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  pendingCutsCount = 0,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("mp4");
  const [isExporting, setIsExporting] = useState(false);

  const selectedFormatOption = EXPORT_FORMATS.find(
    (f) => f.value === selectedFormat
  );

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await onExport(selectedFormat);
      onOpenChange(false);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Choose your export format. {pendingCutsCount > 0 && `Pending cuts (${pendingCutsCount}) will be applied.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium text-zinc-300 mb-2 block">
            Export Format
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between bg-zinc-950 border-zinc-700 text-zinc-100 hover:bg-zinc-900"
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">
                    {selectedFormatOption?.label}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {selectedFormatOption?.description}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[400px] bg-zinc-900 border-zinc-700">
              {EXPORT_FORMATS.map((format) => (
                <DropdownMenuItem
                  key={format.value}
                  onClick={() => setSelectedFormat(format.value)}
                  className="flex flex-col items-start py-3 px-3 hover:bg-zinc-800 cursor-pointer"
                >
                  <span className="text-sm font-medium text-zinc-100">
                    {format.label}
                  </span>
                  <span className="text-xs text-zinc-400 mt-0.5">
                    {format.description}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
            className="bg-zinc-950 border-zinc-700 text-zinc-100 hover:bg-zinc-900"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-white text-black hover:bg-zinc-200"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

