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

  return itemsWithAvailability;
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
    .order("name", { ascending: true });

  if (itemsError) {
    // Fallback to simple search if full-text search not available
    console.warn("Full-text search failed, using ILIKE:", itemsError);

    const { data: fallbackItems, error: fallbackError } = await supabase
      .from("inventory_items")
      .select("*")
      .or(`name.ilike.%${query}%,reference.ilike.%${query}%`)
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

  return itemsWithDetails;
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

  return {
    ...item,
    location: location || undefined,
    quantity_reserved: avail?.quantity_reserved || 0,
    quantity_available: avail?.quantity_available || (item as any).quantity_total,
  } as InventoryItemWithAvailability;
}
