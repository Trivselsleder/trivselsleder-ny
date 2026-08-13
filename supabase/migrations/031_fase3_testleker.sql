-- 031_fase3_testleker.sql  — ~20 testleker som dekker bredden (bevis for modellen)
insert into utstyr (navn) values ('Ball'),('Erteposer'),('Kjegler'),('Kritt') on conflict (navn) do nothing;
insert into fag (navn) values ('Matematikk'),('Norsk') on conflict (navn) do nothing;
insert into kompetansemaal (kode, tekst, ukoblet) values ('MAT.4','Utforske tal i praktiske situasjonar', true) on conflict do nothing;

do $$
declare v record; rid uuid;
begin
  for v in select * from (values
    ('Haien kommer','lek','ute',6,30,true,4.5,'publisert','Alle prøver å komme seg forbi haien uten å bli tatt.','Merk opp et område med to linjer.'),
    ('Ballfangeren','lek','ute',8,24,false,4.2,'publisert','Fang de andre ved å treffe forsiktig med ballen.','Del ut myke baller til fangerne.'),
    ('Stiv heks','lek','begge',8,25,false,3.8,'publisert','Bli fri ved å krype under en som er stiv.','Velg to hekser.'),
    ('Rødt lys','lek','ute',5,15,false,3.5,'publisert','Snik deg fram uten å bli sett i bevegelse.',null),
    ('Stafett med tallkort','aktiv_laering','ute',10,24,false,4.0,'publisert','Regn ut svaret og løp til riktig tallkort.','Legg ut tallkort i en bue.'),
    ('Kongen befaler','lek','begge',6,20,false,3.6,'publisert','Gjør bare det kongen befaler.',null),
    ('Boksen går','lek','ute',8,30,false,3.9,'publisert','Gjem deg mens den som står teller.',null),
    ('Tallinjehopp','aktiv_laering','ute',4,12,true,3.7,'publisert','Hopp deg gjennom regnestykket på tallinja.','Tegn en tallinje med kritt.'),
    ('Navnelek med ball','lek','begge',6,20,false,4.1,'publisert','Si navnet ditt og kast ballen videre.','Still dere i ring.'),
    ('Fruktsalat','lek','inne',8,24,false,3.4,'publisert','Bytt plass når frukten din ropes opp.',null),
    ('Snøborg-stafett','lek','ute',10,30,false,4.3,'publisert','Bygg og forsvar snøborgen sammen.','Del i lag ute i snøen.'),
    ('Erteposejakt','lek','ute',6,20,true,3.8,'publisert','Samle flest erteposer til laget ditt.','Spre erteposene utover.'),
    ('Bli-kjent-sirkel','lek','inne',10,30,false,4.4,'publisert','Bli kjent med hverandre første skoledag.',null),
    ('Sisten med frys','lek','ute',8,25,false,3.3,'arkivert','Bli frosset av sisten til noen tiner deg.',null),
    ('Hoppeslott-rebus','lek','ute',4,15,false,3.9,'publisert','Løs rebusen mens dere hopper.',null),
    ('Kjeglestafett','lek','ute',8,24,false,3.7,'publisert','Løp stafett rundt kjeglene.','Sett opp kjegler i rekke.'),
    ('Rolige pusteøvelser','lek','inne',1,30,false,4.0,'publisert','Ro ned kroppen med enkle pusteøvelser.',null),
    ('Tampen brenner','lek','inne',6,20,false,3.5,'publisert','Finn den gjemte gjenstanden med hint.',null),
    ('Uteskole-natursti','aktiv_laering','ute',6,24,true,4.2,'publisert','Løs oppgaver langs stien i naturen.',null),
    ('Aktiv matte-butikk','aktiv_laering','inne',6,20,false,3.8,'utkast','Kjøp og selg i klasserommets butikk med ekte matte.',null)
  ) as x(tittel,rtype,sted,amin,amaks,elev,rating,status,formaal,forbered)
  loop
    insert into ressurser (ressurstype, sted, antall_min, antall_maks, kan_ledes_av_elever, redaksjonell_rating, status)
    values (v.rtype, v.sted, v.amin, v.amaks, v.elev, v.rating, v.status) returning id into rid;
    insert into ressurs_innhold (ressurs_id, sprak, tittel, formaal, forberedelse, ferskhet)
    values (rid, 'nb', v.tittel, v.formaal, v.forbered, 'gjeldende');
  end loop;
end $$;

-- svensk tekst paa én lek (beviser flerspråk)
insert into ressurs_innhold (ressurs_id, sprak, tittel, formaal, ferskhet)
select ressurs_id, 'sv', 'Namnlek med boll', 'Säg ditt namn och kasta bollen vidare.', 'gjeldende'
from ressurs_innhold where tittel='Navnelek med ball' and sprak='nb'
on conflict (ressurs_id, sprak) do nothing;

