# Nota SQL — Agregar columna orden a pm_catalogo_modulos (2026-03-02)

## Contexto
Se realizó este ajuste porque el Portal PM mostraba error al consultar módulos.
El error observado fue: "column pm_catalogo_modulos.orden does not exist".
Este cambio permite ordenar correctamente los módulos en pantalla.

## SQL ejecutado
```sql
alter table public.pm_catalogo_modulos add column if not exists orden integer;
update public.pm_catalogo_modulos set orden = coalesce(orden, 999);
create index if not exists pm_catalogo_modulos_orden_idx on public.pm_catalogo_modulos (orden);
```

## Verificación
```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='pm_catalogo_modulos' and column_name='orden';

select id, codigo, nombre, orden
from public.pm_catalogo_modulos
order by orden asc, nombre asc
limit 20;
```

Este archivo es documentación; el cambio real se ejecutó en Supabase SQL Editor.
