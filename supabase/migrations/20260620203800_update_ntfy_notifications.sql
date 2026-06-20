-- 1. Alles Alte restlos entfernen
drop function IF exists public.send_telegram_notification () CASCADE;
drop function IF exists public.send_ntfy_notification () CASCADE;

-- 2. Die angepasste Funktion
create or replace function public.send_ntfy_notification () RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER as $function$
   declare
     payload_text text;
     user_info text;
     v_aktion text;
     v_display_name text;
     v_geaenderte_spalten text := '';
     v_rec record;
     v_alter_wert text;
     v_soll_senden boolean := false;
     v_jetzt text;
   begin
       begin
           v_jetzt := to_char(now() AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY HH24:MI');

           -- A) LOGIK FÜR DIE PROFILE
           if (TG_TABLE_NAME = 'profiles') then
               if (TG_OP = 'DELETE') then
                   v_aktion := '🔴 Profil geloescht';
                   user_info := 'Nutzer: ' || coalesce(OLD.display_name, 'Unbekannt') || chr(10) ||
                                'Tabelle: ' || TG_TABLE_NAME || chr(10) ||
                                'Datum/Zeit: ' || v_jetzt;
                   v_soll_senden := true;
               elsif (TG_OP = 'INSERT') then
                   v_aktion := '🟢 Neues Profil registriert';
                   user_info := 'Nutzer: ' || coalesce(NEW.display_name, 'Unbekannt') || chr(10) ||
                                'Tabelle: ' || TG_TABLE_NAME || chr(10) ||
                                'Datum/Zeit: ' || coalesce(to_char(NEW.created_at AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY HH24:MI'), v_jetzt);
                   v_soll_senden := true;
               elsif (TG_OP = 'UPDATE') then
                   for v_rec in select key, value from json_each_text(row_to_json(NEW)) loop
                       select value into v_alter_wert from json_each_text(row_to_json(OLD)) where key = v_rec.key;
                       if (v_rec.value IS DISTINCT FROM v_alter_wert) and v_rec.key NOT IN ('updated_at') then
                           v_geaenderte_spalten := v_geaenderte_spalten || '  - ' || v_rec.key || ': ' || 
                                                     coalesce(v_alter_wert, 'leer') || ' ➔ ' || coalesce(v_rec.value, 'leer') || chr(10);
                       end if;
                   end loop;

                   if (v_geaenderte_spalten != '') then
                       v_aktion := '🟡 Profil aktualisiert';
                       user_info := 'Nutzer: ' || coalesce(NEW.display_name, 'Unbekannt') || chr(10) || 
                                    'Tabelle: ' || TG_TABLE_NAME || chr(10) ||
                                    'Datum/Zeit: ' || v_jetzt || chr(10) ||
                                    'Änderungen:' || chr(10) || v_geaenderte_spalten;
                       v_soll_senden := true;
                   end if;
               end if;

           -- B) LOGIK FÜR DIE ANTWORTEN (Nur Hinweis, kein Inhalt)
           elsif (TG_TABLE_NAME = 'answers') then
               if (TG_OP = 'INSERT') then
                   select display_name into v_display_name from public.profiles where id = NEW.user_id;
                   v_aktion := '📝 Neue Antwort eingegangen';
                   user_info := 'Nutzer: ' || coalesce(v_display_name, 'Unbekannter Nutzer') || chr(10) ||
                                'Tabelle: ' || TG_TABLE_NAME || chr(10) ||
                                'Status: Eine neue Antwort wurde soeben abgegeben.' || chr(10) ||
                                'Datum/Zeit: ' || v_jetzt;
                   v_soll_senden := true;
               end if;

           -- C) LOGIK FÜR TÄGLICHE FRAGEN
           elsif (TG_TABLE_NAME = 'daily_questions') then
               v_aktion := '✨ Täglich neue Fragen';
               if (TG_OP = 'INSERT') then
                   user_info := 'Tabelle: ' || TG_TABLE_NAME || chr(10) ||
                                'Datum/Zeit: ' || coalesce(to_char(NEW.created_at AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY HH24:MI'), v_jetzt) || chr(10) ||
                                'Info: Die Fragen wurden erfolgreich für den Tag bereitgestellt.';
                   v_soll_senden := true;
               end if;
           end if;

           -- Versand
           if (v_soll_senden = true and user_info is not null) then
               payload_text := v_aktion || chr(10) || chr(10) || user_info;
               perform net.http_post(
                   url := 'https://ntfy.sh/',
                   headers := '{"Content-Type": "application/json"}'::jsonb,
                   body := json_build_object(
                       'topic', 'bisou_server_update_06dhd74j8fhezd73',
                       'title', '⚙️ Datenbank-Änderung',
                       'priority', 3,
                       'message', payload_text
                   )::jsonb
               );
           end if;

       exception when others then
           raise warning 'ntfy Fehler abgefangen: %', SQLERRM;
       end;

       if (TG_OP = 'DELETE') then return OLD; else return NEW; end if;
   end;
$function$;

-- 3. Trigger neu binden
create trigger on_profile_change
after INSERT or update or DELETE on public.profiles for EACH row
execute FUNCTION public.send_ntfy_notification ();

create trigger on_answer_insert
after INSERT on public.answers for EACH row
execute FUNCTION public.send_ntfy_notification ();

create trigger on_question_insert
after INSERT on public.daily_questions for EACH row
execute FUNCTION public.send_ntfy_notification ();