-- egnet
insert into ressurs_egnet (ressurs_id, egnet_id)
select ri.ressurs_id, e.id from ressurs_innhold ri, egnet_kategori e
where ri.sprak='nb' and (
 (ri.tittel='Haien kommer' and e.navn in ('SFO/AKS','Friminutt','FYSAK')) or
 (ri.tittel='Ballfangeren' and e.navn in ('Kroppsøving','Aktivitetsdager')) or
 (ri.tittel='Stiv heks' and e.navn in ('Friminutt','Kroppsøving')) or
 (ri.tittel='Rødt lys' and e.navn in ('SFO/AKS','FYSAK','Aktive pauser')) or
 (ri.tittel='Stafett med tallkort' and e.navn in ('Aktiv læring','Kroppsøving')) or
 (ri.tittel='Kongen befaler' and e.navn in ('SFO/AKS','Aktive pauser')) or
 (ri.tittel='Boksen går' and e.navn in ('Friminutt','Aktivitetsdager')) or
 (ri.tittel='Tallinjehopp' and e.navn in ('Aktiv læring','Aktive pauser')) or
 (ri.tittel='Navnelek med ball' and e.navn in ('Bli kjent / klassemiljø')) or
 (ri.tittel='Fruktsalat' and e.navn in ('Aktive pauser','Bli kjent / klassemiljø')) or
 (ri.tittel='Snøborg-stafett' and e.navn in ('FYSAK','Aktivitetsdager')) or
 (ri.tittel='Erteposejakt' and e.navn in ('SFO/AKS')) or
 (ri.tittel='Bli-kjent-sirkel' and e.navn in ('Bli kjent / klassemiljø')) or
 (ri.tittel='Sisten med frys' and e.navn in ('Friminutt')) or
 (ri.tittel='Hoppeslott-rebus' and e.navn in ('SFO/AKS')) or
 (ri.tittel='Kjeglestafett' and e.navn in ('Kroppsøving','Aktivitetsdager')) or
 (ri.tittel='Rolige pusteøvelser' and e.navn in ('Aktive pauser')) or
 (ri.tittel='Tampen brenner' and e.navn in ('Aktive pauser','Bli kjent / klassemiljø')) or
 (ri.tittel='Uteskole-natursti' and e.navn in ('FYSAK','Aktiv læring')) or
 (ri.tittel='Aktiv matte-butikk' and e.navn in ('Aktiv læring'))
) on conflict do nothing;

-- trinn (NO)
insert into ressurs_trinn (ressurs_id, trinn_id)
select ri.ressurs_id, t.id from ressurs_innhold ri, trinn t
where ri.sprak='nb' and t.land='NO' and (
 (ri.tittel='Haien kommer' and t.kode in ('1','2','3','4','5','6','7')) or
 (ri.tittel='Ballfangeren' and t.kode in ('3','4','5','6','7')) or
 (ri.tittel='Stiv heks' and t.kode in ('1','2','3','4','5')) or
 (ri.tittel='Rødt lys' and t.kode in ('1','2','3','4')) or
 (ri.tittel='Stafett med tallkort' and t.kode in ('3','4','5','6')) or
 (ri.tittel='Kongen befaler' and t.kode in ('1','2','3')) or
 (ri.tittel='Boksen går' and t.kode in ('2','3','4','5','6','7')) or
 (ri.tittel='Tallinjehopp' and t.kode in ('2','3','4','5')) or
 (ri.tittel='Navnelek med ball' and t.kode in ('1','2','3','4','5','6','7')) or
 (ri.tittel='Fruktsalat' and t.kode in ('1','2','3','4','5')) or
 (ri.tittel='Snøborg-stafett' and t.kode in ('3','4','5','6','7','8','9','10')) or
 (ri.tittel='Erteposejakt' and t.kode in ('1','2','3','4')) or
 (ri.tittel='Bli-kjent-sirkel' and t.kode in ('1','2','3','4','5','6','7','8','9','10')) or
 (ri.tittel='Sisten med frys' and t.kode in ('1','2','3','4','5','6')) or
 (ri.tittel='Hoppeslott-rebus' and t.kode in ('bhg')) or
 (ri.tittel='Kjeglestafett' and t.kode in ('3','4','5','6','7')) or
 (ri.tittel='Rolige pusteøvelser' and t.kode in ('1','2','3','4','5','6','7','8','9','10')) or
 (ri.tittel='Tampen brenner' and t.kode in ('1','2','3','4','5')) or
 (ri.tittel='Uteskole-natursti' and t.kode in ('4','5','6','7')) or
 (ri.tittel='Aktiv matte-butikk' and t.kode in ('2','3','4','5'))
) on conflict do nothing;

