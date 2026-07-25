import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const supabase = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Location = Database["public"]["Tables"]["locations"]["Row"];
type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];

export interface LocationWithItems extends Location {
  items_count?: number;
}

export interface InventoryItemWithAvailability
  extends Omit<InventoryItem, "quantity_reserved"> {
  location?: Location;
  quantity_reserved?: number;
  quantity_available?: number;
}

/**
 * A lens kit's own row has quantity_total=1 (it's a single physical case),
 * which is meaningless once the kit is reserved lens-by-lens — showing
 * "1 total / 1 disponible" for a 10-lens kit is wrong even when 9 of its
 * lenses are actually reserved. For any item that has kit children,
 * overrides quantity_total/reserved/available with the sum across its
 * children (each child's own row already has the real per-lens numbers from
 * `availability`) so every listing/detail view shows kit-aware counts.
 */
async function applyKitAggregates(
  items: InventoryItemWithAvailability[],
  availability: any[] | null | undefined
): Promise<InventoryItemWithAvailability[]> {
  const { data: children, error } = await supabase
    .from("inventory_items")
    .select("id, kit_parent_id")
    .not("kit_parent_id", "is", null);

  if (error || !children || children.length === 0) {
    if (error) console.error("Error fetching kit children for aggregates:", error);
    return items;
  }

  const childIdsByParent = new Map<string, string[]>();
  for (const c of children as any[]) {
    const list = childIdsByParent.get(c.kit_parent_id) || [];
    list.push(c.id);
    childIdsByParent.set(c.kit_parent_id, list);
  }

  const availById = new Map((availability || []).map((a: any) => [a.inventory_item_id, a]));

  return items.map((item) => {
    const childIds = childIdsByParent.get(item.id);
    if (!childIds || childIds.length === 0) return item;

    let total = 0;
    let available = 0;
    for (const childId of childIds) {
      const a = availById.get(childId);
      total += a?.quantity_total ?? 1;
      available += a?.quantity_available ?? 1;
    }

    return {
      ...item,
      quantity_total: total,
      quantity_available: available,
      quantity_reserved: total - available,
    };
  });
}

/**
 * Get all locations grouped by type (cajon, armario)
 */
export async function getLocationsByType(type?: "cajon" | "armario") {
  let query = supabase
    .from("locations")
    .select("*")
    .order("type", { ascending: true })
    .order("number", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching locations:", error);
    throw new Error(
      `Failed to fetch locations: ${error.message || "Unknown error"}`
    );
  }

  return data as Location[];
}

/**
 * Get all inventory items for a specific location
 */
export async function getItemsByLocation(locationId: string) {
  const { data: items, error: itemsError } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("location_id", locationId)
    .is("kit_parent_id", null)
    .order("name", { ascending: true });

  if (itemsError) {
    console.error("Error fetching items by location:", itemsError);
    throw new Error(
      `Failed to fetch items: ${itemsError.message || "Unknown error"}`
    );
  }

  // Get location details
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("*")
    .eq("id", locationId)
    .single();

  if (locationError && locationError.code !== "PGRST116") {
    console.error("Error fetching location:", locationError);
    throw new Error(
      `Failed to fetch location: ${locationError.message || "Unknown error"}`
    );
  }

  // Get availability for all items
  const { data: availability, error: availabilityError } = await (supabase.rpc(
    "get_inventory_availability"
  ) as any);

  if (availabilityError) {
    console.error("Error fetching availability:", availabilityError);
    throw new Error(
      `Failed to fetch availability: ${availabilityError.message || "Unknown error"}`
    );
  }

  // Merge availability data with items
  const itemsWithAvailability = (items || []).map((item: any) => {
    const avail = (availability as any[])?.find(
      (a: any) => a.inventory_item_id === item.id
    );
    return {
      ...item,
      location: location || undefined,
      quantity_reserved: avail?.quantity_reserved || 0,
      quantity_available: avail?.quantity_available || item.quantity_total,
    } as InventoryItemWithAvailability;
  });

  return applyKitAggregates(itemsWithAvailability, availability);
}

/**
 * Get all distinct, non-null categories in use, sorted alphabetically
 */
