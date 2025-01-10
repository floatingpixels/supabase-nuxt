SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'a69c117a-e1bd-47b7-a802-819b9fb4209f', 'authenticated', 'authenticated', 'user3@example.com', '$2a$10$u2h5GEMFyiDPRXPNa4cPoODhi1WjoaRMYJwkChOxPC1nJFY5IU1Ma', '2025-01-10 18:22:52.966438+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-10 18:22:52.968161+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "a69c117a-e1bd-47b7-a802-819b9fb4209f", "email": "user3@example.com", "last_name": "Moore", "user_name": "user3", "first_name": "Elisa", "email_verified": false, "phone_verified": false}', NULL, '2025-01-10 18:22:52.963123+00', '2025-01-10 18:22:52.969202+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'dd5c9080-bf5a-40f6-bc88-7e9a1042d06e', 'authenticated', 'authenticated', 'user1@example.com', '$2a$10$u0aqJxqs4VHBLa0r9UDIFOTNDZ11q5fcNaDWR3kkaw80s.Hq4G6sG', '2025-01-10 18:22:52.799231+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-10 18:24:32.405543+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "dd5c9080-bf5a-40f6-bc88-7e9a1042d06e", "email": "user1@example.com", "last_name": "Gleason", "user_name": "user1", "first_name": "Daphnee", "email_verified": false, "phone_verified": false}', NULL, '2025-01-10 18:22:52.79456+00', '2025-01-10 18:24:32.40674+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '9a6e5d0e-2ad0-4e99-bf2f-b2761d2990a6', 'authenticated', 'authenticated', 'user4@example.com', '$2a$10$rifHU890j7.zw1KW4FVd.euW6c3XDlAsTsK/R36nKvnnwl0jzEWYu', '2025-01-10 18:22:53.043424+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-10 18:22:53.045055+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "9a6e5d0e-2ad0-4e99-bf2f-b2761d2990a6", "email": "user4@example.com", "last_name": "Koch", "user_name": "user4", "first_name": "Lenny", "email_verified": false, "phone_verified": false}', NULL, '2025-01-10 18:22:53.04077+00', '2025-01-10 18:22:53.045892+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '8826bb03-ea7e-4d08-8997-4ac73ee0acd5', 'authenticated', 'authenticated', 'user2@example.com', '$2a$10$uoNIG4cLXlr2btJzyRbZRuo1TsAa73D.qV4oU1zmGqu/nZYz3YhGe', '2025-01-10 18:22:52.882429+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-10 18:22:52.884683+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "8826bb03-ea7e-4d08-8997-4ac73ee0acd5", "email": "user2@example.com", "last_name": "Huel", "user_name": "user2", "first_name": "Pearline", "email_verified": false, "phone_verified": false}', NULL, '2025-01-10 18:22:52.878661+00', '2025-01-10 18:22:52.885705+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '668bdde4-7f66-43ba-bc9a-7255eb6b533c', 'authenticated', 'authenticated', 'user6@example.com', '$2a$10$R5coFCLmgBdx85I3gN42Uul8FpCj1.fSCX3sLheezjJQaZWDvmVCK', '2025-01-10 18:22:53.198466+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-10 18:22:53.200117+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "668bdde4-7f66-43ba-bc9a-7255eb6b533c", "email": "user6@example.com", "last_name": "McDermott", "user_name": "user6", "first_name": "Herman", "email_verified": false, "phone_verified": false}', NULL, '2025-01-10 18:22:53.19623+00', '2025-01-10 18:22:53.200955+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'ef4e4bc9-dced-4d8b-80ec-0d1fb98692a6', 'authenticated', 'authenticated', 'user5@example.com', '$2a$10$sk.kf2dBe6h8GcuOHn9Tme8JBSoav394IT.sX1mq/fcW.lfUaEaJq', '2025-01-10 18:22:53.121347+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-10 18:22:53.122839+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "ef4e4bc9-dced-4d8b-80ec-0d1fb98692a6", "email": "user5@example.com", "last_name": "Hills", "user_name": "user5", "first_name": "Kailee", "email_verified": false, "phone_verified": false}', NULL, '2025-01-10 18:22:53.119011+00', '2025-01-10 18:22:53.123704+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '5b66f9e2-a285-4c01-8f6c-e07a05207ff5', 'authenticated', 'authenticated', 'user7@example.com', '$2a$10$CS6eNgITBjCiNVYW5uLby.lmG5sM.GGqZS0zRdkGCIehYbtD4f9MG', '2025-01-10 18:22:53.274064+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-10 18:22:53.275524+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "5b66f9e2-a285-4c01-8f6c-e07a05207ff5", "email": "user7@example.com", "last_name": "Crooks", "user_name": "user7", "first_name": "Wilhelmine", "email_verified": false, "phone_verified": false}', NULL, '2025-01-10 18:22:53.271829+00', '2025-01-10 18:22:53.276276+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'd875cc4d-3f05-4056-999e-8b8cfdfb3337', 'authenticated', 'authenticated', 'user10@example.com', '$2a$10$V/usa9yj6tZdqD1LM.fg8.8deFe1wLDTmcZzXccTzog2Vjs/sNEYq', '2025-01-10 18:22:53.516926+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-10 18:22:53.518428+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "d875cc4d-3f05-4056-999e-8b8cfdfb3337", "email": "user10@example.com", "last_name": "Ebert", "user_name": "user10", "first_name": "Cayla", "email_verified": false, "phone_verified": false}', NULL, '2025-01-10 18:22:53.513682+00', '2025-01-10 18:22:53.519206+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '601a0a1e-e8f7-47e2-97c0-89a110683ae3', 'authenticated', 'authenticated', 'user8@example.com', '$2a$10$ntLJuyLNbinz9T0duhkb1.wZWR3B419f8HhhUF.98fog42DXmNMoC', '2025-01-10 18:22:53.352768+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-10 18:22:53.354198+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "601a0a1e-e8f7-47e2-97c0-89a110683ae3", "email": "user8@example.com", "last_name": "Treutel", "user_name": "user8", "first_name": "Keshawn", "email_verified": false, "phone_verified": false}', NULL, '2025-01-10 18:22:53.350437+00', '2025-01-10 18:22:53.354976+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '6894697f-38d4-4d76-853d-5d84bacbcf3e', 'authenticated', 'authenticated', 'user11@example.com', '$2a$10$rzeqwBzqbAmGxciEeCCiOuu8iFsvfSQ4eHdr6Tg78RA19se9gryna', '2025-01-10 18:22:53.595449+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-10 18:22:53.596857+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "6894697f-38d4-4d76-853d-5d84bacbcf3e", "email": "user11@example.com", "last_name": "Larson", "user_name": "user11", "first_name": "Dock", "email_verified": false, "phone_verified": false}', NULL, '2025-01-10 18:22:53.593303+00', '2025-01-10 18:22:53.59765+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'c3cbfab5-03db-4180-b024-723e29ab1b18', 'authenticated', 'authenticated', 'user9@example.com', '$2a$10$.N/50MrSxVMkt6rSyU5hheKNHfwT0Bcq71M0XRdqbhj.k3zLyeIAm', '2025-01-10 18:22:53.434572+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-10 18:22:53.435987+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "c3cbfab5-03db-4180-b024-723e29ab1b18", "email": "user9@example.com", "last_name": "Kohler", "user_name": "user9", "first_name": "Sharon", "email_verified": false, "phone_verified": false}', NULL, '2025-01-10 18:22:53.432518+00', '2025-01-10 18:22:53.436809+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO auth.identities VALUES ('dd5c9080-bf5a-40f6-bc88-7e9a1042d06e', 'dd5c9080-bf5a-40f6-bc88-7e9a1042d06e', '{"sub": "dd5c9080-bf5a-40f6-bc88-7e9a1042d06e", "email": "user1@example.com", "last_name": "Gleason", "user_name": "user1", "first_name": "Daphnee", "email_verified": false, "phone_verified": false}', 'email', '2025-01-10 18:22:52.797313+00', '2025-01-10 18:22:52.797332+00', '2025-01-10 18:22:52.797332+00', DEFAULT, '478d114c-1597-48ce-8857-fa02725a8c3b');
INSERT INTO auth.identities VALUES ('8826bb03-ea7e-4d08-8997-4ac73ee0acd5', '8826bb03-ea7e-4d08-8997-4ac73ee0acd5', '{"sub": "8826bb03-ea7e-4d08-8997-4ac73ee0acd5", "email": "user2@example.com", "last_name": "Huel", "user_name": "user2", "first_name": "Pearline", "email_verified": false, "phone_verified": false}', 'email', '2025-01-10 18:22:52.880805+00', '2025-01-10 18:22:52.88083+00', '2025-01-10 18:22:52.88083+00', DEFAULT, 'fe9258a7-c5bc-468b-b75e-4f2bd59ac4a8');
INSERT INTO auth.identities VALUES ('a69c117a-e1bd-47b7-a802-819b9fb4209f', 'a69c117a-e1bd-47b7-a802-819b9fb4209f', '{"sub": "a69c117a-e1bd-47b7-a802-819b9fb4209f", "email": "user3@example.com", "last_name": "Moore", "user_name": "user3", "first_name": "Elisa", "email_verified": false, "phone_verified": false}', 'email', '2025-01-10 18:22:52.96487+00', '2025-01-10 18:22:52.964891+00', '2025-01-10 18:22:52.964891+00', DEFAULT, 'd20782ba-b862-45db-8da6-4c3b962cc54a');
INSERT INTO auth.identities VALUES ('9a6e5d0e-2ad0-4e99-bf2f-b2761d2990a6', '9a6e5d0e-2ad0-4e99-bf2f-b2761d2990a6', '{"sub": "9a6e5d0e-2ad0-4e99-bf2f-b2761d2990a6", "email": "user4@example.com", "last_name": "Koch", "user_name": "user4", "first_name": "Lenny", "email_verified": false, "phone_verified": false}', 'email', '2025-01-10 18:22:53.042048+00', '2025-01-10 18:22:53.042072+00', '2025-01-10 18:22:53.042072+00', DEFAULT, 'b1e1a507-b6ff-4d71-a4af-1624ed568d4c');
INSERT INTO auth.identities VALUES ('ef4e4bc9-dced-4d8b-80ec-0d1fb98692a6', 'ef4e4bc9-dced-4d8b-80ec-0d1fb98692a6', '{"sub": "ef4e4bc9-dced-4d8b-80ec-0d1fb98692a6", "email": "user5@example.com", "last_name": "Hills", "user_name": "user5", "first_name": "Kailee", "email_verified": false, "phone_verified": false}', 'email', '2025-01-10 18:22:53.120058+00', '2025-01-10 18:22:53.120075+00', '2025-01-10 18:22:53.120075+00', DEFAULT, 'a5f33ef0-47a6-42b9-b9ba-fcd41abbdd17');
INSERT INTO auth.identities VALUES ('668bdde4-7f66-43ba-bc9a-7255eb6b533c', '668bdde4-7f66-43ba-bc9a-7255eb6b533c', '{"sub": "668bdde4-7f66-43ba-bc9a-7255eb6b533c", "email": "user6@example.com", "last_name": "McDermott", "user_name": "user6", "first_name": "Herman", "email_verified": false, "phone_verified": false}', 'email', '2025-01-10 18:22:53.197269+00', '2025-01-10 18:22:53.197287+00', '2025-01-10 18:22:53.197287+00', DEFAULT, '45ccd6c9-d45c-4076-9cdb-dd30670fff5d');
INSERT INTO auth.identities VALUES ('5b66f9e2-a285-4c01-8f6c-e07a05207ff5', '5b66f9e2-a285-4c01-8f6c-e07a05207ff5', '{"sub": "5b66f9e2-a285-4c01-8f6c-e07a05207ff5", "email": "user7@example.com", "last_name": "Crooks", "user_name": "user7", "first_name": "Wilhelmine", "email_verified": false, "phone_verified": false}', 'email', '2025-01-10 18:22:53.272929+00', '2025-01-10 18:22:53.272945+00', '2025-01-10 18:22:53.272945+00', DEFAULT, 'd99a0f87-3a9c-430e-ae33-ddae7a6b6cae');
INSERT INTO auth.identities VALUES ('601a0a1e-e8f7-47e2-97c0-89a110683ae3', '601a0a1e-e8f7-47e2-97c0-89a110683ae3', '{"sub": "601a0a1e-e8f7-47e2-97c0-89a110683ae3", "email": "user8@example.com", "last_name": "Treutel", "user_name": "user8", "first_name": "Keshawn", "email_verified": false, "phone_verified": false}', 'email', '2025-01-10 18:22:53.35156+00', '2025-01-10 18:22:53.351581+00', '2025-01-10 18:22:53.351581+00', DEFAULT, '092b1fb7-92e6-4001-9288-2d1d4deb6f82');
INSERT INTO auth.identities VALUES ('c3cbfab5-03db-4180-b024-723e29ab1b18', 'c3cbfab5-03db-4180-b024-723e29ab1b18', '{"sub": "c3cbfab5-03db-4180-b024-723e29ab1b18", "email": "user9@example.com", "last_name": "Kohler", "user_name": "user9", "first_name": "Sharon", "email_verified": false, "phone_verified": false}', 'email', '2025-01-10 18:22:53.433437+00', '2025-01-10 18:22:53.433455+00', '2025-01-10 18:22:53.433455+00', DEFAULT, 'ee4159fd-d31a-428d-8c3e-7fe0f75af933');
INSERT INTO auth.identities VALUES ('d875cc4d-3f05-4056-999e-8b8cfdfb3337', 'd875cc4d-3f05-4056-999e-8b8cfdfb3337', '{"sub": "d875cc4d-3f05-4056-999e-8b8cfdfb3337", "email": "user10@example.com", "last_name": "Ebert", "user_name": "user10", "first_name": "Cayla", "email_verified": false, "phone_verified": false}', 'email', '2025-01-10 18:22:53.514706+00', '2025-01-10 18:22:53.514725+00', '2025-01-10 18:22:53.514725+00', DEFAULT, '2361fbdd-173b-4757-81ec-10d04e085680');
INSERT INTO auth.identities VALUES ('6894697f-38d4-4d76-853d-5d84bacbcf3e', '6894697f-38d4-4d76-853d-5d84bacbcf3e', '{"sub": "6894697f-38d4-4d76-853d-5d84bacbcf3e", "email": "user11@example.com", "last_name": "Larson", "user_name": "user11", "first_name": "Dock", "email_verified": false, "phone_verified": false}', 'email', '2025-01-10 18:22:53.594234+00', '2025-01-10 18:22:53.594251+00', '2025-01-10 18:22:53.594251+00', DEFAULT, '68f151d7-36f8-4e20-8dbe-f1b342b87fd1');



