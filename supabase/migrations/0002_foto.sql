-- Spazio privato per le foto delle carte (quando il catalogo non ha l'immagine).
-- Ogni utente scrive e legge solo nella propria cartella: foto/<id utente>/...

insert into storage.buckets (id, name, public)
values ('foto', 'foto', false)
on conflict (id) do nothing;

drop policy if exists "foto_solo_proprietario" on storage.objects;
create policy "foto_solo_proprietario" on storage.objects
  for all to authenticated
  using (bucket_id = 'foto' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'foto' and (storage.foldername(name))[1] = auth.uid()::text);
