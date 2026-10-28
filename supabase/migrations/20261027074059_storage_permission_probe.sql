-- Storage's rolled-back permission INSERT uses contentLength; its final object
-- INSERT uses size. Both must match the already charged, private reservation.
-- Client writes remain denied and finalization still requires actual size.
create or replace function private.guard_media_object() returns trigger language plpgsql security definer set search_path='' as $$
declare r private.quota_reservations;a public.media_assets;
begin
 if new.bucket_id<>'gather-images' then return new;end if;
 if TG_OP='UPDATE' and new.name=old.name and new.bucket_id=old.bucket_id and new.metadata is not distinct from old.metadata then return new;end if;
 select reservations.* into r from private.quota_reservations reservations where object_key=new.name and expires_at>now() for share;
 if not found then raise exception 'A valid upload reservation is required.' using errcode='42501';end if;
 select * into a from public.media_assets where id=r.media_id;
 if a.state<>'uploading' or not(coalesce(new.metadata ? 'size',false) or coalesce(new.metadata ? 'contentLength',false))
  or (new.metadata ? 'size' and (new.metadata->>'size')::bigint is distinct from r.bytes)
  or (new.metadata ? 'contentLength' and (new.metadata->>'contentLength')::bigint is distinct from r.bytes)
  or coalesce(new.metadata->>'mimetype',new.metadata->>'contentType') is distinct from a.mime then
  raise exception 'Stored bytes exceed or differ from the upload reservation.' using errcode='22023';end if;
 return new;
end $$;
