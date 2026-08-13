-- 036_tl_hjul_oppsett.sql
-- TL-hjulet §11.1: opprett med rotasjoner og skriftstørrelse (som dagens
-- field_animation_spins / field_text_font_size). Additiv – ingen RLS-endring.
alter table tl_hjul
  add column if not exists rotasjoner    int not null default 6,
  add column if not exists skriftstorrelse int not null default 16;
