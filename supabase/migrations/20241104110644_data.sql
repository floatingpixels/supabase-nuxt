CREATE TABLE IF NOT EXISTS public.members (
  member_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  username text,
  user_id uuid REFERENCES auth.users (id)
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY read_own_member
ON public.members
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

CREATE TABLE IF NOT EXISTS public.posts (
  post_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  title text,
  content text,
  member_id uuid REFERENCES public.members (member_id)
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_can_select_posts
ON public.posts
FOR SELECT
TO authenticated
USING (true);

CREATE TABLE IF NOT EXISTS public.comments (
  comment_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid REFERENCES public.posts (post_id),
  created_at timestamp with time zone DEFAULT now(),
  content text,
  member_id uuid REFERENCES public.members (member_id)
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_can_select_comments
ON public.comments
FOR SELECT
TO authenticated
USING (true);
