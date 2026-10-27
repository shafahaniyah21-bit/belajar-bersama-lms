import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Metode tidak didukung." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Konfigurasi Supabase Edge Function belum lengkap." }, 500);
    }

    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sesi login diperlukan." }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await callerClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Sesi login tidak valid. Silakan login ulang." }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (callerProfileError || callerProfile?.role !== "admin") {
      return json({ error: "Hanya akun admin yang boleh menghapus pengguna." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const targetId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!targetId) return json({ error: "ID pengguna tidak diberikan." }, 400);
    if (targetId === authData.user.id) {
      return json({ error: "Akun admin yang sedang digunakan tidak bisa dihapus." }, 400);
    }

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles").select("id,role,full_name,email").eq("id", targetId).maybeSingle();
    if (targetError) return json({ error: "Gagal memeriksa akun target: " + targetError.message }, 500);
    if (!targetProfile) return json({ error: "Pengguna tidak ditemukan atau sudah dihapus." }, 404);

    if (targetProfile.role === "admin") {
      const { count, error: countError } = await adminClient
        .from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if (countError) return json({ error: "Gagal memeriksa jumlah admin: " + countError.message }, 500);
      if ((count || 0) <= 1) return json({ error: "Admin terakhir tidak boleh dihapus." }, 400);
    }

    // Allow a retry to clean an orphan profile even if its Auth user was already deleted.
    const { data: targetAuthData, error: targetAuthLookupError } =
      await adminClient.auth.admin.getUserById(targetId);
    const authUserAlreadyMissing =
      Boolean(targetAuthLookupError && /not found|does not exist|user not found/i.test(targetAuthLookupError.message));
    if (targetAuthLookupError && !authUserAlreadyMissing) {
      return json({ error: "Gagal memeriksa akun login target: " + targetAuthLookupError.message }, 500);
    }
    const authUserExists = Boolean(targetAuthData?.user);

    // Keep teaching content that would otherwise block account deletion by foreign-key constraints.
    // Existing courses, assignments and quizzes authored by this account are reassigned to the requesting admin.
    for (const table of ["courses", "assignments", "quizzes"]) {
      const { error } = await adminClient.from(table).update({ created_by: authData.user.id }).eq("created_by", targetId);
      if (error) {
        return json({ error: "Gagal mengamankan materi/tugas sebelum menghapus akun (" + table + "): " + error.message }, 500);
      }
    }

    if (authUserExists) {
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);
      if (deleteError) return json({ error: "Supabase gagal menghapus akun: " + deleteError.message }, 500);
    }

    // Explicitly remove any orphan profile row in projects where the auth.users
    // foreign-key cascade was not installed or the schema was changed manually.
    // This also lets admin retry cleanup for previously deleted Auth users.
    const { error: profileDeleteError } = await adminClient
      .from("profiles").delete().eq("id", targetId);
    if (profileDeleteError) {
      return json({
        error: "Akun login sudah dihapus, tetapi pembersihan profil gagal: " + profileDeleteError.message,
      }, 500);
    }

    return json({
      success: true,
      message: "Akun berhasil dihapus. Materi dan tugas yang dibuat akun tersebut dipertahankan dan dialihkan kepada admin.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
    return json({ error: message }, 500);
  }
});