--
-- Data for Name: members; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.members VALUES ('08c46b6c-18a8-5f93-9a79-5d044e9030fa', '2025-01-10 18:22:53.618117+00', 'user1', 'dd5c9080-bf5a-40f6-bc88-7e9a1042d06e');
INSERT INTO public.members VALUES ('16eab1bd-a1d7-5312-8381-db1f779a3a0b', '2025-01-10 18:22:53.618117+00', 'user2', '8826bb03-ea7e-4d08-8997-4ac73ee0acd5');
INSERT INTO public.members VALUES ('a831e539-9973-5366-a90a-7fad9e244054', '2025-01-10 18:22:53.618117+00', 'user3', 'a69c117a-e1bd-47b7-a802-819b9fb4209f');
INSERT INTO public.members VALUES ('acc7844a-bd53-5461-930d-39c42c3413ed', '2025-01-10 18:22:53.618117+00', 'user4', '9a6e5d0e-2ad0-4e99-bf2f-b2761d2990a6');
INSERT INTO public.members VALUES ('9d3b8ef1-743b-5947-8523-05a3b648b7ea', '2025-01-10 18:22:53.618117+00', 'user5', 'ef4e4bc9-dced-4d8b-80ec-0d1fb98692a6');
INSERT INTO public.members VALUES ('f1b891ca-5430-54d7-8257-5414a943c17b', '2025-01-10 18:22:53.618117+00', 'user6', '668bdde4-7f66-43ba-bc9a-7255eb6b533c');
INSERT INTO public.members VALUES ('76c79f19-7fa7-5c5f-bdd4-2c09ff469053', '2025-01-10 18:22:53.618117+00', 'user7', '5b66f9e2-a285-4c01-8f6c-e07a05207ff5');
INSERT INTO public.members VALUES ('7c4ea4bf-aa84-54fd-ae1e-e31347bf8608', '2025-01-10 18:22:53.618117+00', 'user8', '601a0a1e-e8f7-47e2-97c0-89a110683ae3');
INSERT INTO public.members VALUES ('4e0bbd03-0833-5e7c-888c-6716c41d1094', '2025-01-10 18:22:53.618117+00', 'user9', 'c3cbfab5-03db-4180-b024-723e29ab1b18');
INSERT INTO public.members VALUES ('ae82d94b-5e79-5452-af2d-ce4281d0c2f6', '2025-01-10 18:22:53.618117+00', 'user10', 'd875cc4d-3f05-4056-999e-8b8cfdfb3337');
INSERT INTO public.members VALUES ('d9d21f76-3d42-52ad-b15d-fa4b409d4178', '2025-01-10 18:22:53.618117+00', 'user11', '6894697f-38d4-4d76-853d-5d84bacbcf3e');


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.posts VALUES ('d0d3b77b-3034-5d45-bfae-41615fd6de00', '2025-01-10 18:22:53.652853+00', 'Vero perpauca vocenimam sunt putatem afficillas, et sunt ad eadem est.', 'Pluribus perpessio titia quidem decoribus fore, spe liberea discipiet idit optionem.', '76c79f19-7fa7-5c5f-bdd4-2c09ff469053');
INSERT INTO public.posts VALUES ('df2737e8-319a-5baf-85f8-ea08a02a4819', '2025-01-10 18:22:53.652853+00', 'Litatque ata inesse quae ratione ut vera.', 'Ant prorsus adipso nascuntur sequitatom non.', '4e0bbd03-0833-5e7c-888c-6716c41d1094');
INSERT INTO public.posts VALUES ('0b2cf8dd-8830-5e0f-b193-01ae769e43c1', '2025-01-10 18:22:53.652853+00', 'Esse ut levis ne licitur omni.', 'Inanimos ad causae ne a genus.', '9d3b8ef1-743b-5947-8523-05a3b648b7ea');
INSERT INTO public.posts VALUES ('766af5da-c40e-527d-b17a-ca6b976c17a8', '2025-01-10 18:22:53.652853+00', 'Malin scipio ad chaere depravatom ratione uniae nihilius, quoddam manum non probarbitrer qui potest il.', 'Doloration endi legata phaedrumque fugiam, ut vero ad enim qui voluptata non quibus.', 'a831e539-9973-5366-a90a-7fad9e244054');
INSERT INTO public.posts VALUES ('49135cff-c839-56db-9f9b-dfb89d16e32f', '2025-01-10 18:22:53.652853+00', 'Tractatisdem hocles et tamente am sicutille.', 'Sis ex modum odia es qui sumus dem, etur cum finis ipsa ari.', '16eab1bd-a1d7-5312-8381-db1f779a3a0b');
INSERT INTO public.posts VALUES ('796e9ff7-0b16-521c-a4fa-7c527a6fb584', '2025-01-10 18:22:53.652853+00', 'Natur eo per contempus certe, et non proprius declinare ceri audaccusam veliturum.', 'Hoc autem tractatem ratione tum es quadamicur omni.', 'f1b891ca-5430-54d7-8257-5414a943c17b');
INSERT INTO public.posts VALUES ('7b3c0064-9cd7-5ba7-b107-58838289f421', '2025-01-10 18:22:53.652853+00', 'Etiam iubere et mihi earum obruamus.', 'Ut haec videt potiora ando, si cum graecos versionemus nullam.', '4e0bbd03-0833-5e7c-888c-6716c41d1094');
INSERT INTO public.posts VALUES ('4a361673-d444-5386-8d08-9f11c5dc5d8f', '2025-01-10 18:22:53.652853+00', 'Eturo nihilla rerum sentiant temnentes et permultitia.', 'Quaedam epicanim torum laudab corpora benivoles, moderime viveriora locosophia quae epice voluptatis facilit.', '4e0bbd03-0833-5e7c-888c-6716c41d1094');
INSERT INTO public.posts VALUES ('9dfde0f3-ca50-5a6e-bc32-dc06ddec62d4', '2025-01-10 18:22:53.652853+00', 'Nisi finit cernimus tritant temeriet ducunt.', 'Aut inum est famil causam res.', 'acc7844a-bd53-5461-930d-39c42c3413ed');
INSERT INTO public.posts VALUES ('aa667d4d-ecc4-53c5-99f5-733e8eea8053', '2025-01-10 18:22:53.652853+00', 'Naturum fieri de cum legent voluptatum, naturae non metrodorat est curate.', 'Inter dictum voluptari prorsus futur physico operudit a, unde se ans sedulit quos notionem honest.', 'ae82d94b-5e79-5452-af2d-ce4281d0c2f6');


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.comments VALUES ('90bfe869-55b0-5378-a587-015148ba7c80', 'd0d3b77b-3034-5d45-bfae-41615fd6de00', '2025-01-10 18:22:53.654255+00', 'Est voluptatib mat voluptas statuerissem, quam alientertium falsi ferebit partus exigitur ad.', '08c46b6c-18a8-5f93-9a79-5d044e9030fa');
INSERT INTO public.comments VALUES ('e4a64ee7-2e0a-56e2-aef3-edbc84215381', 'd0d3b77b-3034-5d45-bfae-41615fd6de00', '2025-01-10 18:22:53.654255+00', 'Aliendi quia significur possentio significet quidem est.', '9d3b8ef1-743b-5947-8523-05a3b648b7ea');
INSERT INTO public.comments VALUES ('dffda571-83b4-52c8-bd4e-c57a7f37b244', 'df2737e8-319a-5baf-85f8-ea08a02a4819', '2025-01-10 18:22:53.654255+00', 'Habuit it vare bonum deinde sit petua, tua dixere de mihi civium in.', '08c46b6c-18a8-5f93-9a79-5d044e9030fa');
INSERT INTO public.comments VALUES ('e4110e98-113f-5d9e-af44-77b068fa97cf', 'df2737e8-319a-5baf-85f8-ea08a02a4819', '2025-01-10 18:22:53.654255+00', 'Nam sive consequat itus non tu inquitation, in satisti qui ut cum praesernum e.', '4e0bbd03-0833-5e7c-888c-6716c41d1094');
INSERT INTO public.comments VALUES ('cef9e726-a9c6-552f-9887-ee3dbfe92aa1', '0b2cf8dd-8830-5e0f-b193-01ae769e43c1', '2025-01-10 18:22:53.654255+00', 'Veniatur intellegen dolorteat vulgo nos philosoper multo, et rebus sequaturov maeroratrum autem.', '7c4ea4bf-aa84-54fd-ae1e-e31347bf8608');
INSERT INTO public.comments VALUES ('910b3b6d-aa8d-5a52-bd7b-039d4a0a3bda', '0b2cf8dd-8830-5e0f-b193-01ae769e43c1', '2025-01-10 18:22:53.654255+00', 'Aliquo antia discidunias nec verborum seruerundia quibus aut, nullam unturum enim liberibus ere reprimen.', 'acc7844a-bd53-5461-930d-39c42c3413ed');
INSERT INTO public.comments VALUES ('1b4befbd-a72d-52e1-863f-5c4233f823ea', '0b2cf8dd-8830-5e0f-b193-01ae769e43c1', '2025-01-10 18:22:53.654255+00', 'De theatro consequuntur graecis maior offendimur pro, postea agin norattulan sed et quem per tellegatom.', '16eab1bd-a1d7-5312-8381-db1f779a3a0b');
INSERT INTO public.comments VALUES ('f31fd35f-734d-5b6a-b747-0fac5324448d', '0b2cf8dd-8830-5e0f-b193-01ae769e43c1', '2025-01-10 18:22:53.654255+00', 'Ectitur verum mihi uti honesse sic quae de, complura dicesse nator convicti eae in quorum didis.', '4e0bbd03-0833-5e7c-888c-6716c41d1094');
INSERT INTO public.comments VALUES ('d23f24ce-5912-5783-83e2-011a1a6cc840', '766af5da-c40e-527d-b17a-ca6b976c17a8', '2025-01-10 18:22:53.654255+00', 'Sit veniam causa politaque us est factis, est liberudin placet significar pariant.', '08c46b6c-18a8-5f93-9a79-5d044e9030fa');
INSERT INTO public.comments VALUES ('bc9a3329-9098-51f7-8f5d-5689472d9fb4', '766af5da-c40e-527d-b17a-ca6b976c17a8', '2025-01-10 18:22:53.654255+00', 'Multavitur propter itur it spe.', '76c79f19-7fa7-5c5f-bdd4-2c09ff469053');
INSERT INTO public.comments VALUES ('e8c880af-fc97-5fd1-9723-3284b8c1e06a', '766af5da-c40e-527d-b17a-ca6b976c17a8', '2025-01-10 18:22:53.654255+00', 'De utris idit essariam semperferan autem volunt, si maximalii pervenerar admodo videorum ea cum omnia.', 'a831e539-9973-5366-a90a-7fad9e244054');
INSERT INTO public.comments VALUES ('0e551596-f767-5419-a48a-c38d01a30c28', '766af5da-c40e-527d-b17a-ca6b976c17a8', '2025-01-10 18:22:53.654255+00', 'Ent auctorquatus delectu omnium quae, ex scriptorquato liberrem de sed ii interas et.', 'd9d21f76-3d42-52ad-b15d-fa4b409d4178');
INSERT INTO public.comments VALUES ('2b5cea8b-2688-53ff-96ed-0fbf6ba770cd', '766af5da-c40e-527d-b17a-ca6b976c17a8', '2025-01-10 18:22:53.654255+00', 'Audiebam epicur facio te quo.', '7c4ea4bf-aa84-54fd-ae1e-e31347bf8608');
INSERT INTO public.comments VALUES ('15e86d4e-cad4-5ba1-90af-a02d42a51865', '49135cff-c839-56db-9f9b-dfb89d16e32f', '2025-01-10 18:22:53.654255+00', 'Desid difficiisque nobis ex aut ad est superenim, expressas et quo vituptarum nullam.', '9d3b8ef1-743b-5947-8523-05a3b648b7ea');
INSERT INTO public.comments VALUES ('8b4ba0ba-7ea2-5856-8a45-bd258496beaa', '49135cff-c839-56db-9f9b-dfb89d16e32f', '2025-01-10 18:22:53.654255+00', 'Muciuste propem inem tibiquid arenti si, necestiae voluptatem igendumve est abil sed etiam.', 'f1b891ca-5430-54d7-8257-5414a943c17b');
INSERT INTO public.comments VALUES ('6172b703-0dc9-5844-a373-aeefa8534304', '49135cff-c839-56db-9f9b-dfb89d16e32f', '2025-01-10 18:22:53.654255+00', 'Inere iucunda e potendum si voluptas, odioque rebus quae tem minimpendet nobis philosoption.', 'acc7844a-bd53-5461-930d-39c42c3413ed');
INSERT INTO public.comments VALUES ('0c56eab2-45d6-5040-901c-3d279b46555e', '49135cff-c839-56db-9f9b-dfb89d16e32f', '2025-01-10 18:22:53.654255+00', 'Tamendam ignoris probet maiorest et qui, id arenima nudus eratur ab.', 'ae82d94b-5e79-5452-af2d-ce4281d0c2f6');
INSERT INTO public.comments VALUES ('b8bb3b83-7e3d-595a-8ae6-efbe26e2405b', '49135cff-c839-56db-9f9b-dfb89d16e32f', '2025-01-10 18:22:53.654255+00', 'Aut quam antes negatque et expetuam multos.', 'acc7844a-bd53-5461-930d-39c42c3413ed');
INSERT INTO public.comments VALUES ('a95e5ec9-cebf-5b87-a230-90375460676e', '796e9ff7-0b16-521c-a4fa-7c527a6fb584', '2025-01-10 18:22:53.654255+00', 'Maxim ent et unt nihille, ipsas iubera sunt autem dolore gere habeat per.', '08c46b6c-18a8-5f93-9a79-5d044e9030fa');
INSERT INTO public.comments VALUES ('255868aa-3501-54bc-a5d6-89eefc66e468', '796e9ff7-0b16-521c-a4fa-7c527a6fb584', '2025-01-10 18:22:53.654255+00', 'Si stoicositat has sinitates extremum tutior, a plura ad auger est alias tum ipsius.', '16eab1bd-a1d7-5312-8381-db1f779a3a0b');
INSERT INTO public.comments VALUES ('d0a2737a-cf75-5cdc-aa7e-9d788ffec170', '796e9ff7-0b16-521c-a4fa-7c527a6fb584', '2025-01-10 18:22:53.654255+00', 'Concerta obliviones sumus quisquam quid potesse modus nec.', '08c46b6c-18a8-5f93-9a79-5d044e9030fa');
INSERT INTO public.comments VALUES ('0bbc07e9-d64d-559c-99a0-0d1e2b62b300', '796e9ff7-0b16-521c-a4fa-7c527a6fb584', '2025-01-10 18:22:53.654255+00', 'Extremo tamentestib saepe conveniuncul nec laboramur, nollem tant metuque detracto ferae primoratur.', 'acc7844a-bd53-5461-930d-39c42c3413ed');
INSERT INTO public.comments VALUES ('fb72bb65-52bd-51b9-a520-da762807caf9', '7b3c0064-9cd7-5ba7-b107-58838289f421', '2025-01-10 18:22:53.654255+00', 'Epicitum sint dolore non platonis vel multi.', 'f1b891ca-5430-54d7-8257-5414a943c17b');
INSERT INTO public.comments VALUES ('cd671387-9e5c-5287-8477-22e2c42ffcd4', '7b3c0064-9cd7-5ba7-b107-58838289f421', '2025-01-10 18:22:53.654255+00', 'Idit sit suspicio voluptatis verearum quid declare.', 'ae82d94b-5e79-5452-af2d-ce4281d0c2f6');
INSERT INTO public.comments VALUES ('a6141905-4054-5cfa-96cd-9e17c76940e1', '7b3c0064-9cd7-5ba7-b107-58838289f421', '2025-01-10 18:22:53.654255+00', 'Vero commeminem liberius puerosaris graecum melius de nostrum, itate ergo distingere iisque hosti qui.', '08c46b6c-18a8-5f93-9a79-5d044e9030fa');
INSERT INTO public.comments VALUES ('0cd3eb12-562a-543d-8bd9-0d85cddfb85e', '7b3c0064-9cd7-5ba7-b107-58838289f421', '2025-01-10 18:22:53.654255+00', 'Intercaptios hac quam nimus vita crudelis.', 'acc7844a-bd53-5461-930d-39c42c3413ed');
INSERT INTO public.comments VALUES ('556b2037-2807-50d7-8585-465220c577f1', '7b3c0064-9cd7-5ba7-b107-58838289f421', '2025-01-10 18:22:53.654255+00', 'Si nihillae qui dolor solidia sit.', '7c4ea4bf-aa84-54fd-ae1e-e31347bf8608');
INSERT INTO public.comments VALUES ('87076a92-e1f6-5d09-9b7f-0b5f59960840', '4a361673-d444-5386-8d08-9f11c5dc5d8f', '2025-01-10 18:22:53.654255+00', 'Continguique endi nec rerum mereruntur ratio id nihilii, gerentibus sine propteruna ille segniorem epicur.', '4e0bbd03-0833-5e7c-888c-6716c41d1094');
INSERT INTO public.comments VALUES ('61892264-398a-5945-83ee-744da2a920ef', '9dfde0f3-ca50-5a6e-bc32-dc06ddec62d4', '2025-01-10 18:22:53.654255+00', 'Cum aris ius voluptati saepe de enimo.', '9d3b8ef1-743b-5947-8523-05a3b648b7ea');
INSERT INTO public.comments VALUES ('3d2180f0-d370-557b-b09b-884c31a29138', '9dfde0f3-ca50-5a6e-bc32-dc06ddec62d4', '2025-01-10 18:22:53.654255+00', 'Quem quidem atem voluptatem doctum a sed.', '16eab1bd-a1d7-5312-8381-db1f779a3a0b');
INSERT INTO public.comments VALUES ('559f156e-47ea-594f-b610-9bd9864a2188', '9dfde0f3-ca50-5a6e-bc32-dc06ddec62d4', '2025-01-10 18:22:53.654255+00', 'Rerum putarem ignorari virtus et dici, putantiquit at quam res patre rescerem metrodores graecum.', 'f1b891ca-5430-54d7-8257-5414a943c17b');
INSERT INTO public.comments VALUES ('5952f3ce-a685-5f9b-9d22-b0ca9e08b8cc', 'aa667d4d-ecc4-53c5-99f5-733e8eea8053', '2025-01-10 18:22:53.654255+00', 'Iudicit augerorum succum et quod animi, multos suo alitia aut dolor voluptatem.', '16eab1bd-a1d7-5312-8381-db1f779a3a0b');
INSERT INTO public.comments VALUES ('85306a78-b749-5bc9-b283-0d0a81b2738d', 'aa667d4d-ecc4-53c5-99f5-733e8eea8053', '2025-01-10 18:22:53.654255+00', 'Mihi aut percur improbante ari e.', 'acc7844a-bd53-5461-930d-39c42c3413ed');


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 36, true);

