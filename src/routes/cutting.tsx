import { createFileRoute } from "@tanstack/react-router";
import { CuttingApp } from "@/components/cutting/cutting-app";

export const Route = createFileRoute("/cutting")({ component: CuttingApp });
