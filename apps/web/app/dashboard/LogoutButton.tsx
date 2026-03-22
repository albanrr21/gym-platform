"use client";

import { useAuth } from "@/lib/auth/AuthContext";

export default function LogoutButton() {
  const { signOut } = useAuth();

  return (
    <button
      onClick={signOut}
      className="text-sm text-gray-500 hover:text-red-600 transition-colors"
    >
      Logout
    </button>
  );
}
