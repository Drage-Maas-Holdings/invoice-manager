/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    actor: { actor_type: 'staff'; staff_id: string } | { actor_type: 'vendor'; vendor_id: string } | null;
  }
}
