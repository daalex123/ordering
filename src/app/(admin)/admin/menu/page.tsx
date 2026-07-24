"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Category, Product } from "@/types/database";
import { formatMoney } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductImageField } from "@/components/admin/product-image-field";
import { cn } from "@/lib/utils";

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catName, setCatName] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    image_url: "",
    is_available: true,
  });

  const categoryItems = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
    ]);
    setCategories((cats ?? []) as Category[]);
    setProducts((prods ?? []) as Product[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const available = products.filter((p) => p.is_available).length;
    return {
      categories: categories.length,
      products: products.length,
      available,
      hidden: products.length - available,
    };
  }, [categories, products]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("categories").insert({
      name: catName.trim(),
      sort_order: categories.length + 1,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setCatName("");
    toast.success("Category added");
    void load();
  }

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      price: "",
      category_id: categories[0]?.id ?? "",
      image_url: "",
      is_available: true,
    });
    setOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      category_id: product.category_id,
      image_url: product.image_url ?? "",
      is_available: product.is_available,
    });
    setOpen(true);
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category_id) {
      toast.error("Select a category");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      category_id: form.category_id,
      image_url: form.image_url.trim() || null,
      is_available: form.is_available,
    };
    setSaving(true);
    const supabase = createClient();
    if (editing) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editing.id);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Product created");
    }
    setOpen(false);
    void load();
  }

  async function toggleAvailability(product: Product) {
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_available: !product.is_available })
      .eq("id", product.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void load();
  }

  async function deleteProduct(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    void load();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Menu"
        description="Categories and products customers can order"
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add product
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(92vh,900px)] w-full gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b px-5 py-4 pr-12">
            <DialogTitle className="text-lg">
              {editing ? "Edit product" : "New product"}
            </DialogTitle>
            <DialogDescription>
              Photo, pricing, and category for the customer menu
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={saveProduct}
            className="max-h-[calc(min(92vh,900px)-5.5rem)] overflow-y-auto"
          >
            <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,14rem)_1fr]">
              <div className="space-y-2">
                <Label>Photo</Label>
                <ProductImageField
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product-name">Name</Label>
                  <Input
                    id="product-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Chicken Biryani"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-description">Description</Label>
                  <Textarea
                    id="product-description"
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Short description shown on the menu"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="product-price">Price (LKR)</Label>
                    <Input
                      id="product-price"
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={form.category_id || null}
                      onValueChange={(v) => {
                        if (v) setForm({ ...form, category_id: v });
                      }}
                      items={categoryItems}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) =>
                      setForm({ ...form, is_available: e.target.checked })
                    }
                  />
                  Available on the menu
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t bg-muted/40 px-5 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.category_id}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Categories" value={String(summary.categories)} />
        <SummaryTile label="Products" value={String(summary.products)} />
        <SummaryTile
          label="On menu"
          value={`${summary.available}`}
          hint={`${summary.hidden} hidden`}
        />
      </div>

      <div className="admin-panel rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Add category</h2>
        <form onSubmit={addCategory} className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="e.g. Mains, Drinks, Desserts"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            className="bg-white/80"
          />
          <Button type="submit" variant="secondary" className="shrink-0">
            <Plus className="size-4" />
            Add category
          </Button>
        </form>
      </div>

      <div className="space-y-5">
        {categories.map((cat) => {
          const list = products.filter((p) => p.category_id === cat.id);
          return (
            <section key={cat.id} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-heading text-lg font-semibold tracking-tight">
                  {cat.name}
                </h2>
                <Badge variant="secondary">{list.length} items</Badge>
              </div>
              <div className="space-y-2">
                {list.map((product) => (
                  <div
                    key={product.id}
                    className={cn(
                      "admin-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3",
                      !product.is_available && "opacity-70",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <UtensilsCrossed className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {formatMoney(Number(product.price))}
                          {product.description ? (
                            <span className="ml-2 hidden sm:inline">
                              · {product.description.slice(0, 48)}
                              {product.description.length > 48 ? "…" : ""}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={product.is_available ? "default" : "secondary"}
                      >
                        {product.is_available ? "Available" : "Hidden"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAvailability(product)}
                      >
                        {product.is_available ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                        {product.is_available ? "Hide" : "Show"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEdit(product)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteProduct(product.id)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {list.length === 0 ? (
                  <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    No products in this category yet
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
        {categories.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            Add a category to start building your menu
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="admin-panel rounded-2xl p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
