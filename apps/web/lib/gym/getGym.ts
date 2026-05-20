import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getSubdomainFromHost } from "@/lib/tenancy/subdomain";
import util from "util";

export async function getGym() {
  const headersList = await headers();
  const headerSubdomain = headersList.get("x-gym-subdomain");
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
  const subdomain = headerSubdomain ?? getSubdomainFromHost(host);



  if (!subdomain) return null;

  const supabase = await createClient();

  try {
    const { data: gym, error } = await supabase
      .from("gyms")
      .select("*")
      .eq("subdomain", subdomain)
      .single();

    if (error) {
      // Some error objects are non-enumerable when logged directly in the Next dev client.
      // Serialize carefully so we capture helpful fields.
      try {
        const serialized =
          error && typeof error === "object"
            ? JSON.stringify(error, Object.getOwnPropertyNames(error))
            : String(error);
        console.error("getGym: supabase error=", serialized);
      } catch {
        console.error(
          "getGym: supabase error (inspect)=",
          util.inspect(error, { depth: null }),
        );
      }
      return null;
    }

    if (!gym) {
      return null;
    }

    return gym;
  } catch (err) {
    try {
      const serialized =
        err && typeof err === "object"
          ? JSON.stringify(err, Object.getOwnPropertyNames(err))
          : String(err);
      console.error("getGym: exception while querying supabase=", serialized);
    } catch {
      console.error(
        "getGym: exception while querying supabase (inspect)=",
        util.inspect(err, { depth: null }),
      );
    }
    return null;
  }
}
