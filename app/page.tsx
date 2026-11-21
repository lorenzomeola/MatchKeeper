import { permanentRedirect } from "next/navigation";

// La landing pública es /home; la de validación sigue en components/landing.tsx.
export default function Home() {
  permanentRedirect("/home");
}
