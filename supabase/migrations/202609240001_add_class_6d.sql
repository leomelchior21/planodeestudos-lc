-- Add the 6th-year D class without replacing existing school configuration.
-- Its actual timetable must be entered in Admin before timetable-based guidance applies.
insert into public.classes (id, data)
select 'class-6d',
       '{"id":"class-6d","schoolYearId":"year-6","name":"Turma D","code":"6D","order":3,"active":true}'::jsonb
where exists (select 1 from public.school_years where id = 'year-6')
  and not exists (select 1 from public.classes where school_year_id = 'year-6' and code = '6D')
on conflict do nothing;

insert into public.class_subjects (id, data)
select 'class-6d-' || subject_id,
       jsonb_build_object('id', 'class-6d-' || subject_id,
                          'classId', 'class-6d', 'subjectId', subject_id)
from (
  select distinct subject_id
  from public.class_subjects
  where class_id in ('class-6a', 'class-6b', 'class-6c')
) as sixth_year_subjects
where exists (select 1 from public.classes where id = 'class-6d')
on conflict do nothing;
