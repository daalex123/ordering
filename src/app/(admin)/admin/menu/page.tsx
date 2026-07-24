"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catName, setCatName] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    image_url: "",
    is_available: true,
  });

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
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      category_id: form.category_id,
      image_url: form.image_url.trim() || null,
      is_available: form.is_available,
    };
    const supabase = createClient();
    if (editing) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert(payload);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Menu</h1>
          <p className="text-sm text-muted-foreground">
            Categories and products
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button
            onClick={() => {
              openCreate();
              setOpen(true);
            }}
          >
            Add product
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit product" : "New product"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={saveProduct} className="space-y-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => {
                    if (v) setForm({ ...form, category_id: v });
                  }}
                >
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={form.image_url}
                  onChange={(e) =>
                    setForm({ ...form, image_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) =>
                    setForm({ ...form, is_available: e.target.checked })
                  }
                />
                Available
              </label>
              <Button type="submit" className="w-full">
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <form onSubmit={addCategory} className="flex gap-2">
        <Input
          placeholder="New category name"
          value={catName}
          onChange={(e) => setCatName(e.target.value)}
        />
        <Button type="submit" variant="secondary">
          Add category
        </Button>
      </form>

      <div className="space-y-4">
        {categories.map((cat) => {
          const list = products.filter((p) => p.category_id === cat.id);
          return (
            <section key={cat.id} className="space-y-2">
              <h2 className="text-lg font-semibold">{cat.name}</h2>
              <div className="space-y-2">
                {list.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(Number(product.price))}
                      </p>
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
                        Toggle
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEdit(product)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteProduct(product.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No products</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
