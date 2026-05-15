export type DetailSection = {
  title: string;
  body: string;
};

export type DetailContent = {
  id: string;
  title: string;
  eyebrow?: string;
  summary?: string;
  meta?: string;
  tags?: string[];
  sections?: DetailSection[];
};

export type ActionIntent =
  | { type: "route"; to: string }
  | { type: "detail"; detail: DetailContent }
  | { type: "planned"; message: string }
  | { type: "external"; href: string };

export type InteractiveItem = {
  id: string;
  title: string;
  summary?: string;
  meta?: string;
  tags?: string[];
  primaryAction: ActionIntent;
  secondaryActions?: {
    label: string;
    intent: ActionIntent;
  }[];
};
