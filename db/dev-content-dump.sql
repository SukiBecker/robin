--
-- PostgreSQL database dump
--

\restrict BBh3frlVFeMDvO40OJuYVnPRlmdhnIGgfQXt7tu7ueC8rkqigjvL1gn4ltNVpgg

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
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.achievements VALUES ('9fa8432d-91db-4d6d-b5b2-02093ec71182', '100 Stunden gelernt', 'Erreiche insgesamt 100 Stunden Lernzeit', '{"type": "total_study_hours", "target": 100}', 500, 200, true, '2026-08-19 13:06:18.355544+00');
INSERT INTO public.achievements VALUES ('e3d7ee5c-f327-4597-8264-97e82c1da93e', '30 Tage Streak', 'Erreiche eine Streak von 30 Tagen', '{"type": "streak", "target": 30}', 300, 150, true, '2026-08-19 13:06:18.355544+00');


--
-- Data for Name: app_config; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.app_config VALUES ('streak_min_minutes_per_day', '15');


--
-- Data for Name: worlds; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.worlds VALUES (1, 'Garten', 'garden', 1, 1, '2026-08-19 13:06:18.355544+00', 20, 20);
INSERT INTO public.worlds VALUES (2, 'Beach', 'beach', 10, 2, '2026-08-19 13:06:18.355544+00', 20, 20);
INSERT INTO public.worlds VALUES (3, 'Berge', 'mountains', 20, 3, '2026-08-19 13:06:18.355544+00', 20, 20);


