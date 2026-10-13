import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
  alternates: {
    canonical: "/",
  },
};

// Durante la beta la entrada pública es la home de producto. La landing de validación sigue en components/landing.tsx.
export default function Home() {
  redirect("/home");
}
