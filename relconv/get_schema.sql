-- Run once in Supabase (SQL editor). Used by SupabaseCrud.schema().
create or replace function get_schema() returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb) from (
    select
      c.table_name as table,
      c.column_name as col,
      c.data_type as type,
      ccu.table_name as ref
    from information_schema.columns c
    left join information_schema.key_column_usage kcu
      on c.table_schema = kcu.table_schema
     and c.table_name = kcu.table_name
     and c.column_name = kcu.column_name
    left join information_schema.constraint_column_usage ccu
      on kcu.constraint_name = ccu.constraint_name
     and kcu.table_schema = ccu.table_schema
    where c.table_schema = 'public'
    order by c.table_name, c.ordinal_position
  ) t;
$$;
