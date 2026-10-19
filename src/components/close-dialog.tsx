import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MonitorDown, Power } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { executeCloseAction, setCloseActionPreference } from "@/lib/close-action";

interface CloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloseDialog({ open, onOpenChange }: CloseDialogProps) {
  const { t } = useTranslation();
  const [rememberChoice, setRememberChoice] = useState(false);
  const isMac = navigator.userAgent.toLowerCase().includes("mac");

  const handleAction = async (action: "minimize" | "exit") => {
    if (rememberChoice) {
      setCloseActionPreference(action);
    }
    onOpenChange(false);
    await executeCloseAction(action);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{t("closeDialog.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {t("closeDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5 py-1">
          {/* Button: Minimize to Tray */}
          <Button
            type="button"
            variant="outline"
            className="group hover:border-primary/50 hover:bg-accent/60 h-auto w-full cursor-pointer justify-start gap-3 rounded-lg border p-3 text-left transition-all"
            onClick={() => handleAction("minimize")}
          >
            <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors">
              <MonitorDown className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-foreground text-sm font-medium">
                {isMac ? t("closeDialog.minimizeTitleMac") : t("closeDialog.minimizeTitle")}
              </div>
              <div className="text-muted-foreground text-xs font-normal">
                {isMac ? t("closeDialog.minimizeDescMac") : t("closeDialog.minimizeDesc")}
              </div>
            </div>
          </Button>

          {/* Button: Exit Program */}
          <Button
            type="button"
            variant="outline"
            className="group hover:border-destructive/50 hover:bg-destructive/10 h-auto w-full cursor-pointer justify-start gap-3 rounded-lg border p-3 text-left transition-all"
            onClick={() => handleAction("exit")}
          >
            <div className="bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-destructive-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors">
              <Power className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-foreground text-sm font-medium">
                {t("closeDialog.exitTitle")}
              </div>
              <div className="text-muted-foreground text-xs font-normal">
                {t("closeDialog.exitDesc")}
              </div>
            </div>
          </Button>
        </div>

        {/* Remember choice checkbox */}
        <div className="flex flex-col gap-1 pt-1 pb-0.5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-choice"
              checked={rememberChoice}
              onCheckedChange={(checked) => setRememberChoice(!!checked)}
            />
            <label
              htmlFor="remember-choice"
              className="text-foreground/90 cursor-pointer text-xs font-medium select-none"
            >
              {t("closeDialog.rememberChoice")}
            </label>
          </div>
          {rememberChoice && (
            <p className="text-muted-foreground pl-6 text-[11px]">
              {t("closeDialog.rememberHint")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
