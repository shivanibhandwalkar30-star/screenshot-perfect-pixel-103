-- Roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin');
CREATE TYPE public.request_status AS ENUM ('pending','reviewed','scheduled','assigned','on_the_way','completed','cancelled');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Pune',
  pincode TEXT NOT NULL DEFAULT '',
  notify_reminders BOOLEAN NOT NULL DEFAULT true,
  notify_status BOOLEAN NOT NULL DEFAULT true,
  notify_completion BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Waste categories
CREATE TABLE public.waste_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '♻️',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.waste_categories TO anon, authenticated;
GRANT ALL ON public.waste_categories TO service_role;
ALTER TABLE public.waste_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.waste_categories FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.waste_categories (name, description, icon, sort_order) VALUES
  ('Plastic','Bottles, wrappers, containers and packaging','🧴',1),
  ('Paper','Newspapers, cartons, books and office paper','📄',2),
  ('E-Waste','Old phones, chargers, cables and appliances','🔌',3),
  ('Metal','Cans, utensils, scrap metal and fittings','🥫',4),
  ('Glass','Bottles, jars and broken glassware','🍾',5),
  ('Organic Waste','Kitchen waste, garden trimmings and food scraps','🥬',6),
  ('Bulk Waste','Furniture, mattresses and large household items','🪑',7),
  ('Mixed Recyclables','Assorted recyclable materials collected together','♻️',8),
  ('Other','Anything else you need collected responsibly','🗑️',9);

-- Pickup requests
CREATE SEQUENCE public.request_number_seq START 125;

CREATE TABLE public.pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE DEFAULT ('REQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.request_number_seq')::TEXT, 5, '0')),
  user_id UUID,
  claim_email TEXT,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL DEFAULT '',
  waste_categories TEXT[] NOT NULL DEFAULT '{}',
  waste_description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  quantity_unit TEXT NOT NULL DEFAULT 'kg',
  pickup_address TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Pune',
  pincode TEXT NOT NULL DEFAULT '',
  pickup_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  collector TEXT,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pickup_requests TO authenticated;
GRANT SELECT ON public.pickup_requests TO anon;
GRANT ALL ON public.pickup_requests TO service_role;
ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;

-- Public tracking by request id is intentional (anon can read to track a request).
CREATE POLICY "requests public read" ON public.pickup_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "requests insert own" ON public.pickup_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "requests update own or admin" ON public.pickup_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_uuid UUID NOT NULL REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
  status public.request_status NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.request_status_history TO authenticated;
GRANT SELECT ON public.request_status_history TO anon;
GRANT ALL ON public.request_status_history TO service_role;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history public read" ON public.request_status_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "history insert auth" ON public.request_status_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  request_uuid UUID REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Log status changes + notify user automatically
CREATE OR REPLACE FUNCTION public.log_request_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.request_status_history (request_uuid, status, note, updated_by)
    VALUES (NEW.id, NEW.status, 'Request submitted', 'user');
    INSERT INTO public.notifications (user_id, request_uuid, title, message)
    VALUES (NEW.user_id, NEW.id, 'Request submitted',
      'Your pickup request ' || NEW.request_id || ' has been submitted successfully.');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.updated_at := now();
    INSERT INTO public.request_status_history (request_uuid, status, note, updated_by)
    VALUES (NEW.id, NEW.status, 'Status changed to ' || NEW.status, 'admin');
    INSERT INTO public.notifications (user_id, request_uuid, title, message)
    VALUES (NEW.user_id, NEW.id, 'Status updated',
      CASE NEW.status
        WHEN 'scheduled' THEN 'Your pickup has been scheduled for ' || to_char(NEW.pickup_date, 'FMMonth DD, YYYY') || '.'
        WHEN 'assigned' THEN 'A collection agent has been assigned to your request.'
        WHEN 'on_the_way' THEN 'Your collector is on the way.'
        WHEN 'completed' THEN 'Your waste has been successfully collected. Thank you for responsible disposal! ♻️'
        WHEN 'cancelled' THEN 'Your pickup request ' || NEW.request_id || ' was cancelled.'
        ELSE 'Your request ' || NEW.request_id || ' is now ' || NEW.status || '.'
      END);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pickup_requests_status_insert AFTER INSERT ON public.pickup_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_request_status();
CREATE TRIGGER pickup_requests_status_update BEFORE UPDATE ON public.pickup_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_request_status();

-- New signup: create profile, role, and claim demo requests
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email TEXT := lower(coalesce(NEW.email, ''));
BEGIN
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (NEW.id,
    coalesce(NEW.raw_user_meta_data->>'name', split_part(_email, '@', 1)),
    _email,
    coalesce(NEW.raw_user_meta_data->>'phone', ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN _email = 'admin@ecocollect.demo' THEN 'admin'::public.app_role ELSE 'user'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.pickup_requests SET user_id = NEW.id
  WHERE user_id IS NULL AND claim_email = _email;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_requests;