-- utstyr
insert into ressurs_utstyr (ressurs_id, utstyr_id)
select ri.ressurs_id, u.id from ressurs_innhold ri, utstyr u
where ri.sprak='nb' and (
 (ri.tittel='Ballfangeren' and u.navn in ('Ball','Erteposer')) or
 (ri.tittel='Stafett med tallkort' and u.navn in ('Kjegler')) or
 (ri.tittel='Tallinjehopp' and u.navn in ('Kritt')) or
 (ri.tittel='Navnelek med ball' and u.navn in ('Ball')) or
 (ri.tittel='Erteposejakt' and u.navn in ('Erteposer')) or
 (ri.tittel='Kjeglestafett' and u.navn in ('Kjegler'))
) on conflict do nothing;

-- fag + kompetansemål for aktiv læring
insert into ressurs_fag (ressurs_id, fag_id)
select ri.ressurs_id, f.id from ressurs_innhold ri, fag f
where ri.sprak='nb' and (
 (ri.tittel in ('Stafett med tallkort','Tallinjehopp','Aktiv matte-butikk') and f.navn='Matematikk') or
 (ri.tittel='Uteskole-natursti' and f.navn='Norsk')
) on conflict do nothing;
insert into ressurs_kompetansemaal (ressurs_id, kompetansemaal_id)
select ri.ressurs_id, k.id from ressurs_innhold ri, kompetansemaal k
where ri.sprak='nb' and k.kode='MAT.4' and ri.tittel in ('Stafett med tallkort','Tallinjehopp')
on conflict do nothing;

-- sesong
insert into ressurs_sesong (ressurs_id, sesong_id)
select ri.ressurs_id, s.id from ressurs_innhold ri, sesong s
where ri.sprak='nb' and (
 (ri.tittel='Snøborg-stafett' and s.navn='Vinter') or
 (ri.tittel='Uteskole-natursti' and s.navn in ('Vår','Høst'))
) on conflict do nothing;

-- flertrinns variant (språksatt) for Stafett med tallkort
insert into ressurs_trinn_innhold (ressurs_id, trinn_id, sprak, variant)
select rt.ressurs_id, rt.trinn_id, 'nb',
  case t.kode when '4' then 'Bruk tall opp til 20.' when '6' then 'Bruk gange og deling.' end
from ressurs_trinn rt
join trinn t on t.id = rt.trinn_id
join ressurs_innhold ri on ri.ressurs_id = rt.ressurs_id and ri.sprak='nb'
where ri.tittel='Stafett med tallkort' and t.kode in ('4','6')
on conflict do nothing;

-- medier: video som virker (Snøborg) + video som mangler fil (Kjeglestafett)
insert into medier (ressurs_id, type, bunny_video_id, alt_tekst, rekkefolge)
select ressurs_id, 'video', 'demo-snoeborg-001', 'Video: barn bygger snøborg', 1
from ressurs_innhold where tittel='Snøborg-stafett' and sprak='nb';
insert into medier (ressurs_id, type, bunny_video_id, alt_tekst, rekkefolge)
select ressurs_id, 'video', null, 'Video mangler (import-test)', 1
from ressurs_innhold where tittel='Kjeglestafett' and sprak='nb';

-- dokumenter: ett frittstående (skjemabank) + ett tilleggsmateriale (følger leken)
insert into dokumenter (tittel, type, status)
values ('Turneringsskjema', 'skjema', 'publisert') on conflict do nothing;
insert into dokumenter (tittel, type, status, ressurs_id)
select 'Tallkort til utskrift', 'vedlegg', 'publisert', ressurs_id
from ressurs_innhold where tittel='Stafett med tallkort' and sprak='nb';
insert into dokument_fag (dokument_id, fag_id)
select d.id, f.id from dokumenter d, fag f where d.tittel='Tallkort til utskrift' and f.navn='Matematikk'
on conflict do nothing;

-- samlinger
insert into samlinger (type, synlig, rekkefolge) values ('redaksjonell', true, 1);
insert into samling_innhold (samling_id, sprak, tittel, beskrivelse)
select id, 'nb', 'Vinterleker', 'Leker som passer når snøen kommer.' from samlinger order by opprettet_at desc limit 1;
insert into samling_ressurs (samling_id, ressurs_id, rekkefolge)
select (select id from samlinger order by opprettet_at desc limit 1), ri.ressurs_id, 1
from ressurs_innhold ri where ri.tittel='Snøborg-stafett' and ri.sprak='nb';

-- vurderinger (stjerner fra de eksisterende brukerne) paa Haien kommer
insert into vurderinger (ressurs_id, bruker_id, stjerner)
select ri.ressurs_id, p.id, case when row_number() over (order by p.id) = 1 then 5 else 4 end
from ressurs_innhold ri cross join profiles p
where ri.tittel='Haien kommer' and ri.sprak='nb'
on conflict (ressurs_id, bruker_id) do nothing;
