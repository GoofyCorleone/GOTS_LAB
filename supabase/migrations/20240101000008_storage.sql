-- Create storage bucket for inventory images
insert into storage.buckets (id, name, public)
values ('inventory-images', 'inventory-images', true)
on conflict (id) do nothing;

-- Storage policies for inventory-images bucket
-- Allow authenticated users to upload images
create policy "inventory_images_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'inventory-images' and
    auth.role() = 'authenticated'
  );

-- Allow anyone to view images (public read)
create policy "inventory_images_select" on storage.objects
  for select to public
  using (bucket_id = 'inventory-images');

-- Allow uploaders to delete their own images
create policy "inventory_images_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'inventory-images' and
    auth.uid() = owner
  );
