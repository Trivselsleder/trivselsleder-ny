-- Kjør i Supabase Dashboard → SQL Editor
-- Oppretter testbruker kjartaneide@me.com som skoleadmin på "Kjartans Trivselsskole"

DO $$
DECLARE
  v_user_id  UUID;
  v_skole_id UUID;
BEGIN

  -- 1. Opprett Auth-bruker (eller hent eksisterende)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'kjartaneide@me.com',
    crypt('TestPassord123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"navn":"Kjartan Eide (test)"}',
    now(),
    now(),
    '', '', '', ''
  )
  ON CONFLICT (email) DO UPDATE
    SET encrypted_password = crypt('TestPassord123!', gen_salt('bf')),
        email_confirmed_at = now()
  RETURNING id INTO v_user_id;

  RAISE NOTICE 'Bruker-ID: %', v_user_id;

  -- 2. Opprett profil
  INSERT INTO profiles (id, navn, rolle, epost, aktiv)
  VALUES (v_user_id, 'Kjartan Eide (test)', 'skoleadmin', 'kjartaneide@me.com', true)
  ON CONFLICT (id) DO UPDATE
    SET navn  = 'Kjartan Eide (test)',
        rolle = 'skoleadmin',
        epost = 'kjartaneide@me.com',
        aktiv = true;

  -- 3. Opprett skole hvis den ikke finnes
  INSERT INTO skoler (navn)
  VALUES ('Kjartans Trivselsskole')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_skole_id
  FROM skoler
  WHERE navn = 'Kjartans Trivselsskole'
  LIMIT 1;

  RAISE NOTICE 'Skole-ID: %', v_skole_id;

  -- 4. Knytt bruker til skole
  INSERT INTO bruker_skole (bruker_id, skole_id, rolle, aktiv)
  VALUES (v_user_id, v_skole_id, 'skoleadmin', true)
  ON CONFLICT (bruker_id, skole_id) DO UPDATE
    SET rolle = 'skoleadmin',
        aktiv = true;

  RAISE NOTICE 'Ferdig! Logg inn med kjartaneide@me.com / TestPassord123!';

END $$;
