CREATE TABLE members (
  member_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  username text,
  user_id uuid REFERENCES auth.users (id)
);

CREATE TABLE IF NOT EXISTS public.posts (
  post_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  title text,
  content text,
  member_id uuid REFERENCES public.members (member_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
  comment_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid REFERENCES public.posts (post_id),
  created_at timestamp with time zone DEFAULT now(),
  content text,
  member_id uuid REFERENCES public.members (member_id)
);
