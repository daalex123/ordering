"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX_BYTES = 5 * 1024 * 1024;

export function ProductImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (!ACCEPT.split(",").includes(file.type)) {
        toast.error("Use PNG, JPG, WebP, or GIF");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("Image must be under 5MB");
        return;
      }

      setUploading(true);
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) {
        setUploading(false);
        toast.error(error.message);
        return;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      onChange(data.publicUrl);
      setUploading(false);
      toast.success("Image uploaded");
    },
    [onChange],
  );

  function onFiles(files: FileList | File[] | null) {
    const file = files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex min-h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/40 transition",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/60",
          uploading && "pointer-events-none opacity-70",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Product preview"
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}

        <div
          className={cn(
            "relative z-10 flex flex-col items-center gap-2 px-4 py-6 text-center",
            value && "rounded-xl bg-black/45 text-white backdrop-blur-sm",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-8 animate-spin" />
              <p className="text-sm font-medium">Uploading…</p>
            </>
          ) : (
            <>
              {value ? (
                <Upload className="size-7" />
              ) : (
                <ImagePlus className="size-8 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {value ? "Replace image" : "Drop image here"}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    value ? "text-white/80" : "text-muted-foreground",
                  )}
                >
                  or click to browse · PNG, JPG, WebP · max 5MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {value ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          >
            <Trash2 className="size-3.5" />
            Remove image
          </Button>
        </div>
      ) : null}
    </div>
  );
}
