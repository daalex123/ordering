"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Category, Product, ProductPortion } from "@/types/database";
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

type ProductRow = Product & { product_portions: ProductPortion[] };

type PortionDraft = {
  key: string;
  name: string;
  price: string;
  is_available: boolean;
};

const PORTION_SIZE_OPTIONS = ["Small", "Medium", "Large"] as const;

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category_id: "",
  image_url: "",
  is_available: true,
};

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [catName, setCatName] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [portions, setPortions] = useState<PortionDraft[]>([]);

  const categoryItems = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase
        .from("products")
        .select("*, product_portions(*)")
        .order("sort_order"),
    ]);
    setCategories((cats ?? []) as Category[]);
    const rows = ((prods ?? []) as ProductRow[]).map((p) => ({
      ...p,
      product_portions: [...(p.product_portions ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    }));
    setProducts(rows);
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
      ...EMPTY_FORM,
      category_id: categories[0]?.id ?? "",
    });
    setPortions([]);
    setOpen(true);
  }

  function openEdit(product: ProductRow) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      category_id: product.category_id,
      image_url: product.image_url ?? "",
      is_available: product.is_available,
    });
    setPortions(
      (product.product_portions ?? []).map((p) => ({
        key: p.id,
        name: p.name,
        price: String(p.price),
        is_available: p.is_available,
      })),
    );
    setOpen(true);
  }

  function nextPortionName(existing: PortionDraft[]) {
    const used = new Set(existing.map((p) => p.name));
    return (
      PORTION_SIZE_OPTIONS.find((name) => !used.has(name)) ??
      PORTION_SIZE_OPTIONS[0]
    );
  }

  function addPortion() {
    setPortions((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        name: nextPortionName(prev),
        price: form.price || "",
        is_available: true,
      },
    ]);
  }

  function addStandardPortions() {
    const base = Number(form.price) || 0;
    const small = base > 0 ? String(Math.round(base * 0.75 * 100) / 100) : "";
    const medium = base > 0 ? String(Math.round(base * 0.9 * 100) / 100) : "";
    const large = form.price || "";
    setPortions([
      {
        key: crypto.randomUUID(),
        name: "Small",
        price: small,
        is_available: true,
      },
      {
        key: crypto.randomUUID(),
        name: "Medium",
        price: medium,
        is_available: true,
      },
      {
        key: crypto.randomUUID(),
        name: "Large",
        price: large,
        is_available: true,
      },
    ]);
  }

  function updatePortion(
    key: string,
    patch: Partial<Omit<PortionDraft, "key">>,
  ) {
    setPortions((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    );
  }

  function removePortion(key: string) {
    setPortions((prev) => prev.filter((p) => p.key !== key));
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category_id) {
      toast.error("Select a category");
      return;
    }

    const cleanedPortions = portions
      .map((p) => ({
        name: p.name.trim(),
        price: Number(p.price),
        is_available: p.is_available,
      }))
      .filter((p) => p.name.length > 0);

    for (const p of cleanedPortions) {
      if (!Number.isFinite(p.price) || p.price < 0) {
        toast.error(`Invalid price for portion “${p.name}”`);
        return;
      }
    }

    const names = cleanedPortions.map((p) => p.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      toast.error("Portion names must be unique");
      return;
    }

    const basePrice =
      cleanedPortions.length > 0
        ? Math.min(...cleanedPortions.map((p) => p.price))
        : Number(form.price);

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      toast.error("Enter a valid price");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: basePrice,
      category_id: form.category_id,
      image_url: form.image_url.trim() || null,
      is_available: form.is_available,
    };

    setSaving(true);
    const supabase = createClient();
    let productId = editing?.id;

    if (editing) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        setSaving(false);
        toast.error(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        setSaving(false);
        toast.error(error?.message ?? "Could not create product");
        return;
      }
      productId = data.id;
    }

    if (!productId) {
      setSaving(false);
      toast.error("Missing product id");
      return;
    }

    const { error: delError } = await supabase
      .from("product_portions")
      .delete()
      .eq("product_id", productId);
    if (delError) {
      setSaving(false);
      toast.error(delError.message);
      return;
    }

    if (cleanedPortions.length > 0) {
      const { error: portionError } = await supabase
        .from("product_portions")
        .insert(
          cleanedPortions.map((p, index) => ({
            product_id: productId,
            name: p.name,
            price: p.price,
            is_available: p.is_available,
            sort_order: index + 1,
          })),
        );
      if (portionError) {
        setSaving(false);
        toast.error(portionError.message);
        return;
      }
    }

    setSaving(false);
    toast.success(editing ? "Product updated" : "Product created");
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
        description="Categories, products, and portion sizes"
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
              Photo, pricing, portions, and category for the customer menu
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
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Short description shown on the menu"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="product-price">
                      {portions.length > 0
                        ? "Base / from price (auto)"
                        : "Price (LKR)"}
                    </Label>
                    <Input
                      id="product-price"
                      required={portions.length === 0}
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        portions.length > 0
                          ? String(
                              Math.min(
                                ...portions
                                  .map((p) => Number(p.price))
                                  .filter((n) => Number.isFinite(n) && n >= 0),
                                Number(form.price) || 0,
                              ),
                            )
                          : form.price
                      }
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                      disabled={portions.length > 0}
                    />
                    {portions.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Uses the lowest portion price on the menu
                      </p>
                    ) : null}
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

                <div className="space-y-3 rounded-2xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">Portion sizes</p>
                      <p className="text-xs text-muted-foreground">
                        Optional — e.g. Small, Medium, Large
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {portions.length === 0 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={addStandardPortions}
                        >
                          Small / Medium / Large
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={addPortion}
                      >
                        <Plus className="size-3.5" />
                        Add size
                      </Button>
                    </div>
                  </div>

                  {portions.length === 0 ? (
                    <p className="rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                      No portions — customers buy at the single price above
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {portions.map((portion) => {
                        const sizeOptions = (
                          PORTION_SIZE_OPTIONS as readonly string[]
                        ).includes(portion.name)
                          ? [...PORTION_SIZE_OPTIONS]
                          : [portion.name, ...PORTION_SIZE_OPTIONS];
                        const sizeItems = sizeOptions.map((name) => ({
                          value: name,
                          label: name,
                        }));
                        return (
                          <div
                            key={portion.key}
                            className="grid gap-2 rounded-xl border bg-white p-2 sm:grid-cols-[1fr_7rem_auto_auto]"
                          >
                            <Select
                              value={portion.name || null}
                              onValueChange={(v) => {
                                if (v) {
                                  updatePortion(portion.key, { name: v });
                                }
                              }}
                              items={sizeItems}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                              <SelectContent>
                                {sizeOptions.map((name) => (
                                  <SelectItem key={name} value={name}>
                                    {name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              required
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Price"
                              value={portion.price}
                              onChange={(e) =>
                                updatePortion(portion.key, {
                                  price: e.target.value,
                                })
                              }
                            />
                            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={portion.is_available}
                                onChange={(e) =>
                                  updatePortion(portion.key, {
                                    is_available: e.target.checked,
                                  })
                                }
                              />
                              On
                            </label>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => removePortion(portion.key)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                {saving
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Create product"}
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
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          Add category
        </h2>
        <form
          onSubmit={addCategory}
          className="flex flex-col gap-2 sm:flex-row"
        >
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
                {list.map((product) => {
                  const portionCount = product.product_portions?.length ?? 0;
                  return (
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
                            {portionCount > 0
                              ? `From ${formatMoney(Number(product.price))} · ${portionCount} sizes`
                              : formatMoney(Number(product.price))}
                            {product.description ? (
                              <span className="ml-2 hidden sm:inline">
                                · {product.description.slice(0, 40)}
                                {product.description.length > 40 ? "…" : ""}
                              </span>
                            ) : null}
                          </p>
                          {portionCount > 0 ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {product.product_portions
                                .map(
                                  (p) =>
                                    `${p.name} ${formatMoney(Number(p.price))}`,
                                )
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            product.is_available ? "default" : "secondary"
                          }
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
                  );
                })}
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
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
