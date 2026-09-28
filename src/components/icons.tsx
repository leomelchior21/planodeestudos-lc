import {
  Atom,
  BookOpen,
  Calculator,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  MessageCircle,
  Layers,
  type LucideProps,
} from "lucide-react";
const icons: Record<string, React.ComponentType<LucideProps>> = {
  Atom,
  BookOpen,
  Calculator,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  MessageCircle,
  Layers,
};
export function SubjectIcon({
  name,
  ...props
}: LucideProps & { name: string }) {
  const Icon = icons[name] ?? BookOpen;
  return <Icon {...props} />;
}