export async function getCategories() {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("category")
    .not("category", "is", null);

  if (error) {
    console.error("Error fetching categories:", error);
    throw new Error(
      `Failed to fetch categories: ${error.message || "Unknown error"}`
    );
  }

  const unique = [...new Set((data || []).map((row: any) => row.category as string))];
  return unique.sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Get the distinct "caja" labels in use within a category (e.g. "Caja #1 de
 * Lentes"), plus how many items have no box, so the UI can offer a box-level
 * sub-navigation for categories that physically organize items into
 * numbered boxes. Returns an empty array for categories with no boxes.
 */
export async function getBoxLabelsByCategory(category: string) {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("box_label")
    .eq("category", category)
    .is("kit_parent_id", null);

  if (error) {
    console.error("Error fetching box labels:", error);
    throw new Error(
      `Failed to fetch box labels: ${error.message || "Unknown error"}`
    );
  }

  const rows = data || [];
  const boxLabels = [
    ...new Set(rows.map((r: any) => r.box_label as string | null).filter(Boolean) as string[]),
  ].sort((a, b) => a.localeCompare(b, "es"));
  const unboxedCount = rows.filter((r: any) => !r.box_label).length;

  return { boxLabels, unboxedCount };
}

/**
 * Get all inventory items for a specific category
 */
export async function getItemsByCategory(category: string, boxLabel?: string | null) {
  let query = supabase
    .from("inventory_items")
    .select("*")
    .eq("category", category)
    .is("kit_parent_id", null);

  if (boxLabel) {
    query = query.eq("box_label", boxLabel);
  } else if (boxLabel === null) {
    query = query.is("box_label", null);
  }

  const { data: items, error: itemsError } = await query.order("name", { ascending: true });

  if (itemsError) {
    console.error("Error fetching items by category:", itemsError);
    throw new Error(
      `Failed to fetch items: ${itemsError.message || "Unknown error"}`
    );
  }

  const locationIds = [...new Set((items || []).map((item: any) => item.location_id))];

  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("*")
    .in("id", locationIds);

  if (locationsError) {
    console.error("Error fetching locations:", locationsError);
  }

  const { data: availability, error: availabilityError } = await (supabase.rpc(
    "get_inventory_availability"
  ) as any);

  if (availabilityError) {
    console.error("Error fetching availability:", availabilityError);
  }

  const itemsWithAvailability = (items || []).map((item: any) => {
    const location = (locations as any[])?.find((l: any) => l.id === item.location_id);
    const avail = (availability as any[])?.find(
      (a: any) => a.inventory_item_id === item.id
    );
    return {
      ...item,
      location,
      quantity_reserved: avail?.quantity_reserved || 0,
      quantity_available: avail?.quantity_available || item.quantity_total,
    } as InventoryItemWithAvailability;
  });

  return applyKitAggregates(itemsWithAvailability, availability);
}

/**
 * Search items by name or reference (full-text search)
 */
export async function searchItems(query: string) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  // Use PostgreSQL full-text search via the GIN index
  let { data: items, error: itemsError } = await supabase
    .from("inventory_items")
    .select("*")
    .textSearch("search_vector", query, {
      type: "websearch",
      config: "spanish",
    })
    .is("kit_parent_id", null)
    .order("name", { ascending: true });

  if (itemsError) {
    // Fallback to simple search if full-text search not available
    console.warn("Full-text search failed, using ILIKE:", itemsError);

    const { data: fallbackItems, error: fallbackError } = await supabase
      .from("inventory_items")
      .select("*")
      .or(`name.ilike.%${query}%,reference.ilike.%${query}%`)
      .is("kit_parent_id", null)
      .order("name", { ascending: true });

    if (fallbackError) {
      console.error("Error searching items:", fallbackError);
      throw new Error(
        `Failed to search items: ${fallbackError.message || "Unknown error"}`
      );
    }

    items = fallbackItems;
  }

  // Get locations for all items
  const locationIds = [...new Set((items || []).map((item: any) => item.location_id))];

  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("*")
    .in("id", locationIds);

  if (locationsError) {
    console.error("Error fetching locations:", locationsError);
  }

  // Get availability for all items
  const { data: availability, error: availabilityError } = await (supabase.rpc(
    "get_inventory_availability"
  ) as any);

  if (availabilityError) {
    console.error("Error fetching availability:", availabilityError);
  }

  // Merge all data
  const itemsWithDetails = (items || []).map((item: any) => {
    const location = (locations as any[])?.find((l: any) => l.id === item.location_id);
    const avail = (availability as any[])?.find(
      (a: any) => a.inventory_item_id === item.id
    );

    return {
      ...item,
      location,
      quantity_reserved: avail?.quantity_reserved || 0,
      quantity_available: avail?.quantity_available || item.quantity_total,
    } as InventoryItemWithAvailability;
  });

  return applyKitAggregates(itemsWithDetails, availability);
}

/**
 * Get a single item with its availability details
 */
export async function getItemWithAvailability(itemId: string) {
  const { data: item, error: itemError } = await (supabase
    .from("inventory_items")
    .select("*")
    .eq("id", itemId)
    .single() as any);

  if (itemError) {
    console.error("Error fetching item:", itemError);
    throw new Error(
      `Failed to fetch item: ${itemError.message || "Unknown error"}`
    );
  }

  // Get location
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("*")
    .eq("id", (item as any).location_id)
    .single();

  if (locationError && locationError.code !== "PGRST116") {
    console.error("Error fetching location:", locationError);
  }

  // Get availability
  const { data: availability, error: availabilityError } = await (supabase.rpc(
    "get_inventory_availability"
  ) as any);

  if (availabilityError) {
    console.error("Error fetching availability:", availabilityError);
  }

  const avail = (availability as any[])?.find(
    (a: any) => a.inventory_item_id === (item as any).id
  );

  const withAvailability = {
    ...item,
    location: location || undefined,
    quantity_reserved: avail?.quantity_reserved || 0,
    quantity_available: avail?.quantity_available || (item as any).quantity_total,
  } as InventoryItemWithAvailability;

  const [enriched] = await applyKitAggregates([withAvailability], availability);
  return enriched;
}

/**
 * Get the individual pieces of a lens kit (e.g. the 10 lenses of Thorlabs
 * LSC01-A), each with its own live availability, so a user can reserve a
 * specific piece by reference instead of the whole kit.
 */
export async function getKitChildren(parentId: string) {
  const { data: items, error: itemsError } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("kit_parent_id", parentId)
    .order("name", { ascending: true });

  if (itemsError) {
    console.error("Error fetching kit children:", itemsError);
    throw new Error(
      `Failed to fetch kit children: ${itemsError.message || "Unknown error"}`
    );
  }

  const { data: availability, error: availabilityError } = await (supabase.rpc(
    "get_inventory_availability"
  ) as any);

  if (availabilityError) {
    console.error("Error fetching availability:", availabilityError);
  }

  return (items || []).map((item: any) => {
    const avail = (availability as any[])?.find(
      (a: any) => a.inventory_item_id === item.id
    );
    return {
      ...item,
      quantity_reserved: avail?.quantity_reserved || 0,
      quantity_available: avail?.quantity_available || item.quantity_total,
    } as InventoryItemWithAvailability;
  });
}
