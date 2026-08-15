alter table public.receipt_item_assignments
  drop constraint receipt_item_assignments_participant_id_fkey,
  add constraint receipt_item_assignments_participant_id_fkey
    foreign key (participant_id)
    references public.bill_participants(id)
    on delete cascade;
