drop extension if exists "pg_net";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.copy_meal_estimates(source_meal_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  result json;
begin
  select json_build_object(
    'calories_min', calories_min,
    'calories_max', calories_max,
    'protein_g_min', protein_g_min,
    'protein_g_max', protein_g_max,
    'carbs_g_min', carbs_g_min,
    'carbs_g_max', carbs_g_max,
    'fat_g_min', fat_g_min,
    'fat_g_max', fat_g_max,
    'alcohol_g', alcohol_g,
    'alcohol_calories', alcohol_calories,
    'uncertainty', uncertainty
  )
  into result
  from meal_entries
  where id = source_meal_id
    and user_id = auth.uid();

  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_daily_totals(target_date date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  result json;
begin
  select json_build_object(
    'calories', coalesce(sum(
      case
        when portion_level = 'light' then calories_min
        when portion_level = 'heavy' then calories_max
        else (calories_min + calories_max) / 2.0
      end + alcohol_calories
    ), 0),
    'protein_g', coalesce(sum(
      case
        when portion_level = 'light' then protein_g_min
        when portion_level = 'heavy' then protein_g_max
        else (protein_g_min + protein_g_max) / 2.0
      end
    ), 0),
    'carbs_g', coalesce(sum(
      case
        when portion_level = 'light' then carbs_g_min
        when portion_level = 'heavy' then carbs_g_max
        else (carbs_g_min + carbs_g_max) / 2.0
      end
    ), 0),
    'fat_g', coalesce(sum(
      case
        when portion_level = 'light' then fat_g_min
        when portion_level = 'heavy' then fat_g_max
        else (fat_g_min + fat_g_max) / 2.0
      end
    ), 0)
  )
  into result
  from meal_entries
  where user_id = auth.uid()
    and date_local = target_date;

  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_weekly_totals(week_start_date date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  result json;
  week_end_date date;
begin
  -- Calculate week end (Sunday, 6 days after Monday)
  week_end_date := week_start_date + interval '6 days';

  select json_build_object(
    'calories', coalesce(sum(
      case
        when portion_level = 'light' then calories_min
        when portion_level = 'heavy' then calories_max
        else (calories_min + calories_max) / 2.0
      end + alcohol_calories
    ), 0),
    'protein_g', coalesce(sum(
      case
        when portion_level = 'light' then protein_g_min
        when portion_level = 'heavy' then protein_g_max
        else (protein_g_min + protein_g_max) / 2.0
      end
    ), 0),
    'carbs_g', coalesce(sum(
      case
        when portion_level = 'light' then carbs_g_min
        when portion_level = 'heavy' then carbs_g_max
        else (carbs_g_min + carbs_g_max) / 2.0
      end
    ), 0),
    'fat_g', coalesce(sum(
      case
        when portion_level = 'light' then fat_g_min
        when portion_level = 'heavy' then fat_g_max
        else (fat_g_min + fat_g_max) / 2.0
      end
    ), 0)
  )
  into result
  from meal_entries
  where user_id = auth.uid()
    and date_local >= week_start_date
    and date_local <= week_end_date;

  return result;
end;
$function$
;