--
-- Data for Name: item_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.item_catalog VALUES ('5dc43126-92f7-4b21-a6ff-7df5e5a18cb3', 'Streak Freezer', 'extra', 100, 1, NULL, true, true, false, NULL, NULL, '{"effect": "streak_freezer"}', true, '2026-08-19 13:06:18.355544+00', '2026-08-19 13:06:18.355544+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('72766f36-5764-4e87-a4f9-a83be3bc7d6b', 'Tulip', 'flower', 100, 3, 1, true, false, true, 300, NULL, '{}', true, '2026-09-01 15:36:35.350858+00', '2026-09-01 15:36:35.350858+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('fc306cc7-105b-425e-98ca-737bf8f7e002', 'Rose', 'flower', 50, 1, 1, true, false, true, 10800, NULL, '{}', true, '2026-08-19 13:06:18.355544+00', '2026-09-02 13:14:13.200659+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('ee48d00b-5771-4d46-aba3-36894e1567ce', 'Steinweg (Ende)', 'decoration', 0, 5, NULL, true, false, true, NULL, '/garden/items/path-end-stone.png', '{"style": "flagstone", "path_shape": "end", "path_family": "garden_path", "path_style_item_id": "f3febb68-83d1-4ffe-a9f7-f81105adad10"}', true, '2026-09-19 16:01:37.459765+00', '2026-10-23 17:38:20.92994+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('8699d0d3-0969-46db-81b7-d4d8cd536b1c', 'Daisy', 'flower', 75, 1, 1, true, false, true, 300, NULL, '{}', true, '2026-09-01 18:54:40.985808+00', '2026-09-06 07:19:22.471481+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('e9f8b639-e76b-42e0-ae04-1503c5a39643', 'Bush', 'plant', 50, 4, 1, true, false, true, 300, NULL, '{}', true, '2026-09-03 17:10:04.667045+00', '2026-09-06 07:19:22.471481+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('8addec88-3301-4f92-8fc3-454211405a40', 'Lavender', 'flower', 150, 6, 1, true, false, true, 300, NULL, '{}', true, '2026-09-01 15:56:47.447513+00', '2026-09-06 07:19:22.471481+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('671902e0-0026-49c4-a4dc-e2bc386740d2', 'Hedge', 'plant', 60, 8, 1, true, false, true, 300, NULL, '{}', true, '2026-09-02 18:04:33.870077+00', '2026-09-06 07:19:22.471481+00', 2, 1);
INSERT INTO public.item_catalog VALUES ('afbadeae-b7fd-4c52-a61b-767a460c110e', 'Garden Lantern', 'decoration', 200, 9, 1, true, false, true, NULL, NULL, '{}', true, '2026-09-06 06:40:16.050293+00', '2026-09-06 07:19:22.471481+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('37357abd-5aa3-4359-8fa2-ea5853e7f6cd', 'Sunflower', 'flower', 350, 12, 1, true, false, true, 300, NULL, '{}', true, '2026-08-29 18:36:27.645209+00', '2026-09-06 07:19:22.471481+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('52f67cc0-cd78-4194-8e57-e88c6c8fced7', 'Bench', 'decoration', 150, 14, 1, true, false, true, NULL, NULL, '{}', true, '2026-09-05 07:18:28.261527+00', '2026-09-06 07:19:22.471481+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('c18ba2b1-16ab-4e1c-a6f3-c5eb32bb6f56', 'Peony', 'flower', 200, 17, 1, true, false, true, 300, NULL, '{}', true, '2026-09-01 18:32:24.182363+00', '2026-09-06 07:19:22.471481+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('62d401c4-efe9-4c81-8306-4bb015442b15', 'Naturstein', 'path_style', 300, 1, NULL, false, false, false, NULL, NULL, '{"effect": "path_style_unlock", "unlimited_placement": true}', true, '2026-09-12 18:50:02.418335+00', '2026-10-23 17:39:13.295006+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('f3febb68-83d1-4ffe-a9f7-f81105adad10', 'Steinweg', 'path_style', 400, 5, NULL, false, false, false, NULL, NULL, '{"effect": "path_style_unlock", "unlimited_placement": true}', true, '2026-09-19 16:01:37.459765+00', '2026-10-23 17:39:13.295006+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('52927c10-7831-46a4-bf77-fe19dc7c4148', 'Water Fountain', 'decoration', 2500, 25, 1, true, false, true, NULL, NULL, '{}', true, '2026-09-18 18:22:31.876506+00', '2026-09-19 17:10:47.18136+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('67a7a136-cd6b-4656-9548-b19a9126c076', 'Pavilion', 'decoration', 5000, 30, 1, true, false, true, NULL, '/garden/items/pavilion.png', '{}', true, '2026-09-19 18:40:41.165325+00', '2026-09-19 18:40:41.165325+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('9564c4da-dd44-4e08-bea6-0981abbc4ea4', 'Weg (Gerade)', 'decoration', 0, 1, NULL, true, false, true, NULL, '/garden/items/path-straight.png', '{"style": "stone", "path_shape": "straight", "path_family": "garden_path", "path_style_item_id": "62d401c4-efe9-4c81-8306-4bb015442b15"}', true, '2026-09-12 18:50:02.418335+00', '2026-10-23 17:38:20.92994+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('2f90337d-a7b5-4bb8-a3cc-620993dae166', 'Weg (Kurve)', 'decoration', 0, 1, NULL, true, false, true, NULL, '/garden/items/path-curve.png', '{"style": "stone", "path_shape": "curve", "path_family": "garden_path", "path_style_item_id": "62d401c4-efe9-4c81-8306-4bb015442b15"}', true, '2026-09-12 18:50:02.418335+00', '2026-10-23 17:38:20.92994+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('7e620f57-a21c-4f42-a8ed-d289be5779b1', 'Weg (Ende)', 'decoration', 0, 1, NULL, true, false, true, NULL, '/garden/items/path-end.png', '{"style": "stone", "path_shape": "end", "path_family": "garden_path", "path_style_item_id": "62d401c4-efe9-4c81-8306-4bb015442b15"}', true, '2026-09-15 17:43:02.229296+00', '2026-10-23 17:38:20.92994+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('b87a3ed7-8323-4b27-8e67-571125d4e504', 'Steinweg (Gerade)', 'decoration', 0, 5, NULL, true, false, true, NULL, '/garden/items/path-straight-stone.png', '{"style": "flagstone", "path_shape": "straight", "path_family": "garden_path", "path_style_item_id": "f3febb68-83d1-4ffe-a9f7-f81105adad10"}', true, '2026-09-19 16:01:37.459765+00', '2026-10-23 17:38:20.92994+00', 1, 1);
INSERT INTO public.item_catalog VALUES ('d28dc2b8-ab38-4dfb-bcc0-5b61cf0d4711', 'Steinweg (Kurve)', 'decoration', 0, 5, NULL, true, false, true, NULL, '/garden/items/path-curve-stone.png', '{"style": "flagstone", "path_shape": "curve", "path_family": "garden_path", "path_style_item_id": "f3febb68-83d1-4ffe-a9f7-f81105adad10"}', true, '2026-09-19 16:01:37.459765+00', '2026-10-23 17:38:20.92994+00', 1, 1);


--
-- Data for Name: level_thresholds; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.level_thresholds VALUES (1, 0);
INSERT INTO public.level_thresholds VALUES (2, 15);
INSERT INTO public.level_thresholds VALUES (3, 30);
INSERT INTO public.level_thresholds VALUES (4, 45);
INSERT INTO public.level_thresholds VALUES (5, 60);
INSERT INTO public.level_thresholds VALUES (6, 130);
INSERT INTO public.level_thresholds VALUES (7, 200);
INSERT INTO public.level_thresholds VALUES (8, 270);
INSERT INTO public.level_thresholds VALUES (9, 340);
INSERT INTO public.level_thresholds VALUES (10, 410);
INSERT INTO public.level_thresholds VALUES (11, 660);
INSERT INTO public.level_thresholds VALUES (12, 910);
INSERT INTO public.level_thresholds VALUES (13, 1160);
INSERT INTO public.level_thresholds VALUES (14, 1410);
INSERT INTO public.level_thresholds VALUES (15, 1660);
INSERT INTO public.level_thresholds VALUES (16, 1910);
INSERT INTO public.level_thresholds VALUES (17, 2160);
INSERT INTO public.level_thresholds VALUES (18, 2410);
INSERT INTO public.level_thresholds VALUES (19, 2660);
INSERT INTO public.level_thresholds VALUES (20, 2910);
INSERT INTO public.level_thresholds VALUES (21, 3485);
INSERT INTO public.level_thresholds VALUES (22, 4060);
INSERT INTO public.level_thresholds VALUES (23, 4635);
INSERT INTO public.level_thresholds VALUES (24, 5210);
INSERT INTO public.level_thresholds VALUES (25, 5785);
INSERT INTO public.level_thresholds VALUES (26, 6360);
INSERT INTO public.level_thresholds VALUES (27, 6935);
INSERT INTO public.level_thresholds VALUES (28, 7510);
INSERT INTO public.level_thresholds VALUES (29, 8085);
INSERT INTO public.level_thresholds VALUES (30, 8660);
INSERT INTO public.level_thresholds VALUES (31, 9235);
INSERT INTO public.level_thresholds VALUES (32, 9810);
INSERT INTO public.level_thresholds VALUES (33, 10385);
INSERT INTO public.level_thresholds VALUES (34, 10960);
INSERT INTO public.level_thresholds VALUES (35, 11535);
INSERT INTO public.level_thresholds VALUES (36, 12110);
INSERT INTO public.level_thresholds VALUES (37, 12685);
INSERT INTO public.level_thresholds VALUES (38, 13260);
INSERT INTO public.level_thresholds VALUES (39, 13835);
INSERT INTO public.level_thresholds VALUES (40, 14410);
INSERT INTO public.level_thresholds VALUES (41, 15128);
INSERT INTO public.level_thresholds VALUES (42, 15864);
INSERT INTO public.level_thresholds VALUES (43, 16618);
INSERT INTO public.level_thresholds VALUES (44, 17390);
INSERT INTO public.level_thresholds VALUES (45, 18180);
INSERT INTO public.level_thresholds VALUES (46, 18988);
INSERT INTO public.level_thresholds VALUES (47, 19814);
INSERT INTO public.level_thresholds VALUES (48, 20658);
INSERT INTO public.level_thresholds VALUES (49, 21520);
INSERT INTO public.level_thresholds VALUES (50, 22400);
INSERT INTO public.level_thresholds VALUES (51, 23298);
INSERT INTO public.level_thresholds VALUES (52, 24214);
INSERT INTO public.level_thresholds VALUES (53, 25148);
INSERT INTO public.level_thresholds VALUES (54, 26100);
INSERT INTO public.level_thresholds VALUES (55, 27070);
INSERT INTO public.level_thresholds VALUES (56, 28058);
INSERT INTO public.level_thresholds VALUES (57, 29064);
INSERT INTO public.level_thresholds VALUES (58, 30088);
INSERT INTO public.level_thresholds VALUES (59, 31130);
INSERT INTO public.level_thresholds VALUES (60, 32190);
INSERT INTO public.level_thresholds VALUES (61, 33268);
INSERT INTO public.level_thresholds VALUES (62, 34364);
INSERT INTO public.level_thresholds VALUES (63, 35478);
INSERT INTO public.level_thresholds VALUES (64, 36610);
INSERT INTO public.level_thresholds VALUES (65, 37760);
INSERT INTO public.level_thresholds VALUES (66, 38928);
INSERT INTO public.level_thresholds VALUES (67, 40114);
INSERT INTO public.level_thresholds VALUES (68, 41318);
INSERT INTO public.level_thresholds VALUES (69, 42540);
INSERT INTO public.level_thresholds VALUES (70, 43780);
INSERT INTO public.level_thresholds VALUES (71, 45038);
INSERT INTO public.level_thresholds VALUES (72, 46314);
INSERT INTO public.level_thresholds VALUES (73, 47608);
INSERT INTO public.level_thresholds VALUES (74, 48920);
INSERT INTO public.level_thresholds VALUES (75, 50250);
INSERT INTO public.level_thresholds VALUES (76, 51598);
INSERT INTO public.level_thresholds VALUES (77, 52964);
INSERT INTO public.level_thresholds VALUES (78, 54348);
INSERT INTO public.level_thresholds VALUES (79, 55750);
INSERT INTO public.level_thresholds VALUES (80, 57170);
INSERT INTO public.level_thresholds VALUES (81, 58608);
INSERT INTO public.level_thresholds VALUES (82, 60064);
INSERT INTO public.level_thresholds VALUES (83, 61538);
INSERT INTO public.level_thresholds VALUES (84, 63030);
INSERT INTO public.level_thresholds VALUES (85, 64540);
INSERT INTO public.level_thresholds VALUES (86, 66068);
INSERT INTO public.level_thresholds VALUES (87, 67614);
INSERT INTO public.level_thresholds VALUES (88, 69178);
INSERT INTO public.level_thresholds VALUES (89, 70760);
INSERT INTO public.level_thresholds VALUES (90, 72360);
INSERT INTO public.level_thresholds VALUES (91, 73978);
INSERT INTO public.level_thresholds VALUES (92, 75614);
INSERT INTO public.level_thresholds VALUES (93, 77268);
INSERT INTO public.level_thresholds VALUES (94, 78940);
INSERT INTO public.level_thresholds VALUES (95, 80630);
INSERT INTO public.level_thresholds VALUES (96, 82338);
INSERT INTO public.level_thresholds VALUES (97, 84064);
INSERT INTO public.level_thresholds VALUES (98, 85808);
INSERT INTO public.level_thresholds VALUES (99, 87570);
INSERT INTO public.level_thresholds VALUES (100, 89350);


--
-- Data for Name: quests; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.quests VALUES ('f9b90484-dc50-4427-b25e-3c0dd3d1826f', '60 Minuten lernen', 'Lerne heute mindestens 60 Minuten', '{"type": "study_minutes", "target": 60}', 50, 20, true, '2026-08-19 13:06:18.355544+00');
INSERT INTO public.quests VALUES ('6a45ab3f-bb5a-4d53-b3ae-ecb712470e85', '3 To-Dos erledigen', 'Erledige heute 3 To-Dos', '{"type": "todos_completed", "target": 3}', 30, 10, true, '2026-08-19 13:06:18.355544+00');


--
-- Data for Name: sound_catalog; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: worlds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.worlds_id_seq', 3, true);


--
-- PostgreSQL database dump complete
--

\unrestrict BBh3frlVFeMDvO40OJuYVnPRlmdhnIGgfQXt7tu7ueC8rkqigjvL1gn4ltNVpgg

