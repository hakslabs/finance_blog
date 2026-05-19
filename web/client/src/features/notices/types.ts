export interface Notice {
  id: string;
  tag: string;
  title: string;
  description: string | null;
  url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_pinned: boolean;
}

export interface NoticesResponse {
  items: Notice[];
}
