--
-- PostgreSQL database dump
--

\restrict bMpeLcYZtuCHQnbYZeoZTard7XxTqLAV1shgrDeAENLpOIj29SOStrI7fg0gchU

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: item_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_category AS ENUM (
    'flower',
    'plant',
    'tree',
    'decoration',
    'extra',
    'atmosphere',
    'path_style'
);


--
-- Name: reward_source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reward_source_type AS ENUM (
    'study_session',
    'quest',
    'achievement',
    'streak_bonus',
    'boost'
);


--
-- Name: _grant_reward(uuid, public.reward_source_type, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._grant_reward(p_profile_id uuid, p_source_type public.reward_source_type, p_source_id uuid, p_xp_delta integer, p_coins_delta integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.reward_transactions (profile_id, source_type, source_id, xp_delta, coins_delta)
  values (p_profile_id, p_source_type, p_source_id, p_xp_delta, p_coins_delta)
  on conflict (source_type, source_id) do nothing;

  if found then
    update public.profiles
    set xp = xp + p_xp_delta,
        coins = coins + p_coins_delta
    where id = p_profile_id;
  end if;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: study_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer,
    pomodoro_mode text DEFAULT 'flexible'::text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    paused_at timestamp with time zone,
    paused_seconds integer DEFAULT 0 NOT NULL,
    CONSTRAINT ended_after_started CHECK (((ended_at IS NULL) OR (ended_at > started_at))),
    CONSTRAINT study_sessions_duration_seconds_check CHECK (((duration_seconds IS NULL) OR (duration_seconds >= 0))),
    CONSTRAINT study_sessions_paused_seconds_check CHECK ((paused_seconds >= 0))
);


--
-- Name: complete_study_session(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_study_session(p_session_id uuid) RETURNS public.study_sessions
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_session      public.study_sessions;
  v_profile_id   uuid;
  v_duration     integer;
  v_paused       integer;
  v_xp           integer;
  v_coins        integer;
begin
  select * into v_session
  from public.study_sessions
  where id = p_session_id and profile_id = auth.uid()
  for update;

  if not found then
    raise exception 'Session not found or not owned by caller';
  end if;

  if v_session.completed then
    return v_session; -- idempotent bei doppeltem Aufruf
  end if;

  v_profile_id := v_session.profile_id;

  -- Falls die Session beim Beenden noch pausiert ist (Client hat vor dem
  -- Beenden nicht fortgesetzt), das offene Pause-Intervall hier serverseitig
  -- abschließen, damit es garantiert nicht mitgezählt wird — unabhängig vom
  -- Client-Verhalten.
  v_paused := v_session.paused_seconds;
  if v_session.paused_at is not null then
    v_paused := v_paused + extract(epoch from (now() - v_session.paused_at))::integer;
  end if;

  -- Pausierte Zeit wird nie belohnt: von der reinen Wanduhr-Differenz wird
  -- die aufsummierte Pausenzeit abgezogen. greatest(0, ...) als Sicherheits-
  -- Clamp gegen Rundungsdifferenzen im Sekundenbereich.
  v_duration := greatest(
    0,
    extract(epoch from (now() - v_session.started_at))::integer - v_paused
  );

  -- FINALE FORMEL: simple linear, 2 XP pro voller Minute, kein Cap, kein
  -- Bonus. Bewusst als exaktes Vielfaches von coins gehalten (xp = 2 *
  -- coins), damit die Ökonomie für Spieler und beim Balancing leicht
  -- durchschaubar bleibt.
  v_xp := floor(v_duration / 60.0)::integer * 2;
  v_coins := floor(v_duration / 60.0)::integer; -- 1 Coin pro voller Minute

  update public.study_sessions
  set ended_at = now(),
      duration_seconds = v_duration,
      paused_seconds = v_paused,
      paused_at = null,
      completed = true
  where id = p_session_id;

  perform public._grant_reward(v_profile_id, 'study_session', p_session_id, v_xp, v_coins);

  -- Set-basiertes Update: alle Pflanzen, die durch diese Session gerade
  -- fertig gewachsen sind, in EINEM Statement markieren (siehe Punkt 1)
  update public.garden_objects g
  set grown_at = now()
  from public.item_catalog ic
  where g.item_id = ic.id
    and g.profile_id = v_profile_id
    and g.grown_at is null
    and ic.growth_duration_seconds is not null
    and public.garden_object_growth_seconds(g.id) >= ic.growth_duration_seconds;

  perform public.sync_streak(v_profile_id);
  perform public.evaluate_quests(v_profile_id);
  perform public.evaluate_achievements(v_profile_id);

  select * into v_session from public.study_sessions where id = p_session_id;
  return v_session;
end;
$$;


--
-- Name: evaluate_achievements(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.evaluate_achievements(p_profile_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_ach        record;
  v_progress   integer;
  v_profile    public.profiles;
  v_ap_id      uuid;
begin
  select * into v_profile from public.profiles where id = p_profile_id;

  for v_ach in select * from public.achievements where active = true loop
    v_progress := case v_ach.condition ->> 'type'
      when 'total_study_hours' then (
        select coalesce(floor(sum(duration_seconds) / 3600.0), 0)::integer
        from public.study_sessions
        where profile_id = p_profile_id and completed = true
      )
      when 'streak' then v_profile.longest_streak
      else 0
    end;

    insert into public.achievement_progress (profile_id, achievement_id, progress_value)
    values (p_profile_id, v_ach.id, v_progress)
    on conflict (profile_id, achievement_id)
    do update set progress_value = excluded.progress_value
    where public.achievement_progress.completed_at is null;

    update public.achievement_progress
    set completed_at = now()
    where profile_id = p_profile_id
      and achievement_id = v_ach.id
      and completed_at is null
      and progress_value >= (v_ach.condition ->> 'target')::integer
    returning id into v_ap_id;

    if v_ap_id is not null then
      perform public._grant_reward(p_profile_id, 'achievement', v_ap_id, v_ach.xp_reward, v_ach.coin_reward);
    end if;
  end loop;
end;
$$;


--
-- Name: evaluate_quests(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.evaluate_quests(p_profile_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_quest      record;
  v_today      date;
  v_tz         text;
  v_progress   integer;
  v_qp_id      uuid;
begin
  select timezone into v_tz from public.profiles where id = p_profile_id;
  v_today := (now() at time zone v_tz)::date;

  for v_quest in select * from public.quests where active = true loop
    v_progress := case v_quest.condition ->> 'type'
      when 'study_minutes' then (
        select coalesce(floor(sum(duration_seconds) / 60.0), 0)::integer
        from public.study_sessions
        where profile_id = p_profile_id
          and completed = true
          and (started_at at time zone v_tz)::date = v_today
      )
      when 'todos_completed' then (
        select count(*)::integer
        from public.todos
        where profile_id = p_profile_id
          and completed_at is not null
          and (completed_at at time zone v_tz)::date = v_today
      )
      else 0
    end;

    insert into public.quest_progress (profile_id, quest_id, quest_date, progress_value)
    values (p_profile_id, v_quest.id, v_today, v_progress)
    on conflict (profile_id, quest_id, quest_date)
    do update set progress_value = excluded.progress_value
    where public.quest_progress.completed_at is null;

    update public.quest_progress
    set completed_at = now()
    where profile_id = p_profile_id
      and quest_id = v_quest.id
      and quest_date = v_today
      and completed_at is null
      and progress_value >= (v_quest.condition ->> 'target')::integer
    returning id into v_qp_id;

    if v_qp_id is not null then
      perform public._grant_reward(p_profile_id, 'quest', v_qp_id, v_quest.xp_reward, v_quest.coin_reward);
    end if;
  end loop;
end;
$$;


--
-- Name: garden_object_growth_seconds(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.garden_object_growth_seconds(p_garden_object_id uuid) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  select coalesce(sum(s.duration_seconds), 0)::integer
  from public.study_sessions s
  join public.garden_objects g on g.profile_id = s.profile_id
  where g.id = p_garden_object_id
    and g.grown_at is null
    and s.completed = true
    and s.started_at >= g.planted_at;
$$;


--
-- Name: get_level(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_level(p_xp integer) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  select coalesce(max(level), 1)
  from public.level_thresholds
  where xp_required <= p_xp;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Learner'),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  );

  insert into public.study_room_settings (profile_id) values (new.id);

  return new;
end;
$$;


--
-- Name: handle_todo_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_todo_completion() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.done = true and (old.done is distinct from new.done) then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.done = false then
    new.completed_at := null;
  end if;
  return new;
end;
$$;


--
-- Name: handle_todo_completion_after(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_todo_completion_after() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.done = true and (old.done is distinct from new.done) then
    perform public.evaluate_quests(new.profile_id);
  end if;
  return new;
end;
$$;


--
-- Name: pause_study_session(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pause_study_session(p_session_id uuid) RETURNS public.study_sessions
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_session public.study_sessions;
begin
  select * into v_session
  from public.study_sessions
  where id = p_session_id and profile_id = auth.uid()
  for update;

  if not found then
    raise exception 'Session not found or not owned by caller';
  end if;

  if v_session.completed then
    raise exception 'Session already completed';
  end if;

  if v_session.paused_at is null then
    update public.study_sessions
    set paused_at = now()
    where id = p_session_id
    returning * into v_session;
  end if;

  return v_session;
end;
$$;


--
-- Name: garden_objects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.garden_objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    item_id uuid NOT NULL,
    world_id integer NOT NULL,
    pos_x double precision DEFAULT 0 NOT NULL,
    pos_y double precision DEFAULT 0 NOT NULL,
    rotation double precision DEFAULT 0 NOT NULL,
    scale double precision DEFAULT 1 NOT NULL,
    planted_at timestamp with time zone DEFAULT now() NOT NULL,
    grown_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    grid_x integer NOT NULL,
    grid_y integer NOT NULL,
    CONSTRAINT garden_objects_rotation_check CHECK (((rotation >= (0)::double precision) AND (rotation < (360)::double precision))),
    CONSTRAINT garden_objects_scale_check CHECK ((scale > (0)::double precision))
);


--
-- Name: place_garden_object(uuid, integer, integer, integer, double precision, double precision, double precision, double precision, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.place_garden_object(p_item_id uuid, p_world_id integer, p_grid_x integer, p_grid_y integer, p_pos_x double precision DEFAULT 50, p_pos_y double precision DEFAULT 50, p_rotation double precision DEFAULT 0, p_scale double precision DEFAULT 1, p_use_grown boolean DEFAULT false) RETURNS public.garden_objects
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_profile_id     uuid := auth.uid();
  v_item           public.item_catalog;
  v_world          public.worlds;
  v_obj            public.garden_objects;
  v_path_shape     text;
  v_style_item_id  uuid;
  v_style_owned    boolean;
begin
  select * into v_item from public.item_catalog where id = p_item_id and active = true;
  if not found then
    raise exception 'Item not found or inactive';
  end if;

  if not v_item.placeable then
    raise exception 'Item is not placeable';
  end if;

  if v_item.world_id is not null and v_item.world_id <> p_world_id then
    raise exception 'Item is not available in this world';
  end if;

  select * into v_world from public.worlds where id = p_world_id;
  if not found then
    raise exception 'World not found';
  end if;

  -- Weltgrenzen: der gesamte Footprint (nicht nur die obere linke Ecke)
  -- muss innerhalb von 0..grid_width-1 x 0..grid_height-1 liegen.
  if p_grid_x < 0 or p_grid_y < 0
     or p_grid_x + v_item.footprint_width  > v_world.grid_width
     or p_grid_y + v_item.footprint_height > v_world.grid_height then
    raise exception 'Placement is outside world grid bounds';
  end if;

  -- Serialisiert Platzierungen desselben Nutzers/derselben Welt innerhalb
  -- dieser Transaktion, damit zwei nahezu gleichzeitige Requests nicht
  -- beide dieselbe freie Zelle als "frei" sehen und kollidierend
  -- einfügen. Wird am Transaktionsende automatisch freigegeben.
  perform pg_advisory_xact_lock(hashtextextended(v_profile_id::text || ':' || p_world_id::text, 0));

  -- Kollision: Achsen-parallele Rechteck-Überlappung (AABB) zwischen dem
  -- neuen Footprint und jedem bereits platzierten Objekt desselben Nutzers
  -- in derselben Welt.
  if exists (
    select 1
    from public.garden_objects go
    join public.item_catalog ic on ic.id = go.item_id
    where go.profile_id = v_profile_id
      and go.world_id = p_world_id
      and p_grid_x < go.grid_x + ic.footprint_width
      and p_grid_x + v_item.footprint_width > go.grid_x
      and p_grid_y < go.grid_y + ic.footprint_height
      and p_grid_y + v_item.footprint_height > go.grid_y
  ) then
    raise exception 'Grid cells already occupied';
  end if;

  v_path_shape := v_item.attributes ->> 'path_shape';

  if v_path_shape is not null then
    -- Wegstück: kein Inventar-Verbrauch -- die Berechtigung kommt aus dem
    -- einmalig gekauften Stil-Freischalt-Item (siehe sql/path-items.sql
    -- und sql/paths-unlimited-placement.sql). Unbegrenzt oft platzierbar,
    -- sobald der Stil einmal gekauft wurde.
    v_style_item_id := (v_item.attributes ->> 'path_style_item_id')::uuid;

    if v_style_item_id is null then
      raise exception 'Path item % is missing attributes.path_style_item_id', v_item.name;
    end if;

    select exists (
      select 1 from public.inventory
      where profile_id = v_profile_id
        and item_id = v_style_item_id
        and quantity >= 1
    ) into v_style_owned;

    if not v_style_owned then
      raise exception 'Path style not unlocked yet.';
    end if;
  else
    -- Alle anderen Items: unverändertes Verhalten -- ein Exemplar aus dem
    -- Inventar verbrauchen.
    update public.inventory
    set quantity = quantity - 1, updated_at = now()
    where profile_id = v_profile_id
      and item_id = p_item_id
      and is_grown = p_use_grown
      and quantity > 0;

    if not found then
      raise exception 'Item not available in inventory';
    end if;
  end if;

  insert into public.garden_objects (
    profile_id, item_id, world_id, grid_x, grid_y, pos_x, pos_y, rotation, scale, planted_at, grown_at
  ) values (
    v_profile_id, p_item_id, p_world_id, p_grid_x, p_grid_y, p_pos_x, p_pos_y, p_rotation, p_scale,
    now(),
    -- Wegstücke wachsen nicht: grown_at bleibt null, auch wenn der Client
    -- p_use_grown mitschickt.
    case when p_use_grown and v_path_shape is null then now() else null end
  )
  returning * into v_obj;

  return v_obj;
end;
$$;


--
-- Name: protect_garden_object_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_garden_object_fields() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  -- complete_study_session() setzt grown_at direkt und läuft als postgres.
  if current_user = 'postgres' then
    return new;
  end if;
 
  if new.profile_id <> old.profile_id
     or new.item_id <> old.item_id
     or new.world_id <> old.world_id
     or new.planted_at <> old.planted_at
     or new.grown_at is distinct from old.grown_at then
    raise exception 'Only position, rotation and scale can be updated directly by clients';
  end if;
  return new;
end;
$$;


--
-- Name: protect_profile_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_profile_fields() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  -- SECURITY DEFINER Funktionen (_grant_reward, sync_streak, ...) laufen
  -- als postgres und dürfen diese Felder legitim schreiben.
  if current_user = 'postgres' then
    return new;
  end if;
 
  if new.xp <> old.xp
     or new.coins <> old.coins
     or new.current_streak <> old.current_streak
     or new.longest_streak <> old.longest_streak
     or new.last_study_date is distinct from old.last_study_date then
    raise exception 'xp, coins and streak fields cannot be modified directly by clients';
  end if;
  return new;
end;
$$;


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    item_id uuid NOT NULL,
    quantity integer NOT NULL,
    price_paid integer NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchases_price_paid_check CHECK ((price_paid >= 0)),
    CONSTRAINT purchases_quantity_check CHECK ((quantity > 0))
);


--
-- Name: purchase_item(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchase_item(p_item_id uuid, p_quantity integer DEFAULT 1) RETURNS public.purchases
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_profile_id     uuid := auth.uid();
  v_item           public.item_catalog;
  v_total_price    integer;
  v_purchase       public.purchases;
  v_level          integer;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select * into v_item from public.item_catalog where id = p_item_id and active = true;
  if not found then
    raise exception 'Item not found or inactive';
  end if;

  if not v_item.stackable and p_quantity > 1 then
    raise exception 'Item is not stackable, quantity must be 1';
  end if;

  -- Einmal-Kauf (z.B. Weg-Stile): nur kaufbar, solange der Nutzer das
  -- Item noch nicht besitzt.
  if coalesce((v_item.attributes ->> 'unlimited_placement')::boolean, false) then
    if p_quantity <> 1 then
      raise exception 'Item can only be purchased once, quantity must be 1';
    end if;

    -- Sperrt die Profilzeile bis Transaktionsende, damit zwei nahezu
    -- gleichzeitige Käufe nicht beide die Besitzprüfung passieren.
    perform 1 from public.profiles where id = v_profile_id for update;

    if exists (
      select 1 from public.inventory
      where profile_id = v_profile_id
        and item_id = p_item_id
        and quantity > 0
    ) then
      raise exception 'Item already owned';
    end if;
  end if;

  select public.get_level(xp) into v_level from public.profiles where id = v_profile_id;
  if v_level < v_item.unlock_level then
    raise exception 'Item requires level %, current level %', v_item.unlock_level, v_level;
  end if;

  v_total_price := v_item.price * p_quantity;

  update public.profiles
  set coins = coins - v_total_price
  where id = v_profile_id and coins >= v_total_price;

  if not found then
    raise exception 'Not enough coins';
  end if;

  insert into public.purchases (profile_id, item_id, quantity, price_paid)
  values (v_profile_id, p_item_id, p_quantity, v_total_price)
  returning * into v_purchase;

  insert into public.inventory (profile_id, item_id, is_grown, quantity)
  values (v_profile_id, p_item_id, false, p_quantity)
  on conflict (profile_id, item_id, is_grown)
  do update set quantity = public.inventory.quantity + excluded.quantity, updated_at = now();

  return v_purchase;
end;
$$;


--
-- Name: remove_garden_object(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_garden_object(p_garden_object_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_profile_id   uuid := auth.uid();
  v_obj          public.garden_objects;
  v_path_shape   text;
begin
  select * into v_obj
  from public.garden_objects
  where id = p_garden_object_id and profile_id = v_profile_id
  for update;

  if not found then
    raise exception 'Garden object not found';
  end if;

  select ic.attributes ->> 'path_shape' into v_path_shape
  from public.item_catalog ic
  where ic.id = v_obj.item_id;

  delete from public.garden_objects where id = p_garden_object_id;

  -- Wegstücke wurden beim Platzieren nie aus dem Inventar entnommen (siehe
  -- place_garden_object oben) -- beim Entfernen also auch nichts zurücklegen.
  if v_path_shape is null then
    insert into public.inventory (profile_id, item_id, is_grown, quantity)
    values (v_profile_id, v_obj.item_id, (v_obj.grown_at is not null), 1)
    on conflict (profile_id, item_id, is_grown)
    do update set quantity = public.inventory.quantity + 1, updated_at = now();
  end if;
end;
$$;


--
-- Name: resume_study_session(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resume_study_session(p_session_id uuid) RETURNS public.study_sessions
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_session public.study_sessions;
begin
  select * into v_session
  from public.study_sessions
  where id = p_session_id and profile_id = auth.uid()
  for update;

  if not found then
    raise exception 'Session not found or not owned by caller';
  end if;

  if v_session.completed then
    raise exception 'Session already completed';
  end if;

  if v_session.paused_at is not null then
    update public.study_sessions
    set paused_seconds = paused_seconds
          + extract(epoch from (now() - v_session.paused_at))::integer,
        paused_at = null
    where id = p_session_id
    returning * into v_session;
  end if;

  return v_session;
end;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: sync_streak(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_streak(p_profile_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_tz               text;
  v_today            date;
  v_last             date;
  v_cursor           date;
  v_streak           integer;
  v_freezer_item_id  uuid;
  v_freezer_qty      integer;
  v_daily_seconds    integer;
  v_min_seconds      integer;
  v_has_activity     boolean;
  v_broken           boolean := false;
begin
  select timezone, last_study_date, current_streak
    into v_tz, v_last, v_streak
  from public.profiles
  where id = p_profile_id
  for update;
 
  v_today := (now() at time zone v_tz)::date;
 
  -- Mindest-Lernzeit pro Tag aus app_config (Minuten -> Sekunden).
  select coalesce((value #>> '{}')::integer, 0) * 60
    into v_min_seconds
  from public.app_config
  where key = 'streak_min_minutes_per_day';
 
  v_min_seconds := coalesce(v_min_seconds, 0);
 
  if v_last is null then
    -- Allererster Lerntag überhaupt: prüfen, ob die heutige Aktivität die
    -- Mindest-Lernzeit erreicht. Falls ja, Streak mit 1 initialisieren.
    select coalesce(total_duration_seconds, 0) into v_daily_seconds
    from public.v_daily_activity
    where profile_id = p_profile_id and study_date = v_today;
 
    if coalesce(v_daily_seconds, 0) >= v_min_seconds then
      update public.profiles
      set current_streak = 1,
          longest_streak = greatest(longest_streak, 1),
          last_study_date = v_today
      where id = p_profile_id;
    end if;
 
    return;
  end if;
 
  -- Annahme: genau ein Katalog-Item ist per attributes als Streak Freezer markiert
  select id into v_freezer_item_id
  from public.item_catalog
  where category = 'extra' and attributes ->> 'effect' = 'streak_freezer'
  limit 1;
 
  v_cursor := v_last + 1;
 
  while v_cursor < v_today and not v_broken loop
    select coalesce(total_duration_seconds, 0) into v_daily_seconds
    from public.v_daily_activity
    where profile_id = p_profile_id and study_date = v_cursor;
 
    v_has_activity := coalesce(v_daily_seconds, 0) >= v_min_seconds;
 
    if not v_has_activity then
      v_freezer_qty := 0;
 
      if v_freezer_item_id is not null then
        select quantity into v_freezer_qty
        from public.inventory
        where profile_id = p_profile_id and item_id = v_freezer_item_id and is_grown = false
        for update;
      end if;
 
      if coalesce(v_freezer_qty, 0) > 0 then
        update public.inventory
        set quantity = quantity - 1, updated_at = now()
        where profile_id = p_profile_id and item_id = v_freezer_item_id and is_grown = false;
 
        insert into public.streak_freezer_log (profile_id, applied_for_date)
        values (p_profile_id, v_cursor)
        on conflict (profile_id, applied_for_date) do nothing;
      else
        v_streak := 0;
        v_broken := true;
      end if;
    end if;
 
    v_cursor := v_cursor + 1;
  end loop;
 
  select coalesce(total_duration_seconds, 0) into v_daily_seconds
  from public.v_daily_activity
  where profile_id = p_profile_id and study_date = v_today;
 
  v_has_activity := coalesce(v_daily_seconds, 0) >= v_min_seconds;
 
  if v_has_activity and v_last < v_today then
    v_streak := v_streak + 1;
    v_last := v_today;
  end if;
 
  update public.profiles
  set current_streak = v_streak,
      longest_streak = greatest(longest_streak, v_streak),
      last_study_date = v_last
  where id = p_profile_id;
end;
$$;


--
-- Name: achievement_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievement_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    progress_value integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    condition jsonb NOT NULL,
    xp_reward integer DEFAULT 0 NOT NULL,
    coin_reward integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT achievements_coin_reward_check CHECK ((coin_reward >= 0)),
    CONSTRAINT achievements_xp_reward_check CHECK ((xp_reward >= 0))
);


--
-- Name: app_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_config (
    key text NOT NULL,
    value jsonb NOT NULL
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    item_id uuid NOT NULL,
    is_grown boolean DEFAULT false NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_quantity_check CHECK ((quantity >= 0))
);


--
-- Name: item_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category public.item_category NOT NULL,
    price integer DEFAULT 0 NOT NULL,
    unlock_level integer DEFAULT 1 NOT NULL,
    world_id integer,
    stackable boolean DEFAULT true NOT NULL,
    consumable boolean DEFAULT false NOT NULL,
    placeable boolean DEFAULT true NOT NULL,
    growth_duration_seconds integer,
    image_asset_url text,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    footprint_width integer DEFAULT 1 NOT NULL,
    footprint_height integer DEFAULT 1 NOT NULL,
    CONSTRAINT growth_duration_required_for_growables CHECK ((((category = ANY (ARRAY['flower'::public.item_category, 'plant'::public.item_category])) AND (growth_duration_seconds IS NOT NULL)) OR (category <> ALL (ARRAY['flower'::public.item_category, 'plant'::public.item_category])))),
    CONSTRAINT item_catalog_footprint_height_check CHECK ((footprint_height > 0)),
    CONSTRAINT item_catalog_footprint_width_check CHECK ((footprint_width > 0)),
    CONSTRAINT item_catalog_growth_duration_seconds_check CHECK (((growth_duration_seconds IS NULL) OR (growth_duration_seconds > 0))),
    CONSTRAINT item_catalog_price_check CHECK ((price >= 0)),
    CONSTRAINT item_catalog_unlock_level_check CHECK ((unlock_level >= 1)),
    CONSTRAINT non_placeable_implies_not_growable CHECK (((placeable = true) OR (growth_duration_seconds IS NULL)))
);


--
-- Name: level_thresholds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.level_thresholds (
    level integer NOT NULL,
    xp_required integer NOT NULL,
    CONSTRAINT level_thresholds_level_check CHECK ((level >= 1)),
    CONSTRAINT level_thresholds_xp_required_check CHECK ((xp_required >= 0))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text DEFAULT 'Learner'::text NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    coins integer DEFAULT 0 NOT NULL,
    current_streak integer DEFAULT 0 NOT NULL,
    longest_streak integer DEFAULT 0 NOT NULL,
    last_study_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_coins_check CHECK ((coins >= 0)),
    CONSTRAINT profiles_current_streak_check CHECK ((current_streak >= 0)),
    CONSTRAINT profiles_longest_streak_check CHECK ((longest_streak >= 0)),
    CONSTRAINT profiles_xp_check CHECK ((xp >= 0))
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'Zustands-Cache pro User (XP/Coins/Streak). Level wird NICHT gespeichert, siehe get_level().';


--
-- Name: profiles_with_level; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.profiles_with_level WITH (security_invoker='true') AS
 SELECT id,
    display_name,
    timezone,
    xp,
    coins,
    current_streak,
    longest_streak,
    last_study_date,
    created_at,
    updated_at,
    public.get_level(xp) AS level
   FROM public.profiles p;


--
-- Name: quest_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quest_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    quest_id uuid NOT NULL,
    quest_date date DEFAULT (now())::date NOT NULL,
    progress_value integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    condition jsonb NOT NULL,
    xp_reward integer DEFAULT 0 NOT NULL,
    coin_reward integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quests_coin_reward_check CHECK ((coin_reward >= 0)),
    CONSTRAINT quests_xp_reward_check CHECK ((xp_reward >= 0))
);


--
-- Name: reward_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reward_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    source_type public.reward_source_type NOT NULL,
    source_id uuid,
    xp_delta integer DEFAULT 0 NOT NULL,
    coins_delta integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sound_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sound_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    asset_url text NOT NULL,
    unlock_level integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT sound_catalog_unlock_level_check CHECK ((unlock_level >= 1))
);


--
-- Name: streak_freezer_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.streak_freezer_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    applied_for_date date NOT NULL,
    used_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: study_room_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_room_settings (
    profile_id uuid NOT NULL,
    focus_minutes integer DEFAULT 25 NOT NULL,
    break_minutes integer DEFAULT 5 NOT NULL,
    sound_volumes jsonb DEFAULT '{}'::jsonb NOT NULL,
    background_world_id integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT study_room_settings_break_minutes_check CHECK ((break_minutes > 0)),
    CONSTRAINT study_room_settings_focus_minutes_check CHECK ((focus_minutes > 0))
);


--
-- Name: todos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.todos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    title text NOT NULL,
    done boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    due_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: v_daily_activity; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_daily_activity WITH (security_invoker='true') AS
 SELECT s.profile_id,
    ((s.started_at AT TIME ZONE p.timezone))::date AS study_date,
    sum(s.duration_seconds) AS total_duration_seconds,
    count(*) AS session_count,
    max(s.duration_seconds) AS longest_session_seconds
   FROM (public.study_sessions s
     JOIN public.profiles p ON ((p.id = s.profile_id)))
  WHERE (s.completed = true)
  GROUP BY s.profile_id, (((s.started_at AT TIME ZONE p.timezone))::date);


--
-- Name: v_weekly_study; Type: VIEW; Schema: public; Owner: -
-- (von Hand nachgetragen aus sql/journal-weekly-study.sql, 2026-11-17;
--  beim nächsten npm run db:dump wird dieser Block durch pg_dump ersetzt)
--

CREATE VIEW public.v_weekly_study WITH (security_invoker='true') AS
 WITH sessions AS (
         SELECT s.profile_id,
            s.started_at,
            s.duration_seconds,
            (date_trunc('week'::text, (s.started_at AT TIME ZONE p.timezone)))::date AS week_start
           FROM (public.study_sessions s
             JOIN public.profiles p ON ((p.id = s.profile_id)))
          WHERE ((s.completed = true) AND (COALESCE(s.duration_seconds, 0) > 0))
        ), weeks AS (
         SELECT sessions.profile_id,
            sessions.week_start,
            (sum(sessions.duration_seconds))::bigint AS total_seconds
           FROM sessions
          GROUP BY sessions.profile_id, sessions.week_start
        ), growth AS (
         SELECT se.profile_id,
            se.week_start,
            g.item_id,
            sum(se.duration_seconds) AS grown_seconds
           FROM ((sessions se
             JOIN public.garden_objects g ON (((g.profile_id = se.profile_id) AND (g.planted_at <= se.started_at) AND ((g.grown_at IS NULL) OR (se.started_at < g.grown_at)))))
             JOIN public.item_catalog ic ON (((ic.id = g.item_id) AND (ic.growth_duration_seconds IS NOT NULL))))
          GROUP BY se.profile_id, se.week_start, g.item_id
        ), top_item AS (
         SELECT DISTINCT ON (growth.profile_id, growth.week_start) growth.profile_id,
            growth.week_start,
            growth.item_id
           FROM growth
          ORDER BY growth.profile_id, growth.week_start, growth.grown_seconds DESC, growth.item_id
        )
 SELECT w.profile_id,
    w.week_start,
    w.total_seconds,
    t.item_id AS top_item_id
   FROM (weeks w
     LEFT JOIN top_item t USING (profile_id, week_start));


--
-- Name: v_world_stamps; Type: VIEW; Schema: public; Owner: -
-- (von Hand nachgetragen aus sql/journal-world-stamps.sql, 2026-11-17;
--  beim nächsten npm run db:dump wird dieser Block durch pg_dump ersetzt)
--

CREATE VIEW public.v_world_stamps WITH (security_invoker='true') AS
 WITH running AS (
         SELECT rt.profile_id,
            rt.created_at,
            sum(rt.xp_delta) OVER (PARTITION BY rt.profile_id ORDER BY rt.created_at, rt.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS xp_total
           FROM public.reward_transactions rt
        )
 SELECT p.id AS profile_id,
    w.id AS world_id,
    w.unlock_level,
        CASE
            WHEN (w.unlock_level <= 1) THEN p.created_at
            ELSE COALESCE(( SELECT min(r.created_at) AS min
               FROM running r
              WHERE ((r.profile_id = p.id) AND (public.get_level((r.xp_total)::integer) >= w.unlock_level))),
            CASE
                WHEN (public.get_level(p.xp) >= w.unlock_level) THEN COALESCE(( SELECT max(rt.created_at) AS max
                   FROM public.reward_transactions rt
                  WHERE (rt.profile_id = p.id)), p.created_at)
                ELSE NULL::timestamp with time zone
            END)
        END AS unlocked_at
   FROM (public.profiles p
     CROSS JOIN public.worlds w);


--
-- Name: v_garden_objects_with_progress; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_garden_objects_with_progress WITH (security_invoker='true') AS
 SELECT g.id,
    g.profile_id,
    g.item_id,
    g.world_id,
    g.pos_x,
    g.pos_y,
    g.rotation,
    g.scale,
    g.planted_at,
    g.grown_at,
    g.created_at,
    g.updated_at,
    g.grid_x,
    g.grid_y,
    ic.growth_duration_seconds,
        CASE
            WHEN (g.grown_at IS NOT NULL) THEN (100)::numeric
            WHEN (ic.growth_duration_seconds IS NULL) THEN NULL::numeric
            ELSE LEAST((100)::numeric, floor(((100.0 * (public.garden_object_growth_seconds(g.id))::numeric) / (ic.growth_duration_seconds)::numeric)))
        END AS growth_percent
   FROM (public.garden_objects g
     JOIN public.item_catalog ic ON ((ic.id = g.item_id)));


--
-- Name: worlds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worlds (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    unlock_level integer DEFAULT 1 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    grid_width integer DEFAULT 20 NOT NULL,
    grid_height integer DEFAULT 20 NOT NULL,
    CONSTRAINT worlds_grid_height_check CHECK ((grid_height > 0)),
    CONSTRAINT worlds_grid_width_check CHECK ((grid_width > 0)),
    CONSTRAINT worlds_unlock_level_check CHECK ((unlock_level >= 1))
);


--
-- Name: worlds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.worlds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: worlds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.worlds_id_seq OWNED BY public.worlds.id;


--
-- Name: worlds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worlds ALTER COLUMN id SET DEFAULT nextval('public.worlds_id_seq'::regclass);


--
-- Name: achievement_progress achievement_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_pkey PRIMARY KEY (id);


--
-- Name: achievement_progress achievement_progress_profile_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_profile_id_achievement_id_key UNIQUE (profile_id, achievement_id);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_pkey PRIMARY KEY (key);


--
-- Name: garden_objects garden_objects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garden_objects
    ADD CONSTRAINT garden_objects_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_profile_id_item_id_is_grown_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_profile_id_item_id_is_grown_key UNIQUE (profile_id, item_id, is_grown);


--
-- Name: item_catalog item_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_catalog
    ADD CONSTRAINT item_catalog_pkey PRIMARY KEY (id);


--
-- Name: level_thresholds level_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.level_thresholds
    ADD CONSTRAINT level_thresholds_pkey PRIMARY KEY (level);


--
-- Name: level_thresholds level_thresholds_xp_required_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.level_thresholds
    ADD CONSTRAINT level_thresholds_xp_required_key UNIQUE (xp_required);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: quest_progress quest_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quest_progress
    ADD CONSTRAINT quest_progress_pkey PRIMARY KEY (id);


--
-- Name: quest_progress quest_progress_profile_id_quest_id_quest_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quest_progress
    ADD CONSTRAINT quest_progress_profile_id_quest_id_quest_date_key UNIQUE (profile_id, quest_id, quest_date);


--
-- Name: quests quests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_pkey PRIMARY KEY (id);


--
-- Name: reward_transactions reward_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_transactions
    ADD CONSTRAINT reward_transactions_pkey PRIMARY KEY (id);


--
-- Name: reward_transactions reward_transactions_source_type_source_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_transactions
    ADD CONSTRAINT reward_transactions_source_type_source_id_key UNIQUE (source_type, source_id);


--
-- Name: sound_catalog sound_catalog_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sound_catalog
    ADD CONSTRAINT sound_catalog_name_key UNIQUE (name);


--
-- Name: sound_catalog sound_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sound_catalog
    ADD CONSTRAINT sound_catalog_pkey PRIMARY KEY (id);


--
-- Name: streak_freezer_log streak_freezer_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streak_freezer_log
    ADD CONSTRAINT streak_freezer_log_pkey PRIMARY KEY (id);


--
-- Name: streak_freezer_log streak_freezer_log_profile_id_applied_for_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streak_freezer_log
    ADD CONSTRAINT streak_freezer_log_profile_id_applied_for_date_key UNIQUE (profile_id, applied_for_date);


--
-- Name: study_room_settings study_room_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_room_settings
    ADD CONSTRAINT study_room_settings_pkey PRIMARY KEY (profile_id);


--
-- Name: study_sessions study_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_pkey PRIMARY KEY (id);


--
-- Name: todos todos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_pkey PRIMARY KEY (id);


--
-- Name: worlds worlds_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worlds
    ADD CONSTRAINT worlds_name_key UNIQUE (name);


--
-- Name: worlds worlds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worlds
    ADD CONSTRAINT worlds_pkey PRIMARY KEY (id);


--
-- Name: worlds worlds_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worlds
    ADD CONSTRAINT worlds_slug_key UNIQUE (slug);


--
-- Name: idx_garden_objects_growing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_garden_objects_growing ON public.garden_objects USING btree (profile_id) WHERE (grown_at IS NULL);


--
-- Name: idx_garden_objects_profile_world; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_garden_objects_profile_world ON public.garden_objects USING btree (profile_id, world_id);


--
-- Name: idx_garden_objects_profile_world_grid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_garden_objects_profile_world_grid ON public.garden_objects USING btree (profile_id, world_id, grid_x, grid_y);


--
-- Name: idx_item_catalog_category_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_catalog_category_active ON public.item_catalog USING btree (category, active);


--
-- Name: idx_item_catalog_world; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_catalog_world ON public.item_catalog USING btree (world_id);


--
-- Name: idx_purchases_profile_purchased; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_profile_purchased ON public.purchases USING btree (profile_id, purchased_at DESC);


--
-- Name: idx_quest_progress_profile_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quest_progress_profile_date ON public.quest_progress USING btree (profile_id, quest_date);


--
-- Name: idx_reward_transactions_profile_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_transactions_profile_created ON public.reward_transactions USING btree (profile_id, created_at DESC);


--
-- Name: idx_study_sessions_profile_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_sessions_profile_started ON public.study_sessions USING btree (profile_id, started_at DESC);


--
-- Name: idx_todos_profile_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_todos_profile_completed ON public.todos USING btree (profile_id, completed_at);


--
-- Name: idx_todos_profile_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_todos_profile_due ON public.todos USING btree (profile_id, due_date);


--
-- Name: garden_objects trg_garden_objects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_garden_objects_updated_at BEFORE UPDATE ON public.garden_objects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: inventory trg_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: item_catalog trg_item_catalog_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_item_catalog_updated_at BEFORE UPDATE ON public.item_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: garden_objects trg_protect_garden_object_fields; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_garden_object_fields BEFORE UPDATE ON public.garden_objects FOR EACH ROW EXECUTE FUNCTION public.protect_garden_object_fields();


--
-- Name: profiles trg_protect_profile_fields; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_profile_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();


--
-- Name: study_room_settings trg_study_room_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_study_room_settings_updated_at BEFORE UPDATE ON public.study_room_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: todos trg_todos_after_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_todos_after_update AFTER UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.handle_todo_completion_after();


--
-- Name: todos trg_todos_before_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_todos_before_update BEFORE UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.handle_todo_completion();


--
-- Name: achievement_progress achievement_progress_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- Name: achievement_progress achievement_progress_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: garden_objects garden_objects_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garden_objects
    ADD CONSTRAINT garden_objects_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item_catalog(id) ON DELETE RESTRICT;


--
-- Name: garden_objects garden_objects_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garden_objects
    ADD CONSTRAINT garden_objects_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: garden_objects garden_objects_world_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garden_objects
    ADD CONSTRAINT garden_objects_world_id_fkey FOREIGN KEY (world_id) REFERENCES public.worlds(id) ON DELETE RESTRICT;


--
-- Name: inventory inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item_catalog(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: item_catalog item_catalog_world_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_catalog
    ADD CONSTRAINT item_catalog_world_id_fkey FOREIGN KEY (world_id) REFERENCES public.worlds(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item_catalog(id) ON DELETE RESTRICT;


--
-- Name: purchases purchases_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: quest_progress quest_progress_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quest_progress
    ADD CONSTRAINT quest_progress_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: quest_progress quest_progress_quest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quest_progress
    ADD CONSTRAINT quest_progress_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.quests(id) ON DELETE CASCADE;


--
-- Name: reward_transactions reward_transactions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_transactions
    ADD CONSTRAINT reward_transactions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: streak_freezer_log streak_freezer_log_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streak_freezer_log
    ADD CONSTRAINT streak_freezer_log_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: study_room_settings study_room_settings_background_world_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_room_settings
    ADD CONSTRAINT study_room_settings_background_world_id_fkey FOREIGN KEY (background_world_id) REFERENCES public.worlds(id) ON DELETE SET NULL;


--
-- Name: study_room_settings study_room_settings_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_room_settings
    ADD CONSTRAINT study_room_settings_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: study_sessions study_sessions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: todos todos_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: achievement_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: achievement_progress achievement_progress_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY achievement_progress_select_own ON public.achievement_progress FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: achievements achievements_public_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY achievements_public_read_active ON public.achievements FOR SELECT USING ((active = true));


--
-- Name: app_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

--
-- Name: app_config app_config_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_config_public_read ON public.app_config FOR SELECT USING (true);


--
-- Name: garden_objects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.garden_objects ENABLE ROW LEVEL SECURITY;

--
-- Name: garden_objects garden_objects_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY garden_objects_select_own ON public.garden_objects FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: garden_objects garden_objects_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY garden_objects_update_own ON public.garden_objects FOR UPDATE USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory inventory_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_select_own ON public.inventory FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: item_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.item_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: item_catalog item_catalog_public_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY item_catalog_public_read_active ON public.item_catalog FOR SELECT USING ((active = true));


--
-- Name: level_thresholds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.level_thresholds ENABLE ROW LEVEL SECURITY;

--
-- Name: level_thresholds level_thresholds_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY level_thresholds_public_read ON public.level_thresholds FOR SELECT USING (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: purchases purchases_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchases_select_own ON public.purchases FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: quest_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: quest_progress quest_progress_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quest_progress_select_own ON public.quest_progress FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: quests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

--
-- Name: quests quests_public_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quests_public_read_active ON public.quests FOR SELECT USING ((active = true));


--
-- Name: reward_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: reward_transactions reward_transactions_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reward_transactions_select_own ON public.reward_transactions FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: sound_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sound_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: sound_catalog sound_catalog_public_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sound_catalog_public_read_active ON public.sound_catalog FOR SELECT USING ((active = true));


--
-- Name: streak_freezer_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.streak_freezer_log ENABLE ROW LEVEL SECURITY;

--
-- Name: streak_freezer_log streak_freezer_log_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY streak_freezer_log_select_own ON public.streak_freezer_log FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: study_room_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_room_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: study_room_settings study_room_settings_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY study_room_settings_select_own ON public.study_room_settings FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: study_room_settings study_room_settings_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY study_room_settings_update_own ON public.study_room_settings FOR UPDATE USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: study_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: study_sessions study_sessions_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY study_sessions_insert_own ON public.study_sessions FOR INSERT WITH CHECK (((auth.uid() = profile_id) AND (completed = false)));


--
-- Name: study_sessions study_sessions_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY study_sessions_select_own ON public.study_sessions FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: todos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

--
-- Name: todos todos_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY todos_delete_own ON public.todos FOR DELETE USING ((auth.uid() = profile_id));


--
-- Name: todos todos_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY todos_insert_own ON public.todos FOR INSERT WITH CHECK ((auth.uid() = profile_id));


--
-- Name: todos todos_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY todos_select_own ON public.todos FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: todos todos_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY todos_update_own ON public.todos FOR UPDATE USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: worlds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;

--
-- Name: worlds worlds_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY worlds_public_read ON public.worlds FOR SELECT USING (true);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION _grant_reward(p_profile_id uuid, p_source_type public.reward_source_type, p_source_id uuid, p_xp_delta integer, p_coins_delta integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._grant_reward(p_profile_id uuid, p_source_type public.reward_source_type, p_source_id uuid, p_xp_delta integer, p_coins_delta integer) FROM PUBLIC;


--
-- Name: TABLE study_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.study_sessions TO anon;
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.study_sessions TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.study_sessions TO service_role;


--
-- Name: FUNCTION complete_study_session(p_session_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.complete_study_session(p_session_id uuid) TO authenticated;


--
-- Name: FUNCTION evaluate_achievements(p_profile_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.evaluate_achievements(p_profile_id uuid) TO authenticated;


--
-- Name: FUNCTION evaluate_quests(p_profile_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.evaluate_quests(p_profile_id uuid) TO authenticated;


--
-- Name: FUNCTION get_level(p_xp integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_level(p_xp integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_level(p_xp integer) TO anon;


--
-- Name: FUNCTION pause_study_session(p_session_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pause_study_session(p_session_id uuid) TO authenticated;


--
-- Name: TABLE garden_objects; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.garden_objects TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.garden_objects TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.garden_objects TO service_role;


--
-- Name: FUNCTION place_garden_object(p_item_id uuid, p_world_id integer, p_grid_x integer, p_grid_y integer, p_pos_x double precision, p_pos_y double precision, p_rotation double precision, p_scale double precision, p_use_grown boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.place_garden_object(p_item_id uuid, p_world_id integer, p_grid_x integer, p_grid_y integer, p_pos_x double precision, p_pos_y double precision, p_rotation double precision, p_scale double precision, p_use_grown boolean) TO authenticated;


--
-- Name: TABLE purchases; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.purchases TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.purchases TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.purchases TO service_role;


--
-- Name: FUNCTION purchase_item(p_item_id uuid, p_quantity integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.purchase_item(p_item_id uuid, p_quantity integer) TO authenticated;


--
-- Name: FUNCTION remove_garden_object(p_garden_object_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.remove_garden_object(p_garden_object_id uuid) TO authenticated;


--
-- Name: FUNCTION resume_study_session(p_session_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.resume_study_session(p_session_id uuid) TO authenticated;


--
-- Name: FUNCTION sync_streak(p_profile_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_streak(p_profile_id uuid) TO authenticated;


--
-- Name: TABLE achievement_progress; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.achievement_progress TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.achievement_progress TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.achievement_progress TO service_role;


--
-- Name: TABLE achievements; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.achievements TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.achievements TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.achievements TO service_role;


--
-- Name: TABLE app_config; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.app_config TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.app_config TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.app_config TO service_role;


--
-- Name: TABLE inventory; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.inventory TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.inventory TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.inventory TO service_role;


--
-- Name: TABLE item_catalog; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.item_catalog TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.item_catalog TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.item_catalog TO service_role;


--
-- Name: TABLE level_thresholds; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.level_thresholds TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.level_thresholds TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.level_thresholds TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.profiles TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.profiles TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.profiles TO service_role;


--
-- Name: TABLE profiles_with_level; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.profiles_with_level TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.profiles_with_level TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.profiles_with_level TO service_role;


--
-- Name: TABLE quest_progress; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.quest_progress TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.quest_progress TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.quest_progress TO service_role;


--
-- Name: TABLE quests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.quests TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.quests TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.quests TO service_role;


--
-- Name: TABLE reward_transactions; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.reward_transactions TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.reward_transactions TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.reward_transactions TO service_role;


--
-- Name: TABLE sound_catalog; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.sound_catalog TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.sound_catalog TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.sound_catalog TO service_role;


--
-- Name: TABLE streak_freezer_log; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.streak_freezer_log TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.streak_freezer_log TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.streak_freezer_log TO service_role;


--
-- Name: TABLE study_room_settings; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.study_room_settings TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.study_room_settings TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.study_room_settings TO service_role;


--
-- Name: TABLE todos; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.todos TO anon;
GRANT ALL ON TABLE public.todos TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.todos TO service_role;


--
-- Name: TABLE v_daily_activity; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.v_daily_activity TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.v_daily_activity TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.v_daily_activity TO service_role;


--
-- Name: TABLE v_garden_objects_with_progress; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.v_garden_objects_with_progress TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.v_garden_objects_with_progress TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.v_garden_objects_with_progress TO service_role;


--
-- Name: TABLE worlds; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.worlds TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.worlds TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.worlds TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict bMpeLcYZtuCHQnbYZeoZTard7XxTqLAV1shgrDeAENLpOIj29SOStrI7fg0gchU

